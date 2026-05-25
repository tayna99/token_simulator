import { Annotation, END, Send, START, StateGraph } from '@langchain/langgraph'
import { getModelById } from '../../alternatives/data/models'
import { AI_TEAM_AGENT_CATALOG } from '../../team-cost/lib/agentCatalog'
import { normalizeFrequencyToMonthlyRuns } from '../../team-cost/lib/agentSpec'
import { compareSpecToBenchmark, retrieveBenchmarkCards } from '../../team-cost/lib/benchmarkCorpus'
import { detectBottlenecks } from '../../team-cost/lib/bottleneckAnalysis'
import { estimateAgentWorkload, summarizeTeamCost } from '../../team-cost/lib/estimateAgentWorkload'
import { recommendationFromCandidate, proposeOptimizationCandidates } from '../../team-cost/lib/optimizationPolicies'
import type { TeamCostGraphEvent, TeamCostGraphState } from '../../team-cost/lib/teamCostState'
import { retrieveRiskCards } from './riskCards'
import { buildTeamCostToolSnapshot } from './teamCostToolContract'
import { routeTeamCostWorkflow } from './teamCostRouter'
import { evaluateApprovalGate } from './approvalGate'

export interface TeamCostGraphOptions {
  approvalMode?: 'event' | 'interrupt'
}

