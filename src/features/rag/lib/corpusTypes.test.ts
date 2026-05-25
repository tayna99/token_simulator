import { describe, expect, it } from 'vitest'
import { OPERATING_AGENTS } from '../../operating-assets/lib/operatingAssets'
import {
  CORPUS_IDS,
  CORPUS_TRUSTS,
  isCorpusId,
  isCorpusTrust,
  normalizeCorpusSource,
  sourceHasKnownAgents,
} from './corpusTypes'

describe('corpusTypes', () => {
  it('defines the full C1-C9 corpus id contract', () => {
    expect(CORPUS_IDS).toEqual([
      'official_source',
      'model_benchmark',
      'serving_economics',
      'usage_schema',
      'cost_methodology',
      'optimization_playbook',
      'pricing_strategy',
      'trust_compliance',
      'decision_history',
    ])
    expect(CORPUS_IDS.every(isCorpusId)).toBe(true)
    expect(isCorpusId('single_catalog')).toBe(false)
  })

  it('separates official, third-party, internal, and standard trust labels', () => {
    expect(CORPUS_TRUSTS).toEqual(expect.arrayContaining([
      'official_pricing',
      'official_docs',
      'official_announcement',
      'official_cloud_hosted',
      'third_party_benchmark',
      'internal_authoritative',
      'standard_reference',
    ]))
    expect(CORPUS_TRUSTS.every(isCorpusTrust)).toBe(true)
    expect(isCorpusTrust('official_benchmark')).toBe(false)
  })

  it('keeps every normalized corpus source non-authoritative for fact overrides', () => {
    const source = normalizeCorpusSource({
      id: 'lmarena-leaderboard',
      corpusId: 'model_benchmark',
      sourceKind: 'benchmark',
      url: 'https://lmarena.ai/leaderboard',
      active: true,
      parserStrategy: 'manual_review',
      cadence: 'weekly',
      sourceLanguage: 'en',
      corpusTrust: 'third_party_benchmark',
      ownerAgentIds: ['model_inference_research'],
      consumerAgentIds: ['model_inference_research', 'optimization_routing'],
      evidenceRefPrefix: 'evidence:',
    })

    expect(source.mayOverrideFacts).toBe(false)
    expect(source.refs).toEqual(['evidence:lmarena-leaderboard'])
    expect(sourceHasKnownAgents(source, OPERATING_AGENTS.map(agent => agent.id))).toBe(true)
  })
})
