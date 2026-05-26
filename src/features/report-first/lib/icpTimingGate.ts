export type IcpTimingDecisionUrgency = 'pricing_or_margin_now' | 'exploratory' | 'none'
export type IcpTimingGrade = 'A' | 'B' | 'C'
export type IcpTimingRoute = 'diagnosis_report' | 'data_readiness_first' | 'sample_snapshot' | 'free_calculator'

export interface IcpTimingGateInput {
  monthlyAiSpendKrw: number
  hasCustomerRevenueMapping: boolean
  hasHeavyUserSuspicion: boolean
  decisionUrgency: IcpTimingDecisionUrgency
  needsCeoFinanceReport: boolean
}

export interface IcpTimingGateAssessment {
  score: number
  maxScore: number
  grade: IcpTimingGrade
  route: IcpTimingRoute
  headline: string
  primaryCta: string
  reasons: string[]
  missing: string[]
}

const MIN_PAID_DIAGNOSIS_SPEND_KRW = 300_000

export function assessIcpTimingGate(input: IcpTimingGateInput): IcpTimingGateAssessment {
  const reasons: string[] = []
  const missing: string[] = []

  if (input.monthlyAiSpendKrw >= MIN_PAID_DIAGNOSIS_SPEND_KRW) {
    reasons.push('monthly_ai_spend_ready')
  } else {
    missing.push('monthly_ai_spend_too_low')
  }

  if (input.hasCustomerRevenueMapping) {
    reasons.push('customer_revenue_mapping_ready')
  } else {
    missing.push('customer_revenue_mapping_missing')
  }

  if (input.hasHeavyUserSuspicion) {
    reasons.push('heavy_user_suspected')
  } else {
    missing.push('heavy_user_signal_missing')
  }

  if (input.decisionUrgency === 'pricing_or_margin_now') {
    reasons.push('pricing_decision_urgent')
  } else {
    missing.push('pricing_decision_not_urgent')
  }

  if (input.needsCeoFinanceReport) {
    reasons.push('ceo_finance_report_needed')
  } else {
    missing.push('ceo_finance_report_not_needed')
  }

  const score = reasons.length
  const grade = score >= 5 ? 'A' : score >= 3 ? 'B' : 'C'
  const route = routeFor({ score, hasCustomerRevenueMapping: input.hasCustomerRevenueMapping })

  return {
    score,
    maxScore: 5,
    grade,
    route,
    headline: headlineFor(route),
    primaryCta: primaryCtaFor(route),
    reasons,
    missing,
  }
}

function routeFor(input: { score: number; hasCustomerRevenueMapping: boolean }): IcpTimingRoute {
  if (input.score >= 4 && !input.hasCustomerRevenueMapping) return 'data_readiness_first'
  if (input.score >= 4) return 'diagnosis_report'
  if (input.score >= 2) return 'sample_snapshot'
  return 'free_calculator'
}

function headlineFor(route: IcpTimingRoute): string {
  switch (route) {
    case 'diagnosis_report':
      return '유료 진단 리포트 후보'
    case 'data_readiness_first':
      return '데이터 매핑부터 확인'
    case 'sample_snapshot':
      return '샘플 Snapshot으로 검증'
    case 'free_calculator':
      return '아직은 무료 샘플이 적합'
  }
}

function primaryCtaFor(route: IcpTimingRoute): string {
  switch (route) {
    case 'diagnosis_report':
      return 'AI Token Leakage Report 진단 시작'
    case 'data_readiness_first':
      return 'customer_id + revenue 매핑부터 확인'
    case 'sample_snapshot':
      return '샘플 Snapshot으로 먼저 보기'
    case 'free_calculator':
      return '샘플 Snapshot으로 먼저 보기'
  }
}
