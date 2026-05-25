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

export type RateCardExecutionReadinessStatus = 'draft' | 'ready' | 'connector_not_configured' | 'blocked' | 'pushed_to_billing' | 'failed'

export interface RateCardExecutionReadiness {
  status: RateCardExecutionReadinessStatus
  billingExecutable: boolean
  billingConnectorId?: BillingConnectorId
  billingExternalRef?: string
  billingError?: string
  missing: string[]
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

export function buildRateCardExecutionReadiness(input: {
  draft: RateCardDraft
  hasApproval?: boolean
  hasIdempotencyKey?: boolean
  hasRollbackMetadata?: boolean
  hasLedgerRow?: boolean
}): RateCardExecutionReadiness {
  const draft = input.draft
  if (draft.status === 'pushed_to_billing') {
    return {
      status: 'pushed_to_billing',
      billingExecutable: false,
      billingConnectorId: draft.billingConnectorId,
      billingExternalRef: draft.billingExternalRef,
      missing: [],
    }
  }
  if (draft.status === 'failed') {
    return {
      status: 'failed',
      billingExecutable: false,
      billingConnectorId: draft.billingConnectorId,
      billingError: draft.billingError,
      missing: [],
    }
  }
  if (draft.status === 'draft') {
    return {
      status: 'draft',
      billingExecutable: false,
      missing: ['approval'],
    }
  }
  if (!draft.billingExecutable || !draft.billingConnectorId) {
    return {
      status: 'connector_not_configured',
      billingExecutable: false,
      missing: ['billing_connector'],
    }
  }

  const missing = [
    input.hasApproval ? '' : 'approval',
    input.hasIdempotencyKey ? '' : 'idempotency_key',
    input.hasRollbackMetadata ? '' : 'rollback_metadata',
    input.hasLedgerRow ? '' : 'ledger_row',
  ].filter(Boolean)

  return {
    status: missing.length > 0 ? 'blocked' : 'ready',
    billingExecutable: missing.length === 0,
    billingConnectorId: draft.billingConnectorId,
    missing,
  }
}
