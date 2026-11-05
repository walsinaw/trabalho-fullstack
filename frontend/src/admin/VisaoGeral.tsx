import { useEffect, useState } from 'react'
import { VictoryLabel, VictoryPie } from 'victory'
import { api, avisoErro, NOME_STATUS, useAdmin, type Status } from '../lib'

type Fatia = { nome: string; total: number }
type Dados = {
  totais: { clientes: number; servicos: number; pedidos: number }
  servicosPorCategoria: Fatia[]
  pedidosPorStatus: Fatia[]
  clientesPorCidade: Fatia[]
}

// Paleta da marca, do vermelho ao papel, com contraste entre fatias vizinhas.
const CORES = ['#b30208', '#1a1a1a', '#d9d6cf', '#6e0004', '#8c8a84', '#de040c']

function Rosca({ titulo, dados }: { titulo: string; dados: Fatia[] }) {
  return (
    <figure className="grafico">
      <figcaption>{titulo}</figcaption>
      {dados.length === 0 ? (
        <p className="vazio">Sem dados ainda.</p>
      ) : (
        <>
          <svg viewBox="0 0 320 320" role="img" aria-label={titulo}>
            <VictoryPie
              standalone={false}
              width={320}
              height={320}
              padding={6}
              innerRadius={88}
              padAngle={1.5}
              colorScale={CORES}
              data={dados.map((d) => ({ x: d.nome, y: d.total }))}
              labels={({ datum }) => datum.y}
              labelRadius={120}
              labelPlacement="vertical"
              labelComponent={
                <VictoryLabel
                  textAnchor="middle"
                  verticalAnchor="middle"
                  style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 600, fill: (a: { index?: string | number }) => (a.index === 2 ? '#1a1a1a' : '#ffffff') }}
                />
              }
            />
          </svg>
          <ul className="legenda">
            {dados.map((d, i) => (
              <li key={d.nome}>
                <i style={{ background: CORES[i % CORES.length] }} />
                {d.nome}: {d.total}
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  )
}

export function VisaoGeral() {
  const token = useAdmin((s) => s.token)
  const [dados, setDados] = useState<Dados | null>(null)

  useEffect(() => {
    api<Dados>('/admins/dashboard', { token }).then(setDados).catch(avisoErro)
  }, [token])

  if (!dados) return <p className="vazio">Carregando...</p>

  return (
    <>
      <h1>Visão geral</h1>
      <div className="numeros">
        <div><strong>{dados.totais.clientes}</strong><span>Clientes</span></div>
        <div><strong>{dados.totais.servicos}</strong><span>Serviços</span></div>
        <div><strong>{dados.totais.pedidos}</strong><span>Pedidos</span></div>
      </div>
      <div className="graficos">
        <Rosca titulo="Serviços por categoria" dados={dados.servicosPorCategoria} />
        <Rosca
          titulo="Pedidos por etapa"
          dados={dados.pedidosPorStatus.map((d) => ({ ...d, nome: NOME_STATUS[d.nome as Status] }))}
        />
        <Rosca titulo="Clientes por cidade" dados={dados.clientesPorCidade} />
      </div>
    </>
  )
}
