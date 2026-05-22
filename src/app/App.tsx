import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MODELS, getModelById, type Model } from '../features/alternatives/data/models'
import { USE_CASE_PRESETS } from '../features/usage/data/workloadPresets'
import { SummaryCard } from '../features/report/components/SummaryCard'
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
import { retrieveRiskCards, type RiskCard } from '../features/agent/lib/riskCards'
import { runAgent, type AgentEvent } from '../features/agent/lib/agentRuntime'
import { createDecision, deleteDecision, exportDecisionLogFileName, loadDecisionLog, saveDecisionLog, serializeDecisionLog, type Decision, type OperatingDecisionKind } from '../features/decision-log/lib/decisionLog'
import { createRemoteDecisionStore } from '../features/decision-log/lib/decisionStore'
import { DEFAULT_AI_TEAM_AGENTS, type AITeamConfiguration } from '../features/team/lib/aiTeamConfiguration'
import { TeamDesignerPanel } from '../features/team/components/TeamDesignerPanel'
import { summarizeOperationalSignals, type OperationalSignalSummary as OperationalSignalSummaryData } from '../features/usage/lib/operationalSignals'
import { OperationalSignalSummary } from '../features/usage/components/OperationalSignalSummary'
import { Badge, Button, MetricTile, Surface } from '../shared/ui/primitives'
import { fmtCurrency, fmtPercent, fmtTokens } from '../lib/format'
import { AI_TEAM_AGENT_CATALOG } from '../features/team-cost/lib/agentCatalog'
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

