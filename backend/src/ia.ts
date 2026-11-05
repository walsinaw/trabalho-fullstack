import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

// O formato que o Gemini precisa devolver. A resposta é conferida com este mesmo esquema.
const DadosIA = z.object({
  indicadoPara: z.string().describe('Uma frase curta: para que tipo de negócio este serviço faz mais sentido'),
  entregas: z.array(z.string()).describe('De 3 a 4 itens que o cliente costuma receber'),
  perguntas: z.array(z.string()).describe('De 2 a 3 perguntas para o cliente pensar antes de pedir o orçamento'),
})

export type DadosIA = z.infer<typeof DadosIA>

// Esquema em JSON Schema para enviar à API, sem o campo $schema, que ela não precisa.
const { $schema: _, ...esquemaJson } = z.toJSONSchema(DadosIA)

export const iaConfigurada = () => Boolean(process.env.GEMINI_API_KEY)

type ServicoParaIA = { titulo: string; descricao: string; categoria: string; prazoDias: number }

// Consulta a plataforma de IA e devolve os dados extras exibidos nas telas do cliente.
export async function gerarDadosIA(servico: ServicoParaIA): Promise<DadosIA> {
  const cliente = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const resposta = await cliente.interactions.create({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
    system_instruction:
      'Você escreve para o catálogo de serviços da WAW Studio, uma agência de comunicação do Brasil. ' +
      'Escreva em português do Brasil, em tom direto e humano, para donos de pequenos negócios. ' +
      'Não use travessões nem emojis. Não prometa resultados nem cite valores.',
    input:
      `Serviço: ${servico.titulo}\nCategoria: ${servico.categoria}\n` +
      `Prazo médio: ${servico.prazoDias} dias\nDescrição: ${servico.descricao}`,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: esquemaJson,
    },
  })

  if (!resposta.output_text) throw new Error('A IA não devolveu texto')
  return DadosIA.parse(JSON.parse(resposta.output_text))
}
