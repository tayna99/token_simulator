import { normalizeFrequencyToMonthlyRuns, type AgentSpec, type Artifact, type Frequency, type HumanReviewGate } from './agentSpec'

export type BottleneckKind =
  | 'budget_overage'
  | 'top_agent_concentration'
  | 'cache_candidate'
  | 'agent_loop_depth'
  | 'retry_rate'
  | 'output_heavy'
  | 'human_review_bottleneck'
  | 'scheduled_workload'

export type BottleneckSeverity = 'low' | 'medium' | 'high'

export interface BottleneckFinding {
  id: string
  kind: BottleneckKind
  agentId: string
  severity: BottleneckSeverity
  message: string
}

interface TeamEstimateLike {
  monthlyCostUsd: number
  topAgentId: string | null
  topAgentShare: number
}

type AgentLike = Pick<AgentSpec, 'id' | 'role' | 'retryRate' | 'callsPerRun' | 'humanReviewGate' | 'frequency'>
  & { inputs: Array<Pick<Artifact, 'estTokens' | 'reusedEachRun' | 'name'>>, outputs: Array<Pick<Artifact, 'estTokens' | 'name'>> }

export interface BottleneckInput {
  monthlyBudgetUsd: number
  teamEstimate: TeamEstimateLike
  agents: AgentLike[]
}

function severity(condition: boolean, highCondition: boolean): BottleneckSeverity {
  if (highCondition) return 'high'
  return condition ? 'medium' : 'low'
}

function finding(kind: BottleneckKind, agentId: string, severity: BottleneckSeverity, message: string): BottleneckFinding {
  return { id: `${kind}-${agentId}`, kind, agentId, severity, message }
}

export function detectBottlenecks(input: BottleneckInput): BottleneckFinding[] {
  const findings: BottleneckFinding[] = []
  if (input.monthlyBudgetUsd > 0 && input.teamEstimate.monthlyCostUsd > input.monthlyBudgetUsd) {
    findings.push(finding('budget_overage', 'team', 'high', 'Estimated AI team cost is above the monthly budget.'))
  }

  if (input.teamEstimate.topAgentId && input.teamEstimate.topAgentShare >= 0.35) {
    findings.push(finding(
      'top_agent_concentration',
      input.teamEstimate.topAgentId,
      severity(input.teamEstimate.topAgentShare >= 0.35, input.teamEstimate.topAgentShare >= 0.45),
      'One agent concentrates a large share of monthly AI cost.',
    ))
  }

  input.agents.forEach(agent => {
    if (agent.inputs.some(item => item.reusedEachRun && item.estTokens >= 5000)) {
      findings.push(finding('cache_candidate', agent.id, 'high', `${agent.role} repeatedly loads large reusable context.`))
    }
    if (agent.callsPerRun >= 4) {
      findings.push(finding('agent_loop_depth', agent.id, severity(agent.callsPerRun >= 4, agent.callsPerRun >= 5), `${agent.role} has deep loop depth.`))
    }
    if (agent.retryRate >= 0.1) {
      findings.push(finding('retry_rate', agent.id, severity(agent.retryRate >= 0.1, agent.retryRate >= 0.2), `${agent.role} retry rate can inflate cost.`))
    }
    const outputTokens = agent.outputs.reduce((sum, item) => sum + item.estTokens, 0)
    const inputTokens = agent.inputs.reduce((sum, item) => sum + item.estTokens, 0)
    if (outputTokens > inputTokens * 0.8 && outputTokens > 2000) {
      findings.push(finding('output_heavy', agent.id, 'medium', `${agent.role} produces large outputs.`))
    }
    if (agent.humanReviewGate === 'all' && normalizeFrequencyToMonthlyRuns(agent.frequency as Frequency) >= 20) {
      findings.push(finding('human_review_bottleneck', agent.id, 'medium', `${agent.role} sends frequent work through all-item review.`))
    }
    if (isScheduled(agent.frequency, agent.humanReviewGate)) {
      findings.push(finding('scheduled_workload', agent.id, 'medium', `${agent.role} is a candidate for scheduled batch work.`))
    }
  })

  return findings
}

function isScheduled(frequency: Frequency, reviewGate: HumanReviewGate): boolean {
  return reviewGate !== 'all' && (frequency.unit === 'week' || frequency.unit === 'month')
}