const TeamCostAnnotation = Annotation.Root({
  workflowMode: Annotation<TeamCostGraphState['workflowMode']>(),
  companyProfile: Annotation<TeamCostGraphState['companyProfile']>(),
  agentSpecs: Annotation<TeamCostGraphState['agentSpecs']>({
    value: (_left, right) => right,
    default: () => [],
  }),
  estimates: Annotation<TeamCostGraphState['estimates']>({
    value: (_left, right) => right,
    default: () => [],
  }),
  teamEstimate: Annotation<TeamCostGraphState['teamEstimate']>({
    value: (_left, right) => right,
    default: () => null,
  }),
  toolRefs: Annotation<TeamCostGraphState['toolRefs']>({
    value: (left, right) => [...new Set([...left, ...right])],
    default: () => [],
  }),
  toolValues: Annotation<TeamCostGraphState['toolValues']>({
    value: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  bottlenecks: Annotation<TeamCostGraphState['bottlenecks']>({
    value: (_left, right) => right,
    default: () => [],
  }),
  benchmarks: Annotation<TeamCostGraphState['benchmarks']>({
    value: (_left, right) => right,
    default: () => [],
  }),
  candidates: Annotation<TeamCostGraphState['candidates']>({
    value: (_left, right) => right,
    default: () => [],
  }),
  recommendations: Annotation<TeamCostGraphState['recommendations']>({
    value: (_left, right) => right,
    default: () => [],
  }),
  riskCardsByRecommendation: Annotation<TeamCostGraphState['riskCardsByRecommendation']>({
    value: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  approval: Annotation<TeamCostGraphState['approval']>({
    value: (_left, right) => right,
    default: () => ({ status: 'not_required', recommendationId: null }),
  }),
  decisionDraft: Annotation<TeamCostGraphState['decisionDraft']>({
    value: (_left, right) => right,
    default: () => null,
  }),
  events: Annotation<TeamCostGraphState['events']>({
    value: (left, right) => [...left, ...right],
    default: () => [],
  }),
})

type GraphState = typeof TeamCostAnnotation.State

function event(input: TeamCostGraphEvent): TeamCostGraphEvent[] {
  return [input]
}

function intakeNormalizerNode(state: GraphState): Partial<TeamCostGraphState> {
  return { agentSpecs: state.agentSpecs.length > 0 ? state.agentSpecs : AI_TEAM_AGENT_CATALOG }
}

function deterministicEstimatorNode(state: GraphState): Partial<TeamCostGraphState> {
  const estimates = state.agentSpecs.flatMap(spec => {
    const model = getModelById(spec.modelId)
    return model ? [estimateAgentWorkload({ spec, model })] : []
  })
  const teamEstimate = summarizeTeamCost(estimates)
  const bottlenecks = detectBottlenecks({
    monthlyBudgetUsd: state.companyProfile.monthlyBudgetUsd,
    teamEstimate,
    agents: state.agentSpecs,
  })

  return { estimates, teamEstimate, bottlenecks }
}

function toolSnapshotNode(state: GraphState): Partial<TeamCostGraphState> {
  const snapshot = buildTeamCostToolSnapshot({
    team: state.teamEstimate ? {
      monthlyCostUsd: state.teamEstimate.monthlyCostUsd,
      monthlyInputTokens: state.teamEstimate.monthlyInputTokens,
      monthlyOutputTokens: state.teamEstimate.monthlyOutputTokens,
      monthlyRequests: state.teamEstimate.monthlyRequests,
      cacheSavingsUsd: state.teamEstimate.cacheSavingsUsd,
      batchSavingsUsd: state.teamEstimate.batchSavingsUsd,
      topAgentId: state.teamEstimate.topAgentId ?? '',
      topAgentShare: state.teamEstimate.topAgentShare,
    } : undefined,
    agents: state.estimates.map(estimate => ({
      agentId: estimate.agentId,
      monthlyCostUsd: estimate.cost.monthlyCost,
      monthlyInputTokens: estimate.monthlyInputTokens,
      monthlyOutputTokens: estimate.monthlyOutputTokens,
      costShare: state.teamEstimate && state.teamEstimate.monthlyCostUsd > 0
        ? estimate.cost.monthlyCost / state.teamEstimate.monthlyCostUsd
        : 0,
    })),
  })

  return {
    toolRefs: snapshot.refs,
    toolValues: snapshot.values,
    events: event({
      type: 'tool_snapshot',
      message: `Team cost snapshot contains ${snapshot.refs.length} deterministic fields.`,
      toolResultRefs: snapshot.refs,
      riskCardIds: [],
      recommendationIds: [],
    }),
  }
}

function costNarratorNode(state: GraphState): Partial<TeamCostGraphState> {
  return {
    events: event({
      type: 'legacy_deterministic_narrative',
      message: 'Legacy deterministic narrative only; no operating agent reasoning was invoked.',
      toolResultRefs: state.toolRefs,
      riskCardIds: [],
      recommendationIds: [],
    }),
  }
}

function analysisFanoutNode(): Partial<TeamCostGraphState> {
  return {}
}

function costAnalystNode(state: GraphState): Partial<TeamCostGraphState> {
  return {
    events: event({
      type: 'cost_analysis',
      message: `Cost Analyst found ${state.bottlenecks.length} bottleneck(s).`,
      toolResultRefs: state.toolRefs,
      riskCardIds: [],
      recommendationIds: [],
    }),
  }
}

function benchmarkAnalystNode(state: GraphState): Partial<TeamCostGraphState> {
  const benchmarks = state.agentSpecs.flatMap(spec => {
    const tags = [spec.role.toLowerCase().split(' ')[0], state.companyProfile.stage.toLowerCase()]
    const monthlyRuns = normalizeFrequencyToMonthlyRuns(spec.frequency)
    return retrieveBenchmarkCards(tags).map(card => compareSpecToBenchmark(spec, card, monthlyRuns))
  })
  return {
    benchmarks,
    events: event({
      type: 'benchmark_analysis',
      message: `Benchmark Analyst matched ${benchmarks.length} benchmark(s).`,
      toolResultRefs: state.toolRefs,
      riskCardIds: [],
      recommendationIds: [],
    }),
  }
}

function optimizationPlannerNode(state: GraphState): Partial<TeamCostGraphState> {
  const candidates = proposeOptimizationCandidates({ findings: state.bottlenecks })
  const recommendations = candidates.map(candidate => recommendationFromCandidate(candidate, {
    agents: state.agentSpecs,
  }))
  return {
    candidates,
    recommendations,
    events: event({
      type: 'optimization_candidate',
      message: `Optimization Planner proposed ${recommendations.length} candidate(s).`,
      toolResultRefs: state.toolRefs,
      riskCardIds: [],
      recommendationIds: recommendations.map(recommendation => recommendation.id),
    }),
  }
}

function optimizationReducerNode(state: GraphState): Partial<TeamCostGraphState> {
  const snapshot = buildTeamCostToolSnapshot({
    optimizations: state.recommendations.map(recommendation => ({
      id: recommendation.id,
      beforeMonthlyCostUsd: recommendation.before.monthlyCostUsd,
      afterMonthlyCostUsd: recommendation.after.monthlyCostUsd,
      monthlySavingsUsd: recommendation.monthlySavingsUsd,
      costAfterUsd: recommendation.costAfterUsd,
      affectedAgentIds: recommendation.delta.affectedAgentIds,
    })),
    benchmarks: state.benchmarks,
  })
  return {
    toolRefs: snapshot.refs,
    toolValues: snapshot.values,
  }
}

function sendRiskAudits(state: GraphState): Send<'riskAuditor', TeamCostGraphState>[] | 'approvalGate' {
  if (state.recommendations.length === 0) return 'approvalGate'
  return state.recommendations.map(recommendation => new Send('riskAuditor', {
    ...state,
    recommendations: [recommendation],
  }))
}

function riskAuditorNode(state: GraphState): Partial<TeamCostGraphState> {
  const entries = state.recommendations.map(recommendation => {
    const cards = retrieveRiskCards(recommendation.riskTags)
    return [recommendation.id, cards] as const
  })
  const riskCardsByRecommendation = Object.fromEntries(entries)
  const riskCardIds = [...new Set(entries.flatMap(([, cards]) => cards.map(card => card.id)))]
  return {
    riskCardsByRecommendation,
    events: event({
      type: 'risk_audit',
      message: `Risk Auditor attached ${riskCardIds.length} risk card(s) to ${state.recommendations.map(recommendation => recommendation.id).join(', ')}.`,
      toolResultRefs: [],
      riskCardIds,
      recommendationIds: state.recommendations.map(recommendation => recommendation.id),
    }),
  }
}

function approvalGateNode(state: GraphState): Partial<TeamCostGraphState> {
  const recommendation = state.recommendations[0]
  if (!recommendation) {
    return { approval: { status: 'not_required', recommendationId: null } }
  }
  const riskCardIds = (state.riskCardsByRecommendation[recommendation.id] ?? []).map(card => card.id)
  const gate = evaluateApprovalGate({
    recommendationId: recommendation.id,
    toolResultRefs: recommendation.toolResultRefs,
    riskCardIds,
  })
  return {
    approval: { status: gate.status === 'blocked' ? 'rejected' : 'pending', recommendationId: recommendation.id },
    events: event({
      type: 'approval_required',
      message: gate.message,
      toolResultRefs: recommendation.toolResultRefs,
      riskCardIds,
      recommendationIds: [recommendation.id],
    }),
  }
}

function decisionLogDrafterNode(state: GraphState): Partial<TeamCostGraphState> {
  const recommendation = state.recommendations.find(item => item.id === state.approval.recommendationId) ?? state.recommendations[0]
  if (!recommendation) return {}
  const riskCards = (state.riskCardsByRecommendation[recommendation.id] ?? []).map(card => card.id)
  return {
    decisionDraft: {
      what: recommendation.title,
      why: recommendation.rationale,
      assumptions: { workflowMode: state.workflowMode, agentId: recommendation.agentId },
      toolResultRefs: recommendation.toolResultRefs,
      riskCards,
      status: riskCards.length > 0 ? 'adopted' : 'rejected',
    },
    events: event({
      type: 'decision_draft',
      message: 'Decision Scribe drafted a risk-carded decision log entry.',
      toolResultRefs: recommendation.toolResultRefs,
      riskCardIds: riskCards,
      recommendationIds: [recommendation.id],
    }),
  }
}

function reportDrafterNode(state: GraphState): Partial<TeamCostGraphState> {
  return {
    events: event({
      type: 'legacy_deterministic_narrative',
      message: 'Legacy deterministic report narrative only; no persisted report artifact was created in this graph.',
      toolResultRefs: state.toolRefs,
      riskCardIds: [...new Set(Object.values(state.riskCardsByRecommendation).flatMap(cards => cards.map(card => card.id)))],
      recommendationIds: state.recommendations.map(recommendation => recommendation.id),
    }),
  }
}

function planVsActualCalibratorNode(): Partial<TeamCostGraphState> {
  return {
    events: event({
      type: 'legacy_deterministic_narrative',
      message: 'Legacy deterministic calibration narrative only; persisted plan-vs-actual proposal is handled by the calibration API.',
      toolResultRefs: [],
      riskCardIds: [],
      recommendationIds: [],
    }),
  }
}

export function createTeamCostGraph(_options: TeamCostGraphOptions = {}) {
  return new StateGraph(TeamCostAnnotation)
    .addNode('intakeNormalizer', intakeNormalizerNode)
    .addNode('deterministicEstimator', deterministicEstimatorNode)
    .addNode('toolSnapshot', toolSnapshotNode)
    .addNode('workflowRouter', (state: GraphState) => state)
    .addNode('costNarrator', costNarratorNode)
    .addNode('analysisFanout', analysisFanoutNode)
    .addNode('costAnalyst', costAnalystNode)
    .addNode('benchmarkAnalyst', benchmarkAnalystNode)
    .addNode('optimizationPlanner', optimizationPlannerNode)
    .addNode('optimizationReducer', optimizationReducerNode)
    .addNode('riskAuditor', riskAuditorNode)
    .addNode('approvalGate', approvalGateNode)
    .addNode('decisionLogDrafter', decisionLogDrafterNode)
    .addNode('reportDrafter', reportDrafterNode)
    .addNode('planVsActualCalibrator', planVsActualCalibratorNode)
    .addEdge(START, 'intakeNormalizer')
    .addEdge('intakeNormalizer', 'deterministicEstimator')
    .addEdge('deterministicEstimator', 'toolSnapshot')
    .addEdge('toolSnapshot', 'workflowRouter')
    .addConditionalEdges('workflowRouter', routeTeamCostWorkflow)
    .addEdge('costNarrator', END)
    .addEdge('analysisFanout', 'costAnalyst')
    .addEdge('analysisFanout', 'benchmarkAnalyst')
    .addEdge('analysisFanout', 'optimizationPlanner')
    .addEdge(['costAnalyst', 'benchmarkAnalyst', 'optimizationPlanner'], 'optimizationReducer')
    .addConditionalEdges('optimizationReducer', sendRiskAudits)
    .addEdge('riskAuditor', 'approvalGate')
    .addEdge('approvalGate', 'decisionLogDrafter')
    .addEdge('decisionLogDrafter', END)
    .addEdge('reportDrafter', END)
    .addEdge('planVsActualCalibrator', END)
    .compile()
}
