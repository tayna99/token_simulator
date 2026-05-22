import { describe, expect, it } from 'vitest'
import {
  handleAgentApi,
  handleConfigurationApi,
  handleDecisionsApi,
  handleTeamCostCalibrationApi,
  handleReportsApi,
  handleRiskCardsApi,
  handleUsageImportApi,
} from './p1ApiHandlers'
import { createMemoryKvStore, createUnavailableKvStore } from './storage/kvStore'
import { MODELS } from '../features/alternatives/data/models'
import type { AgentSpec } from '../features/team-cost/lib/agentSpec'

function supportAgentSpec(): AgentSpec {
  return {
    id: 'agent-cs',
    role: 'CS Agent',
    modelId: 'claude-haiku-4.5',
    inputs: [{ id: 'ticket', name: 'Support ticket', kind: 'text', estTokens: 10, reusedEachRun: false, size: 'short' }],
    outputs: [{ id: 'classification', name: 'Classification', kind: 'text', estTokens: 5, reusedEachRun: false, size: 'short' }],
    callsPerRun: 1,
    retryRate: 0,
    cacheHitRate: 0,
    batchEnabled: false,
    humanReviewGate: 'sample',
    assignedTasks: ['customer support classification'],
    frequency: { unit: 'day', count: 50 },
  }
}

describe('P1 API handlers', () => {
  it('runs the agent endpoint through the shared runAgent contract', async () => {
    const response = await handleAgentApi('POST', {
      apiKey: '',
      toolResults: {
        monthlyAiCogs: 4820,
        topFeature: 'report_generation',
        grossMarginPct: 0.68,
      },
      riskCardIds: ['risk-credit-confusion'],
    })

    expect(response.status).toBe(200)
    expect(response.body.events.map(event => event.type)).toContain('pricing_strategy')
    expect(response.body.runtime).toBe('vercel-function-shell')
  })

  it('returns storage_not_configured when decision persistence has no KV store', async () => {
    const response = await handleDecisionsApi('POST', {
      workspaceId: 'workspace-demo',
      decisions: [
        {
          id: 'decision-1',
          what: 'Adopt credit',
          why: 'Protects margin',
          assumptions: {},
          toolResultRefs: ['tool:grossMarginPct'],
          riskCards: ['risk-credit-confusion'],
          status: 'adopted',
          createdAt: '2026-05-22T00:00:00.000Z',
        },
      ],
    }, { store: createUnavailableKvStore() })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('storage_not_configured')
  })

  it('roundtrips workspace-scoped decisions through KV persistence', async () => {
    const store = createMemoryKvStore()
    const decision = {
      id: 'decision-1',
      what: 'Adopt credit',
      why: 'Protects margin',
      assumptions: {},
      toolResultRefs: ['tool:grossMarginPct'],
      riskCards: ['risk-credit-confusion'],
      status: 'adopted',
      createdAt: '2026-05-22T00:00:00.000Z',
    }

    const save = await handleDecisionsApi('POST', {
      workspaceId: 'workspace-demo',
      decisions: [decision],
    }, { store })
    const load = await handleDecisionsApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(save.status).toBe(202)
    expect(save.body.persistence).toBe('kv')
    expect(load.body.decisions).toMatchObject([{ id: 'decision-1', kind: 'approve' }])
  })

  it('persists an AITeamConfiguration snapshot per workspace', async () => {
    const store = createMemoryKvStore()
    const config = {
      companyProfile: { companyType: 'AI report generation SaaS', stage: 'P1', budgetLabel: 'monthly', locale: 'en' },
      agents: [],
      usage: null,
      attribution: {},
      decisionLog: [],
      configSnapshotRef: 'config:p1:workspace-demo',
    }

    const saved = await handleConfigurationApi('POST', {
      workspaceId: 'workspace-demo',
      config,
    }, { store })
    const loaded = await handleConfigurationApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(saved.status).toBe(202)
    expect(saved.body.persistence).toBe('kv')
    expect(saved.body.config?.configSnapshotRef).toBe('config:p1:workspace-demo')
    expect(loaded.body.config?.companyProfile.stage).toBe('P1')
  })

  it('imports actual usage logs and calibrates planned vs actual agent volume', async () => {
    const store = createMemoryKvStore()
    const csv = [
      'feature,model_id,input_tokens,output_tokens,status,agent_run_id',
      ...Array.from({ length: 5400 }, (_, index) => (
        `customer_support,claude-haiku-4.5,10,5,${index % 5 === 0 ? 'retry' : 'ok'},agent-cs`
      )),
    ].join('\n')

    const usage = await handleUsageImportApi('POST', {
      workspaceId: 'workspace-demo',
      csv,
    }, { store, models: MODELS })
    const calibration = await handleTeamCostCalibrationApi('POST', {
      workspaceId: 'workspace-demo',
      agentSpecs: [supportAgentSpec()],
    }, { store })

    expect(usage.status).toBe(202)
    expect(usage.body.summary.requestCount).toBe(5400)
    expect(calibration.status).toBe(200)
    expect(calibration.body.calibration).toMatchObject({
      plannedCallsPerDay: 50,
      actualCallsPerDay: 180,
      retryShare: 0.2,
    })
    expect(calibration.body.calibration.suggestedAgentSpecPatch).toMatchObject({
      agentId: 'agent-cs',
      humanReviewGate: 'all',
    })
  })

  it('stores weekly report runs with decision, usage, and config snapshot refs', async () => {
    const store = createMemoryKvStore()
    const response = await handleReportsApi('POST', {
      workspaceId: 'workspace-demo',
      period: '2026-05',
      decisionIds: ['decision-1'],
      configSnapshotRef: 'config:p1:workspace-demo',
      usageSnapshotRef: 'usage:p1:workspace-demo:2026-05',
    }, { store })
    const loaded = await handleReportsApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(response.status).toBe(202)
    expect(response.body.reportRun.period).toBe('2026-05')
    expect(response.body.reportRun.persistence).toBe('kv')
    expect(response.body.reportRun.snapshotRefs).toMatchObject({
      decisionIds: ['decision-1'],
      configSnapshotRef: 'config:p1:workspace-demo',
      usageSnapshotRef: 'usage:p1:workspace-demo:2026-05',
    })
    expect(loaded.body.reportRuns).toHaveLength(1)
  })

  it('serves risk cards through the future server RAG endpoint', async () => {
    const store = createMemoryKvStore()
    const response = await handleRiskCardsApi('GET', undefined, { tags: 'credit,overage', workspaceId: 'workspace-demo' }, { store })

    expect(response.status).toBe(200)
    expect(response.body.cards.some(card => card.id === 'risk-credit-confusion')).toBe(true)
    expect(response.body.retrieval).toBe('deterministic-tag-corpus')
    expect(response.body.metadata).toMatchObject({ workspaceId: 'workspace-demo', persistence: 'kv' })
  })
})
