import { calculateCost } from './calculator'
import type { Model } from '../data/models'

export interface UsageImportRow {
  feature: string
  modelId: string
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  latencyMs: number | null
  customerId: string | null
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
  requestCount: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  p95OutputTokens: number
  topFeatureByCost: FeatureUsageSummary | null
}

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

function rowCost(record: Record<string, string>, model: Model | undefined, inputTokens: number, outputTokens: number): number {
  const explicit = numberFrom(valueFor(record, ['total_cost', 'cost_usd', 'cost', 'totalCost']))
  if (explicit > 0) return explicit
  if (!model) return 0

  return calculateCost({
    model,
    monthlyInputTokens: inputTokens,
    monthlyOutputTokens: outputTokens,
    monthlyRequests: 1,
    cacheHitRate: 0,
    batchEnabled: false,
  }).monthlyCost
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * ratio) - 1
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))]
}

export function parseUsageCsv(rawCsv: string, models: Model[]): UsageImportSummary {
  const lines = rawCsv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return {
      rows: [],
      featureSummaries: [],
      requestCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      avgInputTokensPerRequest: 0,
      avgOutputTokensPerRequest: 0,
      p95OutputTokens: 0,
      topFeatureByCost: null,
    }
  }

  const headers = parseCsvLine(lines[0]).map(header => header.trim())
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const record = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? ''
      return acc
    }, {})
    const feature = textFrom(valueFor(record, ['feature', 'route', 'use_case', 'useCase']), 'unknown')
    const modelId = textFrom(valueFor(record, ['model', 'model_id', 'modelId']), '')
    const model = models.find(item => item.id === modelId || item.name === modelId)
    const inputTokens = Math.round(numberFrom(valueFor(record, ['input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens'])))
    const outputTokens = Math.round(numberFrom(valueFor(record, ['output_tokens', 'outputTokens', 'completion_tokens', 'completionTokens'])))

    return {
      feature,
      modelId,
      inputTokens,
      outputTokens,
      totalCostUsd: rowCost(record, model, inputTokens, outputTokens),
      latencyMs: numberFrom(valueFor(record, ['latency_ms', 'latencyMs', 'latency'])) || null,
      customerId: valueFor(record, ['customer_id', 'customerId', 'user_id', 'userId']) ?? null,
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

  return {
    rows,
    featureSummaries,
    requestCount,
    totalInputTokens: totals.totalInputTokens,
    totalOutputTokens: totals.totalOutputTokens,
    totalCostUsd: totals.totalCostUsd,
    avgInputTokensPerRequest: requestCount > 0 ? Math.round(totals.totalInputTokens / requestCount) : 0,
    avgOutputTokensPerRequest: requestCount > 0 ? Math.round(totals.totalOutputTokens / requestCount) : 0,
    p95OutputTokens: percentile(rows.map(row => row.outputTokens), 0.95),
    topFeatureByCost: featureSummaries[0] ?? null,
  }
}
