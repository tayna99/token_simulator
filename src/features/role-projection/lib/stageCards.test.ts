import { describe, expect, it } from 'vitest'
import { COST_STAGE_CARDS, orderCardsForRole, splitCardsByRoleAffinity } from './stageCards'

describe('stage card role affinity', () => {
  it('orders cost stage cards by role affinity with stable tie order', () => {
    expect(orderCardsForRole(COST_STAGE_CARDS, 'developer').map(card => card.key)).toEqual([
      'operational_signals',
      'cost_attribution',
      'margin_risk',
    ])
    expect(orderCardsForRole(COST_STAGE_CARDS, 'pm').map(card => card.key)).toEqual([
      'cost_attribution',
      'margin_risk',
      'operational_signals',
    ])
    expect(orderCardsForRole(COST_STAGE_CARDS, 'ceo').map(card => card.key)).toEqual([
      'margin_risk',
      'cost_attribution',
      'operational_signals',
    ])
  })

  it('splits low-affinity cards into an auxiliary section for the active role', () => {
    expect(splitCardsByRoleAffinity(COST_STAGE_CARDS, 'developer')).toMatchObject({
      primary: [{ key: 'operational_signals' }, { key: 'cost_attribution' }],
      auxiliary: [{ key: 'margin_risk' }],
    })
    expect(splitCardsByRoleAffinity(COST_STAGE_CARDS, 'pm')).toMatchObject({
      primary: [{ key: 'cost_attribution' }, { key: 'margin_risk' }],
      auxiliary: [{ key: 'operational_signals' }],
    })
    expect(splitCardsByRoleAffinity(COST_STAGE_CARDS, 'ceo')).toMatchObject({
      primary: [{ key: 'margin_risk' }, { key: 'cost_attribution' }],
      auxiliary: [{ key: 'operational_signals' }],
    })
  })
})
