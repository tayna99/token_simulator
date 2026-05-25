import { describe, expect, it } from 'vitest'
import {
  buildCandidateFromDetectedModel,
  extractChinesePricingFacts,
  normalizeOfficialSourceText,
  officialWatchExitCode,
  parseOfficialSourceFixture,
} from './official-watch-core.mjs'

describe('official-watch-core', () => {
  it('normalizes dynamic official source text before hashing', () => {
    const normalized = normalizeOfficialSourceText(`
      <html><script>window.ts=1710000000000</script>
      <style>.x{}</style>
      <body>Qwen3 Max pricing nonce="abc123" 1710000000000</body></html>
    `)

    expect(normalized).toContain('Qwen3 Max pricing')
    expect(normalized).not.toContain('<script>')
    expect(normalized).not.toContain('1710000000000')
  })

  it('extracts native CNY token pricing without flattening it into USD', () => {
    const facts = extractChinesePricingFacts({
      provider: 'alibaba_qwen',
      text: 'Qwen3 Max input CNY 12 per 1M tokens, output CNY 36 per 1M tokens.',
      currency: 'CNY',
    })

    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: 'input', amount: 12, currency: 'CNY', unit: 'per_1m_tokens' }),
      expect.objectContaining({ metric: 'output', amount: 36, currency: 'CNY', unit: 'per_1m_tokens' }),
    ]))
    expect(facts.every(fact => fact.normalizedUsd === null)).toBe(true)
  })

  it('marks cloud-hosted third-party models separately from first-party pricing', () => {
    const parsed = parseOfficialSourceFixture({
      source: {
        id: 'baidu-qianfan-pricing',
        modelOwner: 'baidu_ernie',
        servingProvider: 'baidu_qianfan',
        pricingRegion: 'international_singapore',
        sourceLanguage: 'en',
        officialSourceTrust: 'official_cloud_hosted',
      },
      text: 'Baidu Qianfan hosts ERNIE 5.0, DeepSeek-R1, GLM-5, Kimi K2.6, and MiniMax M2.7 pricing.',
    })

    expect(parsed.detectedModels.map(model => model.name)).toEqual(expect.arrayContaining([
      'ERNIE 5.0',
      'DeepSeek-R1',
      'GLM-5',
      'Kimi K2.6',
      'MiniMax M2.7',
    ]))
    expect(parsed.detectedModels.some(model => model.hostedThirdPartyModel)).toBe(true)
  })

  it('builds unavailable candidates when an announcement has no official API price', () => {
    const candidate = buildCandidateFromDetectedModel({
      detectedAt: '2026-05-24T00:00:00.000Z',
      sourceId: 'yi-release-notes',
      sourceUrl: 'https://www.lingyiwanwu.com/',
      title: 'Yi model announcement',
      name: 'Yi Large',
      modelOwner: '01ai_yi',
      modelFamily: 'yi',
      servingProvider: 'first_party',
      pricingRegion: 'unknown',
      currency: 'USD',
      sourceLanguage: 'zh',
      officialSourceTrust: 'official_announcement',
      pricingFacts: [],
    })

    expect(candidate.pricingStatusSuggestion).toBe('unavailable')
    expect(candidate.apiPricingAvailable).toBe(false)
    expect(candidate.requiresCustomPricing).toBe(true)
    expect(candidate.status).toBe('needs_pricing_review')
  })

  it('treats dry-run source changes as a reportable event unless fail-on-change is enabled', () => {
    expect(officialWatchExitCode({
      errorCount: 0,
      changedSourceCount: 3,
      dryRun: true,
      failOnChange: false,
    })).toBe(0)
    expect(officialWatchExitCode({
      errorCount: 0,
      changedSourceCount: 3,
      dryRun: true,
      failOnChange: true,
    })).toBe(1)
    expect(officialWatchExitCode({
      errorCount: 1,
      changedSourceCount: 0,
      dryRun: true,
      failOnChange: false,
    })).toBe(2)
  })
})
