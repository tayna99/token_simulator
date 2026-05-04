import { describe, expect, it } from 'vitest'
import { calculateBusinessMetricUnitCosts } from './businessMetrics'

describe('calculateBusinessMetricUnitCosts', () => {
  it('keeps denominator user-entered and separates raw from effective unit cost', () => {
    const result = calculateBusinessMetricUnitCosts({
      denominator: 1000,
      rawMonthlyCost: 225,
      effectiveMonthlyCost: 285,
      retryCost: 25,
      humanReviewCost: 20,
      csEscalationCost: 15,
    })

    expect(result.rawCostPerMetric).toBe(0.225)
    expect(result.effectiveCostPerMetric).toBe(0.285)
    expect(result.qualityBurdenPerMetric).toBe(0.06)
  })

  it('returns zeroes for invalid denominators', () => {
    const result = calculateBusinessMetricUnitCosts({
      denominator: 0,
      rawMonthlyCost: 225,
      effectiveMonthlyCost: 285,
      retryCost: 25,
      humanReviewCost: 20,
      csEscalationCost: 15,
    })

    expect(result.rawCostPerMetric).toBe(0)
    expect(result.effectiveCostPerMetric).toBe(0)
    expect(result.qualityBurdenPerMetric).toBe(0)
  })
})
