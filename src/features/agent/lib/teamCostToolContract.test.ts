import { describe, expect, it } from 'vitest'
import { buildTeamCostToolSnapshot } from './teamCostToolContract'

describe('buildTeamCostToolSnapshot', () => {
  it('creates stable refs and drops non-finite values', () => {
    const snapshot = buildTeamCostToolSnapshot({
      team: {
        monthlyCostUsd: 610,
        monthlyInputTokens: 1000000,
        monthlyOutputTokens: Number.NaN,
        monthlyRequests: 300,
        topAgentId: 'engineering',
        topAgentShare: 0.48,
      },
      agents: [
        { agentId: 'engineering', monthlyCostUsd: 292.8, monthlyInputTokens: 600000, monthlyOutputTokens: 240000, costShare: 0.48 },
      ],
    })

    expect(snapshot.refs).toContain('tool:team.monthlyCostUsd')
    expect(snapshot.refs).toContain('tool:agent.engineering.monthlyCostUsd')
    expect(snapshot.refs).not.toContain('tool:team.monthlyOutputTokens')
  })

  it('includes true before and after optimization refs', () => {
    const snapshot = buildTeamCostToolSnapshot({
      optimizations: [
        {
          id: 'rec-cache',
          beforeMonthlyCostUsd: 100,
          afterMonthlyCostUsd: 75,
          monthlySavingsUsd: 25,
          costAfterUsd: 75,
          affectedAgentIds: ['agent-engineering'],
        },
      ],
    })

    expect(snapshot.values['tool:optimization.rec-cache.beforeMonthlyCostUsd']).toBe(100)
    expect(snapshot.values['tool:optimization.rec-cache.afterMonthlyCostUsd']).toBe(75)
    expect(snapshot.values['tool:optimization.rec-cache.monthlySavingsUsd']).toBe(25)
    expect(snapshot.values['tool:optimization.rec-cache.affectedAgentIds']).toEqual(['agent-engineering'])
  })
})
