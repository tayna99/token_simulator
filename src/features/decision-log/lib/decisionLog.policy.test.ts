import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLD_POLICY, factSourceSnapshotFromModels } from '../../metrics/lib/thresholdPolicy'
import { MODELS } from '../../alternatives/data/models'
import { createDecision, normalizeDecisionRecord } from './decisionLog'

describe('decision log policy snapshots', () => {
  it('stores the threshold and official fact-source snapshot used by the decision', () => {
    const decision = createDecision({
      what: 'Adopt cache policy for repeated codebase context',
      why: 'Large reusable context is above the rule threshold.',
      assumptions: {},
      toolResultRefs: ['tool:team.monthlyCostUsd'],
      riskCards: ['risk-cache-staleness'],
      status: 'adopted',
      thresholdSnapshot: DEFAULT_THRESHOLD_POLICY,
      factSourceSnapshot: factSourceSnapshotFromModels(MODELS.slice(0, 1), '2026-05-23'),
      aiMode: 'deterministic_fallback',
    })

    expect(decision.thresholdSnapshot.gross_margin_thin_pct?.currentValue).toBe(0.4)
    expect(decision.factSourceSnapshot[0]).toMatchObject({
      modelId: MODELS[0].id,
      sourceType: 'official_api_doc',
    })
    expect(decision.aiMode).toBe('deterministic_fallback')
  })

  it('normalizes old records with empty snapshots for backward compatibility', () => {
    const normalized = normalizeDecisionRecord({
      id: 'decision-old',
      kind: 'approve',
      what: 'Old decision',
      why: 'Before policy snapshots existed.',
      assumptions: {},
      toolResultRefs: [],
      riskCards: [],
      status: 'rejected',
      createdAt: '2026-05-01T00:00:00.000Z',
    })

    expect(normalized?.thresholdSnapshot).toEqual({})
    expect(normalized?.factSourceSnapshot).toEqual([])
  })
})
