import { describe, expect, it } from 'vitest'
import { rollupUsageByAxis } from './attribution'
import type { UsageImportRow } from './usageImport'

const ROWS: UsageImportRow[] = [
  {
    timestamp: '2026-05-01',
    requestId: 'req_1',
    customerId: 'acme',
    planId: 'pro',
    feature: 'report_generation',
    modelId: 'claude-sonnet-4.6',
    sessionId: 'sess_1',
    agentRunId: 'run_1',
    inputTokens: 1000,
    outputTokens: 500,
    totalCostUsd: 9,
    latencyMs: 1200,
    status: 'success',
    costSource: 'explicit',
  },
  {
    timestamp: '2026-05-01',
    requestId: 'req_2',
    customerId: 'acme',
    planId: 'pro',
    feature: 'agent_workflow',
    modelId: 'claude-sonnet-4.6',
    sessionId: 'sess_1',
    agentRunId: 'run_1',
    inputTokens: 2000,
    outputTokens: 1000,
    totalCostUsd: 21,
    latencyMs: 1500,
    status: 'success',
    costSource: 'explicit',
  },
  {
    timestamp: '2026-05-01',
    requestId: 'req_3',
    customerId: null,
    planId: null,
    feature: 'chat_assistant',
    modelId: 'gemini-3.1-flash',
    sessionId: null,
    agentRunId: null,
    inputTokens: 1000,
    outputTokens: 1000,
    totalCostUsd: 10,
    latencyMs: null,
    status: null,
    costSource: 'explicit',
  },
]

describe('rollupUsageByAxis', () => {
  it('aggregates cost, tokens, requests, and share for a selected axis', () => {
    const result = rollupUsageByAxis(ROWS, 'feature')

    expect(result.rows).toHaveLength(3)
    expect(result.totalCostUsd).toBe(40)
    expect(result.rows[0]).toMatchObject({
      key: 'agent_workflow',
      label: 'agent_workflow',
      requestCount: 1,
      inputTokens: 2000,
      outputTokens: 1000,
      totalCostUsd: 21,
      shareOfCost: 0.525,
    })
  })

  it('tracks rows missing the selected dimension separately', () => {
    const result = rollupUsageByAxis(ROWS, 'plan')

    expect(result.missingCount).toBe(1)
    expect(result.rows.map(row => row.key)).toEqual(['pro'])
    expect(result.rows[0].requestCount).toBe(2)
  })
})
