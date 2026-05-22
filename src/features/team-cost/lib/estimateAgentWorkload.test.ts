import { describe, expect, it } from 'vitest'
import { getModelById } from '../../alternatives/data/models'
import { estimateAgentWorkload, summarizeTeamCost } from './estimateAgentWorkload'

describe('estimateAgentWorkload', () => {
  it('derives monthly tokens from agent I/O and delegates to calculateCost pricing', () => {
    const model = getModelById('claude-sonnet-4.6')
    if (!model) throw new Error('missing model')

    const result = estimateAgentWorkload({
      spec: {
        id: 'agent-research',
        role: 'Research Agent',
        modelId: model.id,
        inputs: [{ id: 'i1', name: 'Interview', kind: 'interview', estTokens: 8000, reusedEachRun: false, size: 'long' }],
        outputs: [{ id: 'o1', name: 'Research brief', kind: 'brief', estTokens: 3000, reusedEachRun: false, size: 'medium' }],
        callsPerRun: 2,
        retryRate: 0.1,
        cacheHitRate: 0,
        batchEnabled: false,
        humanReviewGate: 'sample',
        assignedTasks: ['customer interview analysis'],
        frequency: { unit: 'week', count: 5 },
      },
      model,
    })

    expect(result.monthlyInputTokens).toBe(352000)
    expect(result.monthlyOutputTokens).toBe(132000)
    expect(result.monthlyRequests).toBe(44)
    expect(result.cost.monthlyCost).toBeGreaterThan(0)
  })

  it('summarizes team total cost and top agent share', () => {
    const summary = summarizeTeamCost([
      { agentId: 'a', role: 'A', modelId: 'm', monthlyInputTokens: 1, monthlyOutputTokens: 1, monthlyRequests: 1, cacheSavingsUsd: 0, batchSavingsUsd: 0, cost: { monthlyCost: 80 } },
      { agentId: 'b', role: 'B', modelId: 'm', monthlyInputTokens: 1, monthlyOutputTokens: 1, monthlyRequests: 1, cacheSavingsUsd: 0, batchSavingsUsd: 0, cost: { monthlyCost: 20 } },
    ])

    expect(summary.monthlyCostUsd).toBe(100)
    expect(summary.topAgentId).toBe('a')
    expect(summary.topAgentShare).toBe(0.8)
  })

  it('applies cache savings only to reusable input artifacts', () => {
    const model = getModelById('claude-sonnet-4.6')
    if (!model) throw new Error('missing model')

    const baseSpec = {
      id: 'agent-engineering',
      role: 'Engineering Agent',
      modelId: model.id,
      inputs: [{ id: 'context', name: 'Codebase context', kind: 'code', estTokens: 12000, reusedEachRun: false, size: 'long' as const }],
      outputs: [{ id: 'plan', name: 'Plan', kind: 'plan', estTokens: 2000, reusedEachRun: false, size: 'medium' as const }],
      callsPerRun: 3,
      retryRate: 0,
      cacheHitRate: 0.7,
      batchEnabled: false,
      humanReviewGate: 'sample' as const,
      assignedTasks: ['code implementation'],
      frequency: { unit: 'month' as const, count: 10 },
    }

    const uncached = estimateAgentWorkload({ spec: baseSpec, model })
    const cached = estimateAgentWorkload({
      spec: {
        ...baseSpec,
        inputs: baseSpec.inputs.map(input => ({ ...input, reusedEachRun: true })),
      },
      model,
    })

    expect(cached.cost.monthlyCost).toBeLessThan(uncached.cost.monthlyCost)
    expect(cached.cacheSavingsUsd).toBeGreaterThan(0)
  })
})
