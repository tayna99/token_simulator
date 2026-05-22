export type AuthorityLevel = 'suggest' | 'act_with_review' | 'act_autonomously'

export interface AgentAccountability {
  agentId: string
  agentRole: string
  owner: string
  authorityLevel: AuthorityLevel
  escalationTo: string
  highRiskTasks: string[]
}

interface AgentIdentity {
  id: string
  role: string
}

function defaultAuthorityFor(role: string): AuthorityLevel {
  const normalized = role.toLowerCase()
  if (normalized.includes('finance') || normalized.includes('legal')) return 'suggest'
  if (normalized.includes('cs') || normalized.includes('ops')) return 'act_with_review'
  return 'suggest'
}

function defaultHighRiskTasks(role: string): string[] {
  const normalized = role.toLowerCase()
  if (normalized.includes('finance') || normalized.includes('legal')) {
    return ['contract approval', 'external legal advice']
  }
  if (normalized.includes('cs')) {
    return ['refund over policy', 'legal or medical support reply']
  }
  return []
}

export function createDefaultAgentAccountability(agents: AgentIdentity[]): AgentAccountability[] {
  return agents.map(agent => ({
    agentId: agent.id,
    agentRole: agent.role,
    owner: 'Founder',
    authorityLevel: defaultAuthorityFor(agent.role),
    escalationTo: 'Founder',
    highRiskTasks: defaultHighRiskTasks(agent.role),
  }))
}

export function updateAgentAccountability(
  accountability: AgentAccountability[],
  agentId: string,
  patch: Partial<Omit<AgentAccountability, 'agentId' | 'agentRole'>>,
): AgentAccountability[] {
  return accountability.map(item => (
    item.agentId === agentId
      ? {
          ...item,
          ...patch,
          highRiskTasks: patch.highRiskTasks ? [...patch.highRiskTasks] : item.highRiskTasks,
        }
      : item
  ))
}
