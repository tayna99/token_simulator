import { describe, expect, it } from 'vitest'
import { RISK_CARDS, retrieveRiskCards } from './riskCards'

describe('retrieveRiskCards', () => {
  it('contains the P0 minimum corpus with evidence metadata', () => {
    expect(RISK_CARDS.length).toBeGreaterThanOrEqual(10)
    expect(RISK_CARDS.every(card => card.evidenceId.startsWith('GR-'))).toBe(true)
  })

  it('returns deterministic risk cards for matching recommendation tags', () => {
    const first = retrieveRiskCards(['credit', 'overage'])
    const second = retrieveRiskCards(['overage', 'credit'])

    expect(first.map(card => card.id)).toEqual(second.map(card => card.id))
    expect(first[0]).toMatchObject({
      id: 'risk-credit-confusion',
      severity: 'medium',
    })
  })

  it('matches model-routing risks independently from pricing risks', () => {
    const result = retrieveRiskCards(['model-switch'])

    expect(result.some(card => card.id === 'risk-model-routing-quality')).toBe(true)
  })
})
