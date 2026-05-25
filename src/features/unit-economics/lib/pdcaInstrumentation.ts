export type AgentPayrollIcpAxis = 'customer' | 'feature' | 'plan' | 'revenue' | 'retry'
export type AgentPayrollDecisionChoice = 'adopt' | 'reject' | 'hold'

export type AgentPayrollIcpInput = {
  hasProductionAiFeature: boolean
  monthlyLlmSpendKrw: number
  canExportMetadataWithoutRawPrompt: boolean
  availableAxes: AgentPayrollIcpAxis[]
  hasDecisionOwner: boolean
  decisionUrgency: 'pricing_or_margin_now' | 'exploratory' | 'none'
}

export type AgentPayrollIcpGrade = 'A' | 'B' | 'C'
export type AgentPayrollIcpRoute = 'snapshot_or_monthly_review' | 'paid_data_readiness' | 'sample_report_or_waitlist'

export type AgentPayrollIcpScore = {
  grade: AgentPayrollIcpGrade
  route: AgentPayrollIcpRoute
  qualifiedAxes: number
  reasons: string[]
}

export type AgentPayrollOperationsInput = {
  freeFitMinutes: number
  dataReadinessMinutes: number
  snapshotMinutes: number
  monthlyReviewMinutes: number
  operatorTouchCount: number
}

export type PdcaThresholdStatus = 'within_target' | 'exceeded'

export type PdcaThresholdCheck = {
  actual: number
  target: number
  status: PdcaThresholdStatus
}

export type MonthlyReviewReadinessInput = {
  decisionChoice: AgentPayrollDecisionChoice | null
  hasNextReviewDate: boolean
  hasDecisionOwner: boolean
  attributionAxes: AgentPayrollIcpAxis[]
  hasPersistedReportArtifact: boolean
}

export type MonthlyReviewReadiness = {
  eligible: boolean
  followUpIntent: 'monthly_decision_review' | 'not_ready'
  blockingReasons: string[]
}

export type AgentPayrollPdcaInstrumentationInput = {
  icp: AgentPayrollIcpInput
  operations: AgentPayrollOperationsInput
  decisionLoop: MonthlyReviewReadinessInput
}

export type AgentPayrollPdcaInstrumentation = {
  icp: AgentPayrollIcpScore
  operations: {
    freeFit: PdcaThresholdCheck
    dataReadiness: PdcaThresholdCheck
    snapshot: PdcaThresholdCheck
    monthlyReview: PdcaThresholdCheck
    operatorTouch: PdcaThresholdCheck
  }
  monthlyReview: MonthlyReviewReadiness
  recommendedNextActions: string[]
}

const MIN_A_GRADE_SPEND_KRW = 100_000
const MIN_A_GRADE_AXES = 3
const MIN_MONTHLY_REVIEW_AXES = 2

function finiteNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function uniqueAxes(axes: AgentPayrollIcpAxis[]): AgentPayrollIcpAxis[] {
  return [...new Set(axes)]
}

function threshold(actual: number, target: number): PdcaThresholdCheck {
  const normalizedActual = finiteNumber(actual)
  return {
    actual: normalizedActual,
    target,
    status: normalizedActual <= target ? 'within_target' : 'exceeded',
  }
}

export function scoreAgentPayrollIcp(input: AgentPayrollIcpInput): AgentPayrollIcpScore {
  const qualifiedAxes = uniqueAxes(input.availableAxes).length
  const reasons: string[] = []

  if (input.hasProductionAiFeature) reasons.push('production_ai_feature_present')
  if (input.monthlyLlmSpendKrw >= MIN_A_GRADE_SPEND_KRW) reasons.push('minimum_llm_spend_met')
  if (input.canExportMetadataWithoutRawPrompt) reasons.push('raw_prompt_free_metadata_export_available')
  if (qualifiedAxes >= MIN_A_GRADE_AXES) reasons.push('attribution_axes_ready')
  if (input.hasDecisionOwner) reasons.push('decision_owner_present')
  if (input.decisionUrgency === 'pricing_or_margin_now') reasons.push('pricing_or_margin_decision_now')

  const isA = input.hasProductionAiFeature
    && input.monthlyLlmSpendKrw >= MIN_A_GRADE_SPEND_KRW
    && input.canExportMetadataWithoutRawPrompt
    && qualifiedAxes >= MIN_A_GRADE_AXES
    && input.hasDecisionOwner
    && input.decisionUrgency === 'pricing_or_margin_now'

  if (isA) {
    return { grade: 'A', route: 'snapshot_or_monthly_review', qualifiedAxes, reasons }
  }

  const isB = input.hasProductionAiFeature
    && input.canExportMetadataWithoutRawPrompt
    && input.hasDecisionOwner
    && qualifiedAxes >= MIN_MONTHLY_REVIEW_AXES

  if (isB) {
    return { grade: 'B', route: 'paid_data_readiness', qualifiedAxes, reasons }
  }

  return { grade: 'C', route: 'sample_report_or_waitlist', qualifiedAxes, reasons }
}

export function evaluateMonthlyReviewReadiness(input: MonthlyReviewReadinessInput): MonthlyReviewReadiness {
  const blockingReasons: string[] = []
  const attributionAxes = uniqueAxes(input.attributionAxes)

  if (!input.decisionChoice) blockingReasons.push('decision_required')
  if (!input.hasNextReviewDate) blockingReasons.push('next_review_date_required')
  if (!input.hasDecisionOwner) blockingReasons.push('decision_owner_required')
  if (attributionAxes.length < MIN_MONTHLY_REVIEW_AXES) blockingReasons.push('attribution_axes_required')
  if (!input.hasPersistedReportArtifact) blockingReasons.push('persisted_report_artifact_required')

  return {
    eligible: blockingReasons.length === 0,
    followUpIntent: blockingReasons.length === 0 ? 'monthly_decision_review' : 'not_ready',
    blockingReasons,
  }
}

export function buildAgentPayrollPdcaInstrumentation(input: AgentPayrollPdcaInstrumentationInput): AgentPayrollPdcaInstrumentation {
  const icp = scoreAgentPayrollIcp(input.icp)
  const operations = {
    freeFit: threshold(input.operations.freeFitMinutes, 10),
    dataReadiness: threshold(input.operations.dataReadinessMinutes, 45),
    snapshot: threshold(input.operations.snapshotMinutes, 210),
    monthlyReview: threshold(input.operations.monthlyReviewMinutes, 90),
    operatorTouch: threshold(input.operations.operatorTouchCount, 2),
  }
  const monthlyReview = evaluateMonthlyReviewReadiness(input.decisionLoop)
  const recommendedNextActions: string[] = []

  if (operations.freeFit.status === 'exceeded') {
    recommendedNextActions.push('stop_free_analysis_and_route_to_paid_readiness')
  }
  if (icp.route === 'paid_data_readiness') {
    recommendedNextActions.push('sell_data_readiness_before_snapshot')
  }
  if (operations.dataReadiness.status === 'exceeded') {
    recommendedNextActions.push('tighten_data_readiness_scope_or_raise_price')
  }
  if (operations.snapshot.status === 'exceeded') {
    recommendedNextActions.push('raise_snapshot_price_or_reduce_custom_work')
  }
  if (operations.operatorTouch.status === 'exceeded') {
    recommendedNextActions.push('narrow_icp_or_add_self_serve_trust_pack')
  }
  if (!monthlyReview.eligible) {
    recommendedNextActions.push('record_decision_before_monthly_review')
  }

  return { icp, operations, monthlyReview, recommendedNextActions }
}
