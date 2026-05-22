import { describe, expect, it } from 'vitest'
import { calculateEffectiveCost } from './effectiveCost'

describe('calculateEffectiveCost', () => {
  it('adds retry, human review, and CS escalation assumptions', () => {
    expect(calculateEffectiveCost({
      rawCostUsd: 100,
      retryCostUsd: 10,
      humanReviewCostUsd: 25,
      csEscalationCostUsd: 5,
    })).toBe(140)
  })

  it('guards non-finite and negative assumptions', () => {
    expect(calculateEffectiveCost({
      rawCostUsd: Number.NaN,
      retryCostUsd: -10,
      humanReviewCostUsd: 5,
      csEscalationCostUsd: 1,
    })).toBe(6)
  })
})
