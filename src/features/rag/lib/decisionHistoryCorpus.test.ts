import { describe, expect, it } from 'vitest'
import { buildDecisionHistoryCorpusRecords, decisionHistoryRecordsAsP1RagRecords } from './decisionHistoryCorpus'

describe('decisionHistoryCorpus', () => {
  it('builds deterministic C9 records from decisions, risk cards, snapshots, and ledger rows', () => {
    const records = buildDecisionHistoryCorpusRecords({
      decisions: [{
        id: 'decision-cache-policy',
        what: 'Hold cache routing',
        why: 'Quality review is not complete',
        assumptions: {},
        toolResultRefs: ['tool:optimization.primary.monthlySavingsUsd'],
        riskCards: ['risk-model-routing-quality'],
        status: 'held',
        kind: 'policy',
        decisionChoice: 'hold',
        createdAt: '2026-05-25T00:00:00.000Z',
        operatingLedger: null,
      }],
      riskCards: [{
        id: 'risk-model-routing-quality',
        tags: ['routing'],
        title: 'Model routing requires quality checks',
        severity: 'high',
        impact: 'Quality regression risk',
        condition: 'Use after eval',
        mitigation: 'Hold until eval',
        evidenceId: 'GR-028',
      }],
      operatingLedger: [{
        id: 'ledger-cache-policy',
        workstream: 'Optimization',
        agentUsed: 'Model & Inference Research Agent',
        humanDecision: 'Hold',
        artifactUpdated: 'model_perf_matrix',
      }],
      snapshot: {
        snapshotVersion: 'snapshot:optimize:abc123',
        activeStage: 'optimize',
      },
    })

    expect(records.map(record => record.corpusId)).toEqual(expect.arrayContaining(['decision_history']))
    expect(records.flatMap(record => record.refs)).toEqual(expect.arrayContaining([
      'decision:decision-cache-policy',
      'risk:risk-model-routing-quality',
      'snapshot:optimize:abc123',
      'asset:model_perf_matrix',
    ]))
    expect(records.every(record => record.mayOverrideFacts === false)).toBe(true)
  })

  it('exports decision-history records for the legacy P1 RAG response shape', () => {
    const records = buildDecisionHistoryCorpusRecords({
      decisions: [],
      riskCards: [],
      operatingLedger: [],
      snapshot: { snapshotVersion: 'snapshot:decision-log:empty' },
    })
    const p1Records = decisionHistoryRecordsAsP1RagRecords(records)

    expect(p1Records[0]).toMatchObject({
      id: 'snapshot:decision-log:empty',
      refs: ['snapshot:decision-log:empty'],
    })
  })
})
