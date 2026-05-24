import { inspectUsageImportSecurity, type TrustInspectionResult } from '../../trust/lib/securityMiddleware'

export type CustomerDashboardCtaId =
  | 'run_sparkclaw_sample'
  | 'upload_usage_export'
  | 'open_existing_workspace'

export type CustomerDashboardSectionId =
  | 'workspace_home'
  | 'upload_history'
  | 'monthly_review_history'
  | 'decision_ledger'
  | 'report_export'
  | 'alert_settings'

export interface CustomerWorkspaceDashboardInput {
  workspaceId: string
  organizationName: string
  uploadCount: number
  decisionCount: number
  monthlyReviewCount: number
  reportCount: number
}

export interface CustomerWorkspaceDashboard {
  heroTitle: string
  workspaceId: string
  organizationName: string
  ctas: Array<{
    id: CustomerDashboardCtaId
    label: string
    action: 'load_sample' | 'upload_usage' | 'open_workspace'
  }>
  sections: Array<{
    id: CustomerDashboardSectionId
    label: string
    description: string
    count: number | null
  }>
}

export type P1RagKind = 'official_docs' | 'benchmark' | 'decision_history'

export interface P1RagRecord {
  id: string
  text: string
  sourceUrl?: string
}

export interface P1RagEvidenceResult {
  kind: P1RagKind
  found: boolean
  refs: string[]
  mayOverrideFacts: false
  records: P1RagRecord[]
  warnings: string[]
}

export type P1UsageAdapterSource =
  | 'openai'
  | 'anthropic'
  | 'vercel_ai_gateway'
  | 'helicone'
  | 'langfuse'
  | 'application_gateway'

export type NormalizedUsageDimension =
  | 'customer'
  | 'feature'
  | 'model'
  | 'plan'
  | 'session'
  | 'agent_run'
  | 'task_type'
  | 'retry'
  | 'cacheability'
  | 'human_review'
  | 'deliverable'

export interface NormalizedP1UsageAdapterExport {
  source: P1UsageAdapterSource
  dimensions: NormalizedUsageDimension[]
  missingDimensions: NormalizedUsageDimension[]
  trustInspection: TrustInspectionResult
  snapshotAllowed: boolean
}

export type VllmServingBottleneck =
  | 'prefill_heavy'
  | 'decode_heavy'
  | 'kv_cache_pressure'
  | 'low_gpu_utilization'
  | 'poor_prefix_caching'
  | 'low_batching_efficiency'
  | 'oversized_context'

export interface VllmServingInput {
  ttftMs: number
  itlMs: number
  throughputTokensPerSecond: number
  gpuUtilizationPct: number
  kvCacheUsagePct: number
  p95LatencyMs: number
  p99LatencyMs: number
  prefixCacheHitRate: number
  batchingEfficiency: number
  p95ContextTokens: number
}

export interface VllmServingAnalysis {
  costAuthority: 'self_hosted_serving_economics_only'
  bottlenecks: VllmServingBottleneck[]
  recommendations: string[]
  caveats: string[]
}

export type P1AlertType =
  | 'margin_breach'
  | 'retry_spike'
  | 'budget_overrun'
  | 'stale_pricing_source'
  | 'low_cache_hit_rate'
  | 'decision_follow_up_due'

export interface P1AlertDraft {
  type: P1AlertType
  status: 'draft'
  destination: 'slack' | 'email'
  requiresHumanApproval: true
  sourceRefs: string[]
}

export interface BillingChangeDraft {
  policy: 'usage_cap' | 'overage_pricing' | 'credit_policy' | 'tier_limit'
  status: 'draft'
  executionAllowed: false
  requiresHumanApproval: true
  decisionRef: string
  rollbackRef: string
}

export interface BenchmarkBasisInput {
  selfBaselineCount: number
  verifiedPeerCount: number
  customerPeerCohortCount: number
}

export interface BenchmarkBasisSelection {
  basis: 'self_baseline' | 'verified_public_evidence' | 'customer_peer_cohort' | null
  status: 'available' | 'baseline_unavailable'
}

export interface RetentionAutomationPlan {
  workspaceId: string
  storedArtifacts: string[]
  excludedArtifacts: string[]
  tasks: Array<{
    id: string
    label: string
    status: 'scheduled' | 'not_needed'
  }>
}

const REQUIRED_USAGE_DIMENSIONS: NormalizedUsageDimension[] = [
  'customer',
  'feature',
  'model',
  'plan',
  'session',
  'agent_run',
  'task_type',
  'retry',
  'cacheability',
  'human_review',
  'deliverable',
]

