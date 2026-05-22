import { describe, expect, it } from 'vitest'
import { summarizeOperationalSignals } from './operationalSignals'
import type { UsageImportRow } from './usageImport'

function row(overrides: Partial<UsageImportRow>): UsageImportRow {
  return {
    timestamp: '2026-05-01',
    requestId: null,
    customerId: 'cust_001',
    planId: 'pro',
    feature: 'report_generation',
    modelId: 'claude-sonnet-4.6',
    sessionId: null,
    agentRunId: null,
    inputTokens: 1000,
    outputTokens: 500,
    totalCostUsd: 10,
    latencyMs: null,
    status: null,
    costSource: 'explicit',
    ...overrides,
  }
}

describe('summarizeOperationalSignals', () => {
  it('finds top session and agent-run cost drivers', () => {
    const result = summarizeOperationalSignals([
      row({ sessionId: 'session-light', agentRunId: 'run-light', totalCostUsd: 10 }),
      row({ sessionId: 'session-heavy', agentRunId: 'run-loop', totalCostUsd: 60 }),
      row({ sessionId: 'session-heavy', agentRunId: 'run-loop', totalCostUsd: 40 }),
    ])

    expect(result.topSession?.id).toBe('session-heavy')
    expect(result.topAgentRun?.id).toBe('run-loop')
  })

  it('reports failed status share and missing statuses', () => {
    const result = summarizeOperationalSignals([
      row({ status: 'success' }),
      row({ status: 'failed' }),
      row({ status: null }),
    ])

    expect(result.failedShare).toBeCloseTo(1 / 3)
    expect(result.missingStatusCount).toBe(1)
  })
})
