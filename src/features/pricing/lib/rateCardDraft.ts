export type RateCardPolicyType = 'usage_cap' | 'credit_pack' | 'overage' | 'hybrid'

export interface RateCardDraftInput {
  policyType: RateCardPolicyType
  includedCredits: number
  overagePricePerRequest: number
  capUsdPerCustomer: number
  affectedCustomerCount: number
  marginBasisRefs: string[]
}

export interface RateCardDraft extends RateCardDraftInput {
  executionMode: 'draft_only'
  stripeExecutable: false
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
    executionMode: 'draft_only',
    stripeExecutable: false,
    requiresHumanApproval: true,
  }
}
