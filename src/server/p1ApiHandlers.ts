import { runBrowserAgent } from '../features/agent/lib/agentRuntime'
import type { AgentEvent, AgentRuntimeInput } from '../features/agent/lib/agentRuntime'
import type { TeamCostRuntimeInput } from '../features/agent/lib/teamCostRuntime'
import { runTeamCostAgentWithLlm, type TeamCostLlmMode } from '../features/agent/lib/teamCostLlmRuntime'
import { retrieveRiskCards } from '../features/agent/lib/riskCards'
import type { RiskCard } from '../features/agent/lib/riskCards'
import type { TeamCostGraphEvent } from '../features/team-cost/lib/teamCostState'
import type { CheckpointPersistence, TeamCostCheckpoint } from '../features/agent/lib/checkpointStore'
import { MODELS, type Model } from '../features/alternatives/data/models'
import { PRODUCT_NAME } from '../lib/productBrand'
import { parseUsageCsv, type UsageImportSummary } from '../features/usage/lib/usageImport'
import { validateUsageIngress, type TrustGateDecision } from '../features/trust/lib/securityMiddleware'
import { buildOnePageReportArtifact, type OnePageReportArtifactInput } from '../features/report/lib/reportArtifacts'
import type { DecisionChoice } from '../features/decision-loop/lib/decisionHeader'
import {
  deterministicPreviewRuntimeProof,
  normalizeHumanApprovalMetadata,
  normalizeRuntimeProofMetadata,
} from '../features/provenance/lib/runtimeApprovalMetadata'
import type { RuntimeProofMetadata } from '../features/provenance/lib/runtimeApprovalMetadata'
import type { AgentSpec, HumanReviewGate } from '../features/team-cost/lib/agentSpec'
import { estimateAgentWorkload } from '../features/team-cost/lib/estimateAgentWorkload'
import { normalizeDecisionRecord, type Decision } from '../features/decision-log/lib/decisionLog'
import type { AITeamConfiguration } from '../features/team/lib/aiTeamConfiguration'
import {
  createKvStoreFromEnv,
  isStorageNotConfigured,
  type JsonKvStore,
} from './storage/kvStore'
import { createOpenAiEmbeddingProviderFromEnv } from './ai/openAiEmbeddingProvider'
import {
  SupabaseCheckpointStore,
  SupabaseDecisionStore,
  SupabasePersistentVectorStore,
  SupabaseReportArtifactStore,
  SupabaseWatchtowerStore,
  createSupabaseClientFromEnv,
  type SupabaseCheckpointRecord,
  type SupabaseAcceptedFactRecord,
  type SupabaseFactReviewEventRecord,
  type SupabaseFactReviewAction,
  type SupabaseFactReviewStatus,
  type SupabaseWatchtowerCandidateRecord,
  type SupabaseWatchtowerRunRecord,
} from './storage/supabaseProductionStore'
import {
  normalizeSdkLiteUsageEvent,
  approveExternalAction,
  buildRetentionAutomationPlan,
  buildExternalActionDraft,
  executeExternalAction,
  runRetentionJobs,
  type P1ExternalAction,
  type P1ExternalConnectorId,
  type P1ExternalConnectorMode,
  type P1ExternalActionExecutionResult,
  type P1ExternalActionKind,
  type P1ExternalActionLedgerEntry,
  retrieveP1VectorRagEvidence,
  type NormalizedP1SdkLiteUsageEvent,
  type P1RagEvidenceResult,
  type P1SdkLiteUsageEvent,
  type P1UsageAdapterSource,
  type P1VectorRagEvidenceResult,
  type P1VectorRagKind,
  type RetentionJob,
  type RetentionJobRunResult,
} from '../features/p1/lib/p1OperatingSystem'
import {
  buildRagContextBlocks,
  buildVectorIndex,
  createMemoryVectorStore,
  createHashEmbeddingProvider,
  searchVectorIndex,
  type ApiDocChunk,
  type RagCollection,
  type RagContextBlock,
  type VectorSearchResult,
  type VectorStore,
  type VectorStoreStats,
} from '../features/rag/lib/apiDocRag'
import {
  buildOfficialUpdatesReviewInbox,
  type ModelReleaseCandidate,
  type OfficialSourceSnippet,
  type OfficialUpdatesReviewInbox,
} from '../features/research/lib/officialWatchtower'
import {
  isCorpusChunk,
  p1RecordsFromCorpusEvidence,
  retrieveCorpusEvidence,
  type CorpusCollectionsInput,
  type CorpusEvidenceResult,
} from '../features/rag/lib/corpusRag'
import { CORPUS_IDS, type CorpusId } from '../features/rag/lib/corpusTypes'
import { buildCorpusReadinessReport, type CorpusReadinessReport } from '../features/rag/lib/corpusReadiness'
import { EXTERNAL_CONNECTORS } from './externalConnectors'

export interface ApiResult<T> {
  status: number
  body: T
}

