import { describe, expect, it } from 'vitest'
import type { Model } from '../../../data/models'
import { buildPricingFreshnessBadge, decisionNeedsPricingRecheck } from './pricingFreshness'

const BASE_MODEL: Model = {
  id: 'gemini-3.5-flash',
  name: 'Gemini 3.5 Flash',
  provider: 'google',
  inputPrice: 1.5,
  outputPrice: 9,
  contextWindow: 1_000_000,
  releaseDate: '2026-05',
  cacheDiscount: 0.9,
  batchDiscount: 0.5,
  sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  sourceLabel: 'Official pricing page',
  lastVerifiedAt: '2026-05-24',
  supportsCaching: true,
  supportsBatch: true,
  pricingStatus: 'verified',
  apiPricingAvailable: true,
  requiresCustomPricing: false,
}

describe('pricingFreshness', () => {
  it('returns verified for fresh official pricing', () => {
    expect(buildPricingFreshnessBadge({
      model: BASE_MODEL,
      capturedAt: '2026-05-24T00:00:00.000Z',
    })).toMatchObject({
      state: 'verified',
      label: 'Verified',
      recheckRequired: false,
    })
  })

  it('uses source_changed when Watchtower reports a source change', () => {
    expect(buildPricingFreshnessBadge({
      model: BASE_MODEL,
      capturedAt: '2026-05-24T00:00:00.000Z',
      sourceChanged: true,
    })).toMatchObject({
      state: 'source_changed',
      label: 'Source Changed',
      recheckRequired: true,
    })
  })

  it('marks unavailable pricing as tbd instead of pretending it is verified', () => {
    const badge = buildPricingFreshnessBadge({
      model: {
        ...BASE_MODEL,
        id: 'gemini-omni',
        name: 'Gemini Omni',
        inputPrice: 0,
        outputPrice: 0,
        pricingStatus: 'unavailable',
        apiPricingAvailable: false,
        requiresCustomPricing: true,
      },
      capturedAt: '2026-05-24T00:00:00.000Z',
    })

    expect(badge.state).toBe('tbd')
    expect(badge.customerLabel).toContain('API price is not available')
  })

  it('flags past decisions for recheck when their model source changed', () => {
    expect(decisionNeedsPricingRecheck({
      modelIds: ['gemini-3.5-flash'],
      changedModelIds: ['gemini-3.5-flash'],
    })).toBe(true)
  })
})
