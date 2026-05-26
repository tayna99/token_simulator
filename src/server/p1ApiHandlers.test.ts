import { describe, expect, it, vi } from 'vitest'
import {
  handleAgentApi,
  handleConfigurationApi,
  handleDecisionsApi,
  handleTeamCostCalibrationApi,
  handleReportsApi,
  handleReportDownloadApi,
  handleRetentionRunApi,
  handleRuntimeStatusApi,
  handleRiskCardsApi,
  handleP1RagEvidenceApi,
  handleRagIndexApi,
  handleP1ExternalActionsApi,
  handleOfficialUpdatesApi,
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

  it('persists workspace decisions to Supabase and refreshes C9 decision history', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const decision = {
      id: 'decision-1',
      what: 'Accept cache routing',
      why: 'Protects margin',
      assumptions: {},
      toolResultRefs: ['tool:margin'],
      riskCards: ['risk-cache'],
      status: 'adopted',
      decisionChoice: 'adopt',
      createdAt: '2026-05-25T00:00:00.000Z',
    }
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init: init ?? {} })
      if (url === 'https://api.openai.com/v1/embeddings') {
        return new Response(JSON.stringify({ data: [{ embedding: [1, 0, 0] }] }), { status: 200 })
      }
      if (url.includes('/rest/v1/decisions?') && init?.method === 'GET') {
        return new Response(JSON.stringify([{
          id: 'decision-1',
          workspace_id: 'workspace-demo',
          decision_payload: {
            ...decision,
            kind: 'approve',
            performanceSnapshot: {},
            costSnapshot: {},
            thresholdSnapshot: {},
            factSourceSnapshot: [],
            rateCardDraft: null,
            pricingFreshnessSnapshot: [],
            aiMode: 'unknown',
            operatingLedger: null,
            agentReview: null,
            trustReview: null,
            reportReview: null,
            runtimeProof: null,
            humanApproval: null,
          },
          created_at: '2026-05-25T00:00:00.000Z',
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    })

    const saved = await handleDecisionsApi('POST', {
      workspaceId: 'workspace-demo',
      decisions: [decision],
    }, {
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        OPENAI_API_KEY: 'sk-test',
      },
      fetcher,
    })
    const loaded = await handleDecisionsApi('GET', undefined, {
      query: { workspaceId: 'workspace-demo' },
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        OPENAI_API_KEY: 'sk-test',
      },
      fetcher,
    })

    expect(saved.status).toBe(202)
    expect(saved.body.persistence).toBe('supabase')
    expect(loaded.body.decisions).toMatchObject([{ id: 'decision-1', status: 'adopted' }])
    expect(calls.some(call => call.url.includes('/rest/v1/decisions') && call.init.method === 'POST')).toBe(true)
    const ragUpsert = calls.find(call => call.url.includes('/rest/v1/rag_chunks') && call.init.method === 'POST')
    expect(JSON.parse(String(ragUpsert?.init.body))[0]).toMatchObject({
      collection: 'decision_history',
      metadata: expect.objectContaining({ mayOverrideFacts: false }),
    })
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

  it('rejects server-supplied usage summaries that did not pass the Trust gate', async () => {
    const store = createMemoryKvStore()
    const response = await handleUsageImportApi('POST', {
      workspaceId: 'workspace-demo',
      summary: {
        rows: [],
        featureSummaries: [],
        errors: [],
        requestCount: 1,
        totalInputTokens: 10,
        totalOutputTokens: 5,
        totalCostUsd: 0.01,
        avgInputTokensPerRequest: 10,
        avgOutputTokensPerRequest: 5,
        p95OutputTokens: 5,
        topFeatureByCost: null,
      },
    }, { store, models: MODELS })

    expect(response.status).toBe(422)
    expect(response.body.error).toBe('trust_pipeline_blocked')
    expect(response.body.snapshotAllowed).toBe(false)
    expect(response.body.blockedReason).toBe('missing_trust_inspection')
    await expect(store.getJson('workspace:workspace-demo:usage-current')).resolves.toBeNull()
  })

  it('accepts structured usage summaries only after Trust inspection is attached', async () => {
    const store = createMemoryKvStore()
    const response = await handleUsageImportApi('POST', {
      workspaceId: 'workspace-demo',
      summary: {
        rows: [],
        featureSummaries: [],
        errors: [],
        requestCount: 1,
        totalInputTokens: 10,
        totalOutputTokens: 5,
        totalCostUsd: 0.01,
        avgInputTokensPerRequest: 10,
        avgOutputTokensPerRequest: 5,
        p95OutputTokens: 5,
        topFeatureByCost: null,
        trustInspection: {
          status: 'ready',
          warnings: [],
          allowedForSnapshot: true,
          anonymizationStatus: 'not_needed',
          retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
          analysisScope: {
            available: ['feature_cost', 'model_cost', 'customer_cost', 'plan_cost'],
            blocked: [],
          },
        },
      },
    }, { store })

    expect(response.status).toBe(202)
    expect(response.body.trustGate).toBe('allowed')
    expect(response.body.snapshotRef).toBe('usage:p1:workspace-demo:2026-05')
    await expect(store.getJson('workspace:workspace-demo:usage-current')).resolves.toMatchObject({
      requestCount: 1,
      totalCostUsd: 0.01,
    })
  })

  it('rejects server-supplied usage summaries with a blocking Trust inspection', async () => {
    const store = createMemoryKvStore()
    const response = await handleUsageImportApi('POST', {
      workspaceId: 'workspace-demo',
      summary: {
        rows: [],
        featureSummaries: [],
        errors: [],
        requestCount: 1,
        totalInputTokens: 10,
        totalOutputTokens: 5,
        totalCostUsd: 0.01,
        avgInputTokensPerRequest: 10,
        avgOutputTokensPerRequest: 5,
        p95OutputTokens: 5,
        topFeatureByCost: null,
        trustInspection: {
          status: 'blocked',
          warnings: ['raw_prompt_detected'],
          allowedForSnapshot: false,
          anonymizationStatus: 'blocked',
          retentionNote: 'blocked',
          analysisScope: { available: [], blocked: ['all_analysis'] },
        },
      },
    }, { store, models: MODELS })

    expect(response.status).toBe(422)
    expect(response.body.error).toBe('trust_pipeline_blocked')
    expect(response.body.snapshotAllowed).toBe(false)
    expect(response.body.blockedReason).toBe('trust_inspection_blocked')
    await expect(store.getJson('workspace:workspace-demo:usage-current')).resolves.toBeNull()
  })

  it('rejects blocked CSV usage imports before snapshot or retention rows are written', async () => {
    const store = createMemoryKvStore()
    const response = await handleUsageImportApi('POST', {
      workspaceId: 'workspace-demo',
      csv: 'timestamp,prompt,api_key,input_tokens\n2026-05-01,"hello","sk-test",100',
      fileName: 'usage.csv',
      fileSizeBytes: 128,
    }, { store, models: MODELS })

    expect(response.status).toBe(422)
    expect(response.body.error).toBe('trust_pipeline_blocked')
    await expect(store.getJson('workspace:workspace-demo:usage-current')).resolves.toBeNull()
    await expect(store.getJson('workspace:workspace-demo:retention-jobs')).resolves.toBeNull()
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
    expect(response.body.reportRun.artifacts.map(artifact => artifact.format)).toEqual(['pdf', 'markdown', 'json'])
    expect(loaded.body.reportRuns).toHaveLength(1)
  })

  it('serves persisted report artifacts for download', async () => {
    const store = createMemoryKvStore()
    const response = await handleReportsApi('POST', {
      workspaceId: 'workspace-demo',
      period: '2026-05',
      decisionIds: ['decision-1'],
      configSnapshotRef: 'config:p1:workspace-demo',
      usageSnapshotRef: 'usage:p1:workspace-demo:2026-05',
    }, { store })
    const markdownArtifact = response.body.reportRun.artifacts.find(artifact => artifact.format === 'markdown')
    const downloaded = await handleReportDownloadApi('GET', undefined, {
      store,
      query: {
        workspaceId: 'workspace-demo',
        reportId: response.body.reportRun.id,
        artifactId: markdownArtifact?.id,
      },
    })

    expect(downloaded.status).toBe(200)
    expect(downloaded.body.artifact?.contentType).toBe('text/markdown')
    expect(downloaded.body.content).toContain('report-run-2026-05')
    expect(downloaded.body.artifact?.downloadPath).toContain('/api/reports/report-run-2026-05/download')
  })

  it('persists report artifacts to Supabase and downloads from the artifact table', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init: init ?? {} })
      if (url.includes('/rest/v1/report_artifacts?')) {
        return new Response(JSON.stringify([{
          id: 'report-artifact:report-run-2026-05:markdown',
          workspace_id: 'workspace-demo',
          report_run_id: 'report-run-2026-05',
          format: 'markdown',
          content_type: 'text/markdown',
          body: '# report-run-2026-05',
          download_path: '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:markdown',
          size_bytes: 21,
          created_at: '2026-05-25T00:00:00.000Z',
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    })
    const env = {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    }

    const created = await handleReportsApi('POST', {
      workspaceId: 'workspace-demo',
      period: '2026-05',
      decisionIds: ['decision-1'],
    }, { env, fetcher })
    const downloaded = await handleReportDownloadApi('GET', undefined, {
      env,
      fetcher,
      query: {
        workspaceId: 'workspace-demo',
        reportId: 'report-run-2026-05',
        artifactId: 'report-artifact:report-run-2026-05:markdown',
      },
    })

    expect(created.status).toBe(202)
    expect(created.body.persistence).toBe('supabase')
    expect(downloaded.status).toBe(200)
    expect(downloaded.body.persistence).toBe('supabase')
    expect(downloaded.body.content).toContain('report-run-2026-05')
    expect(calls.some(call => call.url.includes('/rest/v1/report_artifacts') && call.init.method === 'POST')).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/report_artifacts?') && call.init.method === 'GET')).toBe(true)
  })

  it('persists report-first one-page artifacts with decision and Trust metadata', async () => {
    const store = createMemoryKvStore()
    const response = await handleReportsApi('POST', {
      workspaceId: 'workspace-demo',
      period: '2026-05',
      decisionIds: ['decision:diagnosis:usage-limit'],
      usageSnapshotRef: 'usage:p1:workspace-demo:2026-05',
      reportFirst: {
        title: 'AgentPayroll AI 비용 진단 리포트',
        executiveSummary: '손해 고객과 마진 깨는 기능을 발견했습니다.',
        metrics: [{ label: 'AI COGS', value: '$444' }],
        recommendations: ['무료 플랜 사용량 제한을 검토합니다.'],
        risks: ['PII는 저장하지 않았습니다.'],
        refs: ['tool:diagnosis.loss_customers', 'usage:p1:workspace-demo:2026-05'],
        trust: {
          status: 'ready',
          dataLimitations: ['raw prompt was not collected'],
          retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
        },
        formulaVersion: 'cost_formula_v0.3',
        providerRegistryVersion: 'provider_registry_v0.4',
        snapshotVersion: 'usage:p1:workspace-demo:2026-05',
        decisionRefs: ['decision:diagnosis:usage-limit'],
        decisionChoice: 'hold',
        humanApproval: {
          required: true,
          decisionChoice: 'hold',
          approvedBy: 'workspace_user',
          approvedAt: '2026-05-26T00:00:00.000Z',
          approvalMode: 'explicit_button',
        },
        runtimeProof: {
          status: 'deterministic_preview',
          agentInvocationProof: [],
          fallbackReason: 'money_leak_run_deterministic_snapshot_only',
          startedAt: '2026-05-26T00:00:00.000Z',
          completedAt: '2026-05-26T00:00:01.000Z',
        },
      },
    }, { store })

    const pdf = response.body.reportRun.artifacts.find(artifact => artifact.format === 'pdf')
    const markdown = response.body.reportRun.artifacts.find(artifact => artifact.format === 'markdown')
    const json = response.body.reportRun.artifacts.find(artifact => artifact.format === 'json')

    expect(response.status).toBe(202)
    expect(pdf?.body).toContain('AgentPayroll AI 비용 진단 리포트')
    expect(markdown?.body).toContain('Selected Decision')
    expect(markdown?.body).toContain('Decision choice: hold')
    expect(markdown?.body).toContain('Runtime status: deterministic_preview')
    expect(markdown?.body).toContain('Approval required: true')
    expect(markdown?.body).toContain('Trust and data handling')
    expect(json?.body).toContain('usage:p1:workspace-demo:2026-05')
    expect(json?.body).toContain('"humanApproval"')
    expect(json?.body).toContain('"runtimeProof"')
  })

  it('runs and persists retention jobs for a workspace', async () => {
    const store = createMemoryKvStore()
    const response = await handleRetentionRunApi('POST', {
      workspaceId: 'workspace-demo',
      hasRawUpload: true,
      hasRawPrompt: true,
      hasApiKey: false,
      hasPii: false,
    }, { store, now: () => new Date('2026-05-25T00:00:00.000Z') })
    const listed = await handleRetentionRunApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(response.status).toBe(202)
    expect(response.body.result.deletedArtifactIds).toEqual(['raw_upload'])
    expect(response.body.result.auditExportRefs).toEqual(['audit-export:workspace-demo:2026-05-25'])
    expect(listed.body.jobs.map(job => job.status)).toContain('completed')
  })

  it('runs retention jobs against Supabase retention rows and artifact deletion', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    })

    const response = await handleRetentionRunApi('POST', {
      workspaceId: 'workspace-demo',
      hasRawUpload: true,
      hasRawPrompt: false,
      hasApiKey: false,
      hasPii: false,
    }, {
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      },
      fetcher,
      now: () => new Date('2026-05-25T00:00:00.000Z'),
    })

    expect(response.status).toBe(202)
    expect(response.body.persistence).toBe('supabase')
    expect(response.body.result.deletedArtifactIds).toEqual(['raw_upload'])
    expect(calls.some(call => call.url.includes('/rest/v1/retention_jobs') && call.init.method === 'POST')).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/report_artifacts?') && call.init.method === 'DELETE')).toBe(true)
  })

  it('reports runtime capability status from production env', async () => {
    const missing = await handleRuntimeStatusApi('GET', undefined, { env: {} })
    const connected = await handleRuntimeStatusApi('GET', undefined, {
      env: {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        OPENAI_API_KEY: 'sk-test',
        AGENT_SERVICE_URL: 'http://127.0.0.1:8000',
        RESEND_API_KEY: 're_test',
      },
    })
    const connectedWithNewNames = await handleRuntimeStatusApi('GET', undefined, {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SECRET_KEY: 'secret-key',
        OPENAI_API_KEY: 'sk-test',
        AGENT_SERVICE_URL: 'http://127.0.0.1:8000',
      },
    })

    expect(missing.body.agentRuntime.status).toBe('unavailable')
    expect(missing.body.persistence.status).toBe('unavailable')
    expect(missing.body.productName).toBe('AgentPayroll')
    expect(missing.body.corpusReadiness.status).toBe('unavailable')
    expect(connected.body.agentRuntime.status).toBe('provider_llm')
    expect(connected.body.persistence.status).toBe('provider_llm')
    expect(connected.body.corpusReadiness.items.model_benchmark.status).toBe('needs_review')
    expect(connected.body.connectors.resend_email.status).toBe('provider_llm')
    expect(connected.body.connectors.stripe_billing.status).toBe('connector_not_configured')
    expect(connectedWithNewNames.body.persistence.status).toBe('provider_llm')
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

  it('accepts GET query params for the App Router RAG evidence contract', async () => {
    const response = await handleP1RagEvidenceApi('GET', undefined, {
      store: createMemoryKvStore(),
      query: {
        workspaceId: 'workspace-demo',
        query: 'cache margin',
      },
    })

    expect(response.status).toBe(200)
    expect(response.body.metadata).toMatchObject({ workspaceId: 'workspace-demo', query: 'cache margin' })
    expect(response.body.evidence.mayOverrideFacts).toBe(false)
  })

  it('serves split corpusCollections for C2, C4, and C9 while preserving legacy P1 evidence', async () => {
    const store = createMemoryKvStore()
    const response = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cache quality schema decision',
      structuredFactRefs: ['fact:gemini-3-5-flash'],
      corpusCollections: {
        model_benchmark: [{
          id: 'evidence:lmarena-leaderboard',
          corpusId: 'model_benchmark',
          text: 'Human preference benchmark evidence for quality routing.',
          sourceUrl: 'https://lmarena.ai/leaderboard',
          refs: ['evidence:lmarena-leaderboard'],
          mayOverrideFacts: false,
          metadata: {
            sourceKind: 'benchmark',
            corpusTrust: 'third_party_benchmark',
            ownerAgentIds: ['model_inference_research'],
            consumerAgentIds: ['model_inference_research'],
            cadence: 'weekly',
          },
        }],
        usage_schema: [{
          id: 'evidence:usage-schema-openrouter',
          corpusId: 'usage_schema',
          text: 'OpenRouter usage schema includes prompt and completion token fields.',
          sourceUrl: 'https://openrouter.ai/docs',
          refs: ['evidence:usage-schema-openrouter'],
          mayOverrideFacts: false,
          metadata: {
            sourceKind: 'log_schema',
            corpusTrust: 'official_docs',
            ownerAgentIds: ['usage_data_ingestion'],
            consumerAgentIds: ['usage_data_ingestion'],
            cadence: 'weekly',
          },
        }],
        decision_history: [{
          id: 'decision:cache-policy',
          corpusId: 'decision_history',
          text: 'Decision history held cache routing until quality review.',
          sourceUrl: 'decision:cache-policy',
          refs: ['decision:cache-policy'],
          mayOverrideFacts: false,
          metadata: {
            sourceKind: 'decision',
            corpusTrust: 'internal_authoritative',
            ownerAgentIds: ['knowledge_release_ops'],
            consumerAgentIds: ['knowledge_release_ops'],
            cadence: 'on_write',
          },
        }],
      },
    }, { store })

    expect(response.status).toBe(200)
    expect(response.body.corpusEvidence?.mayOverrideFacts).toBe(false)
    expect(response.body.corpusEvidence?.results.model_benchmark.refs).toEqual(['evidence:lmarena-leaderboard'])
    expect(response.body.corpusEvidence?.results.usage_schema.refs).toEqual(['evidence:usage-schema-openrouter'])
    expect(response.body.corpusEvidence?.results.decision_history.refs).toEqual(['decision:cache-policy'])
    expect(response.body.evidence.results.benchmark_evidence.refs).toEqual(['evidence:lmarena-leaderboard'])

    const lastQuery = await store.getJson<{ refs: string[] }>('workspace:workspace-demo:p1-rag-last-query')
    expect(lastQuery?.refs).toEqual(expect.arrayContaining([
      'evidence:lmarena-leaderboard',
      'evidence:usage-schema-openrouter',
      'decision:cache-policy',
    ]))
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

  it('blocks request-body officialDocChunks when production storage is not configured', async () => {
    const response = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cached token pricing',
      officialDocChunks: [{
        id: 'source:request-body-only#pricing',
        collection: 'official_docs',
        text: 'Request-local pricing should not become production evidence.',
        sourceUrl: 'https://example.com',
        refs: ['source:request-body-only'],
        metadata: {
          sourceId: 'request-body-only',
          provider: 'example',
          servingProvider: 'first_party',
          modelFamilies: ['example'],
          sourceKind: 'pricing',
          sourceLanguage: 'en',
          pricingRegion: 'global',
          officialSourceTrust: 'official_pricing',
          capturedAt: '2026-05-25T00:00:00.000Z',
          headingPath: ['Example', 'Pricing'],
          sectionType: 'pricing',
          contentHash: 'request-body-only',
        },
      }],
    })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('storage_not_configured')
    expect(response.body.evidence.results.official_docs.refs).not.toContain('source:request-body-only')
  })

  it('indexes official RAG chunks once and retrieves evidence from workspace storage', async () => {
    const store = createMemoryKvStore()
    const officialDocChunks = chunkApiDoc(normalizeApiDoc({
      source: {
        id: 'openai-api-pricing',
        modelOwner: 'openai',
        servingProvider: 'first_party',
        modelFamilies: ['gpt'],
        sourceKind: 'pricing',
        url: 'https://openai.com/api/pricing/',
        pricingRegion: 'global',
        sourceLanguage: 'en',
        officialSourceTrust: 'official_pricing',
      },
      capturedAt: '2026-05-25T00:00:00.000Z',
      rawText: '# OpenAI pricing\n\nCached input token pricing is discounted for repeated context.',
    }))

    const indexed = await handleRagIndexApi('POST', {
      workspaceId: 'workspace-demo',
      chunks: officialDocChunks,
    }, { store })
    const evidence = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cached input token pricing',
      officialDocChunks: [{
        ...officialDocChunks[0],
        id: 'chunk:request-body-ignored',
        text: 'Unrelated request-local body chunk.',
        refs: ['source:request-body-ignored'],
      }],
    }, { store })

    expect(indexed.status).toBe(202)
    expect(indexed.body.stats.itemCount).toBe(officialDocChunks.length)
    expect(evidence.body.evidence.results.official_docs.refs).toContain('source:openai-api-pricing')
    expect(evidence.body.evidence.results.official_docs.refs).not.toContain('source:request-body-ignored')
  })

  it('uses Supabase pgvector for official RAG index and retrieval when production env is configured', async () => {
    const officialDocChunks = chunkApiDoc(normalizeApiDoc({
      source: {
        id: 'openai-api-pricing',
        modelOwner: 'openai',
        servingProvider: 'first_party',
        modelFamilies: ['gpt'],
        sourceKind: 'pricing',
        url: 'https://openai.com/api/pricing/',
        pricingRegion: 'global',
        sourceLanguage: 'en',
        officialSourceTrust: 'official_pricing',
      },
      capturedAt: '2026-05-25T00:00:00.000Z',
      rawText: '# OpenAI pricing\n\nCached input token pricing is discounted for repeated context.',
    }))
    const env = {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      OPENAI_API_KEY: 'sk-test',
    }
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init: init ?? {} })
      if (url === 'https://api.openai.com/v1/embeddings') {
        return new Response(JSON.stringify({ data: [{ embedding: [1, 0, 0] }] }), { status: 200 })
      }
      if (url.includes('/rest/v1/rpc/match_rag_chunks')) {
        return new Response(JSON.stringify([{
          chunk_id: officialDocChunks[0].id,
          collection: 'official_docs',
          source_url: officialDocChunks[0].sourceUrl,
          text: officialDocChunks[0].text,
          refs: officialDocChunks[0].refs,
          metadata: officialDocChunks[0].metadata,
          similarity: 0.91,
        }]), { status: 200 })
      }
      if (url.includes('/rest/v1/rag_chunks?') && init?.method === 'GET') {
        return new Response(JSON.stringify([{ chunk_id: officialDocChunks[0].id }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    }

    const indexed = await handleRagIndexApi('POST', {
      workspaceId: 'workspace-demo',
      chunks: officialDocChunks,
    }, { env, fetcher })
    const evidence = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cached input token pricing',
      officialDocChunks: [{
        ...officialDocChunks[0],
        id: 'chunk:request-body-ignored',
        text: 'Unrelated request-local body chunk.',
        refs: ['source:request-body-ignored'],
      }],
    }, { env, fetcher })

    expect(indexed.status).toBe(202)
    expect(indexed.body.persistence).toBe('supabase')
    expect(indexed.body.stats).toMatchObject({ collection: 'official_docs', dimensions: 1536, itemCount: 1 })
    expect(evidence.body.persistence).toBe('supabase')
    expect(evidence.body.evidence.results.official_docs.refs).toContain('source:openai-api-pricing')
    expect(evidence.body.evidence.results.official_docs.refs).not.toContain('source:request-body-ignored')
    expect(calls.some(call => call.url === 'https://api.openai.com/v1/embeddings')).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/rag_chunks'))).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/rpc/match_rag_chunks'))).toBe(true)
  })

  it('accepts production RAG index collections beyond official docs', async () => {
    const officialDocChunks = chunkApiDoc(normalizeApiDoc({
      source: {
        id: 'usage-schema-openai',
        modelOwner: 'openai',
        servingProvider: 'first_party',
        modelFamilies: ['gpt'],
        sourceKind: 'schema',
        url: 'https://platform.openai.com/docs/api-reference/usage',
        pricingRegion: 'global',
        sourceLanguage: 'en',
        officialSourceTrust: 'official_docs',
      },
      capturedAt: '2026-05-25T00:00:00.000Z',
      rawText: '# Usage schema\n\nUsage rows include tokens, model, customer, plan, and feature dimensions.',
    })).map(chunk => ({ ...chunk, collection: 'usage_schema' as const }))
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init: init ?? {} })
      if (url === 'https://api.openai.com/v1/embeddings') {
        return new Response(JSON.stringify({ data: [{ embedding: [1, 0, 0] }] }), { status: 200 })
      }
      if (url.includes('/rest/v1/rag_chunks?') && init?.method === 'GET') {
        return new Response(JSON.stringify([{ chunk_id: officialDocChunks[0].id }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    }

    const indexed = await handleRagIndexApi('POST', {
      workspaceId: 'workspace-demo',
      collection: 'usage_schema',
      chunks: officialDocChunks,
    }, {
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        OPENAI_API_KEY: 'sk-test',
      },
      fetcher,
    })

    expect(indexed.status).toBe(202)
    expect(indexed.body.stats.collection).toBe('usage_schema')
    expect(JSON.parse(String(calls.find(call => call.url.includes('/rest/v1/rag_chunks'))?.init.body))[0].collection).toBe('usage_schema')
  })

  it('retrieves production RAG evidence across Supabase C1/C2/C3/C4/C9 collections', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const metadata = {
      sourceId: 'source',
      provider: 'openai',
      servingProvider: 'first_party',
      modelFamilies: ['gpt'],
      sourceKind: 'pricing',
      sourceLanguage: 'en',
      pricingRegion: 'global',
      officialSourceTrust: 'official_pricing',
      capturedAt: '2026-05-25T00:00:00.000Z',
      headingPath: ['Pricing'],
      sectionType: 'pricing',
      contentHash: 'hash',
    }
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init: init ?? {} })
      if (url === 'https://api.openai.com/v1/embeddings') {
        return new Response(JSON.stringify({ data: [{ embedding: [1, 0, 0] }] }), { status: 200 })
      }
      if (url.includes('/rest/v1/rpc/match_rag_chunks')) {
        const body = JSON.parse(String(init?.body))
        const collection = body.match_collection
        const refsByCollection: Record<string, string[]> = {
          official_docs: ['source:official-pricing'],
          benchmark_evidence: ['evidence:lmarena'],
          serving_economics: ['serving:vllm'],
          usage_schema: ['evidence:usage-schema'],
          decision_history: ['decision:cache-routing'],
        }
        return new Response(JSON.stringify([{
          chunk_id: `chunk:${collection}`,
          collection,
          source_url: `https://example.com/${collection}`,
          text: `${collection} cache margin evidence.`,
          refs: refsByCollection[collection],
          metadata: {
            ...metadata,
            sourceId: collection,
            officialSourceTrust: collection === 'official_docs' ? 'official_pricing' : 'standard_reference',
            reviewStatus: collection === 'benchmark_evidence' ? 'needs_review' : 'accepted',
          },
          similarity: 0.88,
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 200 })
    })

    const response = await handleP1RagEvidenceApi('POST', {
      workspaceId: 'workspace-demo',
      query: 'cache margin',
      structuredFactRefs: ['fact:accepted-pricing'],
      topK: 1,
      collections: {
        official_docs: [{ id: 'request-body-ignored', text: 'should not appear' }],
        benchmark_evidence: [],
        decision_history: [],
      },
    }, {
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        OPENAI_API_KEY: 'sk-test',
      },
      fetcher,
    })

    expect(response.status).toBe(200)
    expect(response.body.persistence).toBe('supabase')
    expect(response.body.evidence.results.official_docs.refs).toEqual(['source:official-pricing', 'fact:accepted-pricing'])
    expect(response.body.evidence.results.benchmark_evidence.refs).toEqual(['evidence:lmarena'])
    expect(response.body.evidence.results.decision_history.refs).toEqual(['decision:cache-routing'])
    expect(response.body.evidence.results.benchmark_evidence.warnings).toContain('needs_review')
    expect(response.body.contextBlocks?.map(block => block.collection)).toEqual(expect.arrayContaining([
      'official_docs',
      'benchmark_evidence',
      'serving_economics',
      'usage_schema',
      'decision_history',
    ]))
    expect(calls.filter(call => call.url.includes('/rest/v1/rpc/match_rag_chunks'))).toHaveLength(5)
    expect(JSON.stringify(response.body.evidence)).not.toContain('request-body-ignored')
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

  it('does not use demo Watchtower candidates when production ledger storage is missing', async () => {
    const response = await handleOfficialUpdatesApi('GET', undefined, { query: { workspaceId: 'workspace-demo' } })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('storage_not_configured')
    expect(response.body.inbox.reviewCandidates).toEqual([])
    expect(response.body.inbox.ragRecordCount).toBe(0)
  })

  it('returns official updates from Supabase watchtower runs and accepted facts', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/rest/v1/watchtower_runs')) {
        return new Response(JSON.stringify([{
          id: 'watchtower-run-1',
          workspace_id: 'workspace-demo',
          status: 'review_required',
          parser_summary: {
            sourceChangedCount: 1,
            snippets: [{
              snippetId: 'source:openai-api-pricing#pricing',
              sourceId: 'openai-api-pricing',
              sourceUrl: 'https://openai.com/api/pricing/',
              sourceKind: 'pricing',
              provider: 'openai',
              servingProvider: 'first_party',
              pricingRegion: 'global',
              text: 'Official pricing changed.',
              hash: 'hash-openai',
              capturedAt: '2026-05-25T00:00:00.000Z',
              refs: ['source:openai-api-pricing'],
            }],
          },
          candidates: [{
            candidateId: 'candidate:openai-gpt',
            detectedAt: '2026-05-25T00:00:00.000Z',
            sourceId: 'openai-api-pricing',
            sourceUrl: 'https://openai.com/api/pricing/',
            title: 'OpenAI official pricing candidate',
            modelNames: ['GPT test'],
            modelOwner: 'openai',
            modelFamily: 'gpt',
            servingProvider: 'first_party',
            pricingRegion: 'global',
            currency: 'USD',
            sourceLanguage: 'en',
            pricingStatusSuggestion: 'verified',
            hostedThirdPartyModel: false,
            status: 'needs_review',
            evidenceRefs: ['source:openai-api-pricing'],
            confidence: 'high',
            reviewNotes: [],
          }],
          started_at: '2026-05-25T00:00:00.000Z',
          completed_at: '2026-05-25T00:01:00.000Z',
        }]), { status: 200 })
      }
      if (url.includes('/rest/v1/accepted_facts')) {
        return new Response(JSON.stringify([{
          id: 'fact:openai:gpt-test',
          workspace_id: 'workspace-demo',
          source_ref: 'source:openai-api-pricing',
          fact_payload: { modelFamily: 'gpt', metric: 'input' },
          confidence: 'high',
          accepted_by: 'reviewer@example.com',
          accepted_at: '2026-05-25T00:02:00.000Z',
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([]), { status: 200 })
    })
    const response = await handleOfficialUpdatesApi('GET', undefined, {
      query: { workspaceId: 'workspace-demo' },
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      },
      fetcher,
    })

    expect(response.status).toBe(200)
    expect(response.body.persistence).toBe('supabase')
    expect(response.body.latestRun?.id).toBe('watchtower-run-1')
    expect(response.body.acceptedFacts?.[0]).toMatchObject({ id: 'fact:openai:gpt-test', confidence: 'high' })
    expect(response.body.inbox.reviewCandidates.map(candidate => candidate.candidateId)).toEqual(['candidate:openai-gpt'])
    expect(response.body.inbox.ragRecordCount).toBe(1)
    expect(response.body.inbox.reviewCandidates.map(candidate => candidate.status)).not.toContain('accepted')
  })

  it('reviews Watchtower candidates through Supabase and returns the accepted fact diff', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    })

    const response = await handleOfficialUpdatesApi('POST', {
      workspaceId: 'workspace-demo',
      candidateId: 'candidate:openai-gpt',
      action: 'accept',
      reviewer: 'owner@example.com',
      reason: 'Source and price reviewed.',
      confidence: 'high',
      factPayload: { id: 'fact:openai-gpt', modelFamily: 'gpt', sourceRef: 'source:openai-api-pricing' },
    }, {
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      },
      fetcher,
    })

    expect(response.status).toBe(202)
    expect(response.body.persistence).toBe('supabase')
    expect(response.body.reviewEvent).toMatchObject({
      action: 'accept',
      candidateId: 'candidate:openai-gpt',
      factId: 'fact:openai-gpt',
    })
    expect(response.body.acceptedFacts?.[0]).toMatchObject({
      id: 'fact:openai-gpt',
      sourceRef: 'source:openai-api-pricing',
    })
    expect(calls.some(call => call.url.includes('/rest/v1/watchtower_candidates'))).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/fact_review_events'))).toBe(true)
    expect(calls.some(call => call.url.includes('/rest/v1/accepted_facts'))).toBe(true)
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

  it('lists Supabase external action ledger proof for readiness surfaces', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/rest/v1/external_actions?')) {
        return new Response(JSON.stringify([{
          id: 'external:workspace-demo:billing-change:demo-rate-card',
          workspace_id: 'workspace-demo',
          kind: 'billing_change',
          status: 'executed',
          payload: { policy: 'usage_cap', rollbackRef: 'rollback:demo-rate-card' },
          approval: {
            approver: 'owner@example.com',
            reason: 'Approved sandbox billing push.',
            decidedAt: '2026-05-25T00:00:00.000Z',
          },
          rollback_metadata: { rollbackRef: 'rollback:demo-rate-card' },
          created_at: '2026-05-25T00:00:00.000Z',
        }]), { status: 200 })
      }
      if (url.includes('/rest/v1/external_action_ledger?')) {
        return new Response(JSON.stringify([{
          id: 'ledger:external:workspace-demo:billing-change:demo-rate-card',
          workspace_id: 'workspace-demo',
          action_id: 'external:workspace-demo:billing-change:demo-rate-card',
          connector_id: 'stripe_billing',
          connector_mode: 'dry_run',
          idempotency_key: 'idem:workspace-demo:demo-rate-card',
          external_ref: 'dry-run:workspace-demo:billing_change',
          rollback_metadata: { rollbackRef: 'rollback:demo-rate-card' },
          ledger_payload: {
            kind: 'billing_change',
            sourceRefs: ['decision:pricing'],
            approvedBy: 'owner@example.com',
            approvedAt: '2026-05-25T00:00:00.000Z',
          },
          executed_at: '2026-05-25T00:01:00.000Z',
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([]), { status: 200 })
    })

    const listed = await handleP1ExternalActionsApi('GET', undefined, {
      query: { workspaceId: 'workspace-demo' },
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      },
      fetcher,
    })

    expect(listed.status).toBe(200)
    expect(listed.body.persistence).toBe('supabase')
    expect(listed.body.actions[0]).toMatchObject({ status: 'executed', kind: 'billing_change' })
    expect(listed.body.ledger[0]).toMatchObject({
      connectorMode: 'dry_run',
      connectorId: 'stripe_billing',
      idempotencyKey: 'idem:workspace-demo:demo-rate-card',
      rollbackMetadata: { rollbackRef: 'rollback:demo-rate-card' },
    })
  })

  it('blocks approved external actions until connector config and idempotency are supplied', async () => {
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
    expect(executed.status).toBe(409)
    expect(executed.body.execution).toMatchObject({ status: 'blocked', connectorMode: null, error: 'connector_not_configured' })
    expect(listed.body.actions).toHaveLength(1)
    expect(listed.body.ledger).toHaveLength(0)
  })

  it('executes approved external actions only with explicit connector config and persists ledger entries', async () => {
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

    await handleP1ExternalActionsApi('POST', {
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
      connectorMode: 'dry_run',
      connectorId: 'resend_email',
      connectorConfigured: true,
      idempotencyKey: 'idem:email:follow-up',
    }, { store })
    const listed = await handleP1ExternalActionsApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(executed.status).toBe(202)
    expect(executed.body.execution).toMatchObject({
      status: 'executed',
      connectorMode: 'dry_run',
      connectorId: 'resend_email',
      idempotencyKey: 'idem:email:follow-up',
    })
    expect(executed.body.ledger).toEqual([expect.objectContaining({
      actionId,
      status: 'ledgered',
      connectorId: 'resend_email',
      idempotencyKey: 'idem:email:follow-up',
    })])
    expect(listed.body.actions).toHaveLength(1)
    expect(listed.body.ledger).toHaveLength(1)
  })

  it('calls a configured live external connector before ledgering execution', async () => {
    const store = createMemoryKvStore()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'email:test-message' }), { status: 202 }))
    const draft = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'draft',
      kind: 'email_alert',
      title: 'Decision follow-up',
      payload: { recipient: 'founder@example.com', message: 'Follow up is due.' },
      sourceRefs: ['decision:follow-up'],
    }, { store })
    const actionId = draft.body.action?.id
    await handleP1ExternalActionsApi('POST', {
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
      connectorMode: 'live',
      connectorId: 'resend_email',
      idempotencyKey: 'idem:email:live-follow-up',
    }, {
      store,
      fetcher,
      env: { RESEND_API_KEY: 're_test' },
      now: () => new Date('2026-05-25T00:01:00.000Z'),
    })

    expect(executed.status).toBe(202)
    expect(fetcher).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer re_test',
        'Idempotency-Key': 'idem:email:live-follow-up',
      }),
    }))
    expect(executed.body.execution?.externalRef).toBe('email:test-message')
    expect(executed.body.ledger[0]).toMatchObject({
      connectorMode: 'live',
      connectorId: 'resend_email',
      externalRef: 'email:test-message',
      approvedBy: 'owner@example.com',
      approvedAt: expect.any(String),
    })
  })

  it('keeps Data Room exports behind approval, connector success, idempotency, and ledger', async () => {
    const store = createMemoryKvStore()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'data-room:export_123' }), { status: 202 }))
    const draft = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'draft',
      kind: 'audit_export',
      title: 'Data Room export',
      payload: {
        artifactIds: ['normalized_usage_snapshot', 'decision_log'],
        excludedArtifactIds: ['raw_prompt', 'api_key'],
      },
      sourceRefs: ['asset:data_room', 'decision:human_approval_required'],
    }, { store })
    const actionId = draft.body.action?.id

    await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'approve',
      actionId,
      approver: 'security@example.com',
      reason: 'Export sanitized customer audit package.',
    }, { store, now: () => new Date('2026-05-25T00:00:00.000Z') })
    const blocked = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'execute',
      actionId,
      connectorMode: 'live',
      connectorId: 'data_room_export',
    }, { store, env: { DATA_ROOM_EXPORT_URL: 'https://data-room.example/export' }, fetcher })
    const executed = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'execute',
      actionId,
      connectorMode: 'live',
      connectorId: 'data_room_export',
      idempotencyKey: 'idem:data-room:workspace-demo',
    }, {
      store,
      env: { DATA_ROOM_EXPORT_URL: 'https://data-room.example/export' },
      fetcher,
      now: () => new Date('2026-05-25T00:01:00.000Z'),
    })

    expect(blocked.status).toBe(409)
    expect(blocked.body.execution?.error).toBe('idempotency_key_required')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('https://data-room.example/export', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'idem:data-room:workspace-demo' }),
    }))
    expect(executed.status).toBe(202)
    expect(executed.body.ledger).toEqual([expect.objectContaining({
      kind: 'audit_export',
      connectorId: 'data_room_export',
      externalRef: 'data-room:export_123',
      approvedBy: 'security@example.com',
      approvedAt: '2026-05-25T00:00:00.000Z',
    })])
  })

  it('does not ledger live connector failures', async () => {
    const store = createMemoryKvStore()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 500 }))
    const draft = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'draft',
      kind: 'email_alert',
      title: 'Decision follow-up',
      payload: { recipient: 'founder@example.com', message: 'Follow up is due.' },
      sourceRefs: ['decision:follow-up'],
    }, { store })
    const actionId = draft.body.action?.id
    await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'approve',
      actionId,
      approver: 'owner@example.com',
      reason: 'Send the weekly follow-up draft.',
    }, { store })

    const failed = await handleP1ExternalActionsApi('POST', {
      workspaceId: 'workspace-demo',
      action: 'execute',
      actionId,
      connectorMode: 'live',
      connectorId: 'resend_email',
      idempotencyKey: 'idem:email:failure',
    }, { store, env: { RESEND_API_KEY: 're_test' }, fetcher })
    const listed = await handleP1ExternalActionsApi('GET', undefined, { store, query: { workspaceId: 'workspace-demo' } })

    expect(failed.status).toBe(502)
    expect(failed.body.error).toBe('connector_execution_failed')
    expect(listed.body.actions[0]).toMatchObject({ status: 'approved' })
    expect(listed.body.ledger).toEqual([])
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
