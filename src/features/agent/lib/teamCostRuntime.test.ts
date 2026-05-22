import { describe, expect, it } from 'vitest'
import { runTeamCostAgent } from './teamCostRuntime'

describe('runTeamCostAgent', () => {
  it('returns graph events grounded in tool refs', async () => {
    const events = await runTeamCostAgent({
      apiKey: '',
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    })

    expect(events[0].type).toBe('tool_snapshot')
    expect(events.every(event => Array.isArray(event.toolResultRefs))).toBe(true)
  })
})