export interface P1ApiContext {
  store?: JsonKvStore
  query?: Record<string, string | string[] | undefined>
  models?: Model[]
  now?: () => Date
  env?: Record<string, string | undefined>
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export interface AgentApiResponse {
  runtime: 'vercel-function-shell'
  events: AgentEvent[]
  error?: string
}

type PersistenceState = 'kv' | 'not_configured' | 'supabase'
type RuntimeCapabilityStatus = 'provider_llm' | 'deterministic_preview' | 'unavailable' | 'connector_not_configured'

export interface RuntimeStatusApiResponse {
  productName: typeof PRODUCT_NAME
  agentRuntime: {
    status: RuntimeCapabilityStatus
    requiredEnv: string[]
    missingEnv: string[]
  }
  persistence: {
    status: RuntimeCapabilityStatus
    requiredEnv: string[]
    missingEnv: string[]
  }
  connectors: Record<'slack_webhook' | 'resend_email' | 'stripe_billing' | 'metronome', {
    status: RuntimeCapabilityStatus
    requiredEnv: string[]
    missingEnv: string[]
  }>
  corpusReadiness: CorpusReadinessReport
  error?: string
}

export interface DecisionApiResponse {
  persistence: PersistenceState
  acceptedCount: number
  decisions: Decision[]
  deleted: boolean
  message: string
  error?: string
}

export interface ConfigurationApiResponse {
  persistence: PersistenceState
  config: AITeamConfiguration | null
  error?: string
}

export interface ReportRunShell {
  id: string
  period: string
  decisionIds: string[]
  persistence: PersistenceState
  createdAt: string
  snapshotRefs: {
    decisionIds: string[]
    configSnapshotRef: string | null
    usageSnapshotRef: string | null
  }
  artifacts: ReportArtifactRecord[]
}

export interface ReportArtifactRecord {
  id: string
  workspaceId: string
  reportRunId: string
  format: 'markdown' | 'json' | 'pdf'
  contentType: 'text/markdown' | 'application/json' | 'application/pdf'
  downloadPath: string
  sizeBytes: number
  createdAt: string
  body: string
}

export interface ReportApiResponse {
  persistence: PersistenceState
  reportRun: ReportRunShell
  reportRuns: ReportRunShell[]
  error?: string
}

export interface RiskCardsApiResponse {
  retrieval: 'deterministic-tag-corpus'
  cards: RiskCard[]
  metadata?: {
    workspaceId: string
    persistence: PersistenceState
    tags: string[]
  }
  error?: string
}

export interface TeamCostAgentApiResponse {
  runtime: 'vercel-function-shell'
  events: TeamCostGraphEvent[]
  checkpoint: TeamCostCheckpoint
  llmMode?: TeamCostLlmMode
  error?: string
}

export interface UsageImportApiResponse {
  persistence: PersistenceState
  summary: UsageImportSummary
  snapshotRef: string | null
  snapshotAllowed: boolean
  trustGate: TrustGateDecision
  blockedReason?: string
  history: Array<{ snapshotRef: string; requestCount: number; importedAt: string }>
  error?: string
}

export interface SdkLiteUsageApiResponse {
  persistence: PersistenceState
  snapshotAllowed: boolean
  eventRef: string | null
  normalized: NormalizedP1SdkLiteUsageEvent | null
  history: Array<{ eventRef: string; ingestedAt: string }>
  error?: string
}

export interface P1RagEvidenceApiResponse {
  persistence: PersistenceState
  runtimeStatus: RuntimeCapabilityStatus
  evidence: P1VectorRagEvidenceResult
  corpusEvidence?: CorpusEvidenceResult
  contextBlocks?: RagContextBlock[]
  metadata?: {
    workspaceId: string
    query: string
  }
  error?: string
}

export interface ReportDownloadApiResponse {
  persistence: PersistenceState
  artifact: ReportArtifactRecord | null
  content: string
  error?: string
}

export interface RagIndexApiResponse {
  persistence: PersistenceState
  indexedCount: number
  stats: VectorStoreStats
  error?: string
}

export interface P1ExternalActionsApiResponse {
  persistence: PersistenceState
  actions: P1ExternalAction[]
  ledger: P1ExternalActionLedgerEntry[]
  action: P1ExternalAction | null
  execution: P1ExternalActionExecutionResult | null
  error?: string
}

export interface RetentionRunApiResponse {
  persistence: PersistenceState
  jobs: RetentionJob[]
  result: RetentionJobRunResult
  error?: string
}

export interface TeamCostCalibrationResult {
  plannedCallsPerDay: number
  actualCallsPerDay: number
  retryShare: number
  bottleneckAgentId: string | null
  bottleneckTask: string
  suggestedAgentSpecPatch: {
    agentId: string | null
    callsPerRun: number
    cacheHitRate: number
    humanReviewGate: HumanReviewGate
    modelId: string | null
  }
}

export interface TeamCostCalibrationApiResponse {
  persistence: PersistenceState
  calibration: TeamCostCalibrationResult
  error?: string
}

export interface OfficialUpdatesApiResponse {
  persistence: PersistenceState
  inbox: OfficialUpdatesReviewInbox
  latestRun?: SupabaseWatchtowerRunRecord | null
  acceptedFacts?: SupabaseAcceptedFactRecord[]
  reviewCandidate?: SupabaseWatchtowerCandidateRecord
  reviewEvent?: SupabaseFactReviewEventRecord
  acceptedFact?: SupabaseAcceptedFactRecord
  error?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function reportMetrics(value: unknown): Array<{ label: string; value: string }> {
  return Array.isArray(value)
    ? value
      .filter(item => isObject(item) && typeof item.label === 'string' && typeof item.value === 'string')
      .map(item => ({ label: String(item.label), value: String(item.value) }))
    : []
}

function decisionChoice(value: unknown): DecisionChoice | undefined {
  return value === 'adopt' || value === 'reject' || value === 'hold' ? value : undefined
}

function reportFirstInputFromBody(body: unknown): OnePageReportArtifactInput | undefined {
  const reportFirst = isObject(body) && isObject(body.reportFirst) ? body.reportFirst : null
  if (!reportFirst) return undefined
  const trust = isObject(reportFirst.trust) ? reportFirst.trust : null
  const title = stringValue(reportFirst.title)
  const executiveSummary = stringValue(reportFirst.executiveSummary)
  const formulaVersion = stringValue(reportFirst.formulaVersion)
  const providerRegistryVersion = stringValue(reportFirst.providerRegistryVersion)
  const trustStatus = trust ? stringValue(trust.status) : null
  const retentionNote = trust ? stringValue(trust.retentionNote) : null
  if (!title || !executiveSummary || !formulaVersion || !providerRegistryVersion || !trustStatus || !retentionNote) {
    return undefined
  }

  return {
    title,
    executiveSummary,
    metrics: reportMetrics(reportFirst.metrics),
    recommendations: stringArray(reportFirst.recommendations),
    risks: stringArray(reportFirst.risks),
    refs: stringArray(reportFirst.refs),
    trust: {
      status: trustStatus,
      dataLimitations: stringArray(trust?.dataLimitations),
      retentionNote,
    },
    formulaVersion,
    providerRegistryVersion,
    snapshotVersion: stringValue(reportFirst.snapshotVersion) ?? undefined,
    decisionRefs: stringArray(reportFirst.decisionRefs),
    decisionChoice: decisionChoice(reportFirst.decisionChoice),
    runtimeProof: normalizeRuntimeProofMetadata(reportFirst.runtimeProof) ?? undefined,
    humanApproval: normalizeHumanApprovalMetadata(reportFirst.humanApproval) ?? undefined,
  }
}

function isP1UsageAdapterSource(value: unknown): value is P1UsageAdapterSource {
  return value === 'openai'
    || value === 'anthropic'
    || value === 'vercel_ai_gateway'
    || value === 'helicone'
    || value === 'langfuse'
    || value === 'openrouter'
    || value === 'litellm'
    || value === 'application_gateway'
}

function isP1ExternalActionKind(value: unknown): value is P1ExternalActionKind {
  return value === 'slack_alert'
    || value === 'email_alert'
    || value === 'billing_change'
    || value === 'audit_export'
    || value === 'retention_reminder'
}

function externalConnectorMode(value: unknown): P1ExternalConnectorMode | undefined {
  return value === 'live' || value === 'dry_run' ? value : undefined
}

function isP1ExternalConnectorId(value: unknown): value is P1ExternalConnectorId {
  return value === 'slack_webhook'
    || value === 'resend_email'
    || value === 'stripe_billing'
    || value === 'metronome'
    || value === 'data_room_export'
}

function queryValue(query: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = query[key]
  return Array.isArray(value) ? value[0] : value
}

function contextStore(context?: P1ApiContext): JsonKvStore {
  return context?.store ?? createKvStoreFromEnv()
}

function contextEnv(context?: P1ApiContext): Record<string, string | undefined> {
  return context?.env ?? (globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }).process?.env ?? {}
}

function contextSupabaseClient(context: P1ApiContext) {
  return createSupabaseClientFromEnv(contextEnv(context), context.fetcher)
}

function capabilityFromEnv(
  env: Record<string, string | undefined>,
  requiredEnv: string[],
  missingStatus: RuntimeCapabilityStatus = 'unavailable',
) {
  const missingEnv = requiredEnv.filter(key => !env[key])
  return {
    status: missingEnv.length === 0 ? 'provider_llm' as const : missingStatus,
    requiredEnv,
    missingEnv,
  }
}

function supabasePersistenceCapability(env: Record<string, string | undefined>) {
  const missingEnv = [
    ...(!env.SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL ? ['SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL'] : []),
    ...(!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SECRET_KEY ? ['SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY'] : []),
    ...(!env.OPENAI_API_KEY ? ['OPENAI_API_KEY'] : []),
  ]
  return {
    status: missingEnv.length === 0 ? 'provider_llm' as const : 'unavailable' as const,
    requiredEnv: ['SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY', 'OPENAI_API_KEY'],
    missingEnv,
  }
}

function normalizedWorkspaceId(body: unknown, query: Record<string, string | string[] | undefined> = {}): string | null {
  const raw = isObject(body) && typeof body.workspaceId === 'string'
    ? body.workspaceId
    : queryValue(query, 'workspaceId')
  const trimmed = raw?.trim()
  return trimmed ? trimmed.replace(/[^0-9A-Za-z_-]/g, '-') : null
}

function workspaceKey(workspaceId: string, name: string): string {
  return `workspace:${workspaceId}:${name}`
}

function ragIndexKey(workspaceId: string): string {
  return workspaceKey(workspaceId, 'p1-rag-official-doc-chunks')
}

const RAG_COLLECTIONS: RagCollection[] = [
  'official_docs',
  'benchmark_evidence',
  'serving_economics',
  'usage_schema',
  'decision_history',
]

function isRagCollection(value: unknown): value is RagCollection {
  return typeof value === 'string' && (RAG_COLLECTIONS as string[]).includes(value)
}

function isFactReviewAction(value: unknown): value is SupabaseFactReviewAction {
  return value === 'accept' || value === 'reject' || value === 'hold' || value === 'supersede'
}

function reviewStatusFromMetadata(value: unknown): SupabaseFactReviewStatus | null {
  if (
    value === 'needs_review'
    || value === 'accepted'
    || value === 'rejected'
    || value === 'held'
    || value === 'superseded'
  ) return value
  return null
}

function emptyUsageSummary(errors: string[] = []): UsageImportSummary {
  return {
    rows: [],
    featureSummaries: [],
    errors,
    requestCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    avgInputTokensPerRequest: 0,
    avgOutputTokensPerRequest: 0,
    p95OutputTokens: 0,
    topFeatureByCost: null,
  }
}

function emptyRagEvidence(): P1VectorRagEvidenceResult {
  const emptyResult = (kind: 'official_docs' | 'benchmark' | 'decision_history'): P1RagEvidenceResult => ({
    kind,
    found: false,
    refs: [],
    mayOverrideFacts: false,
    records: [],
    scores: [],
    warnings: [],
  })
  return {
    mayOverrideFacts: false,
    results: {
      official_docs: emptyResult('official_docs'),
      benchmark_evidence: { ...emptyResult('benchmark'), warnings: ['baseline_unavailable'] },
      decision_history: emptyResult('decision_history'),
    },
    warnings: ['baseline_unavailable'],
  }
}

function storageErrorBody<T extends { persistence: PersistenceState; error?: string }>(body: T): ApiResult<T> {
  return { status: 503, body: { ...body, persistence: 'not_configured', error: 'storage_not_configured' } }
}

function toolResults(value: Record<string, unknown>): Record<string, number | string> {
  return Object.entries(value).reduce<Record<string, number | string>>((result, [key, item]) => {
    if (typeof item === 'number' || typeof item === 'string') {
      result[key] = item
    }
    return result
  }, {})
}

function asAgentInput(body: unknown): AgentRuntimeInput | null {
  if (!isObject(body) || !isObject(body.toolResults)) return null
  return {
    apiKey: '',
    toolResults: toolResults(body.toolResults),
    riskCardIds: stringArray(body.riskCardIds),
  }
}

function asTeamCostAgentInput(body: unknown): TeamCostRuntimeInput | null {
  if (!isObject(body) || !isObject(body.companyProfile)) return null
  return {
    apiKey: '',
    approvalMode: body.approvalMode === 'interrupt' ? 'interrupt' : 'event',
    threadId: typeof body.threadId === 'string' ? body.threadId : undefined,
    workspaceId: typeof body.workspaceId === 'string' ? body.workspaceId : undefined,
    resumeApproval: isObject(body.resumeApproval)
      && typeof body.resumeApproval.recommendationId === 'string'
      && typeof body.resumeApproval.approved === 'boolean'
      ? {
        recommendationId: body.resumeApproval.recommendationId,
        approved: body.resumeApproval.approved,
        reason: typeof body.resumeApproval.reason === 'string' ? body.resumeApproval.reason : undefined,
      }
      : undefined,
    workflowMode: body.workflowMode === 'estimate_only'
      || body.workflowMode === 'optimize'
      || body.workflowMode === 'decision'
      || body.workflowMode === 'report'
      || body.workflowMode === 'calibrate'
      ? body.workflowMode
      : 'estimate_only',
    companyProfile: {
      companyType: typeof body.companyProfile.companyType === 'string' ? body.companyProfile.companyType : '1-person B2B SaaS',
      stage: typeof body.companyProfile.stage === 'string' ? body.companyProfile.stage : 'MVP',
      monthlyBudgetUsd: typeof body.companyProfile.monthlyBudgetUsd === 'number' ? body.companyProfile.monthlyBudgetUsd : 0,
      locale: body.companyProfile.locale === 'en' || body.companyProfile.locale === 'ko' ? body.companyProfile.locale : 'en',
    },
    agentSpecs: Array.isArray(body.agentSpecs) ? body.agentSpecs as TeamCostRuntimeInput['agentSpecs'] : [],
  }
}

function checkpointFor(input: TeamCostRuntimeInput, persistence: CheckpointPersistence): TeamCostCheckpoint {
  const threadId = input.threadId?.trim() || `thread-${new Date().toISOString().slice(0, 10)}`
  const status = input.approvalMode === 'interrupt'
    ? input.resumeApproval ? 'resumed' : 'interrupt_requested'
    : 'not_required'

  return {
    persistence,
    threadId,
    workspaceId: input.workspaceId,
    status,
    message: persistence === 'supabase'
      ? 'Checkpoint persisted in Supabase for P1 interrupt/resume flow.'
      : persistence === 'kv'
        ? 'Checkpoint persisted in Vercel KV for P1 interrupt/resume flow.'
        : 'Checkpoint persistence is not configured yet; P0 still uses browser events and local Decision Log export.',
  }
}

function firstRecommendationId(events: TeamCostGraphEvent[]): string | null {
  return events.find(event => event.type === 'approval_required')?.recommendationIds[0] ?? null
}

function teamCostRuntimeProof(input: TeamCostRuntimeInput, llmMode: TeamCostLlmMode): RuntimeProofMetadata {
  if (llmMode !== 'provider-llm') {
    return deterministicPreviewRuntimeProof('team_cost_llm_runtime_not_enabled')
  }
  const now = new Date().toISOString()
  return {
    status: 'provider_llm',
    providerRunId: `team-cost-agent:${input.threadId?.trim() || 'unthreaded'}`,
    agentInvocationProof: [],
    startedAt: now,
    completedAt: now,
  }
}

function humanApprovalFromResume(input: TeamCostRuntimeInput): Record<string, unknown> | null {
  if (!input.resumeApproval) return null
  return {
    required: true,
    decisionChoice: input.resumeApproval.approved ? 'adopt' : 'reject',
    approvedBy: 'workspace_user',
    approvedAt: new Date().toISOString(),
    approvalMode: 'checkpoint_resume',
    recommendationId: input.resumeApproval.recommendationId,
    reason: input.resumeApproval.reason ?? '',
  }
}

function checkpointApprovalState(input: TeamCostRuntimeInput, events: TeamCostGraphEvent[]) {
  const recommendationId = input.resumeApproval?.recommendationId ?? firstRecommendationId(events)
  if (input.resumeApproval) {
    return {
      status: input.resumeApproval.approved ? 'approved' as const : 'rejected' as const,
      recommendationId,
    }
  }
  return {
    status: input.approvalMode === 'interrupt' && recommendationId ? 'pending' as const : 'not_required' as const,
    recommendationId,
  }
}

function checkpointDecisionDraft(events: TeamCostGraphEvent[]): Record<string, unknown> | null {
  const event = events.find(item => item.type === 'decision_draft')
  if (!event) return null
  return {
    message: event.message,
    recommendationIds: event.recommendationIds,
    riskCardIds: event.riskCardIds,
    toolResultRefs: event.toolResultRefs,
  }
}

function compactPreviousCheckpoint(previousCheckpoint: SupabaseCheckpointRecord | null): Record<string, unknown> | null {
  if (!previousCheckpoint) return null
  return {
    workspaceId: previousCheckpoint.workspaceId,
    threadId: previousCheckpoint.threadId,
    checkpointId: previousCheckpoint.checkpointId,
    status: previousCheckpoint.status,
    graphState: {
      workflowMode: previousCheckpoint.graphState.workflowMode ?? null,
      llmMode: previousCheckpoint.graphState.llmMode ?? null,
      approval: previousCheckpoint.graphState.approval ?? null,
    },
  }
}

function teamCostCheckpointGraphState(
  input: TeamCostRuntimeInput,
  events: TeamCostGraphEvent[],
  llmMode: TeamCostLlmMode,
  previousCheckpoint: SupabaseCheckpointRecord | null,
): Record<string, unknown> {
  return {
    workflowMode: input.workflowMode,
    resumeApproval: input.resumeApproval ?? null,
    approval: checkpointApprovalState(input, events),
    decisionDraft: checkpointDecisionDraft(events),
    humanApproval: humanApprovalFromResume(input),
    runtimeProof: teamCostRuntimeProof(input, llmMode),
    previousCheckpoint: compactPreviousCheckpoint(previousCheckpoint),
    events,
    llmMode,
  }
}

function emptyReportRun(
  period = new Date().toISOString().slice(0, 7),
  decisionIds: string[] = [],
  persistence: PersistenceState = 'not_configured',
  configSnapshotRef: string | null = null,
  usageSnapshotRef: string | null = null,
  workspaceId = 'workspace-demo',
  reportFirst?: OnePageReportArtifactInput,
): ReportRunShell {
  const id = `report-run-${period}`
  const createdAt = new Date().toISOString()
  const snapshotRefs = { decisionIds, configSnapshotRef, usageSnapshotRef }
  return {
    id,
    period,
    decisionIds,
    persistence,
    createdAt,
    snapshotRefs,
    artifacts: buildReportArtifacts({ workspaceId, reportRunId: id, period, decisionIds, snapshotRefs, createdAt, reportFirst }),
  }
}

function artifactSize(body: string): number {
  return new TextEncoder().encode(body).length
}

function buildReportArtifacts(input: {
  workspaceId: string
  reportRunId: string
  period: string
  decisionIds: string[]
  snapshotRefs: ReportRunShell['snapshotRefs']
  createdAt: string
  reportFirst?: OnePageReportArtifactInput
}): ReportArtifactRecord[] {
  const onePage = input.reportFirst ? buildOnePageReportArtifact(input.reportFirst) : null
  const markdown = onePage?.markdown ?? [
    `# ${input.reportRunId}`,
    '',
    `Period: ${input.period}`,
    `Decision refs: ${input.decisionIds.join(', ') || 'none'}`,
    `Config snapshot: ${input.snapshotRefs.configSnapshotRef ?? 'none'}`,
    `Usage snapshot: ${input.snapshotRefs.usageSnapshotRef ?? 'none'}`,
  ].join('\n')
  const json = JSON.stringify({
    reportRunId: input.reportRunId,
    workspaceId: input.workspaceId,
    period: input.period,
    decisionIds: input.decisionIds,
    snapshotRefs: input.snapshotRefs,
    createdAt: input.createdAt,
    reportFirst: input.reportFirst ?? null,
    refs: onePage?.refs ?? [],
  }, null, 2)
  const pdf = ['%PDF-1.4', `% ${onePage?.title ?? `${PRODUCT_NAME} report artifact ${input.reportRunId}`}`, markdown, '%%EOF'].join('\n')
  const basePath = `/api/reports/${input.reportRunId}/download`
  const rows = [
    { format: 'pdf' as const, contentType: 'application/pdf' as const, body: pdf },
    { format: 'markdown' as const, contentType: 'text/markdown' as const, body: markdown },
    { format: 'json' as const, contentType: 'application/json' as const, body: json },
  ]

  return rows.map(row => ({
    id: `report-artifact:${input.reportRunId}:${row.format}`,
    workspaceId: input.workspaceId,
    reportRunId: input.reportRunId,
    format: row.format,
    contentType: row.contentType,
    downloadPath: `${basePath}?artifactId=report-artifact:${input.reportRunId}:${row.format}`,
    sizeBytes: artifactSize(row.body),
    createdAt: input.createdAt,
    body: row.body,
  }))
}

function reportRunFromArtifacts(artifacts: ReportArtifactRecord[]): ReportRunShell | null {
  const first = artifacts[0]
  if (!first) return null
  const jsonArtifact = artifacts.find(artifact => artifact.format === 'json')
  const parsed = (() => {
    if (!jsonArtifact) return null
    try {
      return JSON.parse(jsonArtifact.body) as Partial<{
        period: string
        decisionIds: string[]
        snapshotRefs: ReportRunShell['snapshotRefs']
        createdAt: string
      }>
    } catch {
      return null
    }
  })()
  const period = parsed?.period ?? first.reportRunId.replace(/^report-run-/, '')
  const decisionIds = Array.isArray(parsed?.decisionIds) ? parsed.decisionIds.filter(item => typeof item === 'string') : []
  const snapshotRefs = parsed?.snapshotRefs && Array.isArray(parsed.snapshotRefs.decisionIds)
    ? parsed.snapshotRefs
    : { decisionIds, configSnapshotRef: null, usageSnapshotRef: null }
  return {
    id: first.reportRunId,
    period,
    decisionIds,
    persistence: 'supabase',
    createdAt: parsed?.createdAt ?? first.createdAt,
    snapshotRefs,
    artifacts,
  }
}

function groupReportRuns(artifacts: ReportArtifactRecord[]): ReportRunShell[] {
  const groups = artifacts.reduce<Map<string, ReportArtifactRecord[]>>((map, artifact) => {
    map.set(artifact.reportRunId, [...(map.get(artifact.reportRunId) ?? []), artifact])
    return map
  }, new Map())
  return Array.from(groups.values())
    .map(reportRunFromArtifacts)
    .filter((run): run is ReportRunShell => Boolean(run))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function coerceDecisions(value: unknown): Decision[] {
  return Array.isArray(value)
    ? value.map(normalizeDecisionRecord).filter((decision): decision is Decision => Boolean(decision))
    : []
}

export async function handleAgentApi(method: string, body: unknown): Promise<ApiResult<AgentApiResponse>> {
  if (method !== 'POST') {
    return {
      status: 405,
      body: { runtime: 'vercel-function-shell', events: [], error: 'Method not allowed' },
    }
  }

  const input = asAgentInput(body)
  if (!input) {
    return {
      status: 400,
      body: { runtime: 'vercel-function-shell', events: [], error: 'Invalid agent payload' },
    }
  }

  const events = await runBrowserAgent(input)
  return { status: 200, body: { runtime: 'vercel-function-shell', events } }
}

export async function handleTeamCostAgentApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<TeamCostAgentApiResponse>> {
  const fallbackCheckpoint: TeamCostCheckpoint = {
    persistence: 'not_configured',
    threadId: `thread-${new Date().toISOString().slice(0, 10)}`,
    status: 'not_required',
    message: 'Checkpoint persistence is not configured yet; P0 still uses browser events and local Decision Log export.',
  }
  if (method !== 'POST') {
    return {
      status: 405,
      body: { runtime: 'vercel-function-shell', events: [], checkpoint: fallbackCheckpoint, error: 'Method not allowed' },
    }
  }

  const input = asTeamCostAgentInput(body)
  if (!input) {
    return {
      status: 400,
      body: { runtime: 'vercel-function-shell', events: [], checkpoint: fallbackCheckpoint, error: 'Invalid team cost agent payload' },
    }
  }

  const store = contextStore(context)
  const supabaseClient = input.workspaceId ? contextSupabaseClient(context) : null
  const supabaseCheckpointStore = supabaseClient ? new SupabaseCheckpointStore(supabaseClient) : null
  const checkpointPersistence: CheckpointPersistence = supabaseCheckpointStore
    ? 'supabase'
    : store.persistence
  let previousCheckpoint: SupabaseCheckpointRecord | null = null
  if (supabaseCheckpointStore && input.workspaceId && input.threadId && input.resumeApproval) {
    previousCheckpoint = await supabaseCheckpointStore.load({ workspaceId: input.workspaceId, threadId: input.threadId })
  }
  const { events, llmMode } = await runTeamCostAgentWithLlm(input, {
    env: contextEnv(context),
    fetcher: context.fetcher,
  })
  const checkpoint = checkpointFor(input, checkpointPersistence)

  if (supabaseCheckpointStore && input.workspaceId && input.approvalMode === 'interrupt') {
    await supabaseCheckpointStore.save({
      workspaceId: input.workspaceId,
      threadId: checkpoint.threadId,
      checkpointId: `checkpoint:${checkpoint.threadId}`,
      status: checkpoint.status === 'resumed' ? 'resumed' : 'interrupt_requested',
      graphState: teamCostCheckpointGraphState(input, events, llmMode, previousCheckpoint),
    })
  } else if (store.persistence === 'kv' && input.workspaceId) {
    await store.setJson(workspaceKey(input.workspaceId, `checkpoint:${checkpoint.threadId}`), checkpoint)
  }

  return { status: 200, body: { runtime: 'vercel-function-shell', events, checkpoint, llmMode } }
}

export async function handleDecisionsApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<DecisionApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base: DecisionApiResponse = {
    persistence: 'not_configured',
    acceptedCount: 0,
    decisions: [],
    deleted: false,
    message: 'Decision & Approval Log is persisted per workspace when Vercel KV is configured.',
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }

  const store = contextStore(context)
  const supabaseClient = contextSupabaseClient(context)
  const embeddingProvider = createOpenAiEmbeddingProviderFromEnv(contextEnv(context), context.fetcher)
  const key = workspaceKey(workspaceId, 'decisions')

  try {
    if (supabaseClient) {
      const decisionStore = new SupabaseDecisionStore({ client: supabaseClient, embeddingProvider: embeddingProvider ?? undefined })
      if (method === 'GET') {
        const decisions = await decisionStore.list(workspaceId)
        return {
          status: 200,
          body: {
            ...base,
            persistence: 'supabase',
            acceptedCount: decisions.length,
            decisions,
            message: 'Decision & Approval Log is persisted in Supabase and indexed into C9 decision_history.',
          },
        }
      }

      if (method === 'DELETE') {
        const id = isObject(body) && typeof body.id === 'string' ? body.id : queryValue(context.query ?? {}, 'id')
        if (!id) return { status: 400, body: { ...base, persistence: 'supabase', error: 'decision_id_required' } }
        await decisionStore.delete({ workspaceId, id })
        const decisions = await decisionStore.list(workspaceId)
        return {
          status: 202,
          body: {
            ...base,
            persistence: 'supabase',
            acceptedCount: decisions.length,
            decisions,
            deleted: true,
            message: 'Decision removed from Supabase and C9 decision_history.',
          },
        }
      }

      if (method !== 'POST') {
        return { status: 405, body: { ...base, persistence: 'supabase', error: 'Method not allowed' } }
      }
      if (!embeddingProvider) {
        return { status: 503, body: { ...base, persistence: 'supabase', error: 'embedding_provider_not_configured' } }
      }

      const decisions = coerceDecisions(isObject(body) ? body.decisions : [])
      await decisionStore.saveMany(workspaceId, decisions)
      return {
        status: 202,
        body: {
          ...base,
          persistence: 'supabase',
          acceptedCount: decisions.length,
          decisions,
          message: 'Decision & Approval Log is persisted in Supabase and indexed into C9 decision_history.',
        },
      }
    }

    if (method === 'GET') {
      const decisions = coerceDecisions(await store.getJson<unknown[]>(key))
      return { status: 200, body: { ...base, persistence: store.persistence, acceptedCount: decisions.length, decisions } }
    }

    if (method === 'DELETE') {
      const id = isObject(body) && typeof body.id === 'string' ? body.id : queryValue(context.query ?? {}, 'id')
      const decisions = coerceDecisions(await store.getJson<unknown[]>(key)).filter(decision => decision.id !== id)
      await store.setJson(key, decisions)
      return { status: 202, body: { ...base, persistence: store.persistence, acceptedCount: decisions.length, decisions, deleted: true } }
    }

    if (method !== 'POST') {
      return { status: 405, body: { ...base, error: 'Method not allowed' } }
    }

    const decisions = coerceDecisions(isObject(body) ? body.decisions : [])
    await store.setJson(key, decisions)
    return { status: 202, body: { ...base, persistence: store.persistence, acceptedCount: decisions.length, decisions } }
  } catch (error) {
    if (isStorageNotConfigured(error)) return storageErrorBody(base)
    return { status: 500, body: { ...base, error: 'decision_persistence_failed' } }
  }
}

function isAITeamConfiguration(value: unknown): value is AITeamConfiguration {
  return isObject(value)
    && isObject(value.companyProfile)
    && Array.isArray(value.agents)
    && typeof value.configSnapshotRef === 'string'
}

export async function handleConfigurationApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<ConfigurationApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base: ConfigurationApiResponse = { persistence: 'not_configured', config: null }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  const store = contextStore(context)
  const key = workspaceKey(workspaceId, 'configuration')

