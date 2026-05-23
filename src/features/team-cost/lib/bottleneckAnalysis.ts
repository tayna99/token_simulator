import { normalizeFrequencyToMonthlyRuns, type AgentSpec, type Artifact, type Frequency, type HumanReviewGate } from './agentSpec'
import {
  DEFAULT_THRESHOLD_POLICY,
  createBasisRef,
  getThreshold,
  mergeThresholdPolicy,
  withThresholdValue,
  type BasisRef,
  type ThresholdDefinition,
  type ThresholdOverrides,
  type ThresholdPolicy,
} from '../../metrics/lib/thresholdPolicy'

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
  basisRef: BasisRef
  thresholdUsed: ThresholdDefinition
  observedValue: number
  confidence: ThresholdDefinition['confidence']
  qualityCaveat?: string
}

interface TeamEstimateLike {
  monthlyCostUsd: number
  topAgentId: string | null
  topAgentShare: number
}

type AgentLike = Pick<AgentSpec, 'id' | 'role' | 'retryRate' | 'callsPerRun' | 'humanReviewGate' | 'frequency'>
  & { inputs: Array<Pick<Artifact, 'estTokens' | 'reusedEachRun' | 'name'>>, outputs: Array<Pick<Artifact, 'estTokens' | 'name'>> }
  & { cacheHitRate?: number }

export interface BottleneckInput {
  monthlyBudgetUsd: number
  teamEstimate: TeamEstimateLike
  agents: AgentLike[]
}

export interface BottleneckOptions {
  thresholdPolicy?: ThresholdPolicy
  thresholds?: ThresholdOverrides
}

function severity(condition: boolean, highCondition: boolean): BottleneckSeverity {
  if (highCondition) return 'high'
  return condition ? 'medium' : 'low'
}

function finding(
  kind: BottleneckKind,
  agentId: string,
  severity: BottleneckSeverity,
  message: string,
  thresholdUsed: ThresholdDefinition,
  observedValue: number,
  qualityCaveat?: string,
): BottleneckFinding {
  const basisRef = createBasisRef(thresholdUsed, { observedValue })
  return {
    id: `${kind}-${agentId}`,
    kind,
    agentId,
    severity,
    message,
    basisRef,
    thresholdUsed,
    observedValue,
    confidence: thresholdUsed.confidence,
    qualityCaveat,
  }
}

export function detectBottlenecks(input: BottleneckInput, options: BottleneckOptions = {}): BottleneckFinding[] {
  const policy = mergeThresholdPolicy(options.thresholdPolicy ?? DEFAULT_THRESHOLD_POLICY, options.thresholds)
  const findings: BottleneckFinding[] = []
  if (input.monthlyBudgetUsd > 0 && input.teamEstimate.monthlyCostUsd > input.monthlyBudgetUsd) {
    findings.push(finding(
      'budget_overage',
      'team',
      'high',
      'Estimated AI team cost is above the monthly budget.',
      withThresholdValue(getThreshold(policy, 'monthly_budget_usd'), input.monthlyBudgetUsd),
      input.teamEstimate.monthlyCostUsd,
    ))
  }

  const concentrationThreshold = getThreshold(policy, 'top_agent_concentration_pct')
  const concentrationHighThreshold = getThreshold(policy, 'top_agent_concentration_high_pct')
  if (input.teamEstimate.topAgentId && input.teamEstimate.topAgentShare >= concentrationThreshold.currentValue) {
    findings.push(finding(
      'top_agent_concentration',
      input.teamEstimate.topAgentId,
      severity(input.teamEstimate.topAgentShare >= concentrationThreshold.currentValue, input.teamEstimate.topAgentShare >= concentrationHighThreshold.currentValue),
      'One agent concentrates a large share of monthly AI cost.',
      concentrationThreshold,
      input.teamEstimate.topAgentShare,
    ))
  }

  input.agents.forEach(agent => {
    const largeInputThreshold = getThreshold(policy, 'large_reused_input_tokens')
    const lowCacheThreshold = getThreshold(policy, 'cache_hit_low_pct')
    const cacheHitRate = Number.isFinite(agent.cacheHitRate) ? Number(agent.cacheHitRate) : 0
    if (agent.inputs.some(item => item.reusedEachRun && item.estTokens >= largeInputThreshold.currentValue) && cacheHitRate < lowCacheThreshold.currentValue) {
      findings.push(finding('cache_candidate', agent.id, 'high', `${agent.role} repeatedly loads large reusable context.`, lowCacheThreshold, cacheHitRate))
    }
    const loopThreshold = getThreshold(policy, 'agent_loop_depth_count')
    const highLoopThreshold = getThreshold(policy, 'agent_loop_depth_high_count')
    if (agent.callsPerRun >= loopThreshold.currentValue) {
      findings.push(finding('agent_loop_depth', agent.id, severity(agent.callsPerRun >= loopThreshold.currentValue, agent.callsPerRun >= highLoopThreshold.currentValue), `${agent.role} has deep loop depth.`, loopThreshold, agent.callsPerRun))
    }
    const retryThreshold = getThreshold(policy, 'retry_rate_pct')
    if (agent.retryRate >= retryThreshold.currentValue) {
      findings.push(finding('retry_rate', agent.id, severity(agent.retryRate >= retryThreshold.currentValue, agent.retryRate >= retryThreshold.currentValue * 2), `${agent.role} retry rate can inflate cost.`, retryThreshold, agent.retryRate))
    }
    const outputTokens = agent.outputs.reduce((sum, item) => sum + item.estTokens, 0)
    const inputTokens = agent.inputs.reduce((sum, item) => sum + item.estTokens, 0)
    const outputRatioThreshold = getThreshold(policy, 'output_heavy_input_ratio')
    const outputMinThreshold = getThreshold(policy, 'output_heavy_min_tokens')
    if (outputTokens > inputTokens * outputRatioThreshold.currentValue && outputTokens > outputMinThreshold.currentValue) {
      findings.push(finding('output_heavy', agent.id, 'medium', `${agent.role} produces large outputs.`, outputRatioThreshold, inputTokens > 0 ? outputTokens / inputTokens : outputTokens))
    }
    const reviewThreshold = getThreshold(policy, 'human_review_monthly_runs')
    const monthlyRuns = normalizeFrequencyToMonthlyRuns(agent.frequency as Frequency)
    if (agent.humanReviewGate === 'all' && monthlyRuns >= reviewThreshold.currentValue) {
      findings.push(finding('human_review_bottleneck', agent.id, 'medium', `${agent.role} sends frequent work through all-item review.`, reviewThreshold, monthlyRuns))
    }
    if (isScheduled(agent.frequency, agent.humanReviewGate)) {
      findings.push(finding('scheduled_workload', agent.id, 'medium', `${agent.role} is a candidate for scheduled batch work.`, reviewThreshold, monthlyRuns))
    }
  })

  return findings
}

function isScheduled(frequency: Frequency, reviewGate: HumanReviewGate): boolean {
  return reviewGate !== 'all' && (frequency.unit === 'week' || frequency.unit === 'month')
}
