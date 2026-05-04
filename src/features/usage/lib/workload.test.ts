import { describe, expect, it } from 'vitest'
import { deriveFeatureMixUsage, deriveMonthlyWorkload, type FeatureMixItem, type WorkloadInputs } from './workload'

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

describe('deriveFeatureMixUsage', () => {
  const featureMix: FeatureMixItem[] = [
    {
      id: 'answer',
      name: 'Answer generation',
      requestShare: 0.75,
      avgInputTokensPerRequest: 800,
      avgOutputTokensPerRequest: 120,
      cacheableShare: 0.6,
      batchableShare: 0,
      qualityFloor: 85,
    },
    {
      id: 'audit',
      name: 'Audit summary',
      requestShare: 0.25,
      avgInputTokensPerRequest: 2_000,
      avgOutputTokensPerRequest: 300,
      cacheableShare: 0.2,
      batchableShare: 0.8,
      qualityFloor: 80,
    },
  ]

  it('derives monthly tokens and conditional lever shares from feature mix', () => {
    const result = deriveFeatureMixUsage(10_000, featureMix)

    expect(result.monthlyRequests).toBe(10_000)
    expect(result.monthlyInputTokens).toBe(11_000_000)
    expect(result.monthlyOutputTokens).toBe(1_650_000)
    expect(result.cacheableInputTokens).toBe(4_600_000)
    expect(result.batchableRequests).toBe(2_000)
    expect(result.avgInputTokensPerRequest).toBe(1_100)
    expect(result.avgOutputTokensPerRequest).toBe(165)
    expect(result.cacheableShare).toBeCloseTo(0.418, 3)
    expect(result.batchableShare).toBeCloseTo(0.2, 3)
  })

  it('normalizes feature shares and clamps invalid feature values', () => {
    const result = deriveFeatureMixUsage(100, [
      { ...featureMix[0], requestShare: 3, avgInputTokensPerRequest: Number.NaN },
      { ...featureMix[1], requestShare: 1, avgOutputTokensPerRequest: -20, cacheableShare: 2 },
    ])

    expect(result.monthlyRequests).toBe(100)
    expect(result.monthlyInputTokens).toBe(50_000)
    expect(result.monthlyOutputTokens).toBe(9_000)
    expect(result.cacheableShare).toBe(1)
  })
})
