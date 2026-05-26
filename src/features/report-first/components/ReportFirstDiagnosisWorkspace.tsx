'use client'

import { useMemo, useRef, useState } from 'react'

import { MODELS } from '../../../data/models'
import { fmtKrw, fmtKrwRange, fmtNumber } from '../../../lib/format'
import { Badge, Button, Field, MetricTile, Surface } from '../../../shared/ui/primitives'
import { AI_COST_SNAPSHOT_OFFER } from '../../front-operating/lib/customerServiceOffer'
import {
  CUSTOMER_MONTHLY_REVENUE,
  CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
  CUSTOMER_TOKEN_ALLOWANCE,
  PLAN_MONTHLY_REVENUE,
  PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
  PLAN_TOKEN_ALLOWANCE,
  SPARK_CLAW_TOKEN_ALLOWANCE_CSV,
  SPARK_CLAW_SAMPLE_CSV,
} from '../../usage/data/sparkClawSample'
import { TrustAssurancePanel } from '../../trust/components/TrustAssurancePanel'
import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import { parseUsageCsv, type UsageImportSummary } from '../../usage/lib/usageImport'
import {
  buildAgentPayrollPdcaInstrumentation,
  type AgentPayrollIcpAxis,
  type AgentPayrollPdcaInstrumentation,
} from '../../unit-economics/lib/pdcaInstrumentation'
import {
  buildDiagnosisSnapshot,
  buildMarginDiagnosisSummary,
  reportFirstPayloadFromDiagnosis,
  type DiagnosisSnapshot,
  type MoneyLeakDecisionChoice,
} from '../lib/diagnosis'
import {
  assessIcpTimingGate,
  type IcpTimingDecisionUrgency,
  type IcpTimingGateAssessment,
} from '../lib/icpTimingGate'
import { importTemplatesByKind, type ImportTemplateProfile } from '../lib/importTemplates'
import {
  MONEY_LEAK_STEPS,
  deriveMoneyLeakStepStates,
  type MoneyLeakStepId,
  type MoneyLeakStepState,
} from '../lib/moneyLeakRun'
import { parseRevenueCsv } from '../lib/revenueMapping'

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type InputMode = 'csv' | 'summary'
type RoleTab = 'developer' | 'pm' | 'ceo'
type EvidenceAudience = 'customer' | 'expert'
type DecisionUrgency = IcpTimingDecisionUrgency

interface PdfArtifact {
  id?: string
  downloadPath: string
}

interface Props {
  workspaceId: string
  productionStatus: string
  audience?: EvidenceAudience
  fetcher?: Fetcher
}

function safeFetcher(fetcher?: Fetcher): Fetcher | null {
  if (fetcher) return fetcher
  return typeof fetch === 'function' ? fetch : null
}

function isUsageSummary(value: unknown): value is UsageImportSummary {
  return Boolean(value)
    && typeof value === 'object'
    && Array.isArray((value as UsageImportSummary).rows)
    && Array.isArray((value as UsageImportSummary).featureSummaries)
    && typeof (value as UsageImportSummary).requestCount === 'number'
}

function firstPdfArtifact(value: unknown): PdfArtifact | null {
  const reportRun = value && typeof value === 'object' ? (value as { reportRun?: unknown }).reportRun : null
  const artifacts = reportRun && typeof reportRun === 'object'
    ? (reportRun as { artifacts?: unknown }).artifacts
    : null
  if (!Array.isArray(artifacts)) return null
  const artifact = artifacts.find(item => (
    item
    && typeof item === 'object'
    && (item as { format?: unknown }).format === 'pdf'
    && typeof (item as { downloadPath?: unknown }).downloadPath === 'string'
  ))
  return artifact ? artifact as PdfArtifact : null
}

function addSnapshotRef(snapshot: DiagnosisSnapshot, snapshotRef: string): DiagnosisSnapshot {
  return {
    ...snapshot,
    snapshotRef,
    refs: Array.from(new Set([...snapshot.refs, snapshotRef])),
  }
}

function customerProductionStatusLabel(status: string): string {
  return status === 'connected' ? '저장 연결됨' : '리포트 저장 준비 전'
}

function customerReportGateReason(reason: string): string {
  if (/[가-힣]/.test(reason)) return reason
  if (reason === 'ready') return '공유 가능한 PDF 리포트를 만들 수 있습니다.'
  if (/raw_prompt|api_key|blocked/i.test(reason)) return '차단된 필드를 제거한 뒤 다시 업로드하세요.'
  if (/pii/i.test(reason)) return 'PII 후보 매핑을 확인해야 PDF 리포트를 만들 수 있습니다.'
  if (/token_allowance|mapping|customer|plan|revenue|profitability|loss/i.test(reason)) {
    return 'customer_id, included_tokens, revenue_collected 매핑을 확인해야 PDF 리포트를 만들 수 있습니다.'
  }
  if (/summary|json|inspection/i.test(reason)) return 'Trust Gate를 통과한 safe summary가 필요합니다.'
  return '데이터 준비 상태를 확인해야 PDF 리포트를 만들 수 있습니다.'
}

