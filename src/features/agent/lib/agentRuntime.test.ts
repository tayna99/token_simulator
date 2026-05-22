import { describe, expect, it } from 'vitest'
import { runAgent } from './agentRuntime'

describe('runAgent', () => {
  it('returns deterministic tool-grounded events when no BYO key is supplied', async () => {
    const events = await runAgent({
      apiKey: '',
      toolResults: {
        monthlyAiCogs: 4820,
        topFeature: 'report_generation',
        grossMarginPct: 0.41,
      },
      riskCardIds: ['risk-credit-confusion'],
    })

    expect(events.map(event => event.type)).toEqual(['tool_snapshot', 'analysis', 'pricing_strategy', 'risk_audit', 'report_draft'])
    expect(events[1].toolResultRefs).toEqual(['tool:monthlyAiCogs', 'tool:topFeature', 'tool:grossMarginPct', 'tool:riskCardIds'])
    expect(events[1].message).toContain('$4,820')
  })
})
