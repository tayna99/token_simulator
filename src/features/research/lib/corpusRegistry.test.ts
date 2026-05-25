import { describe, expect, it } from 'vitest'
import {
  BENCHMARK_CORPUS_SOURCES,
  corpusRegistryCoverageAudit,
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
})
