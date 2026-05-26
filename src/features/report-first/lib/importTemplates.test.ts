import { describe, expect, it } from 'vitest'

import { MODELS } from '../../../data/models'
import { parseUsageCsv } from '../../usage/lib/usageImport'
import { parseRevenueCsv } from './revenueMapping'
import { importTemplateById, importTemplatesByKind, REPORT_FIRST_IMPORT_TEMPLATES } from './importTemplates'

describe('REPORT_FIRST_IMPORT_TEMPLATES', () => {
  it('ships usage templates that parse into token leakage usage rows', () => {
    const usageTemplates = importTemplatesByKind('usage')

    expect(usageTemplates.map(template => template.id)).toEqual([
      'helicone_usage',
      'langfuse_usage',
      'openai_usage',
    ])

    for (const template of usageTemplates) {
      const summary = parseUsageCsv(template.sampleCsv, MODELS)

      expect(summary.errors).toEqual([])
      expect(summary.rows.length).toBeGreaterThan(0)
      expect(summary.rows.every(row => row.customerId)).toBe(true)
      expect(summary.totalInputTokens + summary.totalOutputTokens).toBeGreaterThan(0)
      expect(summary.totalCostUsd).toBeGreaterThan(0)
      expect(summary.trustInspection?.allowedForSnapshot).toBe(true)
    }
  })

  it('keeps vendor aliases stable for Langfuse-style usage exports', () => {
    const langfuse = importTemplateById('langfuse_usage')
    const summary = parseUsageCsv(langfuse?.sampleCsv ?? '', MODELS)

    expect(summary.rows[0]).toMatchObject({
      customerId: 'cus_heavy',
      feature: 'report_generation',
      modelId: 'claude-sonnet-4.6',
      costSource: 'explicit',
    })
  })

  it('ships a Stripe allowance template that unlocks token policy mapping fields', () => {
    const template = importTemplateById('stripe_allowance')

    expect(template).toMatchObject({
      kind: 'allowance',
      source: 'Stripe',
      requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    })

    const result = parseRevenueCsv(template?.sampleCsv ?? '')

    expect(result.errors).toEqual([])
    expect(Object.keys(result.customerRevenueUsd)).toEqual(['cus_heavy', 'cus_light', 'cus_team'])
    expect(result.customerIncludedTokens).toMatchObject({
      cus_heavy: 100000,
      cus_light: 100000,
      cus_team: 500000,
    })
    expect(result.customerOverageRateUsdPer1kTokens).toMatchObject({
      cus_heavy: 0.18,
      cus_light: 0.18,
      cus_team: 0.12,
    })
  })

  it('keeps templates bounded to report-first demo sources', () => {
    expect(REPORT_FIRST_IMPORT_TEMPLATES).toHaveLength(4)
    expect(REPORT_FIRST_IMPORT_TEMPLATES.some(template => /(^|,)prompt(,|$)/m.test(template.sampleCsv))).toBe(false)
    expect(REPORT_FIRST_IMPORT_TEMPLATES.some(template => /api_key/i.test(template.sampleCsv))).toBe(false)
  })
})
