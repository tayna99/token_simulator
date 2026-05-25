import { describe, expect, it } from 'vitest'
import {
  MODEL_BENCHMARK_RECORDS,
  MODEL_BENCHMARK_SOURCES,
  MODEL_PERF_MATRIX,
  modelBenchmarkRecordsAsP1RagRecords,
  retrieveModelBenchmarkEvidence,
} from './modelBenchmarkCorpus'

describe('modelBenchmarkCorpus', () => {
  it('seeds C2 benchmark sources as third-party evidence, not official pricing', () => {
    expect(MODEL_BENCHMARK_SOURCES).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'artificial-analysis-models',
        corpusId: 'model_benchmark',
        parserStrategy: 'parseArtificialAnalysis',
        corpusTrust: 'third_party_benchmark',
        consumerAgentIds: expect.arrayContaining(['model_inference_research', 'optimization_routing']),
        mayOverrideFacts: false,
      }),
      expect.objectContaining({
        id: 'lmarena-leaderboard',
        corpusId: 'model_benchmark',
        corpusTrust: 'third_party_benchmark',
        ownerAgentIds: ['model_inference_research'],
        mayOverrideFacts: false,
      }),
    ]))
    expect(MODEL_BENCHMARK_SOURCES.every(source => source.corpusTrust !== 'official_pricing')).toBe(true)
  })

  it('retrieves model benchmark records with evidence refs and review status', () => {
    const result = retrieveModelBenchmarkEvidence({
      query: 'routing quality human preference',
      modelIds: ['gemini-3.5-flash'],
      taskTags: ['routing'],
      topK: 2,
    })

    expect(result.found).toBe(true)
    expect(result.mayOverrideFacts).toBe(false)
    expect(result.refs).toEqual(expect.arrayContaining(['evidence:lmarena-leaderboard']))
    expect(result.records[0]).toMatchObject({
      corpusId: 'model_benchmark',
      qualityBasis: 'third_party_benchmark',
      reviewStatus: expect.any(String),
    })
  })

  it('keeps sparse benchmark gaps explicit instead of fabricating averages', () => {
    const result = retrieveModelBenchmarkEvidence({
      query: 'nonexistent private eval suite',
      modelIds: ['private-model'],
      taskTags: ['private-task'],
    })

    expect(result.found).toBe(false)
    expect(result.records).toEqual([])
    expect(result.refs).toEqual([])
    expect(result.warnings).toContain('baseline_unavailable')
    expect(JSON.stringify(result)).not.toMatch(/average|peerAverage|mean/i)
  })

  it('exports P1-compatible benchmark records and upgrades model perf rows with evidence refs', () => {
    const p1Records = modelBenchmarkRecordsAsP1RagRecords(MODEL_BENCHMARK_RECORDS)

    expect(p1Records[0]).toMatchObject({
      id: expect.any(String),
      text: expect.stringMatching(/benchmark|leaderboard|quality/i),
      refs: expect.arrayContaining([expect.stringMatching(/^evidence:/)]),
      corpusTrust: 'third_party_benchmark',
    })
    expect(MODEL_PERF_MATRIX.every(row => Array.isArray(row.evidenceRefs))).toBe(true)
    expect(MODEL_PERF_MATRIX.map(row => row.qualityBasis)).toEqual(expect.arrayContaining([
      'third_party_benchmark',
      'assumption',
    ]))
  })
})
