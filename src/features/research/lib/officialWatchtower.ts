import registryJson from '../data/officialSourceRegistry.json'

export type ModelOwner =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'cursor'
  | 'deepseek'
  | 'alibaba_qwen'
  | 'moonshot_kimi'
  | 'zai_glm'
  | 'minimax'
  | 'bytedance_doubao'
  | 'baidu_ernie'
  | 'tencent_hunyuan'
  | 'stepfun'
  | '01ai_yi'
  | 'baichuan'
  | 'sensetime'
  | 'huawei_pangu'
  | 'iflytek_spark'
  | 'mistral'
  | 'meta'

export type ServingProvider =
  | 'first_party'
  | 'cursor'
  | 'alibaba_model_studio'
  | 'baidu_qianfan'
  | 'volcano_ark'
  | 'tencent_cloud'
  | 'z_ai'
  | 'kimi_platform'
  | 'minimax_platform'
  | 'stepfun_platform'
  | 'cloud_marketplace'
  | 'openrouter'
  | 'together'
  | 'fireworks'
  | 'custom'

export type ModelFamily =
  | 'gpt'
  | 'claude'
  | 'gemini'
  | 'gemma'
  | 'composer'
  | 'qwen'
  | 'kimi'
  | 'deepseek'
  | 'glm'
  | 'minimax'
  | 'doubao'
  | 'ernie'
  | 'hunyuan'
  | 'step'
  | 'yi'
  | 'baichuan'
  | 'sensechat'
  | 'pangu'
  | 'spark'

export type PricingRegion =
  | 'global'
  | 'china_mainland'
  | 'international_singapore'
  | 'us'
  | 'eu'
  | 'japan'
  | 'unknown'

export type PricingCurrency = 'USD' | 'CNY' | 'JPY' | 'EUR'
export type SourceLanguage = 'en' | 'zh' | 'ja'
export type OfficialSourceTrust = 'official_pricing' | 'official_announcement' | 'official_docs' | 'official_cloud_hosted' | 'third_party_market_radar'
export type OfficialSourceKind = 'pricing' | 'release_note' | 'blog' | 'model_doc' | 'changelog' | 'rss' | 'docs_index'
export type ParserStrategy =
  | 'html_links'
  | 'rss_feed'
  | 'pricing_table'
  | 'docs_text'
  | 'parseAlibabaModelStudio'
  | 'parseKimiPricing'
  | 'parseDeepSeekPricing'
  | 'parseZaiPricing'
  | 'parseMiniMaxPricing'
  | 'parseBaiduQianfanPricing'
  | 'parseVolcanoArkPricing'
  | 'parseTencentHunyuanPricing'
  | 'parseStepFunPricing'

export interface OfficialSource {
  id: string
  modelOwner: ModelOwner
  servingProvider: ServingProvider
  modelFamilies: ModelFamily[]
  sourceKind: OfficialSourceKind
  url: string
  active: boolean
  parserStrategy: ParserStrategy
  cadence: 'daily' | 'weekly' | 'manual'
  pricingRegion: PricingRegion
  sourceLanguage: SourceLanguage
  officialSourceTrust: OfficialSourceTrust
  ownerAgentIds: string[]
  radarOnly?: boolean
}

export interface OfficialSourceSnippet {
  snippetId: string
  sourceId: string
  sourceUrl: string
  sourceKind: OfficialSourceKind
  provider: ModelOwner
  servingProvider: ServingProvider
  pricingRegion: PricingRegion
  text: string
  hash: string
  capturedAt: string
  refs: string[]
}

export interface NativePrice {
  amount: number
  currency: PricingCurrency
  unit: string
}

export interface NormalizedPrice {
  amountUsd: number
  unit: string
  convertedAt: string
  fxSource: string
  fxRate: number
}

export interface FxRateSnapshot {
  base: PricingCurrency
  quote: 'USD'
  rate: number
  source: string
  capturedAt: string
}

export type CandidateStatus =
  | 'detected'
  | 'needs_pricing_review'
  | 'needs_region_review'
  | 'needs_fx_review'
  | 'accepted'
  | 'rejected'
  | 'superseded'

