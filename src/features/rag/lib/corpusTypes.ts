import type { OperatingAgentId } from '../../operating-assets/lib/operatingAssets'

export const CORPUS_IDS = [
  'official_source',
  'model_benchmark',
  'serving_economics',
  'usage_schema',
  'cost_methodology',
  'optimization_playbook',
  'pricing_strategy',
  'trust_compliance',
  'decision_history',
] as const

export type CorpusId = typeof CORPUS_IDS[number]

export const CORPUS_TRUSTS = [
  'official_pricing',
  'official_docs',
  'official_announcement',
  'official_cloud_hosted',
  'third_party_benchmark',
  'internal_authoritative',
  'standard_reference',
] as const

export type CorpusTrust = typeof CORPUS_TRUSTS[number]
export type CorpusCadence = 'realtime' | 'daily' | 'weekly' | 'on_write' | 'manual'
export type EvidenceRefPrefix = 'source:' | 'asset:' | 'evidence:' | 'serving:' | 'risk:' | 'decision:' | 'snapshot:'

export interface CorpusSourceInput {
  id: string
  corpusId: CorpusId
  sourceKind: string
  url: string | null
  active: boolean
  parserStrategy: string
  cadence: CorpusCadence
  sourceLanguage: string
  corpusTrust: CorpusTrust
  ownerAgentIds: OperatingAgentId[]
  consumerAgentIds: OperatingAgentId[]
  evidenceRefPrefix: EvidenceRefPrefix
}

export interface CorpusSource extends CorpusSourceInput {
  mayOverrideFacts: false
  refs: readonly string[]
}

export interface CorpusChunkMetadata {
  sourceKind: string
  corpusTrust: CorpusTrust
  ownerAgentIds: readonly OperatingAgentId[]
  consumerAgentIds: readonly OperatingAgentId[]
  cadence: CorpusCadence
  sourceId?: string
  reviewStatus?: string
  qualityBasis?: string
  taskTags?: readonly string[]
  modelIds?: readonly string[]
  costAuthority?: 'self_hosted_serving_economics_only'
  providerApiCostExcluded?: true
}

export interface CorpusChunk {
  id: string
  corpusId: CorpusId
  text: string
  sourceUrl: string | null
  refs: readonly string[]
  mayOverrideFacts: false
  metadata: CorpusChunkMetadata
}

export interface CorpusCollectionEvidence {
  corpusId: CorpusId
  found: boolean
  refs: string[]
  records: CorpusChunk[]
  scores: number[]
  warnings: string[]
  mayOverrideFacts: false
}

export interface CorpusEvidenceResult {
  mayOverrideFacts: false
  results: Record<CorpusId, CorpusCollectionEvidence>
  warnings: string[]
}

export function isCorpusId(value: unknown): value is CorpusId {
  return typeof value === 'string' && (CORPUS_IDS as readonly string[]).includes(value)
}

export function isCorpusTrust(value: unknown): value is CorpusTrust {
  return typeof value === 'string' && (CORPUS_TRUSTS as readonly string[]).includes(value)
}

export function refFor(prefix: EvidenceRefPrefix, id: string): string {
  return id.startsWith(prefix) ? id : `${prefix}${id}`
}

export function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items))
}

export function normalizeCorpusSource(input: CorpusSourceInput): CorpusSource {
  return {
    ...input,
    mayOverrideFacts: false,
    refs: [refFor(input.evidenceRefPrefix, input.id)],
  }
}

export function sourceHasKnownAgents(source: Pick<CorpusSource, 'ownerAgentIds' | 'consumerAgentIds'>, knownAgentIds: string[]): boolean {
  const known = new Set(knownAgentIds)
  return [...source.ownerAgentIds, ...source.consumerAgentIds].every(agentId => known.has(agentId))
}

export function emptyCorpusCollectionEvidence(corpusId: CorpusId, warning?: string): CorpusCollectionEvidence {
  return {
    corpusId,
    found: false,
    refs: [],
    records: [],
    scores: [],
    warnings: warning ? [warning] : [],
    mayOverrideFacts: false,
  }
}
