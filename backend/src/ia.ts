import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

// O formato que a Claude precisa devolver. A API garante JSON neste formato.
const DadosIA = z.object({
  indicadoPara: z.string().describe('Uma frase curta: para que tipo de negócio este serviço faz mais sentido'),
  entregas: z.array(z.string()).describe('De 3 a 4 itens que o cliente costuma receber'),
  perguntas: z.array(z.string()).describe('De 2 a 3 perguntas para o cliente pensar antes de pedir o orçamento'),
})

export type DadosIA = z.infer<typeof DadosIA>

export const iaConfigurada = () => Boolean(process.env.ANTHROPIC_API_KEY)

type ServicoParaIA = { titulo: string; descricao: string; categoria: string; prazoDias: number }

// Consulta a plataforma de IA e devolve os dados extras exibidos nas telas do cliente.
export async function gerarDadosIA(servico: ServicoParaIA): Promise<DadosIA> {
  const cliente = new Anthropic()

  const resposta = await cliente.beta.messages.parse({
    model: process.env.CLAUDE_MODEL ?? 'claude-opus-5-5',
    max_tokens: 2000,
    // Se o modelo principal recusar, a própria API tenta de novo em outro modelo.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system:
      'Você escreve para o catálogo de serviços da WAW Studio, uma agência de comunicação do Brasil. ' +
      'Escreva em português do Brasil, em tom direto e humano, para donos de pequenos negócios. ' +
      'Não use travessões nem emojis. Não prometa resultados nem cite valores.',
    messages: [
      {
        role: 'user',
        content:
          `Serviço: ${servico.titulo}\nCategoria: ${servico.categoria}\n` +
          `Prazo médio: ${servico.prazoDias} dias\nDescrição: ${servico.descricao}`,
      },
    ],
    output_config: { effort: 'low', format: betaZodOutputFormat(DadosIA) },
  })

  if (resposta.stop_reason === 'refusal' || !resposta.parsed_output) {
    throw new Error(`A IA não gerou os dados (motivo: ${resposta.stop_reason})`)
  }
  return resposta.parsed_output
}