export type CandidatePricingStatusSuggestion = 'verified' | 'estimated' | 'tbd' | 'unavailable' | 'needs_fx_review'

export interface ModelReleaseCandidate {
  candidateId: string
  detectedAt: string
  sourceId: string
  sourceUrl: string
  title: string
  modelNames: string[]
  modelOwner: ModelOwner
  modelFamily: ModelFamily
  servingProvider: ServingProvider
  pricingRegion: PricingRegion
  currency: PricingCurrency
  sourceLanguage: SourceLanguage
  nativePricing: {
    input?: NativePrice
    output?: NativePrice
  } | null
  normalizedPricing: {
    input?: NormalizedPrice
    output?: NormalizedPrice
  } | null
  fxRateSnapshot: FxRateSnapshot | null
  hostedThirdPartyModel: boolean
  mainlandOnly: boolean
  internationalEndpointAvailable: boolean
  dataResidencyNote: string | null
  pricingStatusSuggestion: CandidatePricingStatusSuggestion
  apiPricingAvailable: boolean
  requiresCustomPricing: boolean
  officialSourceTrust: OfficialSourceTrust
  status: CandidateStatus
  evidenceRefs: string[]
  confidence: 'high' | 'medium' | 'low'
  reviewNotes: string[]
}

export interface BuildModelReleaseCandidateInput {
  detectedAt: string
  sourceId: string
  sourceUrl: string
  title: string
  modelNames: string[]
  modelOwner: ModelOwner
  modelFamily: ModelFamily
  servingProvider: ServingProvider
  pricingRegion: PricingRegion
  currency: PricingCurrency
  sourceLanguage: SourceLanguage
  pricingStatusSuggestion: CandidatePricingStatusSuggestion
  officialSourceTrust: OfficialSourceTrust
  nativePricing?: ModelReleaseCandidate['nativePricing']
  normalizedPricing?: ModelReleaseCandidate['normalizedPricing']
  fxRateSnapshot?: FxRateSnapshot | null
  hostedThirdPartyModel?: boolean
  mainlandOnly?: boolean
  internationalEndpointAvailable?: boolean
  dataResidencyNote?: string | null
}

export const OFFICIAL_SOURCE_REGISTRY = registryJson as OfficialSource[]

