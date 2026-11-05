import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import adminsRouter from './rotas/admins.js'
import clientesRouter from './rotas/clientes.js'
import pedidosRouter from './rotas/pedidos.js'
import servicosRouter from './rotas/servicos.js'

const app = express()

app.use(cors({ origin: (process.env.FRONTEND_URL ?? 'http://localhost:5175').split(',') }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ api: 'WAW Orçamentos', status: 'no ar' })
})

app.use('/servicos', servicosRouter)
app.use('/clientes', clientesRouter)
app.use('/pedidos', pedidosRouter)
app.use('/admins', adminsRouter)

// Qualquer erro inesperado responde em JSON, sem expor detalhes internos.
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(erro)
  res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes' })
})

const porta = Number(process.env.PORT ?? 3333)
app.listen(porta, () => console.log(`API em http://localhost:${porta}`))
