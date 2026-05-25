import { describe, expect, it } from 'vitest'
import {
  BOTTLENECK_STAGE_CARDS,
  COST_STAGE_CARDS,
  DECISION_LOG_STAGE_CARDS,
  DESIGN_STAGE_CARDS,
  OPTIMIZE_STAGE_CARDS,
  buildRoleWorkspaceLayout,
  orderCardsForRole,
  splitCardsByRoleAffinity,
} from './stageCards'

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

  it('reorders optimize stage cards per role and collapses low-affinity cards', () => {
    expect(orderCardsForRole(OPTIMIZE_STAGE_CARDS, 'developer').map(card => card.key)).toEqual([
      'optimization_review',
      'pricing_simulator',
      'report_output',
    ])
    expect(splitCardsByRoleAffinity(OPTIMIZE_STAGE_CARDS, 'developer')).toMatchObject({
      primary: [{ key: 'optimization_review' }],
      auxiliary: [{ key: 'pricing_simulator' }, { key: 'report_output' }],
    })
    expect(splitCardsByRoleAffinity(OPTIMIZE_STAGE_CARDS, 'pm')).toMatchObject({
      primary: [{ key: 'pricing_simulator' }, { key: 'optimization_review' }, { key: 'report_output' }],
      auxiliary: [],
    })
    expect(splitCardsByRoleAffinity(OPTIMIZE_STAGE_CARDS, 'ceo')).toMatchObject({
      primary: [{ key: 'pricing_simulator' }, { key: 'report_output' }],
      auxiliary: [{ key: 'optimization_review' }],
    })
  })

  it('reorders decision-log stage cards per role and collapses low-affinity cards', () => {
    expect(splitCardsByRoleAffinity(DECISION_LOG_STAGE_CARDS, 'developer')).toMatchObject({
      primary: [{ key: 'operating_ledger' }, { key: 'decision_log' }],
      auxiliary: [{ key: 'one_page_report' }],
    })
    expect(splitCardsByRoleAffinity(DECISION_LOG_STAGE_CARDS, 'pm')).toMatchObject({
      primary: [{ key: 'one_page_report' }, { key: 'decision_log' }],
      auxiliary: [{ key: 'operating_ledger' }],
    })
    expect(splitCardsByRoleAffinity(DECISION_LOG_STAGE_CARDS, 'ceo')).toMatchObject({
      primary: [{ key: 'one_page_report' }, { key: 'decision_log' }],
      auxiliary: [{ key: 'operating_ledger' }],
    })
  })

  it('builds role-aware workspace layouts for every decision stage', () => {
    expect(buildRoleWorkspaceLayout({
      stage: 'design',
      role: 'developer',
      audience: 'internal',
      cards: DESIGN_STAGE_CARDS,
    }).primary.map(card => card.key)).toEqual(['import_workflow', 'team_cost_simulator'])

    expect(buildRoleWorkspaceLayout({
      stage: 'design',
      role: 'ceo',
      audience: 'internal',
      cards: DESIGN_STAGE_CARDS,
    }).primary.map(card => card.key)).toEqual(['team_cost_simulator'])

    expect(buildRoleWorkspaceLayout({
      stage: 'bottleneck',
      role: 'developer',
      audience: 'internal',
      cards: BOTTLENECK_STAGE_CARDS,
    }).primary.map(card => card.key)).toEqual(['team_forecast', 'operational_signals'])

    expect(buildRoleWorkspaceLayout({
      stage: 'bottleneck',
      role: 'ceo',
      audience: 'internal',
      cards: BOTTLENECK_STAGE_CARDS,
    }).primary.map(card => card.key)).toEqual(['margin_risk', 'team_forecast'])
  })

  it('hides internal-only cards for customer audience without changing role ordering', () => {
    const internal = buildRoleWorkspaceLayout({
      stage: 'decision-log',
      role: 'developer',
      audience: 'internal',
      cards: DECISION_LOG_STAGE_CARDS,
    })
    const customer = buildRoleWorkspaceLayout({
      stage: 'decision-log',
      role: 'developer',
      audience: 'customer',
      cards: DECISION_LOG_STAGE_CARDS,
    })

    expect(internal.primary.map(card => card.key)).toEqual(['operating_ledger', 'decision_log'])
    expect(customer.primary.map(card => card.key)).toEqual(['decision_log'])
    expect(customer.hiddenForAudience.map(card => card.key)).toEqual(['operating_ledger'])
  })
})
