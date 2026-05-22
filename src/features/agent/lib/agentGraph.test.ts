import { describe, expect, it } from 'vitest'
import { createAgentGraph } from './agentGraph'

describe('createAgentGraph', () => {
  it('runs the P0 LangGraph nodes in PRD order', async () => {
    const graph = createAgentGraph()
    const result = await graph.invoke({
      events: [],
      toolRefs: ['tool:monthlyAiCogs', 'tool:grossMarginPct'],
      toolValues: {
        'tool:monthlyAiCogs': 4820,
        'tool:grossMarginPct': 0.68,
      },
      riskCardIds: ['risk-credit-confusion'],
    })

    expect(result.events.map(event => event.type)).toEqual([
      'tool_snapshot',
      'analysis',
      'pricing_strategy',
      'risk_audit',
      'report_draft',
    ])
    expect(result.events[0].toolResultRefs).toEqual(['tool:monthlyAiCogs', 'tool:grossMarginPct'])
  })
})