function AgentReportWorkspace({ events }: { events: AgentEvent[] }) {
  return (
    <div className="rounded-wds-lg border border-line-neutral bg-fill-alternative p-4">
      <h3 className="text-sm font-semibold">Agent interpretation layer</h3>
      <p className="mt-1 text-xs text-label-alternative">P0 browser runtime. Without a BYO key it renders deterministic fallback events grounded in tool payloads.</p>
      <div className="mt-3 grid gap-2">
        {events.map(event => (
          <div key={event.type} className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">{event.type.replace('_', ' ')}</p>
            <p className="mt-1 text-sm text-label-neutral">{event.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DecisionLogWorkspace({
  decisions,
  onDelete,
  onExport,
}: {
  decisions: Decision[]
  onDelete: (id: string) => void
  onExport: () => void
}) {
  return (
    <Surface
      eyebrow="Local persistence"
      title="6. Decision & Approval Log"
      description="P0 stores adopted decisions in localStorage and exports the same JSON shape planned for P1 persistence."
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
                <pre className="mt-2 overflow-x-auto rounded-wds bg-fill-alternative p-2 text-xs text-label-neutral" translate="no">
                  {JSON.stringify({
                    assumptions: decision.assumptions,
                    performanceSnapshot: decision.performanceSnapshot,
                    costSnapshot: decision.costSnapshot,
                  }, null, 2)}
                </pre>
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

function LifecycleNavigation({
  activeStage,
  agents,
  savedDecisionCount,
  onStageChange,
}: {
  activeStage: DecisionStageId
  agents: AgentSpec[]
  savedDecisionCount: number
  onStageChange: (stage: DecisionStageId) => void
}) {
  return (
    <aside data-testid="lifecycle-nav" className="montage-console-left">
      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <p className="text-xs font-semibold uppercase text-primary-normal">Decision flow</p>
        <p className="mt-2 text-sm font-semibold text-label-normal">
          Design -&gt; Cost -&gt; Bottleneck -&gt; Optimize + Risk -&gt; Decision Log
        </p>
        <div className="mt-4 grid gap-2">
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

      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <p className="text-xs font-semibold uppercase text-primary-normal">Agents</p>
        <div className="mt-3 grid gap-2">
          {agents.slice(0, 7).map(agent => (
            <div key={agent.id} className="flex items-center justify-between gap-2 rounded-wds bg-fill-alternative px-2 py-1.5">
              <span className="text-xs font-medium text-label-neutral">{agent.role}</span>
              <Badge>{agent.humanReviewGate}</Badge>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function DecisionWorkspaceIntro({
  activeStage,
  remoteBackendStatus,
  remoteBackendMessage,
  workspaceId,
  onOpenTeamCost,
}: {
  activeStage: DecisionStageId
  remoteBackendStatus: RemoteBackendStatus
  remoteBackendMessage: string
  workspaceId: string
  onOpenTeamCost: () => void
}) {
  const stage = DECISION_STAGES.find(item => item.id === activeStage) ?? DECISION_STAGES[0]

  return (
    <section className="rounded-wds-lg border border-line-neutral bg-surface-normal p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-normal">PRODUCT_UX workspace</p>
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
          <Badge tone={remoteBackendStatus === 'connected' ? 'positive' : remoteBackendStatus === 'fallback' ? 'caution' : 'neutral'}>
            {remoteBackendStatus}
          </Badge>
          <p className="text-label-neutral">{remoteBackendMessage}</p>
          <p className="text-xs text-label-alternative" translate="no">workspaceId: {workspaceId}</p>
          <Button variant="primary" onClick={onOpenTeamCost}>
            AI Team Cost Simulator
          </Button>
        </div>
      </div>
    </section>
  )
}

function DecisionAssistantPanel({
  teamEstimate,
  recommendations,
  riskCards,
  events,
  llmMode,
  savedDecisionCount,
  onAdopt,
  onReject,
}: {
  teamEstimate: TeamCostEstimate
  recommendations: OptimizationRecommendation[]
  riskCards: RiskCard[]
  events: TeamCostGraphEvent[]
  llmMode: TeamCostLlmMode
  savedDecisionCount: number
  onAdopt: () => void
  onReject: () => void
}) {
  const recommendation = recommendations[0]
  const assistantRefs = recommendation
    ? [...new Set([...ASSISTANT_TOOL_REFS, ...recommendation.toolResultRefs])]
    : ASSISTANT_TOOL_REFS

  return (
    <aside data-testid="decision-assistant-panel" className="montage-console-right">
      <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-primary-normal">AI interpretation</p>
          <Badge tone={llmMode === 'provider-llm' ? 'positive' : 'neutral'}>
            {llmMode === 'provider-llm' ? 'LLM assisted' : 'Deterministic fallback'}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-label-neutral" lang="en">
          Cost Analyst is attached beside the deterministic forecast. It can explain refs, risk, and next decisions,
          but it does not create cost numbers.
        </p>
        <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-xs font-semibold text-label-alternative">Current monthly cost</p>
          <p data-testid="assistant-monthly-cost" className="mt-1 text-xl font-semibold text-label-normal" translate="no">
            {fmtCurrency(teamEstimate.monthlyCostUsd)}
          </p>
          <p className="mt-1 text-xs text-label-alternative" translate="no">
            top agent share {fmtPercent(teamEstimate.topAgentShare)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {assistantRefs.slice(0, 6).map(refId => (
            <ToolRefChip key={refId} refId={refId} />
          ))}
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
            <p className="mt-2 text-xs text-label-alternative" translate="no">risk:{riskCards[0].id}</p>
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
        </div>
        <p className="mt-3 text-xs text-label-alternative">
          Decision Log entries saved: {savedDecisionCount}
        </p>
      </div>

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
        </div>
      </div>
    </aside>
  )
}

function WedgeADecisionLogPanel({
  decisions,
  onDelete,
}: {
  decisions: Decision[]
  onDelete: (id: string) => void
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
                  </div>
                  <p className="mt-1 text-xs text-label-neutral">{decision.why}</p>
                  <p className="mt-2 text-xs text-label-alternative" translate="no">{decision.createdAt}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onDelete(decision.id)}>
                  Delete operating decision
                </Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-wds bg-fill-alternative p-2">
                  <p className="text-xs font-semibold text-label-neutral">Risk cards</p>
                  <p className="mt-1 text-xs text-label-alternative" translate="no">{decision.riskCards.join(', ')}</p>
                </div>
                <div className="rounded-wds bg-fill-alternative p-2">
                  <p className="text-xs font-semibold text-label-neutral">Tool refs</p>
                  <p className="mt-1 text-xs text-label-alternative" translate="no">{decision.toolResultRefs.join(', ')}</p>
                </div>
                <pre className="overflow-x-auto rounded-wds bg-fill-alternative p-2 text-xs text-label-neutral" translate="no">
                  {JSON.stringify({
                    assumptions: decision.assumptions,
                    performanceSnapshot: decision.performanceSnapshot,
                    costSnapshot: decision.costSnapshot,
                  }, null, 2)}
                </pre>
              </div>
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
  const [workspaceId] = useState(loadWorkspaceId)
  const [remoteBackendStatus, setRemoteBackendStatus] = useState<RemoteBackendStatus>('checking')
  const [remoteBackendMessage, setRemoteBackendMessage] = useState('Checking P1 backend persistence')
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
    () => marginByPlan(importedUsage?.rows ?? [], PLAN_MONTHLY_REVENUE, effectiveAssumptions),
    [effectiveAssumptions, importedUsage],
  )
  const customerMargins = useMemo(
    () => customerProfitability(importedUsage?.rows ?? [], CUSTOMER_MONTHLY_REVENUE, effectiveAssumptions),
    [effectiveAssumptions, importedUsage],
  )
  const heavyUsers = useMemo(
    () => heavyUserDetection(importedUsage?.rows ?? [], CUSTOMER_MONTHLY_REVENUE),
    [importedUsage],
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
  }), [teamCostAgents, teamCostCompanyProfile.monthlyBudgetUsd, teamCostEstimate])
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
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
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
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
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
      performanceSnapshot: teamCostPerformanceSnapshot(),
      costSnapshot: teamCostCostSnapshot(),
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
          agents={teamCostAgents}
          savedDecisionCount={savedTeamCostDecisionCount}
          onStageChange={setActiveDecisionStage}
        />

        <section data-testid="decision-workspace-panel" className="montage-console-main">
          <DecisionWorkspaceIntro
            activeStage={activeDecisionStage}
            remoteBackendStatus={remoteBackendStatus}
            remoteBackendMessage={remoteBackendMessage}
            workspaceId={workspaceId}
            onOpenTeamCost={() => setShowTeamCostSimulator(open => !open)}
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

          {showTeamCostSimulator && (
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
                onOperatingDecisionKindChange={setOperatingDecisionKind}
                onOperatingDecisionReasonChange={setOperatingDecisionReason}
                onRecordOperatingDecision={handleRecordOperatingDecision}
              />
              <WedgeADecisionLogPanel decisions={decisions} onDelete={handleDeleteDecision} />
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
          )}

          <div className="grid gap-4">
            <Surface
              id="import"
              eyebrow="Usage log entry point"
              title="1. Import"
              description="Start from CSV logs or the SparkClaw sample. Token fields come from logs; business denominators stay explicit."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
                <UsageImportPanel importedSummary={importedUsage} onImport={handleUsageImport} />
                <TeamDesignerPanel config={aiTeamConfiguration} />
              </div>
            </Surface>

            <OperationalSignalSummary summary={operationalSignals} />

            <CostAttributionWorkspace attribution={attribution} />

            <div id="margin">
              <MarginRiskWorkspace
                planMargins={planMargins}
                customerMargins={customerMargins}
                topDecileShare={heavyUsers.topDecileShare}
              />
            </div>

            <div id="pricing">
              <PricingSimulatorWorkspace
                scenarios={scenarios}
                riskCards={riskCards}
                onAdopt={handleAdoptCreditScenario}
              />
            </div>

            <Surface
              id="report"
              eyebrow="Agent output"
              title="5. Report Output"
              description="The report keeps deterministic numbers and model provenance visible, while the agent layer drafts grounded interpretation."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
                <SummaryCard state={legacyState} />
                <AgentReportWorkspace events={agentEvents} />
              </div>
            </Surface>

            <DecisionLogWorkspace
              decisions={decisions}
              onDelete={handleDeleteDecision}
              onExport={handleExportDecisions}
            />
          </div>
        </section>

        <DecisionAssistantPanel
          teamEstimate={teamCostEstimate}
          recommendations={teamCostRecommendations}
          riskCards={teamCostRiskCards}
          events={teamCostEvents}
          llmMode={teamCostLlmMode}
          savedDecisionCount={savedTeamCostDecisionCount}
          onAdopt={handleAdoptTeamCostOptimization}
          onReject={handleRejectTeamCostOptimization}
        />
      </main>
    </div>
  )
}

export default App
