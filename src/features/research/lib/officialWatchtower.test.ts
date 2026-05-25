import { describe, expect, it } from 'vitest'
import {
  OFFICIAL_SOURCE_REGISTRY,
  INITIAL_MODEL_RELEASE_CANDIDATES,
  INITIAL_OFFICIAL_SOURCE_SNIPPETS,
  buildModelReleaseCandidate,
  buildOfficialUpdatesReviewInbox,
  canUseNormalizedUsdPricing,
  dedupeModelReleaseCandidates,
  officialWatchtowerCoverageSummary,
} from './officialWatchtower'

describe('officialWatchtower', () => {
  it('covers Chinese frontier model owners as first-class official research sources', () => {
    const summary = officialWatchtowerCoverageSummary()

    expect(summary.chineseActiveProviderGroups).toEqual(expect.arrayContaining([
      'alibaba_qwen',
      'moonshot_kimi',
      'deepseek',
      'zai_glm',
      'minimax',
      'bytedance_doubao',
      'baidu_ernie',
      'tencent_hunyuan',
      'stepfun',
    ]))
    expect(summary.activeChineseProviderGroupCount).toBeGreaterThanOrEqual(9)
    expect(summary.radarProviderGroups).toEqual(expect.arrayContaining([
      '01ai_yi',
      'baichuan',
      'sensetime',
    ]))
  })

  it('requires region, serving provider, source language, and parser strategy on every source', () => {
    for (const source of OFFICIAL_SOURCE_REGISTRY) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.modelOwner.length).toBeGreaterThan(0)
      expect(source.servingProvider.length).toBeGreaterThan(0)
      expect(source.pricingRegion.length).toBeGreaterThan(0)
      expect(source.sourceLanguage.length).toBeGreaterThan(0)
      expect(source.parserStrategy.length).toBeGreaterThan(0)
    }
  })

  it('tracks current Cursor Composer and Qwen3.7-Max official sources', () => {
    expect(OFFICIAL_SOURCE_REGISTRY).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'cursor-composer-25-changelog',
        modelOwner: 'cursor',
        servingProvider: 'cursor',
        modelFamilies: ['composer'],
        sourceKind: 'changelog',
        url: 'https://cursor.com/changelog/composer-2-5',
        officialSourceTrust: 'official_pricing',
      }),
      expect.objectContaining({
        id: 'alibaba-qwen37-modelstudio',
        modelOwner: 'alibaba_qwen',
        servingProvider: 'alibaba_model_studio',
        modelFamilies: ['qwen'],
        sourceKind: 'pricing',
        url: 'https://modelstudio.alibabacloud.com/',
        officialSourceTrust: 'official_pricing',
      }),
    ]))
  })

  it('tracks Big3 official pricing sources in the C1 official source registry', () => {
    expect(OFFICIAL_SOURCE_REGISTRY).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'openai-api-pricing',
        modelOwner: 'openai',
        modelFamilies: expect.arrayContaining(['gpt']),
        sourceKind: 'pricing',
        url: 'https://openai.com/api/pricing/',
        officialSourceTrust: 'official_pricing',
      }),
      expect.objectContaining({
        id: 'anthropic-claude-pricing',
        modelOwner: 'anthropic',
        modelFamilies: expect.arrayContaining(['claude']),
        sourceKind: 'pricing',
        url: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
        officialSourceTrust: 'official_pricing',
      }),
      expect.objectContaining({
        id: 'google-gemini-pricing',
        modelOwner: 'google',
        modelFamilies: expect.arrayContaining(['gemini', 'gemma']),
        sourceKind: 'pricing',
        url: 'https://ai.google.dev/gemini-api/docs/pricing',
        officialSourceTrust: 'official_pricing',
      }),
    ]))
  })

  it('keeps first-party and cloud-hosted candidates separate', () => {
    const firstParty = buildModelReleaseCandidate({
      detectedAt: '2026-05-24T00:00:00.000Z',
      sourceId: 'zai-pricing',
      sourceUrl: 'https://docs.z.ai/guides/overview/pricing',
      title: 'GLM-5 official pricing',
      modelNames: ['GLM-5'],
      modelOwner: 'zai_glm',
      modelFamily: 'glm',
      servingProvider: 'z_ai',
      pricingRegion: 'global',
      currency: 'USD',
      sourceLanguage: 'en',
      pricingStatusSuggestion: 'verified',
      officialSourceTrust: 'official_pricing',
    })
    const hosted = buildModelReleaseCandidate({
      detectedAt: '2026-05-24T00:00:00.000Z',
      sourceId: 'baidu-qianfan-pricing',
      sourceUrl: 'https://intl.cloud.baidu.com/en/doc/qianfan/s/Jm8r1826a-intl-en',
      title: 'GLM-5 hosted on Baidu Qianfan',
      modelNames: ['GLM-5'],
      modelOwner: 'zai_glm',
      modelFamily: 'glm',
      servingProvider: 'baidu_qianfan',
      pricingRegion: 'international_singapore',
      currency: 'USD',
      sourceLanguage: 'en',
      pricingStatusSuggestion: 'verified',
      officialSourceTrust: 'official_cloud_hosted',
      hostedThirdPartyModel: true,
    })

    expect(firstParty.candidateId).not.toBe(hosted.candidateId)
    expect(dedupeModelReleaseCandidates([firstParty, hosted])).toHaveLength(2)
  })

  it('does not allow derived USD pricing without an FX snapshot', () => {
    const candidate = buildModelReleaseCandidate({
      detectedAt: '2026-05-24T00:00:00.000Z',
      sourceId: 'alibaba-model-studio-pricing',
      sourceUrl: 'https://www.alibabacloud.com/help/en/model-studio/model-pricing',
      title: 'Qwen regional CNY pricing',
      modelNames: ['Qwen3 Max'],
      modelOwner: 'alibaba_qwen',
      modelFamily: 'qwen',
      servingProvider: 'alibaba_model_studio',
      pricingRegion: 'china_mainland',
      currency: 'CNY',
      sourceLanguage: 'zh',
      pricingStatusSuggestion: 'needs_fx_review',
      officialSourceTrust: 'official_pricing',
      nativePricing: {
        input: { amount: 12, currency: 'CNY', unit: 'per_1m_tokens' },
        output: { amount: 36, currency: 'CNY', unit: 'per_1m_tokens' },
      },
    })

    expect(candidate.normalizedPricing).toBeNull()
    expect(candidate.status).toBe('needs_fx_review')
    expect(canUseNormalizedUsdPricing(candidate)).toBe(false)
  })

  it('builds an admin review inbox split by review, noisy, FX, and region queues', () => {
    const fxCandidate = buildModelReleaseCandidate({
      detectedAt: '2026-05-24T00:00:00.000Z',
      sourceId: 'alibaba-model-studio-pricing',
      sourceUrl: 'https://www.alibabacloud.com/help/en/model-studio/model-pricing',
      title: 'Qwen CNY pricing candidate',
      modelNames: ['Qwen3 Max'],
      modelOwner: 'alibaba_qwen',
      modelFamily: 'qwen',
      servingProvider: 'alibaba_model_studio',
      pricingRegion: 'china_mainland',
      currency: 'CNY',
      sourceLanguage: 'zh',
      pricingStatusSuggestion: 'needs_fx_review',
      officialSourceTrust: 'official_pricing',
    })

    const inbox = buildOfficialUpdatesReviewInbox({
      candidates: [...INITIAL_MODEL_RELEASE_CANDIDATES, fxCandidate],
      snippets: INITIAL_OFFICIAL_SOURCE_SNIPPETS,
      noisyCandidates: [{ candidateId: 'noisy:generic-model', title: 'Generic model mention', reason: 'source_candidate_limit_exceeded' }],
      sourceChangedCount: 2,
    })

    expect(inbox.reviewCandidates.map(candidate => candidate.candidateId)).toEqual(expect.arrayContaining([
      'moonshot-kimi:kimi:kimi-platform:global:kimi-pricing-chat:kimi-k2-6',
      'zai-glm:glm:baidu-qianfan:international-singapore:baidu-qianfan-pricing:glm-5',
    ]))
    expect(inbox.needsRegionReview.map(candidate => candidate.modelOwner)).toContain('01ai_yi')
    expect(inbox.needsFxReview.map(candidate => candidate.modelOwner)).toContain('alibaba_qwen')
    expect(inbox.noisyCandidates).toEqual([expect.objectContaining({ reason: 'source_candidate_limit_exceeded' })])
    expect(inbox.ragRecordCount).toBe(INITIAL_OFFICIAL_SOURCE_SNIPPETS.length)
    expect(inbox.sourceChangedCount).toBe(2)
  })
})
