import type { FeatureUsageSummary } from '../../../lib/usageImport'

export type MarginRisk = 'healthy' | 'thin' | 'loss'

export interface FeatureUnitEconomicsRow extends FeatureUsageSummary {
  pricePerUnitUsd: number
  revenueUsd: number
  grossMarginUsd: number
  grossMarginPct: number
  marginRisk: MarginRisk
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function riskFor(grossMarginPct: number, grossMarginUsd: number): MarginRisk {
  if (grossMarginUsd < 0) return 'loss'
  if (grossMarginPct < 0.4) return 'thin'
  return 'healthy'
}

export function calculateFeatureUnitEconomics(
  features: FeatureUsageSummary[],
  pricePerUnitUsd: number,
): FeatureUnitEconomicsRow[] {
  const price = finiteNonNegative(pricePerUnitUsd)
  return features.map(feature => {
    const revenueUsd = feature.requestCount * price
    const grossMarginUsd = revenueUsd - finiteNonNegative(feature.totalCostUsd)
    const grossMarginPct = revenueUsd > 0 ? grossMarginUsd / revenueUsd : 0

    return {
      ...feature,
      pricePerUnitUsd: price,
      revenueUsd,
      grossMarginUsd,
      grossMarginPct,
      marginRisk: riskFor(grossMarginPct, grossMarginUsd),
    }
  })
}
