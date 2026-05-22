import type { CalcResult } from '../../../lib/calculator'
import { calculateCost } from '../../../lib/calculator'
import type { Model } from '../../alternatives/data/models'
import { normalizeFrequencyToMonthlyRuns, sanitizeAgentSpec, sumArtifactTokens, type AgentSpec } from './agentSpec'

export interface AgentWorkloadInput {
  spec: AgentSpec
  model: Model
}

export interface AgentCostEstimate {
  agentId: string
  role: string
  modelId: string
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests: number
  cacheSavingsUsd: number
  batchSavingsUsd: number
  cost: Pick<CalcResult, 'monthlyCost'> & Partial<CalcResult>
}

export interface TeamCostEstimate {
  monthlyCostUsd: number
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests: number
  cacheSavingsUsd: number
  batchSavingsUsd: number
  topAgentId: string | null
  topAgentShare: number
}

function stableNumber(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(10)) : 0
}

export function estimateAgentWorkload(input: AgentWorkloadInput): AgentCostEstimate {
  const spec = sanitizeAgentSpec(input.spec)
  const runsPerMonth = normalizeFrequencyToMonthlyRuns(spec.frequency)
  const inputTokensPerRun = sumArtifactTokens(spec.inputs)
  const reusableInputTokensPerRun = sumArtifactTokens(spec.inputs.filter(input => input.reusedEachRun))
  const effectiveCacheHitRate = inputTokensPerRun > 0
    ? spec.cacheHitRate * (reusableInputTokensPerRun / inputTokensPerRun)
    : 0
  const outputTokensPerRun = sumArtifactTokens(spec.outputs)
  const retryMultiplier = 1 + spec.retryRate

  const monthlyInputTokens = stableNumber(inputTokensPerRun * spec.callsPerRun * retryMultiplier * runsPerMonth)
  const monthlyOutputTokens = stableNumber(outputTokensPerRun * spec.callsPerRun * retryMultiplier * runsPerMonth)
  const monthlyRequests = stableNumber(spec.callsPerRun * retryMultiplier * runsPerMonth)
  const cost = calculateCost({
    model: input.model,
    monthlyInputTokens,
    monthlyOutputTokens,
    monthlyRequests,
    cacheHitRate: effectiveCacheHitRate,
    batchEnabled: spec.batchEnabled,
  })

  return {
    agentId: spec.id,
    role: spec.role,
    modelId: spec.modelId,
    monthlyInputTokens,
    monthlyOutputTokens,
    monthlyRequests,
    cacheSavingsUsd: cost.cacheSavings,
    batchSavingsUsd: cost.batchSavings,
    cost,
  }
}

export function summarizeTeamCost(estimates: AgentCostEstimate[]): TeamCostEstimate {
  const monthlyCostUsd = estimates.reduce((sum, estimate) => sum + estimate.cost.monthlyCost, 0)
  const monthlyInputTokens = estimates.reduce((sum, estimate) => sum + estimate.monthlyInputTokens, 0)
  const monthlyOutputTokens = estimates.reduce((sum, estimate) => sum + estimate.monthlyOutputTokens, 0)
  const monthlyRequests = estimates.reduce((sum, estimate) => sum + estimate.monthlyRequests, 0)
  const cacheSavingsUsd = estimates.reduce((sum, estimate) => sum + estimate.cacheSavingsUsd, 0)
  const batchSavingsUsd = estimates.reduce((sum, estimate) => sum + estimate.batchSavingsUsd, 0)
  const top = [...estimates].sort((a, b) => b.cost.monthlyCost - a.cost.monthlyCost)[0]

  return {
    monthlyCostUsd,
    monthlyInputTokens,
    monthlyOutputTokens,
    monthlyRequests,
    cacheSavingsUsd,
    batchSavingsUsd,
    topAgentId: top?.agentId ?? null,
    topAgentShare: top && monthlyCostUsd > 0 ? top.cost.monthlyCost / monthlyCostUsd : 0,
  }
}
