import type { BottleneckFinding } from './bottleneckAnalysis'
import type { ToolResultRef } from '../../agent/lib/toolContract'
import { MODELS, getModelById, type Model } from '../../alternatives/data/models'
import { sanitizeAgentSpec, sumArtifactTokens, type AgentSpec } from './agentSpec'
import { estimateAgentWorkload, summarizeTeamCost } from './estimateAgentWorkload'

type OptimizationSourceFinding = Pick<BottleneckFinding, 'id' | 'kind' | 'agentId' | 'severity' | 'message'>

export type OptimizationPolicy =
  | 'cache_reused_input'
  | 'route_low_risk_to_cheaper_model'
  | 'cap_output_tokens'
  | 'reduce_calls_per_run'
  | 'batch_scheduled_work'
  | 'adjust_human_review_gate'

export interface OptimizationCandidate {
  id: string
  policy: OptimizationPolicy
  agentId: string
  sourceFindingIds: string[]
  title: string
  rationale: string
  riskTags: string[]
}

export interface OptimizationRecommendation extends OptimizationCandidate {
  before: OptimizationPolicyState
  after: OptimizationPolicyState
  delta: OptimizationPolicyDelta
  monthlySavingsUsd: number
  costAfterUsd: number
  toolResultRefs: ToolResultRef[]
  decisionMode: 'deterministic' | 'what_if'
  qualityCaveat: string | null
  isDefinitiveWaste: boolean
  requiredValidation: string[]
}

export interface OptimizationInput {
  findings: OptimizationSourceFinding[]
}

export interface OptimizationPolicyState {
  monthlyCostUsd: number
  agentCostUsd: number
  modelId: string
}

export interface OptimizationPolicyDelta {
  monthlySavingsUsd: number
  percentChange: number
  affectedAgentIds: string[]
  changedFields: string[]
}

export interface OptimizationModelPerformanceMatrixRow {
  taskType: string
  modelId: string
  decisionAuthority: 'routing_allowed' | 'validation_required' | 'review_only'
  evidenceStatus: string
  evidenceRefs: string[]
}

export interface OptimizationRecommendationInput {
  agents: AgentSpec[]
  models?: Model[]
  modelPerformanceMatrix?: OptimizationModelPerformanceMatrixRow[]
}

const POLICY_BY_FINDING: Partial<Record<BottleneckFinding['kind'], OptimizationPolicy[]>> = {
  cache_candidate: ['cache_reused_input'],
  agent_loop_depth: ['reduce_calls_per_run'],
  retry_rate: ['reduce_calls_per_run'],
  output_heavy: ['cap_output_tokens'],
  human_review_bottleneck: ['adjust_human_review_gate'],
  scheduled_workload: ['batch_scheduled_work'],
  top_agent_concentration: ['route_low_risk_to_cheaper_model'],
}

const RISK_TAGS: Record<OptimizationPolicy, string[]> = {
  cache_reused_input: ['cache', 'optimization'],
  route_low_risk_to_cheaper_model: ['model-switch', 'routing', 'optimization'],
  cap_output_tokens: ['output-cap', 'cap', 'optimization'],
  reduce_calls_per_run: ['agent-loop', 'workflow'],
  batch_scheduled_work: ['workflow'],
  adjust_human_review_gate: ['human-review', 'approval'],
}

export function proposeOptimizationCandidates(input: OptimizationInput): OptimizationCandidate[] {
  const byKey = new Map<string, OptimizationCandidate>()
  input.findings.forEach(finding => {
    const policies = POLICY_BY_FINDING[finding.kind] ?? []
    policies.forEach(policy => {
      const key = `${policy}-${finding.agentId}`
      const current = byKey.get(key)
      if (current) {
        current.sourceFindingIds.push(finding.id)
        return
      }
      byKey.set(key, {
        id: `rec-${policy}-${finding.agentId}`,
        policy,
        agentId: finding.agentId,
        sourceFindingIds: [finding.id],
        title: titleFor(policy),
        rationale: finding.message,
        riskTags: RISK_TAGS[policy],
      })
    })
  })
  return [...byKey.values()]
}

