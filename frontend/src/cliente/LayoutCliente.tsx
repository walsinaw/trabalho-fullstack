import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCliente } from '../lib'

export function LayoutCliente() {
  const { cliente, sair, recuperar } = useCliente()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const [rolou, setRolou] = useState(false)

  // Cada página nova começa do topo.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Manter conectado: tenta recuperar o cliente salvo assim que o site abre.
  useEffect(() => {
    recuperar()
  }, [recuperar])

  // Mesmo comportamento do site da WAW: a barra vira uma pílula ao rolar.
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <>
      <header className={`topo ${rolou ? 'topo--pilula' : ''}`}>
        <div className="topo__barra">
          <Link to="/" className="topo__logo" aria-label="Página inicial">
            <img className="topo__logo-waw" src="/logo-waw.webp" alt="WAW Studio" />
            <img className="topo__logo-w" src="/logo-w.webp" alt="" />
          </Link>
          <nav className="topo__nav">
            {cliente ? (
              <>
                <NavLink to="/meus-pedidos">Meus pedidos</NavLink>
                <span className="topo__nome">{cliente.nome.split(' ')[0]}</span>
                <button
                  className="topo__sair"
                  onClick={() => {
                    sair()
                    navegar('/')
                  }}
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink to="/entrar">Identifique-se</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="rodape">
        <img src="/logo-waw.webp" alt="WAW Studio" />
        <p>Sistema de orçamentos desenvolvido para a disciplina de Linguagens de Programação Emergentes e Programação Full Stack, UniSenac Pelotas.</p>
        <Link to="/admin">Área da equipe</Link>
      </footer>
    </>
  )
}
