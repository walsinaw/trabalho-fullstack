// Exemplo mínimo do dnd-kit para a apresentação: uma lista que se reordena ao arrastar.
// Abra em /exemplo-dnd. O caso completo, com várias colunas, está em admin/Quadro.tsx.
import { useState } from 'react'
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function Item({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li ref={setNodeRef} style={style} className="exemplo__item" {...attributes} {...listeners}>
      {id}
    </li>
  )
}

export function ListaSimples() {
  const [itens, setItens] = useState(['Briefing', 'Criação', 'Aprovação', 'Entrega'])

  function aoSoltar({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      setItens((lista) =>
        arrayMove(lista, lista.indexOf(String(active.id)), lista.indexOf(String(over.id))),
      )
    }
  }

  return (
    <section className="pagina pagina--estreita">
      <h1>Exemplo do dnd-kit</h1>
      <DndContext collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={itens}>
          <ul className="exemplo">
            {itens.map((id) => <Item key={id} id={id} />)}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  )
}
