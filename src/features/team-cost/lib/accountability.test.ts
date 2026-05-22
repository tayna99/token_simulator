import { describe, expect, it } from 'vitest'
import { createDefaultAgentAccountability, updateAgentAccountability } from './accountability'

describe('accountability', () => {
  const agents = [
    { id: 'agent-finance-legal', role: 'Finance/Legal Review Agent' },
    { id: 'agent-cs', role: 'CS Agent' },
    { id: 'agent-research', role: 'Research Agent' },
  ]

  it('defaults finance/legal to suggest and CS/Ops to act with review', () => {
    const result = createDefaultAgentAccountability(agents)

    expect(result.find(item => item.agentId === 'agent-finance-legal')?.authorityLevel).toBe('suggest')
    expect(result.find(item => item.agentId === 'agent-finance-legal')?.highRiskTasks).toContain('contract approval')
    expect(result.find(item => item.agentId === 'agent-cs')?.authorityLevel).toBe('act_with_review')
    expect(result.find(item => item.agentId === 'agent-research')?.owner).toBe('Founder')
  })

  it('updates one accountability record without replacing the rest', () => {
    const result = updateAgentAccountability(
      createDefaultAgentAccountability(agents),
      'agent-research',
      { owner: 'CEO', escalationTo: 'COO', authorityLevel: 'act_autonomously' },
    )

    expect(result.find(item => item.agentId === 'agent-research')?.owner).toBe('CEO')
    expect(result.find(item => item.agentId === 'agent-research')?.escalationTo).toBe('COO')
    expect(result.find(item => item.agentId === 'agent-finance-legal')?.owner).toBe('Founder')
  })
})
