import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, avisoErro, reais, type Servico } from '../lib'

function Capa({ servico, posicao }: { servico: Servico; posicao: number }) {
  if (servico.imagem) return <img className="card__capa" src={servico.imagem} alt="" />
  return (
    <div className={`card__capa card__capa--${posicao % 3}`} aria-hidden="true">
      <span>{servico.categoria.nome}</span>
    </div>
  )
}

export function Inicio() {
  const [servicos, setServicos] = useState<Servico[] | null>(null)
  const [termo, setTermo] = useState('')
  const [titulo, setTitulo] = useState('Serviços em destaque')

  const carregarDestaques = useCallback(async () => {
    setServicos(null)
    try {
      setServicos(await api<Servico[]>('/servicos?destaque=true'))
      setTitulo('Serviços em destaque')
      setTermo('')
    } catch (erro) {
      setServicos([])
      avisoErro(erro)
    }
  }, [])

  useEffect(() => {
    carregarDestaques()
  }, [carregarDestaques])

  async function pesquisar(evento: FormEvent) {
    evento.preventDefault()
    const busca = termo.trim()
    if (!busca) return carregarDestaques()
    setServicos(null)
    try {
      setServicos(await api<Servico[]>(`/servicos/pesquisa/${encodeURIComponent(busca)}`))
      setTitulo(`Resultado para "${busca}"`)
    } catch (erro) {
      setServicos([])
      avisoErro(erro)
    }
  }

  const temIA = servicos?.some((s) => s.dadosIA)

  return (
    <>
      <section className="capa">
        <div className="capa__conteudo surgir">
          <h1>Comunicação que faz o seu negócio ser lembrado.</h1>
          <p>Escolha o serviço, conte sobre o seu projeto e receba a resposta da equipe da WAW aqui mesmo.</p>
          <form className="busca" onSubmit={pesquisar} role="search">
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Serviço, categoria ou preço máximo"
              aria-label="Pesquisar serviços"
            />
            <button className="botao botao--vermelho" type="submit">Pesquisar</button>
          </form>
          <button className="botao botao--claro" type="button" onClick={carregarDestaques}>
            Exibir destaques
          </button>
        </div>
      </section>

      <section className="secao secao--papel">
        <h2 className="secao__titulo">{titulo}</h2>
        {servicos === null && <p className="vazio">Carregando serviços...</p>}
        {servicos?.length === 0 && (
          <p className="vazio">Nenhum serviço encontrado. Tente outra palavra ou um valor maior.</p>
        )}
        <div className="grade">
          {servicos?.map((s, i) => (
            <article className="card surgir" style={{ animationDelay: `${i * 70}ms` }} key={s.id}>
              <Capa servico={s} posicao={i} />
              <div className="card__corpo">
                {s.imagem && <p className="card__categoria">{s.categoria.nome}</p>}
                <h3>{s.titulo}</h3>
                <p className="card__preco">A partir de {reais(s.precoBase)}</p>
                <p className="card__prazo">Prazo médio: {s.prazoDias} dias</p>
                {s.dadosIA && <p className="card__ia">Indicado para: {s.dadosIA.indicadoPara} *</p>}
                <Link className="botao botao--escuro" to={`/servico/${s.id}`}>Ver detalhes</Link>
              </div>
            </article>
          ))}
        </div>
        {temIA && <p className="nota-ia">* Informação gerada por IA (Claude, da Anthropic). Sujeita a erros.</p>}
      </section>
    </>
  )
}