  try {
    if (method === 'GET') {
      const config = await store.getJson<AITeamConfiguration>(key)
      return { status: 200, body: { persistence: store.persistence, config: isAITeamConfiguration(config) ? config : null } }
    }

    if (method !== 'POST') {
      return { status: 405, body: { ...base, error: 'Method not allowed' } }
    }

    const config = isObject(body) && isAITeamConfiguration(body.config) ? body.config : null
    if (!config) return { status: 400, body: { ...base, error: 'invalid_configuration' } }
    await store.setJson(key, config)
    return { status: 202, body: { persistence: store.persistence, config } }
  } catch (error) {
    if (isStorageNotConfigured(error)) return { status: 503, body: { ...base, error: 'storage_not_configured' } }
    return { status: 500, body: { ...base, error: 'configuration_persistence_failed' } }
  }
}

export async function handleRuntimeStatusApi(
  method: string,
  _body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<RuntimeStatusApiResponse>> {
  const env = contextEnv(context)
  const connector = (requiredEnv: string[]) => capabilityFromEnv(env, requiredEnv, 'connector_not_configured')
  const persistenceCapability = supabasePersistenceCapability(env)
  const body: RuntimeStatusApiResponse = {
    productName: PRODUCT_NAME,
    agentRuntime: capabilityFromEnv(env, ['OPENAI_API_KEY', 'AGENT_SERVICE_URL']),
    persistence: persistenceCapability,
    connectors: {
      slack_webhook: connector(['SLACK_WEBHOOK_URL']),
      resend_email: connector(['RESEND_API_KEY']),
      stripe_billing: connector(['STRIPE_SECRET_KEY']),
      metronome: connector(['METRONOME_API_KEY']),
    },
    corpusReadiness: buildCorpusReadinessReport({
      productionStoreConfigured: persistenceCapability.status === 'provider_llm',
      nowIso: (context.now?.() ?? new Date()).toISOString(),
    }),
  }
  if (method !== 'GET') return { status: 405, body: { ...body, error: 'Method not allowed' } }
  return { status: 200, body }
}

export async function handleUsageImportApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<UsageImportApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base: UsageImportApiResponse = {
    persistence: 'not_configured',
    summary: emptyUsageSummary(),
    snapshotRef: null,
    snapshotAllowed: false,
    trustGate: 'blocked',
    history: [],
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'POST') return { status: 405, body: { ...base, error: 'Method not allowed' } }

  const store = contextStore(context)
  const models = context.models ?? MODELS
  const rawCsv = isObject(body) && typeof body.csv === 'string' ? body.csv : null
  const summary = rawCsv
    ? parseUsageCsv(rawCsv, models)
    : isObject(body) && isObject(body.summary)
      ? body.summary as unknown as UsageImportSummary
      : emptyUsageSummary(['Missing usage CSV or summary'])
  const trustGate = validateUsageIngress(rawCsv ? {
    ingressKind: 'csv',
    source: isObject(body) && typeof body.source === 'string' ? body.source : 'usage_import_api',
    rawCsv,
    fileName: isObject(body) && typeof body.fileName === 'string' ? body.fileName : undefined,
    fileSizeBytes: isObject(body) && typeof body.fileSizeBytes === 'number' ? body.fileSizeBytes : undefined,
    workspaceId,
  } : {
    ingressKind: 'summary',
    source: isObject(body) && typeof body.source === 'string' ? body.source : 'usage_import_api',
    summary,
  })
  if (!trustGate.allowedForSnapshot) {
    return {
      status: 422,
      body: {
        ...base,
        persistence: store.persistence,
        summary,
        snapshotAllowed: false,
        trustGate: trustGate.decision,
        blockedReason: trustGate.blockedReason,
        error: 'trust_pipeline_blocked',
      },
    }
  }
  const importedAt = (context.now?.() ?? new Date()).toISOString()
  const period = importedAt.slice(0, 7)
  const snapshotRef = `usage:p1:${workspaceId}:${period}`
  const usageEntry = { snapshotRef, requestCount: summary.requestCount, importedAt }

  try {
    const historyKey = workspaceKey(workspaceId, 'usage-history')
    const existingHistory = await store.getJson<typeof usageEntry[]>(historyKey) ?? []
    const history = [usageEntry, ...existingHistory]
    await store.setJson(workspaceKey(workspaceId, 'usage-current'), summary)
    await store.setJson(historyKey, history)
    if (trustGate.retentionJobRequired && trustGate.inspection) {
      const warnings = trustGate.inspection.warnings
      const plan = buildRetentionAutomationPlan({
        workspaceId,
        hasRawUpload: rawCsv !== null,
        hasRawPrompt: warnings.includes('raw_prompt_detected'),
        hasApiKey: warnings.includes('api_key_candidate_detected'),
        hasPii: warnings.includes('pii_candidate_detected'),
      })
      await store.setJson(workspaceKey(workspaceId, 'retention-jobs'), plan.jobs)
    }
    return {
      status: 202,
      body: {
        persistence: store.persistence,
        summary,
        snapshotRef,
        snapshotAllowed: true,
        trustGate: trustGate.decision,
        history,
      },
    }
  } catch (error) {
    if (isStorageNotConfigured(error)) return storageErrorBody({ ...base, summary })
    return { status: 500, body: { ...base, summary, error: 'usage_import_failed' } }
  }
}

