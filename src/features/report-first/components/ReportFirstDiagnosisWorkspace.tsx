'use client'

import { useMemo, useState } from 'react'

import { MODELS } from '../../../data/models'
import { Badge, Button, Field, MetricTile, Surface } from '../../../shared/ui/primitives'
import {
  CUSTOMER_MONTHLY_REVENUE,
  PLAN_MONTHLY_REVENUE,
  SPARK_CLAW_SAMPLE_CSV,
} from '../../usage/data/sparkClawSample'
import { TrustAssurancePanel } from '../../trust/components/TrustAssurancePanel'
import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import { parseUsageCsv, type UsageImportSummary } from '../../usage/lib/usageImport'
import {
  buildDiagnosisSnapshot,
  buildMarginDiagnosisSummary,
  reportFirstPayloadFromDiagnosis,
  type DiagnosisSnapshot,
  type MoneyLeakDecisionChoice,
} from '../lib/diagnosis'
import {
  MONEY_LEAK_STEPS,
  deriveMoneyLeakStepStates,
  type MoneyLeakStepId,
  type MoneyLeakStepState,
} from '../lib/moneyLeakRun'

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type InputMode = 'csv' | 'summary'
type RoleTab = 'developer' | 'pm' | 'ceo'

interface PdfArtifact {
  id?: string
  downloadPath: string
}

interface Props {
  workspaceId: string
  productionStatus: string
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

export function ReportFirstDiagnosisWorkspace({ workspaceId, productionStatus, fetcher }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('csv')
  const [rawCsv, setRawCsv] = useState('')
  const [summaryJson, setSummaryJson] = useState('')
  const [snapshot, setSnapshot] = useState<DiagnosisSnapshot | null>(null)
  const [selectedDecisionId, setSelectedDecisionId] = useState('')
  const [decisionChoice, setDecisionChoice] = useState<MoneyLeakDecisionChoice | ''>('')
  const [trustResult, setTrustResult] = useState<TrustInspectionResult | null>(null)
  const [activeRole, setActiveRole] = useState<RoleTab>('developer')
  const [message, setMessage] = useState('')
  const [pdfArtifact, setPdfArtifact] = useState<PdfArtifact | null>(null)
  const [reportError, setReportError] = useState('')

  const request = useMemo(() => safeFetcher(fetcher), [fetcher])
  const selectedDecision = snapshot?.decisionCandidates.find(item => item.id === selectedDecisionId)
  const roleView = snapshot?.roleViews[activeRole]
  const diagnosis = snapshot ? buildMarginDiagnosisSummary(snapshot) : null

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
    options: { useSampleRevenue?: boolean } = {},
  ) {
    const next = buildDiagnosisSnapshot({
      workspaceId,
      summary,
      snapshotRef,
      customerRevenueUsd: options.useSampleRevenue ? CUSTOMER_MONTHLY_REVENUE : undefined,
      planRevenueUsd: options.useSampleRevenue ? PLAN_MONTHLY_REVENUE : undefined,
    })
    setSnapshot(next)
    setSelectedDecisionId('')
    setDecisionChoice('')
    setTrustResult(summary.trustInspection ?? null)
    setPdfArtifact(null)
    setReportError('')
    setMessage(next.reportGate.status === 'blocked' ? next.reportGate.reason : '')
    return next
  }

  function attachRemoteSnapshotRef(csv: string) {
    void persistCsvImport(csv).then(remoteSnapshotRef => {
      if (!remoteSnapshotRef) return
      setSnapshot(current => current ? addSnapshotRef(current, remoteSnapshotRef) : current)
    })
  }

  function handleStartCsv() {
    const summary = parseUsageCsv(rawCsv, MODELS)
    applySnapshot(summary)
    attachRemoteSnapshotRef(rawCsv)
  }

  function handleSample() {
    setRawCsv(SPARK_CLAW_SAMPLE_CSV)
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    applySnapshot(summary, null, { useSampleRevenue: true })
    attachRemoteSnapshotRef(SPARK_CLAW_SAMPLE_CSV)
  }

