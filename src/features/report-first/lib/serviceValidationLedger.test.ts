import { describe, expect, it } from 'vitest'

import { evaluateServiceValidationLead, summarizeWeeklyServiceValidationRows } from './serviceValidationLedger'

describe('evaluateServiceValidationLead', () => {
  const baseLead = {
    leadId: 'lead-001',
    icpGrade: 'A',
    offeredPriceKrw: 500000,
    acceptedPriceKrw: 0,
    dataSharingIntent: 'yes',
    reportSharingIntent: 'yes',
    priceOrLimitDecisionIntent: 'yes',
    repeatReportRequestSignal: 'no',
    dominantRequestType: 'service_report',
  } as const

  it('marks a lead invalid when trust-safe export is impossible', () => {
    const row = evaluateServiceValidationLead({
      ...baseLead,
      trustSafeExportPossible: false,
    })

    expect(row.verdict).toBe('invalid')
    expect(row.reasons).toContain('trust-safe export is not possible without raw prompt, API key, or PII')
    expect(row.recommendedNextAction).toBe('Do not count this lead in Service MVP validation; redesign intake around prompt-free metadata export.')
  })

  it('passes a lead when a repeat monthly or quarterly service report is requested', () => {
    const monthlyRow = evaluateServiceValidationLead({
      ...baseLead,
      repeatReportRequestSignal: 'monthly',
      dominantRequestType: 'broad_saas_feature',
    })
    const quarterlyRow = evaluateServiceValidationLead({
      ...baseLead,
      repeatReportRequestSignal: 'quarterly',
      dominantRequestType: 'data_readiness',
    })

    expect(monthlyRow.verdict).toBe('pass')
    expect(monthlyRow.reasons).toContain('repeat service report requested monthly')
    expect(quarterlyRow.verdict).toBe('pass')
    expect(quarterlyRow.reasons).toContain('repeat service report requested quarterly')
  })

  it('passes an A-grade ICP lead that accepts a paid service report', () => {
    const row = evaluateServiceValidationLead({
      ...baseLead,
      acceptedPriceKrw: 300000,
    })

    expect(row.verdict).toBe('pass')
    expect(row.reasons).toContain('A-grade ICP accepted a paid service report')
    expect(row.recommendedNextAction).toBe('Schedule delivery, attach review-call notes, and ask whether the next report should be monthly or quarterly.')
  })

  it('conditionally passes one paid lead when at least two validation intents are yes or conditional', () => {
    const row = evaluateServiceValidationLead({
      ...baseLead,
      icpGrade: 'B',
      acceptedPriceKrw: 300000,
      dataSharingIntent: 'conditional',
      reportSharingIntent: 'yes',
      priceOrLimitDecisionIntent: 'no',
    })

    expect(row.verdict).toBe('conditional_pass')
    expect(row.reasons).toContain('paid report accepted with 2 of 3 validation intents')
    expect(row.recommendedNextAction).toBe('Deliver the paid report and use the review call to confirm repeat cadence and missing intent.')
  })

  it('fails broad product, data-readiness, or sample-only requests without paid or repeat report demand', () => {
    const broadRow = evaluateServiceValidationLead({
      ...baseLead,
      dominantRequestType: 'broad_saas_feature',
    })
    const dataReadinessRow = evaluateServiceValidationLead({
      ...baseLead,
      dominantRequestType: 'data_readiness',
    })
    const sampleRow = evaluateServiceValidationLead({
      ...baseLead,
      dominantRequestType: 'sample_only',
    })

    expect(broadRow.verdict).toBe('fail')
    expect(broadRow.reasons).toContain('broad_saas_feature request without paid or repeat service report demand')
    expect(dataReadinessRow.verdict).toBe('fail')
    expect(sampleRow.verdict).toBe('fail')
  })

  it('fails otherwise when no paid, repeat, or service-report validation signal is present', () => {
    const row = evaluateServiceValidationLead({
      ...baseLead,
      icpGrade: 'C',
      dataSharingIntent: 'conditional',
      reportSharingIntent: 'no',
      priceOrLimitDecisionIntent: 'yes',
    })

    expect(row.verdict).toBe('fail')
    expect(row.reasons).toContain('no paid report, repeat cadence, or A-grade paid service-report signal')
  })
})

describe('summarizeWeeklyServiceValidationRows', () => {
  it('counts verdicts and repeat report request signals', () => {
    const rows = [
      evaluateServiceValidationLead({
        leadId: 'lead-pass-monthly',
        icpGrade: 'B',
        offeredPriceKrw: 500000,
        acceptedPriceKrw: 0,
        dataSharingIntent: 'yes',
        reportSharingIntent: 'yes',
        priceOrLimitDecisionIntent: 'yes',
        repeatReportRequestSignal: 'monthly',
        dominantRequestType: 'service_report',
      }),
      evaluateServiceValidationLead({
        leadId: 'lead-conditional',
        icpGrade: 'B',
        offeredPriceKrw: 500000,
        acceptedPriceKrw: 300000,
        dataSharingIntent: 'yes',
        reportSharingIntent: 'conditional',
        priceOrLimitDecisionIntent: 'no',
        repeatReportRequestSignal: 'one_more_after_change',
        dominantRequestType: 'service_report',
      }),
      evaluateServiceValidationLead({
        leadId: 'lead-fail',
        icpGrade: 'C',
        offeredPriceKrw: 500000,
        acceptedPriceKrw: 0,
        dataSharingIntent: 'yes',
        reportSharingIntent: 'conditional',
        priceOrLimitDecisionIntent: 'yes',
        repeatReportRequestSignal: 'no',
        dominantRequestType: 'sample_only',
      }),
      evaluateServiceValidationLead({
        leadId: 'lead-invalid',
        icpGrade: 'A',
        offeredPriceKrw: 500000,
        acceptedPriceKrw: 300000,
        dataSharingIntent: 'yes',
        reportSharingIntent: 'yes',
        priceOrLimitDecisionIntent: 'yes',
        repeatReportRequestSignal: 'quarterly',
        dominantRequestType: 'service_report',
        trustSafeExportPossible: false,
      }),
    ]

    expect(summarizeWeeklyServiceValidationRows(rows)).toEqual({
      pass: 1,
      conditional_pass: 1,
      fail: 1,
      invalid: 1,
      repeatReportRequests: 3,
    })
  })
})
