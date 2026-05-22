import { createAgentGraph } from './agentGraph'
import { runServerAgent } from './serverAgentRuntime'
import { buildAgentToolSnapshot } from './toolContract'

export type AgentEventType = 'tool_snapshot' | 'analysis' | 'pricing_strategy' | 'risk_audit' | 'report_draft'

export interface AgentRuntimeInput {
  apiKey: string
  toolResults: Record<string, number | string>
  riskCardIds: string[]
}

export interface AgentEvent {
  type: AgentEventType
  message: string
  toolResultRefs: string[]
  riskCardIds: string[]
}

function shouldUseServerRuntime(): boolean {
  return import.meta.env.VITE_AGENT_RUNTIME === 'server' && typeof fetch === 'function'
}

export async function runBrowserAgent(input: AgentRuntimeInput): Promise<AgentEvent[]> {
  const snapshot = buildAgentToolSnapshot({
    monthlyAiCogs: typeof input.toolResults.monthlyAiCogs === 'number' ? input.toolResults.monthlyAiCogs : undefined,
    topFeature: typeof input.toolResults.topFeature === 'string' ? input.toolResults.topFeature : undefined,
    grossMarginPct: typeof input.toolResults.grossMarginPct === 'number' ? input.toolResults.grossMarginPct : undefined,
    lossCustomerCount: typeof input.toolResults.lossCustomerCount === 'number' ? input.toolResults.lossCustomerCount : undefined,
    riskCardIds: input.riskCardIds,
  })
  const graph = createAgentGraph()
  const result = await graph.invoke({
    events: [],
    toolRefs: snapshot.refs,
    toolValues: snapshot.values,
    riskCardIds: input.riskCardIds,
  })

  return result.events
}

export async function runAgent(input: AgentRuntimeInput): Promise<AgentEvent[]> {
  if (shouldUseServerRuntime()) {
    return runServerAgent(input)
  }

  return runBrowserAgent(input)
}
