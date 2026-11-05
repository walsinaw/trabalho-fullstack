import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './estilos.css'
import { LayoutCliente } from './cliente/LayoutCliente'
import { Inicio } from './cliente/Inicio'
import { DetalheServico } from './cliente/DetalheServico'
import { Entrar, Cadastro } from './cliente/Acesso'
import { MeusPedidos } from './cliente/MeusPedidos'
import { LayoutAdmin, LoginAdmin } from './admin/LayoutAdmin'
import { VisaoGeral } from './admin/VisaoGeral'
import { Servicos, NovoServico } from './admin/Servicos'
import { Clientes } from './admin/Clientes'
import { Pedidos } from './admin/Pedidos'
import { Quadro } from './admin/Quadro'
import { ListaSimples } from './exemplos/ListaSimples'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<LayoutCliente />}>
          <Route index element={<Inicio />} />
          <Route path="servico/:id" element={<DetalheServico />} />
          <Route path="entrar" element={<Entrar />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="meus-pedidos" element={<MeusPedidos />} />
          <Route path="exemplo-dnd" element={<ListaSimples />} />
        </Route>
        <Route path="admin/login" element={<LoginAdmin />} />
        <Route path="admin" element={<LayoutAdmin />}>
          <Route index element={<VisaoGeral />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="servicos/novo" element={<NovoServico />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="quadro" element={<Quadro />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