export async function handleSdkLiteUsageApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<SdkLiteUsageApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base: SdkLiteUsageApiResponse = {
    persistence: 'not_configured',
    snapshotAllowed: false,
    eventRef: null,
    normalized: null,
    history: [],
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'POST') return { status: 405, body: { ...base, error: 'Method not allowed' } }
  if (!isObject(body) || !isP1UsageAdapterSource(body.source) || !isObject(body.event)) {
    return { status: 400, body: { ...base, error: 'invalid_sdk_lite_event' } }
  }

  const normalized = normalizeSdkLiteUsageEvent({
    source: body.source,
    event: body.event as unknown as P1SdkLiteUsageEvent,
  })
  const store = contextStore(context)
  const requestId = normalized.normalizedEvent.request_id || new Date().getTime().toString(36)
  const eventRef = `sdk:p1:${workspaceId}:${requestId}`

  if (!normalized.snapshotAllowed) {
    return {
      status: 422,
      body: {
        ...base,
        persistence: store.persistence,
        normalized,
        error: 'trust_pipeline_blocked',
      },
    }
  }

  try {
    const historyKey = workspaceKey(workspaceId, 'sdk-lite-usage-history')
    const ingestedAt = (context.now?.() ?? new Date()).toISOString()
    const existing = await store.getJson<Array<{ eventRef: string; ingestedAt: string }>>(historyKey) ?? []
    const history = [{ eventRef, ingestedAt }, ...existing]
    await store.setJson(workspaceKey(workspaceId, `sdk-lite:${requestId}`), normalized)
    await store.setJson(historyKey, history)

    return {
      status: 202,
      body: {
        persistence: store.persistence,
        snapshotAllowed: true,
        eventRef,
        normalized,
        history,
      },
    }
  } catch (error) {
    if (isStorageNotConfigured(error)) return storageErrorBody({ ...base, normalized, snapshotAllowed: true, eventRef })
    return { status: 500, body: { ...base, normalized, eventRef, error: 'sdk_lite_ingestion_failed' } }
  }
}

function ragCollections(value: unknown) {
  const input = isObject(value) ? value : {}
  const collections = ['official_docs', 'benchmark_evidence', 'decision_history'].reduce<Record<P1VectorRagKind, Array<{ id: string; text: string; sourceUrl?: string }>>>((result, kind) => {
    const records = input[kind]
    result[kind as P1VectorRagKind] = Array.isArray(records)
      ? records.filter(isObject).map(record => ({
        id: typeof record.id === 'string' ? record.id : '',
        text: typeof record.text === 'string' ? record.text : '',
        sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl : undefined,
      })).filter(record => record.id && record.text)
      : []
    return result
  }, {
    official_docs: [],
    benchmark_evidence: [],
    decision_history: [],
  })
  return collections
}

function isApiDocChunk(value: unknown): value is ApiDocChunk {
  return isObject(value)
    && isRagCollection(value.collection)
    && typeof value.id === 'string'
    && typeof value.text === 'string'
    && typeof value.sourceUrl === 'string'
    && Array.isArray(value.refs)
    && isObject(value.metadata)
    && typeof value.metadata.sourceId === 'string'
    && Array.isArray(value.metadata.headingPath)
    && typeof value.metadata.sectionType === 'string'
}

function apiDocChunks(value: unknown): ApiDocChunk[] {
  return Array.isArray(value) ? value.filter(isApiDocChunk) : []
}

function uniqueApiDocChunks(chunks: ApiDocChunk[]): ApiDocChunk[] {
  const byId = new Map<string, ApiDocChunk>()
  for (const chunk of chunks) byId.set(chunk.id, chunk)
  return Array.from(byId.values()).sort((left, right) => left.id.localeCompare(right.id))
}

