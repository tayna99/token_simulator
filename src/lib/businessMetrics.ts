export interface BusinessMetricCostInput {
  denominator: number
  rawMonthlyCost: number
  effectiveMonthlyCost: number
  retryCost: number
  humanReviewCost: number
  csEscalationCost: number
}

export interface BusinessMetricUnitCosts {
  rawCostPerMetric: number
  effectiveCostPerMetric: number
  qualityBurdenPerMetric: number
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function calculateBusinessMetricUnitCosts(input: BusinessMetricCostInput): BusinessMetricUnitCosts {
  const denominator = finiteNonNegative(input.denominator)
  if (denominator <= 0) {
    return {
      rawCostPerMetric: 0,
      effectiveCostPerMetric: 0,
      qualityBurdenPerMetric: 0,
    }
  }

  const qualityBurden =
    finiteNonNegative(input.retryCost) +
    finiteNonNegative(input.humanReviewCost) +
    finiteNonNegative(input.csEscalationCost)

  return {
    rawCostPerMetric: finiteNonNegative(input.rawMonthlyCost) / denominator,
    effectiveCostPerMetric: finiteNonNegative(input.effectiveMonthlyCost) / denominator,
    qualityBurdenPerMetric: qualityBurden / denominator,
  }
}
