import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api, avisoErro, useAdmin } from '../lib'

export function LayoutAdmin() {
  const { nome, token, sair } = useAdmin()
  const navegar = useNavigate()
  if (!token) return <Navigate to="/admin/login" replace />

  return (
    <div className="admin">
      <aside className="admin__menu">
        <Link to="/admin"><img src="/logo-waw.webp" alt="WAW Studio" /></Link>
        <nav>
          <NavLink end to="/admin">Visão geral</NavLink>
          <NavLink to="/admin/quadro">Quadro de pedidos</NavLink>
          <NavLink to="/admin/pedidos">Controle de pedidos</NavLink>
          <NavLink to="/admin/servicos">Serviços</NavLink>
          <NavLink to="/admin/clientes">Clientes</NavLink>
        </nav>
        <div className="admin__usuario">
          <span>{nome}</span>
          <button
            onClick={() => {
              sair()
              navegar('/admin/login')
            }}
          >
            Sair do sistema
          </button>
        </div>
      </aside>
      <div className="admin__conteudo">
        <Outlet />
      </div>
    </div>
  )
}

export function LoginAdmin() {
  const navegar = useNavigate()
  const { token, entrar } = useAdmin()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string; senha: string }>()

  if (token) return <Navigate to="/admin" replace />

  async function enviar(campos: { email: string; senha: string }) {
    try {
      const r = await api<{ admin: { nome: string }; token: string }>('/admins/login', { metodo: 'POST', corpo: campos })
      entrar(r.admin.nome, r.token)
      navegar('/admin')
    } catch (erro) {
      avisoErro(erro)
    }
  }

  return (
    <div className="login-admin">
      <form className="formulario" onSubmit={handleSubmit(enviar)}>
        <img src="/logo-w-vermelho.webp" alt="WAW Studio" />
        <h1>Área da equipe</h1>
        <label>
          E-mail
          <input type="email" required autoComplete="email" {...register('email')} />
        </label>
        <label>
          Senha
          <input type="password" required autoComplete="current-password" {...register('senha')} />
        </label>
        <button className="botao botao--vermelho" disabled={isSubmitting}>Entrar</button>
        <Link to="/">Voltar ao site</Link>
      </form>
    </div>
  )
}