function createProductionVectorStore(context: P1ApiContext, workspaceId: string, collection: RagCollection): VectorStore | null {
  const env = contextEnv(context)
  const client = contextSupabaseClient(context)
  const embeddingProvider = createOpenAiEmbeddingProviderFromEnv(env, context.fetcher)
  if (!client || !embeddingProvider) return null
  return new SupabasePersistentVectorStore({
    client,
    workspaceId,
    collection,
    embeddingProvider,
  })
}

function officialDocsProductionVectorStore(context: P1ApiContext, workspaceId: string): VectorStore | null {
  return createProductionVectorStore(context, workspaceId, 'official_docs')
}

async function officialDocsVectorStats(chunks: ApiDocChunk[]): Promise<VectorStoreStats> {
  const vectorStore = createMemoryVectorStore({
    collection: 'official_docs',
    embeddingProvider: createHashEmbeddingProvider(),
  })
  await vectorStore.upsertChunks(chunks)
  return vectorStore.stats()
}

function corpusCollections(value: unknown): CorpusCollectionsInput {
  const input = isObject(value) ? value : {}
  return CORPUS_IDS.reduce<CorpusCollectionsInput>((result, corpusId) => {
    const records = input[corpusId]
    if (Array.isArray(records)) {
      result[corpusId] = records.filter(isCorpusChunk)
    }
    return result
  }, {})
}

function hasCorpusCollections(collections: CorpusCollectionsInput): boolean {
  return CORPUS_IDS.some(corpusId => (collections[corpusId]?.length ?? 0) > 0)
}

function applyCorpusEvidenceToLegacyP1(input: {
  evidence: P1VectorRagEvidenceResult
  corpusEvidence: CorpusEvidenceResult
  structuredFactRefs: string[]
}) {
  const apply = (corpusId: CorpusId, p1Kind: P1VectorRagKind, legacyKind: P1RagEvidenceResult['kind']) => {
    const result = input.corpusEvidence.results[corpusId]
    if (!result.found && result.warnings.length === 0) return
    input.evidence.results[p1Kind] = {
      kind: legacyKind,
      found: result.found,
      refs: [
        ...result.refs,
        ...(p1Kind === 'official_docs' ? input.structuredFactRefs : []),
      ],
      mayOverrideFacts: false,
      records: p1RecordsFromCorpusEvidence(input.corpusEvidence, corpusId),
      scores: result.scores,
      warnings: result.warnings,
    }
  }

  apply('official_source', 'official_docs', 'official_docs')
  apply('model_benchmark', 'benchmark_evidence', 'benchmark')
  apply('decision_history', 'decision_history', 'decision_history')
  input.evidence.warnings = Array.from(new Set(Object.values(input.evidence.results).flatMap(result => result.warnings)))
}

async function retrieveOfficialDocsVectorEvidence(input: {
  query: string
  chunks: ApiDocChunk[]
  structuredFactRefs: string[]
  topK?: number
}): Promise<{
  evidence: P1RagEvidenceResult
  contextBlocks: RagContextBlock[]
}> {
  const embeddingProvider = createHashEmbeddingProvider()
  const index = await buildVectorIndex({
    collection: 'official_docs',
    chunks: input.chunks,
    embeddingProvider,
  })
  const results = await searchVectorIndex({
    index,
    query: input.query,
    topK: input.topK,
    embeddingProvider,
    filter: { officialSourceTrust: 'official_pricing' },
  })
  return officialDocsEvidenceFromResults({
    results,
    structuredFactRefs: input.structuredFactRefs,
    topK: input.topK,
  })
}

function officialDocsEvidenceFromResults(input: {
  results: VectorSearchResult[]
  structuredFactRefs: string[]
  topK?: number
}): {
  evidence: P1RagEvidenceResult
  contextBlocks: RagContextBlock[]
} {
  const records = input.results.map(result => ({
    id: result.chunk.id,
    text: result.chunk.text,
    sourceUrl: result.chunk.sourceUrl,
  }))
  const refs = Array.from(new Set([
    ...input.results.flatMap(result => result.chunk.refs),
    ...input.structuredFactRefs,
  ]))

  return {
    evidence: {
      kind: 'official_docs',
      found: records.length > 0,
      refs,
      mayOverrideFacts: false,
      records,
      scores: input.results.map(result => result.score),
      warnings: records.length > 0 ? [] : ['official_docs_unavailable'],
    },
    contextBlocks: buildRagContextBlocks(input.results, {
      maxChunks: input.topK ?? 5,
      maxCharsPerChunk: 1600,
    }),
  }
}

function legacyKindFromCollection(collection: P1VectorRagKind): P1RagEvidenceResult['kind'] {
  return collection === 'benchmark_evidence' ? 'benchmark' : collection
}

function evidenceFromVectorResults(input: {
  collection: P1VectorRagKind
  results: VectorSearchResult[]
  structuredFactRefs: string[]
}): P1RagEvidenceResult {
  const records = input.results.map(result => ({
    id: result.chunk.id,
    text: result.chunk.text,
    sourceUrl: result.chunk.sourceUrl,
    refs: result.chunk.refs,
  }))
  const metadataWarnings = input.results
    .map(result => reviewStatusFromMetadata((result.chunk.metadata as { reviewStatus?: unknown }).reviewStatus))
    .filter((status): status is SupabaseFactReviewStatus => Boolean(status))
    .filter(status => status === 'needs_review' || status === 'rejected' || status === 'superseded')
  const refs = Array.from(new Set([
    ...input.results.flatMap(result => result.chunk.refs),
    ...(input.collection === 'official_docs' ? input.structuredFactRefs : []),
  ]))
  const unavailableWarning = input.collection === 'official_docs'
    ? 'official_docs_unavailable'
    : input.collection === 'benchmark_evidence'
      ? 'baseline_unavailable'
      : null
  const warnings = Array.from(new Set([
    ...(records.length === 0 && unavailableWarning ? [unavailableWarning] : []),
    ...metadataWarnings,
  ]))

  return {
    kind: legacyKindFromCollection(input.collection),
    found: records.length > 0,
    refs,
    mayOverrideFacts: false,
    records,
    scores: input.results.map(result => result.score),
    warnings,
  }
}

async function retrieveProductionVectorEvidence(input: {
  query: string
  context: P1ApiContext
  workspaceId: string
  structuredFactRefs: string[]
  topK?: number
}): Promise<{
  evidence: Partial<Record<P1VectorRagKind, P1RagEvidenceResult>>
  contextBlocks: RagContextBlock[]
}> {
  const evidence: Partial<Record<P1VectorRagKind, P1RagEvidenceResult>> = {}
  const contextBlocks: RagContextBlock[] = []
  for (const collection of RAG_COLLECTIONS) {
    const store = createProductionVectorStore(input.context, input.workspaceId, collection)
    if (!store) continue
    const results = await store.search({
      query: input.query,
      topK: input.topK,
      filter: collection === 'official_docs' ? { officialSourceTrust: 'official_pricing' } : undefined,
    })
    contextBlocks.push(...buildRagContextBlocks(results, {
      maxChunks: input.topK ?? 5,
      maxCharsPerChunk: 1600,
    }))
    if (collection === 'official_docs' || collection === 'benchmark_evidence' || collection === 'decision_history') {
      evidence[collection] = evidenceFromVectorResults({
        collection,
        results,
        structuredFactRefs: input.structuredFactRefs,
      })
    }
  }
  return { evidence, contextBlocks }
}

function coerceExternalActions(value: unknown): P1ExternalAction[] {
  return Array.isArray(value)
    ? value.filter((item): item is P1ExternalAction => (
      isObject(item)
      && typeof item.id === 'string'
      && typeof item.workspaceId === 'string'
      && isP1ExternalActionKind(item.kind)
      && typeof item.title === 'string'
    ))
    : []
}

function coerceExternalActionLedger(value: unknown): P1ExternalActionLedgerEntry[] {
  return Array.isArray(value)
    ? value.filter((item): item is P1ExternalActionLedgerEntry => (
      isObject(item)
      && typeof item.id === 'string'
      && typeof item.actionId === 'string'
      && isP1ExternalActionKind(item.kind)
    ))
    : []
}

function externalActionStatus(value: unknown): P1ExternalAction['status'] {
  return value === 'approved' || value === 'rejected' || value === 'executed' ? value : 'draft'
}

async function listSupabaseExternalActions(input: {
  client: ReturnType<typeof contextSupabaseClient>
  workspaceId: string
}): Promise<{ actions: P1ExternalAction[]; ledger: P1ExternalActionLedgerEntry[] }> {
  if (!input.client) return { actions: [], ledger: [] }
  const [actionRows, ledgerRows] = await Promise.all([
    input.client.select<Record<string, unknown>>('external_actions', {
      workspace_id: `eq.${input.workspaceId}`,
      select: '*',
      order: 'created_at.desc',
    }),
    input.client.select<Record<string, unknown>>('external_action_ledger', {
      workspace_id: `eq.${input.workspaceId}`,
      select: '*',
      order: 'executed_at.desc',
    }),
  ])
  const actions = actionRows
    .filter(row => typeof row.id === 'string' && isP1ExternalActionKind(row.kind))
    .map(row => {
      const payload = isObject(row.payload) ? row.payload : {}
      const rollbackMetadata = isObject(row.rollback_metadata) ? row.rollback_metadata : {}
      const approval = isObject(row.approval) ? row.approval : null
      return {
        id: String(row.id),
        workspaceId: String(row.workspace_id ?? input.workspaceId),
        kind: row.kind as P1ExternalActionKind,
        title: typeof payload.title === 'string' ? payload.title : String(row.id),
        status: externalActionStatus(row.status),
        requiresHumanApproval: true as const,
        payload,
        sourceRefs: stringArray(payload.sourceRefs),
        rollbackRef: typeof rollbackMetadata.rollbackRef === 'string'
          ? rollbackMetadata.rollbackRef
          : typeof payload.rollbackRef === 'string'
            ? payload.rollbackRef
            : undefined,
        createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
        approval: approval
          && typeof approval.approver === 'string'
          && typeof approval.reason === 'string'
          ? {
            approver: approval.approver,
            reason: approval.reason,
            decidedAt: typeof approval.decidedAt === 'string' ? approval.decidedAt : '',
          }
          : undefined,
      }
    })
  const ledger = ledgerRows
    .filter(row => typeof row.id === 'string' && isP1ExternalConnectorId(row.connector_id) && externalConnectorMode(row.connector_mode))
    .map(row => {
      const payload = isObject(row.ledger_payload) ? row.ledger_payload : {}
      return {
        id: String(row.id),
        workspaceId: String(row.workspace_id ?? input.workspaceId),
        actionId: String(row.action_id ?? ''),
        kind: isP1ExternalActionKind(payload.kind) ? payload.kind : 'billing_change',
        status: 'ledgered' as const,
        connectorMode: externalConnectorMode(row.connector_mode) as P1ExternalConnectorMode,
        connectorId: row.connector_id as P1ExternalConnectorId,
        idempotencyKey: String(row.idempotency_key ?? ''),
        externalRef: typeof row.external_ref === 'string' ? row.external_ref : undefined,
        rollbackMetadata: isObject(row.rollback_metadata) ? row.rollback_metadata : {},
        sourceRefs: stringArray(payload.sourceRefs),
        approvedBy: typeof payload.approvedBy === 'string' ? payload.approvedBy : 'unknown',
        approvedAt: typeof payload.approvedAt === 'string' ? payload.approvedAt : '',
        executedAt: typeof row.executed_at === 'string' ? row.executed_at : new Date().toISOString(),
      }
    })
  return { actions, ledger }
}

