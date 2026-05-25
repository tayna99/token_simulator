import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import type { FrontOperatingSystemContext } from '../../front-operating/lib/frontOperatingContext'
import type { RagContextBlock } from '../../rag/lib/apiDocRag'

export type AgentRunMode = 'report' | 'ask' | 'decision_support'
export type AgentRunStage = 'design' | 'cost' | 'bottleneck' | 'optimize' | 'decision-log'
export type AgentRunLlmMode = 'deterministic-fallback' | 'provider-llm'
export type AgentRunRuntimeMode = 'local' | 'server'
export type AgentRunExecutionMode = 'stage_committee' | 'all_hands' | 'single_agent'
export type RuntimeCapabilityStatus = 'provider_llm' | 'deterministic_preview' | 'unavailable' | 'connector_not_configured'

const OPERATING_AGENT_IDS = [
  'provider_api_intelligence',
  'model_inference_research',
  'cost_modeling',
  'usage_data_ingestion',
  'cost_engine_qa',
  'optimization_routing',
  'customer_diagnostic_pricing',
  'pricing_revenue_ops',
  'trust_security_compliance',
  'finance_ops',
  'knowledge_release_ops',
]

const STAGE_AGENT_ROUTES: Record<AgentRunStage, string[]> = {
  design: ['usage_data_ingestion', 'provider_api_intelligence', 'cost_engine_qa'],
  cost: ['cost_modeling', 'cost_engine_qa', 'finance_ops'],
  bottleneck: ['customer_diagnostic_pricing', 'usage_data_ingestion', 'cost_engine_qa'],
  optimize: ['optimization_routing', 'model_inference_research', 'trust_security_compliance'],
  'decision-log': ['knowledge_release_ops', 'finance_ops', 'pricing_revenue_ops'],
}

export interface AgenticEvent {
  type: string
  message: string
  agentId?: string | null
  calledAgentTool?: string | null
  stance?: 'support' | 'caution' | 'block' | string
  toolResultRefs: string[]
  riskCardIds: string[]
  usedTools?: string[]
  usedCapabilityTools?: string[]
  reviewerAgentIds?: string[]
  evidenceRefs?: string[]
  evidenceWarnings?: string[]
  nextQuestion?: string
  basisRefs?: string[]
  assetRefs?: string[]
}

export interface AgentEvidenceCoverageItem {
  found: boolean
  refs: string[]
  records: unknown[]
  scores: number[]
  warnings: string[]
}

export interface AgentEvidenceCoverage {
  officialDocs: AgentEvidenceCoverageItem
  benchmarkEvidence: AgentEvidenceCoverageItem
  decisionHistory: AgentEvidenceCoverageItem
}

export interface AgentRunRuntimeProof {
  status: RuntimeCapabilityStatus
  providerRunId?: string
  agentInvocationProof?: string[]
  fallbackReason?: string
  startedAt: string
  completedAt: string
}

export interface AgentRunInput {
  apiKey?: string
  mode: AgentRunMode
  activeStage: AgentRunStage
  question: string
  requestedAgentId?: string | null
  executionMode?: AgentRunExecutionMode
  snapshotVersion?: string
  toolResults: Record<string, unknown>
  deterministicEvents: unknown[]
  thresholdPolicy: Record<string, unknown>
  metricFlags: unknown[]
  riskCards: unknown[]
  benchmarkCards: unknown[]
  decisionHistory: unknown[]
  factSources: unknown[]
  operatingAgents?: unknown[]
  operatingAssets?: unknown[]
  providerRegistry?: unknown[]
  modelPerfMatrix?: unknown[]
  operatingLedger?: unknown[]
  officialSourceRegistry?: unknown[]
  officialSourceSnippets?: unknown[]
  modelReleaseCandidates?: unknown[]
  pricingFactCandidates?: unknown[]
  fxRateSnapshots?: unknown[]
  ragCollections?: Partial<Record<'official_docs' | 'benchmark_evidence' | 'decision_history', unknown[]>>
  ragContextBlocks?: RagContextBlock[]
  trustInspection?: TrustInspectionResult | null
  formulaVersion?: string
  providerRegistryVersion?: string
  dataLimitations?: string[]
  frontOperatingSystem?: FrontOperatingSystemContext
}

