import { describe, expect, it } from 'vitest'
import { attributeDeliverableCosts, DEFAULT_AI_TEAM_DELIVERABLES, type Deliverable } from './deliverables'
import type { AgentCostEstimate } from './estimateAgentWorkload'

describe('deliverables', () => {
  it('ships deterministic sample deliverables for the AI team operations report', () => {
    expect(DEFAULT_AI_TEAM_DELIVERABLES.map(item => item.type)).toEqual([
      'Research report',
      'Customer support classification',
      'Sales email draft',
      'Contract risk flag',
    ])
  })

  it('attributes agent monthly cost and calls to deliverables by count share', () => {
    const deliverables: Deliverable[] = [
      {
        id: 'd1',
        agentId: 'agent-sales',
        agentRole: 'Sales Agent',
        type: 'Sales email draft',
        count: 30,
        period: '2026-05',
        status: 'passed_review',
        callsConsumed: 0,
        costAttributedUsd: 0,
      },
      {
        id: 'd2',
        agentId: 'agent-sales',
        agentRole: 'Sales Agent',
        type: 'Objection response',
        count: 10,
        period: '2026-05',
        status: 'reworked',
        callsConsumed: 0,
        costAttributedUsd: 0,
      },
    ]
    const estimates: AgentCostEstimate[] = [
      {
        agentId: 'agent-sales',
        role: 'Sales Agent',
        modelId: 'm',
        monthlyInputTokens: 0,
        monthlyOutputTokens: 0,
        monthlyRequests: 80,
        cacheSavingsUsd: 0,
        batchSavingsUsd: 0,
        cost: { monthlyCost: 8 },
      },
    ]

    const result = attributeDeliverableCosts(deliverables, estimates)

    expect(result[0].callsConsumed).toBe(60)
    expect(result[0].costAttributedUsd).toBe(6)
    expect(result[1].callsConsumed).toBe(20)
    expect(result[1].costAttributedUsd).toBe(2)
  })
})
