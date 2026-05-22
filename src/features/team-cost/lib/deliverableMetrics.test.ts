import { describe, expect, it } from 'vitest'
import { summarizeDeliverablePerformance } from './deliverableMetrics'
import type { Deliverable } from './deliverables'

describe('deliverableMetrics', () => {
  it('calculates deterministic performance rates from deliverables', () => {
    const deliverables: Deliverable[] = [
      { id: 'passed', agentId: 'a', agentRole: 'A', type: 'Draft', count: 80, period: '2026-05', status: 'passed_review', callsConsumed: 100, costAttributedUsd: 8 },
      { id: 'reworked', agentId: 'a', agentRole: 'A', type: 'Draft', count: 15, period: '2026-05', status: 'reworked', callsConsumed: 20, costAttributedUsd: 1.5 },
      { id: 'escalated', agentId: 'a', agentRole: 'A', type: 'Draft', count: 5, period: '2026-05', status: 'escalated', callsConsumed: 10, costAttributedUsd: 0.5 },
    ]

    const summary = summarizeDeliverablePerformance(deliverables)

    expect(summary.throughput).toBe(100)
    expect(summary.totalCostUsd).toBe(10)
    expect(summary.costPerDeliverableUsd).toBe(0.1)
    expect(summary.passRate).toBe(0.8)
    expect(summary.reworkRate).toBe(0.15)
    expect(summary.escalationRate).toBe(0.05)
    expect(summary.automationRate).toBe(0.95)
  })

  it('returns zero metrics without dividing by zero', () => {
    const summary = summarizeDeliverablePerformance([])

    expect(summary.throughput).toBe(0)
    expect(summary.costPerDeliverableUsd).toBe(0)
    expect(summary.passRate).toBe(0)
    expect(summary.automationRate).toBe(0)
  })
})