function externalActionResponse(input: Partial<P1ExternalActionsApiResponse> = {}): P1ExternalActionsApiResponse {
  return {
    persistence: input.persistence ?? 'not_configured',
    actions: input.actions ?? [],
    ledger: input.ledger ?? [],
    action: input.action ?? null,
    execution: input.execution ?? null,
    error: input.error,
  }
}

export async function handleP1RagEvidenceApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<P1RagEvidenceApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base: P1RagEvidenceApiResponse = {
    persistence: 'not_configured',
    runtimeStatus: 'unavailable',
    evidence: emptyRagEvidence(),
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'POST' && method !== 'GET') return { status: 405, body: { ...base, error: 'Method not allowed' } }
  const requestBody = isObject(body) ? body : {}
  const ragQuery = typeof requestBody.query === 'string'
    ? requestBody.query
    : queryValue(context.query ?? {}, 'query')
  const topK = typeof requestBody.topK === 'number'
    ? requestBody.topK
    : Number(queryValue(context.query ?? {}, 'topK'))
  const normalizedTopK = Number.isFinite(topK) && topK > 0 ? topK : undefined
  if (!ragQuery) {
    return { status: 400, body: { ...base, error: 'invalid_rag_query' } }
  }

  const structuredFactRefs = stringArray(requestBody.structuredFactRefs)
  const store = contextStore(context)
  const productionVectorStore = officialDocsProductionVectorStore(context, workspaceId)
  const previewRagFallback = requestBody.runtimeMode === 'preview'
  if (!productionVectorStore && store.persistence !== 'kv' && !previewRagFallback) {
    return { status: 503, body: { ...base, error: 'storage_not_configured' } }
  }
  const evidence = retrieveP1VectorRagEvidence({
    query: ragQuery,
    collections: ragCollections(requestBody.collections),
    structuredFactRefs,
    topK: normalizedTopK,
  })
  const parsedCorpusCollections = corpusCollections(requestBody.corpusCollections)
  const corpusEvidence = hasCorpusCollections(parsedCorpusCollections)
    ? retrieveCorpusEvidence({
        query: ragQuery,
        agentId: typeof requestBody.agentId === 'string' ? requestBody.agentId : undefined,
        collections: parsedCorpusCollections,
        topK: normalizedTopK,
      })
    : undefined
  if (corpusEvidence) {
    applyCorpusEvidenceToLegacyP1({ evidence, corpusEvidence, structuredFactRefs })
  }
  const storedOfficialDocChunks = !productionVectorStore && store.persistence === 'kv'
    ? apiDocChunks(await store.getJson<unknown[]>(ragIndexKey(workspaceId)))
    : []
  let contextBlocks: RagContextBlock[] = []
  if (productionVectorStore) {
    const productionEvidence = await retrieveProductionVectorEvidence({
      query: ragQuery,
      context,
      workspaceId,
      structuredFactRefs,
      topK: normalizedTopK,
    })
    for (const collection of ['official_docs', 'benchmark_evidence', 'decision_history'] as const) {
      if (productionEvidence.evidence[collection]) {
        evidence.results[collection] = productionEvidence.evidence[collection]
      }
    }
    evidence.warnings = Array.from(new Set(Object.values(evidence.results).flatMap(result => result.warnings)))
    contextBlocks = productionEvidence.contextBlocks
  } else {
    const requestOfficialDocChunks = apiDocChunks(requestBody.officialDocChunks)
    if (store.persistence !== 'kv' && !previewRagFallback && requestOfficialDocChunks.length > 0) {
      return { status: 503, body: { ...base, error: 'storage_not_configured' } }
    }
    const officialDocChunks = storedOfficialDocChunks.length > 0
      ? storedOfficialDocChunks
      : requestOfficialDocChunks
    if (officialDocChunks.length > 0) {
      const officialDocs = await retrieveOfficialDocsVectorEvidence({
        query: ragQuery,
        chunks: officialDocChunks,
        structuredFactRefs,
        topK: normalizedTopK,
      })
      evidence.results.official_docs = officialDocs.evidence
      evidence.warnings = Array.from(new Set(Object.values(evidence.results).flatMap(result => result.warnings)))
      contextBlocks = officialDocs.contextBlocks
    }
  }

  if (store.persistence === 'kv') {
    await store.setJson(workspaceKey(workspaceId, 'p1-rag-last-query'), {
      query: ragQuery,
      refs: Array.from(new Set([
        ...Object.values(evidence.results).flatMap(result => result.refs),
        ...(corpusEvidence ? Object.values(corpusEvidence.results).flatMap(result => result.refs) : []),
      ])),
      retrievedAt: new Date().toISOString(),
    })
  }

  return {
    status: 200,
    body: {
      persistence: productionVectorStore ? 'supabase' : store.persistence,
      runtimeStatus: productionVectorStore ? 'provider_llm' : 'deterministic_preview',
      evidence,
      corpusEvidence,
      contextBlocks,
      metadata: { workspaceId, query: ragQuery },
    },
  }
}

export async function handleRagIndexApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<RagIndexApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const collection = isObject(body) && isRagCollection(body.collection)
    ? body.collection
    : isRagCollection(queryValue(context.query ?? {}, 'collection'))
      ? queryValue(context.query ?? {}, 'collection') as RagCollection
      : 'official_docs'
  const emptyStats: VectorStoreStats = { collection, dimensions: 64, itemCount: 0 }
  const base: RagIndexApiResponse = {
    persistence: 'not_configured',
    indexedCount: 0,
    stats: emptyStats,
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'POST' && method !== 'GET') {
    return { status: 405, body: { ...base, error: 'Method not allowed' } }
  }

  const store = contextStore(context)
  const productionVectorStore = createProductionVectorStore(context, workspaceId, collection)
  if (productionVectorStore) {
    try {
      if (method === 'GET') {
        const stats = await productionVectorStore.stats()
        return {
          status: 200,
          body: {
            persistence: 'supabase',
            indexedCount: stats.itemCount,
            stats,
          },
        }
      }

      if (!isObject(body)) return { status: 400, body: { ...base, persistence: 'supabase', error: 'invalid_rag_index_request' } }
      const chunks = apiDocChunks(body.chunks).map(chunk => ({ ...chunk, collection }))
      if (chunks.length === 0) {
        return { status: 400, body: { ...base, persistence: 'supabase', error: 'invalid_rag_chunks' } }
      }
      await productionVectorStore.upsertChunks(uniqueApiDocChunks(chunks))
      const stats = await productionVectorStore.stats()
      return {
        status: 202,
        body: {
          persistence: 'supabase',
          indexedCount: chunks.length,
          stats,
        },
      }
    } catch {
      return { status: 500, body: { ...base, persistence: 'supabase', error: 'rag_index_failed' } }
    }
  }

  if (store.persistence !== 'kv') {
    return { status: 503, body: { ...base, error: 'storage_not_configured' } }
  }

  try {
    const key = ragIndexKey(workspaceId)
    const existing = apiDocChunks(await store.getJson<unknown[]>(key))
    if (method === 'GET') {
      return {
        status: 200,
        body: {
          persistence: store.persistence,
          indexedCount: existing.length,
          stats: await officialDocsVectorStats(existing),
        },
      }
    }

    if (!isObject(body)) return { status: 400, body: { ...base, persistence: store.persistence, error: 'invalid_rag_index_request' } }
    const chunks = apiDocChunks(body.chunks).map(chunk => ({ ...chunk, collection }))
    if (chunks.length === 0) {
      return { status: 400, body: { ...base, persistence: store.persistence, error: 'invalid_rag_chunks' } }
    }
    const indexedChunks = uniqueApiDocChunks([...existing, ...chunks])
    await store.setJson(key, indexedChunks)
    return {
      status: 202,
      body: {
        persistence: store.persistence,
        indexedCount: chunks.length,
        stats: await officialDocsVectorStats(indexedChunks),
      },
    }
  } catch (error) {
    if (isStorageNotConfigured(error)) {
      return { status: 503, body: { ...base, error: 'storage_not_configured' } }
    }
    return { status: 500, body: { ...base, persistence: store.persistence, error: 'rag_index_failed' } }
  }
}

