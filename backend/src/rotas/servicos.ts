import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { gerarDadosIA, iaConfigurada } from '../ia.js'
import { exigir, prisma, type RequestLogado } from '../lib.js'

const router = Router()

const servicoSchema = z.object({
  titulo: z.string().trim().min(3, 'Informe o título').max(80),
  descricao: z.string().trim().min(20, 'A descrição precisa de pelo menos 20 caracteres'),
  precoBase: z.number().positive('Informe o preço'),
  prazoDias: z.number().int().positive('Informe o prazo'),
  imagem: z.url('Informe um link válido').optional().or(z.literal('').transform(() => undefined)),
  destaque: z.boolean().default(false),
  categoriaId: z.number().int().positive('Escolha a categoria'),
})

const comCategoria = { categoria: true }

// Sem filtro: todos. Com ?destaque=true: só os destaques da página inicial.
router.get('/', async (req, res) => {
  const servicos = await prisma.servico.findMany({
    where: req.query.destaque === 'true' ? { destaque: true } : undefined,
    include: comCategoria,
    orderBy: { criadoEm: 'desc' },
  })
  res.json(servicos)
})

// Número filtra por preço máximo. Texto procura em título, descrição e categoria.
router.get('/pesquisa/:termo', async (req, res) => {
  const termo = req.params.termo.trim()
  const numero = Number(termo.replace(',', '.'))
  const where: Prisma.ServicoWhereInput = Number.isFinite(numero) && termo !== ''
    ? { precoBase: { lte: numero } }
    : {
        OR: [
          { titulo: { contains: termo, mode: 'insensitive' } },
          { descricao: { contains: termo, mode: 'insensitive' } },
          { categoria: { nome: { contains: termo, mode: 'insensitive' } } },
        ],
      }
  res.json(await prisma.servico.findMany({ where, include: comCategoria, orderBy: { precoBase: 'asc' } }))
})

router.get('/categorias', async (_req, res) => {
  res.json(await prisma.categoria.findMany({ orderBy: { nome: 'asc' } }))
})

router.get('/:id', async (req, res) => {
  const servico = await prisma.servico.findUnique({
    where: { id: Number(req.params.id) || 0 },
    include: comCategoria,
  })
  if (!servico) {
    res.status(404).json({ erro: 'Serviço não encontrado' })
    return
  }
  res.json(servico)
})

router.post('/', exigir('admin'), async (req: RequestLogado, res) => {
  const dados = servicoSchema.safeParse(req.body)
  if (!dados.success) {
    res.status(400).json({ erro: dados.error.issues[0].message })
    return
  }
  const servico = await prisma.servico.create({
    data: { ...dados.data, adminId: req.usuarioId! },
    include: comCategoria,
  })

  // Um erro na IA não pode impedir o cadastro: o admin pode gerar de novo depois.
  let iaGerada = false
  if (iaConfigurada()) {
    try {
      const dadosIA = await gerarDadosIA({ ...servico, categoria: servico.categoria.nome })
      await prisma.servico.update({ where: { id: servico.id }, data: { dadosIA } })
      iaGerada = true
    } catch (erro) {
      console.error('Falha ao consultar a IA:', erro)
    }
  }
  res.status(201).json({ servico, iaGerada })
})

router.patch('/:id/destaque', exigir('admin'), async (req, res) => {
  const id = Number(req.params.id)
  const atual = await prisma.servico.findUnique({ where: { id } })
  if (!atual) {
    res.status(404).json({ erro: 'Serviço não encontrado' })
    return
  }
  res.json(await prisma.servico.update({ where: { id }, data: { destaque: !atual.destaque } }))
})

router.post('/:id/gerar-ia', exigir('admin'), async (req, res) => {
  if (!iaConfigurada()) {
    res.status(503).json({ erro: 'A chave da IA não está configurada no servidor' })
    return
  }
  const id = Number(req.params.id)
  const servico = await prisma.servico.findUnique({ where: { id }, include: comCategoria })
  if (!servico) {
    res.status(404).json({ erro: 'Serviço não encontrado' })
    return
  }
  try {
    const dadosIA = await gerarDadosIA({ ...servico, categoria: servico.categoria.nome })
    res.json(await prisma.servico.update({ where: { id }, data: { dadosIA } }))
  } catch (erro) {
    console.error('Falha ao consultar a IA:', erro)
    res.status(502).json({ erro: 'Não foi possível consultar a IA agora' })
  }
})

router.delete('/:id', exigir('admin'), async (req, res) => {
  const id = Number(req.params.id)
  const pedidos = await prisma.pedido.count({ where: { servicoId: id } })
  if (pedidos > 0) {
    res.status(409).json({ erro: `Este serviço tem ${pedidos} pedido(s) e não pode ser excluído` })
    return
  }
  const existe = await prisma.servico.findUnique({ where: { id } })
  if (!existe) {
    res.status(404).json({ erro: 'Serviço não encontrado' })
    return
  }
  await prisma.servico.delete({ where: { id } })
  res.status(204).end()
})

export default router