export function recommendationFromCandidate(
  candidate: OptimizationCandidate,
  inputOrMonthlySavings: OptimizationRecommendationInput | number = 0,
  legacyCostAfterUsd = 0,
): OptimizationRecommendation {
  const impact = typeof inputOrMonthlySavings === 'number'
    ? legacyImpact(candidate, inputOrMonthlySavings, legacyCostAfterUsd)
    : calculateOptimizationImpact(candidate, inputOrMonthlySavings)
  const routingGate = typeof inputOrMonthlySavings === 'number'
    ? null
    : routingMatrixGate(candidate, impact.after.modelId, inputOrMonthlySavings.modelPerformanceMatrix)

  return {
    ...candidate,
    before: impact.before,
    after: impact.after,
    delta: impact.delta,
    monthlySavingsUsd: impact.delta.monthlySavingsUsd,
    costAfterUsd: impact.after.monthlyCostUsd,
    toolResultRefs: [
      `tool:optimization.${candidate.id}.beforeMonthlyCostUsd`,
      `tool:optimization.${candidate.id}.afterMonthlyCostUsd`,
      `tool:optimization.${candidate.id}.monthlySavingsUsd`,
      `tool:optimization.${candidate.id}.costAfterUsd`,
      `tool:optimization.${candidate.id}.affectedAgentIds`,
    ] as ToolResultRef[],
    decisionMode: decisionModeFor(candidate, routingGate),
    qualityCaveat: qualityCaveatFor(candidate, routingGate),
    isDefinitiveWaste: candidate.policy !== 'route_low_risk_to_cheaper_model',
    requiredValidation: requiredValidationFor(candidate, routingGate),
  }
}

interface RoutingMatrixGate {
  allowed: boolean
  evidenceStatus: string
  evidenceRefs: string[]
  missing: boolean
}

const ROUTING_QUALITY_VALIDATION = 'Run quality evaluation on representative low-risk tasks before routing production traffic.'
const MATRIX_VALIDATION = 'Model performance matrix evidence is not verified for production routing.'

function routingMatrixGate(
  candidate: OptimizationCandidate,
  modelId: string,
  matrix: OptimizationModelPerformanceMatrixRow[] | undefined,
): RoutingMatrixGate | null {
  if (candidate.policy !== 'route_low_risk_to_cheaper_model') return null
  const rows = matrix?.filter(row => row.modelId === modelId) ?? []
  const allowed = rows.find(row => row.decisionAuthority === 'routing_allowed')
  const selected = allowed ?? rows[0]
  if (!selected) {
    return {
      allowed: false,
      evidenceStatus: 'baseline_unavailable',
      evidenceRefs: [],
      missing: true,
    }
  }
  return {
    allowed: selected.decisionAuthority === 'routing_allowed',
    evidenceStatus: selected.evidenceStatus,
    evidenceRefs: selected.evidenceRefs,
    missing: false,
  }
}

function decisionModeFor(
  candidate: OptimizationCandidate,
  routingGate: RoutingMatrixGate | null,
): OptimizationRecommendation['decisionMode'] {
  if (candidate.policy !== 'route_low_risk_to_cheaper_model') return 'deterministic'
  return routingGate?.allowed ? 'deterministic' : 'what_if'
}

function qualityCaveatFor(
  candidate: OptimizationCandidate,
  routingGate: RoutingMatrixGate | null,
): string | null {
  if (candidate.policy !== 'route_low_risk_to_cheaper_model') return null
  if (routingGate?.allowed) {
    return 'Potential savings are deterministic and the model performance matrix has verified routing evidence; monitor production quality after adoption.'
  }
  if (routingGate?.missing) {
    return 'Potential savings are deterministic, but model performance matrix baseline is unavailable and accuracy impact requires validation before adoption.'
  }
  return `Potential savings are deterministic, but model performance matrix evidence is ${routingGate?.evidenceStatus ?? 'unavailable'} and accuracy impact requires validation before adoption.`
}

