// Dados de demonstração. Preços, clientes e pedidos são fictícios.
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient, type StatusPedido } from '@prisma/client'
import { gerarDadosIA, iaConfigurada } from '../src/ia.js'

const prisma = new PrismaClient()

const servicos = [
  ['Identidade visual', 'Branding', 3500, 30, true, 'Criação da marca do zero: logotipo, paleta, tipografia e um manual simples para manter tudo coerente em qualquer material.'],
  ['Rebranding', 'Branding', 4800, 45, false, 'Atualização de uma marca que já existe, mantendo o que o público reconhece e corrigindo o que ficou para trás.'],
  ['Site institucional', 'Web', 4200, 30, true, 'Site sob medida, rápido e adaptado ao celular, com textos pensados para explicar o negócio e gerar contatos.'],
  ['Landing page', 'Web', 1800, 15, true, 'Página única e focada em uma oferta ou campanha, com um caminho claro até o contato ou a compra.'],
  ['Loja virtual', 'Web', 6500, 45, false, 'Loja online com catálogo, carrinho, pagamento e frete configurados, pronta para a equipe do cliente administrar.'],
  ['Gestão de redes sociais', 'Social media', 1900, 30, true, 'Planejamento mensal, criação de posts, carrosséis e stories, publicação e acompanhamento dos resultados.'],
  ['Pacote de conteúdo visual', 'Social media', 950, 10, false, 'Conjunto de artes para redes sociais, entregue pronto para publicar, seguindo a identidade da marca.'],
  ['Captação de foto e vídeo', 'Audiovisual', 1200, 7, false, 'Um dia de captação no local do cliente, com edição das melhores fotos e vídeos curtos para redes sociais.'],
  ['Motion design', 'Audiovisual', 1500, 12, false, 'Animação de logotipo e peças em movimento para vídeos, anúncios e apresentações.'],
  ['Tráfego pago', 'Marketing', 1400, 30, true, 'Criação e gestão mensal de anúncios no Instagram e no Google, com relatório claro do que foi investido e do retorno.'],
  ['Assessoria de imprensa', 'Comunicação', 2200, 30, false, 'Produção de releases, relacionamento com veículos da região e acompanhamento do que foi publicado.'],
  ['Copywriting para site', 'Comunicação', 800, 10, false, 'Textos de venda e institucionais escritos a partir de uma conversa sobre o negócio e o público.'],
] as const

const clientes = [
  ['Marina Duarte', 'marina@exemplo.test', 'Café Ventura', 'Pelotas'],
  ['Rafael Teixeira', 'rafael@exemplo.test', 'Teixeira Advocacia', 'Pelotas'],
  ['Camila Prates', 'camila@exemplo.test', 'Studio Prates', 'Rio Grande'],
  ['João Nunes', 'joao@exemplo.test', null, 'Bagé'],
] as const

const pedidos: [number, number, StatusPedido, string, number | null, string | null][] = [
  [0, 0, 'NOVO', 'Vamos abrir uma segunda unidade e a marca atual foi feita às pressas. Queria algo mais maduro.', 3000, null],
  [1, 2, 'NOVO', 'Preciso de um site para o escritório, com áreas de atuação e contato pelo WhatsApp.', null, null],
  [2, 5, 'EM_CONVERSA', 'Não consigo manter o Instagram sozinha. Quero entender como funciona a gestão mensal.', 1500, null],
  [3, 3, 'PROPOSTA_ENVIADA', 'Tenho um curso novo e preciso de uma página para vender as primeiras turmas.', 1500, 'Oi, João! Conseguimos entregar em 15 dias. Enviamos o detalhamento por e-mail, qualquer dúvida é só chamar.'],
  [0, 7, 'FECHADO', 'Queria fotos do café e do cardápio novo para usar nas redes.', 1200, 'Fechado, Marina! Combinamos a captação para a próxima terça de manhã.'],
]

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@waw.test').toLowerCase()
  const senha = process.env.ADMIN_SENHA
  if (!senha) throw new Error('Defina ADMIN_SENHA no .env antes de rodar o seed')

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { nome: process.env.ADMIN_NOME ?? 'Equipe WAW', email, senha: await bcrypt.hash(senha, 10) },
  })

  if ((await prisma.servico.count()) > 0) {
    console.log('O banco já tem serviços: nada foi alterado além do admin.')
    return
  }

  const categorias = new Map<string, number>()
  for (const nome of new Set(servicos.map((s) => s[1]))) {
    categorias.set(nome, (await prisma.categoria.create({ data: { nome } })).id)
  }

  const criados = []
  for (const [titulo, categoria, precoBase, prazoDias, destaque, descricao] of servicos) {
    criados.push(
      await prisma.servico.create({
        data: { titulo, precoBase, prazoDias, destaque, descricao, categoriaId: categorias.get(categoria)!, adminId: admin.id },
        include: { categoria: true },
      }),
    )
  }

  const senhaClientes = await bcrypt.hash('cliente-teste-2026', 10)
  const clientesCriados = []
  for (const [nome, emailCliente, empresa, cidade] of clientes) {
    clientesCriados.push(
      await prisma.cliente.create({ data: { nome, email: emailCliente, empresa, cidade, senha: senhaClientes } }),
    )
  }

  for (const [i, [cliente, servico, status, mensagem, investimento, resposta]] of pedidos.entries()) {
    await prisma.pedido.create({
      data: {
        status,
        mensagem,
        investimento,
        resposta,
        ordem: i,
        respondidoEm: resposta ? new Date() : null,
        adminId: resposta ? admin.id : null,
        clienteId: clientesCriados[cliente].id,
        servicoId: criados[servico].id,
      },
    })
  }

  if (iaConfigurada()) {
    for (const s of criados) {
      const dadosIA = await gerarDadosIA({ ...s, categoria: s.categoria.nome })
      await prisma.servico.update({ where: { id: s.id }, data: { dadosIA } })
      console.log('IA gerada:', s.titulo)
    }
  } else {
    console.log('ANTHROPIC_API_KEY vazia: os dados de IA não foram gerados.')
  }
  console.log('Seed concluído.')
}

main().finally(() => prisma.$disconnect())
