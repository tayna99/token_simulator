export interface QualityBurdenInput {
  retryCostUsd: number
  humanReviewCostUsd: number
  csEscalationCostUsd: number
}

export function calculateQualityBurden(input: QualityBurdenInput): number {
  const values = [input.retryCostUsd, input.humanReviewCostUsd, input.csEscalationCostUsd]
  if (values.some(value => !Number.isFinite(value))) return 0

  return Math.max(0, input.retryCostUsd) +
    Math.max(0, input.humanReviewCostUsd) +
    Math.max(0, input.csEscalationCostUsd)
}
