import { describe, expect, it } from 'vitest'
import { mergeThresholdPolicy } from '../../metrics/lib/thresholdPolicy'
import { calculateFeatureUnitEconomics } from './unitEconomics'
import { customerProfitability, marginByPlan } from './margin'
import type { UsageImportRow } from '../../usage/lib/usageImport'

const usageRow: UsageImportRow = {
  timestamp: '2026-05-01',
  requestId: null,
  customerId: 'acme',
  planId: 'pro',
  feature: 'rag_chat',
  modelId: 'gpt-5.4-mini',
  sessionId: null,
  agentRunId: null,
  inputTokens: 1000,
  outputTokens: 500,
  totalCostUsd: 55,
  latencyMs: null,
  status: null,
  costSource: 'explicit',
}

describe('unit economics threshold policy integration', () => {
  it('keeps the default thin-margin behavior but lets workspace policy tighten it', () => {
    const defaultRows = calculateFeatureUnitEconomics([{
      feature: 'rag_chat',
      requestCount: 100,
      inputTokens: 100_000,
      outputTokens: 50_000,
      totalCostUsd: 55,
      avgInputTokensPerRequest: 1000,
      avgOutputTokensPerRequest: 500,
      costPerRequest: 0.55,
      shareOfCost: 1,
    }], 1)

    const strictPolicy = mergeThresholdPolicy(undefined, { gross_margin_thin_pct: 0.5 })
    const strictRows = calculateFeatureUnitEconomics([{
      ...defaultRows[0],
      totalCostUsd: 55,
    }], 1, { thresholdPolicy: strictPolicy })

    expect(defaultRows[0].grossMarginPct).toBe(0.45)
    expect(defaultRows[0].marginRisk).toBe('healthy')
    expect(strictRows[0].marginRisk).toBe('thin')
  })

  it('applies the same threshold policy to plan and customer margins', () => {
    const strictPolicy = mergeThresholdPolicy(undefined, { gross_margin_thin_pct: 0.5 })

    expect(marginByPlan([usageRow], { pro: 100 }, undefined, { thresholdPolicy: strictPolicy })[0].marginRisk).toBe('thin')
    expect(customerProfitability([usageRow], { acme: 100 }, undefined, { thresholdPolicy: strictPolicy })[0].marginRisk).toBe('thin')
  })
})
