import { describe, expect, it } from 'vitest'
import { customerProfitability, heavyUserDetection, marginByPlan } from './margin'
import type { UsageImportRow } from '../../../features/usage/lib/usageImport'

const ROWS: UsageImportRow[] = [
  row('acme', 'pro', 80),
  row('acme', 'pro', 20),
  row('beta', 'pro', 10),
  row('cobalt', 'team', 30),
  row('delta', 'team', 5),
]

function row(customerId: string, planId: string, totalCostUsd: number): UsageImportRow {
  return {
    timestamp: '2026-05-01',
    requestId: null,
    customerId,
    planId,
    feature: 'report_generation',
    modelId: 'claude-sonnet-4.6',
    sessionId: null,
    agentRunId: null,
    inputTokens: 1000,
    outputTokens: 500,
    totalCostUsd,
    latencyMs: null,
    status: null,
    costSource: 'explicit',
  }
}

describe('margin analytics', () => {
  it('calculates plan gross margin and flags loss plans', () => {
    const result = marginByPlan(ROWS, { pro: 99, team: 300 })

    expect(result[0]).toMatchObject({
      planId: 'pro',
      revenueUsd: 99,
      totalCostUsd: 110,
      grossMarginUsd: -11,
      marginRisk: 'loss',
    })
    expect(result[1].grossMarginPct).toBeCloseTo(0.8833, 3)
  })

  it('calculates customer profitability with zero revenue guarded', () => {
    const result = customerProfitability(ROWS, { acme: 90, beta: 29, cobalt: 99 })

    expect(result.find(row => row.customerId === 'acme')).toMatchObject({
      totalCostUsd: 100,
      revenueUsd: 90,
      marginRisk: 'loss',
    })
    expect(result.find(row => row.customerId === 'delta')?.grossMarginPct).toBe(0)
  })

  it('detects heavy-user concentration from top decile customers', () => {
    const result = heavyUserDetection(ROWS, { acme: 90, beta: 29, cobalt: 99, delta: 29 })

    expect(result.topDecileShare).toBeCloseTo(100 / 145)
    expect(result.lossCustomers.map(customer => customer.customerId)).toEqual(['acme'])
  })
})