function csvHeaders(rawCsv: string): Set<string> {
  const firstLine = rawCsv.split(/\r?\n/)[0] ?? ''
  return new Set(firstLine.split(',').map(header => header.trim().toLowerCase()).filter(Boolean))
}

function hasAny(headers: Set<string>, names: string[]): boolean {
  return names.some(name => headers.has(name))
}

export function buildCustomerWorkspaceDashboard(input: CustomerWorkspaceDashboardInput): CustomerWorkspaceDashboard {
  return {
    heroTitle: '내 AI 팀 비용/마진을 5분 안에 보기',
    workspaceId: input.workspaceId,
    organizationName: input.organizationName,
    ctas: [
      { id: 'run_sparkclaw_sample', label: '1인 창업자 샘플 실행', action: 'load_sample' },
      { id: 'upload_usage_export', label: 'usage export 업로드', action: 'upload_usage' },
      { id: 'open_existing_workspace', label: '기존 workspace 열기', action: 'open_workspace' },
    ],
    sections: [
      {
        id: 'workspace_home',
        label: 'workspace home',
        description: '현재 비용, 마진, 운영 팀 검토 상태를 한 화면에서 봅니다.',
        count: null,
      },
      {
        id: 'upload_history',
        label: 'upload history',
        description: 'Trust Intake를 통과한 usage export 이력을 봅니다.',
        count: input.uploadCount,
      },
      {
        id: 'monthly_review_history',
        label: 'monthly review history',
        description: '월별 AI 팀 비용/마진 리뷰와 follow-up을 추적합니다.',
        count: input.monthlyReviewCount,
      },
      {
        id: 'decision_ledger',
        label: 'decision ledger',
        description: 'adopt/hold/reject/export 결정과 당시 snapshot을 보관합니다.',
        count: input.decisionCount,
      },
      {
        id: 'report_export',
        label: 'report export',
        description: 'CEO/CFO/PM/Developer용 한 장 요약 리포트를 생성합니다.',
        count: input.reportCount,
      },
      {
        id: 'alert_settings',
        label: 'alert settings',
        description: 'margin breach, retry spike, stale pricing source 알림을 draft로 관리합니다.',
        count: null,
      },
    ],
  }
}

export function retrieveP1RagEvidence(input: {
  kind: P1RagKind
  query: string
  records: P1RagRecord[]
  structuredFactRefs: string[]
}): P1RagEvidenceResult {
  const queryTerms = input.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const records = queryTerms.length > 0
    ? input.records.filter(record => {
      const haystack = `${record.id} ${record.text} ${record.sourceUrl ?? ''}`.toLowerCase()
      return queryTerms.some(term => haystack.includes(term))
    })
    : input.records
  const warnings = records.length === 0 && input.kind === 'benchmark' ? ['baseline_unavailable'] : []

  return {
    kind: input.kind,
    found: records.length > 0,
    refs: [
      ...records.map(record => `source:${record.id}`),
      ...input.structuredFactRefs,
    ],
    mayOverrideFacts: false,
    records,
    warnings,
  }
}

export function normalizeP1UsageAdapterExport(input: {
  source: P1UsageAdapterSource
  rawCsv: string
}): NormalizedP1UsageAdapterExport {
  const headers = csvHeaders(input.rawCsv)
  const trustInspection = inspectUsageImportSecurity({
    filename: `${input.source}.csv`,
    rawCsv: input.rawCsv,
  })
  const dimensions: NormalizedUsageDimension[] = [
    ...(hasAny(headers, ['customer_id', 'customer', 'tenant_id']) ? ['customer' as const] : []),
    ...(hasAny(headers, ['feature', 'product_area', 'route']) ? ['feature' as const] : []),
    ...(hasAny(headers, ['model', 'model_id', 'provider_model']) ? ['model' as const] : []),
    ...(hasAny(headers, ['plan_id', 'plan', 'subscription_plan']) ? ['plan' as const] : []),
    ...(hasAny(headers, ['session_id', 'conversation_id', 'trace_id']) ? ['session' as const] : []),
    ...(hasAny(headers, ['agent_run_id', 'run_id', 'generation_id']) ? ['agent_run' as const] : []),
    ...(hasAny(headers, ['task_type', 'task', 'workflow']) ? ['task_type' as const] : []),
    ...(hasAny(headers, ['retry_count', 'retry_rate', 'retries']) ? ['retry' as const] : []),
    ...(hasAny(headers, ['cache_hit_rate', 'cache_eligible_tokens', 'cached_input_tokens']) ? ['cacheability' as const] : []),
    ...(hasAny(headers, ['human_review_count', 'human_review', 'reviewed_by_human']) ? ['human_review' as const] : []),
    ...(hasAny(headers, ['deliverable', 'artifact', 'output_type']) ? ['deliverable' as const] : []),
  ]

  return {
    source: input.source,
    dimensions,
    missingDimensions: REQUIRED_USAGE_DIMENSIONS.filter(dimension => !dimensions.includes(dimension)),
    trustInspection,
    snapshotAllowed: trustInspection.allowedForSnapshot,
  }
}

