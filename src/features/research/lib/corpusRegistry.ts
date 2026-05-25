import benchmarkRegistryJson from '../data/modelBenchmarkRegistry.json'
import officialSourceRegistryJson from '../data/officialSourceRegistry.json'
import {
  normalizeCorpusSource,
  type CorpusSource,
  type CorpusSourceInput,
} from '../../rag/lib/corpusTypes'

export const REQUIRED_BIG3_OFFICIAL_PRICING_SOURCE_IDS = [
  'openai-api-pricing',
  'anthropic-claude-pricing',
  'google-gemini-pricing',
] as const

export const REQUIRED_OFFICIAL_SOURCE_PROVIDER_OWNERS = [
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
] as const

export interface OfficialSourceCoverageInput {
  id?: string
  modelOwner?: string
  active?: boolean
  parserStrategy?: string
  pricingRegion?: string
}

export interface OfficialSourceCoverageIssue {
  providerOwner: string
  sourceId: string | null
  reason: string
}

export interface OfficialSourceCoverageAudit {
  blocking: false
  requiredProviderOwners: string[]
  missing: OfficialSourceCoverageIssue[]
  stale: OfficialSourceCoverageIssue[]
  parser_unimplemented: OfficialSourceCoverageIssue[]
  region_review_needed: OfficialSourceCoverageIssue[]
  warnings: string[]
}

export interface OfficialSourceCoverageAuditOptions {
  sources?: OfficialSourceCoverageInput[]
  checkedAtBySourceId?: Record<string, string>
  nowIso?: string
  staleAfterDays?: number
}

export interface CorpusRegistryCoverageAudit {
  blocking: false
  requiredOfficialPricingSourceIds: string[]
  missingOfficialPricingSourceIds: string[]
  warnings: string[]
  officialSourceCoverage: OfficialSourceCoverageAudit
}

const registryInputs = benchmarkRegistryJson as CorpusSourceInput[]

export const BENCHMARK_CORPUS_SOURCES: CorpusSource[] = registryInputs.map(source => normalizeCorpusSource(source))

function isParserImplemented(parserStrategy: string | undefined) {
  return Boolean(parserStrategy)
    && !/manual|todo|unimplemented/i.test(parserStrategy)
}

function isStale(checkedAtIso: string | undefined, nowIso: string, staleAfterDays: number) {
  if (!checkedAtIso) return true
  const checkedAt = new Date(checkedAtIso).getTime()
  const now = new Date(nowIso).getTime()
  if (!Number.isFinite(checkedAt) || !Number.isFinite(now)) return true
  return now - checkedAt > staleAfterDays * 24 * 60 * 60 * 1000
}

export function officialSourceCoverageAudit(options: OfficialSourceCoverageAuditOptions = {}): OfficialSourceCoverageAudit {
  const sources = (options.sources ?? officialSourceRegistryJson as OfficialSourceCoverageInput[])
    .filter(source => source.active !== false)
  const sourcesByOwner = new Map<string, OfficialSourceCoverageInput[]>()
  for (const source of sources) {
    if (!source.modelOwner) continue
    const ownerSources = sourcesByOwner.get(source.modelOwner) ?? []
    ownerSources.push(source)
    sourcesByOwner.set(source.modelOwner, ownerSources)
  }

  const missing: OfficialSourceCoverageIssue[] = []
  const stale: OfficialSourceCoverageIssue[] = []
  const parser_unimplemented: OfficialSourceCoverageIssue[] = []
  const region_review_needed: OfficialSourceCoverageIssue[] = []
  const shouldCheckStale = options.checkedAtBySourceId !== undefined
  const checkedAtBySourceId = options.checkedAtBySourceId ?? {}
  const nowIso = options.nowIso ?? new Date().toISOString()
  const staleAfterDays = options.staleAfterDays ?? 8

  for (const providerOwner of REQUIRED_OFFICIAL_SOURCE_PROVIDER_OWNERS) {
    const ownerSources = sourcesByOwner.get(providerOwner) ?? []
    if (ownerSources.length === 0) {
      missing.push({
        providerOwner,
        sourceId: null,
        reason: 'required_provider_owner_missing',
      })
      continue
    }

    for (const source of ownerSources) {
      const sourceId = source.id ?? `${providerOwner}:unknown_source`
      if (shouldCheckStale && isStale(checkedAtBySourceId[sourceId], nowIso, staleAfterDays)) {
        stale.push({
          providerOwner,
          sourceId,
          reason: 'source_not_checked_recently',
        })
      }
      if (!isParserImplemented(source.parserStrategy)) {
        parser_unimplemented.push({
          providerOwner,
          sourceId,
          reason: 'parser_strategy_unimplemented',
        })
      }
      if (source.pricingRegion === 'unknown') {
        region_review_needed.push({
          providerOwner,
          sourceId,
          reason: 'pricing_region_unknown',
        })
      }
    }
  }

  const warnings = [
    ...missing.map(issue => `official_source_missing:${issue.providerOwner}`),
    ...stale.map(issue => `official_source_stale:${issue.sourceId}`),
    ...parser_unimplemented.map(issue => `official_source_parser_unimplemented:${issue.sourceId}`),
    ...region_review_needed.map(issue => `official_source_region_review_needed:${issue.sourceId}`),
  ]

  return {
    blocking: false,
    requiredProviderOwners: [...REQUIRED_OFFICIAL_SOURCE_PROVIDER_OWNERS],
    missing,
    stale,
    parser_unimplemented,
    region_review_needed,
    warnings,
  }
}

export function corpusRegistryCoverageAudit(): CorpusRegistryCoverageAudit {
  const officialSourceIds = new Set((officialSourceRegistryJson as Array<{ id?: string }>).map(source => source.id).filter(Boolean))
  const missingOfficialPricingSourceIds = REQUIRED_BIG3_OFFICIAL_PRICING_SOURCE_IDS.filter(sourceId => !officialSourceIds.has(sourceId))
  const officialSourceCoverage = officialSourceCoverageAudit()

  return {
    blocking: false,
    requiredOfficialPricingSourceIds: [...REQUIRED_BIG3_OFFICIAL_PRICING_SOURCE_IDS],
    missingOfficialPricingSourceIds,
    warnings: missingOfficialPricingSourceIds.length > 0
      ? [`c1_big3_official_pricing_missing:${missingOfficialPricingSourceIds.join(',')}`]
      : [],
    officialSourceCoverage,
  }
}
