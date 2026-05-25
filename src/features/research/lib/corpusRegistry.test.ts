import { describe, expect, it } from 'vitest'
import {
  BENCHMARK_CORPUS_SOURCES,
  corpusRegistryCoverageAudit,
  officialSourceCoverageAudit,
} from './corpusRegistry'

describe('corpusRegistry', () => {
  it('registers C2 benchmark sources as evidence-only consumers for model research and routing agents', () => {
    expect(BENCHMARK_CORPUS_SOURCES).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'artificial-analysis-models',
        corpusId: 'model_benchmark',
        corpusTrust: 'third_party_benchmark',
        evidenceRefPrefix: 'evidence:',
        ownerAgentIds: ['model_inference_research'],
        consumerAgentIds: expect.arrayContaining(['model_inference_research', 'optimization_routing']),
        mayOverrideFacts: false,
      }),
    ]))
    expect(BENCHMARK_CORPUS_SOURCES.every(source => source.corpusTrust !== 'official_pricing')).toBe(true)
  })

  it('keeps the C1 Big 3 registry audit as a warning rather than a C2 blocker', () => {
    const audit = corpusRegistryCoverageAudit()

    expect(audit.blocking).toBe(false)
    expect(audit.warnings).toEqual(expect.any(Array))
    expect(audit.requiredOfficialPricingSourceIds).toEqual([
      'openai-api-pricing',
      'anthropic-claude-pricing',
      'google-gemini-pricing',
    ])
  })

  it('pins the official source coverage matrix for Big 3 and China providers', () => {
    const audit = officialSourceCoverageAudit()

    expect(audit.blocking).toBe(false)
    expect(audit.requiredProviderOwners).toEqual(expect.arrayContaining([
      'openai',
      'anthropic',
      'google',
      'alibaba_qwen',
      'moonshot_kimi',
      'deepseek',
      'zai_glm',
      'minimax',
      'bytedance_doubao',
      'baidu_ernie',
      'tencent_hunyuan',
      'stepfun',
      '01ai_yi',
      'baichuan',
      'sensetime',
      'huawei_pangu',
      'iflytek_spark',
    ]))
    expect(audit.missing).toEqual([])
    expect(audit.parser_unimplemented).toEqual([])
    expect(audit.region_review_needed.map(issue => issue.providerOwner)).toEqual(expect.arrayContaining([
      '01ai_yi',
      'baichuan',
      'sensetime',
    ]))
  })

  it('reports missing, stale, parser, and region review coverage issues without blocking runtime', () => {
    const audit = officialSourceCoverageAudit({
      sources: [
        {
          id: 'openai-api-pricing',
          modelOwner: 'openai',
          active: true,
          parserStrategy: 'html_links',
          pricingRegion: 'global',
        },
        {
          id: 'anthropic-claude-pricing',
          modelOwner: 'anthropic',
          active: true,
          parserStrategy: 'manual_review',
          pricingRegion: 'unknown',
        },
      ],
      checkedAtBySourceId: {
        'openai-api-pricing': '2026-05-01T00:00:00.000Z',
      },
      nowIso: '2026-05-25T00:00:00.000Z',
      staleAfterDays: 7,
    })

    expect(audit.blocking).toBe(false)
    expect(audit.missing.map(issue => issue.providerOwner)).toEqual(expect.arrayContaining(['google', 'deepseek']))
    expect(audit.stale.map(issue => issue.sourceId)).toEqual(expect.arrayContaining([
      'openai-api-pricing',
      'anthropic-claude-pricing',
    ]))
    expect(audit.parser_unimplemented).toEqual([
      expect.objectContaining({ sourceId: 'anthropic-claude-pricing' }),
    ])
    expect(audit.region_review_needed).toEqual([
      expect.objectContaining({ sourceId: 'anthropic-claude-pricing' }),
    ])
    expect(audit.warnings).toEqual(expect.arrayContaining([
      expect.stringMatching(/^official_source_missing:/),
      expect.stringMatching(/^official_source_stale:/),
      expect.stringMatching(/^official_source_parser_unimplemented:/),
      expect.stringMatching(/^official_source_region_review_needed:/),
    ]))
  })
})
