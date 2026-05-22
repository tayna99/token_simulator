import type { UsageImportRow } from './usageImport'

export type AttributionAxis = 'customer' | 'feature' | 'model' | 'plan' | 'session' | 'agent_run'

export interface AttributionRow {
  key: string
  label: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  costPerRequest: number
  shareOfCost: number
}

export interface AttributionResult {
  axis: AttributionAxis
  rows: AttributionRow[]
  missingCount: number
  totalCostUsd: number
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function valueForAxis(row: UsageImportRow, axis: AttributionAxis): string | null {
  if (axis === 'customer') return row.customerId
  if (axis === 'feature') return row.feature
  if (axis === 'model') return row.modelId
  if (axis === 'plan') return row.planId
  if (axis === 'session') return row.sessionId
  return row.agentRunId
}

export function rollupUsageByAxis(rows: UsageImportRow[], axis: AttributionAxis): AttributionResult {
  const totals = rows.reduce((acc, row) => acc + finiteNonNegative(row.totalCostUsd), 0)
  let missingCount = 0
  const grouped = rows.reduce<Map<string, AttributionRow>>((map, row) => {
    const key = valueForAxis(row, axis)
    if (!key) {
      missingCount += 1
      return map
    }

    const existing = map.get(key) ?? {
      key,
      label: key,
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
    existing.inputTokens += finiteNonNegative(row.inputTokens)
    existing.outputTokens += finiteNonNegative(row.outputTokens)
    existing.totalCostUsd += finiteNonNegative(row.totalCostUsd)
    map.set(key, existing)
    return map
  }, new Map())

  const rowsOut = [...grouped.values()]
    .map(row => ({
      ...row,
      avgInputTokensPerRequest: row.requestCount > 0 ? Math.round(row.inputTokens / row.requestCount) : 0,
      avgOutputTokensPerRequest: row.requestCount > 0 ? Math.round(row.outputTokens / row.requestCount) : 0,
      costPerRequest: row.requestCount > 0 ? row.totalCostUsd / row.requestCount : 0,
      shareOfCost: totals > 0 ? row.totalCostUsd / totals : 0,
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)

  return {
    axis,
    rows: rowsOut,
    missingCount,
    totalCostUsd: totals,
  }
}
