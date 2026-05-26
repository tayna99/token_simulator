export type LeadBuyerRole = 'founder' | 'technical_founder' | 'pm' | 'finance' | 'engineer' | 'unknown'
export type LeadDecisionPressure = 'pricing_or_margin_now' | 'exploratory' | 'none'
export type LeadIntakeGrade = 'A' | 'B' | 'C'
export type LeadIntakeNextAction = 'ai_cost_snapshot' | 'data_readiness_check' | 'sample_report_or_waitlist'

export interface LeadIntakeInput {
  hasProductionAiFeature: boolean
  monthlyLlmApiCostKrw: number
  hasUsageExport: boolean
  hasCustomerOrPlanMapping: boolean
  hasRevenueOrPlanPrice: boolean
  decisionPressure: LeadDecisionPressure
  buyerRole: LeadBuyerRole
}

export interface LeadIntakeAutomation {
  grade: LeadIntakeGrade
  nextAction: LeadIntakeNextAction
  fitScore: number
  reasons: string[]
  blockers: string[]
  safeDataRequestFields: string[]
  blockedDataFields: string[]
  discoveryQuestions: string[]
}

const MINIMUM_SPEND_KRW = 100_000
const DECISION_OWNER_ROLES: LeadBuyerRole[] = ['founder', 'technical_founder', 'pm', 'finance']

const SAFE_DATA_REQUEST_FIELDS = [
  'timestamp',
  'customer_id',
  'plan_id',
  'feature',
  'model',
  'input_tokens',
  'output_tokens',
  'total_cost',
  'status',
  'retry_count',
  'revenue_or_plan_price',
]

const BLOCKED_DATA_FIELDS = [
  'raw_prompt',
  'conversation',
  'api_key',
  'secret_key',
  'email',
  'phone',
  'real_name',
]

function positiveNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function scoreLead(input: LeadIntakeInput): { fitScore: number; reasons: string[]; blockers: string[] } {
  const reasons: string[] = []
  const blockers: string[] = []
  let fitScore = 0

  if (input.hasProductionAiFeature) {
    fitScore += 2
    reasons.push('production_ai_feature_present')
  } else {
    blockers.push('production_ai_feature_missing')
  }

  if (positiveNumber(input.monthlyLlmApiCostKrw) >= MINIMUM_SPEND_KRW) {
    fitScore += 2
    reasons.push('minimum_llm_spend_met')
  } else {
    blockers.push('minimum_llm_spend_missing')
  }

  if (input.hasUsageExport) {
    fitScore += 2
    reasons.push('usage_export_available')
  } else {
    blockers.push('usage_export_missing')
  }

  if (input.hasCustomerOrPlanMapping) {
    fitScore += 1
    reasons.push('customer_or_plan_mapping_available')
  } else {
    blockers.push('customer_or_plan_mapping_missing')
  }

  if (input.hasRevenueOrPlanPrice) {
    fitScore += 1
    reasons.push('revenue_or_plan_price_available')
  } else {
    blockers.push('revenue_or_plan_price_missing')
  }

  if (input.decisionPressure === 'pricing_or_margin_now') {
    fitScore += 1
    reasons.push('decision_pressure_present')
  } else if (input.decisionPressure === 'none') {
    blockers.push('decision_pressure_missing')
  }

  if (DECISION_OWNER_ROLES.includes(input.buyerRole)) {
    fitScore += 1
    reasons.push('decision_owner_role_present')
  } else {
    blockers.push('decision_owner_role_missing')
  }

  return { fitScore, reasons, blockers }
}

function gradeFrom(input: LeadIntakeInput, fitScore: number): LeadIntakeGrade {
  const snapshotReady = input.hasProductionAiFeature
    && positiveNumber(input.monthlyLlmApiCostKrw) >= MINIMUM_SPEND_KRW
    && input.hasUsageExport
    && input.hasCustomerOrPlanMapping
    && input.hasRevenueOrPlanPrice
    && input.decisionPressure === 'pricing_or_margin_now'
    && DECISION_OWNER_ROLES.includes(input.buyerRole)

  if (snapshotReady && fitScore >= 8) return 'A'
  if (input.hasProductionAiFeature && input.hasUsageExport && fitScore >= 5) return 'B'
  return 'C'
}

function nextActionFor(grade: LeadIntakeGrade): LeadIntakeNextAction {
  if (grade === 'A') return 'ai_cost_snapshot'
  if (grade === 'B') return 'data_readiness_check'
  return 'sample_report_or_waitlist'
}

function discoveryQuestionsFor(input: LeadIntakeInput, blockers: string[]): string[] {
  const questions = [
    '어떤 AI 기능이 실제 고객에게 운영 중인가요?',
    '월 LLM/API 비용은 어느 정도이고 최근 3개월에 증가했나요?',
    '이 분석 결과로 가격, 사용량 제한, credit, overage, 모델 라우팅 중 무엇을 결정하고 싶나요?',
  ]

  if (!input.hasUsageExport) {
    questions.push('사용량 데이터가 CSV, 로그, Langfuse/Helicone export, 자체 DB 중 어떤 형태로 남아 있나요?')
  }

  if (blockers.includes('customer_or_plan_mapping_missing')) {
    questions.push('usage export에 customer_id 또는 plan_id를 붙일 수 있나요?')
  }

  if (blockers.includes('revenue_or_plan_price_missing')) {
    questions.push('revenue 또는 plan_price를 사용량 데이터와 연결할 수 있나요?')
  }

  return questions
}

export function buildLeadIntakeAutomation(input: LeadIntakeInput): LeadIntakeAutomation {
  const { fitScore, reasons, blockers } = scoreLead(input)
  const grade = gradeFrom(input, fitScore)

  return {
    grade,
    nextAction: nextActionFor(grade),
    fitScore,
    reasons,
    blockers,
    safeDataRequestFields: SAFE_DATA_REQUEST_FIELDS,
    blockedDataFields: BLOCKED_DATA_FIELDS,
    discoveryQuestions: discoveryQuestionsFor(input, blockers),
  }
}
