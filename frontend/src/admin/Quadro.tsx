// Trabalho #2: exemplo de gerenciamento de listas com dnd-kit.
// Cada etapa do funil é uma lista ordenável, e os cartões podem mudar de lista.
import { useEffect, useRef, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api, avisoErro, NOME_STATUS, useAdmin, type Pedido, type Status } from '../lib'

const COLUNAS = Object.keys(NOME_STATUS) as Status[]
type Quadro = Record<Status, Pedido[]>

// Transforma a lista da API em um objeto com uma lista por coluna.
function montarQuadro(pedidos: Pedido[]): Quadro {
  const quadro = Object.fromEntries(COLUNAS.map((c) => [c, []])) as unknown as Quadro
  for (const p of [...pedidos].sort((a, b) => a.ordem - b.ordem)) quadro[p.status].push(p)
  return quadro
}

// Descobre em qual coluna está um cartão. O id também pode ser o de uma coluna vazia.
function colunaDe(quadro: Quadro, id: string | number): Status | undefined {
  if (COLUNAS.includes(id as Status)) return id as Status
  return COLUNAS.find((c) => quadro[c].some((p) => p.id === id))
}

function Cartao({ pedido, flutuando = false }: { pedido: Pedido; flutuando?: boolean }) {
  return (
    <article className={`cartao ${flutuando ? 'cartao--flutuando' : ''}`}>
      <strong>{pedido.servico.titulo}</strong>
      <span>{pedido.cliente.nome}</span>
      <p>{pedido.mensagem}</p>
    </article>
  )
}

// useSortable torna o cartão arrastável e também um destino para outros cartões.
function CartaoOrdenavel({ pedido }: { pedido: Pedido }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pedido.id })
  return (
    <div
      ref={setNodeRef}
      className={`cartao-alca ${isDragging ? 'cartao-alca--origem' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`${pedido.servico.titulo}, ${pedido.cliente.nome}`}
      {...attributes}
      {...listeners}
    >
      <Cartao pedido={pedido} />
    </div>
  )
}

// useDroppable garante que uma coluna vazia também possa receber cartões.
function Coluna({ status, pedidos }: { status: Status; pedidos: Pedido[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section className={`coluna ${isOver ? 'coluna--ativa' : ''}`}>
      <h2>{NOME_STATUS[status]} <small>{pedidos.length}</small></h2>
      <SortableContext items={pedidos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="coluna__lista">
          {pedidos.map((p) => <CartaoOrdenavel key={p.id} pedido={p} />)}
        </div>
      </SortableContext>
    </section>
  )
}

export function Quadro() {
  const token = useAdmin((s) => s.token)
  const [quadro, setQuadro] = useState<Quadro | null>(null)
  const [ativo, setAtivo] = useState<Pedido | null>(null)
  const antesDoArraste = useRef<Quadro | null>(null)

  // PointerSensor com distância: um clique simples não vira arraste.
  // KeyboardSensor: dá para mover com Tab, Espaço e setas, sem mouse.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // No celular, segurar o cartão por um instante inicia o arraste. Um toque rápido só rola a tela.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    api<Pedido[]>('/pedidos', { token }).then((p) => setQuadro(montarQuadro(p))).catch(avisoErro)
  }, [token])

  function aoComecar({ active }: DragStartEvent) {
    antesDoArraste.current = quadro
    const coluna = colunaDe(quadro!, active.id)
    setAtivo(quadro![coluna!].find((p) => p.id === active.id) ?? null)
  }

  // Enquanto arrasta sobre outra coluna, o cartão já passa para ela.
  function aoPassarPorCima({ active, over }: DragOverEvent) {
    if (!over) return
    setQuadro((atual) => {
      if (!atual) return atual
      const origem = colunaDe(atual, active.id)
      const destino = colunaDe(atual, over.id)
      if (!origem || !destino || origem === destino) return atual
      const cartao = atual[origem].find((p) => p.id === active.id)!
      const posicao = atual[destino].findIndex((p) => p.id === over.id)
      const novaLista = [...atual[destino]]
      novaLista.splice(posicao === -1 ? novaLista.length : posicao, 0, cartao)
      return { ...atual, [origem]: atual[origem].filter((p) => p.id !== active.id), [destino]: novaLista }
    })
  }

  // Ao soltar, acerta a posição final e salva na API.
  async function aoSoltar({ active, over }: DragEndEvent) {
    setAtivo(null)
    const anterior = antesDoArraste.current
    if (!over || !quadro || !anterior) {
      if (anterior) setQuadro(anterior)
      return
    }
    const coluna = colunaDe(quadro, active.id)!
    const de = quadro[coluna].findIndex((p) => p.id === active.id)
    const para = quadro[coluna].findIndex((p) => p.id === over.id)
    const final = de !== para && para !== -1
      ? { ...quadro, [coluna]: arrayMove(quadro[coluna], de, para) }
      : quadro
    setQuadro(final)

    // Só envia as colunas que mudaram: a de origem e a de destino.
    const colunaOrigem = colunaDe(anterior, active.id)!
    const mudou = new Set<Status>([colunaOrigem, coluna])
    const itens = [...mudou].flatMap((c) => final[c].map((p, ordem) => ({ id: p.id, status: c, ordem })))
    try {
      await api('/pedidos/quadro', { metodo: 'PATCH', token, corpo: itens })
    } catch (erro) {
      // A tela mudou antes da resposta. Se a API falhar, volta ao estado anterior.
      setQuadro(anterior)
      avisoErro(erro)
    }
  }

  if (!quadro) return <p className="vazio">Carregando...</p>

  return (
    <>
      <h1>Quadro de pedidos</h1>
      <p className="admin__ajuda">Arraste os cartões entre as etapas. Pelo teclado: Tab para escolher, Espaço para pegar, setas para mover.</p>
      <DndContext
        sensors={sensores}
        collisionDetection={closestCorners}
        onDragStart={aoComecar}
        onDragOver={aoPassarPorCima}
        onDragEnd={aoSoltar}
        onDragCancel={() => {
          setAtivo(null)
          if (antesDoArraste.current) setQuadro(antesDoArraste.current)
        }}
      >
        <div className="quadro">
          {COLUNAS.map((c) => <Coluna key={c} status={c} pedidos={quadro[c]} />)}
        </div>
        {/* DragOverlay desenha a cópia que segue o cursor, sem ser cortada pela coluna. */}
        <DragOverlay>{ativo && <Cartao pedido={ativo} flutuando />}</DragOverlay>
      </DndContext>
    </>
  )
}
