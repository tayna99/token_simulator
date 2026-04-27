import { describe, expect, it } from 'vitest'
import { MODELS } from '../data/models'
import { getDerivedMonthlyUsage, toLegacySimState, type PlannerState } from './plannerState'

const BASE: PlannerState = {
  role: 'developer',
  currentModel: MODELS[0],
  candidateModel: MODELS[1],
  inputMode: 'workload',
  workload: {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 30,
    retryRate: 0,
    requestsPerDay: 1_000,
    activeUsers: 0,
    requestsPerUserPerDay: 0,
    avgInputTokensPerRequest: 1_000,
    avgOutputTokensPerRequest: 100,
  },
  directTokens: {
    monthlyInputTokens: 99,
    monthlyOutputTokens: 88,
    monthlyRequests: 77,
  },
  cacheHitRate: 0.5,
  batchEnabled: false,
  monthlyBudgetUsd: null,
}

describe('planner state selectors', () => {
  it('returns derived workload totals in workload mode', () => {
    expect(getDerivedMonthlyUsage(BASE)).toEqual({
      monthlyRequests: 30_000,
      monthlyInputTokens: 30_000_000,
      monthlyOutputTokens: 3_000_000,
    })
  })

  it('returns direct token totals in direct token mode', () => {
    expect(getDerivedMonthlyUsage({ ...BASE, inputMode: 'directTokens' })).toEqual({
      monthlyRequests: 77,
      monthlyInputTokens: 99,
      monthlyOutputTokens: 88,
    })
  })

  it('creates a legacy state for existing panels', () => {
    const legacy = toLegacySimState(BASE)
    expect(legacy.periodInputTokens).toBe(30_000_000)
    expect(legacy.periodOutputTokens).toBe(3_000_000)
    expect(legacy.monthlyRequests).toBe(30_000)
  })
})
