import { describe, expect, it } from 'vitest'
import { AI_TEAM_AGENT_CATALOG } from './agentCatalog'
import { proposeOptimizationCandidates, recommendationFromCandidate } from './optimizationPolicies'

describe('proposeOptimizationCandidates', () => {
  it('proposes cache, routing, output cap, loop guard, batch, and review gate candidates from findings', () => {
    const candidates = proposeOptimizationCandidates({
      findings: [
        { id: 'finding-cache', kind: 'cache_candidate', agentId: 'engineering', severity: 'high', message: 'cache this input' },
        { id: 'finding-loop', kind: 'agent_loop_depth', agentId: 'engineering', severity: 'high', message: 'reduce loop depth' },
        { id: 'finding-scheduled', kind: 'scheduled_workload', agentId: 'reporting', severity: 'medium', message: 'batch scheduled work' },
      ],
    })

    expect(candidates.map(candidate => candidate.policy)).toEqual(expect.arrayContaining([
      'cache_reused_input',
      'reduce_calls_per_run',
      'batch_scheduled_work',
    ]))
  })

  it('computes true before and after cost for every optimization policy', () => {
    const candidates = proposeOptimizationCandidates({
      findings: [
        { id: 'finding-cache', kind: 'cache_candidate', agentId: 'agent-engineering', severity: 'high', message: 'cache this input' },
        { id: 'finding-route', kind: 'top_agent_concentration', agentId: 'agent-engineering', severity: 'high', message: 'route lower risk work' },
        { id: 'finding-output', kind: 'output_heavy', agentId: 'agent-research', severity: 'medium', message: 'cap long output' },
        { id: 'finding-loop', kind: 'agent_loop_depth', agentId: 'agent-engineering', severity: 'high', message: 'reduce loop depth' },
        { id: 'finding-batch', kind: 'scheduled_workload', agentId: 'agent-marketing', severity: 'medium', message: 'batch scheduled work' },
        { id: 'finding-review', kind: 'human_review_bottleneck', agentId: 'agent-finance-legal', severity: 'medium', message: 'adjust review gate' },
      ],
    })

    const recommendations = candidates.map(candidate => recommendationFromCandidate(candidate, {
      agents: AI_TEAM_AGENT_CATALOG,
    }))

    expect(recommendations.map(recommendation => recommendation.policy)).toEqual(expect.arrayContaining([
      'cache_reused_input',
      'route_low_risk_to_cheaper_model',
      'cap_output_tokens',
      'reduce_calls_per_run',
      'batch_scheduled_work',
      'adjust_human_review_gate',
    ]))
    recommendations.forEach(recommendation => {
      expect(recommendation.before.monthlyCostUsd).toBeGreaterThan(0)
      expect(recommendation.after.monthlyCostUsd).toBeGreaterThanOrEqual(0)
      expect(recommendation.delta.affectedAgentIds).toContain(recommendation.agentId)
      expect(recommendation.delta.changedFields.length).toBeGreaterThan(0)
      expect(recommendation.toolResultRefs).toEqual(expect.arrayContaining([
        `tool:optimization.${recommendation.id}.beforeMonthlyCostUsd`,
        `tool:optimization.${recommendation.id}.afterMonthlyCostUsd`,
        `tool:optimization.${recommendation.id}.monthlySavingsUsd`,
        `tool:optimization.${recommendation.id}.affectedAgentIds`,
      ]))
    })
    expect(recommendations.find(item => item.policy === 'reduce_calls_per_run')?.monthlySavingsUsd).toBeGreaterThan(0)
    expect(recommendations.find(item => item.policy === 'adjust_human_review_gate')?.monthlySavingsUsd).toBe(0)
  })

  it('marks model routing as a risk-gated what-if instead of definitive waste', () => {
    const [candidate] = proposeOptimizationCandidates({
      findings: [
        { id: 'finding-route', kind: 'top_agent_concentration', agentId: 'agent-engineering', severity: 'high', message: 'route lower risk work' },
      ],
    })
    const recommendation = recommendationFromCandidate(candidate, {
      agents: AI_TEAM_AGENT_CATALOG,
    })

    expect(recommendation.policy).toBe('route_low_risk_to_cheaper_model')
    expect(recommendation.decisionMode).toBe('what_if')
    expect(recommendation.qualityCaveat).toContain('accuracy impact requires validation')
    expect(recommendation.isDefinitiveWaste).toBe(false)
  })

  it('keeps cheaper-model routing validation-gated when matrix evidence is not verified', () => {
    const [candidate] = proposeOptimizationCandidates({
      findings: [
        { id: 'finding-route', kind: 'top_agent_concentration', agentId: 'agent-engineering', severity: 'high', message: 'route lower risk work' },
      ],
    })

    const recommendation = recommendationFromCandidate(candidate, {
      agents: AI_TEAM_AGENT_CATALOG,
      modelPerformanceMatrix: [{
        taskType: 'classification',
        modelId: 'gpt-5.4-nano',
        decisionAuthority: 'validation_required',
        evidenceStatus: 'needs_review',
        evidenceRefs: ['evidence:artificial-analysis-models'],
      }],
    })

    expect(recommendation.decisionMode).toBe('what_if')
    expect(recommendation.requiredValidation).toEqual(expect.arrayContaining([
      expect.stringMatching(/model performance matrix/i),
    ]))
    expect(recommendation.toolResultRefs).toEqual(expect.arrayContaining([
      expect.stringMatching(/^tool:optimization\..*\.affectedAgentIds$/),
    ]))
  })

  it('does not present routing as allowed when matrix evidence is baseline unavailable', () => {
    const [candidate] = proposeOptimizationCandidates({
      findings: [
        { id: 'finding-route', kind: 'top_agent_concentration', agentId: 'agent-engineering', severity: 'high', message: 'route lower risk work' },
      ],
    })

    const recommendation = recommendationFromCandidate(candidate, {
      agents: AI_TEAM_AGENT_CATALOG,
      modelPerformanceMatrix: [],
    })

    expect(recommendation.decisionMode).toBe('what_if')
    expect(recommendation.isDefinitiveWaste).toBe(false)
    expect(recommendation.qualityCaveat).toMatch(/baseline|validation|matrix/i)
  })
})
