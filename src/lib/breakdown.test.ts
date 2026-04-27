import { describe, it, expect } from 'vitest'
import { calculateBreakdown } from './breakdown'
import type { Model } from '../data/models'

const MOCK: Model = {
  id: 'm', name: 'M', provider: 'anthropic',
  inputPrice: 3, outputPrice: 15, contextWindow: 100000,
  releaseDate: '2026-01', cacheDiscount: 0.9, batchDiscount: 0.5,
  sourceUrl: 'https://example.com/pricing',
  sourceLabel: 'Test pricing',
  lastVerifiedAt: '2026-04-22',
  supportsCaching: true,
  supportsBatch: true,
}

describe('calculateBreakdown', () => {
  it('splits input into cached vs uncached', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 10_000_000, monthlyOutputTokens: 2_000_000,
      cacheHitRate: 0.5, batchEnabled: false,
    })
    // 5M uncached * $3/1M = $15
    // 5M cached * $3/1M * 0.1 (after 90% discount) = $1.5
    // 2M output * $15/1M = $30
    expect(r.uncachedInputUsd).toBeCloseTo(15, 2)
    expect(r.cachedInputUsd).toBeCloseTo(1.5, 2)
    expect(r.outputUsd).toBeCloseTo(30, 2)
    expect(r.batchSavingsUsd).toBe(0) // batch off
    expect(r.totalUsd).toBeCloseTo(46.5, 2)
  })

  it('computes batch savings as separate channel', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 1_000_000, monthlyOutputTokens: 1_000_000,
      cacheHitRate: 0, batchEnabled: true,
    })
    // with batch: input $3 * 0.5 = $1.5, output $15 * 0.5 = $7.5, total $9
    // without batch would be $18; savings $9
    expect(r.totalUsd).toBeCloseTo(9, 2)
    expect(r.batchSavingsUsd).toBeCloseTo(9, 2)
  })

  it('identifies top cost channel', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 1_000_000, monthlyOutputTokens: 10_000_000,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.topChannel).toBe('output')
  })

  it('identifies uncached_input as top when input dominates', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 100_000_000, monthlyOutputTokens: 100_000,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.topChannel).toBe('uncached_input')
  })

  it('NaN input → zero safe', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: NaN, monthlyOutputTokens: NaN,
      cacheHitRate: NaN, batchEnabled: false,
    })
    expect(r.totalUsd).toBe(0)
    expect(r.topChannel).toBe('none')
  })

  it('clamps cacheHitRate to [0, 1]', () => {
    const over = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 1_000_000, monthlyOutputTokens: 0,
      cacheHitRate: 1.5, batchEnabled: false,
    })
    // should cap at 1.0 = fully cached
    expect(over.cachedInputUsd).toBeCloseTo(0.3, 2) // 1M * $3 * 0.1
    expect(over.uncachedInputUsd).toBe(0)
  })
})
