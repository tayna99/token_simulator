export interface EffectiveCostInput {
  rawCostUsd: number
  retryCostUsd?: number
  humanReviewCostUsd?: number
  csEscalationCostUsd?: number
}

function finiteNonNegative(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0
}

export function calculateEffectiveCost(input: EffectiveCostInput): number {
  return finiteNonNegative(input.rawCostUsd)
    + finiteNonNegative(input.retryCostUsd)
    + finiteNonNegative(input.humanReviewCostUsd)
    + finiteNonNegative(input.csEscalationCostUsd)
}
