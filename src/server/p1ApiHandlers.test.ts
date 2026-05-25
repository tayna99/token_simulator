import { describe, expect, it } from 'vitest'
import {
  handleAgentApi,
  handleConfigurationApi,
  handleDecisionsApi,
  handleTeamCostCalibrationApi,
  handleReportsApi,
  handleRiskCardsApi,
  handleP1RagEvidenceApi,
  handleP1ExternalActionsApi,
  handleSdkLiteUsageApi,
  handleUsageImportApi,
} from './p1ApiHandlers'
import { createMemoryKvStore, createUnavailableKvStore } from './storage/kvStore'
import { MODELS } from '../features/alternatives/data/models'
import type { AgentSpec } from '../features/team-cost/lib/agentSpec'
import { chunkApiDoc, normalizeApiDoc } from '../features/rag/lib/apiDocRag'

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

  it('ingests SDK-lite events only after Trust pipeline approval', async () => {
    const store = createMemoryKvStore()
    const accepted = await handleSdkLiteUsageApi('POST', {
      workspaceId: 'workspace-demo',
      source: 'application_gateway',
      event: {
        timestamp: '2026-05-24T12:00:00.000Z',
        requestId: 'req_1',
        customerId: 'cust_1',
        feature: 'support_reply',
        model: 'gpt-5-mini',
        plan: 'pro',
        sessionId: 'session_1',
        agentRunId: 'agent_run_1',
        inputTokens: 1200,
        outputTokens: 240,
        retryCount: 0,
        cacheReadTokens: 800,
        cacheWriteTokens: 100,
        latencyMs: 920,
        status: 'success',
        deliverable: 'CS reply',
        taskType: 'classification',
        humanReview: false,
      },
    }, { store })
    const blocked = await handleSdkLiteUsageApi('POST', {
      workspaceId: 'workspace-demo',
      source: 'openai',
      event: {
        timestamp: '2026-05-24T12:00:00.000Z',
        requestId: 'req_2',
        customerId: 'cust_2',
        feature: 'support_reply',
        model: 'gpt-5-mini',
        plan: 'pro',
        sessionId: 'session_2',
        agentRunId: 'agent_run_2',
        inputTokens: 100,
        outputTokens: 20,
        retryCount: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        latencyMs: 500,
        status: 'success',
        deliverable: 'CS reply',
        taskType: 'classification',
        humanReview: false,
        rawPrompt: 'hello',
        apiKey: 'sk-test',
      },
    }, { store })

    expect(accepted.status).toBe(202)
    expect(accepted.body.snapshotAllowed).toBe(true)
    expect(accepted.body.eventRef).toBe('sdk:p1:workspace-demo:req_1')
    expect(accepted.body.history).toHaveLength(1)
    expect(blocked.status).toBe(422)
    expect(blocked.body.snapshotAllowed).toBe(false)
    expect(blocked.body.error).toBe('trust_pipeline_blocked')
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

  it('serves P1 vector RAG evidence without letting RAG override fact ledger numbers', async () => {
    const response = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cache margin',
      structuredFactRefs: ['fact:gemini-3-5-flash'],
      collections: {
        official_docs: [{ id: 'google-pricing', text: 'Cache pricing source.' }],
        benchmark_evidence: [{ id: 'peer-cache', text: 'Cache hit rate margin evidence.' }],
        decision_history: [{ id: 'cache-policy', text: 'Held cache routing until QA.' }],
      },
    }, { store: createMemoryKvStore() })

    expect(response.status).toBe(200)
    expect(response.body.evidence.mayOverrideFacts).toBe(false)
    expect(response.body.evidence.results.official_docs.refs).toEqual(['source:google-pricing', 'fact:gemini-3-5-flash'])
    expect(response.body.evidence.results.benchmark_evidence.refs).toEqual(['evidence:peer-cache'])
    expect(response.body.evidence.results.decision_history.refs).toEqual(['decision:cache-policy'])
    expect(response.body.evidence.results.official_docs.scores[0]).toBeGreaterThan(0)
  })

  it('uses official docs vector chunks to return bounded LLM context for P1 RAG evidence', async () => {
    const source = {
      id: 'google-gemini-pricing',
      modelOwner: 'google',
      servingProvider: 'first_party',
      modelFamilies: ['gemini'],
      sourceKind: 'pricing',
      url: 'https://ai.google.dev/gemini-api/docs/pricing',
      pricingRegion: 'global',
      sourceLanguage: 'en',
      officialSourceTrust: 'official_pricing',
    }
    const officialDocChunks = chunkApiDoc(normalizeApiDoc({
      source,
      capturedAt: '2026-05-24T00:00:00.000Z',
      rawText: [
        '# Gemini API',
        '## Authentication',
        'Use an API key for requests.',
        '## Pricing',
        'Cached input tokens receive a discount when repeated context is reused.',
      ].join('\n'),
    }))

    const response = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cached token pricing discount',
      topK: 1,
      structuredFactRefs: ['fact:gemini-3-5-flash'],
      officialDocChunks,
      collections: {
        benchmark_evidence: [],
        decision_history: [],
      },
    }, { store: createMemoryKvStore() })

    expect(response.status).toBe(200)
    expect(response.body.evidence.results.official_docs.records[0].id).toMatch(/^source:google-gemini-pricing#/)
    expect(response.body.evidence.results.official_docs.refs).toEqual(expect.arrayContaining([
      'source:google-gemini-pricing',
      'fact:gemini-3-5-flash',
    ]))
    expect(response.body.contextBlocks?.[0]).toMatchObject({
      collection: 'official_docs',
      mayOverrideFacts: false,
      sourceUrl: source.url,
    })
    expect(response.body.contextBlocks?.[0].text).toContain('Cached input tokens')
  })

  it('keeps P1 RAG API benchmark gaps explicit instead of inventing peer averages', async () => {
    const response = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cache margin',
      topK: 1,
      collections: {
        official_docs: [{ id: 'google-pricing', text: 'Cache margin pricing source.' }],
        benchmark_evidence: [],
        decision_history: [{ id: 'cache-policy', text: 'Cache margin decision history.' }],
      },
    }, { store: createMemoryKvStore() })

    expect(response.status).toBe(200)
    expect(response.body.evidence.results.benchmark_evidence.refs).toEqual([])
    expect(response.body.evidence.results.benchmark_evidence.records).toEqual([])
    expect(response.body.evidence.results.benchmark_evidence.warnings).toContain('baseline_unavailable')
    expect(JSON.stringify(response.body.evidence)).not.toMatch(/average|peerAverage|mean/i)
  })

  it('stores external action drafts and blocks execution before approval', async () => {
    const store = createMemoryKvStore()
    const draft = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'draft',
      kind: 'slack_alert',
      title: 'Margin breach alert',
      payload: { channel: '#ops', message: 'Margin breach needs review.' },
      sourceRefs: ['basis:rule:gross_margin_thin_pct'],
    }, { store })
    const blocked = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'execute',
      actionId: draft.body.action?.id,
    }, { store })

    expect(draft.status).toBe(202)
    expect(draft.body.action).toMatchObject({ kind: 'slack_alert', status: 'draft' })
    expect(blocked.status).toBe(409)
    expect(blocked.body.execution?.error).toBe('approval_required')
    expect(blocked.body.ledger).toEqual([])
  })

  it('executes approved external actions as dry-runs and persists ledger entries', async () => {
    const store = createMemoryKvStore()
    const draft = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'draft',
      kind: 'email_alert',
      title: 'Decision follow-up',
      payload: { recipient: 'founder@example.com', message: 'Follow up is due.' },
      sourceRefs: ['decision:follow-up'],
    }, { store })
    const actionId = draft.body.action?.id

    const approved = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'approve',
      actionId,
      approver: 'owner@example.com',
      reason: 'Send the weekly follow-up draft.',
    }, { store })
    const executed = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'execute',
      actionId,
    }, { store })
    const listed = await handleP1ExternalActionsApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(approved.status).toBe(202)
    expect(executed.status).toBe(202)
    expect(executed.body.execution).toMatchObject({ status: 'executed', connectorMode: 'dry_run' })
    expect(executed.body.ledger).toEqual([expect.objectContaining({ actionId, status: 'ledgered' })])
    expect(listed.body.actions).toHaveLength(1)
    expect(listed.body.ledger).toHaveLength(1)
  })

  it('keeps billing execution blocked until rollback metadata is attached', async () => {
    const store = createMemoryKvStore()
    const draft = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'draft',
      kind: 'billing_change',
      title: 'Usage cap draft',
      payload: { policy: 'usage_cap', includedCredits: 1000 },
      sourceRefs: ['decision:pricing'],
    }, { store })
    const actionId = draft.body.action?.id
    await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'approve',
      actionId,
      approver: 'owner@example.com',
      reason: 'Pricing decision approved.',
    }, { store })

    const blocked = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'execute',
      actionId,
    }, { store })

    expect(blocked.status).toBe(409)
    expect(blocked.body.execution?.error).toBe('rollback_metadata_required')
  })
})
