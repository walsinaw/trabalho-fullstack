import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { alerta, api, avisoErro, reais, useAdmin, type Categoria, type Servico } from '../lib'

export function Servicos() {
  const token = useAdmin((s) => s.token)
  const [servicos, setServicos] = useState<Servico[] | null>(null)
  const [gerando, setGerando] = useState<number | null>(null)

  const carregar = useCallback(() => {
    api<Servico[]>('/servicos').then(setServicos).catch(avisoErro)
  }, [])

  useEffect(carregar, [carregar])

  async function alternarDestaque(s: Servico) {
    try {
      await api(`/servicos/${s.id}/destaque`, { metodo: 'PATCH', token })
      carregar()
    } catch (erro) {
      avisoErro(erro)
    }
  }

  async function gerarIA(s: Servico) {
    setGerando(s.id)
    try {
      await api(`/servicos/${s.id}/gerar-ia`, { metodo: 'POST', token })
      carregar()
    } catch (erro) {
      avisoErro(erro)
    } finally {
      setGerando(null)
    }
  }

  async function excluir(s: Servico) {
    const { isConfirmed } = await alerta.fire({
      icon: 'warning',
      title: `Excluir ${s.titulo}?`,
      text: 'Esta ação não pode ser desfeita.',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
    })
    if (!isConfirmed) return
    try {
      await api(`/servicos/${s.id}`, { metodo: 'DELETE', token })
      carregar()
    } catch (erro) {
      avisoErro(erro)
    }
  }

  return (
    <>
      <div className="admin__titulo">
        <h1>Serviços</h1>
        <Link className="botao botao--vermelho" to="/admin/servicos/novo">Novo serviço</Link>
      </div>
      {!servicos ? <p className="vazio">Carregando...</p> : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Serviço</th><th>Categoria</th><th>Preço base</th><th>Prazo</th><th>Dados de IA</th><th>Destaque</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.titulo}</strong></td>
                  <td>{s.categoria.nome}</td>
                  <td>{reais(s.precoBase)}</td>
                  <td>{s.prazoDias} dias</td>
                  <td>
                    <button className="link" disabled={gerando !== null} onClick={() => gerarIA(s)}>
                      {gerando === s.id ? 'Gerando...' : s.dadosIA ? 'Gerar de novo' : 'Gerar'}
                    </button>
                  </td>
                  <td>
                    <label className="marcar">
                      <input type="checkbox" checked={s.destaque} onChange={() => alternarDestaque(s)} aria-label={`Destacar ${s.titulo}`} />
                      {s.destaque ? 'Sim' : 'Não'}
                    </label>
                  </td>
                  <td><button className="link link--perigo" onClick={() => excluir(s)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const esquema = z.object({
  titulo: z.string().trim().min(3, 'Informe o título').max(80),
  categoriaId: z.coerce.number<string>().int().positive('Escolha a categoria'),
  descricao: z.string().trim().min(20, 'A descrição precisa de pelo menos 20 caracteres'),
  precoBase: z.coerce.number<string>().positive('Informe o preço'),
  prazoDias: z.coerce.number<string>().int().positive('Informe o prazo'),
  imagem: z.url('Informe um link válido').or(z.literal('')),
  destaque: z.boolean(),
})
type Entrada = z.input<typeof esquema>
type Saida = z.output<typeof esquema>

export function NovoServico() {
  const token = useAdmin((s) => s.token)
  const navegar = useNavigate()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Entrada, unknown, Saida>({
    resolver: zodResolver(esquema),
    defaultValues: { destaque: false, imagem: '', categoriaId: '' },
  })

  useEffect(() => {
    api<Categoria[]>('/servicos/categorias').then(setCategorias).catch(avisoErro)
  }, [])

  async function enviar(campos: Saida) {
    try {
      const r = await api<{ iaGerada: boolean }>('/servicos', { metodo: 'POST', token, corpo: campos })
      await alerta.fire({
        icon: 'success',
        title: 'Serviço cadastrado',
        text: r.iaGerada ? 'Os dados complementares foram gerados pela IA.' : 'Os dados de IA não foram gerados. Tente pela listagem de serviços.',
      })
      navegar('/admin/servicos')
    } catch (erro) {
      avisoErro(erro)
    }
  }

  return (
    <>
      <h1>Novo serviço</h1>
      <form className="formulario formulario--admin" onSubmit={handleSubmit(enviar)}>
        <label>
          Título
          <input {...register('titulo')} />
          {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
        </label>
        <label>
          Categoria
          <select {...register('categoriaId')}>
            <option value="">Selecione</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {errors.categoriaId && <span className="erro">{errors.categoriaId.message}</span>}
        </label>
        <label className="formulario__inteiro">
          Descrição
          <textarea rows={4} {...register('descricao')} />
          {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
        </label>
        <label>
          Preço base (R$)
          <input type="number" step="0.01" min="0" {...register('precoBase')} />
          {errors.precoBase && <span className="erro">{errors.precoBase.message}</span>}
        </label>
        <label>
          Prazo médio (dias)
          <input type="number" min="1" {...register('prazoDias')} />
          {errors.prazoDias && <span className="erro">{errors.prazoDias.message}</span>}
        </label>
        <label className="formulario__inteiro">
          Link da imagem (opcional)
          <input {...register('imagem')} placeholder="https://" />
          {errors.imagem && <span className="erro">{errors.imagem.message}</span>}
        </label>
        <label className="marcar formulario__inteiro">
          <input type="checkbox" {...register('destaque')} /> Exibir em destaque na página inicial
        </label>
        <div className="formulario__inteiro formulario__botoes">
          <button className="botao botao--vermelho" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando e consultando a IA...' : 'Salvar serviço'}
          </button>
          <Link className="botao botao--linha" to="/admin/servicos">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
