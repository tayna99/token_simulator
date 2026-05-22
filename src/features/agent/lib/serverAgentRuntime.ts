import type { AgentEvent, AgentRuntimeInput } from './agentRuntime'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

interface AgentApiBody {
  events?: unknown
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_AGENT_API_BASE_URL?.replace(/\/$/, '') ?? ''
  return `${base}${path}`
}

function isAgentEvent(value: unknown): value is AgentEvent {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AgentEvent>
  return typeof candidate.type === 'string'
    && typeof candidate.message === 'string'
    && Array.isArray(candidate.toolResultRefs)
    && Array.isArray(candidate.riskCardIds)
}

export async function runServerAgent(
  input: AgentRuntimeInput,
  fetcher: FetchLike = fetch,
): Promise<AgentEvent[]> {
  const response = await fetcher(apiUrl('/api/agent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(`Agent API request failed with ${response.status}`)
  }

  const body = await response.json() as AgentApiBody
  return Array.isArray(body.events) ? body.events.filter(isAgentEvent) : []
}
