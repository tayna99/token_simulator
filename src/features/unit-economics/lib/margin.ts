import type { UsageImportRow } from '../../usage/lib/usageImport'
import { DEFAULT_THRESHOLD_POLICY, getThreshold, type ThresholdPolicy } from '../../metrics/lib/thresholdPolicy'
import { calculateEffectiveCost, type EffectiveCostInput } from './effectiveCost'

export type MarginRisk = 'healthy' | 'thin' | 'loss'

export interface MarginRow {
  planId: string
  requestCount: number
  totalCostUsd: number
  effectiveCostUsd: number
  revenueUsd: number
  grossMarginUsd: number
  grossMarginPct: number
  effectiveGrossMarginUsd: number
  effectiveGrossMarginPct: number
  marginRisk: MarginRisk
}

export interface CustomerMarginRow {
  customerId: string
  planId: string | null
  requestCount: number
  totalCostUsd: number
  effectiveCostUsd: number
  revenueUsd: number
  grossMarginUsd: number
  grossMarginPct: number
  effectiveGrossMarginUsd: number
  effectiveGrossMarginPct: number
  marginRisk: MarginRisk
}

export interface HeavyUserDetectionResult {
  topDecileShare: number
  topDecileCostUsd: number
  medianCustomerCostUsd: number
  lossCustomers: CustomerMarginRow[]
  customers: CustomerMarginRow[]
}

export interface MarginOptions {
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

function revenueFrom(input: Record<string, number>, key: string): number {
  return finiteNonNegative(input[key] ?? 0)
}

function effectiveForRaw(rawCostUsd: number, assumptions?: Omit<EffectiveCostInput, 'rawCostUsd'>): number {
  return calculateEffectiveCost({
    rawCostUsd,
    retryCostUsd: assumptions?.retryCostUsd,
    humanReviewCostUsd: assumptions?.humanReviewCostUsd,
    csEscalationCostUsd: assumptions?.csEscalationCostUsd,
  })
}

export function marginByPlan(
  rows: UsageImportRow[],
  revenueByPlan: Record<string, number>,
  effectiveAssumptions?: Omit<EffectiveCostInput, 'rawCostUsd'>,
  options: MarginOptions = {},
): MarginRow[] {
  const thresholdPolicy = options.thresholdPolicy ?? DEFAULT_THRESHOLD_POLICY
  const grouped = rows.reduce<Map<string, MarginRow>>((map, row) => {
    if (!row.planId) return map
    const existing = map.get(row.planId) ?? {
      planId: row.planId,
      requestCount: 0,
      totalCostUsd: 0,
      effectiveCostUsd: 0,
      revenueUsd: revenueFrom(revenueByPlan, row.planId),
      grossMarginUsd: 0,
      grossMarginPct: 0,
      effectiveGrossMarginUsd: 0,
      effectiveGrossMarginPct: 0,
      marginRisk: 'loss' as MarginRisk,
    }
    existing.requestCount += 1
    existing.totalCostUsd += finiteNonNegative(row.totalCostUsd)
    map.set(row.planId, existing)
    return map
  }, new Map())

  return [...grouped.values()]
    .map(row => {
      const grossMarginUsd = row.revenueUsd - row.totalCostUsd
      const grossMarginPct = row.revenueUsd > 0 ? grossMarginUsd / row.revenueUsd : 0
      const effectiveCostUsd = effectiveForRaw(row.totalCostUsd, effectiveAssumptions)
      const effectiveGrossMarginUsd = row.revenueUsd - effectiveCostUsd
      const effectiveGrossMarginPct = row.revenueUsd > 0 ? effectiveGrossMarginUsd / row.revenueUsd : 0
      return {
        ...row,
        effectiveCostUsd,
        grossMarginUsd,
        grossMarginPct,
        effectiveGrossMarginUsd,
        effectiveGrossMarginPct,
        marginRisk: riskFor(grossMarginPct, grossMarginUsd, thresholdPolicy),
      }
    })
    .sort((a, b) => a.grossMarginPct - b.grossMarginPct)
}

export function customerProfitability(
  rows: UsageImportRow[],
  revenueByCustomer: Record<string, number>,
  effectiveAssumptions?: Omit<EffectiveCostInput, 'rawCostUsd'>,
  options: MarginOptions = {},
): CustomerMarginRow[] {
  const thresholdPolicy = options.thresholdPolicy ?? DEFAULT_THRESHOLD_POLICY
  const grouped = rows.reduce<Map<string, CustomerMarginRow>>((map, row) => {
    if (!row.customerId) return map
    const existing = map.get(row.customerId) ?? {
      customerId: row.customerId,
      planId: row.planId,
      requestCount: 0,
      totalCostUsd: 0,
      effectiveCostUsd: 0,
      revenueUsd: revenueFrom(revenueByCustomer, row.customerId),
      grossMarginUsd: 0,
      grossMarginPct: 0,
      effectiveGrossMarginUsd: 0,
      effectiveGrossMarginPct: 0,
      marginRisk: 'loss' as MarginRisk,
    }
    existing.requestCount += 1
    existing.totalCostUsd += finiteNonNegative(row.totalCostUsd)
    map.set(row.customerId, existing)
    return map
  }, new Map())

  return [...grouped.values()]
    .map(row => {
      const grossMarginUsd = row.revenueUsd - row.totalCostUsd
      const grossMarginPct = row.revenueUsd > 0 ? grossMarginUsd / row.revenueUsd : 0
      const effectiveCostUsd = effectiveForRaw(row.totalCostUsd, effectiveAssumptions)
      const effectiveGrossMarginUsd = row.revenueUsd - effectiveCostUsd
      const effectiveGrossMarginPct = row.revenueUsd > 0 ? effectiveGrossMarginUsd / row.revenueUsd : 0
      return {
        ...row,
        effectiveCostUsd,
        grossMarginUsd,
        grossMarginPct,
        effectiveGrossMarginUsd,
        effectiveGrossMarginPct,
        marginRisk: riskFor(grossMarginPct, grossMarginUsd, thresholdPolicy),
      }
    })
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function heavyUserDetection(
  rows: UsageImportRow[],
  revenueByCustomer: Record<string, number> = {},
  options: MarginOptions = {},
): HeavyUserDetectionResult {
  const customers = customerProfitability(rows, revenueByCustomer, undefined, options)
  const totalCost = customers.reduce((sum, row) => sum + row.totalCostUsd, 0)
  const topCount = customers.length > 0 ? Math.max(1, Math.ceil(customers.length * 0.1)) : 0
  const topDecileCostUsd = customers.slice(0, topCount).reduce((sum, row) => sum + row.totalCostUsd, 0)

  return {
    topDecileShare: totalCost > 0 ? topDecileCostUsd / totalCost : 0,
    topDecileCostUsd,
    medianCustomerCostUsd: median(customers.map(row => row.totalCostUsd)),
    lossCustomers: customers.filter(row => row.marginRisk === 'loss'),
    customers,
  }
}