function numericInput(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function inferPdcaAxes(summary: UsageImportSummary, hasRevenue: boolean): AgentPayrollIcpAxis[] {
  const axes: AgentPayrollIcpAxis[] = []
  if (summary.rows.some(row => row.customerId)) axes.push('customer')
  if (summary.rows.some(row => row.feature)) axes.push('feature')
  if (summary.rows.some(row => row.planId)) axes.push('plan')
  if (hasRevenue) axes.push('revenue')
  if (summary.rows.some(row => row.status && row.status !== 'success')) axes.push('retry')
  return Array.from(new Set(axes))
}

function statusTone(status: string): 'positive' | 'caution' | 'neutral' {
  return status === 'within_target' ? 'positive' : status === 'exceeded' ? 'caution' : 'neutral'
}

function UnitEconomicsPdcaPanel({
  instrumentation,
  monthlyLlmSpendKrw,
  freeFitMinutes,
  dataReadinessMinutes,
  snapshotMinutes,
  monthlyReviewMinutes,
  operatorTouchCount,
  decisionOwnerConfirmed,
  nextReviewDate,
  decisionUrgency,
  onMonthlyLlmSpendKrwChange,
  onFreeFitMinutesChange,
  onDataReadinessMinutesChange,
  onSnapshotMinutesChange,
  onMonthlyReviewMinutesChange,
  onOperatorTouchCountChange,
  onDecisionOwnerConfirmedChange,
  onNextReviewDateChange,
  onDecisionUrgencyChange,
}: {
  instrumentation: AgentPayrollPdcaInstrumentation
  monthlyLlmSpendKrw: string
  freeFitMinutes: string
  dataReadinessMinutes: string
  snapshotMinutes: string
  monthlyReviewMinutes: string
  operatorTouchCount: string
  decisionOwnerConfirmed: boolean
  nextReviewDate: string
  decisionUrgency: DecisionUrgency
  onMonthlyLlmSpendKrwChange: (value: string) => void
  onFreeFitMinutesChange: (value: string) => void
  onDataReadinessMinutesChange: (value: string) => void
  onSnapshotMinutesChange: (value: string) => void
  onMonthlyReviewMinutesChange: (value: string) => void
  onOperatorTouchCountChange: (value: string) => void
  onDecisionOwnerConfirmedChange: (value: boolean) => void
  onNextReviewDateChange: (value: string) => void
  onDecisionUrgencyChange: (value: DecisionUrgency) => void
}) {
  const operationRows = [
    ['Free Fit', instrumentation.operations.freeFit],
    ['Data Readiness', instrumentation.operations.dataReadiness],
    ['Snapshot', instrumentation.operations.snapshot],
    ['Monthly Review', instrumentation.operations.monthlyReview],
    ['operator touch', instrumentation.operations.operatorTouch],
  ] as const

  return (
    <div data-testid="unit-economics-pdca-panel" className="mt-4 rounded-wds border border-line-neutral bg-surface-normal p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold" lang="en">Unit economics PDCA</p>
          <p className="mt-1 text-xs text-label-neutral">
            Fit Check, Data Readiness, Snapshot, Monthly Review가 실제로 돈을 버는 흐름인지 계측합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs" lang="en">
          <Badge tone={instrumentation.icp.grade === 'A' ? 'positive' : instrumentation.icp.grade === 'B' ? 'caution' : 'neutral'}>
            ICP grade: {instrumentation.icp.grade}
          </Badge>
          <Badge tone="neutral">route: {instrumentation.icp.route}</Badge>
          <Badge tone={instrumentation.monthlyReview.eligible ? 'positive' : 'caution'}>
            {instrumentation.monthlyReview.eligible ? 'monthly_review_ready' : 'monthly_review_blocked'}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Field label="월 LLM/API 비용(KRW)" htmlFor="pdca-monthly-llm-spend" help="A급 ICP 기준은 월 100,000원 이상입니다.">
          <input
            id="pdca-monthly-llm-spend"
            value={monthlyLlmSpendKrw}
            onChange={event => onMonthlyLlmSpendKrwChange(event.currentTarget.value)}
            inputMode="numeric"
            className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal"
          />
        </Field>
        <Field label="결정 긴급도" htmlFor="pdca-decision-urgency" help="가격/마진 결정을 당장 해야 할수록 A급 ICP에 가깝습니다.">
          <select
            id="pdca-decision-urgency"
            value={decisionUrgency}
            onChange={event => onDecisionUrgencyChange(event.currentTarget.value as DecisionUrgency)}
            className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal"
          >
            <option value="pricing_or_margin_now">pricing_or_margin_now</option>
            <option value="exploratory">exploratory</option>
            <option value="none">none</option>
          </select>
        </Field>
        <Field label="다음 리뷰 날짜" htmlFor="pdca-next-review-date" help="Monthly Review는 다음 검산 날짜가 있어야 열립니다.">
          <input
            id="pdca-next-review-date"
            value={nextReviewDate}
            onChange={event => onNextReviewDateChange(event.currentTarget.value)}
            type="date"
            className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal"
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-5">
        <Field label="Free Fit Check minutes" htmlFor="pdca-free-fit-minutes">
          <input id="pdca-free-fit-minutes" value={freeFitMinutes} onChange={event => onFreeFitMinutesChange(event.currentTarget.value)} inputMode="numeric" className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal" />
        </Field>
        <Field label="Data Readiness minutes" htmlFor="pdca-data-readiness-minutes">
          <input id="pdca-data-readiness-minutes" value={dataReadinessMinutes} onChange={event => onDataReadinessMinutesChange(event.currentTarget.value)} inputMode="numeric" className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal" />
        </Field>
        <Field label="Snapshot minutes" htmlFor="pdca-snapshot-minutes">
          <input id="pdca-snapshot-minutes" value={snapshotMinutes} onChange={event => onSnapshotMinutesChange(event.currentTarget.value)} inputMode="numeric" className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal" />
        </Field>
        <Field label="Monthly Review minutes" htmlFor="pdca-monthly-review-minutes">
          <input id="pdca-monthly-review-minutes" value={monthlyReviewMinutes} onChange={event => onMonthlyReviewMinutesChange(event.currentTarget.value)} inputMode="numeric" className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal" />
        </Field>
        <Field label="Operator touch count" htmlFor="pdca-operator-touch-count">
          <input id="pdca-operator-touch-count" value={operatorTouchCount} onChange={event => onOperatorTouchCountChange(event.currentTarget.value)} inputMode="numeric" className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal" />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-label-neutral">
        <input
          type="checkbox"
          checked={decisionOwnerConfirmed}
          onChange={event => onDecisionOwnerConfirmedChange(event.currentTarget.checked)}
        />
        <span lang="en">Decision owner confirmed</span>
      </label>

      <div className="mt-3 grid gap-2 md:grid-cols-5" lang="en">
        {operationRows.map(([label, item]) => (
          <div key={label} className="rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs">
            <div className="flex items-center justify-between gap-1">
              <span>{label}: {item.status}</span>
              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            </div>
            <p className="mt-1 text-label-alternative">
              {fmtNumber(item.actual)} / {fmtNumber(item.target)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2" lang="en">
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs">
          <p className="font-semibold text-label-normal">Monthly Review blockers</p>
          <p className="mt-1 text-label-alternative">
            {instrumentation.monthlyReview.blockingReasons.join(', ') || 'none'}
          </p>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs">
          <p className="font-semibold text-label-normal">Recommended next actions</p>
          <p className="mt-1 text-label-alternative">
            {instrumentation.recommendedNextActions.join(', ') || 'none'}
          </p>
        </div>
      </div>
    </div>
  )
}

function ServiceMvpOfferPanel() {
  const offer = AI_COST_SNAPSHOT_OFFER

  return (
    <div data-testid="customer-service-offer" className="mb-4 rounded-wds border border-line-neutral bg-fill-alternative p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-label-normal" translate="no">API Token Leakage Snapshot</p>
          <p className="mt-1 text-xs leading-5 text-label-neutral">
            prompt-free, PII-safe CSV로 포함 token, 초과 token, 미회수 AI 원가를 먼저 보여주는 1회 진단 리포트를 만듭니다.
          </p>
        </div>
        <Badge tone="primary" translate="no">
          {fmtKrwRange(offer.minPriceKrw, offer.maxPriceKrw)}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-label-neutral md:grid-cols-3" lang="en">
        <p className="rounded-wds border border-line-neutral bg-surface-normal p-2">safe data request</p>
        <p className="rounded-wds border border-line-neutral bg-surface-normal p-2">sample report preview</p>
        <p className="rounded-wds border border-line-neutral bg-surface-normal p-2">review call decision</p>
      </div>
    </div>
  )
}

function CustomerEvidenceSummary({
  snapshot,
  selectedDecisionTitle,
}: {
  snapshot: DiagnosisSnapshot
  selectedDecisionTitle?: string
}) {
  return (
    <div className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
      <p className="text-sm font-semibold">고객용 근거 요약</p>
      <ul className="mt-2 grid gap-2 text-xs text-label-neutral">
        <li>
          <strong className="text-label-normal">고객별 token allowance와 매출 매핑</strong>
          <p className="mt-1">업로드된 safe field 범위에서만 사용 token, 포함 token, revenue_collected를 연결했습니다.</p>
        </li>
        <li>
          <strong className="text-label-normal">결정 후보 계산</strong>
          <p className="mt-1">{selectedDecisionTitle ?? '결정 후보를 선택하면 PDF에 포함할 판단 근거가 고정됩니다.'}</p>
        </li>
        <li>
          <strong className="text-label-normal">리포트 제한</strong>
          <p className="mt-1">{customerReportGateReason(snapshot.reportGate.reason)}</p>
        </li>
      </ul>
    </div>
  )
}

const DECISION_CHOICE_LABELS: Record<MoneyLeakDecisionChoice, string> = {
  adopt: 'Adopt',
  reject: 'Reject',
  hold: 'Hold',
}

function stepTone(state: MoneyLeakStepState): string {
  if (state === 'done') return 'border-status-positive/30 bg-status-positive/10 text-status-positive'
  if (state === 'current') return 'border-primary-normal/40 bg-primary-normal/10 text-primary-normal'
  return 'border-line-neutral bg-fill-alternative text-label-alternative'
}

function MoneyLeakStepRail({ states }: { states: Record<MoneyLeakStepId, MoneyLeakStepState> }) {
  return (
    <ol className="grid gap-2 md:grid-cols-6" aria-label="Money Leak Run steps">
      {MONEY_LEAK_STEPS.map(step => (
        <li key={step.id} className={`rounded-wds border px-3 py-2 ${stepTone(states[step.id])}`}>
          <p className="text-xs font-semibold">{step.label}</p>
          <p className="mt-1 text-xs">{step.description}</p>
        </li>
      ))}
    </ol>
  )
}

function ImportTemplateButtons({
  title,
  templates,
  onSelect,
}: {
  title: string
  templates: ImportTemplateProfile[]
  onSelect: (template: ImportTemplateProfile) => void
}) {
  return (
    <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
      <p className="text-xs font-semibold text-label-normal">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {templates.map(template => (
          <Button key={template.id} type="button" variant="secondary" size="sm" onClick={() => onSelect(template)}>
            {template.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function IcpTimingGatePanel({
  assessment,
  monthlyAiSpendKrw,
  hasCustomerRevenueMapping,
  hasHeavyUserSuspicion,
  decisionUrgency,
  needsCeoFinanceReport,
  onMonthlyAiSpendKrwChange,
  onHasCustomerRevenueMappingChange,
  onHasHeavyUserSuspicionChange,
  onDecisionUrgencyChange,
  onNeedsCeoFinanceReportChange,
}: {
  assessment: IcpTimingGateAssessment
  monthlyAiSpendKrw: string
  hasCustomerRevenueMapping: boolean
  hasHeavyUserSuspicion: boolean
  decisionUrgency: DecisionUrgency
  needsCeoFinanceReport: boolean
  onMonthlyAiSpendKrwChange: (value: string) => void
  onHasCustomerRevenueMappingChange: (value: boolean) => void
  onHasHeavyUserSuspicionChange: (value: boolean) => void
  onDecisionUrgencyChange: (value: DecisionUrgency) => void
  onNeedsCeoFinanceReportChange: (value: boolean) => void
}) {
  const monthlySpend = numericInput(monthlyAiSpendKrw)
  const scoreLabel = `${fmtNumber(assessment.score)} / ${fmtNumber(assessment.maxScore)}`

  return (
    <div data-testid="icp-timing-gate" className="mb-4 rounded-wds border border-line-neutral bg-surface-normal p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold" lang="en">ICP timing gate</p>
          <p className="mt-1 text-xs leading-5 text-label-neutral">
            지금 유료 진단으로 갈지, 샘플 Snapshot으로 먼저 볼지 5문항으로 가릅니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs" lang="en">
          <Badge tone={assessment.grade === 'A' ? 'positive' : assessment.grade === 'B' ? 'caution' : 'neutral'}>
            ICP grade: {assessment.grade}
          </Badge>
          <Badge tone={assessment.route === 'diagnosis_report' ? 'positive' : assessment.route === 'data_readiness_first' ? 'caution' : 'neutral'}>
            route: {assessment.route}
          </Badge>
          <Badge tone="neutral">score: {scoreLabel}</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="월 LLM/API 비용 (KRW)" htmlFor="icp-monthly-ai-spend" help="월 300,000원 이상이면 유료 진단 후보로 봅니다.">
            <input
              id="icp-monthly-ai-spend"
              value={monthlyAiSpendKrw}
              onChange={event => onMonthlyAiSpendKrwChange(event.currentTarget.value)}
              inputMode="numeric"
              className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal"
            />
          </Field>
          <Field label="가격/마진 결정 긴급도" htmlFor="icp-decision-urgency">
            <select
              id="icp-decision-urgency"
              value={decisionUrgency}
              onChange={event => onDecisionUrgencyChange(event.currentTarget.value as DecisionUrgency)}
              className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal"
            >
              <option value="pricing_or_margin_now">pricing_or_margin_now</option>
              <option value="exploratory">exploratory</option>
              <option value="none">none</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs font-semibold text-label-neutral">
            <input
              type="checkbox"
              checked={hasCustomerRevenueMapping}
              onChange={event => onHasCustomerRevenueMappingChange(event.currentTarget.checked)}
            />
            <span>customer_id와 revenue_collected 매핑 가능</span>
          </label>
          <label className="flex items-center gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs font-semibold text-label-neutral">
            <input
              type="checkbox"
              checked={hasHeavyUserSuspicion}
              onChange={event => onHasHeavyUserSuspicionChange(event.currentTarget.checked)}
            />
            <span>heavy user가 포함 token을 넘기는 것 같음</span>
          </label>
          <label className="flex items-center gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs font-semibold text-label-neutral md:col-span-2">
            <input
              type="checkbox"
              checked={needsCeoFinanceReport}
              onChange={event => onNeedsCeoFinanceReportChange(event.currentTarget.checked)}
            />
            <span>CEO/Finance 보고 필요</span>
          </label>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs">
          <p className="font-semibold text-label-normal">{assessment.headline}</p>
          <p className="mt-2 text-label-neutral">현재 입력 비용: <span translate="no">{fmtKrw(monthlySpend)}</span></p>
          <p className="mt-2 font-semibold text-primary-normal">{assessment.primaryCta}</p>
          <p className="mt-2 text-label-alternative" lang="en">
            missing: {assessment.missing.join(', ') || 'none'}
          </p>
        </div>
      </div>
    </div>
  )
}

function LocalReportPreview({
  snapshot,
  selectedDecisionId,
  decisionChoice,
}: {
  snapshot: DiagnosisSnapshot
  selectedDecisionId: string
  decisionChoice: MoneyLeakDecisionChoice
}) {
  const payload = reportFirstPayloadFromDiagnosis(snapshot, selectedDecisionId, decisionChoice)

  return (
    <div data-testid="local-report-preview" className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold" translate="no">{payload.title}</p>
          <p className="mt-1 text-xs leading-5 text-label-neutral">{payload.executiveSummary}</p>
        </div>
        <Badge tone="primary">preview</Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {payload.metrics.slice(0, 6).map(metric => (
          <div key={metric.label} className="rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs">
            <p className="font-semibold text-label-normal">{metric.label}</p>
            <p className="mt-1 text-label-neutral" translate="no">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs">
        <p className="font-semibold text-label-normal">선택된 결정</p>
        <p className="mt-1 text-label-neutral">{DECISION_CHOICE_LABELS[decisionChoice]} / {payload.recommendations[0]}</p>
      </div>
    </div>
  )
}

export function ReportFirstDiagnosisWorkspace({ workspaceId, productionStatus, audience = 'customer', fetcher }: Props) {
  const importGenerationRef = useRef(0)
  const [inputMode, setInputMode] = useState<InputMode>('csv')
  const [rawCsv, setRawCsv] = useState('')
  const [revenueCsv, setRevenueCsv] = useState('')
  const [summaryJson, setSummaryJson] = useState('')
  const [snapshot, setSnapshot] = useState<DiagnosisSnapshot | null>(null)
  const [selectedDecisionId, setSelectedDecisionId] = useState('')
  const [decisionChoice, setDecisionChoice] = useState<MoneyLeakDecisionChoice | ''>('')
  const [trustResult, setTrustResult] = useState<TrustInspectionResult | null>(null)
  const [activeRole, setActiveRole] = useState<RoleTab>('developer')
  const [message, setMessage] = useState('')
  const [pdfArtifact, setPdfArtifact] = useState<PdfArtifact | null>(null)
  const [reportError, setReportError] = useState('')
  const [showEvidence, setShowEvidence] = useState(false)
  const [monthlyLlmSpendKrw, setMonthlyLlmSpendKrw] = useState('')
  const [freeFitMinutes, setFreeFitMinutes] = useState('')
  const [dataReadinessMinutes, setDataReadinessMinutes] = useState('')
  const [snapshotMinutes, setSnapshotMinutes] = useState('')
  const [monthlyReviewMinutes, setMonthlyReviewMinutes] = useState('')
  const [operatorTouchCount, setOperatorTouchCount] = useState('')
  const [hasCustomerRevenueMapping, setHasCustomerRevenueMapping] = useState(false)
  const [hasHeavyUserSuspicion, setHasHeavyUserSuspicion] = useState(false)
  const [needsCeoFinanceReport, setNeedsCeoFinanceReport] = useState(false)
  const [decisionOwnerConfirmed, setDecisionOwnerConfirmed] = useState(false)
  const [nextReviewDate, setNextReviewDate] = useState('')
  const [decisionUrgency, setDecisionUrgency] = useState<DecisionUrgency>('pricing_or_margin_now')
  const [pdcaAttributionAxes, setPdcaAttributionAxes] = useState<AgentPayrollIcpAxis[]>([])

  const request = useMemo(() => safeFetcher(fetcher), [fetcher])
  const selectedDecision = snapshot?.decisionCandidates.find(item => item.id === selectedDecisionId)
  const roleView = snapshot?.roleViews[activeRole]
  const diagnosis = snapshot ? buildMarginDiagnosisSummary(snapshot) : null
  const usageTemplates = useMemo(() => importTemplatesByKind('usage'), [])
  const allowanceTemplates = useMemo(() => importTemplatesByKind('allowance'), [])
  const icpTimingAssessment = useMemo(() => assessIcpTimingGate({
    monthlyAiSpendKrw: numericInput(monthlyLlmSpendKrw),
    hasCustomerRevenueMapping,
    hasHeavyUserSuspicion,
    decisionUrgency,
    needsCeoFinanceReport,
  }), [
    decisionUrgency,
    hasCustomerRevenueMapping,
    hasHeavyUserSuspicion,
    monthlyLlmSpendKrw,
    needsCeoFinanceReport,
  ])
  const pdcaInstrumentation = useMemo(() => buildAgentPayrollPdcaInstrumentation({
    icp: {
      hasProductionAiFeature: Boolean(snapshot?.reportGate.canPreview),
      monthlyLlmSpendKrw: numericInput(monthlyLlmSpendKrw),
      canExportMetadataWithoutRawPrompt: Boolean(trustResult?.allowedForSnapshot && trustResult.status !== 'blocked'),
      availableAxes: pdcaAttributionAxes,
      hasDecisionOwner: decisionOwnerConfirmed,
      decisionUrgency,
    },
    operations: {
      freeFitMinutes: numericInput(freeFitMinutes),
      dataReadinessMinutes: numericInput(dataReadinessMinutes),
      snapshotMinutes: numericInput(snapshotMinutes),
      monthlyReviewMinutes: numericInput(monthlyReviewMinutes),
      operatorTouchCount: numericInput(operatorTouchCount),
    },
    decisionLoop: {
      decisionChoice: decisionChoice || null,
      hasNextReviewDate: Boolean(nextReviewDate),
      hasDecisionOwner: decisionOwnerConfirmed,
      attributionAxes: pdcaAttributionAxes,
      hasPersistedReportArtifact: Boolean(pdfArtifact),
    },
  }), [
    dataReadinessMinutes,
    decisionChoice,
    decisionOwnerConfirmed,
    decisionUrgency,
    freeFitMinutes,
    monthlyLlmSpendKrw,
    monthlyReviewMinutes,
    nextReviewDate,
    operatorTouchCount,
    pdfArtifact,
    pdcaAttributionAxes,
    snapshot,
    snapshotMinutes,
    trustResult,
  ])

  function nextImportGeneration() {
    importGenerationRef.current += 1
    return importGenerationRef.current
  }

  function invalidatePendingImports() {
    importGenerationRef.current += 1
  }

  function resetDerivedReportState() {
    invalidatePendingImports()
    setSnapshot(null)
    setSelectedDecisionId('')
    setDecisionChoice('')
    setTrustResult(null)
    setMessage('')
    setPdfArtifact(null)
    setReportError('')
    setShowEvidence(false)
    setNextReviewDate('')
    setDecisionOwnerConfirmed(false)
    setPdcaAttributionAxes([])
  }

  function updateRawCsv(value: string) {
    setRawCsv(value)
    resetDerivedReportState()
  }

  function updateRevenueCsv(value: string) {
    setRevenueCsv(value)
    resetDerivedReportState()
  }

  function updateSummaryJson(value: string) {
    setSummaryJson(value)
    resetDerivedReportState()
  }

  function applyUsageTemplate(template: ImportTemplateProfile) {
    setInputMode('csv')
    setRawCsv(template.sampleCsv)
    resetDerivedReportState()
  }

  function applyAllowanceTemplate(template: ImportTemplateProfile) {
    setInputMode('csv')
    setRevenueCsv(template.sampleCsv)
    resetDerivedReportState()
  }

  async function persistCsvImport(csv: string) {
    if (!request) return null
    try {
      const response = await request('/api/usage/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, csv, source: 'report_first_workspace' }),
      })
      if (!response.ok) return null
      const body = await response.json() as { snapshotRef?: string }
      return typeof body.snapshotRef === 'string' ? body.snapshotRef : null
    } catch {
      return null
    }
  }

  function applySnapshot(
    summary: UsageImportSummary,
    snapshotRef: string | null = null,
    options: {
      useSampleRevenue?: boolean
      customerRevenueUsd?: Record<string, number>
      planRevenueUsd?: Record<string, number>
      customerIncludedTokens?: Record<string, number>
      planIncludedTokens?: Record<string, number>
      customerOverageRateUsdPer1kTokens?: Record<string, number>
      planOverageRateUsdPer1kTokens?: Record<string, number>
    } = {},
  ) {
    const importGeneration = nextImportGeneration()
    const next = buildDiagnosisSnapshot({
      workspaceId,
      summary,
      snapshotRef,
      customerRevenueUsd: options.customerRevenueUsd ?? (options.useSampleRevenue ? CUSTOMER_MONTHLY_REVENUE : undefined),
      planRevenueUsd: options.planRevenueUsd ?? (options.useSampleRevenue ? PLAN_MONTHLY_REVENUE : undefined),
      customerIncludedTokens: options.customerIncludedTokens ?? (options.useSampleRevenue ? CUSTOMER_TOKEN_ALLOWANCE : undefined),
      planIncludedTokens: options.planIncludedTokens ?? (options.useSampleRevenue ? PLAN_TOKEN_ALLOWANCE : undefined),
      customerOverageRateUsdPer1kTokens: options.customerOverageRateUsdPer1kTokens ?? (options.useSampleRevenue ? CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS : undefined),
      planOverageRateUsdPer1kTokens: options.planOverageRateUsdPer1kTokens ?? (options.useSampleRevenue ? PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS : undefined),
    })
    setSnapshot(next)
    setSelectedDecisionId('')
    setDecisionChoice('')
    setTrustResult(summary.trustInspection ?? null)
    setPdcaAttributionAxes(inferPdcaAxes(summary, Boolean(options.useSampleRevenue || options.customerRevenueUsd)))
    setPdfArtifact(null)
    setReportError('')
    setShowEvidence(false)
    setMessage(next.reportGate.status === 'blocked' ? next.reportGate.reason : '')
    return importGeneration
  }

  function attachRemoteSnapshotRef(csv: string, importGeneration: number) {
    void persistCsvImport(csv).then(remoteSnapshotRef => {
      if (!remoteSnapshotRef || importGeneration !== importGenerationRef.current) return
      setSnapshot(current => current ? addSnapshotRef(current, remoteSnapshotRef) : current)
    })
  }

  function handleStartCsv() {
    const revenueMapping = revenueCsv.trim() ? parseRevenueCsv(revenueCsv) : null
    const revenueReady = revenueMapping !== null
      && revenueMapping.errors.length === 0
      && revenueMapping.mappingWarnings.every(warning => (
        !warning.includes('missing_revenue')
        && !warning.includes('invalid_revenue')
      ))
      && Object.keys(revenueMapping.customerRevenueUsd).length > 0
    const tokenPolicyReady = revenueReady
      && Object.keys(revenueMapping.customerIncludedTokens).length > 0
    const summary = parseUsageCsv(rawCsv, MODELS, {
      revenueBasis: revenueReady && tokenPolicyReady ? 'manual_map' : undefined,
    })
    const importGeneration = applySnapshot(summary, null, {
      customerRevenueUsd: revenueReady ? revenueMapping.customerRevenueUsd : undefined,
      planRevenueUsd: revenueReady ? revenueMapping.planRevenueUsd : undefined,
      customerIncludedTokens: tokenPolicyReady ? revenueMapping.customerIncludedTokens : undefined,
      planIncludedTokens: tokenPolicyReady ? revenueMapping.planIncludedTokens : undefined,
      customerOverageRateUsdPer1kTokens: tokenPolicyReady ? revenueMapping.customerOverageRateUsdPer1kTokens : undefined,
      planOverageRateUsdPer1kTokens: tokenPolicyReady ? revenueMapping.planOverageRateUsdPer1kTokens : undefined,
    })
    if (revenueMapping && revenueMapping.errors.length > 0) {
      setMessage(revenueMapping.errors.join(', '))
    } else if (revenueMapping && revenueMapping.mappingWarnings.length > 0) {
      setMessage(revenueMapping.mappingWarnings.join(', '))
    }
    if (summary.trustInspection?.allowedForSnapshot && summary.trustInspection.status !== 'blocked') {
      attachRemoteSnapshotRef(rawCsv, importGeneration)
    }
  }

  function handleSample() {
    setRawCsv(SPARK_CLAW_SAMPLE_CSV)
    setRevenueCsv(SPARK_CLAW_TOKEN_ALLOWANCE_CSV)
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const revenueMapping = parseRevenueCsv(SPARK_CLAW_TOKEN_ALLOWANCE_CSV)
    const importGeneration = applySnapshot(summary, null, {
      customerRevenueUsd: revenueMapping.customerRevenueUsd,
      planRevenueUsd: revenueMapping.planRevenueUsd,
      customerIncludedTokens: revenueMapping.customerIncludedTokens,
      planIncludedTokens: revenueMapping.planIncludedTokens,
      customerOverageRateUsdPer1kTokens: revenueMapping.customerOverageRateUsdPer1kTokens,
      planOverageRateUsdPer1kTokens: revenueMapping.planOverageRateUsdPer1kTokens,
    })
    attachRemoteSnapshotRef(SPARK_CLAW_SAMPLE_CSV, importGeneration)
  }

  function handleSummary() {
    try {
      const parsed = JSON.parse(summaryJson) as unknown
      if (!isUsageSummary(parsed) || !parsed.trustInspection) {
        invalidatePendingImports()
        setMessage('summary_trust_inspection_missing')
        setSnapshot(null)
        setTrustResult(null)
        setPdfArtifact(null)
        setReportError('')
        setShowEvidence(false)
        return
      }
      applySnapshot(parsed)
    } catch {
      invalidatePendingImports()
      setMessage('summary_json_invalid')
      setSnapshot(null)
      setTrustResult(null)
      setPdfArtifact(null)
      setReportError('')
      setShowEvidence(false)
    }
  }

  async function handleCreateReport() {
    if (!snapshot || !selectedDecisionId || !decisionChoice || !snapshot.reportGate.canCreateArtifact || !request) return
    setReportError('')
    try {
      const response = await request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          period: new Date().toISOString().slice(0, 7),
          decisionIds: [selectedDecisionId],
          usageSnapshotRef: snapshot.snapshotRef,
          reportFirst: reportFirstPayloadFromDiagnosis(snapshot, selectedDecisionId, decisionChoice),
        }),
      })
      const body = await response.json() as unknown
      if (!response.ok) {
        setReportError(response.status === 503 ? 'storage_not_configured' : 'production_report_unavailable')
        return
      }
      const pdf = firstPdfArtifact(body)
      if (!pdf) {
        setReportError('production_report_unavailable')
        return
      }
      setPdfArtifact(pdf)
    } catch {
      setReportError('production_report_unavailable')
    }
  }

  const pdfDisabledReason = !snapshot
    ? '진단 snapshot이 필요합니다.'
    : !snapshot.reportGate.canCreateArtifact
      ? customerReportGateReason(snapshot.reportGate.reason)
      : !selectedDecisionId
        ? '결정 후보를 먼저 선택하세요.'
        : !decisionChoice
          ? 'Adopt/Reject/Hold 선택이 필요합니다.'
          : !request
            ? 'production_report_unavailable'
            : ''
  const canCreatePdf = pdfDisabledReason === ''
  const visibleMessage = audience === 'expert' ? message : message ? customerReportGateReason(message) : ''
  const stepStates = deriveMoneyLeakStepStates({
    hasInput: Boolean(rawCsv.trim() || revenueCsv.trim() || summaryJson.trim()),
    trustStatus: trustResult?.status ?? (snapshot?.reportGate.status === 'blocked' ? 'blocked' : 'waiting_for_upload'),
    hasDiagnosis: Boolean(snapshot?.reportGate.canPreview),
    hasSelectedCandidate: Boolean(selectedDecisionId),
    hasDecisionChoice: Boolean(decisionChoice),
    hasPdfArtifact: Boolean(pdfArtifact),
  })

  return (
    <section className="grid gap-6" data-testid="report-first-diagnosis">
      <div className="rounded-wds border border-line-neutral bg-surface-alternative p-5">
        <p className="text-sm font-semibold uppercase text-primary-normal" translate="no">AgentPayroll</p>
        <h1 className="mt-2 text-3xl font-semibold">API Token Leakage Snapshot</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-label-neutral">
          usage CSV와 token allowance/revenue summary를 넣으면 포함 token을 초과한 고객, token을 태우는 기능, 지금 검토할 overage 정책 후보를 한 번에 찾습니다.
        </p>
        <p className="mt-4 text-xs font-semibold text-label-alternative" lang="en">
          usage CSV + allowance CSV -&gt; Trust Gate -&gt; Token Leak -&gt; Token Policy -&gt; Adopt/Reject/Hold -&gt; Report Preview
        </p>
        <div className="mt-4">
          <MoneyLeakStepRail states={stepStates} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge tone={productionStatus === 'connected' ? 'positive' : 'caution'} translate={audience === 'expert' ? 'no' : undefined}>
            {audience === 'expert' ? productionStatus : customerProductionStatusLabel(productionStatus)}
          </Badge>
          <Badge tone="primary">token leak 진단</Badge>
          <Badge tone="neutral">preview는 즉시, PDF는 저장 후 표시</Badge>
        </div>
      </div>

      <Surface
        eyebrow="데이터 준비"
        title="usage CSV + token allowance CSV"
        description="사용량, 포함 token, 회수된 매출을 연결해 초과 사용분과 미회수 원가를 먼저 보여줍니다."
        action={!snapshot ? <Button variant="primary" disabled>PDF 리포트 생성</Button> : undefined}
      >
        <TrustAssurancePanel result={trustResult} audience={audience} />
        <ServiceMvpOfferPanel />
        <IcpTimingGatePanel
          assessment={icpTimingAssessment}
          monthlyAiSpendKrw={monthlyLlmSpendKrw}
          hasCustomerRevenueMapping={hasCustomerRevenueMapping}
          hasHeavyUserSuspicion={hasHeavyUserSuspicion}
          decisionUrgency={decisionUrgency}
          needsCeoFinanceReport={needsCeoFinanceReport}
          onMonthlyAiSpendKrwChange={setMonthlyLlmSpendKrw}
          onHasCustomerRevenueMappingChange={setHasCustomerRevenueMapping}
          onHasHeavyUserSuspicionChange={setHasHeavyUserSuspicion}
          onDecisionUrgencyChange={setDecisionUrgency}
          onNeedsCeoFinanceReportChange={setNeedsCeoFinanceReport}
        />
        {audience === 'expert' && (
          <UnitEconomicsPdcaPanel
            instrumentation={pdcaInstrumentation}
            monthlyLlmSpendKrw={monthlyLlmSpendKrw}
            freeFitMinutes={freeFitMinutes}
            dataReadinessMinutes={dataReadinessMinutes}
            snapshotMinutes={snapshotMinutes}
            monthlyReviewMinutes={monthlyReviewMinutes}
            operatorTouchCount={operatorTouchCount}
            decisionOwnerConfirmed={decisionOwnerConfirmed}
            nextReviewDate={nextReviewDate}
            decisionUrgency={decisionUrgency}
            onMonthlyLlmSpendKrwChange={setMonthlyLlmSpendKrw}
            onFreeFitMinutesChange={setFreeFitMinutes}
            onDataReadinessMinutesChange={setDataReadinessMinutes}
            onSnapshotMinutesChange={setSnapshotMinutes}
            onMonthlyReviewMinutesChange={setMonthlyReviewMinutes}
            onOperatorTouchCountChange={setOperatorTouchCount}
            onDecisionOwnerConfirmedChange={setDecisionOwnerConfirmed}
            onNextReviewDateChange={setNextReviewDate}
            onDecisionUrgencyChange={setDecisionUrgency}
          />
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={inputMode === 'csv' ? 'primary' : 'secondary'} size="sm" onClick={() => setInputMode('csv')}>
            사용량 CSV 업로드
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setInputMode('csv')}>
            allowance/revenue CSV 업로드
          </Button>
          {audience === 'expert' && (
            <Button variant={inputMode === 'summary' ? 'primary' : 'secondary'} size="sm" onClick={() => setInputMode('summary')}>
              Summary JSON
            </Button>
          )}
        </div>

        {inputMode === 'csv' || audience === 'customer' ? (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <ImportTemplateButtons
                title="usage CSV templates"
                templates={usageTemplates}
                onSelect={applyUsageTemplate}
              />
              <ImportTemplateButtons
                title="allowance/revenue templates"
                templates={allowanceTemplates}
                onSelect={applyAllowanceTemplate}
              />
            </div>
            <Field label="사용량 CSV" htmlFor="report-first-csv" help="필수 컬럼: customer_id, feature, model, input_tokens, output_tokens. 권장: total_cost, latency_ms, status. plan_id는 보조 분류값입니다.">
              <textarea
                id="report-first-csv"
                value={rawCsv}
                onChange={event => updateRawCsv(event.currentTarget.value)}
                rows={7}
                className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 font-mono text-xs text-label-normal"
              />
            </Field>
            <Field label="token allowance/revenue CSV" htmlFor="report-first-revenue-csv" help="필수 컬럼: customer_id, revenue_collected, included_tokens. 권장: overage_rate_usd_per_1k_tokens. plan_id는 선택입니다.">
              <textarea
                id="report-first-revenue-csv"
                value={revenueCsv}
                onChange={event => updateRevenueCsv(event.currentTarget.value)}
                rows={4}
                className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 font-mono text-xs text-label-normal"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleStartCsv}>분석 시작</Button>
              <Button variant="secondary" onClick={handleSample}>SparkClaw 샘플로 진단 / 샘플로 보기</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <Field label="구조화 summary JSON" htmlFor="report-first-summary" help="자연어 summary는 파싱하지 않습니다. UsageImportSummary와 trustInspection이 필요합니다.">
              <textarea
                id="report-first-summary"
                value={summaryJson}
                onChange={event => updateSummaryJson(event.currentTarget.value)}
                rows={7}
                className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 font-mono text-xs text-label-normal"
              />
            </Field>
            <Button variant="primary" onClick={handleSummary}>summary 진단</Button>
          </div>
        )}
        {visibleMessage && (
          <p className="mt-3 text-xs font-semibold text-status-negative" translate={audience === 'expert' ? 'no' : undefined}>
            {visibleMessage}
          </p>
        )}
      </Surface>

      {snapshot && (
        <Surface
          eyebrow="Diagnosis preview"
          title="Token leak 분석 완료"
          description="포함 token을 초과한 고객, token을 가장 많이 태우는 기능, token policy 후보를 한 화면에서 확인합니다."
          action={(
            <Button
              variant="primary"
              onClick={() => void handleCreateReport()}
              disabled={!canCreatePdf}
            >
              PDF 리포트 생성
            </Button>
          )}
        >
          <div className="grid gap-3 md:grid-cols-4">
            {snapshot.metrics.map(metric => (
              <MetricTile key={metric.id} label={metric.label} value={metric.value} help={metric.help} />
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {diagnosis && [diagnosis.topLeak, diagnosis.marginBreakingFeature, diagnosis.recommendedDecision].map(item => (
              <div key={item.title} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-label-neutral">{item.plainLanguageSummary}</p>
                <Badge className="mt-2" tone="positive">{item.customerSafeEvidenceLabel}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="text-sm font-semibold">결정 후보 선택</p>
              <div className="mt-2 grid gap-2">
                {snapshot.decisionCandidates.map(candidate => (
                  <label key={candidate.id} className="flex cursor-pointer gap-2 rounded-wds border border-line-neutral p-3 text-sm">
                    <input
                      type="radio"
                      name="diagnosis-decision"
                      aria-label={candidate.title}
                      checked={selectedDecisionId === candidate.id}
                      onChange={() => {
                        setSelectedDecisionId(candidate.id)
                        setDecisionChoice('')
                        setPdfArtifact(null)
                        setShowEvidence(false)
                      }}
                    />
                    <span>
                      <strong>{candidate.title}</strong>
                      <span className="mt-1 block text-xs text-label-neutral">{candidate.body}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3">
                <p className="text-sm font-semibold">Adopt/Reject/Hold</p>
                <p className="mt-1 text-xs text-label-neutral">
                  사용자가 직접 선택하기 전까지 PDF는 decision-backed 상태가 아닙니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['adopt', 'reject', 'hold'] as const).map(choice => (
                    <Button
                      key={choice}
                      type="button"
                      size="sm"
                      variant={decisionChoice === choice ? 'primary' : 'secondary'}
                      disabled={!selectedDecisionId}
                      onClick={() => {
                        setDecisionChoice(choice)
                        setPdfArtifact(null)
                      }}
                    >
                      {DECISION_CHOICE_LABELS[choice]}
                    </Button>
                  ))}
                </div>
                {!decisionChoice && (
                  <p className="mt-2 text-xs font-semibold text-status-cautionary">
                    Adopt/Reject/Hold 선택이 필요합니다.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="text-sm font-semibold">역할별 보기</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant={activeRole === 'developer' ? 'primary' : 'secondary'} onClick={() => setActiveRole('developer')}>개발자 보기</Button>
                <Button size="sm" variant={activeRole === 'pm' ? 'primary' : 'secondary'} onClick={() => setActiveRole('pm')}>PM 보기</Button>
                <Button size="sm" variant={activeRole === 'ceo' ? 'primary' : 'secondary'} onClick={() => setActiveRole('ceo')}>CEO 보기</Button>
              </div>
              {roleView && (
                <div className="mt-3 grid gap-2 text-xs">
                  <p className="font-semibold">{roleView.assistant.title}</p>
                  <p className="text-label-neutral">{roleView.assistant.focus}</p>
                  <p translate="no">{roleView.primaryKpis.map(kpi => `${kpi.label}: ${kpi.value}`).join(' / ')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <p className="text-sm font-semibold">{audience === 'expert' ? 'PDF artifact gate' : '리포트 preview / PDF 준비'}</p>
            <p className="mt-1 text-xs text-label-neutral">
              {diagnosis ? `근거 상태: ${diagnosis.evidenceState}` : '근거 상태: 검토 필요'}
              {selectedDecision ? ` / ${selectedDecision.title}` : ''}
            </p>
            {snapshot && selectedDecisionId && decisionChoice && (
              <LocalReportPreview
                snapshot={snapshot}
                selectedDecisionId={selectedDecisionId}
                decisionChoice={decisionChoice}
              />
            )}
            {pdfArtifact ? (
              <a className="mt-3 inline-flex rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href={pdfArtifact.downloadPath}>
                PDF 리포트 다운로드
              </a>
            ) : (
              <p className="mt-2 text-xs text-label-alternative">
                {audience === 'expert'
                  ? '저장된 artifact가 아직 없어서 PDF 다운로드는 열리지 않았습니다.'
                  : '아직 PDF 다운로드가 준비되지 않았습니다.'}
              </p>
            )}
            {pdfDisabledReason && (
              <p className="mt-2 text-xs font-semibold text-status-cautionary" data-testid="pdf-disabled-reason">
                {pdfDisabledReason}
              </p>
            )}
            {reportError && <p className="mt-2 text-xs font-semibold text-status-negative" translate="no">{reportError}</p>}
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowEvidence(value => !value)}>
                {showEvidence ? '근거 닫기' : '근거 보기'}
              </Button>
              {showEvidence && (
                audience === 'expert' ? (
                  <div className="mt-3 rounded-wds border border-line-neutral bg-surface-normal p-3">
                    <p className="text-sm font-semibold">Evidence refs</p>
                    <ul className="mt-2 grid gap-1 text-xs text-label-alternative">
                      {snapshot.refs.map(ref => (
                        <li key={ref} translate="no">{ref}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-label-alternative">
                      RAG, Watchtower, source review, and agent route details stay in expert/admin views unless needed for inspection.
                    </p>
                  </div>
                ) : (
                  <CustomerEvidenceSummary snapshot={snapshot} selectedDecisionTitle={selectedDecision?.title} />
                )
              )}
            </div>
          </div>
        </Surface>
      )}
    </section>
  )
}