const CHINESE_MODEL_OWNERS: ModelOwner[] = [
  'alibaba_qwen',
  'moonshot_kimi',
  'deepseek',
  'zai_glm',
  'minimax',
  'bytedance_doubao',
  'baidu_ernie',
  'tencent_hunyuan',
  'stepfun',
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function candidateStatus(input: BuildModelReleaseCandidateInput): CandidateStatus {
  if (input.pricingStatusSuggestion === 'needs_fx_review') return 'needs_fx_review'
  if (input.pricingRegion === 'unknown') return 'needs_region_review'
  if (input.pricingStatusSuggestion === 'verified') return 'needs_pricing_review'
  return 'needs_pricing_review'
}

export function officialWatchtowerCoverageSummary() {
  const activeSources = OFFICIAL_SOURCE_REGISTRY.filter(source => source.active)
  const chineseActiveProviderGroups = unique(activeSources
    .filter(source => CHINESE_MODEL_OWNERS.includes(source.modelOwner))
    .map(source => source.modelOwner))
  const radarProviderGroups = unique(activeSources
    .filter(source => source.radarOnly)
    .map(source => source.modelOwner))

  return {
    activeSourceCount: activeSources.length,
    activeChineseProviderGroupCount: chineseActiveProviderGroups.length,
    chineseActiveProviderGroups,
    radarProviderGroups,
  }
}

export function buildModelReleaseCandidate(input: BuildModelReleaseCandidateInput): ModelReleaseCandidate {
  const apiPricingAvailable = input.pricingStatusSuggestion === 'verified'
  const requiresCustomPricing = !apiPricingAvailable
  const normalizedPricing = input.normalizedPricing ?? null
  const fxRateSnapshot = input.fxRateSnapshot ?? null
  const candidateId = [
    input.modelOwner,
    input.modelFamily,
    input.servingProvider,
    input.pricingRegion,
    input.sourceId,
    input.modelNames.map(slug).join('-'),
  ].map(slug).join(':')

  return {
    candidateId,
    detectedAt: input.detectedAt,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    title: input.title,
    modelNames: input.modelNames,
    modelOwner: input.modelOwner,
    modelFamily: input.modelFamily,
    servingProvider: input.servingProvider,
    pricingRegion: input.pricingRegion,
    currency: input.currency,
    sourceLanguage: input.sourceLanguage,
    nativePricing: input.nativePricing ?? null,
    normalizedPricing,
    fxRateSnapshot,
    hostedThirdPartyModel: input.hostedThirdPartyModel ?? input.officialSourceTrust === 'official_cloud_hosted',
    mainlandOnly: input.mainlandOnly ?? input.pricingRegion === 'china_mainland',
    internationalEndpointAvailable: input.internationalEndpointAvailable ?? input.pricingRegion !== 'china_mainland',
    dataResidencyNote: input.dataResidencyNote ?? null,
    pricingStatusSuggestion: input.pricingStatusSuggestion,
    apiPricingAvailable,
    requiresCustomPricing,
    officialSourceTrust: input.officialSourceTrust,
    status: candidateStatus(input),
    evidenceRefs: [`source:${input.sourceId}`],
    confidence: input.officialSourceTrust === 'official_pricing' ? 'high' : 'medium',
    reviewNotes: [
      ...(input.officialSourceTrust === 'official_cloud_hosted' ? ['Hosted cloud price; do not treat as first-party owner pricing.'] : []),
      ...(input.currency !== 'USD' ? ['Native currency must be preserved; USD conversion requires an FX snapshot.'] : []),
      ...(requiresCustomPricing ? ['Official API price is not available for deterministic cost calculation yet.'] : []),
    ],
  }
}

export function dedupeModelReleaseCandidates(candidates: ModelReleaseCandidate[]): ModelReleaseCandidate[] {
  const seen = new Set<string>()
  return candidates.filter(candidate => {
    if (seen.has(candidate.candidateId)) return false
    seen.add(candidate.candidateId)
    return true
  })
}

export interface OfficialUpdatesReviewInbox {
  reviewCandidates: ModelReleaseCandidate[]
  needsFxReview: ModelReleaseCandidate[]
  needsRegionReview: ModelReleaseCandidate[]
  noisyCandidates: Array<Record<string, unknown>>
  ragRecordCount: number
  sourceChangedCount: number
}

export function buildOfficialUpdatesReviewInbox(input: {
  candidates: ModelReleaseCandidate[]
  snippets: OfficialSourceSnippet[]
  noisyCandidates?: Array<Record<string, unknown>>
  sourceChangedCount: number
}): OfficialUpdatesReviewInbox {
  const candidates = dedupeModelReleaseCandidates(input.candidates)
  const needsFxReview = candidates.filter(candidate => candidate.status === 'needs_fx_review')
  const needsRegionReview = candidates.filter(candidate => candidate.status === 'needs_region_review')
  const reviewCandidates = candidates.filter(candidate => (
    candidate.status !== 'needs_fx_review' && candidate.status !== 'needs_region_review'
  ))

  return {
    reviewCandidates,
    needsFxReview,
    needsRegionReview,
    noisyCandidates: input.noisyCandidates ?? [],
    ragRecordCount: input.snippets.length,
    sourceChangedCount: input.sourceChangedCount,
  }
}

export function canUseNormalizedUsdPricing(candidate: ModelReleaseCandidate): boolean {
  return !!candidate.normalizedPricing
    && !!candidate.fxRateSnapshot
    && candidate.status !== 'needs_fx_review'
}

export const DEMO_MODEL_RELEASE_CANDIDATES: ModelReleaseCandidate[] = [
  buildModelReleaseCandidate({
    detectedAt: '2026-05-24T00:00:00.000Z',
    sourceId: 'kimi-pricing-chat',
    sourceUrl: 'https://platform.kimi.ai/docs/pricing/chat',
    title: 'Kimi K2.6 official pricing candidate',
    modelNames: ['Kimi K2.6'],
    modelOwner: 'moonshot_kimi',
    modelFamily: 'kimi',
    servingProvider: 'kimi_platform',
    pricingRegion: 'global',
    currency: 'USD',
    sourceLanguage: 'en',
    pricingStatusSuggestion: 'verified',
    officialSourceTrust: 'official_pricing',
  }),
  buildModelReleaseCandidate({
    detectedAt: '2026-05-24T00:00:00.000Z',
    sourceId: 'baidu-qianfan-pricing',
    sourceUrl: 'https://intl.cloud.baidu.com/en/doc/qianfan/s/Jm8r1826a-intl-en',
    title: 'GLM-5 hosted on Baidu Qianfan',
    modelNames: ['GLM-5'],
    modelOwner: 'zai_glm',
    modelFamily: 'glm',
    servingProvider: 'baidu_qianfan',
    pricingRegion: 'international_singapore',
    currency: 'USD',
    sourceLanguage: 'en',
    pricingStatusSuggestion: 'verified',
    officialSourceTrust: 'official_cloud_hosted',
    hostedThirdPartyModel: true,
  }),
  buildModelReleaseCandidate({
    detectedAt: '2026-05-24T00:00:00.000Z',
    sourceId: 'yi-radar',
    sourceUrl: 'https://www.lingyiwanwu.com/',
    title: 'Yi Large official announcement radar candidate',
    modelNames: ['Yi Large'],
    modelOwner: '01ai_yi',
    modelFamily: 'yi',
    servingProvider: 'first_party',
    pricingRegion: 'unknown',
    currency: 'USD',
    sourceLanguage: 'zh',
    pricingStatusSuggestion: 'unavailable',
    officialSourceTrust: 'official_announcement',
  }),
]

export const DEMO_PRICING_FACT_CANDIDATES = [
  {
    id: 'fact-candidate:kimi-k2-6',
    modelFamily: 'kimi',
    region: 'global',
    sourceRef: 'source:kimi-pricing-chat',
    status: 'needs_pricing_review',
  },
  {
    id: 'fact-candidate:glm-5-baidu-qianfan',
    modelFamily: 'glm',
    region: 'international_singapore',
    sourceRef: 'source:baidu-qianfan-pricing',
    status: 'needs_pricing_review',
    hostedThirdPartyModel: true,
  },
]

export const DEMO_OFFICIAL_SOURCE_SNIPPETS: OfficialSourceSnippet[] = [
  {
    snippetId: 'source:kimi-pricing-chat#kimi-k2-6',
    sourceId: 'kimi-pricing-chat',
    sourceUrl: 'https://platform.kimi.ai/docs/pricing/chat',
    sourceKind: 'pricing',
    provider: 'moonshot_kimi',
    servingProvider: 'kimi_platform',
    pricingRegion: 'global',
    text: 'Kimi K2.6 official pricing candidate requires human Fact Ledger review before calculation.',
    hash: 'initial-kimi-k2-6',
    capturedAt: '2026-05-24T00:00:00.000Z',
    refs: ['source:kimi-pricing-chat'],
  },
  {
    snippetId: 'source:zai-pricing#glm-5',
    sourceId: 'zai-pricing',
    sourceUrl: 'https://docs.z.ai/guides/overview/pricing',
    sourceKind: 'pricing',
    provider: 'zai_glm',
    servingProvider: 'z_ai',
    pricingRegion: 'global',
    text: 'GLM pricing source is watched separately from Baidu Qianfan hosted prices.',
    hash: 'initial-glm-5',
    capturedAt: '2026-05-24T00:00:00.000Z',
    refs: ['source:zai-pricing'],
  },
]

export const DEMO_FX_RATE_SNAPSHOTS = [
  {
    base: 'CNY',
    quote: 'USD',
    rate: null,
    source: 'manual_review_required',
    capturedAt: null,
    note: 'Native CNY pricing is preserved until an explicit FX snapshot is approved.',
  },
]
