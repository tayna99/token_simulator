import { inspectUsageImportSecurity, type TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import { schemaEvidenceRefsForAdapter } from '../../rag/data/usageSchemaRegistry'

export type CustomerDashboardCtaId =
  | 'run_sparkclaw_sample'
  | 'upload_usage_export'
  | 'open_existing_workspace'

export type CustomerDashboardSectionId =
  | 'top_margin_leak'
  | 'margin_breaking_feature'
  | 'recommended_decision'
  | 'view_evidence'
  | 'draft_rate_card'
  | 'export_pdf'

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
export type P1VectorRagKind = 'official_docs' | 'benchmark_evidence' | 'decision_history'
export type P1ApprovalStatus = 'draft' | 'approved' | 'rejected' | 'executed'
export type P1ExternalActionKind = 'retention_reminder' | 'audit_export' | 'slack_alert' | 'email_alert' | 'billing_change'
export type P1ExternalActionStatus = 'draft' | 'approved' | 'rejected' | 'executed'
export type P1ExternalConnectorMode = 'dry_run' | 'live'
export type P1ExternalConnectorId = 'slack_webhook' | 'resend_email' | 'stripe_billing' | 'metronome' | 'data_room_export'

export interface P1RagRecord {
  id: string
  text: string
  sourceUrl?: string
  refs?: string[]
  corpusTrust?: string
  ownerAgentIds?: string[]
  consumerAgentIds?: string[]
}

export interface P1RagEvidenceResult {
  kind: P1RagKind
  found: boolean
  refs: string[]
  mayOverrideFacts: false
  records: P1RagRecord[]
  scores: number[]
  warnings: string[]
}

export interface P1VectorRagEvidenceResult {
  mayOverrideFacts: false
  results: Record<P1VectorRagKind, P1RagEvidenceResult>
  warnings: string[]
}

export interface P1OperatingContract {
  workspaceId: string
  snapshotVersion: string
  agentRunId: string
  approvalStatus: P1ApprovalStatus
  ledgerEntryId: string
  mutationPolicy: {
    phaseOrder: ['draft', 'human_approval', 'execute', 'rollback_metadata', 'ledger']
    externalMutationAllowed: false
  }
}

export interface P1ExternalAction {
  id: string
  workspaceId: string
  kind: P1ExternalActionKind
  title: string
  status: P1ExternalActionStatus
  requiresHumanApproval: true
  payload: Record<string, unknown>
  sourceRefs: string[]
  rollbackRef?: string
  createdAt: string
  approval?: {
    approver: string
    reason: string
    decidedAt: string
  }
}

export interface P1ExternalActionLedgerEntry {
  id: string
  workspaceId: string
  actionId: string
  kind: P1ExternalActionKind
  status: 'ledgered'
  connectorMode: P1ExternalConnectorMode
  connectorId: P1ExternalConnectorId
  idempotencyKey: string
  dryRunRef?: string
  externalRef?: string
  rollbackMetadata: Record<string, unknown>
  sourceRefs: string[]
  approvedBy: string
  approvedAt: string
  executedAt: string
}

export interface P1ExternalActionExecutionResult {
  status: 'blocked' | 'executed'
  connectorMode: P1ExternalConnectorMode | null
  connectorId?: P1ExternalConnectorId
  idempotencyKey?: string
  actionId: string
  error?: 'approval_required' | 'rollback_metadata_required' | 'connector_not_configured' | 'idempotency_key_required'
  dryRunRef?: string
  externalRef?: string
  rollbackMetadata?: Record<string, unknown>
  ledgerEntry: P1ExternalActionLedgerEntry | null
}

export interface P1ExternalConnectorConfig {
  id: P1ExternalConnectorId
  configured: boolean
  rollbackMetadata?: Record<string, unknown>
}

export type P1UsageAdapterSource =
  | 'openai'
  | 'anthropic'
  | 'vercel_ai_gateway'
  | 'helicone'
  | 'langfuse'
  | 'openrouter'
  | 'litellm'
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
  schemaEvidenceRefs: string[]
  trustInspection: TrustInspectionResult
  snapshotAllowed: boolean
}

