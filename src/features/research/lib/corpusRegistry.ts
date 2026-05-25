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

export interface CorpusRegistryCoverageAudit {
  blocking: false
  requiredOfficialPricingSourceIds: string[]
  missingOfficialPricingSourceIds: string[]
  warnings: string[]
}

const registryInputs = benchmarkRegistryJson as CorpusSourceInput[]

export const BENCHMARK_CORPUS_SOURCES: CorpusSource[] = registryInputs.map(source => normalizeCorpusSource(source))

export function corpusRegistryCoverageAudit(): CorpusRegistryCoverageAudit {
  const officialSourceIds = new Set((officialSourceRegistryJson as Array<{ id?: string }>).map(source => source.id).filter(Boolean))
  const missingOfficialPricingSourceIds = REQUIRED_BIG3_OFFICIAL_PRICING_SOURCE_IDS.filter(sourceId => !officialSourceIds.has(sourceId))

  return {
    blocking: false,
    requiredOfficialPricingSourceIds: [...REQUIRED_BIG3_OFFICIAL_PRICING_SOURCE_IDS],
    missingOfficialPricingSourceIds,
    warnings: missingOfficialPricingSourceIds.length > 0
      ? [`c1_big3_official_pricing_missing:${missingOfficialPricingSourceIds.join(',')}`]
      : [],
  }
}
