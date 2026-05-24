import { describe, it, expect } from 'vitest'
import {
  calculateCost,
  calculateMigrationDelta,
  calculateModalityCost,
  calculateMultimodalScenario,
} from './calculator'
import { getModelById, type Model } from '../../data/models'

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

describe('calculateModalityCost', () => {
  it('returns unsupported_pricing instead of inventing a cost when official modality pricing is missing', () => {
    const model = getModelById('gemini-omni-flash')!

    const result = calculateModalityCost({
      model,
      modality: 'video_output_seconds',
      quantity: 60,
    })

    expect(result.status).toBe('unsupported_pricing')
    expect(result.cost).toBeNull()
    expect(result.warning).toMatch(/official API price is not published/i)
  })

  it('calculates Gemini 3.5 Flash text cost from official API pricing', () => {
    const model = getModelById('gemini-3.5-flash')!

    const result = calculateCost({
      model,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 1_000_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })

    expect(result.inputCost).toBeCloseTo(1.5, 4)
    expect(result.outputCost).toBeCloseTo(9, 4)
    expect(result.monthlyCost).toBeCloseTo(10.5, 4)
  })
})

describe('calculateMultimodalScenario', () => {
  it('returns warnings for unsupported modalities instead of fake costs', () => {
    const model = getModelById('gemini-omni-flash')!

    const scenario = calculateMultimodalScenario({
      model,
      textInputTokens: 1_000_000,
      textOutputTokens: 100_000,
      videoOutputSeconds: 30,
    })

    expect(scenario.status).toBe('unsupported_pricing')
    expect(scenario.totalCost).toBeNull()
    expect(scenario.lineItems.some(item => item.modality === 'video_output_seconds')).toBe(true)
    expect(scenario.warnings).toContain('video_output_seconds: official API price is not published for Gemini Omni Flash')
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

const MOCK_MULTIMODAL: Model = {
  id: 'mock-multimodal', name: 'Mock Multimodal', provider: 'google',
  inputPrice: 1, outputPrice: 4, contextWindow: 1_000_000, releaseDate: '2026-05',
  cacheDiscount: 0.5, batchDiscount: 0.5,
  sourceUrl: 'https://example.com/multimodal',
  sourceLabel: 'Test pricing',
  lastVerifiedAt: '2026-05-24',
  supportsCaching: true,
  supportsBatch: true,
  modalities: ['text', 'image', 'audio', 'video'],
  outputModalities: ['text', 'video'],
  imageInputPrice: 2,                // USD per 1M image tokens
  audioInputPricePerSecond: 0.001,   // USD per audio second
  videoInputPricePerSecond: 0.01,    // USD per video second
  videoOutputPricePerSecond: 0.4,    // USD per generated video second
}

describe('calculateCost — multimodal', () => {
  it('omits multimodal cost when only text is provided (backward compat)', () => {
    const result = calculateCost({
      model: MOCK_MULTIMODAL,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // text only: 1M * $1 + 0.5M * $4 = $1 + $2 = $3
    expect(result.monthlyCost).toBeCloseTo(3, 4)
    expect(result.imageInputCost).toBe(0)
    expect(result.audioInputCost).toBe(0)
    expect(result.videoInputCost).toBe(0)
    expect(result.videoOutputCost).toBe(0)
  })

  it('adds image input cost per 1M tokens with batch discount applied', () => {
    const result = calculateCost({
      model: MOCK_MULTIMODAL,
      monthlyInputTokens: 0,
      monthlyOutputTokens: 0,
      monthlyImageInputTokens: 2_000_000,
      cacheHitRate: 0,
      batchEnabled: true,
    })
    // 2M * $2/1M * 0.5(batch) = $2
    expect(result.imageInputCost).toBeCloseTo(2, 4)
    expect(result.monthlyCost).toBeCloseTo(2, 4)
  })

  it('adds audio input cost per second (no cache, no batch on audio)', () => {
    const result = calculateCost({
      model: MOCK_MULTIMODAL,
      monthlyInputTokens: 0,
      monthlyOutputTokens: 0,
      monthlyAudioInputSeconds: 3_600,  // 1 hour
      cacheHitRate: 1.0,  // cache does not apply to audio
      batchEnabled: false,
    })
    // 3600 * $0.001 = $3.60
    expect(result.audioInputCost).toBeCloseTo(3.6, 4)
    expect(result.monthlyCost).toBeCloseTo(3.6, 4)
  })

  it('adds video input and video output cost per second', () => {
    const result = calculateCost({
      model: MOCK_MULTIMODAL,
      monthlyInputTokens: 0,
      monthlyOutputTokens: 0,
      monthlyVideoInputSeconds: 600,    // 10 min input
      monthlyVideoOutputSeconds: 60,    // 1 min generated
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // input: 600 * $0.01 = $6, output: 60 * $0.4 = $24
    expect(result.videoInputCost).toBeCloseTo(6, 4)
    expect(result.videoOutputCost).toBeCloseTo(24, 4)
    expect(result.monthlyCost).toBeCloseTo(30, 4)
  })

  it('sums all modalities in monthlyCost', () => {
    const result = calculateCost({
      model: MOCK_MULTIMODAL,
      monthlyInputTokens: 1_000_000,    // text in: $1
      monthlyOutputTokens: 500_000,     // text out: $2
      monthlyImageInputTokens: 1_000_000, // image: $2
      monthlyAudioInputSeconds: 1000,   // audio: $1
      monthlyVideoInputSeconds: 100,    // video in: $1
      monthlyVideoOutputSeconds: 10,    // video out: $4
      cacheHitRate: 0,
      batchEnabled: false,
    })
    expect(result.monthlyCost).toBeCloseTo(11, 4)
  })

  it('treats text-only model fields as undefined-safe (no NaN, no crash)', () => {
    const textOnly: Model = {
      ...MOCK_ANTHROPIC,
      // no modalities, no multimodal prices
    }
    const result = calculateCost({
      model: textOnly,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      monthlyImageInputTokens: 1_000_000,  // should be ignored — no imageInputPrice
      monthlyAudioInputSeconds: 100,       // should be ignored
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // only text: 1M * $3 + 0.5M * $15 = $3 + $7.5 = $10.5
    expect(result.monthlyCost).toBeCloseTo(10.5, 4)
    expect(result.imageInputCost).toBe(0)
    expect(result.audioInputCost).toBe(0)
    expect(Number.isFinite(result.monthlyCost)).toBe(true)
  })

  it('reports modalitiesUsed in result', () => {
    const result = calculateCost({
      model: MOCK_MULTIMODAL,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      monthlyVideoOutputSeconds: 10,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    expect(result.modalitiesUsed).toContain('text')
    expect(result.modalitiesUsed).toContain('video')
    expect(result.modalitiesUsed).not.toContain('image')
    expect(result.modalitiesUsed).not.toContain('audio')
  })
})
