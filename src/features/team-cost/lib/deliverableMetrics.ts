import type { Deliverable, DeliverableStatus } from './deliverables'

export interface DeliverablePerformanceSummary {
  throughput: number
  totalCostUsd: number
  costPerDeliverableUsd: number
  passRate: number
  reworkRate: number
  escalationRate: number
  automationRate: number
}

function stableRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0
  return Number((numerator / denominator).toFixed(10))
}

function sumByStatus(deliverables: Deliverable[], status: DeliverableStatus): number {
  return deliverables
    .filter(deliverable => deliverable.status === status)
    .reduce((sum, deliverable) => sum + Math.max(0, deliverable.count), 0)
}

export function summarizeDeliverablePerformance(deliverables: Deliverable[]): DeliverablePerformanceSummary {
  const throughput = deliverables.reduce((sum, deliverable) => sum + Math.max(0, deliverable.count), 0)
  const totalCostUsd = deliverables.reduce((sum, deliverable) => sum + Math.max(0, deliverable.costAttributedUsd), 0)
  const passed = sumByStatus(deliverables, 'passed_review')
  const reworked = sumByStatus(deliverables, 'reworked')
  const escalated = sumByStatus(deliverables, 'escalated')

  return {
    throughput,
    totalCostUsd,
    costPerDeliverableUsd: stableRatio(totalCostUsd, throughput),
    passRate: stableRatio(passed, throughput),
    reworkRate: stableRatio(reworked, throughput),
    escalationRate: stableRatio(escalated, throughput),
    automationRate: stableRatio(Math.max(0, throughput - escalated), throughput),
  }
}