function requiredValidationFor(
  candidate: OptimizationCandidate,
  routingGate: RoutingMatrixGate | null,
): string[] {
  if (candidate.policy !== 'route_low_risk_to_cheaper_model') return []
  return routingGate?.allowed ? [] : [ROUTING_QUALITY_VALIDATION, MATRIX_VALIDATION]
}

function legacyImpact(
  candidate: OptimizationCandidate,
  monthlySavingsUsd: number,
  costAfterUsd: number,
): Pick<OptimizationRecommendation, 'before' | 'after' | 'delta'> {
  const safeSavings = finiteNonNegative(monthlySavingsUsd)
  const safeAfter = finiteNonNegative(costAfterUsd)
  return {
    before: {
      monthlyCostUsd: safeAfter + safeSavings,
      agentCostUsd: safeAfter + safeSavings,
      modelId: '',
    },
    after: {
      monthlyCostUsd: safeAfter,
      agentCostUsd: safeAfter,
      modelId: '',
    },
    delta: {
      monthlySavingsUsd: safeSavings,
      percentChange: safeAfter + safeSavings > 0 ? safeSavings / (safeAfter + safeSavings) : 0,
      affectedAgentIds: [candidate.agentId],
      changedFields: [],
    },
  }
}

function calculateOptimizationImpact(
  candidate: OptimizationCandidate,
  input: OptimizationRecommendationInput,
): Pick<OptimizationRecommendation, 'before' | 'after' | 'delta'> {
  const models = input.models ?? MODELS
  const agents = input.agents.map(sanitizeAgentSpec)
  const beforeEstimates = estimateAgents(agents, models)
  const beforeTeam = summarizeTeamCost(beforeEstimates)
  const targetBefore = beforeEstimates.find(estimate => estimate.agentId === candidate.agentId)
  const targetAgent = agents.find(agent => agent.id === candidate.agentId)

  if (!targetAgent || !targetBefore) {
    return zeroImpact(candidate)
  }

  const { spec: changedAgent, changedFields } = applyOptimizationPolicy(targetAgent, candidate.policy, agents, models)
  const afterAgents = agents.map(agent => agent.id === changedAgent.id ? changedAgent : agent)
  const afterEstimates = estimateAgents(afterAgents, models)
  const afterTeam = summarizeTeamCost(afterEstimates)
  const targetAfter = afterEstimates.find(estimate => estimate.agentId === candidate.agentId) ?? targetBefore
  const monthlySavingsUsd = roundMoney(Math.max(0, beforeTeam.monthlyCostUsd - afterTeam.monthlyCostUsd))
  const afterMonthlyCostUsd = roundMoney(afterTeam.monthlyCostUsd)
  const beforeMonthlyCostUsd = roundMoney(beforeTeam.monthlyCostUsd)

  return {
    before: {
      monthlyCostUsd: beforeMonthlyCostUsd,
      agentCostUsd: roundMoney(targetBefore.cost.monthlyCost),
      modelId: targetBefore.modelId,
    },
    after: {
      monthlyCostUsd: afterMonthlyCostUsd,
      agentCostUsd: roundMoney(targetAfter.cost.monthlyCost),
      modelId: targetAfter.modelId,
    },
    delta: {
      monthlySavingsUsd,
      percentChange: beforeMonthlyCostUsd > 0 ? monthlySavingsUsd / beforeMonthlyCostUsd : 0,
      affectedAgentIds: [candidate.agentId],
      changedFields,
    },
  }
}