export interface AgentRunResponse {
  events: AgenticEvent[]
  answer: string
  report: string
  llmMode: AgentRunLlmMode
  runtime: AgentRunRuntimeProof
  supervisorSummary: string
  disagreements: string[]
  decisionReadiness: 'ready' | 'needs_review' | 'blocked' | string
  nextQuestions: string[]
  calledAgentIds: string[]
  primaryAgentId: string | null
  reviewerAgentIds: string[]
  agentRoute: Record<string, unknown>
  snapshotVersion: string
  usedTools: string[]
  toolResultRefs: string[]
  riskCardIds: string[]
  decisionIds: string[]
  evidenceRefs: string[]
  evidenceCoverage: AgentEvidenceCoverage
  assetRefs: string[]
  warnings: string[]
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface AgentRunRuntimeOptions {
  runtime?: AgentRunRuntimeMode
  fetcher?: FetchLike
}

function runtimeFromEnv(): AgentRunRuntimeMode {
  return import.meta.env.VITE_AGENT_RUNTIME === 'local' ? 'local' : 'server'
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_AGENT_API_BASE_URL?.replace(/\/$/, '') ?? ''
  return `${base}${path}`
}

function toolRefsFrom(input: AgentRunInput): string[] {
  return Object.keys(input.toolResults).map(key => key.startsWith('tool:') ? key : `tool:${key}`)
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)))
}

function frontOperatingAssetRefs(input: AgentRunInput): string[] {
  return (input.frontOperatingSystem?.assets ?? []).map(asset => asset.ref)
}

function refsFromRecords(records: unknown[], prefix: 'source' | 'evidence' | 'decision'): string[] {
  return unique(records.flatMap(record => {
    if (!isRecord(record)) return []
    const refs = Array.isArray(record.refs) ? record.refs.filter(item => typeof item === 'string') : []
    const id = typeof record.snippetId === 'string'
      ? record.snippetId
      : typeof record.evidenceId === 'string'
        ? record.evidenceId
        : typeof record.evidenceRef === 'string'
          ? record.evidenceRef
          : typeof record.id === 'string'
            ? record.id
            : ''
    const normalizedId = id
      ? (id.startsWith(`${prefix}:`) ? id : `${prefix}:${id}`)
      : ''
    return refs.length > 0 ? refs : [normalizedId].filter(Boolean)
  }))
}

function coverageItem(records: unknown[], refs: string[], missingWarning: string): AgentEvidenceCoverageItem {
  const found = records.length > 0 || refs.length > 0
  return {
    found,
    refs,
    records,
    scores: records.map(() => 1),
    warnings: found ? [] : [missingWarning],
  }
}

