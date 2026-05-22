import { describe, expect, it } from 'vitest'
import { normalizeFrequencyToMonthlyRuns, sanitizeAgentSpec } from './agentSpec'

describe('AgentSpec', () => {
  it('normalizes weekly and customer denominator frequency to monthly runs', () => {
    expect(normalizeFrequencyToMonthlyRuns({ unit: 'week', count: 5 })).toBe(20)
    expect(normalizeFrequencyToMonthlyRuns({ unit: 'customer', count: 2, denominatorCount: 300 })).toBe(600)
  })

  it('guards negative and NaN spec inputs', () => {
    const spec = sanitizeAgentSpec({
      id: 'agent-test',
      role: 'Test Agent',
      modelId: 'claude-sonnet-4.6',
      inputs: [],
      outputs: [],
      callsPerRun: Number.NaN,
      retryRate: -1,
      cacheHitRate: 2,
      batchEnabled: true,
      humanReviewGate: 'none',
      assignedTasks: [],
      frequency: { unit: 'month', count: -5 },
    })

    expect(spec.callsPerRun).toBe(0)
    expect(spec.retryRate).toBe(0)
    expect(spec.cacheHitRate).toBe(1)
    expect(normalizeFrequencyToMonthlyRuns(spec.frequency)).toBe(0)
  })
})
