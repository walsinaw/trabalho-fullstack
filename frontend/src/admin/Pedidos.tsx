import { useCallback, useEffect, useState } from 'react'
import { alerta, api, avisoErro, NOME_STATUS, reais, useAdmin, type Pedido } from '../lib'

export function Pedidos() {
  const token = useAdmin((s) => s.token)
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)

  const carregar = useCallback(() => {
    api<Pedido[]>('/pedidos', { token }).then(setPedidos).catch(avisoErro)
  }, [token])

  useEffect(carregar, [carregar])

  async function responder(p: Pedido) {
    const { value } = await alerta.fire({
      title: `Responder ${p.cliente.nome.split(' ')[0]}`,
      text: `Pedido: ${p.servico.titulo}`,
      input: 'textarea',
      inputValue: p.resposta ?? '',
      inputPlaceholder: 'Esta resposta aparece na área do cliente e vai por e-mail',
      showCancelButton: true,
      confirmButtonText: 'Enviar resposta',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (v.trim().length < 3 ? 'Escreva a resposta' : null),
    })
    if (!value) return
    try {
      const r = await api<{ emailEnviado: boolean }>(`/pedidos/${p.id}/responder`, {
        metodo: 'PATCH',
        token,
        corpo: { resposta: value },
      })
      carregar()
      alerta.fire({
        icon: 'success',
        title: 'Resposta salva',
        text: r.emailEnviado ? 'O cliente também recebeu por e-mail.' : 'O cliente vê a resposta em Meus pedidos. O e-mail não foi enviado (SMTP não configurado ou com falha).',
      })
    } catch (erro) {
      avisoErro(erro)
    }
  }

  async function excluir(p: Pedido) {
    const { isConfirmed } = await alerta.fire({
      icon: 'warning',
      title: 'Excluir este pedido?',
      text: `${p.cliente.nome}, ${p.servico.titulo}`,
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
    })
    if (!isConfirmed) return
    try {
      await api(`/pedidos/${p.id}`, { metodo: 'DELETE', token })
      carregar()
    } catch (erro) {
      avisoErro(erro)
    }
  }

  return (
    <>
      <h1>Controle de pedidos</h1>
      {!pedidos ? <p className="vazio">Carregando...</p> : pedidos.length === 0 ? <p className="vazio">Nenhum pedido ainda.</p> : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Serviço</th><th>Cliente</th><th>Pedido do cliente</th><th>Investimento</th><th>Etapa</th><th>Resposta da WAW</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.servico.titulo}</strong><br />{reais(p.servico.precoBase)}</td>
                  <td>{p.cliente.nome}<br /><small>{p.cliente.email}</small></td>
                  <td className="tabela__texto">{p.mensagem}</td>
                  <td>{p.investimento ? reais(p.investimento) : 'Não informado'}</td>
                  <td><span className={`etiqueta etiqueta--${p.status.toLowerCase()}`}>{NOME_STATUS[p.status]}</span></td>
                  <td className="tabela__texto">{p.resposta ?? 'Sem resposta'}</td>
                  <td className="tabela__acoes">
                    <button className="link" onClick={() => responder(p)}>{p.resposta ? 'Editar' : 'Responder'}</button>
                    <button className="link link--perigo" onClick={() => excluir(p)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
