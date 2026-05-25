import officialSourceRegistryJson from '../../research/data/officialSourceRegistry.json'
import {
  corpusRegistryCoverageAudit,
  type CorpusRegistryCoverageAudit,
} from '../../research/lib/corpusRegistry'
import { MODEL_BENCHMARK_RECORDS, MODEL_BENCHMARK_SOURCES } from './modelBenchmarkCorpus'
import { SERVING_ECONOMICS_SOURCES } from '../data/servingEconomicsRegistry'
import { USAGE_SCHEMA_SOURCES } from '../data/usageSchemaRegistry'

export type CorpusOperationalStatus = 'connected' | 'needs_review' | 'stale' | 'unavailable'

export type ReadinessCorpusId =
  | 'official_source'
  | 'model_benchmark'
  | 'serving_economics'
  | 'usage_schema'
  | 'decision_history'

export interface CorpusReadinessItem {
  corpusId: ReadinessCorpusId
  status: CorpusOperationalStatus
  sourceCount: number
  parserStatus: 'implemented' | 'manual_review' | 'not_applicable' | 'unavailable'
  reviewWarnings: string[]
  freshness: 'fresh' | 'stale' | 'unknown'
}

export interface CorpusReadinessReport {
  status: CorpusOperationalStatus
  items: Record<ReadinessCorpusId, CorpusReadinessItem>
  coverageAudit: Pick<CorpusRegistryCoverageAudit, 'requiredOfficialPricingSourceIds' | 'missingOfficialPricingSourceIds' | 'warnings'>
  generatedAt: string
}

export interface CorpusReadinessInput {
  productionStoreConfigured?: boolean
  decisionHistoryRecordCount?: number
  nowIso?: string
}

function parserStatus(sources: Array<{ parserStrategy?: string }>): CorpusReadinessItem['parserStatus'] {
  if (sources.length === 0) return 'unavailable'
  return sources.some(source => /manual|todo|unimplemented/i.test(source.parserStrategy ?? ''))
    ? 'manual_review'
    : 'implemented'
}

function item(input: {
  corpusId: ReadinessCorpusId
  sourceCount: number
  parserStatus: CorpusReadinessItem['parserStatus']
  reviewWarnings?: string[]
  productionStoreConfigured: boolean
}): CorpusReadinessItem {
  const reviewWarnings = input.reviewWarnings ?? []
  const status: CorpusOperationalStatus = !input.productionStoreConfigured || input.sourceCount === 0
    ? 'unavailable'
    : reviewWarnings.some(warning => warning.includes('stale'))
      ? 'stale'
      : input.parserStatus === 'manual_review' || reviewWarnings.length > 0
        ? 'needs_review'
        : 'connected'

  return {
    corpusId: input.corpusId,
    status,
    sourceCount: input.sourceCount,
    parserStatus: input.parserStatus,
    reviewWarnings,
    freshness: status === 'stale' ? 'stale' : status === 'unavailable' ? 'unknown' : 'fresh',
  }
}

function rollupStatus(items: CorpusReadinessItem[]): CorpusOperationalStatus {
  if (items.some(entry => entry.status === 'unavailable')) return 'unavailable'
  if (items.some(entry => entry.status === 'stale')) return 'stale'
  if (items.some(entry => entry.status === 'needs_review')) return 'needs_review'
  return 'connected'
}

export function buildCorpusReadinessReport(input: CorpusReadinessInput = {}): CorpusReadinessReport {
  const productionStoreConfigured = input.productionStoreConfigured ?? true
  const coverageAudit = corpusRegistryCoverageAudit()
  const officialSources = officialSourceRegistryJson as Array<{ parserStrategy?: string }>
  const c2NeedsReview = MODEL_BENCHMARK_RECORDS
    .filter(record => record.reviewStatus === 'needs_review')
    .map(record => `benchmark_needs_review:${record.id}`)

  const items: Record<ReadinessCorpusId, CorpusReadinessItem> = {
    official_source: item({
      corpusId: 'official_source',
      sourceCount: officialSources.length,
      parserStatus: parserStatus(officialSources),
      reviewWarnings: [
        ...coverageAudit.warnings,
        ...coverageAudit.officialSourceCoverage.warnings,
      ],
      productionStoreConfigured,
    }),
    model_benchmark: item({
      corpusId: 'model_benchmark',
      sourceCount: MODEL_BENCHMARK_SOURCES.length,
      parserStatus: parserStatus(MODEL_BENCHMARK_SOURCES),
      reviewWarnings: c2NeedsReview,
      productionStoreConfigured,
    }),
    serving_economics: item({
      corpusId: 'serving_economics',
      sourceCount: SERVING_ECONOMICS_SOURCES.length,
      parserStatus: parserStatus(SERVING_ECONOMICS_SOURCES),
      reviewWarnings: SERVING_ECONOMICS_SOURCES.some(source => /manual/i.test(source.parserStrategy))
        ? ['serving_economics_manual_review:vllm-benchmark-docs']
        : [],
      productionStoreConfigured,
    }),
    usage_schema: item({
      corpusId: 'usage_schema',
      sourceCount: USAGE_SCHEMA_SOURCES.length,
      parserStatus: parserStatus(USAGE_SCHEMA_SOURCES),
      productionStoreConfigured,
    }),
    decision_history: item({
      corpusId: 'decision_history',
      sourceCount: input.decisionHistoryRecordCount ?? 0,
      parserStatus: 'not_applicable',
      productionStoreConfigured,
    }),
  }

  return {
    status: rollupStatus(Object.values(items)),
    items,
    coverageAudit: {
      requiredOfficialPricingSourceIds: coverageAudit.requiredOfficialPricingSourceIds,
      missingOfficialPricingSourceIds: coverageAudit.missingOfficialPricingSourceIds,
      warnings: coverageAudit.warnings,
    },
    generatedAt: input.nowIso ?? new Date().toISOString(),
  }
}
