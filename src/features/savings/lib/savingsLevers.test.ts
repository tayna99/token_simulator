import { describe, expect, it } from 'vitest'
import { rankSavingsLevers } from './savingsLevers'
import type { Model } from '../../../data/models'

const EXPENSIVE_MODEL: Model = {
  id: 'expensive',
  name: 'Expensive Model',
  provider: 'anthropic',
  inputPrice: 5,
  outputPrice: 25,
  contextWindow: 200000,
  releaseDate: '2026-01',
  cacheDiscount: 0.9,
  batchDiscount: 0.5,
  sourceUrl: 'https://example.com/expensive',
  sourceLabel: 'Test pricing',
  lastVerifiedAt: '2026-04-22',
  supportsCaching: true,
  supportsBatch: true,
}

const CHEAP_MODEL: Model = {
  ...EXPENSIVE_MODEL,
  id: 'cheap',
  name: 'Cheap Model',
  provider: 'google',
  inputPrice: 0.1,
  outputPrice: 0.4,
  cacheDiscount: 0.5,
}

const BASE_INPUT = {
  currentModel: EXPENSIVE_MODEL,
  candidateModel: CHEAP_MODEL,
  monthlyInputTokens: 50_000_000,
  monthlyOutputTokens: 5_000_000,
  monthlyRequests: 100_000,
  cacheHitRate: 0,
  batchEnabled: false,
  cacheableShare: 0.6,
  batchableShare: 0.4,
  outputReductionRate: 0.25,
  routingEligibleShare: 0.5,
}

describe('rankSavingsLevers', () => {
  it('ranks model switch first when candidate delta is the largest saving', () => {
    const levers = rankSavingsLevers(BASE_INPUT)

    expect(levers[0].id).toBe('model-switch')
    expect(levers[0].monthlySavings).toBeGreaterThan(0)
  })

  it('requires cacheable share for prompt caching savings', () => {
    const withCacheable = rankSavingsLevers({ ...BASE_INPUT, cacheableShare: 0.6 })
      .find(lever => lever.id === 'prompt-caching')!
    const withoutCacheable = rankSavingsLevers({ ...BASE_INPUT, cacheableShare: 0 })
      .find(lever => lever.id === 'prompt-caching')!

    expect(withCacheable.monthlySavings).toBeGreaterThan(0)
    expect(withoutCacheable.monthlySavings).toBe(0)
    expect(withoutCacheable.conditionText).toMatch(/repeatable/i)
  })

  it('warns that batch processing trades off real-time response', () => {
    const batch = rankSavingsLevers(BASE_INPUT).find(lever => lever.id === 'batch-processing')!

    expect(batch.riskText).toMatch(/real-time/i)
    expect(batch.recommendedUse).toMatch(/bulk reports/i)
  })

  it('warns that output token caps can reduce answer quality', () => {
    const outputCap = rankSavingsLevers(BASE_INPUT).find(lever => lever.id === 'output-token-cap')!

    expect(outputCap.riskText).toMatch(/quality/i)
    expect(outputCap.monthlySavings).toBeGreaterThan(0)
  })

  it('includes implementation complexity for feature-level routing', () => {
    const routing = rankSavingsLevers(BASE_INPUT).find(lever => lever.id === 'feature-routing')!

    expect(routing.riskText).toMatch(/complexity/i)
    expect(routing.recommendedUse).toMatch(/mixed features/i)
  })

  it('gives every lever condition and risk text', () => {
    const levers = rankSavingsLevers(BASE_INPUT)

    expect(levers).toHaveLength(5)
    for (const lever of levers) {
      expect(lever.conditionText.length).toBeGreaterThan(0)
      expect(lever.riskText.length).toBeGreaterThan(0)
    }
  })
})
