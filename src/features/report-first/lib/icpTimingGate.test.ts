import { describe, expect, it } from 'vitest'

import { assessIcpTimingGate } from './icpTimingGate'

describe('assessIcpTimingGate', () => {
  it('routes a high-intent AI SaaS lead to the paid diagnosis report CTA', () => {
    const assessment = assessIcpTimingGate({
      monthlyAiSpendKrw: 3_200_000,
      hasCustomerRevenueMapping: true,
      hasHeavyUserSuspicion: true,
      decisionUrgency: 'pricing_or_margin_now',
      needsCeoFinanceReport: true,
    })

    expect(assessment).toMatchObject({
      score: 5,
      maxScore: 5,
      grade: 'A',
      route: 'diagnosis_report',
      primaryCta: 'AI 비용 누수 리포트 진단 시작',
    })
    expect(assessment.reasons).toEqual(expect.arrayContaining([
      'monthly_ai_spend_ready',
      'customer_revenue_mapping_ready',
      'heavy_user_suspected',
      'pricing_decision_urgent',
      'ceo_finance_report_needed',
    ]))
  })

  it('routes a low-intent lead to a free sample or calculator instead of paid diagnosis', () => {
    const assessment = assessIcpTimingGate({
      monthlyAiSpendKrw: 50_000,
      hasCustomerRevenueMapping: false,
      hasHeavyUserSuspicion: false,
      decisionUrgency: 'none',
      needsCeoFinanceReport: false,
    })

    expect(assessment).toMatchObject({
      score: 0,
      maxScore: 5,
      grade: 'C',
      route: 'free_calculator',
      primaryCta: '샘플 진단으로 먼저 보기',
    })
    expect(assessment.missing).toEqual(expect.arrayContaining([
      'monthly_ai_spend_too_low',
      'customer_revenue_mapping_missing',
      'heavy_user_signal_missing',
      'pricing_decision_not_urgent',
      'ceo_finance_report_not_needed',
    ]))
  })

  it('keeps urgent leads without revenue mapping in a data-readiness route', () => {
    const assessment = assessIcpTimingGate({
      monthlyAiSpendKrw: 5_000_000,
      hasCustomerRevenueMapping: false,
      hasHeavyUserSuspicion: true,
      decisionUrgency: 'pricing_or_margin_now',
      needsCeoFinanceReport: true,
    })

    expect(assessment).toMatchObject({
      score: 4,
      grade: 'B',
      route: 'data_readiness_first',
      primaryCta: 'customer_id + revenue 매핑부터 확인',
    })
    expect(assessment.missing).toContain('customer_revenue_mapping_missing')
  })
})
