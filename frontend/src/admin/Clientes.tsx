import { useEffect, useState } from 'react'
import { api, avisoErro, useAdmin } from '../lib'

type Linha = {
  id: string
  nome: string
  email: string
  empresa: string | null
  cidade: string
  criadoEm: string
  _count: { pedidos: number }
}

export function Clientes() {
  const token = useAdmin((s) => s.token)
  const [clientes, setClientes] = useState<Linha[] | null>(null)

  useEffect(() => {
    api<Linha[]>('/clientes', { token }).then(setClientes).catch(avisoErro)
  }, [token])

  return (
    <>
      <h1>Clientes</h1>
      {!clientes ? <p className="vazio">Carregando...</p> : clientes.length === 0 ? <p className="vazio">Nenhum cliente cadastrado.</p> : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Empresa</th><th>Cidade</th><th>Pedidos</th><th>Cadastro</th></tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.nome}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.empresa ?? 'Não informada'}</td>
                  <td>{c.cidade}</td>
                  <td>{c._count.pedidos}</td>
                  <td>{new Date(c.criadoEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
