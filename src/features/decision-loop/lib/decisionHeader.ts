import type { PricingFreshnessState } from '../../facts/lib/pricingFreshness'

export type DecisionChoice = 'adopt' | 'reject' | 'hold'

export interface DecisionHeaderInput {
  recommendationTitle: string
  monthlySavingsUsd: number
  riskCardIds: string[]
  pricingFreshnessState: PricingFreshnessState
}

export interface DecisionHeader {
  title: '오늘 내려야 할 결정'
  question: string
  reason: string
  recommendedChoice: DecisionChoice
  requiredChoices: DecisionChoice[]
}

export function buildDecisionHeader(input: DecisionHeaderInput): DecisionHeader {
  const hasPricingRisk = input.pricingFreshnessState === 'source_changed' || input.pricingFreshnessState === 'tbd'
  const recommendedChoice: DecisionChoice = hasPricingRisk ? 'hold' : 'adopt'
  const reason = hasPricingRisk
    ? 'pricing source changed or official pricing is not ready; hold until the fact ledger is rechecked.'
    : 'deterministic savings and risk refs are ready for a human operating decision.'

  return {
    title: '오늘 내려야 할 결정',
    question: `${input.recommendationTitle} 결정을 내릴까요?`,
    reason,
    recommendedChoice,
    requiredChoices: ['adopt', 'reject', 'hold'],
  }
}
