export interface FrontOperatingOffer {
  id: string
  label: string
  minPriceKrw: number
  maxPriceKrw: number
  purpose: string
}

export const AI_COST_SNAPSHOT_OFFER: FrontOperatingOffer = {
  id: 'ai_cost_snapshot',
  label: 'AI Cost Snapshot',
  minPriceKrw: 300_000,
  maxPriceKrw: 1_000_000,
  purpose: 'one-page report and review call',
}

export const FRONT_OPERATING_OFFER_LADDER: FrontOperatingOffer[] = [
  { id: 'free_fit_check', label: 'Free Fit Check', minPriceKrw: 0, maxPriceKrw: 0, purpose: 'diagnostic fit' },
  { id: 'data_readiness_check', label: 'Data Readiness Check', minPriceKrw: 50_000, maxPriceKrw: 150_000, purpose: 'analysis scope' },
  AI_COST_SNAPSHOT_OFFER,
  { id: 'monthly_ai_cost_review', label: 'Monthly AI Cost Review', minPriceKrw: 300_000, maxPriceKrw: 1_500_000, purpose: 'recurring decision log' },
]
