import { describe, expect, it } from 'vitest'
import { buildOnePageReportArtifact, buildReportArtifact } from './reportArtifacts'

describe('buildReportArtifact', () => {
  it('builds a board report grounded in tool and risk refs', () => {
    const report = buildReportArtifact({
      audience: 'board',
      toolResultRefs: ['tool:monthlyAiCogs', 'tool:grossMarginPct'],
      riskCardIds: ['risk-credit-confusion'],
      headline: 'Credit pricing protects Pro margin',
    })

    expect(report.audience).toBe('board')
    expect(report.toolResultRefs).toContain('tool:monthlyAiCogs')
    expect(report.riskCardIds).toEqual(['risk-credit-confusion'])
    expect(report.sections.some(section => section.title === 'Risk')).toBe(true)
  })

  it('creates all four P0 audiences without inventing numbers', () => {
    const audiences = ['developer', 'pm', 'ceo_cfo', 'board'] as const
    const reports = audiences.map(audience => buildReportArtifact({
      audience,
      toolResultRefs: ['tool:monthlyAiCogs'],
      riskCardIds: [],
      headline: 'Tool-grounded report',
    }))

    expect(reports.map(report => report.audience)).toEqual([...audiences])
    expect(reports.every(report => report.sections[0].body.includes('tool:monthlyAiCogs'))).toBe(true)
  })

  it('includes operating asset health in the one-page report artifact', () => {
    const report = buildReportArtifact({
      audience: 'ceo_cfo',
      toolResultRefs: ['tool:monthlyAiCogs'],
      riskCardIds: ['risk-price-staleness'],
      headline: 'Operating assets are ready for review',
      operatingAssetHealth: [
        'provider_registry: stale fact source warning',
        'usage_schema_mapping: needs_mapping',
      ],
    })

    expect(report.sections.some(section => (
      section.title === 'Operating asset health'
      && section.body.includes('provider_registry')
      && section.body.includes('usage_schema_mapping')
    ))).toBe(true)
  })

  it('includes trust, formula, provider source, and snapshot metadata in the one-page report', () => {
    const report = buildOnePageReportArtifact({
      title: 'SparkClaw AI Cost Snapshot',
      executiveSummary: 'AI COGS is concentrated in summarization.',
      metrics: [{ label: 'AI COGS', value: '$612' }],
      recommendations: ['Route short summaries to a cheaper model after A/B validation.'],
      risks: ['Quality regression requires human review.'],
      refs: ['tool:monthlyAiCogs', 'snapshot:cost:abc'],
      trust: {
        status: 'ready',
        dataLimitations: ['raw prompt was not collected'],
        retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      },
      formulaVersion: 'cost_formula_v0.3',
      providerRegistryVersion: 'provider_registry_v0.4',
    })

    expect(report.markdown).toContain('Trust and data handling')
    expect(report.markdown).toContain('cost_formula_v0.3')
    expect(report.markdown).toContain('provider_registry_v0.4')
    expect(report.markdown).toContain('tool:monthlyAiCogs')
  })

  it('includes decision choice, draft-only rate card, and pricing freshness in the one-page report', () => {
    const report = buildOnePageReportArtifact({
      title: 'SparkClaw AI Cost Snapshot',
      executiveSummary: 'The operating team reviewed the recommendation.',
      metrics: [{ label: 'AI COGS', value: '$612' }],
      recommendations: ['Hold until pricing source is rechecked.'],
      risks: ['Official source changed.'],
      refs: ['tool:margin.plan.pro'],
      trust: {
        status: 'ready',
        dataLimitations: [],
        retentionNote: 'No raw prompt stored.',
      },
      formulaVersion: 'cost_formula_v0.3',
      providerRegistryVersion: 'provider_registry_v0.4',
      decisionChoice: 'hold',
      rateCardDraft: {
        policyType: 'usage_cap',
        includedCredits: 2500,
        overagePricePerRequest: 0.08,
        capUsdPerCustomer: 149,
        affectedCustomerCount: 7,
        marginBasisRefs: ['tool:margin.plan.pro'],
        executionMode: 'draft_only',
        stripeExecutable: false,
        requiresHumanApproval: true,
      },
      pricingFreshness: [{
        modelId: 'gemini-3.5-flash',
        state: 'source_changed',
        label: 'Source Changed',
        customerLabel: 'Official source changed after this pricing decision. Recheck before relying on it.',
        recheckRequired: true,
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
        lastVerifiedAt: '2026-05-24',
      }],
    })

    expect(report.markdown).toContain('Decision choice: hold')
    expect(report.markdown).toContain('Rate-card draft')
    expect(report.markdown).toContain('draft_only')
    expect(report.markdown).toContain('Source Changed')
  })
})
