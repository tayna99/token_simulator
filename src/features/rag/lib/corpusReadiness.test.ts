import { describe, expect, it } from 'vitest'
import { buildCorpusReadinessReport } from './corpusReadiness'

describe('buildCorpusReadinessReport', () => {
  it('keeps C1 Big3 official pricing coverage as registered', () => {
    const report = buildCorpusReadinessReport({
      productionStoreConfigured: true,
      decisionHistoryRecordCount: 1,
      nowIso: '2026-05-25T00:00:00.000Z',
    })

    expect(report.coverageAudit.missingOfficialPricingSourceIds).toEqual([])
    expect(report.coverageAudit.requiredOfficialPricingSourceIds).toEqual([
      'openai-api-pricing',
      'anthropic-claude-pricing',
      'google-gemini-pricing',
    ])
  })

  it('surfaces manual-review corpus sources as needs_review', () => {
    const report = buildCorpusReadinessReport({
      productionStoreConfigured: true,
      decisionHistoryRecordCount: 1,
      nowIso: '2026-05-25T00:00:00.000Z',
    })

    expect(report.items.model_benchmark.status).toBe('needs_review')
    expect(report.items.serving_economics.status).toBe('needs_review')
    expect(report.items.model_benchmark.reviewWarnings.some(warning => warning.startsWith('benchmark_needs_review:'))).toBe(true)
  })

  it('fails closed when production corpus storage is not configured', () => {
    const report = buildCorpusReadinessReport({
      productionStoreConfigured: false,
      decisionHistoryRecordCount: 1,
      nowIso: '2026-05-25T00:00:00.000Z',
    })

    expect(report.status).toBe('unavailable')
    expect(report.items.official_source.status).toBe('unavailable')
  })
})
