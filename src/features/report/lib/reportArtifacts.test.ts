import { describe, expect, it } from 'vitest'
import { buildReportArtifact } from './reportArtifacts'

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
})
