import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import type { NextFunction, Request, Response } from 'express'

export const prisma = new PrismaClient()

const segredo = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET não configurado')
  return s
}

type Papel = 'cliente' | 'admin'
export type RequestLogado = Request & { usuarioId?: string }

export function gerarToken(id: string, papel: Papel, nome: string) {
  return jwt.sign({ id, papel, nome }, segredo(), { expiresIn: papel === 'admin' ? '8h' : '30d' })
}

// Protege uma rota: só passa quem tem um token válido do papel informado.
export function exigir(papel: Papel) {
  return (req: RequestLogado, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      res.status(401).json({ erro: 'Faça login para continuar' })
      return
    }
    try {
      const dados = jwt.verify(token, segredo()) as { id: string; papel: Papel }
      if (dados.papel !== papel) {
        res.status(403).json({ erro: 'Sem permissão para esta ação' })
        return
      }
      req.usuarioId = dados.id
      next()
    } catch {
      res.status(401).json({ erro: 'Sessão expirada. Faça login novamente' })
    }
  }
}

// Envia a resposta da equipe. Sem SMTP configurado, apenas avisa e segue.
export async function enviarEmail(para: string, assunto: string, html: string) {
  if (!process.env.SMTP_HOST) return false
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transporte.sendMail({ from: process.env.SMTP_FROM, to: para, subject: assunto, html })
  return true
}