  function handleSummary() {
    try {
      const parsed = JSON.parse(summaryJson) as unknown
      if (!isUsageSummary(parsed) || !parsed.trustInspection) {
        setMessage('summary_trust_inspection_missing')
        setSnapshot(null)
        setTrustResult(null)
        setPdfArtifact(null)
        return
      }
      applySnapshot(parsed)
    } catch {
      setMessage('summary_json_invalid')
      setSnapshot(null)
      setTrustResult(null)
      setPdfArtifact(null)
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

  const canCreatePdf = Boolean(snapshot?.reportGate.canCreateArtifact && selectedDecisionId && decisionChoice)
  const stepStates = deriveMoneyLeakStepStates({
    hasInput: Boolean(rawCsv.trim() || summaryJson.trim()),
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
        <h1 className="mt-2 text-3xl font-semibold">AI 비용 리포트 만들기</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-label-neutral">
          CSV/summary를 넣으면 손해 고객, 마진 깨는 기능, 지금 검토할 정책 후보를 한 번에 찾고 내부 공유용 PDF로 묶습니다.
        </p>
        <p className="mt-4 text-xs font-semibold text-label-alternative">
          CSV/summary -&gt; Trust Gate -&gt; Money Leak -&gt; Decision Candidate -&gt; Adopt/Reject/Hold -&gt; PDF Report
        </p>
        <div className="mt-4">
          <MoneyLeakStepRail states={stepStates} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge tone={productionStatus === 'connected' ? 'positive' : 'caution'} translate="no">
            {productionStatus}
          </Badge>
          <Badge tone="primary">진단 준비</Badge>
          <Badge tone="neutral">PDF는 저장 성공 후 표시</Badge>
        </div>
      </div>

      <Surface
        eyebrow="데이터 준비"
        title="사용량 CSV 업로드"
        description="사용량과 매출을 연결하면 비용 손실 후보와 실행 항목을 먼저 보여줍니다."
        action={!snapshot ? <Button variant="primary" disabled>PDF 리포트 생성</Button> : undefined}
      >
        <TrustAssurancePanel result={trustResult} />

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={inputMode === 'csv' ? 'primary' : 'secondary'} size="sm" onClick={() => setInputMode('csv')}>
            사용량 CSV 업로드
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setInputMode('summary')}>
            Stripe/매출 CSV 업로드
          </Button>
          <Button variant={inputMode === 'summary' ? 'primary' : 'secondary'} size="sm" onClick={() => setInputMode('summary')}>
            Summary JSON
          </Button>
        </div>

        {inputMode === 'csv' ? (
          <div className="grid gap-3">
            <Field label="사용량 CSV" htmlFor="report-first-csv" help="필수 컬럼: feature, model, input_tokens, output_tokens. 권장: customer_id, plan_id, session_id, agent_run_id, total_cost.">
              <textarea
                id="report-first-csv"
                value={rawCsv}
                onChange={event => setRawCsv(event.currentTarget.value)}
                rows={7}
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
                onChange={event => setSummaryJson(event.currentTarget.value)}
                rows={7}
                className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 font-mono text-xs text-label-normal"
              />
            </Field>
            <Button variant="primary" onClick={handleSummary}>summary 진단</Button>
          </div>
        )}
        {message && <p className="mt-3 text-xs font-semibold text-status-negative" translate="no">{message}</p>}
      </Surface>

      {snapshot && (
        <Surface
          eyebrow="Diagnosis preview"
          title="분석 완료"
          description="마진 진단 결과와 공유 전 확인해야 할 실행 항목을 한 화면에서 확인합니다."
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
            <p className="text-sm font-semibold">PDF artifact gate</p>
            <p className="mt-1 text-xs text-label-neutral">
              {diagnosis ? `근거 상태: ${diagnosis.evidenceState}` : '근거 상태: 검토 필요'}
              {selectedDecision ? ` / ${selectedDecision.title}` : ''}
            </p>
            {pdfArtifact ? (
              <a className="mt-3 inline-flex rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href={pdfArtifact.downloadPath}>
                PDF 리포트 다운로드
              </a>
            ) : (
              <p className="mt-2 text-xs text-label-alternative">
                저장된 artifact가 아직 없어서 PDF 다운로드는 열리지 않았습니다.
              </p>
            )}
            {reportError && <p className="mt-2 text-xs font-semibold text-status-negative" translate="no">{reportError}</p>}
          </div>
        </Surface>
      )}
    </section>
  )
}
