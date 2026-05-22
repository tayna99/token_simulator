import { describe, expect, it } from 'vitest'
import { buildAgentToolSnapshot } from './toolContract'

describe('buildAgentToolSnapshot', () => {
  it('stores deterministic fields with stable tool refs', () => {
    const snapshot = buildAgentToolSnapshot({
      monthlyAiCogs: 4820,
      grossMarginPct: 0.68,
      topFeature: 'report_generation',
      lossCustomerCount: 13,
      riskCardIds: ['risk-credit-confusion'],
    })

    expect(snapshot.refs).toEqual([
      'tool:monthlyAiCogs',
      'tool:grossMarginPct',
      'tool:topFeature',
      'tool:lossCustomerCount',
      'tool:riskCardIds',
    ])
    expect(snapshot.values['tool:monthlyAiCogs']).toBe(4820)
  })

  it('drops non-finite numbers before agent interpretation', () => {
    const snapshot = buildAgentToolSnapshot({
      monthlyAiCogs: Number.NaN,
      grossMarginPct: 0.41,
      topFeature: '',
    })

    expect(snapshot.refs).toEqual(['tool:grossMarginPct'])
    expect(snapshot.values['tool:monthlyAiCogs']).toBeUndefined()
  })
})
