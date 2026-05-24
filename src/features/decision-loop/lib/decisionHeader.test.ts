import { describe, expect, it } from 'vitest'
import { buildDecisionHeader } from './decisionHeader'

describe('buildDecisionHeader', () => {
  it('turns the workspace summary into one decision question', () => {
    const header = buildDecisionHeader({
      recommendationTitle: 'Route summaries to a cheaper model',
      monthlySavingsUsd: 840,
      riskCardIds: ['risk-model-routing-quality'],
      pricingFreshnessState: 'verified',
    })

    expect(header.title).toBe('오늘 내려야 할 결정')
    expect(header.question).toContain('Route summaries to a cheaper model')
    expect(header.requiredChoices).toEqual(['adopt', 'reject', 'hold'])
  })

  it('asks for hold when pricing source changed', () => {
    const header = buildDecisionHeader({
      recommendationTitle: 'Update overage rate',
      monthlySavingsUsd: 1200,
      riskCardIds: ['risk-price-staleness'],
      pricingFreshnessState: 'source_changed',
    })

    expect(header.recommendedChoice).toBe('hold')
    expect(header.reason).toContain('pricing source changed')
  })
})