export interface P1SdkLiteUsageEvent {
  timestamp: string
  requestId: string
  customerId: string
  feature: string
  model: string
  plan: string
  sessionId: string
  agentRunId: string
  inputTokens: number
  outputTokens: number
  retryCount: number
  cacheReadTokens: number
  cacheWriteTokens: number
  latencyMs: number
  status: 'success' | 'failed' | 'error' | 'timeout' | 'retry'
  deliverable: string
  taskType: string
  humanReview: boolean
  rawPrompt?: string
  rawCompletion?: string
  apiKey?: string
  userEmail?: string
}

export interface NormalizedP1SdkLiteUsageEvent {
  source: P1UsageAdapterSource
  normalizedEvent: {
    timestamp: string
    request_id: string
    customer: string
    feature: string
    model: string
    plan: string
    session: string
    agent_run: string
    input_tokens: number
    output_tokens: number
    retry_count: number
    cache_read_tokens: number
    cache_write_tokens: number
    latency_ms: number
    status: P1SdkLiteUsageEvent['status']
    deliverable: string
    task_type: string
    human_review: boolean
  }
  excludedFields: string[]
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

export interface VllmServingReview extends VllmServingAnalysis {
  providerApiCostExcluded: true
  whatIfComparisons: Array<{
    id: string
    label: string
    status: 'validation_required'
  }>
}

export interface VllmServingCostInput {
  gpuHourlyUsd: number
  gpuCount: number
  activeHoursPerMonth: number
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequestCount?: number
  monthlyCustomerCount?: number
  gpuUtilizationPct: number
  throughputTokensPerSecond: number
  infraOverheadPct?: number
}

export interface VllmServingCostSummary {
  costAuthority: 'self_hosted_serving_economics_only'
  providerApiCostExcluded: true
  monthlyGpuCostUsd: number
  monthlyInfraOverheadUsd: number
  monthlyServingCostUsd: number
  monthlyServedTokens: number
  effectiveThroughputTokensPerSecond: number
  costPerMillionTokensUsd: number | null
  costPerRequestUsd: number | null
  costPerCustomerUsd: number | null
  idleWasteUsd: number
  utilizationWasteShare: number
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

export interface P1ActionApprovalGate {
  executionAllowed: boolean
  nextRequiredStep: 'human_approval' | 'execute' | 'ledger'
  ledgerRequired: boolean
  rollbackMetadataRequired: boolean
  warnings: string[]
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

export interface BenchmarkMarketplaceRecord {
  id: string
  label: string
  sourceType: 'self_baseline' | 'verified_public_evidence' | 'customer_peer_cohort'
  status: 'verified' | 'needs_review'
}

export interface BenchmarkMarketplace {
  basis: BenchmarkBasisSelection
  records: BenchmarkMarketplaceRecord[]
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
  jobs: RetentionJob[]
}

export interface RetentionJob {
  id: string
  workspaceId: string
  kind: 'delete_artifact' | 'export_audit'
  status: 'scheduled' | 'not_needed' | 'completed' | 'blocked'
  artifactId?: string
  scheduledFor: string
  completedAt?: string
  auditExportRef?: string
}

export interface RetentionJobRunResult {
  completedJobs: RetentionJob[]
  blockedJobs: RetentionJob[]
  deletedArtifactIds: string[]
  auditExportRefs: string[]
}

export interface DataRoomArtifactInventoryItem {
  id: string
  label: string
  stored: boolean
  note: string
}

export interface DataRoomWorkspace {
  plan: RetentionAutomationPlan
  artifactInventory: DataRoomArtifactInventoryItem[]
  auditExportDraft: P1ExternalAction
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

function workspaceId(value: string): string {
  const normalized = value.trim().replace(/[^0-9A-Za-z_-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || 'workspace'
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function refWithPrefix(prefix: string, value: string): string {
  return value.startsWith(`${prefix}:`) ? value : `${prefix}:${value}`
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^0-9a-z_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
}

function positiveNumber(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? value : 0
}

function recordMatches(record: P1RagRecord, queryTerms: string[]): boolean {
  if (queryTerms.length === 0) return true
  const haystack = `${record.id} ${record.text} ${record.sourceUrl ?? ''}`.toLowerCase()
  return queryTerms.some(term => haystack.includes(term))
}

function queryTermsFrom(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

function recordScore(record: P1RagRecord, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 1
  const haystack = `${record.id} ${record.text} ${record.sourceUrl ?? ''}`.toLowerCase()
  const uniqueTerms = new Set(queryTerms)
  const hits = Array.from(uniqueTerms).filter(term => haystack.includes(term)).length
  if (hits === 0) return 0
  return Number((hits / Math.sqrt(uniqueTerms.size)).toFixed(6))
}

function rankedRecords(records: P1RagRecord[], queryTerms: string[], topK?: number): Array<{ record: P1RagRecord; score: number }> {
  const limit = Number.isFinite(topK) && topK && topK > 0 ? topK : records.length
  return records
    .map(record => ({ record, score: recordScore(record, queryTerms) }))
    .filter(item => item.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || left.record.id.localeCompare(right.record.id)
    ))
    .slice(0, limit)
}

function sdkLiteCsvForTrust(event: P1SdkLiteUsageEvent): string {
  const headers = [
    'timestamp',
    'customer_id',
    'plan_id',
    'feature',
    'model',
    'input_tokens',
    'output_tokens',
    'retry_count',
    'status',
    ...(event.rawPrompt || event.rawCompletion ? ['raw_prompt'] : []),
    ...(event.apiKey ? ['api_key'] : []),
    ...(event.userEmail ? ['user_email'] : []),
  ]
  const values = [
    event.timestamp,
    event.customerId,
    event.plan,
    event.feature,
    event.model,
    String(event.inputTokens),
    String(event.outputTokens),
    String(event.retryCount),
    event.status,
    ...(event.rawPrompt || event.rawCompletion ? [event.rawPrompt ?? event.rawCompletion ?? ''] : []),
    ...(event.apiKey ? [event.apiKey] : []),
    ...(event.userEmail ? [event.userEmail] : []),
  ]
  return `${headers.join(',')}\n${values.join(',')}`
}

export function buildP1OperatingContract(input: {
  workspaceId: string
  snapshotVersion: string
  agentRunId: string
  approvalStatus: P1ApprovalStatus
  ledgerEntryId: string
}): P1OperatingContract {
  return {
    workspaceId: workspaceId(input.workspaceId),
    snapshotVersion: input.snapshotVersion,
    agentRunId: input.agentRunId,
    approvalStatus: input.approvalStatus,
    ledgerEntryId: input.ledgerEntryId,
    mutationPolicy: {
      phaseOrder: ['draft', 'human_approval', 'execute', 'rollback_metadata', 'ledger'],
      externalMutationAllowed: false,
    },
  }
}

export function buildExternalActionDraft(input: {
  workspaceId: string
  kind: P1ExternalActionKind
  title: string
  payload: Record<string, unknown>
  sourceRefs: string[]
  rollbackRef?: string
  createdAt?: string
}): P1ExternalAction {
  const normalizedWorkspaceId = workspaceId(input.workspaceId)
  const createdAt = input.createdAt ?? new Date().toISOString()
  return {
    id: `external:${normalizedWorkspaceId}:${input.kind}:${slug(input.title)}`,
    workspaceId: normalizedWorkspaceId,
    kind: input.kind,
    title: input.title,
    status: 'draft',
    requiresHumanApproval: true,
    payload: input.payload,
    sourceRefs: unique(input.sourceRefs),
    rollbackRef: input.rollbackRef,
    createdAt,
  }
}

export function approveExternalAction(input: {
  action: P1ExternalAction
  approver: string
  reason: string
  decidedAt?: string
}): P1ExternalAction {
  return {
    ...input.action,
    status: 'approved',
    approval: {
      approver: input.approver,
      reason: input.reason,
      decidedAt: input.decidedAt ?? new Date().toISOString(),
    },
  }
}

export function executeExternalAction(input: {
  action: P1ExternalAction
  connectorMode?: P1ExternalConnectorMode
  connectorConfig?: P1ExternalConnectorConfig
  idempotencyKey?: string
  executedAt?: string
}): P1ExternalActionExecutionResult {
  const connectorMode = input.connectorMode ?? null
  const executedAt = input.executedAt ?? new Date().toISOString()
  if (input.action.status !== 'approved') {
    return {
      status: 'blocked',
      connectorMode,
      actionId: input.action.id,
      error: 'approval_required',
      ledgerEntry: null,
    }
  }
  if (input.action.kind === 'billing_change' && !input.action.rollbackRef && typeof input.action.payload.rollbackRef !== 'string') {
    return {
      status: 'blocked',
      connectorMode,
      actionId: input.action.id,
      error: 'rollback_metadata_required',
      ledgerEntry: null,
    }
  }
  if (!connectorMode || !input.connectorConfig?.configured) {
    return {
      status: 'blocked',
      connectorMode,
      connectorId: input.connectorConfig?.id,
      actionId: input.action.id,
      error: 'connector_not_configured',
      ledgerEntry: null,
    }
  }
  if (!input.idempotencyKey) {
    return {
      status: 'blocked',
      connectorMode,
      connectorId: input.connectorConfig.id,
      actionId: input.action.id,
      error: 'idempotency_key_required',
      ledgerEntry: null,
    }
  }

  const refPrefix = connectorMode === 'dry_run' ? 'dry-run' : 'external'
  const externalRef = `${refPrefix}:${input.action.workspaceId}:${input.action.kind}:${Date.parse(executedAt) || 0}`
  const rollbackMetadata = {
    rollbackRef: input.action.rollbackRef ?? (typeof input.action.payload.rollbackRef === 'string' ? input.action.payload.rollbackRef : ''),
    actionSnapshot: input.action.payload,
    ...(input.connectorConfig.rollbackMetadata ?? {}),
  }
  const ledgerEntry: P1ExternalActionLedgerEntry = {
    id: `ledger:${input.action.id}`,
    workspaceId: input.action.workspaceId,
    actionId: input.action.id,
    kind: input.action.kind,
    status: 'ledgered',
    connectorMode,
    connectorId: input.connectorConfig.id,
    idempotencyKey: input.idempotencyKey,
    dryRunRef: connectorMode === 'dry_run' ? externalRef : undefined,
    externalRef: connectorMode === 'live' ? externalRef : undefined,
    rollbackMetadata,
    sourceRefs: input.action.sourceRefs,
    approvedBy: input.action.approval?.approver ?? 'unknown',
    approvedAt: input.action.approval?.decidedAt ?? '',
    executedAt,
  }

  return {
    status: 'executed',
    connectorMode,
    connectorId: input.connectorConfig.id,
    idempotencyKey: input.idempotencyKey,
    actionId: input.action.id,
    dryRunRef: ledgerEntry.dryRunRef,
    externalRef: ledgerEntry.externalRef,
    rollbackMetadata,
    ledgerEntry,
  }
}

export function buildCustomerWorkspaceDashboard(input: CustomerWorkspaceDashboardInput): CustomerWorkspaceDashboard {
  return {
    heroTitle: 'AI 기능 때문에 손해 보는 고객을 찾으세요',
    workspaceId: input.workspaceId,
    organizationName: input.organizationName,
    ctas: [
      { id: 'upload_usage_export', label: '사용량 CSV 업로드', action: 'upload_usage' },
      { id: 'open_existing_workspace', label: 'Stripe/매출 CSV 업로드', action: 'open_workspace' },
      { id: 'run_sparkclaw_sample', label: '샘플로 보기', action: 'load_sample' },
    ],
    sections: [
      {
        id: 'top_margin_leak',
        label: '손해 보는 고객',
        description: 'AI 기능이 많이 쓰일수록 손해가 커지는 고객을 먼저 찾습니다.',
        count: null,
      },
      {
        id: 'margin_breaking_feature',
        label: '마진을 깨는 기능',
        description: '어떤 기능이 gross margin을 낮추는지 사용량과 매출을 연결해 보여줍니다.',
        count: input.uploadCount,
      },
      {
        id: 'recommended_decision',
        label: '추천 결정',
        description: '가격표 변경, usage cap, overage, 모델 라우팅 검토 중 다음 결정을 제안합니다.',
        count: input.monthlyReviewCount,
      },
      {
        id: 'view_evidence',
        label: '근거 보기',
        description: '고객 화면에는 요약 근거만 보여주고, 세부 감사 기록은 관리자 화면에 둡니다.',
        count: input.decisionCount,
      },
      {
        id: 'draft_rate_card',
        label: '가격표 초안 만들기',
        description: '마진을 깨는 고객/기능을 기준으로 가격표 초안을 만듭니다.',
        count: input.reportCount,
      },
      {
        id: 'export_pdf',
        label: 'PDF 만들기',
        description: '팀과 고객에게 설명할 수 있는 한 장짜리 마진 진단 리포트를 만듭니다.',
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
  const queryTerms = queryTermsFrom(input.query)
  const ranked = rankedRecords(input.records, queryTerms)
  const records = ranked.map(item => item.record)
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
    scores: ranked.map(item => item.score),
    warnings,
  }
}

function retrieveVectorCollection(input: {
  kind: P1VectorRagKind
  queryTerms: string[]
  records: P1RagRecord[]
  structuredFactRefs: string[]
  topK?: number
}): P1RagEvidenceResult {
  const ranked = rankedRecords(
    input.records.filter(record => recordMatches(record, input.queryTerms)),
    input.queryTerms,
    input.topK,
  )
  const records = ranked.map(item => item.record)
  const prefix = input.kind === 'official_docs'
    ? 'source'
    : input.kind === 'benchmark_evidence'
      ? 'evidence'
      : 'decision'
  const warnings = [
    ...(input.kind === 'benchmark_evidence' && records.length === 0 ? ['baseline_unavailable'] : []),
  ]

  return {
    kind: input.kind === 'benchmark_evidence' ? 'benchmark' : input.kind,
    found: records.length > 0,
    refs: [
      ...records.flatMap(record => record.refs && record.refs.length > 0
        ? record.refs
        : [refWithPrefix(prefix, record.id)]),
      ...(input.kind === 'official_docs' ? input.structuredFactRefs : []),
    ],
    mayOverrideFacts: false,
    records,
    scores: ranked.map(item => item.score),
    warnings,
  }
}

export function retrieveP1VectorRagEvidence(input: {
  query: string
  collections: Record<P1VectorRagKind, P1RagRecord[]>
  structuredFactRefs: string[]
  topK?: number
}): P1VectorRagEvidenceResult {
  const queryTerms = queryTermsFrom(input.query)
  const results: Record<P1VectorRagKind, P1RagEvidenceResult> = {
    official_docs: retrieveVectorCollection({
      kind: 'official_docs',
      queryTerms,
      records: input.collections.official_docs,
      structuredFactRefs: input.structuredFactRefs,
      topK: input.topK,
    }),
    benchmark_evidence: retrieveVectorCollection({
      kind: 'benchmark_evidence',
      queryTerms,
      records: input.collections.benchmark_evidence,
      structuredFactRefs: [],
      topK: input.topK,
    }),
    decision_history: retrieveVectorCollection({
      kind: 'decision_history',
      queryTerms,
      records: input.collections.decision_history,
      structuredFactRefs: [],
      topK: input.topK,
    }),
  }

  return {
    mayOverrideFacts: false,
    results,
    warnings: unique(Object.values(results).flatMap(result => result.warnings)),
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
    schemaEvidenceRefs: schemaEvidenceRefsForAdapter(input.source),
    trustInspection,
    snapshotAllowed: trustInspection.allowedForSnapshot,
  }
}

export function normalizeSdkLiteUsageEvent(input: {
  source: P1UsageAdapterSource
  event: P1SdkLiteUsageEvent
}): NormalizedP1SdkLiteUsageEvent {
  const excludedFields = [
    ...(input.event.rawPrompt !== undefined ? ['rawPrompt'] : []),
    ...(input.event.rawCompletion !== undefined ? ['rawCompletion'] : []),
    ...(input.event.apiKey !== undefined ? ['apiKey'] : []),
    ...(input.event.userEmail !== undefined ? ['userEmail'] : []),
  ]
  const trustInspection = inspectUsageImportSecurity({
    filename: `${input.source}-sdk-lite.csv`,
    rawCsv: sdkLiteCsvForTrust(input.event),
  })

  return {
    source: input.source,
    normalizedEvent: {
      timestamp: input.event.timestamp,
      request_id: input.event.requestId,
      customer: input.event.customerId,
      feature: input.event.feature,
      model: input.event.model,
      plan: input.event.plan,
      session: input.event.sessionId,
      agent_run: input.event.agentRunId,
      input_tokens: input.event.inputTokens,
      output_tokens: input.event.outputTokens,
      retry_count: input.event.retryCount,
      cache_read_tokens: input.event.cacheReadTokens,
      cache_write_tokens: input.event.cacheWriteTokens,
      latency_ms: input.event.latencyMs,
      status: input.event.status,
      deliverable: input.event.deliverable,
      task_type: input.event.taskType,
      human_review: input.event.humanReview,
    },
    excludedFields,
    trustInspection,
    snapshotAllowed: trustInspection.allowedForSnapshot && excludedFields.length === 0,
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

export function calculateVllmServingCost(input: VllmServingCostInput): VllmServingCostSummary {
  const gpuHourlyUsd = positiveNumber(input.gpuHourlyUsd)
  const gpuCount = positiveNumber(input.gpuCount)
  const activeHoursPerMonth = positiveNumber(input.activeHoursPerMonth)
  const infraOverheadPct = Math.min(1, positiveNumber(input.infraOverheadPct))
  const monthlyInputTokens = positiveNumber(input.monthlyInputTokens)
  const monthlyOutputTokens = positiveNumber(input.monthlyOutputTokens)
  const monthlyServedTokens = monthlyInputTokens + monthlyOutputTokens
  const monthlyRequestCount = positiveNumber(input.monthlyRequestCount)
  const monthlyCustomerCount = positiveNumber(input.monthlyCustomerCount)
  const gpuUtilizationPct = Math.min(1, positiveNumber(input.gpuUtilizationPct))
  const throughputTokensPerSecond = positiveNumber(input.throughputTokensPerSecond)

  const monthlyGpuCostUsd = gpuHourlyUsd * gpuCount * activeHoursPerMonth
  const monthlyInfraOverheadUsd = monthlyGpuCostUsd * infraOverheadPct
  const monthlyServingCostUsd = monthlyGpuCostUsd + monthlyInfraOverheadUsd
  const effectiveThroughputTokensPerSecond = throughputTokensPerSecond * gpuUtilizationPct
  const utilizationWasteShare = Math.max(0, 1 - gpuUtilizationPct)

  return {
    costAuthority: 'self_hosted_serving_economics_only',
    providerApiCostExcluded: true,
    monthlyGpuCostUsd,
    monthlyInfraOverheadUsd,
    monthlyServingCostUsd,
    monthlyServedTokens,
    effectiveThroughputTokensPerSecond,
    costPerMillionTokensUsd: monthlyServedTokens > 0 ? monthlyServingCostUsd / (monthlyServedTokens / 1_000_000) : null,
    costPerRequestUsd: monthlyRequestCount > 0 ? monthlyServingCostUsd / monthlyRequestCount : null,
    costPerCustomerUsd: monthlyCustomerCount > 0 ? monthlyServingCostUsd / monthlyCustomerCount : null,
    idleWasteUsd: monthlyServingCostUsd * utilizationWasteShare,
    utilizationWasteShare,
    caveats: [
      'self-hosted serving economics only',
      'provider API COGS excluded',
      'quality and throughput validation required before savings are confirmed',
    ],
  }
}

export function buildVllmServingReview(input: VllmServingInput): VllmServingReview {
  const analysis = analyzeVllmServingEconomics(input)
  const whatIfComparisons = analysis.recommendations.length > 0
    ? analysis.recommendations.map(recommendation => ({
      id: slug(recommendation),
      label: recommendation,
      status: 'validation_required' as const,
    }))
    : [{ id: 'keep-current-serving-policy', label: 'Keep current serving policy what-if', status: 'validation_required' as const }]

  return {
    ...analysis,
    providerApiCostExcluded: true,
    whatIfComparisons,
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

export function buildP1ActionApprovalGate(input: {
  draft: P1AlertDraft | BillingChangeDraft
  approvalStatus: P1ApprovalStatus
}): P1ActionApprovalGate {
  const isBillingDraft = 'rollbackRef' in input.draft
  const rollbackRef = 'rollbackRef' in input.draft ? input.draft.rollbackRef : ''
  const hasRollbackMetadata = !isBillingDraft || Boolean(rollbackRef)
  const approved = input.approvalStatus === 'approved'
  const executionAllowed = approved && hasRollbackMetadata
  const warnings = [
    ...(!approved ? ['human_approval_required'] : []),
    ...(isBillingDraft && !hasRollbackMetadata ? ['rollback_metadata_required'] : []),
  ]

  return {
    executionAllowed,
    nextRequiredStep: executionAllowed ? 'execute' : input.approvalStatus === 'rejected' ? 'ledger' : 'human_approval',
    ledgerRequired: approved || input.approvalStatus === 'rejected',
    rollbackMetadataRequired: isBillingDraft,
    warnings,
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

export function buildBenchmarkMarketplace(input: {
  selfBaselineCount: number
  verifiedPublicRecords: Array<{ id: string; label: string }>
  customerPeerRows: Array<{ id: string; label: string; verified: boolean }>
}): BenchmarkMarketplace {
  const basis = selectBenchmarkBasis({
    selfBaselineCount: input.selfBaselineCount,
    verifiedPeerCount: input.verifiedPublicRecords.length,
    customerPeerCohortCount: input.customerPeerRows.length,
  })
  const records: BenchmarkMarketplaceRecord[] = [
    ...Array.from({ length: input.selfBaselineCount }, (_, index) => ({
      id: `self-baseline-${index + 1}`,
      label: `Self baseline ${index + 1}`,
      sourceType: 'self_baseline' as const,
      status: 'verified' as const,
    })),
    ...input.verifiedPublicRecords.map(record => ({
      id: record.id,
      label: record.label,
      sourceType: 'verified_public_evidence' as const,
      status: 'verified' as const,
    })),
    ...input.customerPeerRows.map(row => ({
      id: row.id,
      label: row.label,
      sourceType: 'customer_peer_cohort' as const,
      status: row.verified ? 'verified' as const : 'needs_review' as const,
    })),
  ]

  return { basis, records: basis.status === 'baseline_unavailable' ? [] : records }
}

export function buildRetentionAutomationPlan(input: {
  workspaceId: string
  hasRawUpload: boolean
  hasRawPrompt: boolean
  hasApiKey: boolean
  hasPii: boolean
}): RetentionAutomationPlan {
  const normalizedWorkspaceId = workspaceId(input.workspaceId)
  const excludedArtifacts = [
    ...(input.hasRawPrompt ? ['raw_prompt'] : []),
    ...(input.hasApiKey ? ['api_key'] : []),
    ...(input.hasPii ? ['pii_original'] : []),
  ]
  const storedArtifacts = [
    'normalized_usage_snapshot',
    'schema_mapping_profile',
    'trust_inspection_result',
    'report_artifact',
    'decision_ledger_row',
    'agent_run_metadata',
  ]
  const scheduledFor = new Date().toISOString()
  const jobs: RetentionJob[] = [
    {
      id: `retention-job:${normalizedWorkspaceId}:audit-export`,
      workspaceId: normalizedWorkspaceId,
      kind: 'export_audit',
      status: 'scheduled',
      scheduledFor,
    },
    ...(input.hasRawUpload ? [{
      id: `retention-job:${normalizedWorkspaceId}:raw-upload-delete`,
      workspaceId: normalizedWorkspaceId,
      kind: 'delete_artifact' as const,
      status: 'scheduled' as const,
      artifactId: 'raw_upload',
      scheduledFor,
    }] : []),
  ]

  return {
    workspaceId: normalizedWorkspaceId,
    storedArtifacts,
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
    jobs,
  }
}

export function runRetentionJobs(input: {
  jobs: RetentionJob[]
  storedArtifactIds: string[]
  executedAt?: string
}): RetentionJobRunResult {
  const executedAt = input.executedAt ?? new Date().toISOString()
  const completedJobs: RetentionJob[] = []
  const blockedJobs: RetentionJob[] = []
  const deletedArtifactIds: string[] = []
  const auditExportRefs: string[] = []

  for (const job of input.jobs) {
    if (job.status !== 'scheduled') continue
    if (job.kind === 'delete_artifact') {
      if (!job.artifactId || input.storedArtifactIds.includes(job.artifactId)) {
        blockedJobs.push({ ...job, status: 'blocked' })
        continue
      }
      completedJobs.push({ ...job, status: 'completed', completedAt: executedAt })
      deletedArtifactIds.push(job.artifactId)
    } else {
      const auditExportRef = `audit-export:${job.workspaceId}:${executedAt.slice(0, 10)}`
      completedJobs.push({ ...job, status: 'completed', completedAt: executedAt, auditExportRef })
      auditExportRefs.push(auditExportRef)
    }
  }

  return {
    completedJobs,
    blockedJobs,
    deletedArtifactIds: unique(deletedArtifactIds),
    auditExportRefs: unique(auditExportRefs),
  }
}

export function buildDataRoomWorkspace(input: {
  workspaceId: string
  hasRawUpload: boolean
  hasRawPrompt: boolean
  hasApiKey: boolean
  hasPii: boolean
}): DataRoomWorkspace {
  const plan = buildRetentionAutomationPlan(input)
  const artifactInventory: DataRoomArtifactInventoryItem[] = [
    ...plan.storedArtifacts.map(artifact => ({
      id: artifact,
      label: artifact.replace(/_/g, ' '),
      stored: true,
      note: 'Stored as normalized or audit-safe metadata.',
    })),
    ...plan.excludedArtifacts.map(artifact => ({
      id: artifact,
      label: artifact.replace(/_/g, ' '),
      stored: false,
      note: 'Not stored by default.',
    })),
  ]
  const auditExportDraft = buildExternalActionDraft({
    workspaceId: input.workspaceId,
    kind: 'audit_export',
    title: 'Audit export draft',
    payload: {
      artifactIds: artifactInventory.filter(item => item.stored).map(item => item.id),
      excludedArtifactIds: artifactInventory.filter(item => !item.stored).map(item => item.id),
    },
    sourceRefs: ['asset:data_room', 'decision:human_approval_required'],
  })

  return { plan, artifactInventory, auditExportDraft }
}
