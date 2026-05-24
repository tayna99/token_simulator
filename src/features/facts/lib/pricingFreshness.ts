import type { Model } from '../../../data/models'
import { staleFactSourceWarning } from '../../metrics/lib/thresholdPolicy'

export type PricingFreshnessState = 'verified' | 'estimated' | 'tbd' | 'source_changed'

export interface PricingFreshnessBadgeInput {
  model: Model
  capturedAt: string
  sourceChanged?: boolean
  maxAgeDays?: number
}

export interface PricingFreshnessBadge {
  modelId: string
  state: PricingFreshnessState
  label: 'Verified' | 'Estimated' | 'TBD' | 'Source Changed'
  customerLabel: string
  recheckRequired: boolean
  sourceUrl: string
  lastVerifiedAt: string
}

export function buildPricingFreshnessBadge(input: PricingFreshnessBadgeInput): PricingFreshnessBadge {
  const staleWarning = staleFactSourceWarning(
    input.model.lastVerifiedAt,
    input.capturedAt,
    input.maxAgeDays,
  )
  const tbd = input.model.pricingStatus === 'tbd'
    || input.model.pricingStatus === 'unavailable'
    || input.model.apiPricingAvailable === false
  const estimated = input.model.pricingStatus === 'estimated' || Boolean(staleWarning)

  const state: PricingFreshnessState = input.sourceChanged
    ? 'source_changed'
    : tbd
      ? 'tbd'
      : estimated
        ? 'estimated'
        : 'verified'

  const labels: Record<PricingFreshnessState, PricingFreshnessBadge['label']> = {
    verified: 'Verified',
    estimated: 'Estimated',
    tbd: 'TBD',
    source_changed: 'Source Changed',
  }
  const customerLabels: Record<PricingFreshnessState, string> = {
    verified: `Official price verified on ${input.model.lastVerifiedAt}.`,
    estimated: `Official price should be re-checked before a binding decision.`,
    tbd: `Official API price is not available yet. Add custom pricing before scenario calculation.`,
    source_changed: `Official source changed after this pricing decision. Recheck before relying on it.`,
  }

  return {
    modelId: input.model.id,
    state,
    label: labels[state],
    customerLabel: customerLabels[state],
    recheckRequired: state !== 'verified',
    sourceUrl: input.model.sourceUrl,
    lastVerifiedAt: input.model.lastVerifiedAt,
  }
}

export function decisionNeedsPricingRecheck(input: {
  modelIds: string[]
  changedModelIds: string[]
}): boolean {
  const changed = new Set(input.changedModelIds)
  return input.modelIds.some(modelId => changed.has(modelId))
}
