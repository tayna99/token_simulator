export type ToolResultRef = `tool:${string}`
export type ToolValue = number | string | boolean | string[]

export interface AgentToolSnapshotInput {
  monthlyAiCogs?: number
  grossMarginPct?: number
  topFeature?: string
  lossCustomerCount?: number
  riskCardIds?: string[]
}

export interface AgentToolSnapshot {
  refs: ToolResultRef[]
  values: Partial<Record<ToolResultRef, ToolValue>>
}

function keepValue(value: unknown): value is ToolValue {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'boolean') return true
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function buildAgentToolSnapshot(input: AgentToolSnapshotInput): AgentToolSnapshot {
  return Object.entries(input).reduce<AgentToolSnapshot>((snapshot, [key, value]) => {
    if (!keepValue(value)) return snapshot
    const ref = `tool:${key}` as ToolResultRef
    snapshot.refs.push(ref)
    snapshot.values[ref] = value
    return snapshot
  }, { refs: [], values: {} })
}
