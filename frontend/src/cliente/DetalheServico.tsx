import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { alerta, api, avisoErro, reais, useCliente, type Servico } from '../lib'

const esquema = z.object({
  mensagem: z.string().trim().min(10, 'Conte um pouco mais sobre o projeto'),
  investimento: z.string().optional(),
})
type Campos = z.infer<typeof esquema>

export function DetalheServico() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { cliente, token } = useCliente()
  const [servico, setServico] = useState<Servico | null>(null)
  const [naoExiste, setNaoExiste] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Campos>({
    resolver: zodResolver(esquema),
  })

  useEffect(() => {
    api<Servico>(`/servicos/${id}`).then(setServico).catch(() => setNaoExiste(true))
  }, [id])

  async function enviar(campos: Campos) {
    const valor = Number((campos.investimento ?? '').replace(/\./g, '').replace(',', '.'))
    try {
      await api('/pedidos', {
        metodo: 'POST',
        token,
        corpo: {
          servicoId: servico!.id,
          mensagem: campos.mensagem,
          investimento: valor > 0 ? valor : undefined,
        },
      })
      await alerta.fire({ icon: 'success', title: 'Pedido enviado', text: 'A equipe da WAW vai responder por aqui e por e-mail.' })
      navegar('/meus-pedidos')
    } catch (erro) {
      avisoErro(erro)
    }
  }

  if (naoExiste) {
    return (
      <section className="pagina">
        <h1>Serviço não encontrado</h1>
        <Link className="botao botao--escuro" to="/">Voltar ao início</Link>
      </section>
    )
  }
  if (!servico) return <section className="pagina"><p className="vazio">Carregando...</p></section>

  return (
    <section className="pagina">
      <article className="detalhe surgir">
        <p className="card__categoria">{servico.categoria.nome}</p>
        <h1>{servico.titulo}</h1>
        <p className="detalhe__preco">A partir de {reais(servico.precoBase)}, prazo médio de {servico.prazoDias} dias</p>
        <p className="detalhe__texto">{servico.descricao}</p>

        {servico.dadosIA && (
          <div className="bloco-ia">
            <h2>Indicado para *</h2>
            <p>{servico.dadosIA.indicadoPara}</p>
            <h2>O que costuma ser entregue *</h2>
            <ul>{servico.dadosIA.entregas.map((t) => <li key={t}>{t}</li>)}</ul>
            <h2>Para pensar antes de pedir *</h2>
            <ul>{servico.dadosIA.perguntas.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="nota-ia">* Informações geradas por IA (Gemini, do Google). Sujeitas a erros.</p>
          </div>
        )}

        <hr />

        {cliente ? (
          <form className="formulario" onSubmit={handleSubmit(enviar)}>
            <h2>{cliente.nome.split(' ')[0]}, conte sobre o seu projeto</h2>
            <label>
              O que você precisa?
              <textarea rows={4} {...register('mensagem')} placeholder="Sobre o negócio, o objetivo e o prazo que você imagina" />
              {errors.mensagem && <span className="erro">{errors.mensagem.message}</span>}
            </label>
            <label>
              Quanto pretende investir? (opcional)
              <input inputMode="decimal" {...register('investimento')} placeholder="Ex.: 2.500,00" />
            </label>
            <button className="botao botao--vermelho" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Pedir orçamento'}
            </button>
          </form>
        ) : (
          <div className="convite">
            <h2>Gostou? Identifique-se para pedir um orçamento.</h2>
            <Link className="botao botao--vermelho" to="/entrar" state={{ voltar: `/servico/${servico.id}` }}>
              Identifique-se
            </Link>
          </div>
        )}
      </article>
    </section>
  )
}
