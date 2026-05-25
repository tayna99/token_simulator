import { runBrowserAgent } from '../features/agent/lib/agentRuntime'
import type { AgentEvent, AgentRuntimeInput } from '../features/agent/lib/agentRuntime'
import type { TeamCostRuntimeInput } from '../features/agent/lib/teamCostRuntime'
import { runTeamCostAgentWithLlm, type TeamCostLlmMode } from '../features/agent/lib/teamCostLlmRuntime'
import { retrieveRiskCards } from '../features/agent/lib/riskCards'
import type { RiskCard } from '../features/agent/lib/riskCards'
import type { TeamCostGraphEvent } from '../features/team-cost/lib/teamCostState'
import type { TeamCostCheckpoint } from '../features/agent/lib/checkpointStore'
import { MODELS, type Model } from '../features/alternatives/data/models'
import { parseUsageCsv, type UsageImportSummary } from '../features/usage/lib/usageImport'
import type { AgentSpec, HumanReviewGate } from '../features/team-cost/lib/agentSpec'
import { estimateAgentWorkload } from '../features/team-cost/lib/estimateAgentWorkload'
import { normalizeDecisionRecord, type Decision } from '../features/decision-log/lib/decisionLog'
import type { AITeamConfiguration } from '../features/team/lib/aiTeamConfiguration'
import {
  createKvStoreFromEnv,
  isStorageNotConfigured,
  type JsonKvStore,
} from './storage/kvStore'
import {
  normalizeSdkLiteUsageEvent,
  approveExternalAction,
  buildExternalActionDraft,
  executeExternalAction,
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
} from '../features/p1/lib/p1OperatingSystem'
import {
  buildRagContextBlocks,
  buildVectorIndex,
  createHashEmbeddingProvider,
  searchVectorIndex,
  type ApiDocChunk,
  type RagContextBlock,
} from '../features/rag/lib/apiDocRag'
import {
  buildOfficialUpdatesReviewInbox,
  INITIAL_MODEL_RELEASE_CANDIDATES,
  INITIAL_OFFICIAL_SOURCE_SNIPPETS,
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

type PersistenceState = 'kv' | 'not_configured'

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
  evidence: P1VectorRagEvidenceResult
  corpusEvidence?: CorpusEvidenceResult
  contextBlocks?: RagContextBlock[]
  metadata?: {
    workspaceId: string
    query: string
  }
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
  error?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
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

function checkpointFor(input: TeamCostRuntimeInput, persistence: PersistenceState): TeamCostCheckpoint {
  const threadId = input.threadId?.trim() || `thread-${new Date().toISOString().slice(0, 10)}`
  const status = input.approvalMode === 'interrupt'
    ? input.resumeApproval ? 'resumed' : 'interrupt_requested'
    : 'not_required'

  return {
    persistence,
    threadId,
    workspaceId: input.workspaceId,
    status,
    message: persistence === 'kv'
      ? 'Checkpoint persisted in Vercel KV for P1 interrupt/resume flow.'
      : 'Checkpoint persistence is not configured yet; P0 still uses browser events and local Decision Log export.',
  }
}

function emptyReportRun(
  period = new Date().toISOString().slice(0, 7),
  decisionIds: string[] = [],
  persistence: PersistenceState = 'not_configured',
  configSnapshotRef: string | null = null,
  usageSnapshotRef: string | null = null,
): ReportRunShell {
  return {
    id: `report-run-${period}`,
    period,
    decisionIds,
    persistence,
    createdAt: new Date().toISOString(),
    snapshotRefs: { decisionIds, configSnapshotRef, usageSnapshotRef },
  }
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
  const { events, llmMode } = await runTeamCostAgentWithLlm(input, {
    env: contextEnv(context),
    fetcher: context.fetcher,
  })
  const checkpoint = checkpointFor(input, store.persistence)

  if (store.persistence === 'kv' && input.workspaceId) {
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
  const key = workspaceKey(workspaceId, 'decisions')

  try {
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
    history: [],
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'POST') return { status: 405, body: { ...base, error: 'Method not allowed' } }

  const store = contextStore(context)
  const models = context.models ?? MODELS
  const summary = isObject(body) && typeof body.csv === 'string'
    ? parseUsageCsv(body.csv, models)
    : isObject(body) && isObject(body.summary)
      ? body.summary as unknown as UsageImportSummary
      : emptyUsageSummary(['Missing usage CSV or summary'])
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
    return { status: 202, body: { persistence: store.persistence, summary, snapshotRef, history } }
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
    && value.collection === 'official_docs'
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
  const records = results.map(result => ({
    id: result.chunk.id,
    text: result.chunk.text,
    sourceUrl: result.chunk.sourceUrl,
  }))
  const refs = Array.from(new Set([
    ...results.flatMap(result => result.chunk.refs),
    ...input.structuredFactRefs,
  ]))

  return {
    evidence: {
      kind: 'official_docs',
      found: records.length > 0,
      refs,
      mayOverrideFacts: false,
      records,
      scores: results.map(result => result.score),
      warnings: records.length > 0 ? [] : ['official_docs_unavailable'],
    },
    contextBlocks: buildRagContextBlocks(results, {
      maxChunks: input.topK ?? 5,
      maxCharsPerChunk: 1600,
    }),
  }
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
    evidence: emptyRagEvidence(),
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'POST') return { status: 405, body: { ...base, error: 'Method not allowed' } }
  if (!isObject(body) || typeof body.query !== 'string') {
    return { status: 400, body: { ...base, error: 'invalid_rag_query' } }
  }

  const structuredFactRefs = stringArray(body.structuredFactRefs)
  const evidence = retrieveP1VectorRagEvidence({
    query: body.query,
    collections: ragCollections(body.collections),
    structuredFactRefs,
    topK: typeof body.topK === 'number' ? body.topK : undefined,
  })
  const parsedCorpusCollections = corpusCollections(body.corpusCollections)
  const corpusEvidence = hasCorpusCollections(parsedCorpusCollections)
    ? retrieveCorpusEvidence({
        query: body.query,
        agentId: typeof body.agentId === 'string' ? body.agentId : undefined,
        collections: parsedCorpusCollections,
        topK: typeof body.topK === 'number' ? body.topK : undefined,
      })
    : undefined
  if (corpusEvidence) {
    applyCorpusEvidenceToLegacyP1({ evidence, corpusEvidence, structuredFactRefs })
  }
  let contextBlocks: RagContextBlock[] = []
  const officialDocChunks = apiDocChunks(body.officialDocChunks)
  if (officialDocChunks.length > 0) {
    const officialDocs = await retrieveOfficialDocsVectorEvidence({
      query: body.query,
      chunks: officialDocChunks,
      structuredFactRefs,
      topK: typeof body.topK === 'number' ? body.topK : undefined,
    })
    evidence.results.official_docs = officialDocs.evidence
    evidence.warnings = Array.from(new Set(Object.values(evidence.results).flatMap(result => result.warnings)))
    contextBlocks = officialDocs.contextBlocks
  }
  const store = contextStore(context)

  if (store.persistence === 'kv') {
    await store.setJson(workspaceKey(workspaceId, 'p1-rag-last-query'), {
      query: body.query,
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
      persistence: store.persistence,
      evidence,
      corpusEvidence,
      contextBlocks,
      metadata: { workspaceId, query: body.query },
    },
  }
}

export async function handleOfficialUpdatesApi(
  method: string,
  _body: unknown,
  context: P1ApiContext = {},
): Promise<ApiResult<OfficialUpdatesApiResponse>> {
  const workspaceId = normalizedWorkspaceId(_body, context.query)
  const inbox = buildOfficialUpdatesReviewInbox({
    candidates: INITIAL_MODEL_RELEASE_CANDIDATES,
    snippets: INITIAL_OFFICIAL_SOURCE_SNIPPETS,
    sourceChangedCount: INITIAL_OFFICIAL_SOURCE_SNIPPETS.length,
  })
  const base: OfficialUpdatesApiResponse = {
    persistence: contextStore(context).persistence,
    inbox,
  }
  if (!workspaceId) return { status: 400, body: { ...base, error: 'workspaceId_required' } }
  if (method !== 'GET') return { status: 405, body: { ...base, error: 'Method not allowed' } }
  return { status: 200, body: base }
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
  const actionsKey = workspaceKey(workspaceId, 'p1-external-actions')
  const ledgerKey = workspaceKey(workspaceId, 'p1-external-action-ledger')

  try {
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
              : false
      const connectorConfigured = typeof body.connectorConfigured === 'boolean'
        ? body.connectorConfigured
        : configuredFromEnv
      const execution = executeExternalAction({
        action: existing,
        connectorMode: externalConnectorMode(body.connectorMode),
        connectorConfig: connectorId ? { id: connectorId, configured: connectorConfigured } : undefined,
        idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        executedAt: (context.now?.() ?? new Date()).toISOString(),
      })
      if (execution.status === 'blocked') {
        return { status: 409, body: externalActionResponse({ persistence: store.persistence, actions, ledger, action: existing, execution }) }
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
  const key = workspaceKey(workspaceId, 'reports')

  try {
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
    const reportRun = emptyReportRun(period, decisionIds, store.persistence, configSnapshotRef, usageSnapshotRef)
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
