import type { TeamCostGraphEvent } from '../../team-cost/lib/teamCostState'
import { runTeamCostAgent, type TeamCostRuntimeInput } from './teamCostRuntime'

export type TeamCostLlmMode = 'deterministic-fallback' | 'provider-llm'
export type TeamCostAgentRuntimeMode = 'local' | 'server'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface TeamCostAgentRuntimeResult {
  events: TeamCostGraphEvent[]
  llmMode: TeamCostLlmMode
}

export interface TeamCostAgentRuntimeOptions {
  runtime?: TeamCostAgentRuntimeMode
  fetcher?: FetchLike
}

interface TeamCostAgentApiBody {
  events?: unknown
  llmMode?: TeamCostLlmMode
}

function runtimeFromEnv(): TeamCostAgentRuntimeMode {
  return import.meta.env.VITE_TEAM_COST_RUNTIME === 'server' ? 'server' : 'local'
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_AGENT_API_BASE_URL?.replace(/\/$/, '') ?? ''
  return `${base}${path}`
}

function isTeamCostEvent(value: unknown): value is TeamCostGraphEvent {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<TeamCostGraphEvent>
  return typeof candidate.type === 'string'
    && typeof candidate.message === 'string'
    && Array.isArray(candidate.toolResultRefs)
    && Array.isArray(candidate.riskCardIds)
    && Array.isArray(candidate.recommendationIds)
}

export async function runTeamCostAgentRuntime(
  input: TeamCostRuntimeInput,
  options: TeamCostAgentRuntimeOptions = {},
): Promise<TeamCostAgentRuntimeResult> {
  const deterministicEvents = await runTeamCostAgent(input)
  const runtime = options.runtime ?? runtimeFromEnv()

  if (runtime !== 'server') {
    return { events: deterministicEvents, llmMode: 'deterministic-fallback' }
  }

  const fetcher = options.fetcher ?? fetch
  try {
    const response = await fetcher(apiUrl('/api/team-cost-agent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        deterministicEvents,
      }),
    })
    if (!response.ok) {
      return { events: deterministicEvents, llmMode: 'deterministic-fallback' }
    }

    const body = await response.json() as TeamCostAgentApiBody
    const events = Array.isArray(body.events) ? body.events.filter(isTeamCostEvent) : deterministicEvents
    return {
      events: events.length > 0 ? events : deterministicEvents,
      llmMode: body.llmMode ?? 'deterministic-fallback',
    }
  } catch {
    return { events: deterministicEvents, llmMode: 'deterministic-fallback' }
  }
}
