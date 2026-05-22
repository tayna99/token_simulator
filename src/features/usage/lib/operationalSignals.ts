import type { UsageImportRow } from './usageImport'

export interface OperationalCostDriver {
  id: string
  costUsd: number
  requestCount: number
}

export interface OperationalSignalSummary {
  topSession: OperationalCostDriver | null
  topAgentRun: OperationalCostDriver | null
  highOutputTokenRows: UsageImportRow[]
  failedShare: number
  missingStatusCount: number
  missingDimensionCount: number
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function topDriver(rows: UsageImportRow[], key: 'sessionId' | 'agentRunId'): OperationalCostDriver | null {
  const grouped = rows.reduce<Map<string, OperationalCostDriver>>((map, row) => {
    const id = row[key]
    if (!id) return map
    const existing = map.get(id) ?? { id, costUsd: 0, requestCount: 0 }
    existing.costUsd += finiteNonNegative(row.totalCostUsd)
    existing.requestCount += 1
    map.set(id, existing)
    return map
  }, new Map())

  return [...grouped.values()].sort((a, b) => b.costUsd - a.costUsd)[0] ?? null
}

export function summarizeOperationalSignals(rows: UsageImportRow[]): OperationalSignalSummary {
  const failedCount = rows.filter(row => ['failed', 'error', 'timeout', 'retry'].includes((row.status ?? '').toLowerCase())).length
  const missingStatusCount = rows.filter(row => !row.status).length
  const missingDimensionCount = rows.filter(row => !row.sessionId || !row.agentRunId || !row.planId || !row.customerId).length
  const sortedByOutput = [...rows].sort((a, b) => finiteNonNegative(b.outputTokens) - finiteNonNegative(a.outputTokens))

  return {
    topSession: topDriver(rows, 'sessionId'),
    topAgentRun: topDriver(rows, 'agentRunId'),
    highOutputTokenRows: sortedByOutput.slice(0, 3),
    failedShare: rows.length > 0 ? failedCount / rows.length : 0,
    missingStatusCount,
    missingDimensionCount,
  }
}
