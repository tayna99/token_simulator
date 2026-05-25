import type { RiskCard } from '../../agent/lib/riskCards'
import type { ToolResultRef, ToolValue } from '../../agent/lib/toolContract'
import type { DecisionInput } from '../../decision-log/lib/decisionLog'
import type { AgentSpec } from './agentSpec'
import type { BenchmarkMatch } from './benchmarkCorpus'
import type { BottleneckFinding } from './bottleneckAnalysis'
import type { AgentCostEstimate, TeamCostEstimate } from './estimateAgentWorkload'
import type { OptimizationCandidate, OptimizationRecommendation } from './optimizationPolicies'

export type TeamCostWorkflowMode =
  | 'estimate_only'
  | 'optimize'
  | 'decision'
  | 'report'
  | 'calibrate'

export interface TeamCostGraphEvent {
  type:
    | 'tool_snapshot'
    | 'cost_analysis'
    | 'benchmark_analysis'
    | 'optimization_candidate'
    | 'risk_audit'
    | 'approval_required'
    | 'decision_draft'
    | 'report_draft'
    | 'calibration'
    | 'legacy_deterministic_narrative'
  message: string
  toolResultRefs: ToolResultRef[]
  riskCardIds: string[]
  recommendationIds: string[]
}

export interface TeamCostGraphState {
  workflowMode: TeamCostWorkflowMode
  companyProfile: {
    companyType: string
    stage: string
    monthlyBudgetUsd: number
    locale: 'en' | 'ko'
  }
  agentSpecs: AgentSpec[]
  estimates: AgentCostEstimate[]
  teamEstimate: TeamCostEstimate | null
  toolRefs: ToolResultRef[]
  toolValues: Partial<Record<ToolResultRef, ToolValue>>
  bottlenecks: BottleneckFinding[]
  benchmarks: BenchmarkMatch[]
  candidates: OptimizationCandidate[]
  recommendations: OptimizationRecommendation[]
  riskCardsByRecommendation: Record<string, RiskCard[]>
  approval: {
    status: 'not_required' | 'pending' | 'approved' | 'rejected'
    recommendationId: string | null
  }
  decisionDraft: DecisionInput | null
  events: TeamCostGraphEvent[]
}
