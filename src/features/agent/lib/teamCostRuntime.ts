import type { AgentSpec } from '../../team-cost/lib/agentSpec'
import type { TeamCostGraphEvent, TeamCostGraphState, TeamCostWorkflowMode } from '../../team-cost/lib/teamCostState'
import { createTeamCostGraph } from './teamCostGraph'

export interface TeamCostRuntimeInput {
  apiKey: string
  workflowMode: TeamCostWorkflowMode
  companyProfile: TeamCostGraphState['companyProfile']
  agentSpecs: AgentSpec[]
  approvalMode?: 'event' | 'interrupt'
  threadId?: string
  workspaceId?: string
  resumeApproval?: {
    recommendationId: string
    approved: boolean
    reason?: string
  }
}

export async function runTeamCostAgent(input: TeamCostRuntimeInput): Promise<TeamCostGraphEvent[]> {
  const graph = createTeamCostGraph({ approvalMode: input.approvalMode ?? 'event' })
  const result = await graph.invoke({
    workflowMode: input.workflowMode,
    companyProfile: input.companyProfile,
    agentSpecs: input.agentSpecs,
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
  return result.events
}
