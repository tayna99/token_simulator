import { describe, expect, it } from 'vitest'
import { extractOfficialFacts } from './extract-official-facts.mjs'

const SOURCE = {
  id: 'alibaba-model-studio-pricing',
  modelOwner: 'alibaba_qwen',
  servingProvider: 'alibaba_model_studio',
  modelFamilies: ['qwen'],
  sourceKind: 'pricing',
  url: 'https://www.alibabacloud.com/help/en/model-studio/model-pricing',
  pricingRegion: 'international_singapore',
  sourceLanguage: 'en',
  officialSourceTrust: 'official_pricing',
  parserStrategy: 'parseAlibabaModelStudio',
}

describe('extractOfficialFacts', () => {
  it('extracts model, pricing, context, cache, batch, and availability facts from a focused official snippet', () => {
    const text = `
      <h1>Qwen3-Max pricing</h1>
      <p>Model: Qwen3-Max. API availability: Alibaba Model Studio first party API.</p>
      <table>
        <tr><td>Input</td><td>USD $1.20 / 1M tokens</td></tr>
        <tr><td>Output</td><td>USD $4.80 / 1M tokens</td></tr>
        <tr><td>Cached input</td><td>USD $0.12 / 1M tokens</td></tr>
      </table>
      <p>Context window: 1,000,000 tokens. Batch API discount: 50%.</p>
    `

    const facts = extractOfficialFacts({
      source: SOURCE,
      text,
      capturedAt: '2026-05-24T00:00:00.000Z',
    })

    expect(facts.detectedModels).toEqual([
      expect.objectContaining({
        name: 'Qwen3-Max',
        modelOwner: 'alibaba_qwen',
        modelFamily: 'qwen',
        servingProvider: 'alibaba_model_studio',
      }),
    ])
    expect(facts.pricingFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: 'input', amount: 1.2, currency: 'USD', unit: 'per_1m_tokens', parserStrategy: 'parseAlibabaModelStudio' }),
      expect.objectContaining({ metric: 'output', amount: 4.8, currency: 'USD', unit: 'per_1m_tokens', parserStrategy: 'parseAlibabaModelStudio' }),
      expect.objectContaining({ metric: 'cache_read', amount: 0.12, currency: 'USD', unit: 'per_1m_tokens', parserStrategy: 'parseAlibabaModelStudio' }),
    ]))
    expect(facts.pricingFacts.every(fact => fact.pricingRegion === 'international_singapore')).toBe(true)
    expect(facts.capabilityFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'context_window_tokens', value: 1000000 }),
      expect.objectContaining({ kind: 'batch_discount_pct', value: 50 }),
      expect.objectContaining({ kind: 'availability', value: 'first_party_api' }),
    ]))
    expect(facts.confidence).toBe('high')
    expect(facts.warnings).toEqual([])
  })

  it('keeps cloud-hosted third-party pricing from overriding first-party model facts', () => {
    const facts = extractOfficialFacts({
      source: {
        ...SOURCE,
        id: 'baidu-qianfan-pricing',
        modelOwner: 'baidu_ernie',
        servingProvider: 'baidu_qianfan',
        modelFamilies: ['ernie'],
        officialSourceTrust: 'official_cloud_hosted',
      },
      text: 'GLM-5 hosted model input USD $0.60 / 1M tokens output USD $2.00 / 1M tokens',
      capturedAt: '2026-05-24T00:00:00.000Z',
    })

    expect(facts.detectedModels[0]).toMatchObject({
      name: 'GLM-5',
      modelOwner: 'zai_glm',
      hostedThirdPartyModel: true,
    })
    expect(facts.warnings).toContain('hosted_third_party_prices_must_not_override_first_party_facts')
  })
})
