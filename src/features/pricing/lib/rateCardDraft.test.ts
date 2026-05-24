import { describe, expect, it } from 'vitest'
import { buildRateCardDraft } from './rateCardDraft'

describe('buildRateCardDraft', () => {
  it('builds a draft-only rate card grounded in deterministic margin refs', () => {
    const draft = buildRateCardDraft({
      policyType: 'usage_cap',
      includedCredits: 2500,
      overagePricePerRequest: 0.08,
      capUsdPerCustomer: 149,
      affectedCustomerCount: 7,
      marginBasisRefs: ['tool:margin.plan.pro', 'basis:rule:gross_margin_thin_pct'],
    })

    expect(draft).toMatchObject({
      policyType: 'usage_cap',
      executionMode: 'draft_only',
      affectedCustomerCount: 7,
    })
    expect(draft.marginBasisRefs).toEqual(['tool:margin.plan.pro', 'basis:rule:gross_margin_thin_pct'])
  })

  it('never creates an executable billing artifact', () => {
    const draft = buildRateCardDraft({
      policyType: 'credit_pack',
      includedCredits: 1000,
      overagePricePerRequest: 0.05,
      capUsdPerCustomer: 99,
      affectedCustomerCount: 3,
      marginBasisRefs: ['tool:grossMarginPct'],
    })

    expect(draft.executionMode).toBe('draft_only')
    expect(draft.stripeExecutable).toBe(false)
    expect(draft.requiresHumanApproval).toBe(true)
  })
})
