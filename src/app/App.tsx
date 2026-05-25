import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MODELS, getModelById, type Model } from '../features/alternatives/data/models'
import { USE_CASE_PRESETS } from '../features/usage/data/workloadPresets'
import { SummaryCard } from '../features/report/components/SummaryCard'
import { buildOnePageReportArtifact, buildReportArtifact } from '../features/report/lib/reportArtifacts'
import { RoleSelector } from '../components/RoleSelector'
import { PeriodSelector } from '../components/PeriodSelector'
import { ConfigPanel } from '../components/ConfigPanel'
import { loadConfigFromUrl } from '../lib/configManager'
import { toLegacySimState, type PlannerState } from '../lib/plannerState'
import type { UsageImportSummary } from '../features/usage/lib/usageImport'
import { UsageImportPanel } from '../features/usage/components/UsageImportPanel'
import { rollupUsageByAxis, type AttributionAxis, type AttributionResult } from '../features/usage/lib/attribution'
import { CUSTOMER_MONTHLY_REVENUE, PLAN_MONTHLY_REVENUE } from '../features/usage/data/sparkClawSample'
import { customerProfitability, heavyUserDetection, marginByPlan, type CustomerMarginRow, type MarginRow } from '../features/unit-economics/lib/margin'
import { calculatePricingScenario, type ScenarioResult } from '../features/pricing/lib/pricingScenario'
import { buildRateCardDraft, type RateCardDraft } from '../features/pricing/lib/rateCardDraft'
import { buildPricingFreshnessBadge, type PricingFreshnessBadge } from '../features/facts/lib/pricingFreshness'
import { buildDecisionHeader, type DecisionHeader } from '../features/decision-loop/lib/decisionHeader'
import { canExportOnePageReport } from '../features/decision-loop/lib/exportGate'
import {
  ROLE_PROJECTION_PANEL_LABELS,
  projectSnapshotForRole,
  type RoleProjectionPanelKey,
  type RoleViewModel,
} from '../features/role-projection/lib/projectSnapshotForRole'
import { retrieveRiskCards, type RiskCard } from '../features/agent/lib/riskCards'
import { runAgent, type AgentEvent } from '../features/agent/lib/agentRuntime'
import { runAgentRuntime, type AgentRunExecutionMode, type AgentRunResponse } from '../features/agent/lib/agentRunRuntime'
import { buildAgentSnapshot } from '../features/agent/lib/buildAgentSnapshot'
import { OperatingTeamPanel } from '../features/agent/components/OperatingTeamPanel'
import { FrontOperatingPanel } from '../features/front-operating/components/FrontOperatingPanel'
import { createDecision, createOperatingLedgerEntry, deleteDecision, exportDecisionLogFileName, loadDecisionLog, saveDecisionLog, serializeDecisionLog, type Decision, type OperatingDecisionKind, type ReportReviewMetadata, type TrustReviewMetadata } from '../features/decision-log/lib/decisionLog'
import { createRemoteDecisionStore } from '../features/decision-log/lib/decisionStore'
import { DEFAULT_AI_TEAM_AGENTS, type AITeamConfiguration } from '../features/team/lib/aiTeamConfiguration'
import { TeamDesignerPanel } from '../features/team/components/TeamDesignerPanel'
import { summarizeOperationalSignals, type OperationalSignalSummary as OperationalSignalSummaryData } from '../features/usage/lib/operationalSignals'
import { OperationalSignalSummary } from '../features/usage/components/OperationalSignalSummary'
import { Badge, Button, MetricTile, Surface } from '../shared/ui/primitives'
import { fmtCurrency, fmtPercent, fmtTokens } from '../lib/format'
import { AI_TEAM_AGENT_CATALOG } from '../features/team-cost/lib/agentCatalog'
import { TEAM_COST_BENCHMARKS } from '../features/team-cost/lib/benchmarkCorpus'
import type { AgentSpec, HumanReviewGate } from '../features/team-cost/lib/agentSpec'
import { detectBottlenecks } from '../features/team-cost/lib/bottleneckAnalysis'
import { estimateAgentWorkload, summarizeTeamCost, type TeamCostEstimate } from '../features/team-cost/lib/estimateAgentWorkload'
import { proposeOptimizationCandidates, recommendationFromCandidate } from '../features/team-cost/lib/optimizationPolicies'
import type { OptimizationRecommendation } from '../features/team-cost/lib/optimizationPolicies'
import { runTeamCostAgentRuntime, type TeamCostLlmMode } from '../features/agent/lib/teamCostAgentRuntime'
import type { TeamCostGraphEvent } from '../features/team-cost/lib/teamCostState'
import { CompanyWorkInputPanel, type WorkCatalogItem } from '../features/team-cost/components/CompanyWorkInputPanel'
import { AITeamSpecPanel } from '../features/team-cost/components/AITeamSpecPanel'
import { TeamCostForecastPanel } from '../features/team-cost/components/TeamCostForecastPanel'
import { OptimizationReviewPanel } from '../features/team-cost/components/OptimizationReviewPanel'
import { createDefaultAgentAccountability, updateAgentAccountability, type AgentAccountability } from '../features/team-cost/lib/accountability'
import { attributeDeliverableCosts, DEFAULT_AI_TEAM_DELIVERABLES, type Deliverable } from '../features/team-cost/lib/deliverables'
import { summarizeDeliverablePerformance } from '../features/team-cost/lib/deliverableMetrics'
import {
  DEFAULT_THRESHOLD_POLICY,
  factSourceSnapshotFromModels,
  getThreshold,
  mergeThresholdPolicy,
  type ThresholdId,
  type ThresholdPolicy,
} from '../features/metrics/lib/thresholdPolicy'
import { OPERATING_AGENTS, OPERATING_ASSETS, P1_AUTOMATION_MODULES, p0OperatingAssetSummary, type OperatingAgent, type OperatingAgentId } from '../features/operating-assets/lib/operatingAssets'
import {
  buildCustomerWorkspaceDashboard,
  normalizeSdkLiteUsageEvent,
  retrieveP1VectorRagEvidence,
  type CustomerWorkspaceDashboard,
  type NormalizedP1SdkLiteUsageEvent,
  type P1RagRecord,
  type P1SdkLiteUsageEvent,
  type P1UsageAdapterSource,
  type P1VectorRagEvidenceResult,
} from '../features/p1/lib/p1OperatingSystem'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from '../features/front-operating/lib/frontOperatingContext'
import {
  INITIAL_FX_RATE_SNAPSHOTS,
  INITIAL_OFFICIAL_SOURCE_SNIPPETS,
  INITIAL_MODEL_RELEASE_CANDIDATES,
  INITIAL_PRICING_FACT_CANDIDATES,
  OFFICIAL_SOURCE_REGISTRY,
  officialWatchtowerCoverageSummary,
} from '../features/research/lib/officialWatchtower'

export type Role = 'developer' | 'pm' | 'ceo'
export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface SimState {
  role: Role
  currentModel: Model
  candidateModel: Model
  period: Period
  periodInputTokens: number
  periodOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
  monthlyRequests: number
  activeUsers: number
  monthlyBudgetUsd: number | null
}

function cloneAgentCatalog(): AgentSpec[] {
  return AI_TEAM_AGENT_CATALOG.map(agent => ({
    ...agent,
    inputs: agent.inputs.map(input => ({ ...input })),
    outputs: agent.outputs.map(output => ({ ...output })),
    assignedTasks: [...agent.assignedTasks],
  }))
}

type TeamCostCompanyProfile = {
  companyType: string
  stage: string
  monthlyBudgetUsd: number
  locale: 'en' | 'ko'
}

type RemoteBackendStatus = 'checking' | 'connected' | 'fallback'

interface RemoteUsageHistoryEntry {
  snapshotRef: string
  requestCount: number
  importedAt: string
}

interface TeamCostCalibration {
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

interface WeeklyReportRun {
  id: string
  period: string
  snapshotRefs: {
    decisionIds: string[]
    configSnapshotRef: string | null
    usageSnapshotRef: string | null
  }
}

type SdkLitePanelStatus = 'idle' | 'accepted' | 'blocked' | 'error'

interface SdkLiteHistoryEntry {
  eventRef: string
  ingestedAt: string
}

interface SdkLitePanelState {
  status: SdkLitePanelStatus
  snapshotAllowed: boolean
  eventRef: string | null
  normalized: NormalizedP1SdkLiteUsageEvent | null
  history: SdkLiteHistoryEntry[]
  persistence: string
  error?: string
}

interface SdkLiteUsageApiBody {
  persistence?: string
  snapshotAllowed?: boolean
  eventRef?: string | null
  normalized?: NormalizedP1SdkLiteUsageEvent | null
  history?: SdkLiteHistoryEntry[]
  error?: string
}

interface P1RagEvidencePanelState {
  status: 'idle' | 'loaded' | 'error'
  persistence: string
  evidence: P1VectorRagEvidenceResult | null
  metadata?: {
    workspaceId: string
    query: string
  }
  error?: string
}

interface P1RagEvidenceApiBody {
  persistence?: string
  evidence?: P1VectorRagEvidenceResult
  metadata?: {
    workspaceId: string
    query: string
  }
  error?: string
}

const WORKSPACE_STORAGE_KEY = 'token-simulator:p1-workspace-id'

function newWorkspaceId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `workspace-${random}`
}

function loadWorkspaceId(): string {
  if (typeof window === 'undefined') return 'workspace-server'
  const fromUrl = new URLSearchParams(window.location.search).get('workspaceId')?.trim()
  const existing = fromUrl || window.localStorage.getItem(WORKSPACE_STORAGE_KEY)?.trim()
  if (existing) return existing
  const created = newWorkspaceId()
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, created)
  return created
}

const DEFAULT_TEAM_COST_WORK_ITEMS: WorkCatalogItem[] = [
  { id: 'market-research', label: 'Market research', frequencyLabel: 'Research monthly volume', monthlyVolume: 20, enabled: true },
  { id: 'prd-writing', label: 'PRD writing', frequencyLabel: 'PRD monthly volume', monthlyVolume: 4, enabled: true },
  { id: 'ux-screen-planning', label: 'UX screen planning', frequencyLabel: 'Design monthly volume', monthlyVolume: 6, enabled: true },
  { id: 'code-implementation', label: 'Code implementation', frequencyLabel: 'Code changes monthly volume', monthlyVolume: 20, enabled: true },
  { id: 'marketing-content', label: 'Marketing content', frequencyLabel: 'Marketing monthly volume', monthlyVolume: 12, enabled: true },
  { id: 'customer-support', label: 'Customer support', frequencyLabel: 'CS monthly volume', monthlyVolume: 300, enabled: true },
  { id: 'cold-email', label: 'Cold email', frequencyLabel: 'Cold email monthly volume', monthlyVolume: 120, enabled: false },
  { id: 'meeting-notes', label: 'Meeting notes', frequencyLabel: 'Meeting notes monthly volume', monthlyVolume: 12, enabled: false },
]

const WORK_ITEM_AGENT_ID: Record<string, string> = {
  'market-research': 'agent-research',
  'prd-writing': 'agent-pm',
  'ux-screen-planning': 'agent-design',
  'code-implementation': 'agent-engineering',
  'marketing-content': 'agent-marketing',
  'customer-support': 'agent-cs',
  'cold-email': 'agent-sales',
  'meeting-notes': 'agent-ops',
}

const TEAM_COST_DEMO_STEPS = [
  '1. Company setup',
  '2. Work selection',
  '3. Agent assignment',
  '4. Frequency and document volume',
  '5. Cost forecast',
  '6. Bottleneck detection',
  '7. Optimization and risk cards',
  '8. After optimization',
  '9. Decision log saved',
]

type DecisionStageId = 'design' | 'cost' | 'bottleneck' | 'optimize' | 'decision-log'

const DECISION_STAGES: Array<{
  id: DecisionStageId
  label: string
  description: string
  nextDecision: string
}> = [
  {
    id: 'design',
    label: 'Design',
    description: 'Define company context, work volume, and Agent I/O before any cost decision.',
    nextDecision: 'Can this AI team design be costed without guessing missing inputs?',
  },
  {
    id: 'cost',
    label: 'Cost',
    description: 'Inspect monthly cost, token load, request volume, and model assumptions.',
    nextDecision: 'Is the current forecast acceptable against the monthly budget?',
  },
  {
    id: 'bottleneck',
    label: 'Bottleneck',
    description: 'Find the expensive or fragile part before optimizing the wrong surface.',
    nextDecision: 'Which agent, artifact, or workflow should be changed first?',
  },
  {
    id: 'optimize',
    label: 'Optimize + Risk',
    description: 'Compare before/after savings beside risk cards and approval gates.',
    nextDecision: 'Should the recommendation be adopted, rejected, or recorded as a policy?',
  },
  {
    id: 'decision-log',
    label: 'Decision Log',
    description: 'Record the decision, reason, assumptions, tool refs, and risk refs.',
    nextDecision: 'Is there enough evidence to revisit this decision after actual usage lands?',
  },
]

const ASSISTANT_TOOL_REFS = [
  'tool:team.monthlyCostUsd',
  'tool:team.topAgentShare',
  'tool:optimization.primary.monthlySavingsUsd',
]
const COST_FORMULA_VERSION = 'cost_formula_v0.3'
const PROVIDER_REGISTRY_VERSION = 'provider_registry_v0.4'

const EMPTY_AGENT_RUN_RESPONSE: AgentRunResponse = {
  events: [],
  answer: 'Agentic RAG is waiting for a deterministic snapshot.',
  report: 'One-page report will be generated after the SparkClaw demo or a real import.',
  llmMode: 'deterministic-fallback',
  supervisorSummary: 'Operating team synthesis is waiting for a deterministic snapshot.',
  disagreements: [],
  decisionReadiness: 'needs_review',
  nextQuestions: [],
  calledAgentIds: [],
  primaryAgentId: null,
  reviewerAgentIds: [],
  agentRoute: {},
  snapshotVersion: '',
  usedTools: [],
  toolResultRefs: [],
  riskCardIds: [],
  decisionIds: [],
  evidenceRefs: [],
  assetRefs: [],
  warnings: [],
}

const MODEL_PERF_MATRIX = [
  {
    taskType: 'classification',
    modelId: 'gemini-3.1-flash',
    qualityBasis: 'assumption',
    risk: 'Low-risk classification can be routed only after sample quality checks.',
  },
  {
    taskType: 'report_generation',
    modelId: 'claude-sonnet-4.6',
    qualityBasis: 'assumption',
    risk: 'Executive-facing reports need review before cheaper-model routing.',
  },
]

const EMPTY_SDK_LITE_PANEL_STATE: SdkLitePanelState = {
  status: 'idle',
  snapshotAllowed: false,
  eventRef: null,
  normalized: null,
  history: [],
  persistence: 'not_checked',
}

const EMPTY_P1_RAG_EVIDENCE_STATE: P1RagEvidencePanelState = {
  status: 'idle',
  persistence: 'not_checked',
  evidence: null,
}

const P1_RAG_SAMPLE_COLLECTIONS: Record<'official_docs' | 'benchmark_evidence' | 'decision_history', P1RagRecord[]> = {
  official_docs: [
    {
      id: 'google-pricing',
      text: 'Cache pricing source for Gemini API models.',
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    },
  ],
  benchmark_evidence: [
    {
      id: 'peer-cache',
      text: 'Peer teams improve margin when cache hit rate is tracked separately from raw input tokens.',
    },
  ],
  decision_history: [
    {
      id: 'cache-policy',
      text: 'Held cache routing until QA confirmed no quality regression.',
    },
  ],
}

function sdkLiteSampleEvent(kind: 'clean' | 'blocked'): {
  source: P1UsageAdapterSource
  event: P1SdkLiteUsageEvent
} {
  const base: P1SdkLiteUsageEvent = {
    timestamp: '2026-05-24T12:00:00.000Z',
    requestId: kind === 'clean' ? 'req_safe' : 'req_blocked',
    customerId: kind === 'clean' ? 'cust_safe' : 'cust_blocked',
    feature: 'support_reply',
    model: 'gpt-5-mini',
    plan: 'pro',
    sessionId: kind === 'clean' ? 'session_safe' : 'session_blocked',
    agentRunId: kind === 'clean' ? 'agent_run_safe' : 'agent_run_blocked',
    inputTokens: kind === 'clean' ? 1200 : 100,
    outputTokens: kind === 'clean' ? 240 : 20,
    retryCount: 0,
    cacheReadTokens: kind === 'clean' ? 800 : 0,
    cacheWriteTokens: kind === 'clean' ? 100 : 0,
    latencyMs: kind === 'clean' ? 920 : 500,
    status: 'success',
    deliverable: 'CS reply',
    taskType: 'classification',
    humanReview: false,
  }

  return kind === 'clean'
    ? { source: 'application_gateway', event: base }
    : {
      source: 'openai',
      event: {
        ...base,
        rawPrompt: 'Customer asked about refund terms.',
        apiKey: 'sk-test',
      },
    }
}

function localSdkLiteFallback(input: {
  workspaceId: string
  source: P1UsageAdapterSource
  event: P1SdkLiteUsageEvent
  previousHistory: SdkLiteHistoryEntry[]
}): SdkLitePanelState {
  const normalized = normalizeSdkLiteUsageEvent({ source: input.source, event: input.event })
  const eventRef = normalized.snapshotAllowed ? `sdk:p1:${input.workspaceId}:${input.event.requestId}` : null
  const history = eventRef
    ? [{ eventRef, ingestedAt: input.event.timestamp }, ...input.previousHistory].slice(0, 5)
    : input.previousHistory

  return {
    status: normalized.snapshotAllowed ? 'accepted' : 'blocked',
    snapshotAllowed: normalized.snapshotAllowed,
    eventRef,
    normalized,
    history,
    persistence: 'local_fallback',
    error: normalized.snapshotAllowed ? undefined : 'trust_pipeline_blocked',
  }
}

function sdkLiteStatusCopy(state: SdkLitePanelState): string {
  if (state.status === 'accepted') return 'Snapshot possible'
  if (state.status === 'blocked') return 'Blocked by Trust check'
  if (state.status === 'error') return 'SDK-lite ingest failed'
  return 'Waiting for SDK-lite event'
}

