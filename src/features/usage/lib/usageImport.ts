import { calculateCost, calculateMultimodalScenario } from '../../../lib/calculator'
import { isCostCalculableModel, type Model } from '../../../data/models'
import { inspectUsageImportSecurity, type TrustInspectionResult } from '../../trust/lib/securityMiddleware'

export interface UsageImportRow {
  timestamp: string | null
  requestId: string | null
  feature: string
  modelId: string
  planId: string | null
  sessionId: string | null
  agentRunId: string | null
  inputTokens: number
  outputTokens: number
  imageInputTokens?: number
  audioInputSeconds?: number
  videoInputSeconds?: number
  videoOutputSeconds?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  toolCallCount?: number
  webSearchCount?: number
  totalCostUsd: number
  latencyMs: number | null
  customerId: string | null
  status: string | null
  costSource: 'explicit' | 'model_price' | 'missing_model'
  pricingWarnings?: string[]
}

export type UsageAttributionDimension = 'customer' | 'feature' | 'model' | 'plan' | 'session' | 'agent_run'
export type ImportHealthStatus = 'ready' | 'needs_mapping' | 'invalid'

export interface UsageImportHealthReport {
  status: ImportHealthStatus
  rowCount: number
  missingDimensionCounts: Record<UsageAttributionDimension, number>
  piiCandidateCount: number
  errors: string[]
  pricingWarnings?: string[]
}

export interface UsageSchemaMappingProfile {
  normalizedTable: 'normalized_usage_table'
  sourceColumns: string[]
  columns: Partial<Record<
    'timestamp' | 'request_id' | 'customer_id' | 'plan_id' | 'feature' | 'model' | 'session_id' | 'agent_run_id' | 'input_tokens' | 'output_tokens' | 'image_input_tokens' | 'audio_input_seconds' | 'video_input_seconds' | 'video_output_seconds' | 'cache_read_tokens' | 'cache_write_tokens' | 'tool_call_count' | 'web_search_count' | 'total_cost' | 'latency_ms' | 'status',
    string[]
  >>
}

export interface FeatureUsageSummary {
  feature: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  costPerRequest: number
  shareOfCost: number
}

export interface UsageImportSummary {
  rows: UsageImportRow[]
  featureSummaries: FeatureUsageSummary[]
  errors: string[]
  pricingWarnings?: string[]
  requestCount: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  p95OutputTokens: number
  topFeatureByCost: FeatureUsageSummary | null
  importHealthReport?: UsageImportHealthReport
  schemaMappingProfile?: UsageSchemaMappingProfile
  trustInspection?: TrustInspectionResult
}

