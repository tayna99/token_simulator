export type VolumeBasis = 'requestsPerDay' | 'activeUsers'
export type InputMode = 'workload' | 'directTokens'

export interface WorkloadInputs {
  volumeBasis: VolumeBasis
  activeDaysPerMonth: number
  retryRate: number
  requestsPerDay: number
  activeUsers: number
  requestsPerUserPerDay: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
}

export interface DirectTokenInputs {
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests: number
}

export interface DerivedWorkload {
  monthlyRequests: number
  monthlyInputTokens: number
  monthlyOutputTokens: number
}

export interface FeatureMixItem {
  id: string
  name: string
  requestShare: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheableShare: number
  batchableShare: number
  qualityFloor: number
}

export interface DerivedFeatureMixUsage extends DerivedWorkload {
  cacheableInputTokens: number
  batchableRequests: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheableShare: number
  batchableShare: number
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function finiteRatio(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

export function deriveMonthlyWorkload(inputs: WorkloadInputs): DerivedWorkload {
  const activeDaysPerMonth = finiteNonNegative(inputs.activeDaysPerMonth)
  const retryRate = finiteNonNegative(inputs.retryRate)
  const avgInputTokensPerRequest = finiteNonNegative(inputs.avgInputTokensPerRequest)
  const avgOutputTokensPerRequest = finiteNonNegative(inputs.avgOutputTokensPerRequest)

  const dailyRequests = inputs.volumeBasis === 'activeUsers'
    ? finiteNonNegative(inputs.activeUsers) * finiteNonNegative(inputs.requestsPerUserPerDay)
    : finiteNonNegative(inputs.requestsPerDay)

  const monthlyRequests = Math.round(dailyRequests * activeDaysPerMonth * (1 + retryRate))

  return {
    monthlyRequests,
    monthlyInputTokens: Math.round(monthlyRequests * avgInputTokensPerRequest),
    monthlyOutputTokens: Math.round(monthlyRequests * avgOutputTokensPerRequest),
  }
}

export function deriveFeatureMixUsage(monthlyRequestInput: number, featureMix: FeatureMixItem[]): DerivedFeatureMixUsage {
  const monthlyRequests = Math.round(finiteNonNegative(monthlyRequestInput))
  const totalShare = featureMix.reduce((sum, feature) => sum + finiteNonNegative(feature.requestShare), 0)

  if (monthlyRequests === 0 || totalShare === 0) {
    return {
      monthlyRequests,
      monthlyInputTokens: 0,
      monthlyOutputTokens: 0,
      cacheableInputTokens: 0,
      batchableRequests: 0,
      avgInputTokensPerRequest: 0,
      avgOutputTokensPerRequest: 0,
      cacheableShare: 0,
      batchableShare: 0,
    }
  }

  const totals = featureMix.reduce((acc, feature) => {
    const normalizedShare = finiteNonNegative(feature.requestShare) / totalShare
    const featureRequests = monthlyRequests * normalizedShare
    const inputTokens = featureRequests * finiteNonNegative(feature.avgInputTokensPerRequest)
    const outputTokens = featureRequests * finiteNonNegative(feature.avgOutputTokensPerRequest)

    acc.monthlyInputTokens += inputTokens
    acc.monthlyOutputTokens += outputTokens
    acc.cacheableInputTokens += inputTokens * finiteRatio(feature.cacheableShare)
    acc.batchableRequests += featureRequests * finiteRatio(feature.batchableShare)
    return acc
  }, {
    monthlyInputTokens: 0,
    monthlyOutputTokens: 0,
    cacheableInputTokens: 0,
    batchableRequests: 0,
  })

  const monthlyInputTokens = Math.round(totals.monthlyInputTokens)
  const monthlyOutputTokens = Math.round(totals.monthlyOutputTokens)
  const cacheableInputTokens = Math.round(totals.cacheableInputTokens)
  const batchableRequests = Math.round(totals.batchableRequests)

  return {
    monthlyRequests,
    monthlyInputTokens,
    monthlyOutputTokens,
    cacheableInputTokens,
    batchableRequests,
    avgInputTokensPerRequest: Math.round(monthlyInputTokens / monthlyRequests),
    avgOutputTokensPerRequest: Math.round(monthlyOutputTokens / monthlyRequests),
    cacheableShare: monthlyInputTokens > 0 ? cacheableInputTokens / monthlyInputTokens : 0,
    batchableShare: batchableRequests / monthlyRequests,
  }
}
