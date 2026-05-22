import { describe, expect, it } from 'vitest'
import { detectBottlenecks } from './bottleneckAnalysis'

describe('detectBottlenecks', () => {
  it('flags top agent concentration, reused large input, retry, and budget overage', () => {
    const findings = detectBottlenecks({
      monthlyBudgetUsd: 300,
      teamEstimate: { monthlyCostUsd: 610, topAgentId: 'engineering', topAgentShare: 0.48 },
      agents: [
        {
          id: 'engineering',
          role: 'Engineering Agent',
          retryRate: 0.2,
          callsPerRun: 5,
          humanReviewGate: 'sample',
          frequency: { unit: 'week', count: 10 },
          inputs: [{ estTokens: 12000, reusedEachRun: true, name: 'codebase context' }],
          outputs: [{ estTokens: 3000, name: 'implementation plan' }],
        },
      ],
    })

    expect(findings.map(finding => finding.kind)).toEqual(expect.arrayContaining([
      'budget_overage',
      'top_agent_concentration',
      'cache_candidate',
      'agent_loop_depth',
    ]))
  })
})
