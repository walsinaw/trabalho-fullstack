import { Router } from 'express'
import { z } from 'zod'
import { enviarEmail, exigir, prisma, type RequestLogado } from '../lib.js'

const router = Router()

const novoSchema = z.object({
  servicoId: z.number().int().positive(),
  mensagem: z.string().trim().min(10, 'Conte um pouco mais sobre o projeto'),
  investimento: z.number().positive().optional(),
})

const STATUS = ['NOVO', 'EM_CONVERSA', 'PROPOSTA_ENVIADA', 'FECHADO', 'PERDIDO'] as const

const incluirTudo = {
  cliente: { select: { nome: true, email: true, empresa: true, cidade: true } },
  servico: { select: { id: true, titulo: true, imagem: true, precoBase: true } },
}

router.post('/', exigir('cliente'), async (req: RequestLogado, res) => {
  const dados = novoSchema.safeParse(req.body)
  if (!dados.success) {
    res.status(400).json({ erro: dados.error.issues[0].message })
    return
  }
  const servico = await prisma.servico.findUnique({ where: { id: dados.data.servicoId } })
  if (!servico) {
    res.status(404).json({ erro: 'Serviço não encontrado' })
    return
  }
  // O pedido novo entra no fim da coluna "Novos" do quadro.
  const ordem = await prisma.pedido.count({ where: { status: 'NOVO' } })
  const pedido = await prisma.pedido.create({
    data: { ...dados.data, clienteId: req.usuarioId!, ordem },
  })
  res.status(201).json(pedido)
})

router.get('/meus', exigir('cliente'), async (req: RequestLogado, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: req.usuarioId },
    include: { servico: incluirTudo.servico },
    orderBy: { criadoEm: 'desc' },
  })
  res.json(pedidos)
})

router.get('/', exigir('admin'), async (_req, res) => {
  const pedidos = await prisma.pedido.findMany({
    include: incluirTudo,
    orderBy: [{ status: 'asc' }, { ordem: 'asc' }, { criadoEm: 'desc' }],
  })
  res.json(pedidos)
})

// Recebe o resultado de um arraste no quadro: o novo status e a ordem de cada cartão afetado.
// Roda em transação para o quadro nunca ficar pela metade.
const quadroSchema = z.array(
  z.object({ id: z.number().int(), status: z.enum(STATUS), ordem: z.number().int().min(0) }),
)

router.patch('/quadro', exigir('admin'), async (req, res) => {
  const itens = quadroSchema.safeParse(req.body)
  if (!itens.success) {
    res.status(400).json({ erro: 'Dados do quadro inválidos' })
    return
  }
  await prisma.$transaction(
    itens.data.map(({ id, status, ordem }) =>
      prisma.pedido.update({ where: { id }, data: { status, ordem } }),
    ),
  )
  res.json({ ok: true })
})

router.patch('/:id/responder', exigir('admin'), async (req: RequestLogado, res) => {
  const resposta = z.string().trim().min(3, 'Escreva a resposta').safeParse(req.body?.resposta)
  if (!resposta.success) {
    res.status(400).json({ erro: resposta.error.issues[0].message })
    return
  }
  const id = Number(req.params.id)
  const atual = await prisma.pedido.findUnique({ where: { id } })
  if (!atual) {
    res.status(404).json({ erro: 'Pedido não encontrado' })
    return
  }
  const pedido = await prisma.pedido.update({
    where: { id },
    data: {
      resposta: resposta.data,
      respondidoEm: new Date(),
      adminId: req.usuarioId,
      // Responder um pedido novo já o avança no funil.
      status: atual.status === 'NOVO' ? 'PROPOSTA_ENVIADA' : atual.status,
    },
    include: incluirTudo,
  })

  let emailEnviado = false
  try {
    emailEnviado = await enviarEmail(
      pedido.cliente.email,
      `WAW Studio: resposta sobre ${pedido.servico.titulo}`,
      `<p>Olá, ${pedido.cliente.nome}!</p>
       <p>Sobre o seu pedido de <strong>${pedido.servico.titulo}</strong>:</p>
       <p>${resposta.data.replace(/</g, '&lt;')}</p>
       <p>Equipe WAW Studio</p>`,
    )
  } catch (erro) {
    // A resposta já foi salva e aparece na área do cliente, mesmo se o e-mail falhar.
    console.error('Falha ao enviar e-mail:', erro)
  }
  res.json({ pedido, emailEnviado })
})

router.delete('/:id', exigir('admin'), async (req, res) => {
  const id = Number(req.params.id)
  const existe = await prisma.pedido.findUnique({ where: { id } })
  if (!existe) {
    res.status(404).json({ erro: 'Pedido não encontrado' })
    return
  }
  await prisma.pedido.delete({ where: { id } })
  res.status(204).end()
})

export default router
