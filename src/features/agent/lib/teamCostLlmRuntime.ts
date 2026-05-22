import type { TeamCostGraphEvent } from '../../team-cost/lib/teamCostState'
import type { ToolResultRef } from './toolContract'
import type { TeamCostRuntimeInput } from './teamCostRuntime'
import { runTeamCostAgent } from './teamCostRuntime'

export type TeamCostLlmMode = 'deterministic-fallback' | 'provider-llm'

type RuntimeEnv = Record<string, string | undefined>
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface TeamCostLlmRuntimeContext {
  env?: RuntimeEnv
  fetcher?: FetchLike
}

export interface TeamCostLlmRuntimeResult {
  events: TeamCostGraphEvent[]
  llmMode: TeamCostLlmMode
}

interface OpenAIResponsesBody {
  output_text?: unknown
  output?: unknown
  choices?: unknown
}

function isOpenAiEnabled(env: RuntimeEnv): boolean {
  return env.TEAM_COST_LLM_RUNTIME === 'openai'
    || env.TEAM_COST_LLM_RUNTIME === '1'
    || env.TEAM_COST_LLM_RUNTIME === 'true'
}

function defaultFetcher(context: TeamCostLlmRuntimeContext): FetchLike | null {
  if (context.fetcher) return context.fetcher
  return typeof fetch === 'function' ? fetch : null
}

function uniqueRefs(events: TeamCostGraphEvent[]): ToolResultRef[] {
  return [...new Set<ToolResultRef>(events.flatMap(event => event.toolResultRefs))]
}

function uniqueRiskCards(events: TeamCostGraphEvent[]): string[] {
  return [...new Set(events.flatMap(event => event.riskCardIds))]
}

function outputTextFromResponses(body: OpenAIResponsesBody): string {
  if (typeof body.output_text === 'string') return body.output_text.trim()

  if (Array.isArray(body.output)) {
    const text = body.output.flatMap(item => {
      if (!item || typeof item !== 'object') return []
      const content = (item as { content?: unknown }).content
      if (!Array.isArray(content)) return []
      return content.flatMap(part => {
        if (!part || typeof part !== 'object') return []
        const text = (part as { text?: unknown }).text
        return typeof text === 'string' ? [text] : []
      })
    }).join('\n')
    if (text.trim()) return text.trim()
  }

  if (Array.isArray(body.choices)) {
    const first = body.choices[0]
    if (first && typeof first === 'object') {
      const message = (first as { message?: { content?: unknown } }).message
      if (typeof message?.content === 'string') return message.content.trim()
    }
  }

  return ''
}

function containsNumericClaim(message: string): boolean {
  return /\b\d+(?:\.\d+)?\s*(?:%|percent|usd|dollars?|tokens?|requests?|calls?|원|달러)?\b/i.test(message)
}

function groundedProviderMessage(message: string, refs: ToolResultRef[]): { message: string; refs: ToolResultRef[] } | null {
  if (!message) return null
  const refsInMessage = refs.filter(ref => message.includes(ref))
  if (containsNumericClaim(message) && refsInMessage.length === 0) return null

  const attachedRefs = refsInMessage.length > 0 ? refsInMessage : refs.slice(0, 3)
  if (attachedRefs.length === 0) return null
  const groundedMessage = message.includes('tool:')
    ? message
    : `${message} refs: ${attachedRefs.join(', ')}`

  return { message: groundedMessage, refs: attachedRefs }
}

function buildPrompt(input: TeamCostRuntimeInput, events: TeamCostGraphEvent[], refs: string[]): string {
  return [
    'You are the AI interpretation layer for an AI team cost simulator.',
    'Do not calculate or invent numbers. Explain only using the provided deterministic tool refs.',
    'If mentioning a number, include the exact tool ref next to that claim.',
    `Company: ${input.companyProfile.companyType}, stage: ${input.companyProfile.stage}.`,
    `Workflow mode: ${input.workflowMode}.`,
    `Available tool refs: ${refs.join(', ')}.`,
    `Recent deterministic events: ${events.map(event => `${event.type}: ${event.message}`).join(' | ')}`,
    'Return one concise recommendation sentence for the right-side assistant panel.',
  ].join('\n')
}

async function requestOpenAIResponse(
  input: TeamCostRuntimeInput,
  events: TeamCostGraphEvent[],
  refs: string[],
  env: RuntimeEnv,
  fetcher: FetchLike,
): Promise<string> {
  const model = env.TEAM_COST_LLM_MODEL || env.OPENAI_MODEL || 'gpt-5'
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      instructions: 'Ground every operational interpretation in deterministic tool refs. Never make up numbers.',
      input: buildPrompt(input, events, refs),
      max_output_tokens: 220,
    }),
  })

  if (!response.ok) return ''
  return outputTextFromResponses(await response.json() as OpenAIResponsesBody)
}

export async function runTeamCostAgentWithLlm(
  input: TeamCostRuntimeInput,
  context: TeamCostLlmRuntimeContext = {},
): Promise<TeamCostLlmRuntimeResult> {
  const events = await runTeamCostAgent(input)
  const env = context.env ?? {}
  const fetcher = defaultFetcher(context)
  const refs = uniqueRefs(events)

  if (!isOpenAiEnabled(env) || !env.OPENAI_API_KEY || !fetcher) {
    return { events, llmMode: 'deterministic-fallback' }
  }

  try {
    const providerMessage = await requestOpenAIResponse(input, events, refs, env, fetcher)
    const grounded = groundedProviderMessage(providerMessage, refs)
    if (!grounded) return { events, llmMode: 'deterministic-fallback' }

    return {
      events: [
        ...events,
        {
          type: 'report_draft',
          message: grounded.message,
          toolResultRefs: grounded.refs,
          riskCardIds: uniqueRiskCards(events),
          recommendationIds: [...new Set(events.flatMap(event => event.recommendationIds))],
        },
      ],
      llmMode: 'provider-llm',
    }
  } catch {
    return { events, llmMode: 'deterministic-fallback' }
  }
}
