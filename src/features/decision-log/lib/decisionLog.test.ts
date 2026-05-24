import { describe, expect, it } from 'vitest'
import {
  createDecision,
  createOperatingLedgerEntry,
  deleteDecision,
  exportDecisionLogFileName,
  loadDecisionLog,
  serializeDecisionLog,
} from './decisionLog'

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

  it('requires operating ledger metadata before creating a business ops row', () => {
    expect(() => createOperatingLedgerEntry({
      what: 'Provider price update',
      why: 'Official price changed',
      assumptions: {},
      toolResultRefs: ['asset:provider_registry'],
      riskCards: ['risk-price-staleness'],
      status: 'adopted',
      operatingLedger: {
        workstream: 'Provider Registry',
        source: 'official pricing page',
        agentUsed: '',
        proposedChange: 'Update cached input price',
        humanDecision: 'Approve after official recheck',
        artifactUpdated: 'provider_registry v0.4',
        impact: 'Recalculate sample customer AI COGS',
        followUp: 'Run cost engine regression tests',
      },
    })).toThrow('Operating ledger entry requires')
  })

  it('creates an operating ledger row with asset impact and human decision metadata', () => {
    const decision = createOperatingLedgerEntry({
      what: 'Provider price update',
      why: 'Official price changed',
      assumptions: { changeType: 'pricing_update' },
      toolResultRefs: ['asset:provider_registry', 'tool:monthlyAiCogs'],
      riskCards: ['risk-price-staleness'],
      status: 'adopted',
      createdAt: '2026-05-24T00:00:00.000Z',
      operatingLedger: {
        workstream: 'Provider Registry',
        source: 'official pricing page',
        agentUsed: 'Provider & API Intelligence Agent',
        proposedChange: 'Update cached input price',
        humanDecision: 'Approve after official recheck',
        artifactUpdated: 'provider_registry v0.4',
        impact: 'Recalculate sample customer AI COGS',
        followUp: 'Run cost engine regression tests',
      },
    })

    expect(decision.kind).toBe('policy')
    expect(decision.operatingLedger.agentUsed).toBe('Provider & API Intelligence Agent')
    expect(serializeDecisionLog([decision])).toContain('"artifactUpdated": "provider_registry v0.4"')
  })

  it('stores operating team review metadata for auditability', () => {
    const decision = createDecision({
      what: 'Adopt routing guardrail',
      why: 'Optimization review requires quality validation',
      assumptions: { policy: 'what-if' },
      toolResultRefs: ['tool:optimization.primary.monthlySavingsUsd'],
      riskCards: ['risk-model-routing-quality'],
      status: 'adopted',
      agentReview: {
        calledAgentIds: ['optimization_routing', 'model_inference_research', 'trust_security_compliance'],
        primaryAgentId: 'optimization_routing',
        reviewerAgentIds: ['model_inference_research', 'trust_security_compliance'],
        usedCapabilityTools: ['retrieve_metric_flags', 'retrieve_risk_cards'],
        snapshotVersion: 'snapshot:optimize:abc123',
        supervisorSummary: 'Optimization/Routing led the review with Trust and Model reviewers.',
      },
    })

    expect(decision.agentReview?.primaryAgentId).toBe('optimization_routing')
    expect(decision.agentReview?.usedCapabilityTools).toContain('retrieve_risk_cards')
    expect(serializeDecisionLog([decision])).toContain('"snapshotVersion": "snapshot:optimize:abc123"')
  })

  it('normalizes legacy decisions without agent review metadata', () => {
    const storage = {
      getItem: () => JSON.stringify([{
        id: 'decision-legacy',
        what: 'Legacy decision',
        why: 'Created before agent review metadata',
        assumptions: {},
        toolResultRefs: ['tool:monthlyAiCogs'],
        riskCards: ['risk-model-routing-quality'],
        status: 'adopted',
        createdAt: '2026-05-22T00:00:00.000Z',
      }]),
    }

    expect(loadDecisionLog(storage)[0].agentReview).toBeNull()
  })

  it('stores trust and report review metadata with operating decisions', () => {
    const decision = createDecision({
      what: 'Export customer AI Cost Snapshot',
      why: 'Customer accepted analysis scope and report review gate passed',
      assumptions: {},
      toolResultRefs: ['tool:monthlyAiCogs'],
      riskCards: ['risk-model-routing-quality'],
      status: 'adopted',
      trustReview: {
        status: 'ready',
        warnings: [],
        retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      },
      reportReview: {
        noRawPrompt: true,
        noUncitedNumbers: true,
        providerSourceVisible: true,
        formulaVersionVisible: true,
      },
    })

    expect(decision.trustReview?.status).toBe('ready')
    expect(decision.reportReview?.noUncitedNumbers).toBe(true)
    expect(serializeDecisionLog([decision])).toContain('"reportReview"')
  })

  it('normalizes legacy decisions without trust or report review metadata', () => {
    const storage = {
      getItem: () => JSON.stringify([{
        id: 'decision-legacy-trust',
        what: 'Legacy decision',
        why: 'Created before trust metadata',
        assumptions: {},
        toolResultRefs: ['tool:monthlyAiCogs'],
        riskCards: ['risk-model-routing-quality'],
        status: 'adopted',
        createdAt: '2026-05-22T00:00:00.000Z',
      }]),
    }

    const decision = loadDecisionLog(storage)[0]
    expect(decision.trustReview).toBeNull()
    expect(decision.reportReview).toBeNull()
  })
})
