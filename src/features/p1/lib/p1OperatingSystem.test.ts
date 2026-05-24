import { describe, expect, it } from 'vitest'
import {
  analyzeVllmServingEconomics,
  buildCustomerWorkspaceDashboard,
  buildRetentionAutomationPlan,
  draftBillingChange,
  draftP1Alert,
  normalizeP1UsageAdapterExport,
  retrieveP1RagEvidence,
  selectBenchmarkBasis,
} from './p1OperatingSystem'

describe('p1OperatingSystem', () => {
  it('builds a customer-facing dashboard shell with sample, upload, workspace, and monthly review entrypoints', () => {
    const dashboard = buildCustomerWorkspaceDashboard({
      workspaceId: 'workspace-demo',
      organizationName: 'SparkClaw',
      uploadCount: 2,
      decisionCount: 3,
      monthlyReviewCount: 1,
      reportCount: 1,
    })

    expect(dashboard.heroTitle).toBe('내 AI 팀 비용/마진을 5분 안에 보기')
    expect(dashboard.ctas.map(cta => cta.id)).toEqual([
      'run_sparkclaw_sample',
      'upload_usage_export',
      'open_existing_workspace',
    ])
    expect(dashboard.ctas[0].label).toBe('1인 창업자 샘플 실행')
    expect(dashboard.sections.map(section => section.id)).toEqual([
      'workspace_home',
      'upload_history',
      'monthly_review_history',
      'decision_ledger',
      'report_export',
      'alert_settings',
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
    expect(blocked.trustInspection.allowedForSnapshot).toBe(false)
    expect(blocked.snapshotAllowed).toBe(false)
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
    expect(retention.storedArtifacts).not.toContain('raw_prompt')
    expect(retention.storedArtifacts).toContain('normalized_usage_snapshot')
  })
})
