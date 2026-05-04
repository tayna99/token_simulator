import { describe, expect, it } from 'vitest'
import { calculateQualityBurden } from './qualityBurden'

describe('calculateQualityBurden', () => {
  it('adds retry, review, and CS escalation costs', () => {
    expect(calculateQualityBurden({
      retryCostUsd: 10,
      humanReviewCostUsd: 20,
      csEscalationCostUsd: 30,
    })).toBe(60)
  })

  it('guards invalid and negative values', () => {
    expect(calculateQualityBurden({
      retryCostUsd: Number.NaN,
      humanReviewCostUsd: 20,
      csEscalationCostUsd: 30,
    })).toBe(0)

    expect(calculateQualityBurden({
      retryCostUsd: -10,
      humanReviewCostUsd: 20,
      csEscalationCostUsd: 30,
    })).toBe(50)
  })
})
