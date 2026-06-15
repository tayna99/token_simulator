import { describe, expect, it } from 'vitest'

import { MODELS } from '../../../data/models'
import { parseUsageCsv } from '../../usage/lib/usageImport'
import { parseOutcomeCsv } from './outcomeMeasurement'
import { parseRevenueCsv } from './revenueMapping'
import { importTemplateById, importTemplatesByKind, REPORT_FIRST_IMPORT_TEMPLATES } from './importTemplates'

describe('REPORT_FIRST_IMPORT_TEMPLATES', () => {
  it('ships usage templates that parse into token leakage usage rows', () => {
    const usageTemplates = importTemplatesByKind('usage')

    expect(usageTemplates.map(template => template.id)).toEqual([
      'helicone_usage',
      'langfuse_usage',
      'openai_usage',
      'anthropic_usage',
      'gemini_usage',
      'vercel_ai_gateway_usage',
    ])

    for (const template of usageTemplates) {
      const summary = parseUsageCsv(template.sampleCsv, MODELS)

      expect(summary.errors).toEqual([])
      expect(summary.rows.length).toBeGreaterThan(0)
      expect(summary.rows.every(row => row.customerId)).toBe(true)
      expect(summary.totalInputTokens + summary.totalOutputTokens).toBeGreaterThan(0)
      expect(summary.totalCostUsd).toBeGreaterThan(0)
      expect(summary.trustInspection?.allowedForSnapshot).toBe(true)
      expect(template.optionalColumns).toEqual(expect.arrayContaining([
        'session_id',
        'agent_run_id',
      ]))
    }
  })

  it('keeps vendor aliases stable for Langfuse-style usage exports', () => {
    const langfuse = importTemplateById('langfuse_usage')
    const summary = parseUsageCsv(langfuse?.sampleCsv ?? '', MODELS)

    expect(summary.rows[0]).toMatchObject({
      customerId: 'northstar_health',
      feature: 'report_generation',
      modelId: 'claude-sonnet-4.6',
      costSource: 'explicit',
    })
  })

  it('ships connector-ready usage samples for Anthropic, Gemini, and Vercel AI Gateway', () => {
    for (const id of ['anthropic_usage', 'gemini_usage', 'vercel_ai_gateway_usage']) {
      const template = importTemplateById(id)
      const summary = parseUsageCsv(template?.sampleCsv ?? '', MODELS)

      expect(summary.errors).toEqual([])
      expect(summary.rows[0]).toEqual(expect.objectContaining({
        customerId: expect.any(String),
        feature: expect.any(String),
        modelId: expect.any(String),
        costSource: 'explicit',
      }))
      expect(summary.schemaMappingProfile?.sourceColumns).toEqual(expect.arrayContaining(template?.requiredColumns ?? []))
    }
  })

  it('ships a plan and revenue sample template that unlocks token policy mapping fields', () => {
    const template = importTemplateById('stripe_allowance')

    expect(template).toMatchObject({
      kind: 'allowance',
      label: '요금제/매출 샘플',
      requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    })

    const result = parseRevenueCsv(template?.sampleCsv ?? '')

    expect(result.errors).toEqual([])
    expect(Object.keys(result.customerRevenueUsd)).toEqual(['northstar_health', 'atlas_legal', 'bluebird_support'])
    expect(result.customerIncludedTokens).toMatchObject({
      northstar_health: 100000,
      atlas_legal: 100000,
      bluebird_support: 500000,
    })
    expect(result.customerOverageRateUsdPer1kTokens).toMatchObject({
      northstar_health: 0.18,
      atlas_legal: 0.18,
      bluebird_support: 0.12,
    })
  })

  it('ships billing DB, outcome event, and policy decision templates without live connector claims', () => {
    const billing = importTemplateById('billing_db_allowance')
    const outcome = importTemplateById('manual_outcome_events')
    const policy = importTemplateById('manual_policy_decisions')

    expect(billing).toMatchObject({
      kind: 'allowance',
      source: 'billing_db',
    })
    expect(parseRevenueCsv(billing?.sampleCsv ?? '').errors).toEqual([])

    expect(outcome).toMatchObject({
      kind: 'outcome',
      source: 'manual_outcome_csv',
    })
    const outcomeRows = parseOutcomeCsv(outcome?.sampleCsv ?? '')
    expect(outcomeRows.errors).toEqual([])
    expect(outcomeRows.rows[0]).toMatchObject({
      feature: 'report_generation',
      outcomeType: 'report_downloaded',
      accepted: true,
    })

    expect(policy).toMatchObject({
      kind: 'policy',
      source: 'manual_policy_csv',
    })
    expect(policy?.sampleCsv).toContain('decision_choice')
    expect(policy?.sampleCsv).toContain('connector_not_configured')
  })

  it('keeps templates bounded to report-first demo sources', () => {
    expect(REPORT_FIRST_IMPORT_TEMPLATES).toHaveLength(10)
    expect(REPORT_FIRST_IMPORT_TEMPLATES.some(template => /(^|,)prompt(,|$)/m.test(template.sampleCsv))).toBe(false)
    expect(REPORT_FIRST_IMPORT_TEMPLATES.some(template => /api_key/i.test(template.sampleCsv))).toBe(false)
    expect(REPORT_FIRST_IMPORT_TEMPLATES.some(template => /messages/i.test(template.sampleCsv))).toBe(false)
  })
})
