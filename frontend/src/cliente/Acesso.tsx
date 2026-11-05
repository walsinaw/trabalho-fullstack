import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { alerta, api, avisoErro, useCliente, type Cliente } from '../lib'

const esquemaEntrar = z.object({
  email: z.email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
  manter: z.boolean(),
})
type CamposEntrar = z.infer<typeof esquemaEntrar>

export function Entrar() {
  const navegar = useNavigate()
  const { state } = useLocation()
  const entrar = useCliente((s) => s.entrar)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CamposEntrar>({
    resolver: zodResolver(esquemaEntrar),
    defaultValues: { manter: false },
  })

  async function enviar({ email, senha, manter }: CamposEntrar) {
    try {
      const r = await api<{ cliente: Cliente; token: string }>('/clientes/login', {
        metodo: 'POST',
        corpo: { email, senha },
      })
      entrar(r.cliente, r.token, manter)
      navegar(state?.voltar ?? '/')
    } catch (erro) {
      avisoErro(erro)
    }
  }

  return (
    <section className="pagina pagina--estreita">
      <form className="formulario surgir" onSubmit={handleSubmit(enviar)}>
        <h1>Identifique-se</h1>
        <label>
          E-mail
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email && <span className="erro">{errors.email.message}</span>}
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" {...register('senha')} />
          {errors.senha && <span className="erro">{errors.senha.message}</span>}
        </label>
        <label className="marcar">
          <input type="checkbox" {...register('manter')} /> Manter conectado
        </label>
        <button className="botao botao--vermelho" disabled={isSubmitting}>Entrar</button>
        <p>Ainda não tem conta? <Link to="/cadastro" state={state}>Cadastre-se</Link></p>
      </form>
    </section>
  )
}

const esquemaCadastro = z
  .object({
    nome: z.string().trim().min(3, 'Informe o nome completo'),
    email: z.email('E-mail inválido'),
    empresa: z.string().trim().optional(),
    cidade: z.string().trim().min(2, 'Informe a cidade'),
    senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, { path: ['confirmar'], message: 'As senhas não são iguais' })
type CamposCadastro = z.infer<typeof esquemaCadastro>

export function Cadastro() {
  const navegar = useNavigate()
  const { state } = useLocation()
  const entrar = useCliente((s) => s.entrar)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CamposCadastro>({
    resolver: zodResolver(esquemaCadastro),
  })

  async function enviar({ confirmar: _, empresa, ...campos }: CamposCadastro) {
    try {
      const r = await api<{ cliente: Cliente; token: string }>('/clientes', {
        metodo: 'POST',
        corpo: { ...campos, empresa: empresa || undefined },
      })
      entrar(r.cliente, r.token, false)
      await alerta.fire({ icon: 'success', title: 'Cadastro concluído', text: `Bem-vindo(a), ${r.cliente.nome.split(' ')[0]}!` })
      navegar(state?.voltar ?? '/')
    } catch (erro) {
      avisoErro(erro)
    }
  }

  return (
    <section className="pagina pagina--estreita">
      <form className="formulario surgir" onSubmit={handleSubmit(enviar)}>
        <h1>Crie a sua conta</h1>
        <label>
          Nome completo
          <input autoComplete="name" {...register('nome')} />
          {errors.nome && <span className="erro">{errors.nome.message}</span>}
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email && <span className="erro">{errors.email.message}</span>}
        </label>
        <label>
          Empresa (opcional)
          <input autoComplete="organization" {...register('empresa')} />
        </label>
        <label>
          Cidade
          <input {...register('cidade')} />
          {errors.cidade && <span className="erro">{errors.cidade.message}</span>}
        </label>
        <label>
          Senha
          <input type="password" autoComplete="new-password" {...register('senha')} />
          {errors.senha && <span className="erro">{errors.senha.message}</span>}
        </label>
        <label>
          Confirme a senha
          <input type="password" autoComplete="new-password" {...register('confirmar')} />
          {errors.confirmar && <span className="erro">{errors.confirmar.message}</span>}
        </label>
        <button className="botao botao--vermelho" disabled={isSubmitting}>Cadastrar</button>
        <p>Já tem conta? <Link to="/entrar" state={state}>Entre aqui</Link></p>
      </form>
    </section>
  )
}
