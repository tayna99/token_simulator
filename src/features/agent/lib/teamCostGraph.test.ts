import { describe, expect, it } from 'vitest'
import { createTeamCostGraph } from './teamCostGraph'

describe('createTeamCostGraph', () => {
  it('runs deterministic snapshot before analysis and risk audit', async () => {
    const graph = createTeamCostGraph()
    const result = await graph.invoke({
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
      estimates: [],
      teamEstimate: null,
      toolRefs: [],
      toolValues: {},
      bottlenecks: [],
      benchmarks: [],
      candidates: [],
      recommendations: [],
      riskCardsByRecommendation: {},
      approval: { status: 'not_required', recommendationId: null },
      decisionDraft: null,
      events: [],
    })

    expect(result.events[0].type).toBe('tool_snapshot')
    expect(result.events.map(event => event.type)).toContain('cost_analysis')
    expect(result.events.map(event => event.type)).toContain('risk_audit')
  })

  it('audits each optimization recommendation through dynamic fanout', async () => {
    const graph = createTeamCostGraph()
    const result = await graph.invoke({
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 30, locale: 'ko' },
      agentSpecs: [],
      estimates: [],
      teamEstimate: null,
      toolRefs: [],
      toolValues: {},
      bottlenecks: [],
      benchmarks: [],
      candidates: [],
      recommendations: [],
      riskCardsByRecommendation: {},
      approval: { status: 'not_required', recommendationId: null },
      decisionDraft: null,
      events: [],
    })

    const riskAuditEvents = result.events.filter(event => event.type === 'risk_audit')
    expect(result.recommendations.length).toBeGreaterThan(1)
    expect(riskAuditEvents).toHaveLength(result.recommendations.length)
    expect(Object.keys(result.riskCardsByRecommendation)).toEqual(
      expect.arrayContaining(result.recommendations.map(recommendation => recommendation.id)),
    )
  })
})
