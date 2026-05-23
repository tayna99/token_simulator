import type { FeatureUsageSummary } from '../../../lib/usageImport'
import { DEFAULT_THRESHOLD_POLICY, getThreshold, type ThresholdPolicy } from '../../metrics/lib/thresholdPolicy'

export type MarginRisk = 'healthy' | 'thin' | 'loss'

export interface FeatureUnitEconomicsRow extends FeatureUsageSummary {
  pricePerUnitUsd: number
  revenueUsd: number
  grossMarginUsd: number
  grossMarginPct: number
  marginRisk: MarginRisk
}

export type FeaturePriceInput = number | Record<string, number>

export interface UnitEconomicsOptions {
  thresholdPolicy?: ThresholdPolicy
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function riskFor(grossMarginPct: number, grossMarginUsd: number, policy: ThresholdPolicy): MarginRisk {
  if (grossMarginUsd < getThreshold(policy, 'gross_margin_loss_usd').currentValue) return 'loss'
  if (grossMarginPct < getThreshold(policy, 'gross_margin_thin_pct').currentValue) return 'thin'
  return 'healthy'
}

export function calculateFeatureUnitEconomics(
  features: FeatureUsageSummary[],
  pricePerUnitUsd: FeaturePriceInput,
  options: UnitEconomicsOptions = {},
): FeatureUnitEconomicsRow[] {
  const thresholdPolicy = options.thresholdPolicy ?? DEFAULT_THRESHOLD_POLICY
  return features.map(feature => {
    const rawPrice = typeof pricePerUnitUsd === 'number'
      ? pricePerUnitUsd
      : pricePerUnitUsd[feature.feature] ?? 0
    const price = finiteNonNegative(rawPrice)
    const revenueUsd = feature.requestCount * price
    const grossMarginUsd = revenueUsd - finiteNonNegative(feature.totalCostUsd)
    const grossMarginPct = revenueUsd > 0 ? grossMarginUsd / revenueUsd : 0

    return {
      ...feature,
      pricePerUnitUsd: price,
      revenueUsd,
      grossMarginUsd,
      grossMarginPct,
      marginRisk: riskFor(grossMarginPct, grossMarginUsd, thresholdPolicy),
    }
  })
}
