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

  it('tracks Cursor Composer 2.5 standard and fast pricing as separate calculable tiers', () => {
    const standard = getModelById('composer-2.5')
    const fast = getModelById('composer-2.5-fast')

    expect(standard).toMatchObject({
      id: 'composer-2.5',
      name: 'Composer 2.5',
      provider: 'cursor',
      inputPrice: 0.5,
      outputPrice: 2.5,
      pricingStatus: 'verified',
      apiPricingAvailable: true,
      requiresCustomPricing: false,
      sourceUrl: 'https://cursor.com/changelog/composer-2-5',
      officialAnnouncementUrl: 'https://cursor.com/blog/composer-2-5',
      modelOwner: 'cursor',
      modelFamily: 'composer',
      servingProvider: 'cursor',
      pricingRegion: 'global',
      currency: 'USD',
      accessPath: 'subscription_plan',
      officialSourceTrust: 'official_pricing',
      lastVerifiedAt: '2026-05-24',
    })
    expect(fast).toMatchObject({
      id: 'composer-2.5-fast',
      name: 'Composer 2.5 Fast',
      provider: 'cursor',
      inputPrice: 3,
      outputPrice: 15,
      pricingStatus: 'verified',
      apiPricingAvailable: true,
      requiresCustomPricing: false,
      sourceUrl: 'https://cursor.com/changelog/composer-2-5',
      officialAnnouncementUrl: 'https://cursor.com/blog/composer-2-5',
      modelOwner: 'cursor',
      modelFamily: 'composer',
      servingProvider: 'cursor',
      pricingRegion: 'global',
      currency: 'USD',
      accessPath: 'subscription_plan',
      officialSourceTrust: 'official_pricing',
      lastVerifiedAt: '2026-05-24',
    })
    expect(standard?.pricingNotes).toMatch(/Kimi K2\.5/i)
    expect(fast?.pricingNotes).toMatch(/default/i)
    expect(isCostCalculableModel(standard!)).toBe(true)
    expect(isCostCalculableModel(fast!)).toBe(true)
  })

  it('tracks Qwen3.7-Max separately from older Qwen Max rows with verified Model Studio list pricing', () => {
    const model = getModelById('qwen3.7-max')

    expect(model).toMatchObject({
      id: 'qwen3.7-max',
      name: 'Qwen3.7-Max',
      provider: 'alibaba',
      inputPrice: 2.5,
      outputPrice: 7.5,
      pricingStatus: 'verified',
      apiPricingAvailable: true,
      requiresCustomPricing: false,
      sourceUrl: 'https://modelstudio.alibabacloud.com/',
      officialAnnouncementUrl: 'https://www.alibabacloud.com/en/campaign/qwen-discount?_p_lc=1',
      modelOwner: 'alibaba_qwen',
      modelFamily: 'qwen',
      servingProvider: 'alibaba_model_studio',
      pricingRegion: 'international_singapore',
      currency: 'USD',
      accessPath: 'cloud_model_studio',
      officialSourceTrust: 'official_pricing',
      lastVerifiedAt: '2026-05-24',
    })
    expect(model?.pricingNotes).toMatch(/50% promotional pricing/i)
    expect(getModelById('qwen-3-max')?.id).toBe('qwen-3-max')
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
