import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, avisoErro, reais, SITUACAO_CLIENTE, useCliente, type Pedido } from '../lib'

export function MeusPedidos() {
  const { cliente, token } = useCliente()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)

  useEffect(() => {
    if (!token) return
    api<Pedido[]>('/pedidos/meus', { token }).then(setPedidos).catch((erro) => {
      setPedidos([])
      avisoErro(erro)
    })
  }, [token])

  if (!cliente) {
    return (
      <section className="pagina pagina--estreita">
        <h1>Meus pedidos</h1>
        <p className="vazio">Identifique-se para ver os seus pedidos.</p>
        <Link className="botao botao--vermelho" to="/entrar" state={{ voltar: '/meus-pedidos' }}>Identifique-se</Link>
      </section>
    )
  }

  return (
    <section className="pagina">
      <h1>Meus pedidos</h1>
      {pedidos === null && <p className="vazio">Carregando...</p>}
      {pedidos?.length === 0 && (
        <p className="vazio">Você ainda não pediu nenhum orçamento. <Link to="/">Ver serviços</Link></p>
      )}
      <div className="lista-pedidos">
        {pedidos?.map((p) => (
          <article className="pedido surgir" key={p.id}>
            <header>
              <h2><Link to={`/servico/${p.servico.id}`}>{p.servico.titulo}</Link></h2>
              <span className={`etiqueta etiqueta--${p.status.toLowerCase()}`}>{SITUACAO_CLIENTE[p.status]}</span>
            </header>
            <p className="pedido__data">
              Enviado em {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
              {p.investimento ? `, investimento pretendido de ${reais(p.investimento)}` : ''}
            </p>
            <p>{p.mensagem}</p>
            {p.resposta ? (
              <blockquote>
                <strong>Resposta da WAW</strong>
                <p>{p.resposta}</p>
              </blockquote>
            ) : (
              <p className="pedido__aguardando">Aguardando resposta da equipe.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
