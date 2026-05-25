import { describe, expect, it } from 'vitest'
import {
  buildBenchmarkEvidenceRecords,
  parseArtificialAnalysis,
  serializeBenchmarkEvidenceJsonl,
} from './benchmark-corpus.mjs'

const SOURCE = {
  id: 'artificial-analysis-models',
  corpusId: 'model_benchmark',
  sourceKind: 'benchmark',
  url: 'https://artificialanalysis.ai/models',
  active: true,
  parserStrategy: 'parseArtificialAnalysis',
  cadence: 'weekly',
  sourceLanguage: 'en',
  corpusTrust: 'third_party_benchmark',
  ownerAgentIds: ['model_inference_research'],
  consumerAgentIds: ['model_inference_research', 'optimization_routing'],
  evidenceRefPrefix: 'evidence:',
}

describe('benchmark-corpus', () => {
  it('parses Artificial Analysis model benchmark rows into source-cited metric records', () => {
    const parsed = parseArtificialAnalysis({
      source: SOURCE,
      text: `
        <table>
          <tr><th>Model</th><th>Intelligence Index</th><th>Output Speed</th><th>Latency</th></tr>
          <tr><td>GPT-5.5</td><td>74</td><td>82 tokens/s</td><td>0.72 s</td></tr>
          <tr><td>Gemini 3.5 Flash</td><td>69</td><td>146 tokens/s</td><td>0.41 s</td></tr>
        </table>
      `,
      capturedAt: '2026-05-25T00:00:00.000Z',
    })

    expect(parsed.records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'artificial-analysis-models:gpt-5-5:intelligence-index',
        corpusId: 'model_benchmark',
        modelName: 'GPT-5.5',
        benchmarkSuite: 'artificial_analysis',
        metricName: 'intelligence_index',
        metricValue: '74',
        sourceUrl: SOURCE.url,
        sourceRefs: ['evidence:artificial-analysis-models'],
        qualityBasis: 'third_party_benchmark',
        reviewStatus: 'needs_review',
      }),
      expect.objectContaining({
        id: 'artificial-analysis-models:gemini-3-5-flash:output-speed',
        metricName: 'output_speed',
        metricValue: '146 tokens/s',
      }),
    ]))
    expect(parsed.warnings).toEqual([])
  })

  it('converts parsed benchmark metrics into C2 RAG records without fact authority', () => {
    const parsed = parseArtificialAnalysis({
      source: SOURCE,
      text: 'Model | Intelligence Index\nGPT-5.5 | 74',
      capturedAt: '2026-05-25T00:00:00.000Z',
    })
    const records = buildBenchmarkEvidenceRecords(parsed.records)
    const jsonl = serializeBenchmarkEvidenceJsonl(records)

    expect(records[0]).toMatchObject({
      id: 'evidence:artificial-analysis-models:gpt-5-5:intelligence-index',
      corpusId: 'model_benchmark',
      refs: ['evidence:artificial-analysis-models'],
      mayOverrideFacts: false,
      metadata: {
        corpusTrust: 'third_party_benchmark',
        sourceKind: 'benchmark',
        consumerAgentIds: expect.arrayContaining(['model_inference_research', 'optimization_routing']),
      },
    })
    expect(JSON.parse(jsonl.trim())).toMatchObject({
      id: records[0].id,
      mayOverrideFacts: false,
    })
  })
})
