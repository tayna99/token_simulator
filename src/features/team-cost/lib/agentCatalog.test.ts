import { describe, expect, it } from 'vitest'
import { AI_TEAM_AGENT_CATALOG } from './agentCatalog'

describe('AI_TEAM_AGENT_CATALOG', () => {
  it('ships the PRD MVP nine agents with default I/O', () => {
    expect(AI_TEAM_AGENT_CATALOG.map(agent => agent.role)).toEqual([
      'Research Agent',
      'PM Agent',
      'Design Agent',
      'Engineering Agent',
      'Marketing Agent',
      'Sales Agent',
      'CS Agent',
      'Ops Agent',
      'Finance/Legal Review Agent',
    ])
    expect(AI_TEAM_AGENT_CATALOG.every(agent => agent.inputs.length > 0 && agent.outputs.length > 0)).toBe(true)
  })

  it('marks codebase and knowledge base inputs as cache candidates', () => {
    const engineering = AI_TEAM_AGENT_CATALOG.find(agent => agent.role === 'Engineering Agent')
    const cs = AI_TEAM_AGENT_CATALOG.find(agent => agent.role === 'CS Agent')
    expect(engineering?.inputs.some(input => input.reusedEachRun)).toBe(true)
    expect(cs?.inputs.some(input => input.reusedEachRun)).toBe(true)
  })
})