export async function handleOfficialUpdatesApi(
  method: string,
  _body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<OfficialUpdatesApiResponse>> {
  const workspaceId = normalizedWorkspaceId(_body, context.query)
  const emptyInbox = buildOfficialUpdatesReviewInbox({
    candidates: [],
    snippets: [],
    sourceChangedCount: 0,
  })
  const base: OfficialUpdatesApiResponse = {
    persistence: 'not_configured',
    inbox: emptyInbox,
    latestRun: null,
    acceptedFacts: [],
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'GET' && method !== 'POST') return { status: 405, body: { ...base, error: 'Method not allowed' } }

  const client = contextSupabaseClient(context)
  if (!client) return { status: 503, body: { ...base, error: 'storage_not_configured' } }

  try {
    const store = new SupabaseWatchtowerStore(client)
    if (method === 'POST') {
      if (!isObject(_body)) return { status: 400, body: { ...base, persistence: 'supabase', error: 'invalid_review_request' } }
      if (typeof _body.candidateId !== 'string' || !_body.candidateId.trim()) {
        return { status: 400, body: { ...base, persistence: 'supabase', error: 'candidate_id_required' } }
      }
      if (!isFactReviewAction(_body.action)) {
        return { status: 400, body: { ...base, persistence: 'supabase', error: 'invalid_review_action' } }
      }
      if (typeof _body.reviewer !== 'string' || !_body.reviewer.trim()) {
        return { status: 400, body: { ...base, persistence: 'supabase', error: 'reviewer_required' } }
      }
      if (typeof _body.reason !== 'string' || !_body.reason.trim()) {
        return { status: 400, body: { ...base, persistence: 'supabase', error: 'review_reason_required' } }
      }
      const confidence = _body.confidence === 'medium' || _body.confidence === 'low' || _body.confidence === 'high'
        ? _body.confidence
        : undefined
      const review = await store.reviewCandidate({
        workspaceId,
        candidateId: _body.candidateId,
        action: _body.action,
        reviewer: _body.reviewer,
        reason: _body.reason,
        confidence,
        factPayload: isObject(_body.factPayload) ? _body.factPayload : undefined,
      })
      return {
        status: 202,
        body: {
          persistence: 'supabase',
          inbox: emptyInbox,
          latestRun: null,
          acceptedFacts: review.acceptedFact ? [review.acceptedFact] : [],
          reviewCandidate: review.candidate,
          reviewEvent: review.event,
          acceptedFact: review.acceptedFact,
        },
      }
    }

    const [latestRun, acceptedFacts] = await Promise.all([
      store.latestRun(workspaceId),
      store.acceptedFacts(workspaceId),
    ])
    const parserSummary = latestRun?.parserSummary ?? {}
    const snippets = Array.isArray(parserSummary.snippets)
      ? parserSummary.snippets as OfficialSourceSnippet[]
      : []
    const sourceChangedCount = typeof parserSummary.sourceChangedCount === 'number'
      ? parserSummary.sourceChangedCount
      : snippets.length
    return {
      status: 200,
      body: {
        persistence: 'supabase',
        latestRun,
        acceptedFacts,
        inbox: buildOfficialUpdatesReviewInbox({
          candidates: latestRun?.candidates as ModelReleaseCandidate[] ?? [],
          snippets,
          sourceChangedCount,
        }),
      },
    }
  } catch {
    return { status: 500, body: { ...base, error: 'official_updates_failed' } }
  }
}

export async function handleP1ExternalActionsApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<P1ExternalActionsApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base = externalActionResponse()
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }

  const store = contextStore(context)
  const supabaseClient = contextSupabaseClient(context)
  const actionsKey = workspaceKey(workspaceId, 'p1-external-actions')
  const ledgerKey = workspaceKey(workspaceId, 'p1-external-action-ledger')

  try {
    if (supabaseClient && method === 'GET') {
      const { actions, ledger } = await listSupabaseExternalActions({ client: supabaseClient, workspaceId })
      return { status: 200, body: externalActionResponse({ persistence: 'supabase', actions, ledger }) }
    }

    const actions = coerceExternalActions(await store.getJson<unknown[]>(actionsKey))
    const ledger = coerceExternalActionLedger(await store.getJson<unknown[]>(ledgerKey))

    if (method === 'GET') {
      return { status: 200, body: externalActionResponse({ persistence: store.persistence, actions, ledger }) }
    }

    if (method !== 'POST') {
      return { status: 405, body: externalActionResponse({ persistence: store.persistence, actions, ledger, error: 'Method not allowed' }) }
    }
    if (!isObject(body) || typeof body.action !== 'string') {
      return { status: 400, body: externalActionResponse({ persistence: store.persistence, actions, ledger, error: 'invalid_external_action_request' }) }
    }

    if (body.action === 'draft') {
      if (!isP1ExternalActionKind(body.kind) || typeof body.title !== 'string' || !isObject(body.payload)) {
        return { status: 400, body: externalActionResponse({ persistence: store.persistence, actions, ledger, error: 'invalid_external_action_draft' }) }
      }
      const draft = buildExternalActionDraft({
        workspaceId,
        kind: body.kind,
        title: body.title,
        payload: body.payload,
        sourceRefs: stringArray(body.sourceRefs),
        rollbackRef: typeof body.rollbackRef === 'string' ? body.rollbackRef : undefined,
        createdAt: (context.now?.() ?? new Date()).toISOString(),
      })
      const nextActions = [draft, ...actions.filter(action => action.id !== draft.id)]
      await store.setJson(actionsKey, nextActions)
      return { status: 202, body: externalActionResponse({ persistence: store.persistence, actions: nextActions, ledger, action: draft }) }
    }

    const actionId = typeof body.actionId === 'string' ? body.actionId : ''
    const existing = actions.find(action => action.id === actionId)
    if (!existing) {
      return { status: 404, body: externalActionResponse({ persistence: store.persistence, actions, ledger, error: 'external_action_not_found' }) }
    }

    if (body.action === 'approve') {
      const approved = approveExternalAction({
        action: existing,
        approver: typeof body.approver === 'string' ? body.approver : 'workspace_admin',
        reason: typeof body.reason === 'string' ? body.reason : 'Approved in workspace admin.',
        decidedAt: (context.now?.() ?? new Date()).toISOString(),
      })
      const nextActions = actions.map(action => action.id === approved.id ? approved : action)
      await store.setJson(actionsKey, nextActions)
      return { status: 202, body: externalActionResponse({ persistence: store.persistence, actions: nextActions, ledger, action: approved }) }
    }

    if (body.action === 'reject') {
      const rejected: P1ExternalAction = { ...existing, status: 'rejected' }
      const nextActions = actions.map(action => action.id === rejected.id ? rejected : action)
      await store.setJson(actionsKey, nextActions)
      return { status: 202, body: externalActionResponse({ persistence: store.persistence, actions: nextActions, ledger, action: rejected }) }
    }

    if (body.action === 'execute') {
      const connectorId = isP1ExternalConnectorId(body.connectorId) ? body.connectorId : undefined
      const env = contextEnv(context)
      const configuredFromEnv = connectorId === 'slack_webhook'
        ? Boolean(env.SLACK_WEBHOOK_URL)
        : connectorId === 'resend_email'
          ? Boolean(env.RESEND_API_KEY)
          : connectorId === 'stripe_billing'
            ? Boolean(env.STRIPE_SECRET_KEY)
            : connectorId === 'metronome'
              ? Boolean(env.METRONOME_API_KEY)
              : connectorId === 'data_room_export'
                ? Boolean(env.DATA_ROOM_EXPORT_URL)
              : false
      const connectorConfigured = typeof body.connectorConfigured === 'boolean'
        ? body.connectorConfigured
        : configuredFromEnv
      let execution = executeExternalAction({
        action: existing,
        connectorMode: externalConnectorMode(body.connectorMode),
        connectorConfig: connectorId ? { id: connectorId, configured: connectorConfigured } : undefined,
        idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        executedAt: (context.now?.() ?? new Date()).toISOString(),
      })
      if (execution.status === 'blocked') {
        return { status: 409, body: externalActionResponse({ persistence: store.persistence, actions, ledger, action: existing, execution }) }
      }
      if (execution.connectorMode === 'live' && execution.connectorId && execution.idempotencyKey) {
        const connector = EXTERNAL_CONNECTORS[execution.connectorId]
        if (!connector || !connector.validateConfig(env)) {
          return {
            status: 409,
            body: externalActionResponse({
              persistence: store.persistence,
              actions,
              ledger,
              action: existing,
              execution: { ...execution, status: 'blocked', error: 'connector_not_configured', ledgerEntry: null },
            }),
          }
        }
        try {
          const prepared = connector.prepare(existing, env)
          const connectorExecution = await connector.execute(prepared, {
            env,
            fetcher: context.fetcher ?? fetch,
            idempotencyKey: execution.idempotencyKey,
            mode: execution.connectorMode,
          })
          const rollbackMetadata = {
            ...(execution.rollbackMetadata ?? {}),
            ...connectorExecution.rollbackMetadata,
            rollbackPreview: connector.rollbackPreview(connectorExecution),
          }
          const ledgerEntry = execution.ledgerEntry
            ? {
                ...execution.ledgerEntry,
                externalRef: connectorExecution.externalRef,
                rollbackMetadata,
              }
            : null
          execution = {
            ...execution,
            externalRef: connectorExecution.externalRef,
            rollbackMetadata,
            ledgerEntry,
          }
        } catch {
          return { status: 502, body: externalActionResponse({ persistence: store.persistence, actions, ledger, action: existing, execution, error: 'connector_execution_failed' }) }
        }
      }
      const executed: P1ExternalAction = { ...existing, status: 'executed' }
      const nextActions = actions.map(action => action.id === executed.id ? executed : action)
      const nextLedger = execution.ledgerEntry ? [execution.ledgerEntry, ...ledger] : ledger
      await store.setJson(actionsKey, nextActions)
      await store.setJson(ledgerKey, nextLedger)
      return { status: 202, body: externalActionResponse({ persistence: store.persistence, actions: nextActions, ledger: nextLedger, action: executed, execution }) }
    }

    return { status: 400, body: externalActionResponse({ persistence: store.persistence, actions, ledger, error: 'unsupported_external_action_operation' }) }
  } catch (error) {
    if (isStorageNotConfigured(error)) return storageErrorBody(base)
    return { status: 500, body: { ...base, error: 'external_action_failed' } }
  }
}

export async function handleRetentionRunApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<RetentionRunApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const emptyResult = runRetentionJobs({ jobs: [], storedArtifactIds: [], executedAt: (context.now?.() ?? new Date()).toISOString() })
  const base: RetentionRunApiResponse = { persistence: 'not_configured', jobs: [], result: emptyResult }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  const store = contextStore(context)
  const supabaseClient = contextSupabaseClient(context)
  const jobsKey = workspaceKey(workspaceId, 'retention-jobs')

  try {
    if (supabaseClient) {
      const rowsToJobs = (rows: Array<Record<string, unknown>>): RetentionJob[] => rows.map(row => ({
        id: String(row.id),
        workspaceId: String(row.workspace_id),
        kind: row.kind === 'export_audit' ? 'export_audit' : 'delete_artifact',
        status: ['scheduled', 'not_needed', 'completed', 'blocked'].includes(String(row.status))
          ? row.status as RetentionJob['status']
          : 'blocked',
        artifactId: typeof row.artifact_id === 'string' ? row.artifact_id : undefined,
        scheduledFor: String(row.scheduled_for ?? new Date().toISOString()),
        completedAt: typeof row.completed_at === 'string' ? row.completed_at : undefined,
        auditExportRef: typeof row.audit_export_ref === 'string' ? row.audit_export_ref : undefined,
      }))
      if (method === 'GET') {
        const rows = await supabaseClient.select<Record<string, unknown>>('retention_jobs', {
          workspace_id: `eq.${workspaceId}`,
          select: '*',
          order: 'scheduled_for.desc',
        })
        return { status: 200, body: { persistence: 'supabase', jobs: rowsToJobs(rows), result: emptyResult } }
      }
      if (method !== 'POST') {
        return { status: 405, body: { ...base, persistence: 'supabase', error: 'Method not allowed' } }
      }
      const plan = buildRetentionAutomationPlan({
        workspaceId,
        hasRawUpload: isObject(body) && body.hasRawUpload === true,
        hasRawPrompt: isObject(body) && body.hasRawPrompt === true,
        hasApiKey: isObject(body) && body.hasApiKey === true,
        hasPii: isObject(body) && body.hasPii === true,
      })
      const result = runRetentionJobs({
        jobs: plan.jobs,
        storedArtifactIds: plan.storedArtifacts,
        executedAt: (context.now?.() ?? new Date()).toISOString(),
      })
      const jobs = [...result.completedJobs, ...result.blockedJobs, ...plan.jobs.filter(job => job.status !== 'scheduled')]
      await supabaseClient.upsert('retention_jobs', jobs.map(job => ({
        id: job.id,
        workspace_id: job.workspaceId,
        kind: job.kind,
        status: job.status,
        artifact_id: job.artifactId,
        scheduled_for: job.scheduledFor,
        completed_at: job.completedAt,
        audit_export_ref: job.auditExportRef,
        result_payload: {
          deletedArtifactIds: result.deletedArtifactIds,
          auditExportRefs: result.auditExportRefs,
        },
      })), 'id')
      const artifactStore = new SupabaseReportArtifactStore(supabaseClient)
      await Promise.all(result.deletedArtifactIds.map(artifactId => artifactStore.delete({ workspaceId, artifactId })))
      return { status: 202, body: { persistence: 'supabase', jobs, result } }
    }

    if (method === 'GET') {
      const jobs = await store.getJson<RetentionJob[]>(jobsKey) ?? []
      return { status: 200, body: { persistence: store.persistence, jobs, result: emptyResult } }
    }
    if (method !== 'POST') {
      return { status: 405, body: { ...base, persistence: store.persistence, error: 'Method not allowed' } }
    }
    const plan = buildRetentionAutomationPlan({
      workspaceId,
      hasRawUpload: isObject(body) && body.hasRawUpload === true,
      hasRawPrompt: isObject(body) && body.hasRawPrompt === true,
      hasApiKey: isObject(body) && body.hasApiKey === true,
      hasPii: isObject(body) && body.hasPii === true,
    })
    const result = runRetentionJobs({
      jobs: plan.jobs,
      storedArtifactIds: plan.storedArtifacts,
      executedAt: (context.now?.() ?? new Date()).toISOString(),
    })
    const jobs = [...result.completedJobs, ...result.blockedJobs, ...plan.jobs.filter(job => job.status !== 'scheduled')]
    await store.setJson(jobsKey, jobs)
    return { status: 202, body: { persistence: store.persistence, jobs, result } }
  } catch (error) {
    if (isStorageNotConfigured(error)) return { status: 503, body: { ...base, error: 'storage_not_configured' } }
    return { status: 500, body: { ...base, error: 'retention_run_failed' } }
  }
}

