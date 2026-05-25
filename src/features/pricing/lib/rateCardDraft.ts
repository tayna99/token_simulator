export type RateCardPolicyType = 'usage_cap' | 'credit_pack' | 'overage' | 'hybrid'
export type RateCardStatus = 'draft' | 'approved' | 'pushed_to_billing' | 'failed'
export type BillingConnectorId = 'stripe_billing' | 'metronome'

export interface RateCardDraftInput {
  policyType: RateCardPolicyType
  includedCredits: number
  overagePricePerRequest: number
  capUsdPerCustomer: number
  affectedCustomerCount: number
  marginBasisRefs: string[]
}

export interface RateCardDraft extends RateCardDraftInput {
  status: RateCardStatus
  executionMode: RateCardStatus
  billingExecutable: boolean
  billingConnectorId?: BillingConnectorId
  billingExternalRef?: string
  billingError?: string
  approvedBy?: string
  approvedAt?: string
  pushedAt?: string
  failedAt?: string
  stripeExecutable: boolean
  requiresHumanApproval: true
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function buildRateCardDraft(input: RateCardDraftInput): RateCardDraft {
  return {
    policyType: input.policyType,
    includedCredits: nonNegative(input.includedCredits),
    overagePricePerRequest: nonNegative(input.overagePricePerRequest),
    capUsdPerCustomer: nonNegative(input.capUsdPerCustomer),
    affectedCustomerCount: Math.round(nonNegative(input.affectedCustomerCount)),
    marginBasisRefs: [...input.marginBasisRefs],
    status: 'draft',
    executionMode: 'draft',
    billingExecutable: false,
    stripeExecutable: false,
    requiresHumanApproval: true,
  }
}

export function approveRateCardDraft(input: RateCardDraft, approval: {
  approvedBy: string
  approvedAt?: string
  billingConnectorConfigured?: boolean
  billingConnectorId?: BillingConnectorId
}): RateCardDraft {
  const billingExecutable = approval.billingConnectorConfigured === true
  const connectorId = approval.billingConnectorId ?? 'stripe_billing'
  return {
    ...input,
    status: 'approved',
    executionMode: 'approved',
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt ?? new Date().toISOString(),
    billingConnectorId: billingExecutable ? connectorId : input.billingConnectorId,
    billingExecutable,
    stripeExecutable: billingExecutable && connectorId === 'stripe_billing',
    billingError: undefined,
  }
}

export function markRateCardPushedToBilling(input: RateCardDraft, result: {
  connectorId: BillingConnectorId
  externalRef: string
  pushedAt?: string
}): RateCardDraft {
  return {
    ...input,
    status: 'pushed_to_billing',
    executionMode: 'pushed_to_billing',
    billingExecutable: false,
    stripeExecutable: false,
    billingConnectorId: result.connectorId,
    billingExternalRef: result.externalRef,
    pushedAt: result.pushedAt ?? new Date().toISOString(),
    billingError: undefined,
  }
}

export function markRateCardBillingFailed(input: RateCardDraft, result: {
  connectorId: BillingConnectorId
  error: string
  failedAt?: string
}): RateCardDraft {
  return {
    ...input,
    status: 'failed',
    executionMode: 'failed',
    billingExecutable: false,
    stripeExecutable: false,
    billingConnectorId: result.connectorId,
    billingError: result.error,
    failedAt: result.failedAt ?? new Date().toISOString(),
  }
}