function evidenceCoverageFromInput(input: AgentRunInput): AgentEvidenceCoverage {
  const officialRecords = input.ragCollections?.official_docs ?? input.officialSourceSnippets ?? []
  const benchmarkRecords = input.ragCollections?.benchmark_evidence ?? input.benchmarkCards ?? []
  const decisionRecords = input.ragCollections?.decision_history ?? input.decisionHistory ?? []
  return {
    officialDocs: coverageItem(officialRecords, refsFromRecords(officialRecords, 'source'), 'official_docs_unavailable'),
    benchmarkEvidence: coverageItem(benchmarkRecords, refsFromRecords(benchmarkRecords, 'evidence'), 'baseline_unavailable'),
    decisionHistory: coverageItem(decisionRecords, refsFromRecords(decisionRecords, 'decision'), 'decision_history_unavailable'),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringField(value: unknown, key: string): string {
  return isRecord(value) && typeof value[key] === 'string' ? value[key] : ''
}

function hasBlockingTrustInspection(value: unknown): boolean {
  return isRecord(value) && (
    value.status === 'blocked'
    || value.allowedForSnapshot === false
    || (Array.isArray(value.warnings) && value.warnings.some(warning => (
      warning === 'raw_prompt_detected' || warning === 'api_key_candidate_detected'
    )))
  )
}

function routeOperatingAgents(input: AgentRunInput): {
  executionMode: AgentRunExecutionMode
  activeStage: AgentRunStage
  primaryAgentId: string
  reviewerAgentIds: string[]
  calledAgentIds: string[]
  reason: string
} {
  const knownAgentIds = (input.operatingAgents ?? [])
    .map(agent => stringField(agent, 'id'))
    .filter(Boolean)
  const agentIds = knownAgentIds.length > 0 ? knownAgentIds : OPERATING_AGENT_IDS
  const defaults = STAGE_AGENT_ROUTES[input.activeStage].filter(agentId => agentIds.includes(agentId))
  const routeDefaults = defaults.length > 0 ? defaults : agentIds.slice(0, 3)
  const requested = input.requestedAgentId && agentIds.includes(input.requestedAgentId) ? input.requestedAgentId : null
  const executionMode = input.executionMode ?? 'stage_committee'
  if (executionMode !== 'all_hands' && hasBlockingTrustInspection(input.trustInspection)) {
    const trustRoute = ['trust_security_compliance', 'usage_data_ingestion', 'cost_engine_qa']
      .filter(agentId => agentIds.includes(agentId))
    const calledAgentIds = executionMode === 'single_agent'
      ? [requested ?? 'trust_security_compliance']
      : unique(trustRoute.length > 0 ? trustRoute : [requested ?? routeDefaults[0], ...routeDefaults]).slice(0, 3)
    const primaryAgentId = calledAgentIds[0]
    return {
      executionMode,
      activeStage: input.activeStage,
      primaryAgentId,
      reviewerAgentIds: calledAgentIds.filter(agentId => agentId !== primaryAgentId),
      calledAgentIds,
      reason: 'trust pipeline requires review before snapshot use',
    }
  }
  const primaryAgentId = requested ?? routeDefaults[0]
  const calledAgentIds = executionMode === 'all_hands'
    ? unique([primaryAgentId, ...agentIds])
    : executionMode === 'single_agent'
      ? [primaryAgentId]
      : unique([primaryAgentId, ...routeDefaults.filter(agentId => agentId !== primaryAgentId)]).slice(0, 3)

  return {
    executionMode,
    activeStage: input.activeStage,
    primaryAgentId,
    reviewerAgentIds: calledAgentIds.filter(agentId => agentId !== primaryAgentId),
    calledAgentIds,
    reason: requested ? 'requested agent override' : `${input.activeStage} stage default operating team`,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function routeStringArray(route: Record<string, unknown>, key: string): string[] {
  const value = route[key]
  return isStringArray(value) ? value : []
}

function routePrimaryAgentId(fallback: AgentRunResponse): string | null {
  const routePrimary = stringField(fallback.agentRoute, 'primaryAgentId')
  return routePrimary || fallback.primaryAgentId
}

function routeReviewerAgentIds(fallback: AgentRunResponse): string[] {
  return routeStringArray(fallback.agentRoute, 'reviewerAgentIds')
}

function routeCalledAgentIds(fallback: AgentRunResponse): string[] {
  const routed = routeStringArray(fallback.agentRoute, 'routedAgentIds')
  return routed.length > 0 ? routed : routeStringArray(fallback.agentRoute, 'calledAgentIds')
}

function isRuntimeCapabilityStatus(value: unknown): value is RuntimeCapabilityStatus {
  return value === 'provider_llm'
    || value === 'deterministic_preview'
    || value === 'unavailable'
    || value === 'connector_not_configured'
}

function timestampedRuntime(status: RuntimeCapabilityStatus, fallbackReason?: string): AgentRunRuntimeProof {
  const now = new Date().toISOString()
  return {
    status,
    ...(fallbackReason ? { fallbackReason } : {}),
    startedAt: now,
    completedAt: now,
  }
}

function normalizeRuntime(value: unknown, fallback: AgentRunRuntimeProof): AgentRunRuntimeProof {
  if (!isRecord(value) || !isRuntimeCapabilityStatus(value.status)) return fallback
  const startedAt = typeof value.startedAt === 'string' && value.startedAt ? value.startedAt : fallback.startedAt
  const completedAt = typeof value.completedAt === 'string' && value.completedAt ? value.completedAt : fallback.completedAt
  return {
    status: value.status,
    ...(typeof value.providerRunId === 'string' && value.providerRunId ? { providerRunId: value.providerRunId } : {}),
    ...(isStringArray(value.agentInvocationProof) ? { agentInvocationProof: value.agentInvocationProof } : {}),
    ...(typeof value.fallbackReason === 'string' && value.fallbackReason ? { fallbackReason: value.fallbackReason } : {}),
    startedAt,
    completedAt,
  }
}

function isAgenticEvent(value: unknown): value is AgenticEvent {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AgenticEvent>
  return typeof candidate.type === 'string'
    && typeof candidate.message === 'string'
    && Array.isArray(candidate.toolResultRefs)
    && Array.isArray(candidate.riskCardIds)
}

function isEvidenceCoverageItem(value: unknown): value is AgentEvidenceCoverageItem {
  if (!isRecord(value)) return false
  return typeof value.found === 'boolean'
    && Array.isArray(value.refs)
    && Array.isArray(value.records)
    && Array.isArray(value.scores)
    && Array.isArray(value.warnings)
}

function normalizeCoverageItem(value: unknown, fallback: AgentEvidenceCoverageItem): AgentEvidenceCoverageItem {
  if (!isEvidenceCoverageItem(value)) return fallback
  return {
    found: value.found,
    refs: isStringArray(value.refs) ? value.refs : fallback.refs,
    records: Array.isArray(value.records) ? value.records : fallback.records,
    scores: value.scores.every(score => typeof score === 'number' && Number.isFinite(score)) ? value.scores : fallback.scores,
    warnings: isStringArray(value.warnings) ? value.warnings : fallback.warnings,
  }
}

function normalizeEvidenceCoverage(value: unknown, fallback: AgentEvidenceCoverage): AgentEvidenceCoverage {
  if (!isRecord(value)) return fallback
  return {
    officialDocs: normalizeCoverageItem(value.officialDocs, fallback.officialDocs),
    benchmarkEvidence: normalizeCoverageItem(value.benchmarkEvidence, fallback.benchmarkEvidence),
    decisionHistory: normalizeCoverageItem(value.decisionHistory, fallback.decisionHistory),
  }
}

function normalizeEvents(candidate: Partial<AgentRunResponse>, fallback: AgentRunResponse): AgenticEvent[] {
  const routeEvents = fallback.events
  if (!Array.isArray(candidate.events)) return routeEvents
  const providerRuntime = candidate.runtime?.status === 'provider_llm'
  const fallbackPrimary = routePrimaryAgentId(fallback)
  const fallbackReviewers = routeReviewerAgentIds(fallback)
  return candidate.events.filter(isAgenticEvent).map((event, index) => {
    const fallbackEvent = routeEvents[index] ?? routeEvents[0]
    const usedTools = isStringArray(event.usedTools) ? event.usedTools : (
      isStringArray(candidate.usedTools) ? candidate.usedTools : []
    )
    return {
      ...event,
      agentId: event.agentId ?? (providerRuntime ? fallbackPrimary : fallbackEvent?.agentId ?? fallback.primaryAgentId),
      calledAgentTool: event.calledAgentTool ?? (
        providerRuntime && fallbackPrimary ? `call_${fallbackPrimary}_agent` : fallbackEvent?.calledAgentTool ?? null
      ),
      stance: event.stance ?? fallbackEvent?.stance ?? 'support',
      toolResultRefs: event.toolResultRefs.length > 0 ? event.toolResultRefs : fallback.toolResultRefs,
      riskCardIds: event.riskCardIds,
      usedTools,
      usedCapabilityTools: isStringArray(event.usedCapabilityTools) ? event.usedCapabilityTools : usedTools,
      reviewerAgentIds: isStringArray(event.reviewerAgentIds) ? event.reviewerAgentIds : fallbackReviewers,
      evidenceRefs: isStringArray(event.evidenceRefs) ? event.evidenceRefs : [],
      evidenceWarnings: isStringArray(event.evidenceWarnings) ? event.evidenceWarnings : [],
      nextQuestion: typeof event.nextQuestion === 'string' ? event.nextQuestion : '',
      basisRefs: isStringArray(event.basisRefs) ? event.basisRefs : [],
      assetRefs: isStringArray(event.assetRefs) ? event.assetRefs : fallback.assetRefs,
    }
  })
}

function normalizeResponse(value: unknown, fallback: AgentRunResponse): AgentRunResponse {
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as Partial<AgentRunResponse>
  const runtime = normalizeRuntime(candidate.runtime, fallback.runtime)
  const isProviderRuntime = runtime.status === 'provider_llm'
  const routedAgentIds = routeCalledAgentIds(fallback)
  const primaryAgentId = typeof candidate.primaryAgentId === 'string'
    ? candidate.primaryAgentId
    : isProviderRuntime
      ? routePrimaryAgentId(fallback)
      : fallback.primaryAgentId
  const reviewerAgentIds = isStringArray(candidate.reviewerAgentIds)
    ? candidate.reviewerAgentIds
    : isProviderRuntime
      ? routeReviewerAgentIds(fallback)
      : fallback.reviewerAgentIds
  return {
    events: normalizeEvents(candidate, fallback),
    answer: typeof candidate.answer === 'string' ? candidate.answer : fallback.answer,
    report: typeof candidate.report === 'string' ? candidate.report : fallback.report,
    llmMode: isProviderRuntime && candidate.llmMode === 'provider-llm' ? 'provider-llm' : 'deterministic-fallback',
    runtime,
    supervisorSummary: typeof candidate.supervisorSummary === 'string' ? candidate.supervisorSummary : fallback.supervisorSummary,
    disagreements: isStringArray(candidate.disagreements) ? candidate.disagreements : fallback.disagreements,
    decisionReadiness: typeof candidate.decisionReadiness === 'string' ? candidate.decisionReadiness : fallback.decisionReadiness,
    nextQuestions: isStringArray(candidate.nextQuestions) ? candidate.nextQuestions : fallback.nextQuestions,
    calledAgentIds: isStringArray(candidate.calledAgentIds) ? candidate.calledAgentIds : (isProviderRuntime ? routedAgentIds : fallback.calledAgentIds),
    primaryAgentId,
    reviewerAgentIds,
    agentRoute: candidate.agentRoute && typeof candidate.agentRoute === 'object' ? candidate.agentRoute as Record<string, unknown> : fallback.agentRoute,
    snapshotVersion: typeof candidate.snapshotVersion === 'string' ? candidate.snapshotVersion : fallback.snapshotVersion,
    usedTools: isStringArray(candidate.usedTools) ? candidate.usedTools : [],
    toolResultRefs: isStringArray(candidate.toolResultRefs) ? candidate.toolResultRefs : fallback.toolResultRefs,
    riskCardIds: isStringArray(candidate.riskCardIds) ? candidate.riskCardIds : [],
    decisionIds: isStringArray(candidate.decisionIds) ? candidate.decisionIds : [],
    evidenceRefs: isStringArray(candidate.evidenceRefs) ? candidate.evidenceRefs : [],
    evidenceCoverage: normalizeEvidenceCoverage(candidate.evidenceCoverage, fallback.evidenceCoverage),
    assetRefs: isStringArray(candidate.assetRefs) ? candidate.assetRefs : fallback.assetRefs,
    warnings: isStringArray(candidate.warnings) ? candidate.warnings : [],
  }
}

function fallbackResponse(
  input: AgentRunInput,
  warning = 'agentic runtime unavailable',
  status: Extract<RuntimeCapabilityStatus, 'deterministic_preview' | 'unavailable'> = 'deterministic_preview',
): AgentRunResponse {
  const refs = toolRefsFrom(input)
  const refsLabel = refs.join(', ') || 'deterministic snapshot'
  const route = routeOperatingAgents(input)
  const evidenceCoverage = evidenceCoverageFromInput(input)
  const evidenceWarnings = unique([
    ...evidenceCoverage.officialDocs.warnings,
    ...evidenceCoverage.benchmarkEvidence.warnings,
    ...evidenceCoverage.decisionHistory.warnings,
  ])
  const warnings = unique([
    warning,
    ...(hasBlockingTrustInspection(input.trustInspection) ? ['trust pipeline requires review before snapshot use'] : []),
  ])
  const assetRefs = unique([
    ...(input.operatingAssets ?? [])
      .map(asset => {
        const id = stringField(asset, 'id')
        return id ? `asset:${id.replace(/^asset:/, '')}` : ''
      }),
    ...frontOperatingAssetRefs(input),
  ])
  const runtime = timestampedRuntime(status, warning)
  const routedAgentLabel = route.calledAgentIds.join(', ') || 'none'
  const fallbackEventType = status === 'unavailable' ? 'runtime_unavailable' : 'deterministic_preview'
  const fallbackMessage = status === 'unavailable'
    ? `Agent runtime unavailable; deterministic preview is grounded in ${refsLabel}. Routed agents were not invoked (${routedAgentLabel}).`
    : `Deterministic preview is grounded in ${refsLabel}. Routed agents were not invoked (${routedAgentLabel}).`
  const coverageRefs = unique([
    ...evidenceCoverage.officialDocs.refs,
    ...evidenceCoverage.benchmarkEvidence.refs,
    ...evidenceCoverage.decisionHistory.refs,
  ])
  return {
    events: [{
      type: fallbackEventType,
      message: fallbackMessage,
      agentId: null,
      calledAgentTool: null,
      stance: evidenceWarnings.length > 0 ? 'caution' : 'support',
      toolResultRefs: refs,
      riskCardIds: [],
      usedTools: [],
      usedCapabilityTools: [],
      reviewerAgentIds: [],
      evidenceRefs: coverageRefs,
      evidenceWarnings,
      nextQuestion: evidenceWarnings.includes('baseline_unavailable') ? 'Which peer baseline should be added before adoption?' : '',
      basisRefs: [],
      assetRefs,
    }],
    answer: `${status === 'unavailable' ? 'Agent runtime unavailable' : 'Deterministic preview'} is grounded in ${refsLabel}.`,
    report: `Preview report uses ${refsLabel}; no operating agent was invoked.`,
    llmMode: 'deterministic-fallback',
    runtime,
    supervisorSummary: `${status === 'unavailable' ? 'Agent runtime unavailable' : 'Deterministic preview only'}; routed agents were ${routedAgentLabel}.`,
    disagreements: [],
    decisionReadiness: 'needs_review',
    nextQuestions: [
      ...(evidenceWarnings.includes('baseline_unavailable') ? ['Which peer baseline should be added before adoption?'] : []),
      'Confirm provider runtime availability before treating AI interpretation as LLM assisted.',
      'Review the cited deterministic refs before adopting a recommendation.',
    ],
    calledAgentIds: [],
    primaryAgentId: null,
    reviewerAgentIds: [],
    agentRoute: { ...route, routedAgentIds: route.calledAgentIds, calledAgentIds: [], previewOnly: true },
    snapshotVersion: input.snapshotVersion ?? '',
    usedTools: [],
    toolResultRefs: refs,
    riskCardIds: [],
    decisionIds: [],
    evidenceRefs: coverageRefs,
    evidenceCoverage,
    assetRefs,
    warnings: unique([...warnings, ...evidenceWarnings]),
  }
}

export async function runAgentRuntime(
  input: AgentRunInput,
  options: AgentRunRuntimeOptions = {},
): Promise<AgentRunResponse> {
  const runtime = options.runtime ?? runtimeFromEnv()
  const fallback = fallbackResponse(input)
  if (runtime !== 'server') return fallback

  const fetcher = options.fetcher ?? fetch
  try {
    const response = await fetcher(apiUrl('/api/agent/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) return fallbackResponse(input, `agentic runtime failed with ${response.status}`, 'unavailable')
    return normalizeResponse(await response.json(), fallback)
  } catch {
    return fallbackResponse(input, 'agentic runtime unavailable', 'unavailable')
  }
}
