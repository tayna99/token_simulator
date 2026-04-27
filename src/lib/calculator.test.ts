import { describe, it, expect } from 'vitest'
import { calculateCost, calculateMigrationDelta } from './calculator'
import type { Model } from '../data/models'

const MOCK_ANTHROPIC: Model = {
  id: 'mock-anthropic', name: 'Mock Anthropic', provider: 'anthropic',
  inputPrice: 3, outputPrice: 15, contextWindow: 200000, releaseDate: '2026-01',
  cacheDiscount: 0.9, batchDiscount: 0.5,
  sourceUrl: 'https://example.com/anthropic',
  sourceLabel: 'Test pricing',
  lastVerifiedAt: '2026-04-22',
  supportsCaching: true,
  supportsBatch: true,
}

const MOCK_OPENAI: Model = {
  id: 'mock-openai', name: 'Mock OpenAI', provider: 'openai',
  inputPrice: 2.5, outputPrice: 15, contextWindow: 128000, releaseDate: '2026-01',
  cacheDiscount: 0.5, batchDiscount: 0.5,
  sourceUrl: 'https://example.com/openai',
  sourceLabel: 'Test pricing',
  lastVerifiedAt: '2026-04-22',
  supportsCaching: true,
  supportsBatch: true,
}

describe('calculateCost', () => {
  it('calculates base cost with no caching or batch', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // input: 1M * $3/1M = $3, output: 0.5M * $15/1M = $7.5
    expect(result.monthlyCost).toBeCloseTo(10.5, 4)
    expect(result.annualCost).toBeCloseTo(126, 4)
  })

  it('applies cache discount correctly', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 1.0,
      batchEnabled: false,
    })
    // cached: 1M * $3/1M * (1 - 0.9) = $0.30
    expect(result.monthlyCost).toBeCloseTo(0.3, 4)
  })

  it('applies batch discount to both input and output', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 1_000_000,
      cacheHitRate: 0,
      batchEnabled: true,
    })
    // input: $3 * 0.5 = $1.5, output: $15 * 0.5 = $7.5 → total $9
    expect(result.monthlyCost).toBeCloseTo(9, 4)
  })

  it('applies both cache and batch discount', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 2_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 0.5,
      batchEnabled: true,
    })
    // uncached 1M * $3/1M * 0.5 (batch) = $1.5
    // cached   1M * $3/1M * 0.1 (cache) * 0.5 (batch) = $0.15
    expect(result.monthlyCost).toBeCloseTo(1.65, 4)
  })

  it('models with zero discounts are unaffected by caching or batch', () => {
    const noDiscount: Model = { ...MOCK_ANTHROPIC, cacheDiscount: 0, batchDiscount: 0 }
    const result = calculateCost({
      model: noDiscount,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 1.0,
      batchEnabled: true,
    })
    expect(result.monthlyCost).toBeCloseTo(3, 4)
  })

  it('returns cost per request when monthlyRequests is provided', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      monthlyRequests: 100,
      cacheHitRate: 0,
      batchEnabled: false,
    })

    expect(result.monthlyCost).toBeCloseTo(10.5, 4)
    expect(result.costPerRequest).toBeCloseTo(0.105, 4)
  })

  it('returns zero cost per request for zero requests', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      monthlyRequests: 0,
      cacheHitRate: 0,
      batchEnabled: false,
    })

    expect(result.costPerRequest).toBe(0)
  })

  it('returns cache and batch savings using explicit baselines', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 2_000_000,
      monthlyOutputTokens: 1_000_000,
      monthlyRequests: 1_000,
      cacheHitRate: 0.5,
      batchEnabled: true,
    })

    expect(result.uncachedInputCost).toBeCloseTo(1.5, 4)
    expect(result.cachedInputCost).toBeCloseTo(0.15, 4)
    expect(result.inputCost).toBeCloseTo(1.65, 4)
    expect(result.outputCost).toBeCloseTo(7.5, 4)
    expect(result.cacheSavings).toBeCloseTo(1.35, 4)
    expect(result.batchSavings).toBeCloseTo(9.15, 4)
  })
})

describe('calculateMigrationDelta', () => {
  it('returns negative delta when candidate is cheaper', () => {
    const result = calculateMigrationDelta({
      currentModel: MOCK_ANTHROPIC,
      candidateModel: MOCK_OPENAI,
      monthlyInputTokens: 10_000_000,
      monthlyOutputTokens: 2_000_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // anthropic: 10M*$3/1M + 2M*$15/1M = $30+$30 = $60
    // openai:    10M*$2.5/1M + 2M*$15/1M = $25+$30 = $55
    expect(result.monthlyDelta).toBeCloseTo(-5, 2)
    expect(result.annualDelta).toBeCloseTo(-60, 2)
    expect(result.savingPercent).toBeCloseTo(-8.33, 1)
  })

  it('returns positive delta when candidate is more expensive', () => {
    const result = calculateMigrationDelta({
      currentModel: MOCK_OPENAI,
      candidateModel: MOCK_ANTHROPIC,
      monthlyInputTokens: 10_000_000,
      monthlyOutputTokens: 2_000_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    expect(result.monthlyDelta).toBeCloseTo(5, 2)
  })

  it('returns zero migration delta for the same model', () => {
    const result = calculateMigrationDelta({
      currentModel: MOCK_ANTHROPIC,
      candidateModel: MOCK_ANTHROPIC,
      monthlyInputTokens: 10_000_000,
      monthlyOutputTokens: 2_000_000,
      monthlyRequests: 10_000,
      cacheHitRate: 0.5,
      batchEnabled: true,
    })

    expect(result.monthlyDelta).toBe(0)
    expect(result.annualDelta).toBe(0)
    expect(result.savingPercent).toBe(0)
  })
})
