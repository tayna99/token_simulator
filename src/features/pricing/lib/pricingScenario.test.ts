import { describe, expect, it } from 'vitest'
import { calculatePricingScenario } from './pricingScenario'
import type { UsageImportRow } from '../../../features/usage/lib/usageImport'

const ROWS: UsageImportRow[] = [
  row('acme', 'pro', 100),
  row('beta', 'pro', 10),
  row('cobalt', 'team', 30),
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

describe('calculatePricingScenario', () => {
  it('compares flat pricing revenue against AI COGS', () => {
    const result = calculatePricingScenario(ROWS, {
      policy: 'flat',
      currentRevenueByCustomer: { acme: 99, beta: 99, cobalt: 299 },
    })

    expect(result.monthlyAiCogs).toBe(140)
    expect(result.revenueUsd).toBe(497)
    expect(result.lossCustomerCount).toBe(1)
    expect(result.grossMarginPct).toBeCloseTo(0.7183, 3)
  })

  it('applies credit bundle and overage revenue deterministically', () => {
    const result = calculatePricingScenario(ROWS, {
      policy: 'credit',
      baseSubscriptionUsd: 29,
      includedRequests: 0,
      overagePricePerRequest: 10,
    })

    expect(result.revenueUsd).toBe(117)
    expect(result.recommendationBasis).toContain('credit')
  })

  it('caps recognized cost for cap scenarios without mutating source rows', () => {
    const result = calculatePricingScenario(ROWS, {
      policy: 'cap',
      currentRevenueByCustomer: { acme: 99, beta: 99, cobalt: 299 },
      capCostUsdPerCustomer: 50,
    })

    expect(result.monthlyAiCogs).toBe(90)
    expect(ROWS[0].totalCostUsd).toBe(100)
  })
})
