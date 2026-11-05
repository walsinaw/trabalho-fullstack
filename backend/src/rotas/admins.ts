import { Router } from 'express'
import bcrypt from 'bcrypt'
import { exigir, gerarToken, prisma } from '../lib.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, senha } = req.body ?? {}
  const admin = await prisma.admin.findUnique({ where: { email: String(email ?? '').toLowerCase() } })
  if (!admin || !(await bcrypt.compare(String(senha ?? ''), admin.senha))) {
    res.status(401).json({ erro: 'E-mail ou senha incorretos' })
    return
  }
  res.json({ admin: { id: admin.id, nome: admin.nome }, token: gerarToken(admin.id, 'admin', admin.nome) })
})

// Números e gráficos da Visão Geral.
router.get('/dashboard', exigir('admin'), async (_req, res) => {
  const [clientes, servicos, pedidos, porCategoria, porStatus, porCidade] = await Promise.all([
    prisma.cliente.count(),
    prisma.servico.count(),
    prisma.pedido.count(),
    prisma.categoria.findMany({ include: { _count: { select: { servicos: true } } } }),
    prisma.pedido.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.cliente.groupBy({ by: ['cidade'], _count: { _all: true } }),
  ])
  res.json({
    totais: { clientes, servicos, pedidos },
    servicosPorCategoria: porCategoria
      .filter((c) => c._count.servicos > 0)
      .map((c) => ({ nome: c.nome, total: c._count.servicos })),
    pedidosPorStatus: porStatus.map((s) => ({ nome: s.status, total: s._count._all })),
    clientesPorCidade: porCidade.map((c) => ({ nome: c.cidade, total: c._count._all })),
  })
})

export default router