const FIELD_KEYS = {
  timestamp: ['timestamp', 'created_at', 'createdAt'],
  request_id: ['request_id', 'requestId', 'id'],
  customer_id: ['customer_id', 'customerId', 'user_id', 'userId'],
  plan_id: ['plan_id', 'planId', 'plan'],
  feature: ['feature', 'route', 'use_case', 'useCase'],
  model: ['model', 'model_id', 'modelId'],
  session_id: ['session_id', 'sessionId', 'conversation_id', 'conversationId'],
  agent_run_id: ['agent_run_id', 'agentRunId', 'run_id', 'runId'],
  input_tokens: ['input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens'],
  output_tokens: ['output_tokens', 'outputTokens', 'completion_tokens', 'completionTokens'],
  image_input_tokens: ['image_input_tokens', 'imageInputTokens', 'image_tokens', 'imageTokens'],
  audio_input_seconds: ['audio_input_seconds', 'audioInputSeconds', 'audio_seconds', 'audioSeconds'],
  video_input_seconds: ['video_input_seconds', 'videoInputSeconds', 'video_seconds', 'videoSeconds'],
  video_output_seconds: ['video_output_seconds', 'videoOutputSeconds', 'generated_video_seconds', 'generatedVideoSeconds'],
  cache_read_tokens: ['cache_read_tokens', 'cacheReadTokens', 'cached_tokens', 'cachedTokens'],
  cache_write_tokens: ['cache_write_tokens', 'cacheWriteTokens'],
  tool_call_count: ['tool_call_count', 'toolCallCount', 'tool_calls', 'toolCalls'],
  web_search_count: ['web_search_count', 'webSearchCount', 'search_queries', 'searchQueries'],
  total_cost: ['total_cost', 'cost_usd', 'cost', 'totalCost'],
  latency_ms: ['latency_ms', 'latencyMs', 'latency'],
  status: ['status', 'result'],
} as const

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function numberFrom(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function textFrom(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

function valueFor(record: Record<string, string>, keys: string[]): string | undefined {
  return keys.map(key => record[key]).find(value => value !== undefined && value !== '')
}

function mappingProfile(headers: string[]): UsageSchemaMappingProfile {
  return {
    normalizedTable: 'normalized_usage_table',
    sourceColumns: headers,
    columns: Object.fromEntries(
      Object.entries(FIELD_KEYS).map(([field, keys]) => [
        field,
        keys.filter(key => headers.includes(key)),
      ]),
    ) as UsageSchemaMappingProfile['columns'],
  }
}

function emptyMissingDimensionCounts(): Record<UsageAttributionDimension, number> {
  return {
    customer: 0,
    feature: 0,
    model: 0,
    plan: 0,
    session: 0,
    agent_run: 0,
  }
}

function piiCandidateCount(rawCsv: string): number {
  const emailMatches = rawCsv.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  const phoneMatches = rawCsv.match(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g) ?? []
  return emailMatches.length + phoneMatches.length
}

function healthReport(
  rows: UsageImportRow[],
  errors: string[],
  rawCsv: string,
): UsageImportHealthReport {
  const missingDimensionCounts = rows.reduce((acc, row) => {
    if (!row.customerId) acc.customer += 1
    if (!row.feature) acc.feature += 1
    if (!row.modelId) acc.model += 1
    if (!row.planId) acc.plan += 1
    if (!row.sessionId) acc.session += 1
    if (!row.agentRunId) acc.agent_run += 1
    return acc
  }, emptyMissingDimensionCounts())
  const hasMissingDimensions = Object.values(missingDimensionCounts).some(count => count > 0)
  return {
    status: errors.length > 0 ? 'invalid' : hasMissingDimensions ? 'needs_mapping' : 'ready',
    rowCount: rows.length,
    missingDimensionCounts,
    piiCandidateCount: piiCandidateCount(rawCsv),
    errors,
  }
}

function rowCost(
  record: Record<string, string>,
  model: Model | undefined,
  inputTokens: number,
  outputTokens: number,
): { totalCostUsd: number; costSource: UsageImportRow['costSource'] } {
  const explicit = numberFrom(valueFor(record, ['total_cost', 'cost_usd', 'cost', 'totalCost']))
  if (explicit > 0) return { totalCostUsd: explicit, costSource: 'explicit' }
  if (!model || !isCostCalculableModel(model)) return { totalCostUsd: 0, costSource: 'missing_model' }

  return {
    totalCostUsd: calculateCost({
    model,
    monthlyInputTokens: inputTokens,
    monthlyOutputTokens: outputTokens,
    monthlyRequests: 1,
    cacheHitRate: 0,
    batchEnabled: false,
    }).monthlyCost,
    costSource: 'model_price',
  }
}

function multimodalPricingWarnings(
  model: Model | undefined,
  input: Pick<UsageImportRow,
    | 'imageInputTokens'
    | 'audioInputSeconds'
    | 'videoInputSeconds'
    | 'videoOutputSeconds'
    | 'webSearchCount'
  >,
): string[] {
  if (!model) return []
  const result = calculateMultimodalScenario({
    model,
    imageInputTokens: input.imageInputTokens,
    audioInputSeconds: input.audioInputSeconds,
    videoInputSeconds: input.videoInputSeconds,
    videoOutputSeconds: input.videoOutputSeconds,
    searchQueries: input.webSearchCount,
  })
  return result.lineItems
    .filter(item => item.status === 'unsupported_pricing')
    .map(item => `${item.modality}: unsupported_pricing`)
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * ratio) - 1
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))]
}

