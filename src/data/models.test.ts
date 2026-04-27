import { describe, expect, it } from 'vitest'
import { getModelById } from './models'
import { calculateCost } from '../lib/calculator'

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
})
