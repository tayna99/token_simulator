import type { UsageImportRow } from '../../usage/lib/usageImport'

export type PricingPolicy = 'flat' | 'usage' | 'credit' | 'hybrid' | 'cap' | 'overage'

export interface PricingScenarioInput {
  policy: PricingPolicy
  currentRevenueByCustomer?: Record<string, number>
  baseSubscriptionUsd?: number
  usagePricePerRequest?: number
  creditPriceUsd?: number
  includedRequests?: number
  overagePricePerRequest?: number
  capCostUsdPerCustomer?: number
}

export interface ScenarioResult {
  policy: PricingPolicy
  monthlyAiCogs: number
  revenueUsd: number
  grossMarginUsd: number
  grossMarginPct: number
  lossCustomerCount: number
  recommendationBasis: string[]
}

interface CustomerUsage {
  customerId: string
  requestCount: number
  totalCostUsd: number
}

function finiteNonNegative(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0
}

function customersFrom(rows: UsageImportRow[]): CustomerUsage[] {
  const grouped = rows.reduce<Map<string, CustomerUsage>>((map, row) => {
    const customerId = row.customerId ?? 'unknown'
    const existing = map.get(customerId) ?? { customerId, requestCount: 0, totalCostUsd: 0 }
    existing.requestCount += 1
    existing.totalCostUsd += finiteNonNegative(row.totalCostUsd)
    map.set(customerId, existing)
    return map
  }, new Map())
  return [...grouped.values()]
}

function revenueForCustomer(customer: CustomerUsage, input: PricingScenarioInput): number {
  const current = input.currentRevenueByCustomer?.[customer.customerId]
  if (input.policy === 'flat') return finiteNonNegative(current)
  if (input.policy === 'usage') return customer.requestCount * finiteNonNegative(input.usagePricePerRequest)
  if (input.policy === 'credit') {
    const base = finiteNonNegative(input.baseSubscriptionUsd)
    const included = finiteNonNegative(input.includedRequests)
    const overage = Math.max(0, customer.requestCount - included) * finiteNonNegative(input.overagePricePerRequest)
    return base + overage
  }
  if (input.policy === 'hybrid') {
    return finiteNonNegative(input.baseSubscriptionUsd)
      + customer.requestCount * finiteNonNegative(input.usagePricePerRequest)
  }
  if (input.policy === 'overage') {
    const base = finiteNonNegative(current)
    const included = finiteNonNegative(input.includedRequests)
    return base + Math.max(0, customer.requestCount - included) * finiteNonNegative(input.overagePricePerRequest)
  }
  return finiteNonNegative(current)
}

function costForCustomer(customer: CustomerUsage, input: PricingScenarioInput): number {
  if (input.policy !== 'cap') return customer.totalCostUsd
  const cap = finiteNonNegative(input.capCostUsdPerCustomer)
  return cap > 0 ? Math.min(customer.totalCostUsd, cap) : customer.totalCostUsd
}

export function calculatePricingScenario(rows: UsageImportRow[], input: PricingScenarioInput): ScenarioResult {
  const customers = customersFrom(rows)
  const revenueUsd = customers.reduce((sum, customer) => sum + revenueForCustomer(customer, input), 0)
  const monthlyAiCogs = customers.reduce((sum, customer) => sum + costForCustomer(customer, input), 0)
  const grossMarginUsd = revenueUsd - monthlyAiCogs
  const grossMarginPct = revenueUsd > 0 ? grossMarginUsd / revenueUsd : 0
  const lossCustomerCount = customers.filter(customer => revenueForCustomer(customer, input) - costForCustomer(customer, input) < 0).length

  return {
    policy: input.policy,
    monthlyAiCogs,
    revenueUsd,
    grossMarginUsd,
    grossMarginPct,
    lossCustomerCount,
    recommendationBasis: [
      input.policy,
      `${input.policy} policy`,
      `${customers.length} customers`,
      `${lossCustomerCount} loss customers`,
    ],
  }
}
