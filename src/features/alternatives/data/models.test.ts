import { describe, expect, it } from 'vitest'
import { MODELS, getModelById, isCostCalculableModel } from './models'
import { calculateCost } from '../../../lib/calculator'

describe('MODELS catalog', () => {
  it('includes GPT-5.5 with official OpenAI pricing metadata', () => {
    const model = getModelById('gpt-5.5')

    expect(model).toMatchObject({
      id: 'gpt-5.5',
      name: 'GPT-5.5',
      provider: 'openai',
      inputPrice: 5,
      outputPrice: 30,
      contextWindow: 1_000_000,
      cacheDiscount: 0.9,
      batchDiscount: 0.5,
      sourceUrl: 'https://openai.com/api/pricing/',
      supportsCaching: true,
      supportsBatch: true,
    })
    expect(model?.pricingNotes).toMatch(/under 270K/i)
  })

  it('calculates GPT-5.5 cached input from the official cached input price', () => {
    const model = getModelById('gpt-5.5')!

    const result = calculateCost({
      model,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 1,
      batchEnabled: false,
    })

    expect(result.monthlyCost).toBeCloseTo(0.5, 4)
  })

  it('keeps provenance and capability metadata on every catalog row', () => {
    for (const model of MODELS) {
      expect(model.sourceUrl).toMatch(/^https:\/\//)
      expect(model.sourceLabel.length).toBeGreaterThan(0)
      expect(model.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(model.supportsCaching).toBe(model.cacheDiscount > 0)
      expect(model.supportsBatch).toBe(model.batchDiscount > 0)
    }
  })

  it('keeps officially announced Google I/O models even when API pricing is not published', () => {
    const omni = getModelById('gemini-omni')
    const omniFlash = getModelById('gemini-omni-flash')
    const pro = getModelById('gemini-3.5-pro')

    for (const model of [omni, omniFlash, pro]) {
      expect(model).toBeDefined()
      expect(model?.pricingStatus).toBe('unavailable')
      expect(model?.apiPricingAvailable).toBe(false)
      expect(model?.requiresCustomPricing).toBe(true)
      expect(model?.officialAnnouncementUrl).toMatch(/^https:\/\//)
      expect(isCostCalculableModel(model!)).toBe(false)
    }
  })

  it('does not seed fake prices for announced models without API pricing', () => {
    const omniFlash = getModelById('gemini-omni-flash')!

    expect(omniFlash.inputPrice).toBe(0)
    expect(omniFlash.outputPrice).toBe(0)
    expect(omniFlash.videoOutputPricePerSecond).toBeUndefined()
    expect(omniFlash.pricingNotes).toMatch(/API pricing is not published/i)
  })

  it('uses official API pricing for Gemini 3.5 Flash', () => {
    const model = getModelById('gemini-3.5-flash')

    expect(model).toMatchObject({
      id: 'gemini-3.5-flash',
      provider: 'google',
      inputPrice: 1.5,
      outputPrice: 9,
      cacheDiscount: 0.9,
      batchDiscount: 0.5,
      pricingStatus: 'verified',
      apiPricingAvailable: true,
      lastVerifiedAt: '2026-05-24',
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    })
    expect(isCostCalculableModel(model!)).toBe(true)
  })

  it('tracks Chinese model owner and serving provider separately from display provider', () => {
    const qwen = getModelById('qwen-3-max')
    const kimi = getModelById('kimi-k2')
    const deepseek = getModelById('deepseek-r1')

    expect(qwen).toMatchObject({
      provider: 'alibaba',
      modelOwner: 'alibaba_qwen',
      modelFamily: 'qwen',
      servingProvider: 'alibaba_model_studio',
      pricingRegion: 'international_singapore',
      currency: 'USD',
      officialSourceTrust: 'official_pricing',
    })
    expect(kimi).toMatchObject({
      modelOwner: 'moonshot_kimi',
      modelFamily: 'kimi',
      servingProvider: 'kimi_platform',
    })
    expect(deepseek).toMatchObject({
      modelOwner: 'deepseek',
      modelFamily: 'deepseek',
      servingProvider: 'first_party',
    })
  })

  it('keeps additional Chinese frontier models in radar even before deterministic pricing is accepted', () => {
    const radarModels = [
      'glm-5.1',
      'minimax-m2.7',
      'doubao-seed-2.0-pro',
      'ernie-5.0',
      'hunyuan-t1',
      'step-3.5-flash',
      'yi-large',
      'baichuan4-turbo',
      'sensechat-5',
    ].map(id => getModelById(id))

    for (const model of radarModels) {
      expect(model).toBeDefined()
      expect(model?.pricingStatus).toBe('unavailable')
      expect(model?.apiPricingAvailable).toBe(false)
      expect(model?.requiresCustomPricing).toBe(true)
      expect(model?.officialAnnouncementUrl ?? model?.sourceUrl).toMatch(/^https:\/\//)
      expect(isCostCalculableModel(model!)).toBe(false)
    }
  })
})