function applyOptimizationPolicy(
  agent: AgentSpec,
  policy: OptimizationPolicy,
  agents: AgentSpec[],
  models: Model[],
): { spec: AgentSpec; changedFields: string[] } {
  if (policy === 'cache_reused_input') {
    return {
      spec: { ...agent, cacheHitRate: Math.max(agent.cacheHitRate, agent.inputs.some(input => input.reusedEachRun) ? 0.7 : agent.cacheHitRate) },
      changedFields: ['cacheHitRate'],
    }
  }

  if (policy === 'route_low_risk_to_cheaper_model') {
    const nextModelId = selectCheaperModel(agent, agents, models)
    return {
      spec: { ...agent, modelId: nextModelId ?? agent.modelId },
      changedFields: nextModelId && nextModelId !== agent.modelId ? ['modelId'] : ['modelId:no_compatible_cheaper_model'],
    }
  }

  if (policy === 'cap_output_tokens') {
    return {
      spec: {
        ...agent,
        outputs: agent.outputs.map(output => ({
          ...output,
          estTokens: Math.max(200, Math.round(output.estTokens * 0.75)),
        })),
      },
      changedFields: ['outputs.estTokens'],
    }
  }

  if (policy === 'reduce_calls_per_run') {
    return {
      spec: { ...agent, callsPerRun: Math.max(1, agent.callsPerRun - 1) },
      changedFields: ['callsPerRun'],
    }
  }

  if (policy === 'batch_scheduled_work') {
    return {
      spec: { ...agent, batchEnabled: true },
      changedFields: ['batchEnabled'],
    }
  }

  return {
    spec: { ...agent, humanReviewGate: agent.humanReviewGate === 'all' ? 'sample' : agent.humanReviewGate },
    changedFields: ['humanReviewGate'],
  }
}

function selectCheaperModel(agent: AgentSpec, agents: AgentSpec[], models: Model[]): string | null {
  if (!getModelFromList(agent.modelId, models)) return null
  const contextRequired = sumArtifactTokens(agent.inputs) + sumArtifactTokens(agent.outputs)
  const currentEstimate = estimateAgents(agents, models).find(estimate => estimate.agentId === agent.id)
  if (!currentEstimate) return null

  const candidates = models
    .filter(model => model.id !== agent.modelId && model.contextWindow >= contextRequired)
    .map(model => {
      const candidateEstimate = estimateAgentWorkload({ spec: { ...agent, modelId: model.id }, model })
      return { model, monthlyCostUsd: candidateEstimate.cost.monthlyCost }
    })
    .filter(candidate => candidate.monthlyCostUsd < currentEstimate.cost.monthlyCost)
    .sort((a, b) => a.monthlyCostUsd - b.monthlyCostUsd || a.model.id.localeCompare(b.model.id))

  return candidates[0]?.model.id ?? null
}

function estimateAgents(agents: AgentSpec[], models: Model[]) {
  return agents.flatMap(agent => {
    const model = getModelFromList(agent.modelId, models)
    return model ? [estimateAgentWorkload({ spec: agent, model })] : []
  })
}

function getModelFromList(modelId: string, models: Model[]): Model | undefined {
  return models.find(model => model.id === modelId) ?? getModelById(modelId)
}

function zeroImpact(candidate: OptimizationCandidate): Pick<OptimizationRecommendation, 'before' | 'after' | 'delta'> {
  return {
    before: { monthlyCostUsd: 0, agentCostUsd: 0, modelId: '' },
    after: { monthlyCostUsd: 0, agentCostUsd: 0, modelId: '' },
    delta: {
      monthlySavingsUsd: 0,
      percentChange: 0,
      affectedAgentIds: [candidate.agentId],
      changedFields: [],
    },
  }
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function roundMoney(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0
}

function titleFor(policy: OptimizationPolicy): string {
  const titles: Record<OptimizationPolicy, string> = {
    cache_reused_input: 'Cache reused input context',
    route_low_risk_to_cheaper_model: 'Route low-risk work to cheaper model',
    cap_output_tokens: 'Cap output tokens for known summaries',
    reduce_calls_per_run: 'Reduce agent loop depth',
    batch_scheduled_work: 'Batch scheduled work',
    adjust_human_review_gate: 'Adjust human review gate',
  }
  return titles[policy]
}
