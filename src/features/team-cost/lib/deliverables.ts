import type { AgentCostEstimate } from './estimateAgentWorkload'

export type DeliverableStatus =
  | 'produced'
  | 'passed_review'
  | 'reworked'
  | 'escalated'
  | 'rejected'

export interface Deliverable {
  id: string
  agentId: string
  agentRole: string
  type: string
  count: number
  period: string
  status: DeliverableStatus
  callsConsumed: number
  costAttributedUsd: number
  operatingDecisionRef?: string
}

export const DEFAULT_AI_TEAM_DELIVERABLES: Deliverable[] = [
  {
    id: 'deliverable-research-report',
    agentId: 'agent-research',
    agentRole: 'Research Agent',
    type: 'Research report',
    count: 4,
    period: '2026-05',
    status: 'passed_review',
    callsConsumed: 0,
    costAttributedUsd: 0,
  },
  {
    id: 'deliverable-cs-classification',
    agentId: 'agent-cs',
    agentRole: 'CS Agent',
    type: 'Customer support classification',
    count: 360,
    period: '2026-05',
    status: 'passed_review',
    callsConsumed: 0,
    costAttributedUsd: 0,
  },
  {
    id: 'deliverable-sales-email',
    agentId: 'agent-sales',
    agentRole: 'Sales Agent',
    type: 'Sales email draft',
    count: 120,
    period: '2026-05',
    status: 'produced',
    callsConsumed: 0,
    costAttributedUsd: 0,
  },
  {
    id: 'deliverable-contract-risk',
    agentId: 'agent-finance-legal',
    agentRole: 'Finance/Legal Review Agent',
    type: 'Contract risk flag',
    count: 3,
    period: '2026-05',
    status: 'escalated',
    callsConsumed: 0,
    costAttributedUsd: 0,
  },
]

function safeNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function stableNumber(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(10)) : 0
}

export function attributeDeliverableCosts(
  deliverables: Deliverable[],
  estimates: AgentCostEstimate[],
): Deliverable[] {
  const estimatesByAgent = new Map(estimates.map(estimate => [estimate.agentId, estimate]))
  const countByAgent = deliverables.reduce<Record<string, number>>((acc, deliverable) => {
    acc[deliverable.agentId] = (acc[deliverable.agentId] ?? 0) + safeNumber(deliverable.count)
    return acc
  }, {})

  return deliverables.map(deliverable => {
    const count = safeNumber(deliverable.count)
    const estimate = estimatesByAgent.get(deliverable.agentId)
    const totalCount = countByAgent[deliverable.agentId] ?? 0
    const share = totalCount > 0 ? count / totalCount : 0

    return {
      ...deliverable,
      count,
      callsConsumed: stableNumber((estimate?.monthlyRequests ?? 0) * share),
      costAttributedUsd: stableNumber((estimate?.cost.monthlyCost ?? 0) * share),
    }
  })
}
