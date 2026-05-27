import { describe, expect, it } from 'vitest'
import { buildModelPerformanceMatrix, routingGateForMatrixRow } from './modelPerformanceMatrix'

const models = [
  {
    id: 'expensive-model',
    name: 'Expensive Model',
    contextWindow: 128_000,
    modalities: ['text' as const],
    outputModalities: ['text' as const],
  },
  {
    id: 'cheap-model',
    name: 'Cheap Model',
    contextWindow: 32_000,
    modalities: ['text' as const],
    outputModalities: ['text' as const],
  },
]

describe('modelPerformanceMatrix', () => {
  it('does not invent quality scores when no benchmark exists', () => {
    const rows = buildModelPerformanceMatrix({
      models,
      benchmarkRecords: [],
      taskProfiles: [{
        taskType: 'report_generation',
        requiredInputModalities: ['text'],
        requiredOutputModalities: ['text'],
        minContextTokens: 16_000,
        qualityFloor: 0.86,
      }],
      capturedAt: '2026-05-28T00:00:00.000Z',
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      evidenceStatus: 'baseline_unavailable',
      decisionAuthority: 'review_only',
      evidenceRefs: [],
      normalizedQualityScore: null,
    })
    expect(JSON.stringify(rows)).not.toMatch(/average|peerAverage|mean/i)
  })

  it('keeps third-party benchmark rows review-gated until verified', () => {
    const rows = buildModelPerformanceMatrix({
      models,
      benchmarkRecords: [{
        id: 'bench-cheap-routing',
        modelIds: ['cheap-model'],
        taskTags: ['routing', 'classification'],
        metricKinds: ['quality', 'latency'],
        benchmarkSuite: ['arena_elo'],
        sourceRefs: ['evidence:lmarena-leaderboard'],
        reviewStatus: 'needs_review',
        qualityBasis: 'third_party_benchmark',
      }],
      taskProfiles: [{
        taskType: 'classification',
        requiredInputModalities: ['text'],
        requiredOutputModalities: ['text'],
        minContextTokens: 4_000,
        qualityFloor: 0.75,
      }],
      capturedAt: '2026-05-28T00:00:00.000Z',
    })

    const cheap = rows.find(row => row.modelId === 'cheap-model')
    expect(cheap).toMatchObject({
      evidenceStatus: 'needs_review',
      qualityBasis: 'third_party_benchmark',
      decisionAuthority: 'validation_required',
      evidenceRefs: ['evidence:lmarena-leaderboard'],
    })
  })

  it('allows routing only with verified evidence and task fit', () => {
    const [row] = buildModelPerformanceMatrix({
      models: [models[1]],
      benchmarkRecords: [{
        id: 'internal-eval-cheap-classification',
        modelIds: ['cheap-model'],
        taskTags: ['classification'],
        metricKinds: ['quality'],
        benchmarkSuite: ['customer_eval'],
        sourceRefs: ['evidence:internal-eval-cheap-classification'],
        reviewStatus: 'verified',
        qualityBasis: 'internal_eval',
      }],
      taskProfiles: [{
        taskType: 'classification',
        requiredInputModalities: ['text'],
        requiredOutputModalities: ['text'],
        minContextTokens: 4_000,
        qualityFloor: 0.75,
      }],
      capturedAt: '2026-05-28T00:00:00.000Z',
    })

    expect(row.decisionAuthority).toBe('routing_allowed')
    expect(routingGateForMatrixRow(row)).toEqual({
      allowed: true,
      status: 'routing_allowed',
      warnings: [],
      refs: ['evidence:internal-eval-cheap-classification'],
    })
  })
})