function failedShare(summary: UsageImportSummary): number {
  if (summary.rows.length === 0) return 0
  const failed = summary.rows.filter(row => ['failed', 'error', 'timeout', 'retry'].includes((row.status ?? '').toLowerCase())).length
  return Number((failed / summary.rows.length).toFixed(10))
}

function topAgentRunId(summary: UsageImportSummary): string | null {
  const counts = summary.rows.reduce<Map<string, number>>((map, row) => {
    if (!row.agentRunId) return map
    map.set(row.agentRunId, (map.get(row.agentRunId) ?? 0) + 1)
    return map
  }, new Map())
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function buildCalibration(summary: UsageImportSummary, agentSpecs: AgentSpec[]): TeamCostCalibrationResult {
  const activeDays = 30
  const actualCallsPerDay = Number((summary.requestCount / activeDays).toFixed(10))
  const bottleneckAgentId = topAgentRunId(summary) ?? agentSpecs[0]?.id ?? null
  const spec = agentSpecs.find(agent => agent.id === bottleneckAgentId) ?? agentSpecs[0] ?? null
  const model = spec ? MODELS.find(item => item.id === spec.modelId) ?? MODELS[0] : MODELS[0]
  const plannedMonthlyCalls = spec ? estimateAgentWorkload({ spec, model }).monthlyRequests : 0
  const plannedCallsPerDay = Number((plannedMonthlyCalls / activeDays).toFixed(10))
  const ratio = plannedCallsPerDay > 0 ? actualCallsPerDay / plannedCallsPerDay : 1
  const retryShare = failedShare(summary)
  const nextCallsPerRun = spec ? Math.max(spec.callsPerRun, Math.ceil(spec.callsPerRun * ratio)) : 0
  const nextCacheHitRate = spec ? Math.max(spec.cacheHitRate, retryShare >= 0.1 ? 0.6 : spec.cacheHitRate) : 0
  const nextReviewGate: HumanReviewGate = retryShare >= 0.1 ? 'all' : spec?.humanReviewGate ?? 'sample'

  return {
    plannedCallsPerDay,
    actualCallsPerDay,
    retryShare,
    bottleneckAgentId,
    bottleneckTask: spec?.assignedTasks[0] ?? summary.topFeatureByCost?.feature ?? 'unknown',
    suggestedAgentSpecPatch: {
      agentId: spec?.id ?? null,
      callsPerRun: nextCallsPerRun,
      cacheHitRate: nextCacheHitRate,
      humanReviewGate: nextReviewGate,
      modelId: spec?.modelId ?? null,
    },
  }
}

export async function handleTeamCostCalibrationApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<TeamCostCalibrationApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const empty = buildCalibration(emptyUsageSummary(), [])
  if (!workspaceId) return { status: 400, body: { persistence: 'not_configured', calibration: empty, error: 'workspaceId_required' } }
  if (method !== 'POST') return { status: 405, body: { persistence: 'not_configured', calibration: empty, error: 'Method not allowed' } }
  const store = contextStore(context)

  try {
    const summary = await store.getJson<UsageImportSummary>(workspaceKey(workspaceId, 'usage-current')) ?? emptyUsageSummary()
    const agentSpecs = isObject(body) && Array.isArray(body.agentSpecs) ? body.agentSpecs as AgentSpec[] : []
    const calibration = buildCalibration(summary, agentSpecs)
    await store.setJson(workspaceKey(workspaceId, 'calibration-current'), calibration)
    return { status: 200, body: { persistence: store.persistence, calibration } }
  } catch (error) {
    if (isStorageNotConfigured(error)) return { status: 503, body: { persistence: 'not_configured', calibration: empty, error: 'storage_not_configured' } }
    return { status: 500, body: { persistence: 'not_configured', calibration: empty, error: 'calibration_failed' } }
  }
}

export async function handleReportsApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<ReportApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const fallbackRun = emptyReportRun()
  if (!workspaceId) {
    return { status: 400, body: { persistence: 'not_configured', reportRun: fallbackRun, reportRuns: [], error: 'workspaceId_required' } }
  }
  const store = contextStore(context)
  const supabaseClient = contextSupabaseClient(context)
  const reportArtifactStore = supabaseClient ? new SupabaseReportArtifactStore(supabaseClient) : null
  const key = workspaceKey(workspaceId, 'reports')

  try {
    if (reportArtifactStore) {
      if (method === 'GET') {
        const artifacts = await reportArtifactStore.list({ workspaceId })
        const reportRuns = groupReportRuns(artifacts)
        return { status: 200, body: { persistence: 'supabase', reportRun: reportRuns[0] ?? emptyReportRun(undefined, [], 'supabase', null, null, workspaceId), reportRuns } }
      }

      if (method !== 'POST') {
        return { status: 405, body: { persistence: 'supabase', reportRun: fallbackRun, reportRuns: [], error: 'Method not allowed' } }
      }

      const period = isObject(body) && typeof body.period === 'string' ? body.period : fallbackRun.period
      const decisionIds = isObject(body) ? stringArray(body.decisionIds) : []
      const configSnapshotRef = isObject(body) && typeof body.configSnapshotRef === 'string' ? body.configSnapshotRef : null
      const usageSnapshotRef = isObject(body) && typeof body.usageSnapshotRef === 'string' ? body.usageSnapshotRef : null
      const reportRun = emptyReportRun(period, decisionIds, 'supabase', configSnapshotRef, usageSnapshotRef, workspaceId, reportFirstInputFromBody(body))
      await reportArtifactStore.saveMany(reportRun.artifacts)
      const reportRuns = [reportRun, ...groupReportRuns(await reportArtifactStore.list({ workspaceId })).filter(run => run.id !== reportRun.id)]
      return { status: 202, body: { persistence: 'supabase', reportRun, reportRuns } }
    }

    if (method === 'GET') {
      const reportRuns = await store.getJson<ReportRunShell[]>(key) ?? []
      return { status: 200, body: { persistence: store.persistence, reportRun: reportRuns[0] ?? fallbackRun, reportRuns } }
    }

    if (method !== 'POST') {
      return { status: 405, body: { persistence: 'not_configured', reportRun: fallbackRun, reportRuns: [], error: 'Method not allowed' } }
    }

    const period = isObject(body) && typeof body.period === 'string' ? body.period : fallbackRun.period
    const decisionIds = isObject(body) ? stringArray(body.decisionIds) : []
    const configSnapshotRef = isObject(body) && typeof body.configSnapshotRef === 'string' ? body.configSnapshotRef : null
    const usageSnapshotRef = isObject(body) && typeof body.usageSnapshotRef === 'string' ? body.usageSnapshotRef : null
    const reportRun = emptyReportRun(period, decisionIds, store.persistence, configSnapshotRef, usageSnapshotRef, workspaceId, reportFirstInputFromBody(body))
    const existing = await store.getJson<ReportRunShell[]>(key) ?? []
    const reportRuns = [reportRun, ...existing]
    await store.setJson(key, reportRuns)

    return { status: 202, body: { persistence: store.persistence, reportRun, reportRuns } }
  } catch (error) {
    if (isStorageNotConfigured(error)) {
      return { status: 503, body: { persistence: 'not_configured', reportRun: fallbackRun, reportRuns: [], error: 'storage_not_configured' } }
    }
    return { status: 500, body: { persistence: 'not_configured', reportRun: fallbackRun, reportRuns: [], error: 'report_persistence_failed' } }
  }
}

export async function handleReportDownloadApi(
  method: string,
  body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<ReportDownloadApiResponse>> {
  const workspaceId = normalizedWorkspaceId(body, context.query)
  const base: ReportDownloadApiResponse = { persistence: 'not_configured', artifact: null, content: '' }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'GET') return { status: 405, body: { ...base, error: 'Method not allowed' } }

  const reportId = queryValue(context.query ?? {}, 'reportId') ?? (isObject(body) && typeof body.reportId === 'string' ? body.reportId : '')
  const artifactId = queryValue(context.query ?? {}, 'artifactId') ?? (isObject(body) && typeof body.artifactId === 'string' ? body.artifactId : '')
  const store = contextStore(context)
  const supabaseClient = contextSupabaseClient(context)

  try {
    if (supabaseClient) {
      const artifact = await new SupabaseReportArtifactStore(supabaseClient).find({ workspaceId, artifactId })
      if (!artifact || (reportId && artifact.reportRunId !== reportId)) {
        return { status: 404, body: { ...base, persistence: 'supabase', error: 'report_artifact_not_found' } }
      }
      return { status: 200, body: { persistence: 'supabase', artifact, content: artifact.body } }
    }

    const reportRuns = await store.getJson<ReportRunShell[]>(workspaceKey(workspaceId, 'reports')) ?? []
    const reportRun = reportRuns.find(item => item.id === reportId)
    const artifact = reportRun?.artifacts.find(item => item.id === artifactId) ?? null
    if (!reportRun || !artifact) {
      return { status: 404, body: { ...base, persistence: store.persistence, error: 'report_artifact_not_found' } }
    }
    return { status: 200, body: { persistence: store.persistence, artifact, content: artifact.body } }
  } catch (error) {
    if (isStorageNotConfigured(error)) return { status: 503, body: { ...base, error: 'storage_not_configured' } }
    return { status: 500, body: { ...base, error: 'report_download_failed' } }
  }
}

export async function handleRiskCardsApi(
  method: string,
  _body?: unknown,
  query: Record<string, string | string[] | undefined> = {},
  context: P1ApiContext = {},
): Promise<ApiResult<RiskCardsApiResponse>> {
  if (method !== 'GET') {
    return {
      status: 405,
      body: { retrieval: 'deterministic-tag-corpus', cards: [], error: 'Method not allowed' },
    }
  }

  const rawTags = Array.isArray(query.tags) ? query.tags.join(',') : query.tags ?? ''
  const tags = rawTags.split(',').map(tag => tag.trim()).filter(Boolean)
  const workspaceId = normalizedWorkspaceId(undefined, query)
  const store = contextStore(context)
  const metadata = workspaceId
    ? { workspaceId, persistence: store.persistence, tags }
    : undefined

  if (workspaceId && store.persistence === 'kv') {
    await store.setJson(workspaceKey(workspaceId, 'rag-risk-card-metadata'), {
      tags,
      retrievedAt: new Date().toISOString(),
    })
  }

  return {
    status: 200,
    body: {
      retrieval: 'deterministic-tag-corpus',
      cards: retrieveRiskCards(tags),
      metadata,
    },
  }
}
