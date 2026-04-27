import { describe, expect, it } from 'vitest'
import { deriveMonthlyWorkload, type WorkloadInputs } from './workload'

describe('deriveMonthlyWorkload', () => {
  it('derives monthly volume from requests per day', () => {
    const inputs: WorkloadInputs = {
      volumeBasis: 'requestsPerDay',
      activeDaysPerMonth: 20,
      retryRate: 0.1,
      requestsPerDay: 1_000,
      activeUsers: 0,
      requestsPerUserPerDay: 0,
      avgInputTokensPerRequest: 2_000,
      avgOutputTokensPerRequest: 500,
    }

    expect(deriveMonthlyWorkload(inputs)).toEqual({
      monthlyRequests: 22_000,
      monthlyInputTokens: 44_000_000,
      monthlyOutputTokens: 11_000_000,
    })
  })

  it('derives monthly volume from active users', () => {
    const inputs: WorkloadInputs = {
      volumeBasis: 'activeUsers',
      activeDaysPerMonth: 30,
      retryRate: 0,
      requestsPerDay: 0,
      activeUsers: 500,
      requestsPerUserPerDay: 4,
      avgInputTokensPerRequest: 1_000,
      avgOutputTokensPerRequest: 250,
    }

    expect(deriveMonthlyWorkload(inputs)).toEqual({
      monthlyRequests: 60_000,
      monthlyInputTokens: 60_000_000,
      monthlyOutputTokens: 15_000_000,
    })
  })

  it('clamps invalid and negative values to zero', () => {
    const inputs: WorkloadInputs = {
      volumeBasis: 'requestsPerDay',
      activeDaysPerMonth: Number.NaN,
      retryRate: -1,
      requestsPerDay: -100,
      activeUsers: -1,
      requestsPerUserPerDay: Number.POSITIVE_INFINITY,
      avgInputTokensPerRequest: -10,
      avgOutputTokensPerRequest: Number.NaN,
    }

    expect(deriveMonthlyWorkload(inputs)).toEqual({
      monthlyRequests: 0,
      monthlyInputTokens: 0,
      monthlyOutputTokens: 0,
    })
  })
})
