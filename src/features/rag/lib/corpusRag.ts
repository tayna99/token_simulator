import {
  CORPUS_IDS,
  emptyCorpusCollectionEvidence,
  isCorpusId,
  type CorpusChunk,
  type CorpusCollectionEvidence,
  type CorpusEvidenceResult,
  type CorpusId,
} from './corpusTypes'
import { unique } from './corpusTypes'

export type { CorpusChunk, CorpusCollectionEvidence, CorpusEvidenceResult, CorpusId } from './corpusTypes'

export type CorpusCollectionsInput = Partial<Record<CorpusId, readonly CorpusChunk[]>>

const GENERIC_QUERY_TERMS = new Set([
  'no',
  'none',
  'matching',
  'match',
  'benchmark',
  'evidence',
  'source',
  'record',
  'phrase',
])

function termsFrom(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9._:/{}-]+/)
    .filter(term => term.length > 1 && !GENERIC_QUERY_TERMS.has(term))
}

function corpusMissingWarning(corpusId: CorpusId): string | undefined {
  if (corpusId === 'model_benchmark') return 'baseline_unavailable'
  if (corpusId === 'official_source') return 'official_docs_unavailable'
  if (corpusId === 'decision_history') return 'decision_history_unavailable'
  return undefined
}

function scoreChunk(chunk: CorpusChunk, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0
  const haystack = [
    chunk.id,
    chunk.text,
    chunk.sourceUrl ?? '',
    ...chunk.refs,
    chunk.metadata.sourceKind,
    chunk.metadata.corpusTrust,
    ...(chunk.metadata.taskTags ?? []),
    ...(chunk.metadata.modelIds ?? []),
  ].join(' ').toLowerCase()
  const uniqueTerms = new Set(queryTerms)
  const hits = Array.from(uniqueTerms).filter(term => haystack.includes(term)).length
  return hits > 0 ? Number((hits / Math.sqrt(uniqueTerms.size)).toFixed(6)) : 0
}

function retrieveCollection(input: {
  corpusId: CorpusId
  records: readonly CorpusChunk[]
  queryTerms: string[]
  topK?: number
}): CorpusCollectionEvidence {
  const limit = Number.isFinite(input.topK) && input.topK && input.topK > 0 ? input.topK : 5
  const ranked = input.records
    .filter(record => record.corpusId === input.corpusId)
    .map(record => ({ record, score: scoreChunk(record, input.queryTerms) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.record.id.localeCompare(right.record.id))
    .slice(0, limit)
  const records = ranked.map(item => item.record)
  const missingWarning = corpusMissingWarning(input.corpusId)

  return {
    corpusId: input.corpusId,
    found: records.length > 0,
    refs: unique(records.flatMap(record => record.refs)),
    records,
    scores: ranked.map(item => item.score),
    warnings: records.length > 0 || !missingWarning ? [] : [missingWarning],
    mayOverrideFacts: false,
  }
}

export function retrieveCorpusEvidence(input: {
  query: string
  collections: CorpusCollectionsInput
  agentId?: string
  topK?: number
}): CorpusEvidenceResult {
  const queryTerms = termsFrom(input.query)
  const results = Object.fromEntries(CORPUS_IDS.map(corpusId => [
    corpusId,
    emptyCorpusCollectionEvidence(corpusId),
  ])) as Record<CorpusId, CorpusCollectionEvidence>

  for (const corpusId of CORPUS_IDS) {
    const records = input.collections[corpusId] ?? []
    if (records.length === 0) continue
    results[corpusId] = retrieveCollection({
      corpusId,
      records,
      queryTerms,
      topK: input.topK,
    })
  }

  return {
    mayOverrideFacts: false,
    results,
    warnings: unique(Object.values(results).flatMap(result => result.warnings)),
  }
}

export function isCorpusChunk(value: unknown): value is CorpusChunk {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CorpusChunk>
  const metadata = candidate.metadata as Partial<CorpusChunk['metadata']> | undefined
  return typeof candidate.id === 'string'
    && isCorpusId(candidate.corpusId)
    && typeof candidate.text === 'string'
    && Array.isArray(candidate.refs)
    && candidate.mayOverrideFacts === false
    && !!metadata
    && typeof metadata.sourceKind === 'string'
    && typeof metadata.corpusTrust === 'string'
    && Array.isArray(metadata.ownerAgentIds)
    && Array.isArray(metadata.consumerAgentIds)
    && typeof metadata.cadence === 'string'
}

export function p1RecordsFromCorpusEvidence(result: CorpusEvidenceResult, corpusId: CorpusId) {
  return result.results[corpusId].records.map(record => ({
    id: record.id.replace(/^(source|evidence|decision|snapshot|risk):/, ''),
    text: record.text,
    sourceUrl: record.sourceUrl ?? undefined,
    refs: [...record.refs],
    corpusTrust: record.metadata.corpusTrust,
    ownerAgentIds: [...record.metadata.ownerAgentIds],
    consumerAgentIds: [...record.metadata.consumerAgentIds],
  }))
}
