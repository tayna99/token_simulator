import type { Model } from '../data/models'
import { calculateBreakdown } from './breakdown'

export interface CapacityInput {
  model: Model
  monthlyBudgetUsd: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheHitRate: number
  batchEnabled: boolean
}

export interface CapacityResult {
  costPerRequestUsd: number
  maxMonthlyRequests: number
}

export function calculateCapacity(input: CapacityInput): CapacityResult {
  const { model, monthlyBudgetUsd,
    avgInputTokensPerRequest: inPer, avgOutputTokensPerRequest: outPer,
    cacheHitRate, batchEnabled } = input

  // compute cost at 1M requests to derive per-request cost
  const probeRequests = 1_000_000
  const br = calculateBreakdown({
    model,
    monthlyInputTokens: inPer * probeRequests,
    monthlyOutputTokens: outPer * probeRequests,
    cacheHitRate, batchEnabled,
  })

  const costPerRequestUsd = br.totalUsd / probeRequests
  const budgetClamped = Math.max(0, monthlyBudgetUsd)
  const maxMonthlyRequests = costPerRequestUsd === 0 ? Infinity
    : Math.floor(budgetClamped / costPerRequestUsd)

  return { costPerRequestUsd, maxMonthlyRequests }
}
