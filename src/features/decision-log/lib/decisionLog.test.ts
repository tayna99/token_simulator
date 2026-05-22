import { describe, expect, it } from 'vitest'
import { createDecision, deleteDecision, exportDecisionLogFileName, loadDecisionLog, serializeDecisionLog } from './decisionLog'

describe('decisionLog', () => {
  it('requires risk cards before an optimization decision can be adopted', () => {
    expect(() => createDecision({
      what: 'Adopt credit pricing',
      why: 'Improves Pro plan margin',
      assumptions: { policy: 'credit' },
      toolResultRefs: ['pricing:credit'],
      riskCards: [],
      status: 'adopted',
    })).toThrow('Risk card is required')
  })

  it('serializes decisions with createdAt and stable JSON output', () => {
    const decision = createDecision({
      what: 'Adopt credit pricing',
      why: 'Improves Pro plan margin',
      assumptions: { policy: 'credit' },
      toolResultRefs: ['pricing:credit'],
      riskCards: ['risk-credit-confusion'],
      status: 'adopted',
      createdAt: '2026-05-22T00:00:00.000Z',
    })

    expect(decision.id).toBe('decision-2026-05-22T00-00-00-000Z')
    expect(serializeDecisionLog([decision])).toContain('"what": "Adopt credit pricing"')
  })

  it('deletes a decision by id', () => {
    const kept = createDecision({
      what: 'Keep cap',
      why: 'Protects margin',
      assumptions: { policy: 'cap' },
      toolResultRefs: ['pricing:cap'],
      riskCards: ['risk-cap-perceived-value'],
      status: 'adopted',
      createdAt: '2026-05-22T00:00:00.000Z',
    })
    const removed = createDecision({
      what: 'Remove cap',
      why: 'Too much churn risk',
      assumptions: { policy: 'cap' },
      toolResultRefs: ['pricing:cap'],
      riskCards: ['risk-cap-perceived-value'],
      status: 'rejected',
      createdAt: '2026-05-23T00:00:00.000Z',
    })

    expect(deleteDecision([kept, removed], removed.id)).toEqual([kept])
  })

  it('creates a stable export filename', () => {
    expect(exportDecisionLogFileName('2026-05-22T12:34:56.000Z')).toBe('ai-team-ops-decision-log-2026-05-22.json')
  })

  it('drops invalid stored records during load', () => {
    const storage = {
      getItem: () => JSON.stringify([
        { id: 'broken' },
        {
          id: 'decision-valid',
          what: 'Adopt credit',
          why: 'Protects margin',
          assumptions: {},
          toolResultRefs: ['pricing:credit'],
          riskCards: ['risk-credit-confusion'],
          status: 'adopted',
          createdAt: '2026-05-22T00:00:00.000Z',
        },
      ]),
    }

    expect(loadDecisionLog(storage)).toHaveLength(1)
  })

  it('migrates legacy stored decisions to approve operating decisions', () => {
    const storage = {
      getItem: () => JSON.stringify([
        {
          id: 'decision-valid',
          what: 'Adopt optimization',
          why: 'Protects margin',
          assumptions: {},
          toolResultRefs: ['tool:optimization'],
          riskCards: ['risk-model-routing-quality'],
          status: 'adopted',
          createdAt: '2026-05-22T00:00:00.000Z',
        },
      ]),
    }

    expect(loadDecisionLog(storage)[0]).toMatchObject({
      kind: 'approve',
      performanceSnapshot: {},
      costSnapshot: {},
    })
  })

  it('stores operating decision kind with performance and cost snapshots', () => {
    const decision = createDecision({
      kind: 'automate',
      what: 'Automate support classification',
      why: 'Pass rate is stable',
      assumptions: { excludes: 'legal/medical keywords' },
      performanceSnapshot: { passRate: 0.98, throughput: 360 },
      costSnapshot: { costPerDeliverableUsd: 0.03 },
      toolResultRefs: ['deliverable:cs-classification'],
      riskCards: ['risk-human-review-bottleneck'],
      status: 'adopted',
      createdAt: '2026-05-22T00:00:00.000Z',
    })

    expect(decision.kind).toBe('automate')
    expect(serializeDecisionLog([decision])).toContain('"performanceSnapshot"')
    expect(serializeDecisionLog([decision])).toContain('"costPerDeliverableUsd"')
  })
})
