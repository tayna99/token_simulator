import { describe, expect, it } from 'vitest'
import { approveRateCardDraft, buildRateCardDraft, markRateCardBillingFailed, markRateCardPushedToBilling } from './rateCardDraft'

describe('buildRateCardDraft', () => {
  it('builds a non-executable draft rate card grounded in deterministic margin refs', () => {
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
      status: 'draft',
      executionMode: 'draft',
      affectedCustomerCount: 7,
    })
    expect(draft.marginBasisRefs).toEqual(['tool:margin.plan.pro', 'basis:rule:gross_margin_thin_pct'])
  })

  it('keeps billing execution unavailable until a billing connector is configured', () => {
    const draft = buildRateCardDraft({
      policyType: 'credit_pack',
      includedCredits: 1000,
      overagePricePerRequest: 0.05,
      capUsdPerCustomer: 99,
      affectedCustomerCount: 3,
      marginBasisRefs: ['tool:grossMarginPct'],
    })

    expect(draft.status).toBe('draft')
    expect(draft.executionMode).toBe('draft')
    expect(draft.billingExecutable).toBe(false)
    expect(draft.requiresHumanApproval).toBe(true)
  })

  it('transitions approved rate cards to pushed or failed billing states', () => {
    const draft = buildRateCardDraft({
      policyType: 'usage_cap',
      includedCredits: 2500,
      overagePricePerRequest: 0.08,
      capUsdPerCustomer: 149,
      affectedCustomerCount: 7,
      marginBasisRefs: ['tool:margin.plan.pro'],
    })
    const approved = approveRateCardDraft(draft, {
      approvedBy: 'owner@example.com',
      approvedAt: '2026-05-25T00:00:00.000Z',
      billingConnectorConfigured: true,
    })
    const pushed = markRateCardPushedToBilling(approved, {
      connectorId: 'stripe_billing',
      externalRef: 'stripe:price_123',
      pushedAt: '2026-05-25T00:01:00.000Z',
    })
    const failed = markRateCardBillingFailed(approved, {
      connectorId: 'stripe_billing',
      error: 'connector_timeout',
      failedAt: '2026-05-25T00:02:00.000Z',
    })

    expect(approved).toMatchObject({ status: 'approved', billingExecutable: true })
    expect(pushed).toMatchObject({
      status: 'pushed_to_billing',
      billingConnectorId: 'stripe_billing',
      billingExternalRef: 'stripe:price_123',
    })
    expect(failed).toMatchObject({
      status: 'failed',
      billingConnectorId: 'stripe_billing',
      billingError: 'connector_timeout',
    })
  })
})
