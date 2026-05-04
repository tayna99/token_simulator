import { describe, expect, it } from 'vitest'
import { calculateDecisionMetrics, type QualityAssumptions } from './decisionMetrics'
import type { Model } from '../data/models'

const MODEL: Model = {
  id: 'mock-model',
  name: 'Mock Model',
  provider: 'openai',
  inputPrice: 2,
  outputPrice: 10,
  contextWindow: 128000,
  releaseDate: '2026-01',
  cacheDiscount: 0.5,
  batchDiscount: 0.5,
  sourceUrl: 'https://example.com/pricing',
  sourceLabel: 'Test pricing',
  lastVerifiedAt: '2026-04-22',
  supportsCaching: true,
  supportsBatch: true,
}

const BASE_ASSUMPTIONS: QualityAssumptions = {
  qualityScore: 88,
  latencyScore: 76,
  riskScore: 24,
  toolCallReliabilityScore: 92,
  retryRate: 0,
  humanReviewRate: 0,
  csEscalationRate: 0,
  reviewCostPerRequestUsd: 0.2,
  csCostPerEscalationUsd: 4,
}

const BASE_INPUT = {
  model: MODEL,
  monthlyInputTokens: 1_000_000,
  monthlyOutputTokens: 500_000,
  monthlyRequests: 1_000,
  cacheHitRate: 0,
  batchEnabled: false,
}

describe('calculateDecisionMetrics', () => {
  it('increases effective monthly cost when retry rate rises', () => {
    const lowRetry = calculateDecisionMetrics({
      ...BASE_INPUT,
      assumptions: { ...BASE_ASSUMPTIONS, retryRate: 0.05 },
    })
    const highRetry = calculateDecisionMetrics({
      ...BASE_INPUT,
      assumptions: { ...BASE_ASSUMPTIONS, retryRate: 0.25 },
    })

    expect(lowRetry.rawMonthlyCost).toBeCloseTo(7, 4)
    expect(highRetry.effectiveMonthlyCost).toBeGreaterThan(lowRetry.effectiveMonthlyCost)
    expect(highRetry.retryCost).toBeCloseTo(1.75, 4)
  })

  it('includes human review and customer support escalation costs', () => {
    const result = calculateDecisionMetrics({
      ...BASE_INPUT,
      assumptions: {
        ...BASE_ASSUMPTIONS,
        humanReviewRate: 0.1,
        csEscalationRate: 0.02,
      },
    })

    expect(result.humanReviewCost).toBeCloseTo(20, 4)
    expect(result.csEscalationCost).toBeCloseTo(80, 4)
    expect(result.effectiveMonthlyCost).toBeCloseTo(107, 4)
  })

  it('clamps score assumptions to the 0..100 range', () => {
    const result = calculateDecisionMetrics({
      ...BASE_INPUT,
      assumptions: {
        ...BASE_ASSUMPTIONS,
        qualityScore: 140,
        latencyScore: -10,
        riskScore: 180,
        toolCallReliabilityScore: -50,
      },
    })

    expect(result.qualityScore).toBe(100)
    expect(result.latencyScore).toBe(0)
    expect(result.riskScore).toBe(100)
    expect(result.toolCallReliabilityScore).toBe(0)
  })

  it('turns NaN assumptions into safe zero values', () => {
    const result = calculateDecisionMetrics({
      ...BASE_INPUT,
      monthlyRequests: Number.NaN,
      assumptions: {
        qualityScore: Number.NaN,
        latencyScore: Number.NaN,
        riskScore: Number.NaN,
        toolCallReliabilityScore: Number.NaN,
        retryRate: Number.NaN,
        humanReviewRate: Number.NaN,
        csEscalationRate: Number.NaN,
        reviewCostPerRequestUsd: Number.NaN,
        csCostPerEscalationUsd: Number.NaN,
      },
    })

    expect(result.monthlyRequests).toBe(0)
    expect(result.effectiveMonthlyCost).toBe(result.rawMonthlyCost)
    expect(result.qualityScore).toBe(0)
    expect(result.riskLabel).toBe('Low')
  })

  it('reports cost per successful request after retries', () => {
    const result = calculateDecisionMetrics({
      ...BASE_INPUT,
      assumptions: { ...BASE_ASSUMPTIONS, retryRate: 0.25 },
    })

    expect(result.costPerSuccessfulRequest).toBeCloseTo(0.00875, 5)
    expect(result.verdict).toMatch(/assumption/i)
  })
})
