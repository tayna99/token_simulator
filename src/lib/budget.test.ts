import { describe, it, expect } from 'vitest'
import { calculateCapacity } from './budget'
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

describe('calculateCapacity', () => {
  it('returns max requests given budget + per-request profile', () => {
    // at 100 input + 20 output tokens per request, cache 50%, no batch
    // per-request: 50 * $3/1M + 50 * $3/1M * 0.1 + 20 * $15/1M
    //            = $0.00015 + $0.000015 + $0.0003 = $0.000465
    // budget $1000 → 1000 / 0.000465 ≈ 2,150,537 requests
    const r = calculateCapacity({
      model: MOCK, monthlyBudgetUsd: 1000,
      avgInputTokensPerRequest: 100,
      avgOutputTokensPerRequest: 20,
      cacheHitRate: 0.5, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBeGreaterThan(2_000_000)
    expect(r.maxMonthlyRequests).toBeLessThan(2_200_000)
    expect(r.costPerRequestUsd).toBeCloseTo(0.000465, 6)
  })

  it('handles budget=0', () => {
    const r = calculateCapacity({
      model: MOCK, monthlyBudgetUsd: 0,
      avgInputTokensPerRequest: 100, avgOutputTokensPerRequest: 20,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBe(0)
  })

  it('handles free model (price=0)', () => {
    const free: Model = { ...MOCK, inputPrice: 0, outputPrice: 0 }
    const r = calculateCapacity({
      model: free, monthlyBudgetUsd: 1000,
      avgInputTokensPerRequest: 100, avgOutputTokensPerRequest: 20,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBe(Infinity)
    expect(r.costPerRequestUsd).toBe(0)
  })

  it('clamps negative budget to 0', () => {
    const r = calculateCapacity({
      model: MOCK, monthlyBudgetUsd: -500,
      avgInputTokensPerRequest: 100, avgOutputTokensPerRequest: 20,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBe(0)
  })
})