export function analyzeVllmServingEconomics(input: VllmServingInput): VllmServingAnalysis {
  const bottlenecks: VllmServingBottleneck[] = [
    ...(input.ttftMs > 2_000 ? ['prefill_heavy' as const] : []),
    ...(input.itlMs > 100 ? ['decode_heavy' as const] : []),
    ...(input.kvCacheUsagePct > 0.85 ? ['kv_cache_pressure' as const] : []),
    ...(input.gpuUtilizationPct < 0.55 ? ['low_gpu_utilization' as const] : []),
    ...(input.prefixCacheHitRate < 0.5 ? ['poor_prefix_caching' as const] : []),
    ...(input.batchingEfficiency < 0.5 ? ['low_batching_efficiency' as const] : []),
    ...(input.p95ContextTokens > 32_000 ? ['oversized_context' as const] : []),
  ]

  return {
    costAuthority: 'self_hosted_serving_economics_only',
    bottlenecks,
    recommendations: [
      ...(bottlenecks.includes('poor_prefix_caching') ? ['prefix caching what-if'] : []),
      ...(bottlenecks.includes('prefill_heavy') ? ['chunked prefill what-if'] : []),
      ...(bottlenecks.includes('low_batching_efficiency') || bottlenecks.includes('low_gpu_utilization') ? ['continuous batching what-if'] : []),
      ...(bottlenecks.includes('kv_cache_pressure') ? ['KV cache budget what-if'] : []),
      ...(bottlenecks.includes('oversized_context') ? ['context window policy what-if'] : []),
    ],
    caveats: [
      'provider API cost math와 self-hosted serving economics는 별도 모듈로 유지합니다.',
      'throughput과 품질 검증 전에는 절감액을 확정하지 않습니다.',
    ],
  }
}

export function draftP1Alert(input: {
  type: P1AlertType
  thresholdRef: string
  decisionRefs: string[]
  destination: 'slack' | 'email'
}): P1AlertDraft {
  return {
    type: input.type,
    status: 'draft',
    destination: input.destination,
    requiresHumanApproval: true,
    sourceRefs: [input.thresholdRef, ...input.decisionRefs],
  }
}

export function draftBillingChange(input: {
  policy: BillingChangeDraft['policy']
  decisionRef: string
  rollbackRef: string
}): BillingChangeDraft {
  return {
    policy: input.policy,
    status: 'draft',
    executionAllowed: false,
    requiresHumanApproval: true,
    decisionRef: input.decisionRef,
    rollbackRef: input.rollbackRef,
  }
}

export function selectBenchmarkBasis(input: BenchmarkBasisInput): BenchmarkBasisSelection {
  if (input.customerPeerCohortCount > 0) {
    return { basis: 'customer_peer_cohort', status: 'available' }
  }
  if (input.verifiedPeerCount > 0) {
    return { basis: 'verified_public_evidence', status: 'available' }
  }
  if (input.selfBaselineCount > 0) {
    return { basis: 'self_baseline', status: 'available' }
  }
  return { basis: null, status: 'baseline_unavailable' }
}

export function buildRetentionAutomationPlan(input: {
  workspaceId: string
  hasRawUpload: boolean
  hasRawPrompt: boolean
  hasApiKey: boolean
  hasPii: boolean
}): RetentionAutomationPlan {
  const excludedArtifacts = [
    ...(input.hasRawPrompt ? ['raw_prompt'] : []),
    ...(input.hasApiKey ? ['api_key'] : []),
    ...(input.hasPii ? ['pii_original'] : []),
  ]

  return {
    workspaceId: input.workspaceId,
    storedArtifacts: [
      'normalized_usage_snapshot',
      'schema_mapping_profile',
      'trust_inspection_result',
      'report_artifact',
      'decision_ledger_row',
      'agent_run_metadata',
    ],
    excludedArtifacts,
    tasks: [
      {
        id: 'raw_upload_deletion_reminder',
        label: 'Raw upload deletion reminder',
        status: input.hasRawUpload ? 'scheduled' : 'not_needed',
      },
      {
        id: 'customer_artifact_inventory',
        label: 'Customer artifact inventory',
        status: 'scheduled',
      },
      {
        id: 'audit_export',
        label: 'Audit export',
        status: 'scheduled',
      },
    ],
  }
}
