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

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
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
