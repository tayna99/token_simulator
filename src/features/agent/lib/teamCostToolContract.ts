import type { ToolResultRef, ToolValue } from './toolContract'

export type TeamCostToolRef =
  | 'tool:team.monthlyCostUsd'
  | 'tool:team.monthlyInputTokens'
  | 'tool:team.monthlyOutputTokens'
  | 'tool:team.monthlyRequests'
  | 'tool:team.cacheSavingsUsd'
  | 'tool:team.batchSavingsUsd'
  | 'tool:team.topAgentId'
  | 'tool:team.topAgentShare'
  | `tool:agent.${string}.monthlyCostUsd`
  | `tool:agent.${string}.monthlyInputTokens`
  | `tool:agent.${string}.monthlyOutputTokens`
  | `tool:agent.${string}.costShare`
  | `tool:bottleneck.${string}.severity`
  | `tool:optimization.${string}.beforeMonthlyCostUsd`
  | `tool:optimization.${string}.afterMonthlyCostUsd`
  | `tool:optimization.${string}.monthlySavingsUsd`
  | `tool:optimization.${string}.costAfterUsd`
  | `tool:optimization.${string}.affectedAgentIds`
  | `tool:benchmark.${string}.ratio`

export interface TeamCostToolSnapshotInput {
  team?: Partial<Record<'monthlyCostUsd' | 'monthlyInputTokens' | 'monthlyOutputTokens' | 'monthlyRequests' | 'cacheSavingsUsd' | 'batchSavingsUsd' | 'topAgentId' | 'topAgentShare', ToolValue>>
  agents?: Array<{
    agentId: string
    monthlyCostUsd?: number
    monthlyInputTokens?: number
    monthlyOutputTokens?: number
    costShare?: number
  }>
  optimizations?: Array<{
    id: string
    beforeMonthlyCostUsd?: number
    afterMonthlyCostUsd?: number
    monthlySavingsUsd?: number
    costAfterUsd?: number
    affectedAgentIds?: string[]
  }>
  benchmarks?: Array<{
    id: string
    ratio?: number
  }>
}

export interface TeamCostToolSnapshot {
  refs: ToolResultRef[]
  values: Partial<Record<ToolResultRef, ToolValue>>
}

function keepValue(value: unknown): value is ToolValue {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'boolean') return true
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function add(snapshot: TeamCostToolSnapshot, ref: string, value: unknown): void {
  if (!keepValue(value)) return
  const toolRef = ref as ToolResultRef
  if (!snapshot.refs.includes(toolRef)) snapshot.refs.push(toolRef)
  snapshot.values[toolRef] = value
}

export function buildTeamCostToolSnapshot(input: TeamCostToolSnapshotInput): TeamCostToolSnapshot {
  const snapshot: TeamCostToolSnapshot = { refs: [], values: {} }
  if (input.team) {
    Object.entries(input.team).forEach(([key, value]) => add(snapshot, `tool:team.${key}`, value))
  }
  input.agents?.forEach(agent => {
    add(snapshot, `tool:agent.${agent.agentId}.monthlyCostUsd`, agent.monthlyCostUsd)
    add(snapshot, `tool:agent.${agent.agentId}.monthlyInputTokens`, agent.monthlyInputTokens)
    add(snapshot, `tool:agent.${agent.agentId}.monthlyOutputTokens`, agent.monthlyOutputTokens)
    add(snapshot, `tool:agent.${agent.agentId}.costShare`, agent.costShare)
  })
  input.optimizations?.forEach(optimization => {
    add(snapshot, `tool:optimization.${optimization.id}.beforeMonthlyCostUsd`, optimization.beforeMonthlyCostUsd)
    add(snapshot, `tool:optimization.${optimization.id}.afterMonthlyCostUsd`, optimization.afterMonthlyCostUsd)
    add(snapshot, `tool:optimization.${optimization.id}.monthlySavingsUsd`, optimization.monthlySavingsUsd)
    add(snapshot, `tool:optimization.${optimization.id}.costAfterUsd`, optimization.costAfterUsd)
    add(snapshot, `tool:optimization.${optimization.id}.affectedAgentIds`, optimization.affectedAgentIds)
  })
  input.benchmarks?.forEach(benchmark => {
    add(snapshot, `tool:benchmark.${benchmark.id}.ratio`, benchmark.ratio)
  })
  return snapshot
}
