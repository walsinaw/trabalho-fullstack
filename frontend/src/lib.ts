import { create } from 'zustand'
import Swal from 'sweetalert2'

export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export type DadosIA = { indicadoPara: string; entregas: string[]; perguntas: string[] }
export type Categoria = { id: number; nome: string }
export type Servico = {
  id: number
  titulo: string
  descricao: string
  precoBase: string
  prazoDias: number
  imagem: string | null
  destaque: boolean
  dadosIA: DadosIA | null
  categoria: Categoria
}
export type Status = 'NOVO' | 'EM_CONVERSA' | 'PROPOSTA_ENVIADA' | 'FECHADO' | 'PERDIDO'
export type Pedido = {
  id: number
  mensagem: string
  investimento: string | null
  resposta: string | null
  status: Status
  ordem: number
  criadoEm: string
  cliente: { nome: string; email: string; empresa: string | null; cidade: string }
  servico: { id: number; titulo: string; imagem: string | null; precoBase: string }
}

export const NOME_STATUS: Record<Status, string> = {
  NOVO: 'Novos',
  EM_CONVERSA: 'Em conversa',
  PROPOSTA_ENVIADA: 'Proposta enviada',
  FECHADO: 'Fechados',
  PERDIDO: 'Perdidos',
}

export const SITUACAO_CLIENTE: Record<Status, string> = {
  NOVO: 'Recebido',
  EM_CONVERSA: 'Em conversa',
  PROPOSTA_ENVIADA: 'Proposta enviada',
  FECHADO: 'Fechado',
  PERDIDO: 'Encerrado',
}

export const reais = (valor: string | number) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Chamada à API: inclui o token, se houver, e transforma respostas de erro em exceções.
export async function api<T>(rota: string, opcoes: { metodo?: string; corpo?: unknown; token?: string | null } = {}) {
  const resposta = await fetch(API + rota, {
    method: opcoes.metodo ?? 'GET',
    headers: {
      ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
    },
    body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
  })
  if (resposta.status === 204) return undefined as T
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível concluir a ação')
  return dados as T
}

// Alertas com a cara da WAW, usados em todo o sistema.
export const alerta = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: 'alerta',
    title: 'alerta__titulo',
    htmlContainer: 'alerta__texto',
    input: 'alerta__campo',
    actions: 'alerta__acoes',
    confirmButton: 'botao botao--vermelho',
    cancelButton: 'botao botao--linha',
  },
})

export const avisoErro = (erro: unknown) =>
  alerta.fire({ icon: 'error', title: 'Algo deu errado', text: erro instanceof Error ? erro.message : String(erro) })

// ---------- Sessão do cliente ----------

export type Cliente = { id: string; nome: string; email: string; empresa: string | null; cidade: string }

const CHAVE_ID = 'waw:clienteId'
const CHAVE_TOKEN = 'waw:clienteToken'

type SessaoCliente = {
  cliente: Cliente | null
  token: string | null
  entrar: (cliente: Cliente, token: string, manterConectado: boolean) => void
  sair: () => void
  recuperar: () => Promise<void>
}

export const useCliente = create<SessaoCliente>((set) => ({
  cliente: null,
  token: null,
  entrar: (cliente, token, manterConectado) => {
    // Manter conectado: o id (UUID) fica no LocalStorage para o próximo acesso.
    if (manterConectado) {
      localStorage.setItem(CHAVE_ID, cliente.id)
      localStorage.setItem(CHAVE_TOKEN, token)
    } else {
      localStorage.removeItem(CHAVE_ID)
      localStorage.removeItem(CHAVE_TOKEN)
    }
    set({ cliente, token })
  },
  sair: () => {
    localStorage.removeItem(CHAVE_ID)
    localStorage.removeItem(CHAVE_TOKEN)
    set({ cliente: null, token: null })
  },
  // Próximo acesso: lê o id salvo e busca o cliente na API.
  recuperar: async () => {
    const id = localStorage.getItem(CHAVE_ID)
    const token = localStorage.getItem(CHAVE_TOKEN)
    if (!id || !token) return
    try {
      set({ cliente: await api<Cliente>(`/clientes/${id}`, { token }), token })
    } catch {
      localStorage.removeItem(CHAVE_ID)
      localStorage.removeItem(CHAVE_TOKEN)
    }
  },
}))

// ---------- Sessão do admin ----------

type SessaoAdmin = {
  nome: string | null
  token: string | null
  entrar: (nome: string, token: string) => void
  sair: () => void
}

const adminSalvo = (() => {
  try {
    return JSON.parse(sessionStorage.getItem('waw:admin') ?? 'null') as { nome: string; token: string } | null
  } catch {
    return null
  }
})()

export const useAdmin = create<SessaoAdmin>((set) => ({
  nome: adminSalvo?.nome ?? null,
  token: adminSalvo?.token ?? null,
  entrar: (nome, token) => {
    sessionStorage.setItem('waw:admin', JSON.stringify({ nome, token }))
    set({ nome, token })
  },
  sair: () => {
    sessionStorage.removeItem('waw:admin')
    set({ nome: null, token: null })
  },
}))
