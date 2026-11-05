import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { exigir, gerarToken, prisma, type RequestLogado } from '../lib.js'

const router = Router()

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo'),
  email: z.email('E-mail inválido').toLowerCase(),
  senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres'),
  empresa: z.string().trim().max(80).optional(),
  cidade: z.string().trim().min(2, 'Informe a cidade'),
})

const semSenha = { id: true, nome: true, email: true, empresa: true, cidade: true, criadoEm: true }

router.post('/', async (req, res) => {
  const dados = cadastroSchema.safeParse(req.body)
  if (!dados.success) {
    res.status(400).json({ erro: dados.error.issues[0].message })
    return
  }
  const existe = await prisma.cliente.findUnique({ where: { email: dados.data.email } })
  if (existe) {
    res.status(409).json({ erro: 'Este e-mail já tem cadastro' })
    return
  }
  const cliente = await prisma.cliente.create({
    data: { ...dados.data, senha: await bcrypt.hash(dados.data.senha, 10) },
    select: semSenha,
  })
  res.status(201).json({ cliente, token: gerarToken(cliente.id, 'cliente', cliente.nome) })
})

router.post('/login', async (req, res) => {
  const { email, senha } = req.body ?? {}
  const cliente = await prisma.cliente.findUnique({ where: { email: String(email ?? '').toLowerCase() } })
  // Mesma mensagem nos dois casos, para não revelar quais e-mails existem.
  if (!cliente || !(await bcrypt.compare(String(senha ?? ''), cliente.senha))) {
    res.status(401).json({ erro: 'E-mail ou senha incorretos' })
    return
  }
  const { senha: _, ...publico } = cliente
  res.json({ cliente: publico, token: gerarToken(cliente.id, 'cliente', cliente.nome) })
})

// Usado pelo "Manter conectado": o front lê o id do LocalStorage e recupera o cliente.
router.get('/:id', exigir('cliente'), async (req: RequestLogado, res) => {
  if (req.params.id !== req.usuarioId) {
    res.status(403).json({ erro: 'Sem permissão para esta ação' })
    return
  }
  const cliente = await prisma.cliente.findUnique({ where: { id: req.usuarioId }, select: semSenha })
  if (!cliente) {
    res.status(404).json({ erro: 'Cliente não encontrado' })
    return
  }
  res.json(cliente)
})

router.get('/', exigir('admin'), async (_req, res) => {
  const clientes = await prisma.cliente.findMany({
    select: { ...semSenha, _count: { select: { pedidos: true } } },
    orderBy: { criadoEm: 'desc' },
  })
  res.json(clientes)
})

export default router
