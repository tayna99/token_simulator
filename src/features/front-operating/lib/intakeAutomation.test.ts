import { describe, expect, it } from 'vitest'

import { buildLeadIntakeAutomation } from './intakeAutomation'

describe('buildLeadIntakeAutomation', () => {
  it('routes a qualified AI SaaS lead to AI Cost Snapshot with safe data request fields', () => {
    const result = buildLeadIntakeAutomation({
      hasProductionAiFeature: true,
      monthlyLlmApiCostKrw: 450_000,
      hasUsageExport: true,
      hasCustomerOrPlanMapping: true,
      hasRevenueOrPlanPrice: true,
      decisionPressure: 'pricing_or_margin_now',
      buyerRole: 'founder',
    })

    expect(result.grade).toBe('A')
    expect(result.nextAction).toBe('ai_cost_snapshot')
    expect(result.fitScore).toBeGreaterThanOrEqual(8)
    expect(result.reasons).toContain('production_ai_feature_present')
    expect(result.reasons).toContain('decision_pressure_present')
    expect(result.safeDataRequestFields).toEqual(expect.arrayContaining([
      'customer_id',
      'plan_id',
      'feature',
      'model',
      'input_tokens',
      'output_tokens',
      'revenue_or_plan_price',
    ]))
    expect(result.blockedDataFields).toEqual(expect.arrayContaining(['raw_prompt', 'api_key', 'email']))
    expect(result.discoveryQuestions[0]).toMatch(/어떤 AI 기능/)
  })

  it('routes a live AI product with weak mappings to Data Readiness Check', () => {
    const result = buildLeadIntakeAutomation({
      hasProductionAiFeature: true,
      monthlyLlmApiCostKrw: 180_000,
      hasUsageExport: true,
      hasCustomerOrPlanMapping: false,
      hasRevenueOrPlanPrice: false,
      decisionPressure: 'exploratory',
      buyerRole: 'pm',
    })

    expect(result.grade).toBe('B')
    expect(result.nextAction).toBe('data_readiness_check')
    expect(result.reasons).toContain('usage_export_available')
    expect(result.blockers).toEqual(expect.arrayContaining([
      'customer_or_plan_mapping_missing',
      'revenue_or_plan_price_missing',
    ]))
    expect(result.discoveryQuestions.join(' ')).toMatch(/customer_id|plan_id|revenue/)
  })

  it('keeps early or low-signal leads on sample report instead of spending operator time', () => {
    const result = buildLeadIntakeAutomation({
      hasProductionAiFeature: false,
      monthlyLlmApiCostKrw: 0,
      hasUsageExport: false,
      hasCustomerOrPlanMapping: false,
      hasRevenueOrPlanPrice: false,
      decisionPressure: 'none',
      buyerRole: 'unknown',
    })

    expect(result.grade).toBe('C')
    expect(result.nextAction).toBe('sample_report_or_waitlist')
    expect(result.blockers).toEqual(expect.arrayContaining([
      'production_ai_feature_missing',
      'usage_export_missing',
    ]))
  })
})
