import { describe, expect, it } from 'vitest'
import { MODEL_BENCHMARK_RECORDS, modelBenchmarkRecordToCorpusChunk } from './modelBenchmarkCorpus'
import { retrieveCorpusEvidence } from './corpusRag'

const officialChunk = {
  id: 'source:openai-api-pricing',
  corpusId: 'official_source',
  text: 'OpenAI API pricing official source explains cached token prices.',
  sourceUrl: 'https://openai.com/api/pricing/',
  refs: ['source:openai-api-pricing'],
  mayOverrideFacts: false,
  metadata: {
    sourceKind: 'pricing',
    corpusTrust: 'official_pricing',
    ownerAgentIds: ['provider_api_intelligence'],
    consumerAgentIds: ['provider_api_intelligence', 'cost_modeling'],
    cadence: 'daily',
  },
} as const

const usageSchemaChunk = {
  id: 'evidence:usage-schema-openrouter',
  corpusId: 'usage_schema',
  text: 'OpenRouter usage exports include model, prompt tokens, completion tokens, and request id.',
  sourceUrl: 'https://openrouter.ai/docs',
  refs: ['evidence:usage-schema-openrouter'],
  mayOverrideFacts: false,
  metadata: {
    sourceKind: 'log_schema',
    corpusTrust: 'official_docs',
    ownerAgentIds: ['usage_data_ingestion'],
    consumerAgentIds: ['usage_data_ingestion', 'trust_security_compliance'],
    cadence: 'weekly',
  },
} as const

describe('corpusRag', () => {
  it('retrieves split C1/C2/C4/C9 collections without merging authority', () => {
    const benchmark = modelBenchmarkRecordToCorpusChunk(MODEL_BENCHMARK_RECORDS[0])
    const decision = {
      id: 'decision:cache-policy',
      corpusId: 'decision_history',
      text: 'Held cache routing until QA confirmed quality review.',
      sourceUrl: 'decision:cache-policy',
      refs: ['decision:cache-policy'],
      mayOverrideFacts: false,
      metadata: {
        sourceKind: 'decision',
        corpusTrust: 'internal_authoritative',
        ownerAgentIds: ['knowledge_release_ops'],
        consumerAgentIds: ['knowledge_release_ops', 'cost_engine_qa'],
        cadence: 'on_write',
      },
    } as const

    const result = retrieveCorpusEvidence({
      query: 'cache pricing quality schema decision',
      agentId: 'model_inference_research',
      topK: 3,
      collections: {
        official_source: [officialChunk],
        model_benchmark: [benchmark],
        usage_schema: [usageSchemaChunk],
        decision_history: [decision],
      },
    })

    expect(result.mayOverrideFacts).toBe(false)
    expect(result.results.official_source.refs).toContain('source:openai-api-pricing')
    expect(result.results.model_benchmark.refs).toContain('evidence:lmarena-leaderboard')
    expect(result.results.usage_schema.refs).toContain('evidence:usage-schema-openrouter')
    expect(result.results.decision_history.refs).toContain('decision:cache-policy')
  })

  it('keeps sparse benchmark warnings local to C2 and sorts records deterministically', () => {
    const result = retrieveCorpusEvidence({
      query: 'no matching benchmark phrase',
      agentId: 'model_inference_research',
      collections: {
        model_benchmark: MODEL_BENCHMARK_RECORDS.map(modelBenchmarkRecordToCorpusChunk),
      },
      topK: 1,
    })

    expect(result.results.model_benchmark.found).toBe(false)
    expect(result.results.model_benchmark.warnings).toEqual(['baseline_unavailable'])
    expect(result.warnings).toEqual(['baseline_unavailable'])
  })
})