function allRagRefs(evidence: P1VectorRagEvidenceResult | null): string[] {
  if (!evidence) return []
  return Object.values(evidence.results).flatMap(result => result.refs)
}

function allRagWarnings(evidence: P1VectorRagEvidenceResult | null): string[] {
  if (!evidence) return []
  return Array.from(new Set([
    ...evidence.warnings,
    ...Object.values(evidence.results).flatMap(result => result.warnings),
  ]))
}

function AttributionTable({ result }: { result: AttributionResult }) {
  return (
    <div className="overflow-x-auto rounded-wds border border-line-neutral">
      <table className="w-full text-xs">
        <thead className="bg-fill-alternative text-label-alternative">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dimension</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
            <th className="px-3 py-2 text-right font-medium">Share</th>
            <th className="px-3 py-2 text-right font-medium">Requests</th>
            <th className="px-3 py-2 text-right font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-neutral">
          {result.rows.slice(0, 5).map(row => (
            <tr key={`${result.axis}-${row.key}`}>
              <td className="px-3 py-2 font-semibold text-label-normal">{row.label}</td>
              <td className="px-3 py-2 text-right" translate="no">{fmtCurrency(row.totalCostUsd, row.totalCostUsd < 1 ? 3 : 0)}</td>
              <td className="px-3 py-2 text-right" translate="no">{fmtPercent(row.shareOfCost)}</td>
              <td className="px-3 py-2 text-right" translate="no">{fmtTokens(row.requestCount)}</td>
              <td className="px-3 py-2 text-right" translate="no">{fmtTokens(row.inputTokens + row.outputTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.missingCount > 0 && (
        <p className="border-t border-line-neutral px-3 py-2 text-xs text-label-alternative">
          {result.missingCount} row(s) are missing this dimension and are excluded from the roll-up.
        </p>
      )}
    </div>
  )
}

function CostAttributionWorkspace({ attribution }: { attribution: Partial<Record<AttributionAxis, AttributionResult>> }) {
  const axes: AttributionAxis[] = ['customer', 'feature', 'model', 'plan', 'session', 'agent_run']

  return (
    <Surface
      eyebrow="Deterministic core"
      title="2. Cost Attribution"
      description="The same imported row source is grouped by customer, feature, model, plan, session, and agent-run. No LLM math here."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {axes.map(axis => attribution[axis] && (
          <div key={axis} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold capitalize text-label-normal">{axis.replace('_', ' ')}</h3>
              <Badge>{fmtCurrency(attribution[axis]?.totalCostUsd ?? 0)}</Badge>
            </div>
            <AttributionTable result={attribution[axis]} />
          </div>
        ))}
      </div>
    </Surface>
  )
}

function riskTone(risk: string): 'positive' | 'caution' | 'negative' {
  if (risk === 'healthy') return 'positive'
  if (risk === 'loss') return 'negative'
  return 'caution'
}

function MarginRiskWorkspace({
  planMargins,
  customerMargins,
  topDecileShare,
}: {
  planMargins: MarginRow[]
  customerMargins: CustomerMarginRow[]
  topDecileShare: number
}) {
  return (
    <Surface
      eyebrow="Margin engine"
      title="3. Margin Risk"
      description="Plan margin, loss customers, and heavy-user concentration are deterministic outputs from imported usage plus business revenue inputs."
    >
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="grid gap-3">
          <MetricTile label="Top-decile cost share" value={fmtPercent(topDecileShare)} tone={topDecileShare > 0.5 ? 'negative' : 'caution'} />
          <MetricTile label="Loss customers" value={fmtTokens(customerMargins.filter(row => row.marginRisk === 'loss').length)} />
          <MetricTile label="Plan count" value={fmtTokens(planMargins.length)} />
          <MetricTile
            label="Effective AI COGS"
            value={fmtCurrency(planMargins.reduce((sum, row) => sum + row.effectiveCostUsd, 0))}
            help="Raw AI COGS plus retry, human review, and CS escalation assumptions"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-wds border border-line-neutral">
            <div className="border-b border-line-neutral px-3 py-2">
              <h3 className="text-sm font-semibold">Plan margin</h3>
            </div>
            <div className="divide-y divide-line-neutral">
              {planMargins.map(row => (
                <div key={row.planId} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3">
                  <div>
                    <p className="font-semibold">{row.planId === 'pro' ? 'Pro plan' : `${row.planId} plan`}</p>
                    <p className="text-xs text-label-alternative" translate="no">
                      {fmtCurrency(row.revenueUsd)} revenue / {fmtCurrency(row.totalCostUsd)} raw / {fmtCurrency(row.effectiveCostUsd)} effective
                    </p>
                  </div>
                  <Badge tone={riskTone(row.marginRisk)}>{fmtPercent(row.effectiveGrossMarginPct)}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-wds border border-line-neutral">
            <div className="border-b border-line-neutral px-3 py-2">
              <h3 className="text-sm font-semibold">Customer profitability</h3>
            </div>
            <div className="divide-y divide-line-neutral">
              {customerMargins.slice(0, 5).map(row => (
                <div key={row.customerId} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3">
                  <div>
                    <p className="font-semibold">{row.customerId}</p>
                    <p className="text-xs text-label-alternative">{row.planId ?? 'missing plan'}</p>
                  </div>
                  <Badge tone={riskTone(row.marginRisk)}>{fmtCurrency(row.grossMarginUsd)}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Surface>
  )
}

function PricingSimulatorWorkspace({
  scenarios,
  riskCards,
  onAdopt,
}: {
  scenarios: ScenarioResult[]
  riskCards: RiskCard[]
  onAdopt: () => void
}) {
  return (
    <Surface
      eyebrow="What-if simulator"
      title="4. Pricing Simulator"
      description="Flat, credit, cap, and hybrid policies are recalculated against the same imported usage rows. Recommendations cannot be adopted without risk cards."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {scenarios.map(scenario => (
          <div key={scenario.policy} className={`rounded-wds border p-4 ${scenario.policy === 'credit' ? 'border-primary-normal bg-primary-normal/5' : 'border-line-neutral'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">{scenario.policy}</p>
            <p className="mt-2 text-2xl font-bold" translate="no">{fmtPercent(scenario.grossMarginPct)}</p>
            <p className="text-xs text-label-alternative">gross margin</p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between"><span>Revenue</span><strong translate="no">{fmtCurrency(scenario.revenueUsd)}</strong></div>
              <div className="flex justify-between"><span>AI COGS</span><strong translate="no">{fmtCurrency(scenario.monthlyAiCogs)}</strong></div>
              <div className="flex justify-between"><span>Loss customers</span><strong translate="no">{fmtTokens(scenario.lossCustomerCount)}</strong></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-wds border border-status-cautionary/30 bg-status-cautionary/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-status-cautionary">Risk Auditor</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {riskCards.map(card => (
            <div key={card.id} className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="text-sm font-semibold">{card.title}</p>
              <p className="mt-1 text-xs text-label-neutral">{card.impact}</p>
              <p className="mt-2 text-xs text-label-alternative">Evidence: {card.evidenceId}</p>
            </div>
          ))}
        </div>
        <Button className="mt-3" variant="primary" size="sm" onClick={onAdopt} disabled={riskCards.length === 0}>
          Adopt credit scenario
        </Button>
      </div>
    </Surface>
  )
}

function AgentReportWorkspace({ events, showInternal }: { events: AgentEvent[]; showInternal: boolean }) {
  return (
    <div className="rounded-wds-lg border border-line-neutral bg-fill-alternative p-4">
      <h3 className="text-sm font-semibold">Agent interpretation layer</h3>
      <p className="mt-1 text-xs text-label-alternative">
        AI 해석은 결정론적 비용 결과를 설명합니다. 내부 tool ref와 실행 경로는 관리자 모드에서만 표시됩니다.
      </p>
      <div className="mt-3 grid gap-2">
        {events.map(event => (
          <div key={event.type} className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">{event.type.replace('_', ' ')}</p>
            <p className="mt-1 text-sm text-label-neutral">{event.message}</p>
            {showInternal ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {event.toolResultRefs.map(refId => (
                  <ToolRefChip key={refId} refId={refId} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-label-alternative">
                근거 ref는 결정 기록에 저장되며 관리자 모드에서 확인할 수 있습니다.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface WorkspacePanelDefinition {
  key: RoleProjectionPanelKey
  node: ReactNode
}

function orderWorkspacePanels(
  panels: WorkspacePanelDefinition[],
  view: RoleViewModel,
): WorkspacePanelDefinition[] {
  return panels
    .map((panel, index) => ({ panel, index }))
    .sort((left, right) => {
      const leftRank = view.panelOrder.indexOf(left.panel.key)
      const rightRank = view.panelOrder.indexOf(right.panel.key)
      const normalizedLeft = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank
      const normalizedRight = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank
      return normalizedLeft - normalizedRight || left.index - right.index
    })
    .map(item => item.panel)
}

function RoleProjectionPanel({ view }: { view: RoleViewModel }) {
  const visiblePanelOrder = view.panelOrder.filter(panel => panel !== 'debug_refs')

  return (
    <Surface
      data-testid="role-projection-panel"
      eyebrow="Role projection"
      title={view.title}
      description="같은 deterministic snapshot을 역할별 workspace 순서로 재배치합니다. 이 패널은 새 숫자를 계산하지 않습니다."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {view.primaryKpis.map(kpi => (
          <MetricTile key={kpi.id} label={kpi.label} value={kpi.value} />
        ))}
      </div>
      <p className="mt-3 text-xs text-label-alternative">
        현재 역할 기준으로 중앙 workspace 카드가 아래 우선순위에 맞춰 정렬됩니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visiblePanelOrder.map(panel => (
          <Badge key={panel} tone="neutral">
            {ROLE_PROJECTION_PANEL_LABELS[panel]}
          </Badge>
        ))}
        {view.panelOrder.includes('debug_refs') && (
          <Badge tone="caution">{ROLE_PROJECTION_PANEL_LABELS.debug_refs}</Badge>
        )}
      </div>
    </Surface>
  )
}

function RateCardDraftPanel({
  rateCardDraft,
  exportGate,
  decisionHeader,
  showInternal,
}: {
  rateCardDraft: RateCardDraft
  exportGate: ReturnType<typeof canExportOnePageReport>
  decisionHeader: DecisionHeader
  showInternal: boolean
}) {
  const readinessSteps = [
    { label: '초안 생성됨', ready: true },
    { label: exportGate.allowed ? '결정 기록됨' : '결정 기록 필요', ready: exportGate.allowed },
    { label: exportGate.allowed ? 'Report export 가능' : 'Report export 대기', ready: exportGate.allowed },
  ]

  return (
    <section aria-label="Rate card draft" className="mb-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-label-normal">Rate card draft</h3>
        <Badge tone="caution">Draft only</Badge>
      </div>
      <p className="mt-1 text-xs text-label-alternative">
        Stripe/Metronome 같은 billing 시스템은 실행하지 않고, 사람이 검토할 가격표 초안만 만듭니다.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-wds border border-status-positive/30 bg-status-positive/10 p-3">
          <p className="text-xs font-semibold uppercase text-status-positive">무엇인가</p>
          <ul className="mt-2 grid gap-1 text-sm text-label-neutral">
            <li>검토용 가격표 초안</li>
            <li>결정 기록 후 export 가능</li>
          </ul>
        </div>
        <div className="rounded-wds border border-status-cautionary/30 bg-status-cautionary/10 p-3">
          <p className="text-xs font-semibold uppercase text-status-cautionary">무엇이 아닌가</p>
          <ul className="mt-2 grid gap-1 text-sm text-label-neutral">
            <li>실제 청구 실행 아님</li>
            <li>고객에게 자동 적용 아님</li>
          </ul>
        </div>
      </div>
      <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
        <p className="text-xs font-semibold uppercase text-primary-normal">왜 이 초안인가</p>
        <p className="mt-1 text-sm text-label-neutral">
          {decisionHeader.reason} 그래서 {fmtTokens(rateCardDraft.affectedCustomerCount)}개 고객에 대해 {rateCardDraft.policyType} 가격표 초안을 검토합니다.
        </p>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2">
          <dt className="text-xs font-semibold text-label-alternative">Policy type</dt>
          <dd className="mt-1 font-semibold text-label-normal">{rateCardDraft.policyType}</dd>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2">
          <dt className="text-xs font-semibold text-label-alternative">Included credits</dt>
          <dd className="mt-1 font-semibold text-label-normal" translate="no">{fmtTokens(rateCardDraft.includedCredits)}</dd>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2">
          <dt className="text-xs font-semibold text-label-alternative">Overage</dt>
          <dd className="mt-1 font-semibold text-label-normal" translate="no">{fmtCurrency(rateCardDraft.overagePricePerRequest)} / request</dd>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2">
          <dt className="text-xs font-semibold text-label-alternative">Customer cap</dt>
          <dd className="mt-1 font-semibold text-label-normal" translate="no">{fmtCurrency(rateCardDraft.capUsdPerCustomer)}</dd>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2">
          <dt className="text-xs font-semibold text-label-alternative">Affected customers</dt>
          <dd className="mt-1 font-semibold text-label-normal" translate="no">{fmtTokens(rateCardDraft.affectedCustomerCount)}</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
        <p className="text-xs font-semibold uppercase text-primary-normal">Export readiness</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {readinessSteps.map(step => (
            <Badge key={step.label} tone={step.ready ? 'positive' : 'caution'}>
              {step.label}
            </Badge>
          ))}
        </div>
      </div>
      {showInternal && (
        <div className="mt-3 flex flex-wrap gap-1">
          {rateCardDraft.marginBasisRefs.map(refId => (
            <ToolRefChip key={refId} refId={refId} />
          ))}
        </div>
      )}
    </section>
  )
}

function OnePageReportPanel({
  agentRun,
  teamEstimate,
  recommendation,
  decisions,
  riskCards,
  onExport,
  operatingAssetHealth,
  trustInspection,
  formulaVersion,
  providerRegistryVersion,
  snapshotVersion,
  rateCardDraft,
  pricingFreshness,
  decisionHeader,
  showInternal,
}: {
  agentRun: AgentRunResponse
  teamEstimate: TeamCostEstimate
  recommendation?: OptimizationRecommendation
  decisions: Decision[]
  riskCards: RiskCard[]
  onExport: () => void
  operatingAssetHealth: string[]
  trustInspection?: UsageImportSummary['trustInspection']
  formulaVersion: string
  providerRegistryVersion: string
  snapshotVersion: string
  rateCardDraft: RateCardDraft
  pricingFreshness: PricingFreshnessBadge[]
  decisionHeader: DecisionHeader
  showInternal: boolean
}) {
  const dataLimitations = trustInspection?.analysisScope.blocked ?? ['raw prompt was not collected']
  const exportGate = canExportOnePageReport(decisions)
  const onePageReport = buildOnePageReportArtifact({
    title: 'SparkClaw AI Cost Snapshot',
    executiveSummary: 'AI COGS is concentrated in the highest-volume AI team work and requires a human operating decision.',
    metrics: [
      { label: 'Monthly AI team cost', value: fmtCurrency(teamEstimate.monthlyCostUsd) },
      { label: 'Top agent share', value: fmtPercent(teamEstimate.topAgentShare) },
    ],
    recommendations: recommendation ? [recommendation.title] : [],
    risks: riskCards.map(card => card.title),
    refs: [
      ...(agentRun.toolResultRefs.length > 0 ? agentRun.toolResultRefs : ASSISTANT_TOOL_REFS),
      snapshotVersion,
    ],
    trust: {
      status: trustInspection?.status ?? 'unknown',
      dataLimitations,
      retentionNote: trustInspection?.retentionNote ?? 'Raw prompt was not collected for this demo snapshot.',
    },
    formulaVersion,
    providerRegistryVersion,
    snapshotVersion,
    decisionRefs: decisions.map(decision => decision.id),
    decisionChoice: exportGate.decisionChoice,
    rateCardDraft,
    pricingFreshness,
  })
  const artifact = buildReportArtifact({
    audience: 'ceo_cfo',
    headline: 'This customer is unprofitable until AI COGS, routing, and pricing policy are corrected',
    toolResultRefs: agentRun.toolResultRefs.length > 0 ? agentRun.toolResultRefs : ASSISTANT_TOOL_REFS,
    riskCardIds: riskCards.map(card => card.id),
    evidenceRefs: agentRun.evidenceRefs,
    costSummary: `AI team monthly cost: ${fmtCurrency(teamEstimate.monthlyCostUsd)}.`,
    marginSummary: 'Margin review covers loss customers, heavy users, and plan-level gross margin.',
    bottleneckSummary: `Bottleneck review cites top agent share ${fmtPercent(teamEstimate.topAgentShare)}.`,
    optimizationSummary: recommendation
      ? `Optimization candidate: ${recommendation.title} with ${fmtCurrency(recommendation.monthlySavingsUsd)} monthly savings what-if.`
      : 'No optimization candidate selected yet.',
    decisionSummary: decisions[0]
      ? `Decision logged: ${decisions[0].what}.`
      : 'Decision log is waiting for an approval row.',
    operatingAssetHealth,
  })

  return (
    <Surface
      eyebrow="One-page export"
      title="CEO/CFO/PM/Developer Report"
      description="A paid-value one-pager that keeps cost, margin, risk, decision refs, and AI citations together."
      action={<Button size="sm" variant="primary" onClick={onExport} disabled={!exportGate.allowed}>Export one-page report</Button>}
    >
      <div className="rounded-wds-lg border border-line-neutral bg-fill-alternative p-4">
        <section className="mb-3 rounded-wds border border-status-cautionary/30 bg-status-cautionary/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-cautionary">{decisionHeader.title}</p>
          <p className="mt-1 text-sm font-semibold text-label-normal">{decisionHeader.question}</p>
          <p className="mt-1 text-xs text-label-neutral">{decisionHeader.reason}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={decisionHeader.recommendedChoice === 'hold' ? 'caution' : 'positive'}>
              recommended: {decisionHeader.recommendedChoice}
            </Badge>
            {exportGate.allowed ? (
              <Badge tone="positive">decision: {exportGate.decisionChoice}</Badge>
            ) : (
              <Badge tone="caution">decision required</Badge>
            )}
          </div>
        </section>
        {!exportGate.allowed && (
          <p className="mb-3 rounded-wds border border-status-cautionary/30 bg-surface-normal p-3 text-xs text-label-neutral">
            {exportGate.reason}
          </p>
        )}
        <RateCardDraftPanel
          rateCardDraft={rateCardDraft}
          exportGate={exportGate}
          decisionHeader={decisionHeader}
          showInternal={showInternal}
        />
        <h3 className="text-base font-semibold">{artifact.title}</h3>
        <div className="mt-3 grid gap-3">
          {artifact.sections.map(section => (
            <section key={section.title} className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="text-xs font-semibold uppercase text-primary-normal">{section.title}</p>
              <p className="mt-1 text-sm text-label-neutral">
                {showInternal ? section.body : customerSafeReportText(section.body)}
              </p>
            </section>
          ))}
        </div>
        {showInternal ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {artifact.toolResultRefs.map(refId => <ToolRefChip key={refId} refId={refId} />)}
            {artifact.riskCardIds.map(refId => <ToolRefChip key={refId} refId={`risk:${refId}`} />)}
          </div>
        ) : (
          <p className="mt-3 text-xs text-label-alternative">
            내부 ref와 원시 근거는 관리자 모드에서만 표시됩니다. 고객용 보고서는 비용, 마진, 리스크, 결정 요약만 보여줍니다.
          </p>
        )}
        {showInternal && (
        <section className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">Report review gate</p>
          <ul className="mt-2 grid gap-1 text-xs text-label-neutral">
            <li>No raw prompt in report</li>
            <li>No uncited numeric claim</li>
            <li>Provider price source visible</li>
            <li>Formula version visible</li>
          </ul>
          <div className="mt-2 grid gap-1 text-xs text-label-neutral">
            <p>Snapshot allowed: {trustInspection?.allowedForSnapshot ? 'yes' : 'no'}</p>
            <p>Analysis available: {trustInspection?.analysisScope.available.join(', ') || 'none'}</p>
          </div>
          <p translate="no">
            {formulaVersion} / {providerRegistryVersion} / {onePageReport.refs.join(', ')}
          </p>
        </section>
        )}
      </div>
    </Surface>
  )
}

function DecisionLogWorkspace({
  decisions,
  onDelete,
  onExport,
  showInternal,
}: {
  decisions: Decision[]
  onDelete: (id: string) => void
  onExport: () => void
  showInternal: boolean
}) {
  return (
    <Surface
      eyebrow="Local persistence"
      title="6. Decision & Approval Log"
      description="P0 stores adopted decisions plus Operating Ledger rows in localStorage and exports the same JSON shape planned for P1 persistence."
      action={decisions.length > 0 && (
        <Button size="sm" onClick={onExport}>Export JSON</Button>
      )}
    >
      {decisions.length === 0 ? (
        <p className="text-sm text-label-alternative">No adopted decision yet. Adopt a risk-carded pricing scenario to create the first entry.</p>
      ) : (
        <div className="grid gap-3">
          {decisions.map(decision => (
            <div key={decision.id} className="grid gap-3 rounded-wds border border-line-neutral p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-sm font-semibold">{decision.what}</p>
                <Badge tone={decision.kind === 'approve' ? 'positive' : 'primary'}>{decision.kind}</Badge>
                <p className="mt-1 text-xs text-label-neutral">{decision.why}</p>
                <p className="mt-2 text-xs text-label-alternative" translate="no">{decision.createdAt}</p>
                {showInternal && decision.operatingLedger && (
                  <div className="mt-2 rounded-wds border border-primary-normal/20 bg-primary-normal/10 p-2 text-xs text-label-neutral">
                    <p className="font-semibold text-primary-normal">Operating Ledger</p>
                    <p translate="no">workstream: {decision.operatingLedger.workstream}</p>
                    <p>agent: {decision.operatingLedger.agentUsed}</p>
                    <p>human decision: {decision.operatingLedger.humanDecision}</p>
                    <p translate="no">artifact: {decision.operatingLedger.artifactUpdated}</p>
                  </div>
                )}
                {showInternal && decision.agentReview ? (
                  <div className="mt-2 rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs text-label-neutral">
                    <p className="font-semibold text-primary-normal">Agent review</p>
                    <p translate="no">called agents: {decision.agentReview.calledAgentIds.join(', ')}</p>
                    <p translate="no">primary: {decision.agentReview.primaryAgentId ?? 'none'}</p>
                    <p translate="no">reviewers: {decision.agentReview.reviewerAgentIds.join(', ') || 'none'}</p>
                    <p translate="no">used tools: {decision.agentReview.usedCapabilityTools.join(', ') || 'none'}</p>
                    <p translate="no">{decision.agentReview.snapshotVersion}</p>
                    <p>{decision.agentReview.supervisorSummary}</p>
                  </div>
                ) : showInternal ? (
                  <p className="mt-2 text-xs text-label-alternative">legacy decision</p>
                ) : null}
                {showInternal && decision.trustReview && (
                  <div className="mt-2 rounded-wds border border-status-warning/20 bg-status-warning/10 p-2 text-xs text-label-neutral">
                    <p className="font-semibold text-status-warning">Trust review</p>
                    <p translate="no">status: {decision.trustReview.status}</p>
                    <p translate="no">warnings: {decision.trustReview.warnings.join(', ') || 'none'}</p>
                    <p>{decision.trustReview.retentionNote}</p>
                  </div>
                )}
                {showInternal && decision.reportReview && (
                  <div className="mt-2 rounded-wds border border-line-neutral bg-surface-normal p-2 text-xs text-label-neutral">
                    <p className="font-semibold text-primary-normal">Report review</p>
                    <p>No raw prompt: {decision.reportReview.noRawPrompt ? 'yes' : 'no'}</p>
                    <p>No uncited numbers: {decision.reportReview.noUncitedNumbers ? 'yes' : 'no'}</p>
                    <p>Provider source visible: {decision.reportReview.providerSourceVisible ? 'yes' : 'no'}</p>
                    <p>Formula provenance: {decision.reportReview.formulaVersionVisible ? 'yes' : 'no'}</p>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone={decision.aiMode === 'llm_assisted' ? 'positive' : 'neutral'}>{decision.aiMode}</Badge>
                  {showInternal && (
                    <>
                      <Badge tone="neutral">
                        policy {String((decision.thresholdSnapshot as ThresholdPolicy | undefined)?.gross_margin_thin_pct?.policyVersion ?? 'legacy')}
                      </Badge>
                      <Badge tone={decision.factSourceSnapshot.length > 0 ? 'primary' : 'neutral'}>
                        fact sources {decision.factSourceSnapshot.length}
                      </Badge>
                    </>
                  )}
                </div>
                {showInternal && (
                <details className="mt-2 rounded-wds bg-fill-alternative p-2 text-xs text-label-neutral">
                  <summary className="cursor-pointer font-semibold">Snapshot details</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <p translate="no">assumptions: {Object.keys(decision.assumptions).join(', ') || 'none'}</p>
                    <p translate="no">performanceSnapshot: {Object.keys(decision.performanceSnapshot).join(', ') || 'none'}</p>
                    <p translate="no">costSnapshot: {Object.keys(decision.costSnapshot).join(', ') || 'none'}</p>
                    <p translate="no">thresholdSnapshot: {Object.keys(decision.thresholdSnapshot).join(', ') || 'none'}</p>
                    <p translate="no">factSourceSnapshot: {decision.factSourceSnapshot.length}</p>
                    <p translate="no">tool refs: {decision.toolResultRefs.join(', ') || 'none'}</p>
                  </div>
                </details>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => onDelete(decision.id)}>
                Delete decision
              </Button>
            </div>
          ))}
        </div>
      )}
    </Surface>
  )
}

function TeamCostDemoPathPanel({ savedDecisionCount }: { savedDecisionCount: number }) {
  return (
    <Surface
      eyebrow="PRD demo path"
      title="0. 9-step walkthrough"
      description="1-person founders can finish the path from company/work input to the Decision & Approval Log."
    >
      <div className="grid gap-2 md:grid-cols-3">
        {TEAM_COST_DEMO_STEPS.map((step, index) => (
          <div key={step} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-label-normal">{step}</p>
              <Badge tone={index < 8 || savedDecisionCount > 0 ? 'positive' : 'caution'}>
                {index < 8 || savedDecisionCount > 0 ? 'ready' : 'needs save'}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  )
}

function ToolRefChip({ refId }: { refId: string }) {
  return (
    <span
      className="inline-flex rounded-wds-sm border border-primary-normal/20 bg-primary-normal/10 px-2 py-1 text-[11px] font-semibold text-primary-normal"
      translate="no"
    >
      {refId}
    </span>
  )
}

function customerSafeAgentText(text: string): string {
  return text
    .replace(/\b(?:tool|asset|snapshot|risk|evidence|decision):[^\s,.)]+/g, '저장된 근거')
    .replace(/agentic runtime unavailable/gi, 'AI 해석은 저장된 비용 근거를 기준으로 표시됩니다')
}

function customerSafeReportText(text: string): string {
  if (text.includes('Deterministic refs:')) {
    return `${text.split(' Deterministic refs:')[0]} 계산 근거는 관리자 감사 기록에 저장됩니다.`
  }
  if (text.includes('Risk refs:')) {
    return '리스크 근거는 관리자 감사 기록에 저장됩니다.'
  }
  return customerSafeAgentText(text)
    .replace(/\s*Evidence refs:.*$/i, ' 근거 기록은 관리자 감사 기록에 저장됩니다.')
}

function LifecycleNavigation({
  activeStage,
  operatingAgents,
  selectedAgentId,
  savedDecisionCount,
  showInternal,
  onStageChange,
  onAgentSelect,
  onRunAllHands,
  onOpenFrontFitCheck,
  onOpenFrontDataGate,
  onOpenFrontSampleReport,
}: {
  activeStage: DecisionStageId
  operatingAgents: OperatingAgent[]
  selectedAgentId: OperatingAgentId | null
  savedDecisionCount: number
  showInternal: boolean
  onStageChange: (stage: DecisionStageId) => void
  onAgentSelect: (agentId: OperatingAgentId) => void
  onRunAllHands: () => void
  onOpenFrontFitCheck: () => void
  onOpenFrontDataGate: () => void
  onOpenFrontSampleReport: () => void
}) {
  return (
    <aside data-testid="lifecycle-nav" className="montage-console-left">
      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <p className="text-xs font-semibold uppercase text-primary-normal">Decision flow</p>
        <p className="mt-2 text-sm font-semibold text-label-normal">
          Design -&gt; Cost -&gt; Bottleneck -&gt; Optimize + Risk -&gt; Decision Log
        </p>
        <div data-testid="decision-stage-nav" className="mt-4 grid gap-2">
          {DECISION_STAGES.map(stage => (
            <button
              key={stage.id}
              type="button"
              aria-pressed={activeStage === stage.id}
              onClick={() => onStageChange(stage.id)}
              className={`rounded-wds border px-3 py-2 text-left text-sm transition-colors ${
                activeStage === stage.id
                  ? 'border-primary-normal bg-primary-normal text-white'
                  : 'border-line-neutral bg-fill-alternative text-label-neutral hover:bg-fill-normal'
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {showInternal && (
        <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-primary-normal">PRD 9-step path</p>
            <Badge tone={savedDecisionCount > 0 ? 'positive' : 'caution'}>
              {savedDecisionCount > 0 ? 'logged' : 'open'}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {TEAM_COST_DEMO_STEPS.map((step, index) => (
              <p key={step} className="rounded-wds bg-fill-alternative px-2 py-1.5 text-xs text-label-neutral">
                Step {index + 1}: {step.replace(/^\d+\.\s*/, '')}
              </p>
            ))}
          </div>
        </div>
      )}

      {showInternal && (
        <OperatingTeamPanel
          operatingAgents={operatingAgents}
          selectedAgentId={selectedAgentId}
          onAgentSelect={onAgentSelect}
          onRunAllHands={onRunAllHands}
        />
      )}

      {showInternal && (
        <FrontOperatingPanel
          context={AGENTCOST_FRONT_OPERATING_SYSTEM}
          onOpenFitCheck={onOpenFrontFitCheck}
          onOpenDataGate={onOpenFrontDataGate}
          onOpenSampleReport={onOpenFrontSampleReport}
        />
      )}
    </aside>
  )
}

function DecisionWorkspaceIntro({
  activeStage,
  remoteBackendStatus,
  remoteBackendMessage,
  workspaceId,
  showInternal,
  onOpenTeamCost,
}: {
  activeStage: DecisionStageId
  remoteBackendStatus: RemoteBackendStatus
  remoteBackendMessage: string
  workspaceId: string
  showInternal: boolean
  onOpenTeamCost: () => void
}) {
  const stage = DECISION_STAGES.find(item => item.id === activeStage) ?? DECISION_STAGES[0]

  return (
    <section className="rounded-wds-lg border border-line-neutral bg-surface-normal p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-normal">Workspace</p>
          <h2 data-testid="active-decision-stage" className="mt-2 text-2xl font-semibold text-label-normal">
            {stage.label}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-label-neutral" lang="en">
            {stage.description}
          </p>
          <p className="mt-3 max-w-3xl rounded-wds border border-line-neutral bg-fill-alternative p-3 text-sm text-label-neutral" lang="en">
            Next decision: {stage.nextDecision}
          </p>
        </div>
        <div className="grid gap-2 text-sm lg:min-w-64">
          {showInternal && (
            <>
              <Badge tone={remoteBackendStatus === 'connected' ? 'positive' : remoteBackendStatus === 'fallback' ? 'caution' : 'neutral'}>
                {remoteBackendStatus}
              </Badge>
              <p className="text-label-neutral">{remoteBackendMessage}</p>
              <p className="text-xs text-label-alternative" translate="no">workspaceId: {workspaceId}</p>
            </>
          )}
          <Button variant="primary" onClick={onOpenTeamCost}>
            AI Team Cost Simulator
          </Button>
        </div>
      </div>
    </section>
  )
}

function CustomerDashboardEntryPanel({
  dashboard,
  onRunSample,
  onUploadUsage,
  onOpenWorkspace,
}: {
  dashboard: CustomerWorkspaceDashboard
  onRunSample: () => void
  onUploadUsage: () => void
  onOpenWorkspace: () => void
}) {
  const handlers: Record<CustomerWorkspaceDashboard['ctas'][number]['action'], () => void> = {
    load_sample: onRunSample,
    upload_usage: onUploadUsage,
    open_workspace: onOpenWorkspace,
  }

  return (
    <section data-testid="customer-dashboard-entry" className="rounded-wds-lg border border-line-neutral bg-surface-normal p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-normal">고객용 웹앱</p>
          <h2 className="mt-2 text-2xl font-semibold text-label-normal">{dashboard.heroTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-label-neutral">
            한 화면에서 샘플 실행, usage 업로드, 월간 리뷰, 의사결정 기록까지 바로 이어집니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge tone="positive">최신 Google Gemini 3.5 Flash 단가 반영</Badge>
            <Badge tone="neutral">가격 출처 확인일: 2026-05-24</Badge>
            <Badge tone="caution">Gemini Omni / 비디오 비용은 공식 API 단가 확인 필요</Badge>
            <Badge tone="neutral">사용자 단가 입력 시 시나리오 계산 가능</Badge>
          </div>
        <p className="mt-2 text-xs text-label-alternative">
          고객 기본 화면에는 내부 실행 식별자와 기술 감사 정보를 노출하지 않습니다.
        </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {dashboard.ctas.map(cta => (
            <Button
              key={cta.id}
              size="sm"
              variant={cta.id === 'run_sparkclaw_sample' ? 'primary' : 'secondary'}
              onClick={handlers[cta.action]}
            >
              {cta.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {dashboard.sections.map(section => (
          <div key={section.id} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-label-normal">{section.label}</p>
              {section.count !== null && <Badge tone="neutral">{fmtTokens(section.count)}</Badge>}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-label-alternative">{section.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function P1SdkLitePanel({
  state,
  showInternal,
  onSendClean,
  onSendBlocked,
}: {
  state: SdkLitePanelState
  showInternal: boolean
  onSendClean: () => void
  onSendBlocked: () => void
}) {
  const blockedFields = state.normalized?.excludedFields ?? []
  const findings = state.normalized?.trustInspection.warnings ?? []
  const statusTone = state.status === 'accepted' ? 'positive' : state.status === 'blocked' ? 'negative' : 'neutral'

  return (
    <section data-testid="p1-sdk-lite-panel" className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-normal">P1 product connection</p>
          <h2 className="mt-1 text-base font-semibold text-label-normal">SDK-lite event ingest</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-label-alternative">
            Send a minimal usage event through the Trust pipeline before it can enter a deterministic snapshot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={onSendClean}>Send clean SDK event</Button>
          <Button size="sm" variant="secondary" onClick={onSendBlocked}>Send blocked SDK event</Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricTile label="Trust status" value={sdkLiteStatusCopy(state)} tone={statusTone} />
        <MetricTile label="Snapshot gate" value={state.snapshotAllowed ? 'snapshot 가능' : 'snapshot 불가'} tone={state.snapshotAllowed ? 'positive' : 'caution'} />
        <MetricTile label="Recent ingest history" value={fmtTokens(state.history.length)} />
      </div>

      {state.status === 'blocked' && (
        <p className="mt-3 rounded-wds border border-status-negative/20 bg-status-negative/10 p-3 text-sm text-label-neutral">
          This event was blocked before snapshot creation because it included sensitive raw fields.
          {showInternal && blockedFields.length > 0 ? ` Blocked fields: ${blockedFields.join(', ')}` : ''}
        </p>
      )}

      {state.history.length > 0 && (
        <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">Recent ingest history</p>
          <ul className="mt-2 grid gap-1 text-xs text-label-neutral">
            {state.history.slice(0, 5).map((item, index) => (
              <li key={`${item.eventRef}-${item.ingestedAt}`} translate="no">
                {showInternal ? item.eventRef : `event ${index + 1}`} / {item.ingestedAt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showInternal && (
        <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">SDK-lite internal metadata</p>
          <p className="mt-1 text-xs text-label-neutral" translate="no">persistence: {state.persistence}</p>
          {state.eventRef && <p className="mt-1 text-xs text-label-neutral" translate="no">eventRef: {state.eventRef}</p>}
          {state.error && <p className="mt-1 text-xs text-label-neutral" translate="no">error: {state.error}</p>}
          {state.normalized && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-wds bg-surface-normal p-2 text-[11px] text-label-neutral" translate="no">
              {JSON.stringify({
                normalizedEvent: state.normalized.normalizedEvent,
                excludedFields: state.normalized.excludedFields,
                findings,
                blockedFields,
              }, null, 2)}
            </pre>
          )}
        </div>
      )}
    </section>
  )
}

function P1RagEvidencePanel({
  state,
  showInternal,
  onRun,
}: {
  state: P1RagEvidencePanelState
  showInternal: boolean
  onRun: () => void
}) {
  const refs = allRagRefs(state.evidence)
  const warnings = allRagWarnings(state.evidence)

  return (
    <section data-testid="p1-rag-evidence-panel" className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-normal">RAG evidence</p>
          <h2 className="mt-1 text-base font-semibold text-label-normal">P1 RAG evidence check</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-label-alternative">
            Evidence retrieval is ready. Official numbers still come from the Fact Ledger and deterministic engine.
          </p>
        </div>
        {showInternal && <Button size="sm" variant="secondary" onClick={onRun}>Run P1 RAG evidence check</Button>}
      </div>

      {!showInternal ? (
        <p className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-sm text-label-neutral">
          근거 검색 준비됨. 공식 숫자는 Fact Ledger 기준이며 RAG는 설명과 근거 조회만 담당합니다.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">official_docs</Badge>
            <Badge tone="neutral">benchmark_evidence</Badge>
            <Badge tone="neutral">decision_history</Badge>
            <Badge tone="primary">mayOverrideFacts: false</Badge>
            {state.persistence !== 'not_checked' && <Badge tone="neutral">persistence: {state.persistence}</Badge>}
          </div>
          {refs.length > 0 && (
            <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
              <p className="text-xs font-semibold uppercase text-primary-normal">Refs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {refs.map(ref => <Badge key={ref} tone="neutral">{ref}</Badge>)}
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
              <p className="text-xs font-semibold uppercase text-status-cautionary">Warnings</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {warnings.map(warning => <Badge key={warning} tone="caution">{warning}</Badge>)}
              </div>
            </div>
          )}
          {state.metadata && (
            <p className="text-xs text-label-alternative" translate="no">
              RAG route metadata: {state.metadata.workspaceId} / {state.metadata.query}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function DecisionAssistantPanel({
  activeStage,
  teamEstimate,
  recommendations,
  riskCards,
  events,
  agentRun,
  roleProjection,
  operatingAgents,
  llmMode,
  savedDecisionCount,
  thresholdPolicy,
  showInternal,
  onThresholdOverride,
  onAdopt,
  onReject,
  onHold,
}: {
  activeStage: DecisionStageId
  teamEstimate: TeamCostEstimate
  recommendations: OptimizationRecommendation[]
  riskCards: RiskCard[]
  events: TeamCostGraphEvent[]
  agentRun: AgentRunResponse
  roleProjection: RoleViewModel
  operatingAgents: OperatingAgent[]
  llmMode: TeamCostLlmMode
  savedDecisionCount: number
  thresholdPolicy: ThresholdPolicy
  showInternal: boolean
  onThresholdOverride: (id: ThresholdId, value: number) => void
  onAdopt: () => void
  onReject: () => void
  onHold: () => void
}) {
  const recommendation = recommendations[0]
  const assistantRefs = recommendation
    ? [...new Set([...ASSISTANT_TOOL_REFS, ...roleProjection.assistant.refs, ...recommendation.toolResultRefs, ...agentRun.toolResultRefs])]
    : [...new Set([...ASSISTANT_TOOL_REFS, ...roleProjection.assistant.refs])]
  const displayMode = agentRun.llmMode === 'provider-llm' || llmMode === 'provider-llm'
    ? 'LLM assisted'
    : 'Deterministic fallback'
  const agentLabel = (agentId: string | null | undefined) => {
    const agent = operatingAgents.find(item => item.id === agentId)
    return agent?.label ?? agentId ?? 'Unassigned agent'
  }
  const calledAgentLabel = agentRun.calledAgentIds.length === operatingAgents.length
    ? `${agentRun.calledAgentIds.length} agents`
    : agentRun.calledAgentIds.map(agentLabel).join(', ')
  const executionModeLabel = typeof agentRun.agentRoute.executionMode === 'string'
    ? agentRun.agentRoute.executionMode
    : ''
  const supervisorText = showInternal
    ? (agentRun.supervisorSummary || agentRun.answer)
    : customerSafeAgentText(agentRun.supervisorSummary || agentRun.answer)
  const stageAnswerText = showInternal
    ? agentRun.answer
    : customerSafeAgentText(agentRun.answer)
  const warningText = showInternal
    ? agentRun.warnings[0]
    : 'AI 해석은 저장된 비용 근거를 기준으로 표시됩니다.'

  return (
    <aside data-testid="decision-assistant-panel" className="montage-console-right">
      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">{roleProjection.assistant.title}</p>
          <Badge tone={displayMode === 'LLM assisted' ? 'positive' : 'neutral'}>
            {displayMode}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {showInternal && <Badge tone="primary">Agentic RAG</Badge>}
          <Badge tone="neutral">{activeStage}</Badge>
          {showInternal && executionModeLabel && (
            <Badge tone="neutral">{executionModeLabel}</Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-label-neutral" lang="en">
          {roleProjection.assistant.focus} It can explain refs, risk, and next decisions, but it does not create cost numbers.
        </p>
        <div className="mt-3 rounded-wds border border-primary-normal/20 bg-primary-normal/10 p-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">Supervisor synthesis</p>
          <p className="mt-1 text-sm text-label-neutral">{supervisorText}</p>
          {showInternal && (
            <p className="mt-2 text-xs text-label-alternative" translate="no">
              decision readiness: {agentRun.decisionReadiness}
            </p>
          )}
          {showInternal && agentRun.disagreements.length > 0 && (
            <div className="mt-2 rounded-wds border border-line-neutral bg-surface-normal p-2">
              <p className="text-xs font-semibold text-label-alternative">Reviewer notes</p>
              <ul className="mt-1 grid gap-1 text-xs text-label-neutral">
                {agentRun.disagreements.slice(0, 3).map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {showInternal && agentRun.nextQuestions.length > 0 && (
            <div className="mt-2 rounded-wds border border-line-neutral bg-surface-normal p-2">
              <p className="text-xs font-semibold text-label-alternative">Next questions</p>
              <ul className="mt-1 grid gap-1 text-xs text-label-neutral">
                {agentRun.nextQuestions.slice(0, 3).map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-3 rounded-wds border border-primary-normal/20 bg-primary-normal/10 p-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">Stage answer</p>
          <p className="mt-1 text-sm text-label-neutral">{stageAnswerText}</p>
          {showInternal && agentRun.calledAgentIds.length > 0 && (
            <div className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-2">
              <p className="text-xs font-semibold uppercase text-primary-normal">Called agents</p>
              <p className="mt-1 text-xs text-label-neutral">{calledAgentLabel}</p>
              <p className="mt-1 text-xs text-label-alternative">
                primary: {agentLabel(agentRun.primaryAgentId)}
                {agentRun.reviewerAgentIds.length > 0 && ` | reviewers: ${agentRun.reviewerAgentIds.map(agentLabel).join(', ')}`}
              </p>
              {agentRun.snapshotVersion && (
                <p className="mt-1 text-xs text-label-alternative" translate="no">{agentRun.snapshotVersion}</p>
              )}
            </div>
          )}
          {showInternal && agentRun.usedTools.length > 0 && (
            <p className="mt-2 text-xs text-label-alternative" translate="no">
              used tools: {agentRun.usedTools.join(', ')}
            </p>
          )}
          {agentRun.warnings.length > 0 && (
            <p className="mt-2 text-xs text-status-cautionary">{warningText}</p>
          )}
        </div>
        <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-xs font-semibold text-label-alternative">Current monthly cost</p>
          <p data-testid="assistant-monthly-cost" className="mt-1 text-xl font-semibold text-label-normal" translate="no">
            {fmtCurrency(teamEstimate.monthlyCostUsd)}
          </p>
          <p className="mt-1 text-xs text-label-alternative" translate="no">
            top agent share {fmtPercent(teamEstimate.topAgentShare)}
          </p>
        </div>
        {showInternal ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {assistantRefs.slice(0, 6).map(refId => (
              <ToolRefChip key={refId} refId={refId} />
            ))}
            {agentRun.riskCardIds.slice(0, 3).map(refId => (
              <ToolRefChip key={refId} refId={`risk:${refId}`} />
            ))}
            {agentRun.evidenceRefs.slice(0, 3).map(refId => (
              <ToolRefChip key={refId} refId={`evidence:${refId}`} />
            ))}
            {agentRun.assetRefs.slice(0, 6).map(refId => (
              <ToolRefChip key={refId} refId={refId} />
            ))}
            {[...new Set(agentRun.events.flatMap(event => event.usedCapabilityTools ?? []))].slice(0, 4).map(toolName => (
              <ToolRefChip key={`capability-${toolName}`} refId={`tool:${toolName}`} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-label-alternative">
            근거와 실행 경로는 결정 기록에 저장됩니다. 내부 ref는 관리자 모드에서만 표시됩니다.
          </p>
        )}
      </div>

      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <p className="text-xs font-semibold uppercase text-primary-normal">Judgment policy</p>
        <p className="mt-2 text-xs text-label-neutral" lang="en">
          Thresholds are policy defaults, not hidden code constants. Changes recompute deterministic flags.
        </p>
        <div className="mt-3 grid gap-3">
          {[
            ['gross_margin_thin_pct', 'Thin margin below'] as const,
            ['retry_rate_pct', 'Retry rate above'] as const,
            ['top_agent_concentration_pct', 'Top agent share above'] as const,
          ].map(([id, label]) => {
            const threshold = getThreshold(thresholdPolicy, id)
            return (
              <label key={id} className="grid gap-1 text-xs text-label-neutral">
                <span className="flex items-center justify-between gap-2">
                  <span>{label}</span>
                  <span translate="no">{fmtPercent(threshold.currentValue)}</span>
                </span>
                <input
                  aria-label={label}
                  className="w-full accent-primary-normal"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(threshold.currentValue * 100)}
                  onChange={event => onThresholdOverride(id, Number(event.currentTarget.value) / 100)}
                />
                <span className="text-label-alternative" translate="no">basis:{threshold.sourceType}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-wds-lg border border-status-cautionary/30 bg-status-cautionary/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase text-status-cautionary">Risk Card</p>
          <Badge tone={riskCards.length > 0 ? 'caution' : 'neutral'}>{riskCards.length}</Badge>
        </div>
        {riskCards[0] ? (
          <div className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-sm font-semibold text-label-normal">{riskCards[0].title}</p>
            <p className="mt-1 text-xs text-label-neutral">{riskCards[0].impact}</p>
            {showInternal && (
              <p className="mt-2 text-xs text-label-alternative" translate="no">risk:{riskCards[0].id}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-label-alternative">No risk card is linked, so adoption remains blocked.</p>
        )}
      </div>

      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <p className="text-xs font-semibold uppercase text-primary-normal">Decision controls</p>
        {recommendation && (
          <p className="mt-2 text-sm text-label-neutral">{recommendation.title}</p>
        )}
        <div className="mt-3 grid gap-2">
          <Button size="sm" variant="primary" onClick={onAdopt} disabled={!recommendation || riskCards.length === 0}>
            Adopt top recommendation
          </Button>
          <Button size="sm" variant="secondary" onClick={onReject} disabled={!recommendation}>
            Reject top recommendation
          </Button>
          <Button size="sm" variant="secondary" onClick={onHold} disabled={!recommendation}>
            Hold top recommendation
          </Button>
        </div>
        <p className="mt-3 text-xs text-label-alternative">
          Decision Log entries saved: {savedDecisionCount}
        </p>
      </div>

      {showInternal && (
      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <p className="text-xs font-semibold uppercase text-primary-normal">Agent events</p>
        <div className="mt-3 grid gap-2">
          {events.slice(0, 4).map((event, index) => (
            <div key={`${event.type}-${index}`} className="rounded-wds bg-fill-alternative p-2">
              <p className="text-xs font-semibold text-label-normal">{event.type}</p>
              <p className="mt-1 text-xs text-label-neutral">{event.message}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {event.toolResultRefs.slice(0, 3).map(refId => (
                  <ToolRefChip key={refId} refId={refId} />
                ))}
              </div>
            </div>
          ))}
          {agentRun.events.slice(0, 4).map((event, index) => (
            <div key={`agent-run-${event.agentId ?? event.type}-${index}`} className="rounded-wds bg-fill-alternative p-2">
              <p className="text-xs font-semibold text-label-normal">{agentLabel(event.agentId)}</p>
              <p className="mt-1 text-xs text-label-neutral">{event.message}</p>
              <p className="mt-1 text-xs text-label-alternative" translate="no">{event.calledAgentTool}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(event.toolResultRefs ?? []).slice(0, 3).map(refId => (
                  <ToolRefChip key={refId} refId={refId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </aside>
  )
}

function WedgeADecisionLogPanel({
  decisions,
  onDelete,
  showInternal,
}: {
  decisions: Decision[]
  onDelete: (id: string) => void
  showInternal: boolean
}) {
  const wedgeDecisions = decisions.filter(decision => (
    decision.what.includes('AI team cost')
    || decision.what.includes('Human Operating Decision')
    || decision.what.includes('team-cost')
    || decision.toolResultRefs.some(ref => String(ref).includes('optimization'))
  ))

  return (
    <Surface
      eyebrow="Operating decision log"
      title="5. Decision & Approval Log"
      description="Adopt/reject decisions, operating kind, risk cards, assumptions, performance snapshots, and cost snapshots stay together."
    >
      {wedgeDecisions.length === 0 ? (
        <p className="text-sm text-label-alternative">
          No operating decisions yet. Adopt, reject, or record a Human Operating Decision in Screen 4.
        </p>
      ) : (
        <div className="grid gap-3">
          {wedgeDecisions.map(decision => (
            <div key={decision.id} className="rounded-wds border border-line-neutral p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{decision.what}</p>
                    <Badge tone={decision.status === 'adopted' ? 'positive' : 'caution'}>{decision.status}</Badge>
                    <Badge tone={decision.kind === 'approve' ? 'positive' : 'primary'}>{decision.kind}</Badge>
                    {decision.decisionChoice && (
                      <Badge tone={decision.decisionChoice === 'adopt' ? 'positive' : 'caution'}>
                        decision: {decision.decisionChoice}
                      </Badge>
                    )}
                    <Badge tone={decision.aiMode === 'llm_assisted' ? 'positive' : 'neutral'}>{decision.aiMode}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-label-neutral">{decision.why}</p>
                  <p className="mt-2 text-xs text-label-alternative" translate="no">{decision.createdAt}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onDelete(decision.id)}>
                  Delete operating decision
                </Button>
              </div>
              {showInternal ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-wds bg-fill-alternative p-2">
                  <p className="text-xs font-semibold text-label-neutral">Risk cards</p>
                  <p className="mt-1 text-xs text-label-alternative" translate="no">{decision.riskCards.join(', ')}</p>
                </div>
                <div className="rounded-wds bg-fill-alternative p-2">
                  <p className="text-xs font-semibold text-label-neutral">Tool refs</p>
                  <p className="mt-1 text-xs text-label-alternative" translate="no">{decision.toolResultRefs.join(', ')}</p>
                </div>
                <div className="rounded-wds bg-fill-alternative p-2 text-xs text-label-neutral">
                  <p className="font-semibold">Ledger snapshots</p>
                  <p className="mt-1" translate="no">performanceSnapshot: {Object.keys(decision.performanceSnapshot).join(', ') || 'none'}</p>
                  <p translate="no">costSnapshot: {Object.keys(decision.costSnapshot).join(', ') || 'none'}</p>
                  <p translate="no">thresholdSnapshot: {Object.keys(decision.thresholdSnapshot).join(', ') || 'none'}</p>
                  <p translate="no">factSourceSnapshot: {decision.factSourceSnapshot.length}</p>
                </div>
              </div>
              ) : (
                <div className="mt-3 rounded-wds bg-fill-alternative p-2 text-xs text-label-neutral">
                  상세 감사 근거는 결정 기록에 저장되고 관리자 모드에서만 표시됩니다.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Surface>
  )
}

function ActualUsagePerformanceLogsPanel({
  usageSnapshotRef,
  usageHistory,
  calibration,
  canApplyCalibration,
  weeklyReportRun,
  onGenerateCalibration,
  onApplyCalibration,
  onCreateWeeklyReport,
}: {
  usageSnapshotRef: string | null
  usageHistory: RemoteUsageHistoryEntry[]
  calibration: TeamCostCalibration | null
  canApplyCalibration: boolean
  weeklyReportRun: WeeklyReportRun | null
  onGenerateCalibration: () => void
  onApplyCalibration: () => void
  onCreateWeeklyReport: () => void
}) {
  const planned = calibration?.plannedCallsPerDay ?? 50
  const actual = calibration?.actualCallsPerDay ?? 180
  const retryPressure = calibration ? `+${Math.round(calibration.retryShare * 100)}%` : '+24%'

  return (
    <Surface
      eyebrow="Plan vs Actual calibration"
      title="Actual Usage & Performance Logs"
      description="Actual usage and performance logs calibrate the next AgentSpec without letting AI invent numbers."
      action={(
        <Button size="sm" variant="secondary" onClick={onGenerateCalibration}>
          Generate calibration proposal
        </Button>
      )}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Plan" value={`${planned} calls/day`} help={`planned ${planned} calls/day`} tone="neutral" />
        <MetricTile label="Actual" value={`${actual} calls/day`} help={`actual ${actual} calls/day`} tone="negative" />
        <MetricTile label="Retry pressure" value={retryPressure} help="retry and failed rows increase review pressure" tone="caution" />
        <MetricTile label="Next spec" value="Update" help="next week AgentSpec update" tone="primary" />
      </div>
      <div className="mt-4 rounded-wds border border-line-neutral bg-fill-alternative p-3">
        <p className="text-sm font-semibold text-label-normal">Calibration loop</p>
        <p className="mt-1 text-sm text-label-neutral">
          Plan starts from expected agent calls. Actual logs can show higher demand, retries, or a bottleneck task,
          then propose calls_per_run, cache, review gate, and model routing updates for the next AgentSpec.
        </p>
        {usageSnapshotRef && (
          <p className="mt-2 text-xs text-label-alternative" translate="no">
            Server usage history saved: {usageSnapshotRef}
          </p>
        )}
        {usageHistory.length > 0 && (
          <p className="mt-1 text-xs text-label-alternative">
            Latest server import: {fmtTokens(usageHistory[0].requestCount)} requests
          </p>
        )}
        {calibration && (
          <div className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-sm font-semibold">Calibration proposal</p>
            <p className="mt-1 text-xs text-label-neutral">
              Bottleneck: {calibration.bottleneckTask} / actual {calibration.actualCallsPerDay} calls/day.
            </p>
            <p className="mt-1 text-xs text-label-alternative" translate="no">
              Patch: callsPerRun {calibration.suggestedAgentSpecPatch.callsPerRun},
              cache {fmtPercent(calibration.suggestedAgentSpecPatch.cacheHitRate)},
              review {calibration.suggestedAgentSpecPatch.humanReviewGate}
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="primary"
              onClick={onApplyCalibration}
              disabled={!canApplyCalibration}
            >
              Apply calibration proposal
            </Button>
            {!canApplyCalibration && (
              <p className="mt-2 text-xs text-label-alternative">
                Record a Human Operating Decision before applying this proposal.
              </p>
            )}
          </div>
        )}
        <div className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Weekly report draft</p>
              <p className="text-xs text-label-alternative">
                Creates a draft only. External sending stays out of P1.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={onCreateWeeklyReport}>
              Create weekly report draft
            </Button>
          </div>
          {weeklyReportRun && (
            <p className="mt-2 text-xs text-label-alternative" translate="no">
              Weekly report draft {weeklyReportRun.period}: {weeklyReportRun.snapshotRefs.configSnapshotRef}
              {' '} / {weeklyReportRun.snapshotRefs.usageSnapshotRef}
            </p>
          )}
        </div>
      </div>
    </Surface>
  )
}

function App() {
  const { t, i18n } = useTranslation()
  const showInternal = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('debug') === '1' || params.get('mode') === 'admin'
  }, [])
  const [workspaceId] = useState(loadWorkspaceId)
  const [remoteBackendStatus, setRemoteBackendStatus] = useState<RemoteBackendStatus>('checking')
  const [remoteBackendMessage, setRemoteBackendMessage] = useState('Checking P1 backend persistence')
  const [sdkLitePanel, setSdkLitePanel] = useState<SdkLitePanelState>(EMPTY_SDK_LITE_PANEL_STATE)
  const [p1RagEvidencePanel, setP1RagEvidencePanel] = useState<P1RagEvidencePanelState>(EMPTY_P1_RAG_EVIDENCE_STATE)
  const [importedUsage, setImportedUsage] = useState<UsageImportSummary | null>(null)
  const [usageSnapshotRef, setUsageSnapshotRef] = useState<string | null>(null)
  const [usageHistory, setUsageHistory] = useState<RemoteUsageHistoryEntry[]>([])
  const [teamCostCalibration, setTeamCostCalibration] = useState<TeamCostCalibration | null>(null)
  const [hasOperatingDecisionForCalibration, setHasOperatingDecisionForCalibration] = useState(false)
  const [weeklyReportRun, setWeeklyReportRun] = useState<WeeklyReportRun | null>(null)
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [showTeamCostSimulator, setShowTeamCostSimulator] = useState(false)
  const [activeDecisionStage, setActiveDecisionStage] = useState<DecisionStageId>('design')
  const [teamCostAgents, setTeamCostAgents] = useState<AgentSpec[]>(cloneAgentCatalog)
  const [teamCostEvents, setTeamCostEvents] = useState<TeamCostGraphEvent[]>([])
  const [teamCostLlmMode, setTeamCostLlmMode] = useState<TeamCostLlmMode>('deterministic-fallback')
  const [agentRun, setAgentRun] = useState<AgentRunResponse>(EMPTY_AGENT_RUN_RESPONSE)
  const [requestedOperatingAgentId, setRequestedOperatingAgentId] = useState<OperatingAgentId | null>(null)
  const [agentExecutionMode, setAgentExecutionMode] = useState<AgentRunExecutionMode>('stage_committee')
  const [thresholdPolicy, setThresholdPolicy] = useState<ThresholdPolicy>(DEFAULT_THRESHOLD_POLICY)
  const [teamCostWorkItems, setTeamCostWorkItems] = useState<WorkCatalogItem[]>(() => (
    DEFAULT_TEAM_COST_WORK_ITEMS.map(item => ({ ...item }))
  ))
  const [teamCostDeliverables] = useState<Deliverable[]>(() => (
    DEFAULT_AI_TEAM_DELIVERABLES.map(deliverable => ({ ...deliverable }))
  ))
  const [teamCostAccountability, setTeamCostAccountability] = useState<AgentAccountability[]>(() => (
    createDefaultAgentAccountability(AI_TEAM_AGENT_CATALOG)
  ))
  const [operatingDecisionKind, setOperatingDecisionKind] = useState<OperatingDecisionKind>('automate')
  const [operatingDecisionReason, setOperatingDecisionReason] = useState(
    'Pass rate is stable enough for automation',
  )
  const [teamCostCompanyProfile, setTeamCostCompanyProfile] = useState<TeamCostCompanyProfile>(() => ({
    companyType: '1-person B2B SaaS',
    stage: 'MVP',
    monthlyBudgetUsd: 300,
    locale: (i18n.language === 'ko' ? 'ko' : 'en'),
  }))
  const [decisions, setDecisions] = useState<Decision[]>(() => {
    if (typeof window === 'undefined') return []
    return loadDecisionLog()
  })
  const remoteDecisionStore = useMemo(
    () => createRemoteDecisionStore({ workspaceId }),
    [workspaceId],
  )
  const [state, setState] = useState<PlannerState>(() => {
    const defaultPreset = USE_CASE_PRESETS[0]
    const urlConfig = loadConfigFromUrl()
    if (urlConfig) {
      const current = getModelById(urlConfig.state.currentModelId)
      const candidate = getModelById(urlConfig.state.candidateModelId)
      if (current && candidate) {
        return {
          role: urlConfig.state.role,
          currentModel: current,
          candidateModel: candidate,
          period: urlConfig.state.period,
          inputMode: 'directTokens',
          workload: {
            volumeBasis: 'requestsPerDay',
            activeDaysPerMonth: 30,
            retryRate: 0,
            requestsPerDay: Math.round(urlConfig.state.monthlyRequests / 30),
            activeUsers: urlConfig.state.activeUsers,
            requestsPerUserPerDay: urlConfig.state.activeUsers > 0
              ? urlConfig.state.monthlyRequests / urlConfig.state.activeUsers / 30
              : 0,
            avgInputTokensPerRequest: urlConfig.state.monthlyRequests > 0
              ? urlConfig.state.periodInputTokens / urlConfig.state.monthlyRequests
              : 0,
            avgOutputTokensPerRequest: urlConfig.state.monthlyRequests > 0
              ? urlConfig.state.periodOutputTokens / urlConfig.state.monthlyRequests
              : 0,
          },
          directTokens: {
            monthlyInputTokens: urlConfig.state.periodInputTokens,
            monthlyOutputTokens: urlConfig.state.periodOutputTokens,
            monthlyRequests: urlConfig.state.monthlyRequests,
          },
          cacheHitRate: urlConfig.state.cacheHitRate,
          batchEnabled: urlConfig.state.batchEnabled,
          monthlyBudgetUsd: urlConfig.state.monthlyBudgetUsd,
        }
      }
    }

    return {
      role: 'pm',
      currentModel: getModelById('claude-sonnet-4.6') ?? MODELS[4],
      candidateModel: getModelById('gemini-3.1-flash') ?? MODELS[7],
      period: 'month',
      inputMode: 'workload',
      workload: {
        volumeBasis: 'requestsPerDay',
        activeDaysPerMonth: 30,
        retryRate: 0,
        requestsPerDay: Math.round(defaultPreset.monthlyRequests / 30),
        activeUsers: 1000,
        requestsPerUserPerDay: defaultPreset.monthlyRequests / 1000 / 30,
        avgInputTokensPerRequest: defaultPreset.avgInputTokensPerRequest,
        avgOutputTokensPerRequest: defaultPreset.avgOutputTokensPerRequest,
      },
      directTokens: {
        monthlyInputTokens: defaultPreset.monthlyRequests * defaultPreset.avgInputTokensPerRequest,
        monthlyOutputTokens: defaultPreset.monthlyRequests * defaultPreset.avgOutputTokensPerRequest,
        monthlyRequests: defaultPreset.monthlyRequests,
      },
      cacheHitRate: defaultPreset.defaultCacheHitRate,
      batchEnabled: defaultPreset.defaultBatchEnabled,
      monthlyBudgetUsd: null,
    }
  })

  const legacyState = toLegacySimState(state)
  const isSameModel = state.currentModel.id === state.candidateModel.id
  const configSummary = t('config.summary', {
    current: state.currentModel.name,
    candidate: state.candidateModel.name,
    cacheRate: `${Math.round(state.cacheHitRate * 100)}%`,
    batchSuffix: state.batchEnabled ? t('config.batchSuffix') : '',
  })
  const attribution = useMemo<Partial<Record<AttributionAxis, AttributionResult>>>(() => {
    const rows = importedUsage?.rows ?? []
    if (rows.length === 0) return {}
    return {
      customer: rollupUsageByAxis(rows, 'customer'),
      feature: rollupUsageByAxis(rows, 'feature'),
      model: rollupUsageByAxis(rows, 'model'),
      plan: rollupUsageByAxis(rows, 'plan'),
      session: rollupUsageByAxis(rows, 'session'),
      agent_run: rollupUsageByAxis(rows, 'agent_run'),
    }
  }, [importedUsage])
  const effectiveAssumptions = useMemo(() => ({
    retryCostUsd: (importedUsage?.totalCostUsd ?? 0) * 0.05,
    humanReviewCostUsd: (importedUsage?.requestCount ?? 0) * 2,
    csEscalationCostUsd: (importedUsage?.requestCount ?? 0) * 0.5,
  }), [importedUsage])
  const operationalSignals = useMemo<OperationalSignalSummaryData>(
    () => summarizeOperationalSignals(importedUsage?.rows ?? []),
    [importedUsage],
  )
  const planMargins = useMemo(
    () => marginByPlan(importedUsage?.rows ?? [], PLAN_MONTHLY_REVENUE, effectiveAssumptions, { thresholdPolicy }),
    [effectiveAssumptions, importedUsage, thresholdPolicy],
  )
  const customerMargins = useMemo(
    () => customerProfitability(importedUsage?.rows ?? [], CUSTOMER_MONTHLY_REVENUE, effectiveAssumptions, { thresholdPolicy }),
    [effectiveAssumptions, importedUsage, thresholdPolicy],
  )
  const heavyUsers = useMemo(
    () => heavyUserDetection(importedUsage?.rows ?? [], CUSTOMER_MONTHLY_REVENUE, { thresholdPolicy }),
    [importedUsage, thresholdPolicy],
  )
  const scenarios = useMemo(() => {
    const rows = importedUsage?.rows ?? []
    return [
      calculatePricingScenario(rows, {
        policy: 'flat',
        currentRevenueByCustomer: CUSTOMER_MONTHLY_REVENUE,
      }),
      calculatePricingScenario(rows, {
        policy: 'usage',
        usagePricePerRequest: 75,
      }),
      calculatePricingScenario(rows, {
        policy: 'credit',
        baseSubscriptionUsd: 29,
        includedRequests: 1,
        overagePricePerRequest: 45,
      }),
      calculatePricingScenario(rows, {
        policy: 'hybrid',
        baseSubscriptionUsd: 29,
        usagePricePerRequest: 30,
      }),
      calculatePricingScenario(rows, {
        policy: 'cap',
        currentRevenueByCustomer: CUSTOMER_MONTHLY_REVENUE,
        capCostUsdPerCustomer: 50,
      }),
      calculatePricingScenario(rows, {
        policy: 'overage',
        currentRevenueByCustomer: CUSTOMER_MONTHLY_REVENUE,
        includedRequests: 1,
        overagePricePerRequest: 45,
      }),
    ]
  }, [importedUsage])
  const riskCards = useMemo(() => retrieveRiskCards(['credit', 'overage', 'cap', 'hybrid', 'usage', 'agent-loop']), [])
  useEffect(() => {
    setTeamCostCompanyProfile(profile => ({
      ...profile,
      locale: (i18n.language === 'ko' ? 'ko' : 'en'),
    }))
  }, [i18n.language])
  const teamCostEstimates = useMemo(() => teamCostAgents.flatMap(agent => {
    const model = getModelById(agent.modelId)
    return model ? [estimateAgentWorkload({ spec: agent, model })] : []
  }), [teamCostAgents])
  const teamCostEstimate = useMemo(() => summarizeTeamCost(teamCostEstimates), [teamCostEstimates])
  const attributedDeliverables = useMemo(
    () => attributeDeliverableCosts(teamCostDeliverables, teamCostEstimates),
    [teamCostDeliverables, teamCostEstimates],
  )
  const deliverablePerformanceSummary = useMemo(
    () => summarizeDeliverablePerformance(attributedDeliverables),
    [attributedDeliverables],
  )
  const teamCostBottlenecks = useMemo(() => detectBottlenecks({
    monthlyBudgetUsd: teamCostCompanyProfile.monthlyBudgetUsd,
    teamEstimate: teamCostEstimate,
    agents: teamCostAgents,
  }, { thresholdPolicy }), [teamCostAgents, teamCostCompanyProfile.monthlyBudgetUsd, teamCostEstimate, thresholdPolicy])
  const teamCostRecommendations = useMemo(() => proposeOptimizationCandidates({ findings: teamCostBottlenecks })
    .map(candidate => recommendationFromCandidate(candidate, {
      agents: teamCostAgents,
    })), [teamCostAgents, teamCostBottlenecks])
  const teamCostRiskCards = useMemo(() => {
    const firstRecommendation = teamCostRecommendations[0]
    return firstRecommendation ? retrieveRiskCards(firstRecommendation.riskTags) : []
  }, [teamCostRecommendations])
  const aiTeamConfiguration = useMemo<AITeamConfiguration>(() => ({
    companyProfile: {
      companyType: 'AI report generation SaaS',
      stage: 'SparkClaw P0 demo',
      budgetLabel: 'monthly AI team budget',
      locale: i18n.language === 'ko' ? 'ko' : 'en',
    },
    agents: DEFAULT_AI_TEAM_AGENTS,
    usage: importedUsage,
    attribution,
    decisionLog: decisions,
    deliverables: attributedDeliverables,
    agentAccountability: teamCostAccountability,
    decisionApprovalLog: decisions,
    usagePerformanceLogs: importedUsage,
    configSnapshotRef: `config:p0:${i18n.language === 'ko' ? 'ko' : 'en'}`,
  }), [
    attributedDeliverables,
    attribution,
    decisions,
    i18n.language,
    importedUsage,
    teamCostAccountability,
  ])

  const decisionFactSourceModels = useMemo(() => {
    const modelIds = new Set([
      state.currentModel.id,
      state.candidateModel.id,
      ...teamCostAgents.map(agent => agent.modelId),
    ])
    return MODELS.filter(model => modelIds.has(model.id))
  }, [state.candidateModel.id, state.currentModel.id, teamCostAgents])
  const currentFactSources = useMemo(
    () => factSourceSnapshotFromModels(decisionFactSourceModels, new Date().toISOString().slice(0, 10)),
    [decisionFactSourceModels],
  )
  const pricingFreshnessSnapshot = useMemo(
    () => decisionFactSourceModels.map(model => buildPricingFreshnessBadge({
      model,
      capturedAt: new Date().toISOString(),
    })),
    [decisionFactSourceModels],
  )
  const primaryRateCardDraft = useMemo(() => {
    const recommendation = teamCostRecommendations[0]
    const costPerRequest = teamCostEstimate.monthlyRequests > 0
      ? teamCostEstimate.monthlyCostUsd / teamCostEstimate.monthlyRequests
      : 0
    return buildRateCardDraft({
      policyType: 'usage_cap',
      includedCredits: Math.round(Math.max(0, teamCostEstimate.monthlyRequests * 0.8)),
      overagePricePerRequest: Number((costPerRequest * 1.25).toFixed(4)),
      capUsdPerCustomer: Math.round(Math.max(0, recommendation?.after.monthlyCostUsd ?? teamCostEstimate.monthlyCostUsd)),
      affectedCustomerCount: Math.max(1, customerMargins.filter(row => row.marginRisk !== 'healthy').length),
      marginBasisRefs: [
        'tool:margin.plan.pro',
        'basis:rule:gross_margin_thin_pct',
        ...(recommendation?.toolResultRefs ?? []),
      ],
    })
  }, [
    customerMargins,
    teamCostEstimate.monthlyCostUsd,
    teamCostEstimate.monthlyRequests,
    teamCostRecommendations,
  ])
  const decisionHeader = useMemo(() => buildDecisionHeader({
    recommendationTitle: teamCostRecommendations[0]?.title ?? 'Review AI team cost policy',
    monthlySavingsUsd: teamCostRecommendations[0]?.monthlySavingsUsd ?? 0,
    riskCardIds: teamCostRiskCards.map(card => card.id),
    pricingFreshnessState: pricingFreshnessSnapshot.some(item => item.state === 'source_changed')
      ? 'source_changed'
      : pricingFreshnessSnapshot.some(item => item.state === 'tbd')
        ? 'tbd'
        : pricingFreshnessSnapshot.some(item => item.state === 'estimated')
          ? 'estimated'
          : 'verified',
  }), [pricingFreshnessSnapshot, teamCostRecommendations, teamCostRiskCards])
  const operatingAssetSummary = useMemo(() => p0OperatingAssetSummary(), [])
  const operatingAssetHealth = useMemo(() => {
    const staleCount = currentFactSources.filter(source => source.verificationStatus === 'stale').length
    return [
      `provider_registry: ${staleCount > 0 ? `${staleCount} stale fact source warning` : 'fresh'}`,
      `usage_schema_mapping: ${importedUsage?.importHealthReport?.status ?? 'waiting_for_import'}`,
      `operating_ledger: ${decisions.length} rows`,
      `operating_agents: ${operatingAssetSummary.activeAgentCount} active roles`,
      `p1_automation_modules: ${P1_AUTOMATION_MODULES.length} automation_ready`,
    ]
  }, [
    currentFactSources,
    decisions.length,
    importedUsage?.importHealthReport?.status,
    operatingAssetSummary.activeAgentCount,
  ])
  const customerDashboard = useMemo(() => buildCustomerWorkspaceDashboard({
    workspaceId,
    organizationName: 'SparkClaw',
    uploadCount: importedUsage ? 1 : 0,
    decisionCount: decisions.length,
    monthlyReviewCount: weeklyReportRun ? 1 : 0,
    reportCount: decisions.length > 0 ? 1 : 0,
  }), [decisions.length, importedUsage, weeklyReportRun, workspaceId])
  const operatingLedgerRows = useMemo(() => decisions
    .filter(decision => decision.operatingLedger)
    .map(decision => ({
      id: decision.id,
      ...decision.operatingLedger,
    })), [decisions])
  const agentSnapshot = useMemo(() => {
    const primaryRecommendation = teamCostRecommendations[0]
    return buildAgentSnapshot({
      activeStage: activeDecisionStage,
      toolResults: {
        'team.monthlyCostUsd': teamCostEstimate.monthlyCostUsd,
        'team.topAgentShare': teamCostEstimate.topAgentShare,
        'optimization.primary.monthlySavingsUsd': primaryRecommendation?.monthlySavingsUsd ?? 0,
        monthlyAiCogs: importedUsage?.totalCostUsd ?? 0,
      },
      deterministicEvents: teamCostEvents.map(event => ({ ...event })),
      thresholdPolicy,
      metricFlags: teamCostBottlenecks.map(flag => ({ ...flag })),
      riskCards: [...riskCards, ...teamCostRiskCards].map(card => ({ ...card, source: `risk:${card.evidenceId}` })),
      benchmarkCards: TEAM_COST_BENCHMARKS.map(card => ({ ...card, source: `benchmark:${card.evidenceId}` })),
      decisionHistory: decisions.map(decision => ({ ...decision })),
      factSources: currentFactSources,
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      operatingAssets: OPERATING_ASSETS.map(asset => ({ ...asset })),
      providerRegistry: currentFactSources.map(source => ({ ...source })),
      modelPerfMatrix: MODEL_PERF_MATRIX.map(row => ({ ...row })),
      operatingLedger: operatingLedgerRows,
      officialSourceRegistry: OFFICIAL_SOURCE_REGISTRY.map(source => ({ ...source })),
      officialSourceSnippets: INITIAL_OFFICIAL_SOURCE_SNIPPETS.map(snippet => ({ ...snippet })),
      modelReleaseCandidates: INITIAL_MODEL_RELEASE_CANDIDATES.map(candidate => ({ ...candidate })),
      pricingFactCandidates: INITIAL_PRICING_FACT_CANDIDATES.map(candidate => ({ ...candidate })),
      fxRateSnapshots: INITIAL_FX_RATE_SNAPSHOTS.map(snapshot => ({ ...snapshot })),
      trustInspection: importedUsage?.trustInspection ?? null,
      formulaVersion: COST_FORMULA_VERSION,
      providerRegistryVersion: PROVIDER_REGISTRY_VERSION,
      frontOperatingSystem: AGENTCOST_FRONT_OPERATING_SYSTEM,
    })
  }, [
    activeDecisionStage,
    currentFactSources,
    decisions,
    importedUsage?.totalCostUsd,
    importedUsage?.trustInspection,
    operatingLedgerRows,
    riskCards,
    teamCostBottlenecks,
    teamCostEstimate.monthlyCostUsd,
    teamCostEstimate.topAgentShare,
    teamCostEvents,
    teamCostRecommendations,
    teamCostRiskCards,
    thresholdPolicy,
  ])
  const officialWatchtowerSummary = useMemo(() => officialWatchtowerCoverageSummary(), [])
  const roleProjection = useMemo(() => {
    const marginRow = planMargins[0]
    const customerRow = customerMargins[0]
    const topFeature = attribution.feature?.rows[0]?.label ?? 'No feature data'
    return projectSnapshotForRole({
      monthlyCostLabel: fmtCurrency(teamCostEstimate.monthlyCostUsd),
      marginLabel: marginRow ? fmtPercent(marginRow.grossMarginPct) : 'No margin data',
      topAgentShareLabel: fmtPercent(teamCostEstimate.topAgentShare),
      featureLabel: topFeature,
      customerLabel: customerRow?.customerId ?? 'No customer data',
      refs: [
        agentSnapshot.snapshotVersion,
        'tool:team.monthlyCostUsd',
        'tool:team.topAgentShare',
        ...ASSISTANT_TOOL_REFS,
      ],
    }, state.role, showInternal ? 'internal' : 'customer')
  }, [
    agentSnapshot.snapshotVersion,
    attribution.feature,
    customerMargins,
    planMargins,
    showInternal,
    state.role,
    teamCostEstimate.monthlyCostUsd,
    teamCostEstimate.topAgentShare,
  ])

  const handleDecisionStageChange = (stage: DecisionStageId) => {
    setActiveDecisionStage(stage)
    setRequestedOperatingAgentId(null)
    setAgentExecutionMode('stage_committee')
  }

  const handleOperatingAgentSelect = (agentId: OperatingAgentId) => {
    setRequestedOperatingAgentId(agentId)
    setAgentExecutionMode('single_agent')
  }

  const handleRunFullOperatingReview = () => {
    setRequestedOperatingAgentId(null)
    setAgentExecutionMode('all_hands')
  }

  const handleOpenFrontFitCheck = () => {
    setActiveDecisionStage('design')
    setRequestedOperatingAgentId(null)
    setAgentExecutionMode('stage_committee')
  }

  const handleOpenFrontDataGate = () => {
    setActiveDecisionStage('design')
    setRequestedOperatingAgentId('usage_data_ingestion')
    setAgentExecutionMode('single_agent')
  }

  const handleOpenFrontSampleReport = () => {
    setActiveDecisionStage('decision-log')
    setRequestedOperatingAgentId('knowledge_release_ops')
    setAgentExecutionMode('single_agent')
  }

  const handleSendSdkLiteSample = async (kind: 'clean' | 'blocked') => {
    const sample = sdkLiteSampleEvent(kind)
    const fallback = () => localSdkLiteFallback({
      workspaceId,
      source: sample.source,
      event: sample.event,
      previousHistory: sdkLitePanel.history,
    })

    if (typeof fetch !== 'function') {
      setSdkLitePanel(fallback())
      return
    }

    try {
      const response = await fetch('/api/sdk-lite/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          source: sample.source,
          event: sample.event,
        }),
      })
      const body = await response.json() as SdkLiteUsageApiBody
      if (!body.normalized || typeof body.snapshotAllowed !== 'boolean') {
        throw new Error(body.error ?? `SDK-lite API returned ${response.status}`)
      }
      setSdkLitePanel({
        status: body.snapshotAllowed ? 'accepted' : 'blocked',
        snapshotAllowed: body.snapshotAllowed,
        eventRef: body.eventRef ?? null,
        normalized: body.normalized,
        history: (body.history ?? []).slice(0, 5),
        persistence: body.persistence ?? 'unknown',
        error: body.error,
      })
    } catch {
      setSdkLitePanel(fallback())
    }
  }

  const handleRunP1RagEvidenceCheck = async () => {
    const query = 'cache margin'
    const structuredFactRefs = ['fact:gemini-3-5-flash']
    const fallbackEvidence = retrieveP1VectorRagEvidence({
      query,
      collections: P1_RAG_SAMPLE_COLLECTIONS,
      structuredFactRefs,
    })

    if (typeof fetch !== 'function') {
      setP1RagEvidencePanel({
        status: 'loaded',
        persistence: 'local_fallback',
        evidence: fallbackEvidence,
        metadata: { workspaceId, query },
      })
      return
    }

    try {
      const response = await fetch('/api/rag/p1-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          query,
          collections: P1_RAG_SAMPLE_COLLECTIONS,
          structuredFactRefs,
        }),
      })
      const body = await response.json() as P1RagEvidenceApiBody
      if (!body.evidence) throw new Error(body.error ?? `P1 RAG API returned ${response.status}`)
      setP1RagEvidencePanel({
        status: 'loaded',
        persistence: body.persistence ?? 'unknown',
        evidence: body.evidence,
        metadata: body.metadata ?? { workspaceId, query },
        error: body.error,
      })
    } catch {
      setP1RagEvidencePanel({
        status: 'loaded',
        persistence: 'local_fallback',
        evidence: fallbackEvidence,
        metadata: { workspaceId, query },
      })
    }
  }

  const decisionAuditSnapshot = () => ({
    thresholdSnapshot: thresholdPolicy,
    factSourceSnapshot: currentFactSources,
    rateCardDraft: primaryRateCardDraft,
    pricingFreshnessSnapshot,
    aiMode: teamCostLlmMode === 'provider-llm' ? 'llm_assisted' as const : 'deterministic_fallback' as const,
  })

  const trustReviewSnapshot = (summary: UsageImportSummary | null = importedUsage): TrustReviewMetadata => ({
    status: summary?.trustInspection?.status ?? 'unknown',
    warnings: summary?.trustInspection?.warnings ?? [],
    retentionNote: summary?.trustInspection?.retentionNote ?? 'Raw prompt was not collected for this demo snapshot.',
  })

  const reportReviewSnapshot = (summary: UsageImportSummary | null = importedUsage): ReportReviewMetadata => ({
    noRawPrompt: !(summary?.trustInspection?.warnings ?? []).includes('raw_prompt_detected'),
    noUncitedNumbers: true,
    providerSourceVisible: currentFactSources.length > 0,
    formulaVersionVisible: true,
  })

  const decisionReviewMetadata = (summary: UsageImportSummary | null = importedUsage) => ({
    trustReview: trustReviewSnapshot(summary),
    reportReview: reportReviewSnapshot(summary),
  })

  const agentReviewSnapshot = (stage: DecisionStageId = activeDecisionStage) => {
    const usedCapabilityTools = [...new Set([
      ...agentRun.usedTools,
      ...agentRun.events.flatMap(event => event.usedCapabilityTools ?? []),
    ])]
    const stageSnapshotVersion = agentRun.snapshotVersion && agentRun.snapshotVersion.startsWith(`snapshot:${stage}:`)
      ? agentRun.snapshotVersion
      : agentSnapshot.snapshotVersion.replace(/^snapshot:[^:]+:/, `snapshot:${stage}:`)
    return {
      calledAgentIds: agentRun.calledAgentIds,
      primaryAgentId: agentRun.primaryAgentId,
      reviewerAgentIds: agentRun.reviewerAgentIds,
      usedCapabilityTools,
      snapshotVersion: stageSnapshotVersion,
      supervisorSummary: agentRun.supervisorSummary || agentRun.answer,
    }
  }

  const handleThresholdOverride = (id: ThresholdId, value: number) => {
    setThresholdPolicy(policy => mergeThresholdPolicy(policy, { [id]: Math.min(1, Math.max(0, value)) }))
  }

  useEffect(() => {
    let cancelled = false
    remoteDecisionStore.load()
      .then(remoteDecisions => {
        if (cancelled) return
        setDecisions(remoteDecisions)
        setRemoteBackendStatus('connected')
        setRemoteBackendMessage('Remote backend connected')
      })
      .catch(() => {
        if (cancelled) return
        setRemoteBackendStatus('fallback')
        setRemoteBackendMessage('Remote backend unavailable; using local fallback')
      })
    return () => {
      cancelled = true
    }
  }, [remoteDecisionStore])

  useEffect(() => {
    const topFeature = attribution.feature?.rows[0]?.label ?? 'unknown'
    const creditScenario = scenarios.find(scenario => scenario.policy === 'credit')
    void runAgent({
      apiKey: '',
      toolResults: {
        monthlyAiCogs: importedUsage?.totalCostUsd ?? 0,
        topFeature,
        grossMarginPct: creditScenario?.grossMarginPct ?? 0,
        lossCustomerCount: creditScenario?.lossCustomerCount ?? 0,
      },
      riskCardIds: riskCards.map(card => card.id),
    }).then(setAgentEvents)
  }, [attribution.feature?.rows, importedUsage?.totalCostUsd, riskCards, scenarios])

  useEffect(() => {
    if (!showTeamCostSimulator) return
    let cancelled = false
    void runTeamCostAgentRuntime({
      apiKey: '',
      workflowMode: 'optimize',
      companyProfile: teamCostCompanyProfile,
      agentSpecs: teamCostAgents,
    }).then(result => {
      if (cancelled) return
      setTeamCostEvents(result.events)
      setTeamCostLlmMode(result.llmMode)
    })
    return () => {
      cancelled = true
    }
  }, [showTeamCostSimulator, teamCostAgents, teamCostCompanyProfile])

  useEffect(() => {
    let cancelled = false
    void runAgentRuntime({
      apiKey: '',
      mode: activeDecisionStage === 'decision-log' ? 'decision_support' : 'report',
      activeStage: activeDecisionStage,
      question: `Explain the ${activeDecisionStage} decision for the SparkClaw AI team cost workspace.`,
      requestedAgentId: requestedOperatingAgentId,
      executionMode: agentExecutionMode,
      snapshotVersion: agentSnapshot.snapshotVersion,
      toolResults: agentSnapshot.toolResults,
      deterministicEvents: agentSnapshot.deterministicEvents,
      thresholdPolicy: agentSnapshot.thresholdPolicy,
      metricFlags: agentSnapshot.metricFlags,
      riskCards: agentSnapshot.riskCards,
      benchmarkCards: agentSnapshot.benchmarkCards,
      decisionHistory: agentSnapshot.decisionHistory,
      factSources: agentSnapshot.factSources,
      operatingAgents: agentSnapshot.operatingAgents,
      operatingAssets: agentSnapshot.operatingAssets,
      providerRegistry: agentSnapshot.providerRegistry,
      modelPerfMatrix: agentSnapshot.modelPerfMatrix,
      operatingLedger: agentSnapshot.operatingLedger,
      trustInspection: agentSnapshot.trustInspection,
      formulaVersion: agentSnapshot.formulaVersion,
      providerRegistryVersion: agentSnapshot.providerRegistryVersion,
      dataLimitations: agentSnapshot.dataLimitations,
      frontOperatingSystem: agentSnapshot.frontOperatingSystem,
    }).then(result => {
      if (!cancelled) setAgentRun(result)
    })
    return () => {
      cancelled = true
    }
  }, [
    activeDecisionStage,
    agentExecutionMode,
    agentSnapshot,
    requestedOperatingAgentId,
  ])

  const applyUsageSummary = (summary: UsageImportSummary) => {
    setImportedUsage(summary)
    setState(s => ({
      ...s,
      inputMode: 'directTokens',
      directTokens: {
        monthlyInputTokens: summary.totalInputTokens,
        monthlyOutputTokens: summary.totalOutputTokens,
        monthlyRequests: summary.requestCount,
      },
      workload: {
        ...s.workload,
        requestsPerDay: Math.round(summary.requestCount / Math.max(1, s.workload.activeDaysPerMonth || 30)),
        avgInputTokensPerRequest: summary.avgInputTokensPerRequest,
        avgOutputTokensPerRequest: summary.avgOutputTokensPerRequest,
      },
    }))
  }

  const handleUsageImport = async (summary: UsageImportSummary) => {
    let nextSummary = summary
    if (typeof fetch === 'function') {
      try {
        const response = await fetch('/api/usage/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, summary }),
        })
        if (!response.ok) throw new Error(`Usage import failed with ${response.status}`)
        const body = await response.json() as {
          summary?: UsageImportSummary
          snapshotRef?: string | null
          history?: RemoteUsageHistoryEntry[]
        }
        nextSummary = body.summary ?? summary
        setUsageSnapshotRef(body.snapshotRef ?? null)
        setUsageHistory(body.history ?? [])
        setRemoteBackendStatus('connected')
        setRemoteBackendMessage('Remote backend connected')
      } catch {
        setRemoteBackendStatus('fallback')
        setRemoteBackendMessage('Remote backend unavailable; using local fallback')
      }
    }
    applyUsageSummary(nextSummary)
  }

  const persistDecisions = async (next: Decision[]) => {
    try {
      await remoteDecisionStore.save(next)
      setDecisions(next)
      setRemoteBackendStatus('connected')
      setRemoteBackendMessage('Remote backend connected')
    } catch {
      setDecisions(next)
      saveDecisionLog(next)
      setRemoteBackendStatus('fallback')
      setRemoteBackendMessage('Remote backend unavailable; using local fallback')
    }
  }

  const handleSparkClawDemoLoaded = async (summary: UsageImportSummary) => {
    setShowTeamCostSimulator(true)
    setActiveDecisionStage('decision-log')
    const existingDemo = decisions.some(decision => decision.assumptions.demo === 'sample/demo')
    if (existingDemo) return
    const recommendation = teamCostRecommendations[0]
    const cards = recommendation ? retrieveRiskCards(recommendation.riskTags) : riskCards
    const auditSnapshot = decisionAuditSnapshot()
    const reviewMetadata = decisionReviewMetadata(summary)
    const nowMs = Date.now()
    const operatingEntries = [
      createOperatingLedgerEntry({
        kind: 'policy',
        what: 'Provider Registry sample update',
        why: 'Official model price facts need visible source freshness before customer reporting.',
        assumptions: { demo: 'sample/demo', asset: 'provider_registry' },
        toolResultRefs: ['asset:provider_registry', 'tool:monthlyAiCogs'],
        riskCards: ['risk-cache-staleness'],
        status: 'adopted',
        createdAt: new Date(nowMs + 1_000).toISOString(),
        ...auditSnapshot,
        agentReview: agentReviewSnapshot('decision-log'),
        ...reviewMetadata,
        operatingLedger: {
          workstream: 'Provider Registry',
          source: 'official pricing page snapshot',
          agentUsed: 'Provider & API Intelligence Agent',
          proposedChange: 'Expose source freshness and keep registry as the numeric fact authority.',
          humanDecision: 'Approve P0 registry snapshot for demo reporting.',
          artifactUpdated: 'provider_registry p0',
          impact: 'Customer report can explain which official model facts were used.',
          followUp: 'P1 official docs change monitor remains automation_ready.',
        },
      }),
      createOperatingLedgerEntry({
        kind: 'attribution',
        what: 'Usage Schema Mapping sample import',
        why: 'SparkClaw usage rows must preserve customer, plan, session, and agent-run attribution.',
        assumptions: { demo: 'sample/demo', asset: 'usage_schema_mapping' },
        toolResultRefs: ['asset:usage_schema_mapping', 'tool:monthlyAiCogs'],
        riskCards: ['risk-agent-loop-runaway'],
        status: 'adopted',
        createdAt: new Date(nowMs + 2_000).toISOString(),
        ...auditSnapshot,
        agentReview: agentReviewSnapshot('decision-log'),
        ...reviewMetadata,
        operatingLedger: {
          workstream: 'Usage Data Ingestion',
          source: 'SparkClaw sample CSV',
          agentUsed: 'Usage Data Ingestion Agent',
          proposedChange: 'Normalize CSV into normalized_usage_table and report missing dimensions explicitly.',
          humanDecision: 'Approve sample import after preserving attribution dimensions.',
          artifactUpdated: 'usage_schema_mapping sparkclaw',
          impact: 'Cost attribution can roll up by customer, feature, model, plan, session, and agent run.',
          followUp: 'Add customer-specific mapping memory when real uploads arrive.',
        },
      }),
      createOperatingLedgerEntry({
        kind: 'policy',
        what: 'Model routing quality gate',
        why: 'Cheaper model routing is a what-if until task-level quality validation exists.',
        assumptions: { demo: 'sample/demo', asset: 'model_perf_matrix' },
        toolResultRefs: ['asset:model_perf_matrix', 'tool:optimization.primary.monthlySavingsUsd'],
        riskCards: ['risk-model-routing-quality'],
        status: 'adopted',
        createdAt: new Date(nowMs + 3_000).toISOString(),
        ...auditSnapshot,
        agentReview: agentReviewSnapshot('decision-log'),
        ...reviewMetadata,
        operatingLedger: {
          workstream: 'Model Routing',
          source: 'SparkClaw optimization recommendation',
          agentUsed: 'Model & Inference Research Agent, Optimization & Routing Agent',
          proposedChange: 'Keep model downgrade as eval-needed what-if instead of definitive waste.',
          humanDecision: 'Hold production routing until quality sample passes.',
          artifactUpdated: 'model_perf_matrix p0, optimization_playbook p0',
          impact: 'Report shows savings beside risk and validation requirements.',
          followUp: 'Run representative task eval before routing production traffic.',
        },
      }),
    ]
    const decision = createDecision({
      kind: 'approve',
      what: 'SparkClaw sample/demo decision',
      why: 'This customer is unprofitable until AI COGS, routing, and pricing policy are corrected.',
      assumptions: {
        demo: 'sample/demo',
        importedRequests: summary.requestCount,
        importedCostUsd: summary.totalCostUsd,
        recommendationId: recommendation?.id ?? 'sparkclaw-demo',
      },
      toolResultRefs: [
        'tool:team.monthlyCostUsd',
        'tool:team.topAgentShare',
        'tool:optimization.primary.monthlySavingsUsd',
        'tool:monthlyAiCogs',
      ],
      riskCards: cards.map(card => card.id),
      status: 'adopted',
      decisionChoice: 'adopt',
      createdAt: new Date(nowMs).toISOString(),
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
      ...auditSnapshot,
      agentReview: agentReviewSnapshot('decision-log'),
      ...reviewMetadata,
    })
    await persistDecisions([decision, ...operatingEntries, ...decisions])
  }

  const teamCostPerformanceSnapshot = () => ({
    throughput: deliverablePerformanceSummary.throughput,
    costPerDeliverableUsd: deliverablePerformanceSummary.costPerDeliverableUsd,
    passRate: deliverablePerformanceSummary.passRate,
    reworkRate: deliverablePerformanceSummary.reworkRate,
    escalationRate: deliverablePerformanceSummary.escalationRate,
    automationRate: deliverablePerformanceSummary.automationRate,
  })

  const teamCostCostSnapshot = () => ({
    monthlyCostUsd: teamCostEstimate.monthlyCostUsd,
    monthlyRequests: teamCostEstimate.monthlyRequests,
    monthlyInputTokens: teamCostEstimate.monthlyInputTokens,
    monthlyOutputTokens: teamCostEstimate.monthlyOutputTokens,
    costPerDeliverableUsd: deliverablePerformanceSummary.costPerDeliverableUsd,
    beforeMonthlyCostUsd: teamCostRecommendations[0]?.before.monthlyCostUsd ?? teamCostEstimate.monthlyCostUsd,
    afterMonthlyCostUsd: teamCostRecommendations[0]?.after.monthlyCostUsd ?? teamCostEstimate.monthlyCostUsd,
  })

  const handleAdoptCreditScenario = async () => {
    const creditScenario = scenarios.find(scenario => scenario.policy === 'credit')
    const decision = createDecision({
      kind: 'approve',
      what: 'Adopt credit pricing scenario',
      why: `Credit policy produces ${fmtPercent(creditScenario?.grossMarginPct ?? 0)} gross margin in the current sample.`,
      assumptions: {
        policy: 'credit',
        includedRequests: 1,
        overagePricePerRequest: 45,
      },
      toolResultRefs: ['pricing:credit', 'risk:credit'],
      riskCards: riskCards.map(card => card.id),
      status: 'adopted',
      decisionChoice: 'adopt',
      ...decisionAuditSnapshot(),
      agentReview: agentReviewSnapshot(),
      ...decisionReviewMetadata(),
    })
    const next = [decision, ...decisions]
    await persistDecisions(next)
  }

  const handleAdoptTeamCostOptimization = async () => {
    const recommendation = teamCostRecommendations[0]
    if (!recommendation) return
    const cards = retrieveRiskCards(recommendation.riskTags)
    const decision = createDecision({
      kind: 'approve',
      what: 'Adopt AI team cost optimization',
      why: recommendation.rationale,
      assumptions: {
        recommendationId: recommendation.id,
        agentId: recommendation.agentId,
        costAfterUsd: recommendation.costAfterUsd,
        monthlySavingsUsd: recommendation.monthlySavingsUsd,
        companyType: teamCostCompanyProfile.companyType,
        stage: teamCostCompanyProfile.stage,
        monthlyBudgetUsd: teamCostCompanyProfile.monthlyBudgetUsd,
        selectedWorkItems: teamCostWorkItems.filter(item => item.enabled).map(item => ({
          id: item.id,
          monthlyVolume: item.monthlyVolume,
        })),
      },
      toolResultRefs: recommendation.toolResultRefs,
      riskCards: cards.map(card => card.id),
      status: 'adopted',
      decisionChoice: 'adopt',
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
      ...decisionAuditSnapshot(),
      agentReview: agentReviewSnapshot(),
      ...decisionReviewMetadata(),
    })
    const next = [decision, ...decisions]
    await persistDecisions(next)
  }

  const handleRejectTeamCostOptimization = async () => {
    const recommendation = teamCostRecommendations[0]
    if (!recommendation) return
    const cards = retrieveRiskCards(recommendation.riskTags)
    const decision = createDecision({
      kind: 'approve',
      what: 'Reject AI team cost optimization',
      why: `Rejected for now: ${recommendation.rationale}`,
      assumptions: {
        recommendationId: recommendation.id,
        agentId: recommendation.agentId,
        rejectedMonthlySavingsUsd: recommendation.monthlySavingsUsd,
        currentMonthlyCostUsd: teamCostEstimate.monthlyCostUsd,
        selectedWorkItems: teamCostWorkItems.filter(item => item.enabled).map(item => item.id),
      },
      toolResultRefs: recommendation.toolResultRefs,
      riskCards: cards.map(card => card.id),
      status: 'rejected',
      decisionChoice: 'reject',
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
      ...decisionAuditSnapshot(),
      agentReview: agentReviewSnapshot(),
      ...decisionReviewMetadata(),
    })
    const next = [decision, ...decisions]
    await persistDecisions(next)
  }

  const handleHoldTeamCostOptimization = async () => {
    const recommendation = teamCostRecommendations[0]
    if (!recommendation) return
    const cards = retrieveRiskCards(recommendation.riskTags)
    const decision = createDecision({
      kind: 'approve',
      what: 'Hold AI team cost optimization',
      why: `Held for human review: ${recommendation.rationale}`,
      assumptions: {
        recommendationId: recommendation.id,
        agentId: recommendation.agentId,
        heldMonthlySavingsUsd: recommendation.monthlySavingsUsd,
        currentMonthlyCostUsd: teamCostEstimate.monthlyCostUsd,
        requiredValidation: recommendation.requiredValidation,
      },
      toolResultRefs: recommendation.toolResultRefs,
      riskCards: cards.map(card => card.id),
      status: 'held',
      decisionChoice: 'hold',
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
      ...decisionAuditSnapshot(),
      agentReview: agentReviewSnapshot(),
      ...decisionReviewMetadata(),
    })
    const next = [decision, ...decisions]
    await persistDecisions(next)
  }

  const handleRecordOperatingDecision = async () => {
    const recommendation = teamCostRecommendations[0]
    if (!recommendation) return
    const cards = retrieveRiskCards(recommendation.riskTags)
    const decision = createDecision({
      kind: operatingDecisionKind,
      what: 'Human Operating Decision',
      why: operatingDecisionReason.trim() || 'Recorded operating decision from optimization review.',
      assumptions: {
        recommendationId: recommendation.id,
        agentId: recommendation.agentId,
        decisionKind: operatingDecisionKind,
        companyType: teamCostCompanyProfile.companyType,
        stage: teamCostCompanyProfile.stage,
      },
      toolResultRefs: recommendation.toolResultRefs,
      riskCards: cards.map(card => card.id),
      status: 'adopted',
      decisionChoice: 'adopt',
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
      ...decisionAuditSnapshot(),
      agentReview: agentReviewSnapshot(),
      ...decisionReviewMetadata(),
    })
    const next = [decision, ...decisions]
    await persistDecisions(next)
    setHasOperatingDecisionForCalibration(true)
  }

  const handleDeleteDecision = async (id: string) => {
    const next = deleteDecision(decisions, id)
    try {
      await remoteDecisionStore.delete(id)
      setDecisions(next)
      setRemoteBackendStatus('connected')
      setRemoteBackendMessage('Remote backend connected')
    } catch {
      setDecisions(next)
      saveDecisionLog(next)
      setRemoteBackendStatus('fallback')
      setRemoteBackendMessage('Remote backend unavailable; using local fallback')
    }
  }

  const handleExportDecisions = () => {
    if (decisions.length === 0 || typeof document === 'undefined') return
    const blob = new Blob([serializeDecisionLog(decisions)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = exportDecisionLogFileName()
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleExportOnePageReport = () => {
    if (typeof document === 'undefined') return
    const exportGate = canExportOnePageReport(decisions)
    if (!exportGate.allowed) return
    const report = buildOnePageReportArtifact({
      title: 'SparkClaw AI Team Cost Decision Report',
      executiveSummary: agentRun.supervisorSummary || agentRun.report,
      metrics: [
        { label: 'Monthly AI team cost', value: fmtCurrency(teamCostEstimate.monthlyCostUsd) },
        { label: 'Top agent share', value: fmtPercent(teamCostEstimate.topAgentShare) },
      ],
      recommendations: teamCostRecommendations[0] ? [teamCostRecommendations[0].title] : [],
      risks: (teamCostRiskCards.length > 0 ? teamCostRiskCards : riskCards).map(card => card.title),
      refs: [
        ...(agentRun.toolResultRefs.length > 0 ? agentRun.toolResultRefs : ASSISTANT_TOOL_REFS),
        agentSnapshot.snapshotVersion,
      ],
      trust: {
        status: importedUsage?.trustInspection?.status ?? 'unknown',
        dataLimitations: importedUsage?.trustInspection?.analysisScope.blocked ?? ['raw prompt was not collected'],
        retentionNote: importedUsage?.trustInspection?.retentionNote ?? 'Raw prompt was not collected for this demo snapshot.',
      },
      formulaVersion: COST_FORMULA_VERSION,
      providerRegistryVersion: PROVIDER_REGISTRY_VERSION,
      snapshotVersion: agentSnapshot.snapshotVersion,
      decisionRefs: decisions.map(decision => decision.id),
      decisionChoice: exportGate.decisionChoice,
      rateCardDraft: primaryRateCardDraft,
      pricingFreshness: pricingFreshnessSnapshot,
    })
    const content = report.markdown
    const blob = new Blob([content], { type: 'text/markdown' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sparkclaw-ai-team-cost-decision-report.md'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const patchTeamCostAgent = (agentId: string, patch: Partial<AgentSpec>) => {
    setTeamCostAgents(agents => agents.map(agent => agent.id === agentId
      ? { ...agent, ...patch }
      : agent))
  }

  const syncWorkItemToAgentFrequency = (workItemId: string, monthlyVolume: number, enabled: boolean) => {
    const agentId = WORK_ITEM_AGENT_ID[workItemId]
    if (!agentId) return
    const safeVolume = Number.isFinite(monthlyVolume) ? Math.max(0, monthlyVolume) : 0
    patchTeamCostAgent(agentId, { frequency: { unit: 'month', count: enabled ? safeVolume : 0 } })
  }

  const handleTeamCostWorkItemEnabledChange = (workItemId: string, enabled: boolean) => {
    setTeamCostWorkItems(items => items.map(item => {
      if (item.id !== workItemId) return item
      syncWorkItemToAgentFrequency(item.id, item.monthlyVolume, enabled)
      return { ...item, enabled }
    }))
  }

  const handleTeamCostWorkItemMonthlyVolumeChange = (workItemId: string, monthlyVolume: number) => {
    const safeVolume = Number.isFinite(monthlyVolume) ? Math.max(0, monthlyVolume) : 0
    setTeamCostWorkItems(items => items.map(item => {
      if (item.id !== workItemId) return item
      syncWorkItemToAgentFrequency(item.id, safeVolume, item.enabled)
      return { ...item, monthlyVolume: safeVolume }
    }))
  }

  const handleTeamCostModelChange = (agentId: string, modelId: string) => {
    patchTeamCostAgent(agentId, { modelId })
  }

  const handleTeamCostMonthlyRunsChange = (agentId: string, monthlyRuns: number) => {
    const safeRuns = Number.isFinite(monthlyRuns) ? Math.max(0, monthlyRuns) : 0
    patchTeamCostAgent(agentId, { frequency: { unit: 'month', count: safeRuns } })
  }

  const handleTeamCostCallsPerRunChange = (agentId: string, callsPerRun: number) => {
    const safeCalls = Number.isFinite(callsPerRun) ? Math.max(0, callsPerRun) : 0
    patchTeamCostAgent(agentId, { callsPerRun: safeCalls })
  }

  const handleTeamCostRetryRateChange = (agentId: string, retryRate: number) => {
    const safeRetryRate = Number.isFinite(retryRate) ? Math.min(1, Math.max(0, retryRate)) : 0
    patchTeamCostAgent(agentId, { retryRate: safeRetryRate })
  }

  const handleTeamCostCacheHitRateChange = (agentId: string, cacheHitRate: number) => {
    const safeCacheRate = Number.isFinite(cacheHitRate) ? Math.min(1, Math.max(0, cacheHitRate)) : 0
    patchTeamCostAgent(agentId, { cacheHitRate: safeCacheRate })
  }

  const handleTeamCostHumanReviewGateChange = (agentId: string, humanReviewGate: HumanReviewGate) => {
    patchTeamCostAgent(agentId, { humanReviewGate })
  }

  const handleTeamCostArtifactTokensChange = (
    agentId: string,
    direction: 'inputs' | 'outputs',
    artifactId: string,
    estTokens: number,
  ) => {
    const safeTokens = Number.isFinite(estTokens) ? Math.max(0, estTokens) : 0
    setTeamCostAgents(agents => agents.map(agent => {
      if (agent.id !== agentId) return agent
      return {
        ...agent,
        [direction]: agent[direction].map(artifact => (
          artifact.id === artifactId ? { ...artifact, estTokens: safeTokens } : artifact
        )),
      }
    }))
  }

  const handleTeamCostArtifactReuseChange = (
    agentId: string,
    direction: 'inputs' | 'outputs',
    artifactId: string,
    reusedEachRun: boolean,
  ) => {
    setTeamCostAgents(agents => agents.map(agent => {
      if (agent.id !== agentId) return agent
      return {
        ...agent,
        [direction]: agent[direction].map(artifact => (
          artifact.id === artifactId ? { ...artifact, reusedEachRun } : artifact
        )),
      }
    }))
  }

  const handleTeamCostAssignedTasksChange = (agentId: string, assignedTasks: string[]) => {
    patchTeamCostAgent(agentId, { assignedTasks })
  }

  const handleTeamCostAccountabilityChange = (
    agentId: string,
    patch: Partial<Pick<AgentAccountability, 'owner' | 'authorityLevel' | 'escalationTo' | 'highRiskTasks'>>,
  ) => {
    setTeamCostAccountability(items => updateAgentAccountability(items, agentId, patch))
  }

  const handleGenerateCalibrationProposal = async () => {
    if (typeof fetch !== 'function') return
    try {
      const response = await fetch('/api/team-cost/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, agentSpecs: teamCostAgents }),
      })
      if (!response.ok) throw new Error(`Calibration failed with ${response.status}`)
      const body = await response.json() as { calibration?: TeamCostCalibration }
      setTeamCostCalibration(body.calibration ?? null)
      setHasOperatingDecisionForCalibration(false)
      setRemoteBackendStatus('connected')
      setRemoteBackendMessage('Remote backend connected')
    } catch {
      setRemoteBackendStatus('fallback')
      setRemoteBackendMessage('Remote backend unavailable; using local fallback')
    }
  }

  const handleApplyCalibrationProposal = () => {
    const patch = teamCostCalibration?.suggestedAgentSpecPatch
    if (!patch?.agentId || !hasOperatingDecisionForCalibration) return
    patchTeamCostAgent(patch.agentId, {
      callsPerRun: patch.callsPerRun,
      cacheHitRate: patch.cacheHitRate,
      humanReviewGate: patch.humanReviewGate,
      modelId: patch.modelId ?? undefined,
    })
  }

  const handleCreateWeeklyReport = async () => {
    if (typeof fetch !== 'function') return
    const configSnapshotRef = `config:p1:${workspaceId}`
    try {
      const configResponse = await fetch('/api/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          config: { ...aiTeamConfiguration, configSnapshotRef },
        }),
      })
      if (!configResponse.ok) throw new Error(`Configuration save failed with ${configResponse.status}`)
      const configBody = await configResponse.json() as { config?: { configSnapshotRef?: string } }
      const savedConfigRef = configBody.config?.configSnapshotRef ?? configSnapshotRef
      const reportResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          period: new Date().toISOString().slice(0, 7),
          decisionIds: decisions.map(decision => decision.id),
          configSnapshotRef: savedConfigRef,
          usageSnapshotRef,
        }),
      })
      if (!reportResponse.ok) throw new Error(`Report draft failed with ${reportResponse.status}`)
      const reportBody = await reportResponse.json() as { reportRun?: WeeklyReportRun }
      setWeeklyReportRun(reportBody.reportRun ?? null)
      setRemoteBackendStatus('connected')
      setRemoteBackendMessage('Remote backend connected')
    } catch {
      setRemoteBackendStatus('fallback')
      setRemoteBackendMessage('Remote backend unavailable; using local fallback')
    }
  }

  const savedTeamCostDecisionCount = decisions.filter(decision => (
    decision.what.includes('AI team cost') || decision.what.includes('Human Operating Decision')
  )).length

  const teamCostSimulatorStack = showTeamCostSimulator ? (
    <div className="grid gap-4 md:gap-6">
      <TeamCostDemoPathPanel savedDecisionCount={savedTeamCostDecisionCount} />
      <CompanyWorkInputPanel
        companyType={teamCostCompanyProfile.companyType}
        stage={teamCostCompanyProfile.stage}
        monthlyBudgetUsd={teamCostCompanyProfile.monthlyBudgetUsd}
        workItems={teamCostWorkItems}
        onCompanyTypeChange={companyType => setTeamCostCompanyProfile(profile => ({ ...profile, companyType }))}
        onStageChange={stage => setTeamCostCompanyProfile(profile => ({ ...profile, stage }))}
        onMonthlyBudgetUsdChange={monthlyBudgetUsd => setTeamCostCompanyProfile(profile => ({
          ...profile,
          monthlyBudgetUsd: Number.isFinite(monthlyBudgetUsd) ? Math.max(0, monthlyBudgetUsd) : 0,
        }))}
        onWorkItemEnabledChange={handleTeamCostWorkItemEnabledChange}
        onWorkItemMonthlyVolumeChange={handleTeamCostWorkItemMonthlyVolumeChange}
      />
      <AITeamSpecPanel
        agents={teamCostAgents}
        models={MODELS}
        accountability={teamCostAccountability}
        onMonthlyRunsChange={handleTeamCostMonthlyRunsChange}
        onModelChange={handleTeamCostModelChange}
        onCallsPerRunChange={handleTeamCostCallsPerRunChange}
        onRetryRateChange={handleTeamCostRetryRateChange}
        onCacheHitRateChange={handleTeamCostCacheHitRateChange}
        onHumanReviewGateChange={handleTeamCostHumanReviewGateChange}
        onArtifactTokensChange={handleTeamCostArtifactTokensChange}
        onArtifactReuseChange={handleTeamCostArtifactReuseChange}
        onAssignedTasksChange={handleTeamCostAssignedTasksChange}
        onAccountabilityChange={handleTeamCostAccountabilityChange}
      />
      <TeamCostForecastPanel
        teamEstimate={teamCostEstimate}
        estimates={teamCostEstimates}
        bottlenecks={teamCostBottlenecks}
        deliverables={attributedDeliverables}
        performanceSummary={deliverablePerformanceSummary}
      />
      <OptimizationReviewPanel
        recommendations={teamCostRecommendations}
        events={teamCostEvents}
        riskCards={teamCostRiskCards}
        currentMonthlyCostUsd={teamCostEstimate.monthlyCostUsd}
        operatingDecisionKind={operatingDecisionKind}
        operatingDecisionReason={operatingDecisionReason}
        onAdopt={handleAdoptTeamCostOptimization}
        onReject={handleRejectTeamCostOptimization}
        onHold={handleHoldTeamCostOptimization}
        onOperatingDecisionKindChange={setOperatingDecisionKind}
        onOperatingDecisionReasonChange={setOperatingDecisionReason}
        onRecordOperatingDecision={handleRecordOperatingDecision}
      />
      <WedgeADecisionLogPanel decisions={decisions} onDelete={handleDeleteDecision} showInternal={showInternal} />
      <ActualUsagePerformanceLogsPanel
        usageSnapshotRef={usageSnapshotRef}
        usageHistory={usageHistory}
        calibration={teamCostCalibration}
        canApplyCalibration={hasOperatingDecisionForCalibration}
        weeklyReportRun={weeklyReportRun}
        onGenerateCalibration={handleGenerateCalibrationProposal}
        onApplyCalibration={handleApplyCalibrationProposal}
        onCreateWeeklyReport={handleCreateWeeklyReport}
      />
    </div>
  ) : null

  const renderWorkspacePanels = (panels: WorkspacePanelDefinition[]) => orderWorkspacePanels(panels, roleProjection)
    .map((panel, index) => (
      <div
        key={panel.key}
        data-testid={`workspace-panel-${panel.key}`}
        className={index === 0 ? 'rounded-wds-lg ring-1 ring-primary-normal/30' : ''}
      >
        {panel.node}
      </div>
    ))

  const stageWorkspace = (
    <div className="grid gap-4">
      {activeDecisionStage === 'design' && (
        renderWorkspacePanels([
          {
            key: 'import_workflow',
            node: (
              <Surface
                id="import"
                eyebrow="Usage log entry point"
                title="1. Import"
                description="Start from CSV logs or the SparkClaw sample. Token fields come from logs; business denominators stay explicit."
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
                  <UsageImportPanel
                    importedSummary={importedUsage}
                    onImport={handleUsageImport}
                    onSparkClawDemo={handleSparkClawDemoLoaded}
                  />
                  <TeamDesignerPanel config={aiTeamConfiguration} />
                </div>
              </Surface>
            ),
          },
          {
            key: 'team_cost_simulator',
            node: teamCostSimulatorStack,
          },
        ])
      )}

      {activeDecisionStage === 'cost' && (
        renderWorkspacePanels([
          {
            key: 'operational_signals',
            node: <OperationalSignalSummary summary={operationalSignals} />,
          },
          {
            key: 'cost_attribution',
            node: <CostAttributionWorkspace attribution={attribution} />,
          },
          {
            key: 'margin_risk',
            node: (
              <MarginRiskWorkspace
                planMargins={planMargins}
                customerMargins={customerMargins}
                topDecileShare={heavyUsers.topDecileShare}
              />
            ),
          },
        ])
      )}

      {activeDecisionStage === 'bottleneck' && (
        renderWorkspacePanels([
          {
            key: 'team_forecast',
            node: (
              <Surface
                eyebrow="Waste and bottleneck"
                title="Bottleneck Detection"
                description="Flags cite rule, self-baseline, or peer-benchmark basis before any optimization is proposed."
              >
                <TeamCostForecastPanel
                  teamEstimate={teamCostEstimate}
                  estimates={teamCostEstimates}
                  bottlenecks={teamCostBottlenecks}
                  deliverables={attributedDeliverables}
                  performanceSummary={deliverablePerformanceSummary}
                />
              </Surface>
            ),
          },
        ])
      )}

      {activeDecisionStage === 'optimize' && (
        renderWorkspacePanels([
          {
            key: 'pricing_simulator',
            node: (
              <PricingSimulatorWorkspace
                scenarios={scenarios}
                riskCards={riskCards}
                onAdopt={handleAdoptCreditScenario}
              />
            ),
          },
          {
            key: 'optimization_review',
            node: (
              <OptimizationReviewPanel
                recommendations={teamCostRecommendations}
                events={teamCostEvents}
                riskCards={teamCostRiskCards}
                currentMonthlyCostUsd={teamCostEstimate.monthlyCostUsd}
                operatingDecisionKind={operatingDecisionKind}
                operatingDecisionReason={operatingDecisionReason}
                onAdopt={handleAdoptTeamCostOptimization}
                onReject={handleRejectTeamCostOptimization}
                onHold={handleHoldTeamCostOptimization}
                onOperatingDecisionKindChange={setOperatingDecisionKind}
                onOperatingDecisionReasonChange={setOperatingDecisionReason}
                onRecordOperatingDecision={handleRecordOperatingDecision}
              />
            ),
          },
          {
            key: 'report_output',
            node: (
              <Surface
                id="report"
                eyebrow="Agent output"
                title="5. Report Output"
                description="The report keeps deterministic numbers and model provenance visible, while the agent layer drafts grounded interpretation."
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
                  <SummaryCard state={legacyState} />
                  <AgentReportWorkspace events={agentEvents} showInternal={showInternal} />
                </div>
              </Surface>
            ),
          },
        ])
      )}

      {activeDecisionStage === 'decision-log' && (
        renderWorkspacePanels([
          {
            key: 'decision_log',
            node: (
              <DecisionLogWorkspace
                decisions={decisions}
                onDelete={handleDeleteDecision}
                onExport={handleExportDecisions}
                showInternal={showInternal}
              />
            ),
          },
          {
            key: 'operating_ledger',
            node: <WedgeADecisionLogPanel decisions={decisions} onDelete={handleDeleteDecision} showInternal={showInternal} />,
          },
          {
            key: 'one_page_report',
            node: (
              <OnePageReportPanel
                agentRun={agentRun}
                teamEstimate={teamCostEstimate}
                recommendation={teamCostRecommendations[0]}
                decisions={decisions}
                riskCards={teamCostRiskCards.length > 0 ? teamCostRiskCards : riskCards}
                onExport={handleExportOnePageReport}
                operatingAssetHealth={operatingAssetHealth}
                trustInspection={importedUsage?.trustInspection}
                formulaVersion={COST_FORMULA_VERSION}
                providerRegistryVersion={PROVIDER_REGISTRY_VERSION}
                snapshotVersion={agentSnapshot.snapshotVersion}
                rateCardDraft={primaryRateCardDraft}
                pricingFreshness={pricingFreshnessSnapshot}
                decisionHeader={decisionHeader}
                showInternal={showInternal}
              />
            ),
          },
        ])
      )}
    </div>
  )

  return (
    <div
      data-testid="app-shell"
      className="min-h-screen bg-surface-alternative font-sans text-label-normal"
      translate="no"
    >
      <header className="sticky top-0 z-30 border-b border-line-neutral bg-surface-normal/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary-normal">{t('workspace.eyebrow')}</p>
            <h1 className="text-xl font-semibold text-label-normal">{t('header.title')}</h1>
            <p className="text-xs text-label-alternative">{t('header.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ConfigPanel
              state={legacyState}
              onLoad={p => setState(s => ({
                ...s,
                role: p.role ?? s.role,
                currentModel: p.currentModel ?? s.currentModel,
                candidateModel: p.candidateModel ?? s.candidateModel,
                period: p.period ?? s.period,
                directTokens: {
                  monthlyInputTokens: p.periodInputTokens ?? s.directTokens.monthlyInputTokens,
                  monthlyOutputTokens: p.periodOutputTokens ?? s.directTokens.monthlyOutputTokens,
                  monthlyRequests: p.monthlyRequests ?? s.directTokens.monthlyRequests,
                },
                cacheHitRate: p.cacheHitRate ?? s.cacheHitRate,
                batchEnabled: p.batchEnabled ?? s.batchEnabled,
                monthlyBudgetUsd: p.monthlyBudgetUsd ?? s.monthlyBudgetUsd,
              }))}
            />
            <div className="inline-flex overflow-hidden rounded-wds border border-line-neutral bg-surface-normal" aria-label="Language">
              <button
                onClick={() => i18n.changeLanguage('en')}
                aria-pressed={i18n.language === 'en'}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-primary-normal text-white'
                    : 'bg-white text-label-neutral hover:bg-fill-alternative'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage('ko')}
                aria-pressed={i18n.language === 'ko'}
                className={`border-l border-line-neutral px-3 py-1.5 text-xs font-medium transition-colors ${
                  i18n.language === 'ko'
                    ? 'bg-primary-normal text-white'
                    : 'bg-white text-label-neutral hover:bg-fill-alternative'
                }`}
              >
                KO
              </button>
            </div>
            <div>
              <p className="mb-1 text-xs text-label-alternative">{t('header.role')}</p>
              <RoleSelector value={state.role} onChange={r => setState(s => ({ ...s, role: r }))} />
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowTeamCostSimulator(open => !open)}>
              Toggle AI team
            </Button>
          </div>
        </div>
      </header>

      <main id="workspace" data-testid="decision-console-shell" className="montage-console-shell">
        <LifecycleNavigation
          activeStage={activeDecisionStage}
          operatingAgents={OPERATING_AGENTS}
          selectedAgentId={requestedOperatingAgentId}
          savedDecisionCount={savedTeamCostDecisionCount}
          showInternal={showInternal}
          onStageChange={handleDecisionStageChange}
          onAgentSelect={handleOperatingAgentSelect}
          onRunAllHands={handleRunFullOperatingReview}
          onOpenFrontFitCheck={handleOpenFrontFitCheck}
          onOpenFrontDataGate={handleOpenFrontDataGate}
          onOpenFrontSampleReport={handleOpenFrontSampleReport}
        />

        <section data-testid="decision-workspace-panel" className="montage-console-main">
          <CustomerDashboardEntryPanel
            dashboard={customerDashboard}
            onRunSample={() => {
              setShowTeamCostSimulator(true)
              setActiveDecisionStage('design')
            }}
            onUploadUsage={() => setActiveDecisionStage('design')}
            onOpenWorkspace={() => setActiveDecisionStage('decision-log')}
          />

          <DecisionWorkspaceIntro
            activeStage={activeDecisionStage}
            remoteBackendStatus={remoteBackendStatus}
            remoteBackendMessage={remoteBackendMessage}
            workspaceId={workspaceId}
            showInternal={showInternal}
            onOpenTeamCost={() => setShowTeamCostSimulator(true)}
          />

          <RoleProjectionPanel view={roleProjection} />

          <P1SdkLitePanel
            state={sdkLitePanel}
            showInternal={showInternal}
            onSendClean={() => void handleSendSdkLiteSample('clean')}
            onSendBlocked={() => void handleSendSdkLiteSample('blocked')}
          />

          <P1RagEvidencePanel
            state={p1RagEvidencePanel}
            showInternal={showInternal}
            onRun={() => void handleRunP1RagEvidenceCheck()}
          />

          <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
            <p className="text-xs font-semibold uppercase text-primary-normal">Deterministic setup</p>
            <p className="mt-2 text-sm text-label-neutral" lang="en">
              {!isSameModel ? configSummary : t('errors.sameModel')}
            </p>
            <div className="mt-3">
              <p className="mb-2 text-xs text-label-alternative">{t('config.period')}</p>
              <PeriodSelector value={state.period ?? 'month'} onChange={p => setState(s => ({ ...s, period: p }))} />
            </div>
          </div>

          {showInternal && (
          <div data-testid="operating-asset-health" className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-primary-normal">Operating asset health</p>
              <Badge tone="primary">{operatingAssetSummary.activeAgentCount} active operating agents</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {operatingAssetHealth.map(item => (
                <Badge key={item} tone={item.includes('stale') || item.includes('needs_mapping') ? 'caution' : 'neutral'}>
                  {item}
                </Badge>
              ))}
              {P1_AUTOMATION_MODULES.slice(0, 3).map(module => (
                <Badge key={module.id} tone="neutral">
                  {module.label}: automation_ready
                </Badge>
              ))}
            </div>
            <div data-testid="official-updates-panel" className="mt-4 rounded-wds border border-line-neutral bg-fill-alternative p-3">
              <p className="text-xs font-semibold uppercase text-primary-normal">Official Research Watchtower</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="primary">{officialWatchtowerSummary.activeSourceCount} official sources</Badge>
                <Badge tone="caution">{officialWatchtowerSummary.activeChineseProviderGroupCount} China provider groups</Badge>
                <Badge tone="neutral">{INITIAL_MODEL_RELEASE_CANDIDATES.length} model release candidates</Badge>
                <Badge tone="neutral">FX review required for CNY pricing</Badge>
              </div>
            </div>
          </div>
          )}

          {stageWorkspace}
        </section>

        <DecisionAssistantPanel
          activeStage={activeDecisionStage}
          teamEstimate={teamCostEstimate}
          recommendations={teamCostRecommendations}
          riskCards={teamCostRiskCards}
          events={teamCostEvents}
          agentRun={agentRun}
          roleProjection={roleProjection}
          operatingAgents={OPERATING_AGENTS}
          llmMode={teamCostLlmMode}
          savedDecisionCount={savedTeamCostDecisionCount}
          thresholdPolicy={thresholdPolicy}
          showInternal={showInternal}
          onThresholdOverride={handleThresholdOverride}
          onAdopt={handleAdoptTeamCostOptimization}
          onReject={handleRejectTeamCostOptimization}
          onHold={handleHoldTeamCostOptimization}
        />
      </main>
    </div>
  )
}

export default App
