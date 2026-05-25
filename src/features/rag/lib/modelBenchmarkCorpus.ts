import {
  MODEL_BENCHMARK_RECORDS,
  MODEL_BENCHMARK_SOURCES,
  MODEL_PERF_MATRIX,
  type ModelBenchmarkRecord,
} from '../data/modelBenchmarkRegistry'
import type { CorpusChunk } from './corpusTypes'
import { unique } from './corpusTypes'

export {
  MODEL_BENCHMARK_RECORDS,
  MODEL_BENCHMARK_SOURCES,
  MODEL_PERF_MATRIX,
}
export type { BenchmarkQualityBasis, ModelBenchmarkRecord, ModelPerfMatrixRow } from '../data/modelBenchmarkRegistry'

export interface ModelBenchmarkEvidence {
  kind: 'benchmark'
  found: boolean
  refs: string[]
  mayOverrideFacts: false
  records: ModelBenchmarkRecord[]
  scores: number[]
  warnings: string[]
}

export interface BenchmarkP1RagRecord {
  id: string
  text: string
  sourceUrl?: string
  refs: string[]
  corpusTrust: 'third_party_benchmark' | 'official_docs'
  ownerAgentIds: string[]
  consumerAgentIds: string[]
}

function termsFrom(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9._:/{}-]+/).filter(term => term.length > 1)
}

function scoreRecord(record: ModelBenchmarkRecord, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 1
  const haystack = [
    record.id,
    record.title,
    record.text,
    ...record.modelIds,
    ...record.taskTags,
    ...record.benchmarkSuite,
    ...record.metricKinds,
  ].join(' ').toLowerCase()
  const uniqueTerms = new Set(queryTerms)
  const hits = Array.from(uniqueTerms).filter(term => haystack.includes(term)).length
  return hits > 0 ? Number((hits / Math.sqrt(uniqueTerms.size)).toFixed(6)) : 0
}

function intersects(left: string[] | undefined, right: string[]): boolean {
  if (!left || left.length === 0) return true
  const normalized = new Set(left.map(item => item.toLowerCase()))
  return right.some(item => normalized.has(item.toLowerCase()))
}

export function retrieveModelBenchmarkEvidence(input: {
  query: string
  modelIds?: string[]
  taskTags?: string[]
  topK?: number
  records?: ModelBenchmarkRecord[]
}): ModelBenchmarkEvidence {
  const queryTerms = termsFrom(input.query)
  const limit = Number.isFinite(input.topK) && input.topK && input.topK > 0 ? input.topK : 5
  const ranked = (input.records ?? MODEL_BENCHMARK_RECORDS)
    .filter(record => intersects(input.modelIds, record.modelIds))
    .filter(record => intersects(input.taskTags, record.taskTags))
    .map(record => ({ record, score: scoreRecord(record, queryTerms) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.record.id.localeCompare(right.record.id))
    .slice(0, limit)
  const records = ranked.map(item => item.record)

  return {
    kind: 'benchmark',
    found: records.length > 0,
    refs: unique(records.flatMap(record => record.sourceRefs)),
    mayOverrideFacts: false,
    records,
    scores: ranked.map(item => item.score),
    warnings: records.length > 0 ? [] : ['baseline_unavailable'],
  }
}

export function modelBenchmarkRecordToCorpusChunk(record: ModelBenchmarkRecord): CorpusChunk {
  return {
    id: `evidence:${record.id}`,
    corpusId: 'model_benchmark',
    text: `${record.title}\n${record.text}`,
    sourceUrl: record.sourceUrl,
    refs: [...record.sourceRefs],
    mayOverrideFacts: false,
    metadata: {
      sourceKind: 'benchmark',
      corpusTrust: record.qualityBasis === 'third_party_benchmark' ? 'third_party_benchmark' : 'official_docs',
      ownerAgentIds: ['model_inference_research'],
      consumerAgentIds: ['model_inference_research', 'optimization_routing', 'customer_diagnostic_pricing'],
      cadence: 'weekly',
      sourceId: record.sourceRefs[0]?.replace(/^evidence:/, ''),
      reviewStatus: record.reviewStatus,
      qualityBasis: record.qualityBasis,
      taskTags: record.taskTags,
      modelIds: record.modelIds,
    },
  }
}

export function modelBenchmarkRecordsAsP1RagRecords(records: ModelBenchmarkRecord[] = MODEL_BENCHMARK_RECORDS): BenchmarkP1RagRecord[] {
  return records.map(record => ({
    id: record.id,
    text: `${record.title}. ${record.text}`,
    sourceUrl: record.sourceUrl,
    refs: [...record.sourceRefs],
    corpusTrust: record.qualityBasis === 'third_party_benchmark' ? 'third_party_benchmark' : 'official_docs',
    ownerAgentIds: ['model_inference_research'],
    consumerAgentIds: ['model_inference_research', 'optimization_routing', 'customer_diagnostic_pricing'],
  }))
}