export function parseUsageCsv(rawCsv: string, models: Model[]): UsageImportSummary {
  const trustInspection = inspectUsageImportSecurity({ filename: 'inline.csv', rawCsv })
  const empty = (errors: string[] = [], headers: string[] = []): UsageImportSummary => ({
    rows: [],
    featureSummaries: [],
    errors,
    pricingWarnings: [],
    requestCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    avgInputTokensPerRequest: 0,
    avgOutputTokensPerRequest: 0,
    p95OutputTokens: 0,
    topFeatureByCost: null,
    importHealthReport: healthReport([], errors, rawCsv),
    schemaMappingProfile: mappingProfile(headers),
    trustInspection,
  })
  const lines = rawCsv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return empty()
  }

  const headers = parseCsvLine(lines[0]).map(header => header.trim())
  const requiredColumns = [
    { label: 'feature', keys: FIELD_KEYS.feature },
    { label: 'model', keys: FIELD_KEYS.model },
    { label: 'input_tokens', keys: FIELD_KEYS.input_tokens },
    { label: 'output_tokens', keys: FIELD_KEYS.output_tokens },
  ]
  const missingRequired = requiredColumns
    .filter(group => !group.keys.some(key => headers.includes(key)))
    .map(group => `Missing required column: ${group.label}`)

  if (missingRequired.length > 0) {
    return empty(missingRequired, headers)
  }

  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const record = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? ''
      return acc
    }, {})
    const feature = textFrom(valueFor(record, [...FIELD_KEYS.feature]), 'unknown')
    const modelId = textFrom(valueFor(record, [...FIELD_KEYS.model]), '')
    const model = models.find(item => item.id === modelId || item.name === modelId)
    const inputTokens = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.input_tokens])))
    const outputTokens = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.output_tokens])))
    const imageInputTokens = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.image_input_tokens])))
    const audioInputSeconds = numberFrom(valueFor(record, [...FIELD_KEYS.audio_input_seconds]))
    const videoInputSeconds = numberFrom(valueFor(record, [...FIELD_KEYS.video_input_seconds]))
    const videoOutputSeconds = numberFrom(valueFor(record, [...FIELD_KEYS.video_output_seconds]))
    const cacheReadTokens = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.cache_read_tokens])))
    const cacheWriteTokens = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.cache_write_tokens])))
    const toolCallCount = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.tool_call_count])))
    const webSearchCount = Math.round(numberFrom(valueFor(record, [...FIELD_KEYS.web_search_count])))
    const cost = rowCost(record, model, inputTokens, outputTokens)
    const pricingWarnings = multimodalPricingWarnings(model, {
      imageInputTokens,
      audioInputSeconds,
      videoInputSeconds,
      videoOutputSeconds,
      webSearchCount,
    })

    return {
      timestamp: valueFor(record, [...FIELD_KEYS.timestamp]) ?? null,
      requestId: valueFor(record, [...FIELD_KEYS.request_id]) ?? null,
      feature,
      modelId,
      planId: valueFor(record, [...FIELD_KEYS.plan_id]) ?? null,
      sessionId: valueFor(record, [...FIELD_KEYS.session_id]) ?? null,
      agentRunId: valueFor(record, [...FIELD_KEYS.agent_run_id]) ?? null,
      inputTokens,
      outputTokens,
      imageInputTokens,
      audioInputSeconds,
      videoInputSeconds,
      videoOutputSeconds,
      cacheReadTokens,
      cacheWriteTokens,
      toolCallCount,
      webSearchCount,
      totalCostUsd: cost.totalCostUsd,
      latencyMs: numberFrom(valueFor(record, [...FIELD_KEYS.latency_ms])) || null,
      customerId: valueFor(record, [...FIELD_KEYS.customer_id]) ?? null,
      status: valueFor(record, [...FIELD_KEYS.status]) ?? null,
      costSource: cost.costSource,
      pricingWarnings,
    }
  })

  const totals = rows.reduce((acc, row) => {
    acc.totalInputTokens += row.inputTokens
    acc.totalOutputTokens += row.outputTokens
    acc.totalCostUsd += row.totalCostUsd
    return acc
  }, {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
  })

  const byFeature = rows.reduce<Map<string, FeatureUsageSummary>>((map, row) => {
    const existing = map.get(row.feature) ?? {
      feature: row.feature,
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      avgInputTokensPerRequest: 0,
      avgOutputTokensPerRequest: 0,
      costPerRequest: 0,
      shareOfCost: 0,
    }
    existing.requestCount += 1
    existing.inputTokens += row.inputTokens
    existing.outputTokens += row.outputTokens
    existing.totalCostUsd += row.totalCostUsd
    map.set(row.feature, existing)
    return map
  }, new Map())

  const featureSummaries = [...byFeature.values()]
    .map(feature => ({
      ...feature,
      avgInputTokensPerRequest: feature.requestCount > 0 ? Math.round(feature.inputTokens / feature.requestCount) : 0,
      avgOutputTokensPerRequest: feature.requestCount > 0 ? Math.round(feature.outputTokens / feature.requestCount) : 0,
      costPerRequest: feature.requestCount > 0 ? feature.totalCostUsd / feature.requestCount : 0,
      shareOfCost: totals.totalCostUsd > 0 ? feature.totalCostUsd / totals.totalCostUsd : 0,
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)

  const requestCount = rows.length
  const pricingWarnings = [...new Set(rows.flatMap(row => row.pricingWarnings ?? []))]

  return {
    rows,
    featureSummaries,
    errors: [],
    pricingWarnings,
    requestCount,
    totalInputTokens: totals.totalInputTokens,
    totalOutputTokens: totals.totalOutputTokens,
    totalCostUsd: totals.totalCostUsd,
    avgInputTokensPerRequest: requestCount > 0 ? Math.round(totals.totalInputTokens / requestCount) : 0,
    avgOutputTokensPerRequest: requestCount > 0 ? Math.round(totals.totalOutputTokens / requestCount) : 0,
    p95OutputTokens: percentile(rows.map(row => row.outputTokens), 0.95),
    topFeatureByCost: featureSummaries[0] ?? null,
    importHealthReport: healthReport(rows, [], rawCsv),
    schemaMappingProfile: mappingProfile(headers),
    trustInspection,
  }
}
