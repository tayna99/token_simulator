import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import type { FrontOperatingSystemContext } from '../../front-operating/lib/frontOperatingContext'

export type AgentRunMode = 'report' | 'ask' | 'decision_support'
export type AgentRunStage = 'design' | 'cost' | 'bottleneck' | 'optimize' | 'decision-log'
export type AgentRunLlmMode = 'deterministic-fallback' | 'provider-llm'
export type AgentRunRuntimeMode = 'local' | 'server'
export type AgentRunExecutionMode = 'stage_committee' | 'all_hands' | 'single_agent'

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
  toolResultRefs: string[]
  riskCardIds: string[]
  usedTools?: string[]
  usedCapabilityTools?: string[]
  reviewerAgentIds?: string[]
  evidenceRefs?: string[]
  basisRefs?: string[]
  assetRefs?: string[]
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
  assetRefs: string[]
  warnings: string[]
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface AgentRunRuntimeOptions {
  runtime?: AgentRunRuntimeMode
  fetcher?: FetchLike
}

function runtimeFromEnv(): AgentRunRuntimeMode {
  return import.meta.env.VITE_AGENT_RUNTIME === 'server' ? 'server' : 'local'
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

function isAgenticEvent(value: unknown): value is AgenticEvent {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AgenticEvent>
  return typeof candidate.type === 'string'
    && typeof candidate.message === 'string'
    && Array.isArray(candidate.toolResultRefs)
    && Array.isArray(candidate.riskCardIds)
}

function normalizeEvents(candidate: Partial<AgentRunResponse>, fallback: AgentRunResponse): AgenticEvent[] {
  const routeEvents = fallback.events
  if (!Array.isArray(candidate.events)) return routeEvents
  return candidate.events.filter(isAgenticEvent).map((event, index) => {
    const fallbackEvent = routeEvents[index] ?? routeEvents[0]
    const usedTools = isStringArray(event.usedTools) ? event.usedTools : (
      isStringArray(candidate.usedTools) ? candidate.usedTools : []
    )
    return {
      ...event,
      agentId: event.agentId ?? fallbackEvent?.agentId ?? fallback.primaryAgentId,
      calledAgentTool: event.calledAgentTool ?? fallbackEvent?.calledAgentTool ?? (
        fallback.primaryAgentId ? `call_${fallback.primaryAgentId}_agent` : null
      ),
      toolResultRefs: event.toolResultRefs.length > 0 ? event.toolResultRefs : fallback.toolResultRefs,
      riskCardIds: event.riskCardIds,
      usedTools,
      usedCapabilityTools: isStringArray(event.usedCapabilityTools) ? event.usedCapabilityTools : usedTools,
      reviewerAgentIds: isStringArray(event.reviewerAgentIds) ? event.reviewerAgentIds : fallback.reviewerAgentIds,
      evidenceRefs: isStringArray(event.evidenceRefs) ? event.evidenceRefs : [],
      basisRefs: isStringArray(event.basisRefs) ? event.basisRefs : [],
      assetRefs: isStringArray(event.assetRefs) ? event.assetRefs : fallback.assetRefs,
    }
  })
}

function normalizeResponse(value: unknown, fallback: AgentRunResponse): AgentRunResponse {
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as Partial<AgentRunResponse>
  return {
    events: normalizeEvents(candidate, fallback),
    answer: typeof candidate.answer === 'string' ? candidate.answer : fallback.answer,
    report: typeof candidate.report === 'string' ? candidate.report : fallback.report,
    llmMode: candidate.llmMode === 'provider-llm' ? 'provider-llm' : 'deterministic-fallback',
    supervisorSummary: typeof candidate.supervisorSummary === 'string' ? candidate.supervisorSummary : fallback.supervisorSummary,
    disagreements: isStringArray(candidate.disagreements) ? candidate.disagreements : fallback.disagreements,
    decisionReadiness: typeof candidate.decisionReadiness === 'string' ? candidate.decisionReadiness : fallback.decisionReadiness,
    nextQuestions: isStringArray(candidate.nextQuestions) ? candidate.nextQuestions : fallback.nextQuestions,
    calledAgentIds: isStringArray(candidate.calledAgentIds) ? candidate.calledAgentIds : fallback.calledAgentIds,
    primaryAgentId: typeof candidate.primaryAgentId === 'string' ? candidate.primaryAgentId : fallback.primaryAgentId,
    reviewerAgentIds: isStringArray(candidate.reviewerAgentIds) ? candidate.reviewerAgentIds : fallback.reviewerAgentIds,
    agentRoute: candidate.agentRoute && typeof candidate.agentRoute === 'object' ? candidate.agentRoute as Record<string, unknown> : fallback.agentRoute,
    snapshotVersion: typeof candidate.snapshotVersion === 'string' ? candidate.snapshotVersion : fallback.snapshotVersion,
    usedTools: isStringArray(candidate.usedTools) ? candidate.usedTools : [],
    toolResultRefs: isStringArray(candidate.toolResultRefs) ? candidate.toolResultRefs : fallback.toolResultRefs,
    riskCardIds: isStringArray(candidate.riskCardIds) ? candidate.riskCardIds : [],
    decisionIds: isStringArray(candidate.decisionIds) ? candidate.decisionIds : [],
    evidenceRefs: isStringArray(candidate.evidenceRefs) ? candidate.evidenceRefs : [],
    assetRefs: isStringArray(candidate.assetRefs) ? candidate.assetRefs : fallback.assetRefs,
    warnings: isStringArray(candidate.warnings) ? candidate.warnings : [],
  }
}

function fallbackResponse(input: AgentRunInput, warning = 'agentic runtime unavailable'): AgentRunResponse {
  const refs = toolRefsFrom(input)
  const refsLabel = refs.join(', ') || 'deterministic snapshot'
  const route = routeOperatingAgents(input)
  const agentLabel = (agentId: string) => {
    const agent = (input.operatingAgents ?? []).find(item => stringField(item, 'id') === agentId)
    return stringField(agent, 'label') || agentId
  }
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
  return {
    events: route.calledAgentIds.map(agentId => ({
      type: 'analysis',
      message: `${agentLabel(agentId)} fallback is grounded in ${refsLabel}.`,
      agentId,
      calledAgentTool: `call_${agentId}_agent`,
      toolResultRefs: refs,
      riskCardIds: [],
      usedTools: [],
      usedCapabilityTools: [],
      reviewerAgentIds: route.reviewerAgentIds.filter(reviewerId => reviewerId !== agentId),
      evidenceRefs: [],
      basisRefs: [],
      assetRefs,
    })),
    answer: `Operating team fallback is grounded in ${refsLabel}.`,
    report: `One-page report fallback uses ${refsLabel}.`,
    llmMode: 'deterministic-fallback',
    supervisorSummary: `${route.primaryAgentId} led a fallback review grounded in ${refsLabel}.`,
    disagreements: route.reviewerAgentIds.map(reviewerId => `${reviewerId} should review ${route.primaryAgentId}'s recommendation before adoption.`),
    decisionReadiness: 'needs_review',
    nextQuestions: [
      'Confirm provider runtime availability before treating AI interpretation as LLM assisted.',
      'Review the cited deterministic refs before adopting a recommendation.',
    ],
    calledAgentIds: route.calledAgentIds,
    primaryAgentId: route.primaryAgentId,
    reviewerAgentIds: route.reviewerAgentIds,
    agentRoute: route,
    snapshotVersion: input.snapshotVersion ?? '',
    usedTools: [],
    toolResultRefs: refs,
    riskCardIds: [],
    decisionIds: [],
    evidenceRefs: [],
    assetRefs,
    warnings,
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
    if (!response.ok) return fallbackResponse(input, `agentic runtime failed with ${response.status}`)
    return normalizeResponse(await response.json(), fallback)
  } catch {
    return fallbackResponse(input)
  }
}
