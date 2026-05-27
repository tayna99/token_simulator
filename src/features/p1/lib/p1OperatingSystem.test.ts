import { describe, expect, it } from 'vitest'
import {
  analyzeVllmServingEconomics,
  approveExternalAction,
  buildBenchmarkMarketplace,
  buildDataRoomWorkspace,
  buildExternalActionDraft,
  buildP1ActionApprovalGate,
  buildP1OperatingContract,
  buildCustomerWorkspaceDashboard,
  buildRetentionAutomationPlan,
  buildVllmServingReview,
  calculateVllmServingCost,
  draftBillingChange,
  draftP1Alert,
  executeExternalAction,
  normalizeSdkLiteUsageEvent,
  retrieveP1VectorRagEvidence,
  normalizeP1UsageAdapterExport,
  retrieveP1RagEvidence,
  runRetentionJobs,
  selectBenchmarkBasis,
} from './p1OperatingSystem'

describe('p1OperatingSystem', () => {
  it('builds a shared P1 operating contract for workspace, snapshot, agent run, approval, and ledger identity', () => {
    const contract = buildP1OperatingContract({
      workspaceId: ' AgentPayroll/May ',
      snapshotVersion: 'snapshot:cost:abc123',
      agentRunId: 'agent-run-1',
      approvalStatus: 'draft',
      ledgerEntryId: 'ledger-1',
    })

    expect(contract.workspaceId).toBe('AgentPayroll-May')
    expect(contract.snapshotVersion).toBe('snapshot:cost:abc123')
    expect(contract.agentRunId).toBe('agent-run-1')
    expect(contract.approvalStatus).toBe('draft')
    expect(contract.ledgerEntryId).toBe('ledger-1')
    expect(contract.mutationPolicy).toEqual({
      phaseOrder: ['draft', 'human_approval', 'execute', 'rollback_metadata', 'ledger'],
      externalMutationAllowed: false,
    })
  })

  it('builds a customer-facing dashboard shell with sample, upload, workspace, and monthly review entrypoints', () => {
    const dashboard = buildCustomerWorkspaceDashboard({
      workspaceId: 'workspace-demo',
      organizationName: 'AgentPayroll',
      uploadCount: 2,
      decisionCount: 3,
      monthlyReviewCount: 1,
      reportCount: 1,
    })

    expect(dashboard.heroTitle).toBe('AI 기능 때문에 손해 보는 고객을 찾으세요')
    expect(dashboard.ctas.map(cta => cta.id)).toEqual([
      'upload_usage_export',
      'open_existing_workspace',
      'run_agentpayroll_sample',
    ])
    expect(dashboard.ctas[0].label).toBe('사용량 CSV 업로드')
    expect(dashboard.sections.map(section => section.id)).toEqual([
      'top_margin_leak',
      'margin_breaking_feature',
      'recommended_decision',
      'view_evidence',
      'draft_rate_card',
      'export_pdf',
    ])
  })

  it('keeps P1 RAG explanatory and refuses to override structured fact-table numbers', () => {
    const official = retrieveP1RagEvidence({
      kind: 'official_docs',
      query: 'cache discount',
      records: [{ id: 'openai-pricing', text: 'Cache behavior explanation', sourceUrl: 'https://openai.com/api/pricing/' }],
      structuredFactRefs: ['fact:gpt-5-mini'],
    })
    const benchmark = retrieveP1RagEvidence({
      kind: 'benchmark',
      query: 'enterprise peer',
      records: [],
      structuredFactRefs: [],
    })

    expect(official.refs).toEqual(['source:openai-pricing', 'fact:gpt-5-mini'])
    expect(official.mayOverrideFacts).toBe(false)
    expect(benchmark.found).toBe(false)
    expect(benchmark.warnings).toContain('baseline_unavailable')
  })

  it('keeps full vector RAG split by official docs, benchmarks, and decision history with typed refs', () => {
    const result = retrieveP1VectorRagEvidence({
      query: 'cache margin',
      topK: 3,
      collections: {
        official_docs: [
          { id: 'google-pricing', text: 'Cache pricing is a fact table source.', sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing' },
        ],
        benchmark_evidence: [
          { id: 'peer-cache', text: 'Peer teams report cache hit rate as a margin lever.' },
        ],
        decision_history: [
          { id: 'decision-cache-policy', text: 'Held cache policy until quality review.', sourceUrl: 'decision:cache-policy' },
        ],
      },
      structuredFactRefs: ['fact:gemini-3-5-flash'],
    })

    expect(result.mayOverrideFacts).toBe(false)
    expect(result.results.official_docs.refs).toEqual(['source:google-pricing', 'fact:gemini-3-5-flash'])
    expect(result.results.benchmark_evidence.refs).toEqual(['evidence:peer-cache'])
    expect(result.results.decision_history.refs).toEqual(['decision:decision-cache-policy'])
    expect(result.results.official_docs.scores[0]).toBeGreaterThan(0)
    expect(result.warnings).toEqual([])
  })

  it('ranks split RAG collections deterministically and never fabricates sparse benchmark averages', () => {
    const result = retrieveP1VectorRagEvidence({
      query: 'cache margin',
      topK: 1,
      collections: {
        official_docs: [
          { id: 'unrelated-doc', text: 'Model release announcement.' },
          { id: 'cache-doc', text: 'Cache margin and pricing documentation.' },
        ],
        benchmark_evidence: [],
        decision_history: [
          { id: 'cache-decision', text: 'Decision history for cache margin review.' },
          { id: 'routing-decision', text: 'Routing only.' },
        ],
      },
      structuredFactRefs: [],
    })

    expect(result.results.official_docs.records.map(record => record.id)).toEqual(['cache-doc'])
    expect(result.results.decision_history.records.map(record => record.id)).toEqual(['cache-decision'])
    expect(result.results.benchmark_evidence.records).toEqual([])
    expect(result.results.benchmark_evidence.refs).toEqual([])
    expect(result.results.benchmark_evidence.warnings).toContain('baseline_unavailable')
    expect(JSON.stringify(result)).not.toMatch(/average|peerAverage|mean/i)
  })

  it('normalizes SDK and gateway exports through Trust inspection before snapshot use', () => {
    const normalized = normalizeP1UsageAdapterExport({
      source: 'vercel_ai_gateway',
      rawCsv: [
        'timestamp,customer_id,plan_id,feature,model,input_tokens,output_tokens,retry_count,revenue',
        '2026-05-01,cust_1,pro,summary,gpt-5-mini,1000,200,1,99',
      ].join('\n'),
    })
    const blocked = normalizeP1UsageAdapterExport({
      source: 'openai',
      rawCsv: 'timestamp,prompt,api_key,input_tokens,output_tokens\n2026-05-01,hello,sk-test,100,20',
    })

    expect(normalized.trustInspection.allowedForSnapshot).toBe(true)
    expect(normalized.dimensions).toEqual(expect.arrayContaining(['customer', 'feature', 'model', 'plan']))
    expect(normalized.schemaEvidenceRefs).toEqual(expect.arrayContaining(['evidence:usage-schema-vercel-ai-gateway']))
    expect(blocked.trustInspection.allowedForSnapshot).toBe(false)
    expect(blocked.snapshotAllowed).toBe(false)
  })

  it('recognizes OpenRouter and LiteLLM usage schema evidence without admitting raw fields', () => {
    const openrouter = normalizeP1UsageAdapterExport({
      source: 'openrouter',
      rawCsv: 'timestamp,request_id,model,prompt_tokens,completion_tokens,session_id\n2026-05-25,req_1,gpt-5.5,100,20,sess_1',
    })
    const litellm = normalizeP1UsageAdapterExport({
      source: 'litellm',
      rawCsv: 'timestamp,customer_id,model,input_tokens,output_tokens,api_key\n2026-05-25,cust_1,gpt-5.5,100,20,sk-test',
    })

    expect(openrouter.schemaEvidenceRefs).toEqual(['evidence:usage-schema-openrouter'])
    expect(openrouter.missingDimensions).toContain('customer')
    expect(litellm.schemaEvidenceRefs).toEqual(['evidence:usage-schema-litellm'])
    expect(litellm.snapshotAllowed).toBe(false)
    expect(litellm.trustInspection.warnings).toContain('api_key_candidate_detected')
  })

  it('accepts SDK-lite metadata events but blocks raw prompt, completion, API key, or PII fields', () => {
    const accepted = normalizeSdkLiteUsageEvent({
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
    })
    const blocked = normalizeSdkLiteUsageEvent({
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
        userEmail: 'user@example.com',
      },
    })

    expect(accepted.snapshotAllowed).toBe(true)
    expect(accepted.normalizedEvent).toMatchObject({
      customer: 'cust_1',
      feature: 'support_reply',
      model: 'gpt-5-mini',
      plan: 'pro',
      session: 'session_1',
      agent_run: 'agent_run_1',
    })
    expect(blocked.snapshotAllowed).toBe(false)
    expect(blocked.excludedFields).toEqual(expect.arrayContaining(['rawPrompt', 'apiKey', 'userEmail']))
    expect(blocked.trustInspection.warnings).toEqual(expect.arrayContaining([
      'raw_prompt_detected',
      'api_key_candidate_detected',
      'pii_candidate_detected',
    ]))
  })

  it('classifies vLLM/GPU serving bottlenecks without mixing them into provider API cost math', () => {
    const analysis = analyzeVllmServingEconomics({
      ttftMs: 2500,
      itlMs: 45,
      throughputTokensPerSecond: 320,
      gpuUtilizationPct: 0.42,
      kvCacheUsagePct: 0.91,
      p95LatencyMs: 9000,
      p99LatencyMs: 14000,
      prefixCacheHitRate: 0.18,
      batchingEfficiency: 0.31,
      p95ContextTokens: 42000,
    })

    expect(analysis.costAuthority).toBe('self_hosted_serving_economics_only')
    expect(analysis.bottlenecks).toEqual(expect.arrayContaining([
      'prefill_heavy',
      'kv_cache_pressure',
      'poor_prefix_caching',
      'low_batching_efficiency',
      'oversized_context',
    ]))
    expect(analysis.recommendations).toContain('prefix caching what-if')
  })

  it('calculates self-hosted vLLM/GPU serving cost separately from provider API COGS', () => {
    const cost = calculateVllmServingCost({
      gpuHourlyUsd: 3,
      gpuCount: 2,
      activeHoursPerMonth: 720,
      monthlyInputTokens: 120_000_000,
      monthlyOutputTokens: 30_000_000,
      monthlyRequestCount: 300_000,
      monthlyCustomerCount: 120,
      gpuUtilizationPct: 0.4,
      throughputTokensPerSecond: 180,
      infraOverheadPct: 0.15,
    })

    expect(cost.costAuthority).toBe('self_hosted_serving_economics_only')
    expect(cost.providerApiCostExcluded).toBe(true)
    expect(cost.monthlyGpuCostUsd).toBe(4320)
    expect(cost.monthlyInfraOverheadUsd).toBe(648)
    expect(cost.monthlyServingCostUsd).toBe(4968)
    expect(cost.monthlyServedTokens).toBe(150_000_000)
    expect(cost.costPerMillionTokensUsd).toBeCloseTo(33.12, 2)
    expect(cost.costPerRequestUsd).toBeCloseTo(0.01656, 5)
    expect(cost.costPerCustomerUsd).toBeCloseTo(41.4, 2)
    expect(cost.idleWasteUsd).toBeCloseTo(2980.8, 2)
    expect(JSON.stringify(cost)).not.toMatch(/providerApiCostUsd|providerApiMonthlyCostUsd/i)
  })

  it('keeps alert and billing actions as approval-gated drafts', () => {
    const alert = draftP1Alert({
      type: 'margin_breach',
      thresholdRef: 'basis:rule:gross_margin_thin_pct',
      decisionRefs: ['decision:demo'],
      destination: 'slack',
    })
    const billing = draftBillingChange({
      policy: 'usage_cap',
      decisionRef: 'decision:pricing',
      rollbackRef: 'rollback:pricing-v1',
    })

    expect(alert.status).toBe('draft')
    expect(alert.requiresHumanApproval).toBe(true)
    expect(billing.status).toBe('draft')
    expect(billing.executionAllowed).toBe(false)
  })

  it('does not allow external alert or billing execution until human approval and rollback metadata are present', () => {
    const alert = draftP1Alert({
      type: 'budget_overrun',
      thresholdRef: 'basis:rule:monthly_budget',
      decisionRefs: ['decision:budget'],
      destination: 'email',
    })
    const billing = draftBillingChange({
      policy: 'credit_policy',
      decisionRef: 'decision:pricing',
      rollbackRef: 'rollback:pricing-v2',
    })

    expect(buildP1ActionApprovalGate({ draft: alert, approvalStatus: 'draft' })).toMatchObject({
      executionAllowed: false,
      nextRequiredStep: 'human_approval',
    })
    expect(buildP1ActionApprovalGate({ draft: billing, approvalStatus: 'approved' })).toMatchObject({
      executionAllowed: true,
      nextRequiredStep: 'execute',
      ledgerRequired: true,
    })
  })

  it('blocks every external action execution until approval is recorded', () => {
    const draft = buildExternalActionDraft({
      workspaceId: 'workspace-demo',
      kind: 'slack_alert',
      title: 'Margin breach alert',
      payload: { channel: '#ops', message: 'Margin breach needs review.' },
      sourceRefs: ['basis:rule:gross_margin_thin_pct'],
    })

    const result = executeExternalAction({
      action: draft,
      connectorMode: 'dry_run',
      executedAt: '2026-05-25T00:00:00.000Z',
    })

    expect(draft.status).toBe('draft')
    expect(draft.requiresHumanApproval).toBe(true)
    expect(result.status).toBe('blocked')
    expect(result.error).toBe('approval_required')
    expect(result.ledgerEntry).toBeNull()
  })

  it('blocks approved external actions when no connector is configured', () => {
    const draft = buildExternalActionDraft({
      workspaceId: 'workspace-demo',
      kind: 'email_alert',
      title: 'Decision follow-up',
      payload: { recipient: 'founder@example.com', message: 'Follow up is due.' },
      sourceRefs: ['decision:follow-up'],
    })
    const approved = approveExternalAction({
      action: draft,
      approver: 'owner@example.com',
      reason: 'Send the weekly follow-up draft.',
      decidedAt: '2026-05-25T00:00:00.000Z',
    })

    const result = executeExternalAction({
      action: approved,
      executedAt: '2026-05-25T00:01:00.000Z',
    })

    expect(result.status).toBe('blocked')
    expect(result.error).toBe('connector_not_configured')
    expect(result.connectorMode).toBeNull()
    expect(result.ledgerEntry).toBeNull()
  })

  it('executes approved external actions only with explicit connector config and idempotency', () => {
    const draft = buildExternalActionDraft({
      workspaceId: 'workspace-demo',
      kind: 'email_alert',
      title: 'Decision follow-up',
      payload: { recipient: 'founder@example.com', message: 'Follow up is due.' },
      sourceRefs: ['decision:follow-up'],
    })
    const approved = approveExternalAction({
      action: draft,
      approver: 'owner@example.com',
      reason: 'Send the weekly follow-up draft.',
      decidedAt: '2026-05-25T00:00:00.000Z',
    })

    const result = executeExternalAction({
      action: approved,
      connectorMode: 'dry_run',
      connectorConfig: { id: 'resend_email', configured: true },
      idempotencyKey: 'idem:email:follow-up',
      executedAt: '2026-05-25T00:01:00.000Z',
    })

    expect(approved.status).toBe('approved')
    expect(result.status).toBe('executed')
    expect(result.connectorMode).toBe('dry_run')
    expect(result.idempotencyKey).toBe('idem:email:follow-up')
    expect(result.ledgerEntry).toMatchObject({
      workspaceId: 'workspace-demo',
      actionId: draft.id,
      kind: 'email_alert',
      connectorMode: 'dry_run',
      connectorId: 'resend_email',
      idempotencyKey: 'idem:email:follow-up',
      approvedBy: 'owner@example.com',
      approvedAt: '2026-05-25T00:00:00.000Z',
      status: 'ledgered',
    })
  })

  it('routes Data Room audit exports through a separate connector before ledgering', () => {
    const dataRoom = buildDataRoomWorkspace({
      workspaceId: 'workspace-demo',
      hasRawUpload: true,
      hasRawPrompt: false,
      hasApiKey: false,
      hasPii: false,
    })
    const approved = approveExternalAction({
      action: dataRoom.auditExportDraft,
      approver: 'security@example.com',
      reason: 'Export sanitized audit package.',
      decidedAt: '2026-05-25T00:00:00.000Z',
    })

    const result = executeExternalAction({
      action: approved,
      connectorMode: 'dry_run',
      connectorConfig: { id: 'data_room_export', configured: true, rollbackMetadata: { retentionPolicy: 'sanitized_only' } },
      idempotencyKey: 'idem:data-room:workspace-demo',
      executedAt: '2026-05-25T00:01:00.000Z',
    })

    expect(result.status).toBe('executed')
    expect(result.connectorId).toBe('data_room_export')
    expect(result.ledgerEntry).toMatchObject({
      kind: 'audit_export',
      connectorId: 'data_room_export',
      approvedBy: 'security@example.com',
      approvedAt: '2026-05-25T00:00:00.000Z',
      idempotencyKey: 'idem:data-room:workspace-demo',
      rollbackMetadata: expect.objectContaining({ retentionPolicy: 'sanitized_only' }),
    })
  })

  it('requires rollback metadata before approved billing actions can execute', () => {
    const billing = buildExternalActionDraft({
      workspaceId: 'workspace-demo',
      kind: 'billing_change',
      title: 'Usage cap draft',
      payload: { policy: 'usage_cap', includedCredits: 1000 },
      sourceRefs: ['decision:pricing'],
    })
    const approved = approveExternalAction({
      action: billing,
      approver: 'owner@example.com',
      reason: 'Pricing decision approved.',
      decidedAt: '2026-05-25T00:00:00.000Z',
    })

    const result = executeExternalAction({
      action: approved,
      connectorMode: 'dry_run',
      connectorConfig: { id: 'stripe_billing', configured: true },
      idempotencyKey: 'idem:billing:usage-cap',
      executedAt: '2026-05-25T00:01:00.000Z',
    })

    expect(result.status).toBe('blocked')
    expect(result.error).toBe('rollback_metadata_required')
  })

  it('builds a data room workspace with an audit export draft and excludes sensitive raw artifacts', () => {
    const dataRoom = buildDataRoomWorkspace({
      workspaceId: 'workspace-demo',
      hasRawUpload: true,
      hasRawPrompt: true,
      hasApiKey: true,
      hasPii: true,
    })

    expect(dataRoom.artifactInventory.map(item => item.id)).toContain('normalized_usage_snapshot')
    expect(dataRoom.artifactInventory.find(item => item.id === 'raw_prompt')?.stored).toBe(false)
    expect(dataRoom.artifactInventory.find(item => item.id === 'api_key')?.stored).toBe(false)
    expect(dataRoom.auditExportDraft.kind).toBe('audit_export')
    expect(dataRoom.auditExportDraft.status).toBe('draft')
  })

  it('builds a self-hosted vLLM review without adding provider API cost and keeps savings as what-if only', () => {
    const review = buildVllmServingReview({
      ttftMs: 2600,
      itlMs: 130,
      throughputTokensPerSecond: 180,
      gpuUtilizationPct: 0.4,
      kvCacheUsagePct: 0.9,
      p95LatencyMs: 9000,
      p99LatencyMs: 13000,
      prefixCacheHitRate: 0.2,
      batchingEfficiency: 0.35,
      p95ContextTokens: 48000,
    })

    expect(review.providerApiCostExcluded).toBe(true)
    expect(review.costAuthority).toBe('self_hosted_serving_economics_only')
    expect(review.whatIfComparisons.map(item => item.status)).toEqual(expect.arrayContaining(['validation_required']))
    expect(JSON.stringify(review)).not.toMatch(/confirmed_savings|providerApiCostUsd/i)
  })

  it('keeps benchmark marketplace evidence separated by review status and returns baseline unavailable when sparse', () => {
    const empty = buildBenchmarkMarketplace({ selfBaselineCount: 0, verifiedPublicRecords: [], customerPeerRows: [] })
    const populated = buildBenchmarkMarketplace({
      selfBaselineCount: 2,
      verifiedPublicRecords: [{ id: 'evidence-cache', label: 'Verified cache evidence' }],
      customerPeerRows: [{ id: 'peer-1', label: 'Customer peer import', verified: false }],
    })

    expect(empty.basis.status).toBe('baseline_unavailable')
    expect(empty.records).toEqual([])
    expect(populated.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'evidence-cache', sourceType: 'verified_public_evidence', status: 'verified' }),
      expect.objectContaining({ id: 'peer-1', sourceType: 'customer_peer_cohort', status: 'needs_review' }),
    ]))
  })

  it('selects benchmark basis honestly and automates retention without storing sensitive raw data', () => {
    const unavailable = selectBenchmarkBasis({ selfBaselineCount: 0, verifiedPeerCount: 0, customerPeerCohortCount: 0 })
    const peer = selectBenchmarkBasis({ selfBaselineCount: 2, verifiedPeerCount: 4, customerPeerCohortCount: 0 })
    const retention = buildRetentionAutomationPlan({
      workspaceId: 'workspace-demo',
      hasRawUpload: true,
      hasRawPrompt: false,
      hasApiKey: false,
      hasPii: false,
    })

    expect(unavailable.status).toBe('baseline_unavailable')
    expect(peer.basis).toBe('verified_public_evidence')
    expect(retention.tasks.map(task => task.id)).toContain('raw_upload_deletion_reminder')
    expect(retention.jobs.map(job => job.id)).toContain('retention-job:workspace-demo:raw-upload-delete')
    expect(retention.storedArtifacts).not.toContain('raw_prompt')
    expect(retention.storedArtifacts).toContain('normalized_usage_snapshot')
  })

  it('runs retention jobs and records deletion plus audit export refs', () => {
    const retention = buildRetentionAutomationPlan({
      workspaceId: 'workspace-demo',
      hasRawUpload: true,
      hasRawPrompt: true,
      hasApiKey: false,
      hasPii: false,
    })

    const result = runRetentionJobs({
      jobs: retention.jobs,
      storedArtifactIds: retention.storedArtifacts,
      executedAt: '2026-05-25T00:00:00.000Z',
    })

    expect(result.completedJobs.map(job => job.id)).toEqual(expect.arrayContaining([
      'retention-job:workspace-demo:audit-export',
      'retention-job:workspace-demo:raw-upload-delete',
    ]))
    expect(result.deletedArtifactIds).toEqual(['raw_upload'])
    expect(result.auditExportRefs).toEqual(['audit-export:workspace-demo:2026-05-25'])
  })
})
