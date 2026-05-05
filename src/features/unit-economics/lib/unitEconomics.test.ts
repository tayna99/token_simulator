import { describe, expect, it } from 'vitest'
import { calculateFeatureUnitEconomics } from './unitEconomics'

describe('calculateFeatureUnitEconomics', () => {
  it('calculates revenue, margin, and risk from imported feature cost', () => {
    const rows = calculateFeatureUnitEconomics([
      {
        feature: 'rag_chat',
        requestCount: 100,
        inputTokens: 100_000,
        outputTokens: 50_000,
        totalCostUsd: 25,
        avgInputTokensPerRequest: 1000,
        avgOutputTokensPerRequest: 500,
        costPerRequest: 0.25,
        shareOfCost: 1,
      },
    ], 1)

    expect(rows[0]).toMatchObject({
      feature: 'rag_chat',
      revenueUsd: 100,
      grossMarginUsd: 75,
      marginRisk: 'healthy',
    })
    expect(rows[0].grossMarginPct).toBe(0.75)
  })

  it('marks negative margin as a loss risk', () => {
    const rows = calculateFeatureUnitEconomics([
      {
        feature: 'summary',
        requestCount: 10,
        inputTokens: 30_000,
        outputTokens: 8_000,
        totalCostUsd: 15,
        avgInputTokensPerRequest: 3000,
        avgOutputTokensPerRequest: 800,
        costPerRequest: 1.5,
        shareOfCost: 1,
      },
    ], 1)

    expect(rows[0].grossMarginUsd).toBe(-5)
    expect(rows[0].marginRisk).toBe('loss')
  })

  it('accepts a different selling price per feature', () => {
    const rows = calculateFeatureUnitEconomics([
      {
        feature: 'ticket_classifier',
        requestCount: 100,
        inputTokens: 10_000,
        outputTokens: 1000,
        totalCostUsd: 5,
        avgInputTokensPerRequest: 100,
        avgOutputTokensPerRequest: 10,
        costPerRequest: 0.05,
        shareOfCost: 0.25,
      },
      {
        feature: 'report_generation',
        requestCount: 10,
        inputTokens: 100_000,
        outputTokens: 20_000,
        totalCostUsd: 15,
        avgInputTokensPerRequest: 10_000,
        avgOutputTokensPerRequest: 2000,
        costPerRequest: 1.5,
        shareOfCost: 0.75,
      },
    ], {
      ticket_classifier: 0.1,
      report_generation: 3,
    })

    expect(rows[0]).toMatchObject({
      feature: 'ticket_classifier',
      pricePerUnitUsd: 0.1,
      revenueUsd: 10,
      grossMarginUsd: 5,
    })
    expect(rows[1]).toMatchObject({
      feature: 'report_generation',
      pricePerUnitUsd: 3,
      revenueUsd: 30,
      grossMarginUsd: 15,
    })
  })
})
