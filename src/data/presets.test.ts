import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import { deriveMonthlyWorkload } from '../lib/workload'

describe('PRESETS', () => {
  it('defines coding-agent in workload terms', () => {
    const preset = PRESETS.find(p => p.id === 'coding-agent')

    expect(preset?.workload).toEqual({
      volumeBasis: 'activeUsers',
      activeDaysPerMonth: 25,
      retryRate: 0,
      requestsPerDay: 0,
      activeUsers: 500,
      requestsPerUserPerDay: 40,
      avgInputTokensPerRequest: 60,
      avgOutputTokensPerRequest: 10,
    })
    expect(preset?.defaultCacheHitRate).toBe(0.4)
    expect(preset?.defaultBatchEnabled).toBe(false)
    expect(deriveMonthlyWorkload(preset!.workload).monthlyRequests).toBe(500_000)
  })
})
