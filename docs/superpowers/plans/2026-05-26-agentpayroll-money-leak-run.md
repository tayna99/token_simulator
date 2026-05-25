# AgentPayroll Money Leak Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AgentPayroll open on a single first-5-minute Money Leak Run: CSV/summary -> Trust Gate -> loss customer / margin-breaking feature -> policy candidate -> explicit Adopt/Reject/Hold -> PDF artifact.

**Architecture:** Keep the deterministic diagnosis in `src/features/report-first/lib/diagnosis.ts`, add a tiny pure step-state helper for the run rail, and make `ReportFirstDiagnosisWorkspace` the primary client UI. RAG, Watchtower, agent routes, admin readiness, and raw refs remain available only through evidence/expert surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5, Tailwind CSS 3, Vitest 4, Testing Library.

---

## Pre-Flight Notes

- The current worktree is dirty and already contains uncommitted/untracked report-first, trust, usage, Supabase, and Next.js files. Do not revert or overwrite unrelated work.
- Stage only the files listed in each task.
- Follow the project constitution: calculation stays in deterministic modules, visible numbers use `src/lib/format.ts`, and production routes must not treat fixture/demo/memory data as production evidence.
- The design spec is `docs/superpowers/specs/2026-05-26-agentpayroll-money-leak-run-design.md`.

---

## File Structure

- Modify `src/features/report-first/lib/diagnosis.ts`
  - Remove default decision choices from candidates.
  - Require an explicit user choice when building report payloads.

- Modify `src/features/report-first/lib/diagnosis.test.ts`
  - Cover no-default decision behavior, explicit payload choice, blocked summary, and needs-mapping report lock.

- Create `src/features/report-first/lib/moneyLeakRun.ts`
  - Own the six-step run labels and pure step status derivation.

- Create `src/features/report-first/lib/moneyLeakRun.test.ts`
  - Cover initial, trust-blocked, diagnosis-ready, decision-selected, decision-choice, and PDF-ready states.

- Modify `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
  - Add step rail, prominent Trust Gate, explicit decision choice, PDF gate, and evidence reveal.

- Modify `src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`
  - Lock the first-view IA, explicit decision gate, state rerender behavior, summary rejection, evidence reveal, and PDF artifact success path.

- Modify `src/features/report/lib/reportArtifacts.ts`
  - Make the one-page report read as a Money Leak Run artifact with selected decision and trust state.

- Modify `src/features/report/lib/reportArtifacts.test.ts`
  - Cover the report artifact body for decision choice, selected decision refs, trust, and PDF-first semantics.

- Check `app/(app)/w/[workspaceId]/page.tsx`
  - Keep Money Leak Run as the primary workspace body.
  - Keep production readiness and role layout in collapsed expert mode.

---

### Task 1: Make Decision Choice Explicit In The Diagnosis Model

**Files:**
- Modify: `src/features/report-first/lib/diagnosis.ts`
- Test: `src/features/report-first/lib/diagnosis.test.ts`

- [ ] **Step 1: Write the failing diagnosis tests**

Append these tests inside `describe('buildDiagnosisSnapshot', () => { ... })` in `src/features/report-first/lib/diagnosis.test.ts`.

```ts
  it('does not preselect Adopt Reject or Hold on decision candidates', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    expect(snapshot.decisionCandidates.length).toBeGreaterThan(0)
    expect(snapshot.decisionCandidates.every(candidate => !('decisionChoice' in candidate))).toBe(true)
  })

  it('requires an explicit user decision choice when building the report-first payload', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    const payload = reportFirstPayloadFromDiagnosis(
      snapshot,
      'decision:diagnosis:pricing-policy',
      'adopt',
    )

    expect(payload.decisionRefs).toEqual(['decision:diagnosis:pricing-policy'])
    expect(payload.decisionChoice).toBe('adopt')
    expect(payload.recommendations[0]).toMatch(/gross margin|정책|요금제/)
  })

  it('throws a clear error when the selected decision candidate is missing', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({ workspaceId: 'workspace-demo', summary })

    expect(() => reportFirstPayloadFromDiagnosis(
      snapshot,
      'decision:diagnosis:not-found',
      'hold',
    )).toThrow('money_leak_decision_candidate_missing')
  })
```

Update the import at the top of the test file.

```ts
import { buildDiagnosisSnapshot, buildMarginDiagnosisSummary, reportFirstPayloadFromDiagnosis } from './diagnosis'
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm run test:run -- src/features/report-first/lib/diagnosis.test.ts
```

Expected: FAIL because `reportFirstPayloadFromDiagnosis` does not accept a third argument yet and candidates still include `decisionChoice`.

- [ ] **Step 3: Update diagnosis types and remove default candidate choices**

In `src/features/report-first/lib/diagnosis.ts`, replace the decision candidate type block with:

```ts
export type MoneyLeakDecisionChoice = 'adopt' | 'reject' | 'hold'
export type DiagnosisInsightKind = 'loss_customers' | 'margin_breaking_feature' | 'policy_candidate'
export type ReportGateStatus = 'preview_ready' | 'needs_mapping' | 'blocked'
export type DiagnosisDecisionKind = 'usage_limit' | 'pricing_policy' | 'model_routing'
```

Replace `DiagnosisDecisionCandidate` with:

```ts
export interface DiagnosisDecisionCandidate {
  id: string
  kind: DiagnosisDecisionKind
  title: string
  body: string
  refs: string[]
}
```

Remove each `decisionChoice: 'hold',` line from the three `decisionCandidates` entries.

- [ ] **Step 4: Require explicit choice in report payload construction**

Replace `reportFirstPayloadFromDiagnosis` in `src/features/report-first/lib/diagnosis.ts` with:

```ts
export function reportFirstPayloadFromDiagnosis(
  snapshot: DiagnosisSnapshot,
  decisionCandidateId: string,
  decisionChoice: MoneyLeakDecisionChoice,
): OnePageReportArtifactInput {
  const candidate = snapshot.decisionCandidates.find(item => item.id === decisionCandidateId)
  if (!candidate) {
    throw new Error('money_leak_decision_candidate_missing')
  }

  return {
    title: 'AgentPayroll AI 비용 진단 리포트',
    executiveSummary: snapshot.insights.map(insight => `${insight.title}: ${insight.body}`).join(' '),
    metrics: snapshot.metrics.map(metric => ({ label: metric.label, value: metric.value })),
    recommendations: [candidate.body],
    risks: snapshot.reportGate.warnings.length > 0
      ? snapshot.reportGate.warnings
      : ['저장된 artifact 생성 전에는 PDF 공유를 완료로 표시하지 않습니다.'],
    refs: snapshot.refs,
    trust: {
      status: snapshot.reportGate.status,
      dataLimitations: snapshot.reportGate.warnings,
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
    },
    formulaVersion: 'cost_formula_v0.3',
    providerRegistryVersion: 'provider_registry_v0.4',
    snapshotVersion: snapshot.snapshotRef ?? 'diagnosis_preview',
    decisionRefs: [candidate.id],
    decisionChoice,
  }
}
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```powershell
npm run test:run -- src/features/report-first/lib/diagnosis.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```powershell
git add src/features/report-first/lib/diagnosis.ts src/features/report-first/lib/diagnosis.test.ts
git commit -m "feat: require explicit money leak decision choice"
```

---

### Task 2: Add A Pure Money Leak Step Rail Model

**Files:**
- Create: `src/features/report-first/lib/moneyLeakRun.ts`
- Test: `src/features/report-first/lib/moneyLeakRun.test.ts`

- [ ] **Step 1: Write the failing step model tests**

Create `src/features/report-first/lib/moneyLeakRun.test.ts`.

```ts
import { describe, expect, it } from 'vitest'

import { MONEY_LEAK_STEPS, deriveMoneyLeakStepStates } from './moneyLeakRun'

describe('deriveMoneyLeakStepStates', () => {
  it('starts on CSV summary input before any upload', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: false,
      trustStatus: 'waiting_for_upload',
      hasDiagnosis: false,
      hasSelectedCandidate: false,
      hasDecisionChoice: false,
      hasPdfArtifact: false,
    })

    expect(MONEY_LEAK_STEPS.map(step => step.id)).toEqual([
      'input',
      'trust',
      'money_leak',
      'candidate',
      'decision_choice',
      'pdf',
    ])
    expect(states.input).toBe('current')
    expect(states.trust).toBe('locked')
    expect(states.pdf).toBe('locked')
  })

  it('keeps blocked trust data from advancing into diagnosis', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'blocked',
      hasDiagnosis: false,
      hasSelectedCandidate: false,
      hasDecisionChoice: false,
      hasPdfArtifact: false,
    })

    expect(states.input).toBe('done')
    expect(states.trust).toBe('current')
    expect(states.money_leak).toBe('locked')
  })

  it('moves to decision choice after a candidate is selected', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'ready',
      hasDiagnosis: true,
      hasSelectedCandidate: true,
      hasDecisionChoice: false,
      hasPdfArtifact: false,
    })

    expect(states.money_leak).toBe('done')
    expect(states.candidate).toBe('done')
    expect(states.decision_choice).toBe('current')
    expect(states.pdf).toBe('locked')
  })

  it('keeps PDF current until an artifact exists', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'ready',
      hasDiagnosis: true,
      hasSelectedCandidate: true,
      hasDecisionChoice: true,
      hasPdfArtifact: false,
    })

    expect(states.decision_choice).toBe('done')
    expect(states.pdf).toBe('current')
  })

  it('marks the run done after PDF artifact creation', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'ready',
      hasDiagnosis: true,
      hasSelectedCandidate: true,
      hasDecisionChoice: true,
      hasPdfArtifact: true,
    })

    expect(states.pdf).toBe('done')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm run test:run -- src/features/report-first/lib/moneyLeakRun.test.ts
```

Expected: FAIL because `moneyLeakRun.ts` does not exist.

- [ ] **Step 3: Implement the pure step model**

Create `src/features/report-first/lib/moneyLeakRun.ts`.

```ts
export type MoneyLeakStepId = 'input' | 'trust' | 'money_leak' | 'candidate' | 'decision_choice' | 'pdf'
export type MoneyLeakStepState = 'done' | 'current' | 'locked'
export type MoneyLeakTrustStatus = 'waiting_for_upload' | 'ready' | 'needs_mapping' | 'blocked'

export interface MoneyLeakStep {
  id: MoneyLeakStepId
  label: string
  description: string
}

export interface MoneyLeakStepStateInput {
  hasInput: boolean
  trustStatus: MoneyLeakTrustStatus
  hasDiagnosis: boolean
  hasSelectedCandidate: boolean
  hasDecisionChoice: boolean
  hasPdfArtifact: boolean
}

export const MONEY_LEAK_STEPS: MoneyLeakStep[] = [
  { id: 'input', label: 'CSV/summary', description: '사용량 근거를 입력합니다.' },
  { id: 'trust', label: 'Trust Gate', description: '수집하지 않는 데이터와 차단 상태를 확인합니다.' },
  { id: 'money_leak', label: 'Money Leak', description: '손해 고객과 마진 깨는 기능을 찾습니다.' },
  { id: 'candidate', label: 'Decision Candidate', description: '가격, 제한, 모델/라우팅 후보를 고릅니다.' },
  { id: 'decision_choice', label: 'Adopt/Reject/Hold', description: '사람의 결정을 기록합니다.' },
  { id: 'pdf', label: 'PDF Report', description: '저장된 공유 artifact를 만듭니다.' },
]

export function deriveMoneyLeakStepStates(input: MoneyLeakStepStateInput): Record<MoneyLeakStepId, MoneyLeakStepState> {
  const trustDone = input.hasInput && input.trustStatus !== 'waiting_for_upload' && input.trustStatus !== 'blocked'
  const diagnosisDone = trustDone && input.hasDiagnosis
  const candidateDone = diagnosisDone && input.hasSelectedCandidate
  const choiceDone = candidateDone && input.hasDecisionChoice

  return {
    input: input.hasInput ? 'done' : 'current',
    trust: !input.hasInput ? 'locked' : trustDone ? 'done' : 'current',
    money_leak: !trustDone ? 'locked' : diagnosisDone ? 'done' : 'current',
    candidate: !diagnosisDone ? 'locked' : candidateDone ? 'done' : 'current',
    decision_choice: !candidateDone ? 'locked' : choiceDone ? 'done' : 'current',
    pdf: !choiceDone ? 'locked' : input.hasPdfArtifact ? 'done' : 'current',
  }
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
npm run test:run -- src/features/report-first/lib/moneyLeakRun.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/features/report-first/lib/moneyLeakRun.ts src/features/report-first/lib/moneyLeakRun.test.ts
git commit -m "feat: add money leak run step model"
```

---

### Task 3: Update The First-Run UI With Trust Gate And Explicit Decision Choice

**Files:**
- Modify: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
- Test: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`

- [ ] **Step 1: Update UI tests for the six-step run and explicit PDF gate**

In `src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`, add this test to the existing `describe`.

```ts
  it('requires explicit Adopt Reject or Hold before creating a PDF report', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/usage/import')) {
        return new Response(JSON.stringify({ snapshotRef: 'usage:p1:workspace-demo:2026-05' }), { status: 202 })
      }
      if (url.includes('/api/reports')) {
        return new Response(JSON.stringify({
          reportRun: {
            id: 'report-run-2026-05',
            artifacts: [{
              id: 'report-artifact:report-run-2026-05:pdf',
              format: 'pdf',
              downloadPath: '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:pdf',
            }],
          },
        }), { status: 202 })
      }
      return new Response('{}', { status: 404 })
    })

    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" fetcher={fetcher} />)

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))

    expect(screen.getByText(/Adopt\/Reject\/Hold 선택이 필요합니다/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))).toBeUndefined()

    fireEvent.click(screen.getByLabelText(/요금제\/credit 정책 변경 후보/))
    fireEvent.click(screen.getByRole('button', { name: /Adopt/ }))

    const enabledPdfButton = screen.getAllByRole('button', { name: /PDF 리포트 생성/ }).find(button => !button.hasAttribute('disabled'))
    expect(enabledPdfButton).toBeDefined()
    fireEvent.click(enabledPdfButton!)

    await waitFor(() => expect(screen.getByRole('link', { name: /PDF 리포트 다운로드/ })).toBeInTheDocument())
    const reportCall = fetcher.mock.calls.find(([input]) => String(input).includes('/api/reports'))
    expect(JSON.parse(String(reportCall?.[1]?.body)).reportFirst).toMatchObject({
      decisionRefs: ['decision:diagnosis:pricing-policy'],
      decisionChoice: 'adopt',
    })
  })
```

Replace the existing first-view test expectations so the heading and step rail match these strings:

```ts
expect(screen.getByRole('heading', { name: /AI 비용 리포트 만들기/ })).toBeInTheDocument()
expect(screen.getByText(/CSV\/summary -> Trust Gate -> Money Leak -> Decision Candidate -> Adopt\/Reject\/Hold -> PDF Report/)).toBeInTheDocument()
expect(screen.getByTestId('trust-assurance-panel')).toBeInTheDocument()
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```powershell
npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
```

Expected: FAIL because the UI currently preselects a candidate and has no explicit decision-choice gate.

- [ ] **Step 3: Import the new helpers and Trust panel**

At the top of `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`, add:

```ts
import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import { TrustAssurancePanel } from '../../trust/components/TrustAssurancePanel'
import {
  MONEY_LEAK_STEPS,
  deriveMoneyLeakStepStates,
  type MoneyLeakStepId,
  type MoneyLeakStepState,
} from '../lib/moneyLeakRun'
import type { MoneyLeakDecisionChoice } from '../lib/diagnosis'
```

The relative path from `src/features/report-first/components` to trust is `../../trust/...`.

- [ ] **Step 4: Add local step rail and choice copy helpers**

Add these helpers above `export function ReportFirstDiagnosisWorkspace`.

```tsx
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
```

- [ ] **Step 5: Add Trust and decision-choice state**

Inside `ReportFirstDiagnosisWorkspace`, replace state initialization for the selected decision with this block.

```ts
  const [snapshot, setSnapshot] = useState<DiagnosisSnapshot | null>(null)
  const [selectedDecisionId, setSelectedDecisionId] = useState('')
  const [decisionChoice, setDecisionChoice] = useState<MoneyLeakDecisionChoice | ''>('')
  const [trustResult, setTrustResult] = useState<TrustInspectionResult | null>(null)
```

In `applySnapshot`, set no default candidate and store trust output.

```ts
  function applySnapshot(summary: UsageImportSummary, snapshotRef: string | null = null) {
    const next = buildDiagnosisSnapshot({ workspaceId, summary, snapshotRef })
    setSnapshot(next)
    setSelectedDecisionId('')
    setDecisionChoice('')
    setTrustResult(summary.trustInspection ?? null)
    setPdfArtifact(null)
    setReportError('')
    setMessage(next.reportGate.status === 'blocked' ? next.reportGate.reason : '')
    return next
  }
```

In `handleSummary` failure paths, clear trust as well:

```ts
        setTrustResult(null)
```

- [ ] **Step 6: Gate report creation on explicit choice**

Replace `handleCreateReport` with:

```ts
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
```

Add this derived state before `return`.

```ts
  const canCreatePdf = Boolean(snapshot?.reportGate.canCreateArtifact && selectedDecisionId && decisionChoice)
  const stepStates = deriveMoneyLeakStepStates({
    hasInput: Boolean(rawCsv.trim() || summaryJson.trim()),
    trustStatus: trustResult?.status ?? (snapshot?.reportGate.status === 'blocked' ? 'blocked' : 'waiting_for_upload'),
    hasDiagnosis: Boolean(snapshot?.reportGate.canPreview),
    hasSelectedCandidate: Boolean(selectedDecisionId),
    hasDecisionChoice: Boolean(decisionChoice),
    hasPdfArtifact: Boolean(pdfArtifact),
  })
```

- [ ] **Step 7: Render the run header, step rail, Trust panel, and choice controls**

In the header, use this copy:

```tsx
<h1 className="mt-2 text-3xl font-semibold">AI 비용 리포트 만들기</h1>
<p className="mt-3 max-w-3xl text-sm leading-6 text-label-neutral">
  CSV/summary를 넣으면 손해 고객, 마진을 깨는 기능, 지금 검토할 정책 후보를 한 번에 찾고 내부 공유용 PDF로 묶습니다.
</p>
<p className="mt-4 text-xs font-semibold text-label-alternative">
  CSV/summary -&gt; Trust Gate -&gt; Money Leak -&gt; Decision Candidate -&gt; Adopt/Reject/Hold -&gt; PDF Report
</p>
<div className="mt-4">
  <MoneyLeakStepRail states={stepStates} />
</div>
```

Render Trust Gate immediately inside the input `Surface`, before the CSV/Summary mode controls:

```tsx
<TrustAssurancePanel result={trustResult} />
```

Replace the decision candidate radio block with labels that clear the PDF artifact and do not set a choice:

```tsx
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
```

Below the candidate list, add explicit choices:

```tsx
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
```

Change the PDF action button to:

```tsx
<Button
  variant="primary"
  onClick={() => void handleCreateReport()}
  disabled={!canCreatePdf}
>
  PDF 리포트 생성
</Button>
```

Change the PDF link text to:

```tsx
PDF 리포트 다운로드
```

- [ ] **Step 8: Run the component test and verify it passes**

Run:

```powershell
npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```powershell
git add src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
git commit -m "feat: add money leak run decision gate"
```

---

### Task 4: Add Evidence Reveal Without Console Sprawl

**Files:**
- Modify: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
- Test: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`

- [ ] **Step 1: Write the failing evidence reveal test**

Add this test to `ReportFirstDiagnosisWorkspace.test.tsx`.

```ts
  it('keeps internal refs hidden until the user opens evidence details', () => {
    render(<ReportFirstDiagnosisWorkspace workspaceId="workspace-demo" productionStatus="connected" />)

    fireEvent.click(screen.getByRole('button', { name: /SparkClaw 샘플로 진단/ }))

    expect(screen.queryByText(/tool:diagnosis/)).not.toBeInTheDocument()
    expect(screen.queryByText(/source:|evidence:|Watchtower|RAG|agent route/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /근거 보기/ }))

    expect(screen.getByText(/tool:diagnosis.loss_customers/)).toBeInTheDocument()
    expect(screen.getByText(/usage:p1|diagnosis_preview/)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```powershell
npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
```

Expected: FAIL because there is no evidence reveal button yet or refs may still be visible in the default view.

- [ ] **Step 3: Add evidence reveal state**

In `ReportFirstDiagnosisWorkspace`, add:

```ts
  const [showEvidence, setShowEvidence] = useState(false)
```

Reset it in `applySnapshot`:

```ts
    setShowEvidence(false)
```

Reset it when changing candidate:

```ts
        setShowEvidence(false)
```

- [ ] **Step 4: Render evidence details only after user action**

Replace any always-visible `refs:` paragraph in the PDF gate area with this block:

```tsx
<div className="mt-3">
  <Button type="button" variant="secondary" size="sm" onClick={() => setShowEvidence(value => !value)}>
    {showEvidence ? '근거 닫기' : '근거 보기'}
  </Button>
  {showEvidence && (
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
  )}
</div>
```

If the always-visible text currently says:

```tsx
refs: {snapshot.refs.join(', ')} / rows: {fmtTokens(snapshot.metrics.length)}
```

remove it from the default view. Keep the row count only if it does not expose refs:

```tsx
<p className="mt-2 text-xs text-label-alternative" translate="no">
  metrics: {fmtTokens(snapshot.metrics.length)}
</p>
```

- [ ] **Step 5: Run the component test and verify it passes**

Run:

```powershell
npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```powershell
git add src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
git commit -m "feat: hide money leak internals behind evidence reveal"
```

---

### Task 5: Polish The One-Page Report As A Money Leak Artifact

**Files:**
- Modify: `src/features/report/lib/reportArtifacts.ts`
- Test: `src/features/report/lib/reportArtifacts.test.ts`
- Test: `src/server/p1ApiHandlers.test.ts`

- [ ] **Step 1: Write the failing report artifact test**

In `src/features/report/lib/reportArtifacts.test.ts`, add this test.

```ts
  it('renders Money Leak Run report sections with selected decision and trust status', () => {
    const report = buildOnePageReportArtifact({
      title: 'AgentPayroll AI 비용 진단 리포트',
      executiveSummary: 'cust_001 고객이 손해이고 rag_chat 기능이 비용을 끌어올립니다.',
      metrics: [
        { label: 'AI 원가', value: '$444.00' },
        { label: '손해 고객', value: '1' },
      ],
      recommendations: ['credit 정책 후보를 adopt합니다.'],
      risks: ['revenue mapping은 sample assumption입니다.'],
      refs: ['tool:diagnosis.loss_customers', 'usage:p1:workspace-demo:2026-05'],
      trust: {
        status: 'preview_ready',
        dataLimitations: ['sample_revenue_assumption'],
        retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      },
      formulaVersion: 'cost_formula_v0.3',
      providerRegistryVersion: 'provider_registry_v0.4',
      snapshotVersion: 'usage:p1:workspace-demo:2026-05',
      decisionRefs: ['decision:diagnosis:pricing-policy'],
      decisionChoice: 'adopt',
    })

    expect(report.markdown).toContain('## Money Leak Diagnosis')
    expect(report.markdown).toContain('## Selected Decision')
    expect(report.markdown).toContain('- Decision choice: adopt')
    expect(report.markdown).toContain('- Decision ref: decision:diagnosis:pricing-policy')
    expect(report.markdown).toContain('## Trust and data handling')
  })
```

- [ ] **Step 2: Run the report artifact test and verify it fails**

Run:

```powershell
npm run test:run -- src/features/report/lib/reportArtifacts.test.ts
```

Expected: FAIL because the report currently uses `Recommendations` and `Operating decision` headings instead of Money Leak-specific headings.

- [ ] **Step 3: Update report markdown headings**

In `src/features/report/lib/reportArtifacts.ts`, replace the `buildOnePageReportArtifact` `lines` array with this structure:

```ts
  const lines = [
    `# ${input.title}`,
    '',
    '## Executive summary',
    input.executiveSummary,
    '',
    '## Money Leak Diagnosis',
    ...input.metrics.map(metric => `- ${metric.label}: ${metric.value}`),
    '',
    '## Selected Decision',
    ...(input.recommendations.length > 0 ? input.recommendations.map(item => `- ${item}`) : ['- No decision candidate selected.']),
    `- Decision choice: ${input.decisionChoice ?? 'not recorded'}`,
    ...(input.decisionRefs?.length ? input.decisionRefs.map(ref => `- Decision ref: ${ref}`) : ['- Decision ref: none']),
    '',
    '## Risks and limitations',
    ...(input.risks.length > 0 ? input.risks.map(item => `- ${item}`) : ['- No risk cards attached.']),
    '',
    '## Trust and data handling',
    `- Trust status: ${input.trust.status}`,
    `- Retention: ${input.trust.retentionNote}`,
    ...(input.trust.dataLimitations.length > 0
      ? input.trust.dataLimitations.map(item => `- Data limitation: ${item}`)
      : ['- Data limitation: none']),
    '',
    '## Rate Card and Pricing Context',
    ...(input.rateCardDraft ? [
      '- Rate-card draft',
      `  - Policy type: ${input.rateCardDraft.policyType}`,
      `  - Included credits: ${input.rateCardDraft.includedCredits}`,
      `  - Overage price per request: ${input.rateCardDraft.overagePricePerRequest}`,
      `  - Customer cap: ${input.rateCardDraft.capUsdPerCustomer}`,
      `  - Affected customers: ${input.rateCardDraft.affectedCustomerCount}`,
      `  - Execution mode: ${input.rateCardDraft.executionMode}`,
      ...input.rateCardDraft.marginBasisRefs.map(ref => `  - Margin basis ref: ${ref}`),
    ] : ['- Rate-card draft: none']),
    ...(input.pricingFreshness?.length ? [
      '- Pricing freshness',
      ...input.pricingFreshness.map(item => `  - ${item.modelId}: ${item.label} (${item.customerLabel})`),
    ] : ['- Pricing freshness: not attached']),
    '',
    '## Calculation provenance',
    `- Formula version: ${input.formulaVersion}`,
    `- Provider registry version: ${input.providerRegistryVersion}`,
    `- Snapshot version: ${input.snapshotVersion ?? 'snapshot unavailable'}`,
    '',
    '## Refs',
    ...input.refs.map(ref => `- ${ref}`),
  ]
```

- [ ] **Step 4: Update server test expectations**

In `src/server/p1ApiHandlers.test.ts`, keep any assertion for `Decision choice: hold` and replace any assertion for `Operating decision` with:

```ts
expect(markdown?.body).toContain('Selected Decision')
expect(markdown?.body).toContain('Decision choice: hold')
```

- [ ] **Step 5: Run report and server focused tests**

Run:

```powershell
npm run test:run -- src/features/report/lib/reportArtifacts.test.ts src/server/p1ApiHandlers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```powershell
git add src/features/report/lib/reportArtifacts.ts src/features/report/lib/reportArtifacts.test.ts src/server/p1ApiHandlers.test.ts
git commit -m "feat: format money leak report artifacts"
```

---

### Task 6: Verify Workspace Containment And Full Flow

**Files:**
- Check: `app/(app)/w/[workspaceId]/page.tsx`
- Check: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
- Check: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`

- [ ] **Step 1: Inspect workspace page containment**

Run:

```powershell
Get-Content -LiteralPath 'app/(app)/w/[workspaceId]/page.tsx' -Encoding utf8 | Select-Object -First 180
```

Expected: `ReportFirstDiagnosisWorkspace` renders before the expert `details`, and the expert summary text is exactly:

```tsx
<summary className="cursor-pointer text-sm font-semibold text-label-normal">
  전문가 모드: production readiness / dashboard layout
</summary>
```

- [ ] **Step 2: Confirm or adjust containment**

Production readiness, RAG, Watchtower, role layout, and debug refs must render below the Money Leak Run inside the existing `details` block.

The primary workspace section should stay shaped like:

```tsx
<div className="mt-6">
  <ReportFirstDiagnosisWorkspace workspaceId={workspaceId} productionStatus={status.status} />
</div>

<details className="mt-6 rounded-wds border border-line-neutral bg-surface-alternative p-5">
  <summary className="cursor-pointer text-sm font-semibold text-label-normal">
    전문가 모드: production readiness / dashboard layout
  </summary>
  {/* readiness, status list, role layout preview */}
</details>
```

- [ ] **Step 3: Run the report-first focused suite**

Run:

```powershell
npm run test:run -- src/features/report-first/lib/diagnosis.test.ts src/features/report-first/lib/moneyLeakRun.test.ts src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx src/features/report/lib/reportArtifacts.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run the whole test suite**

Run:

```powershell
npm run test:run
```

Expected: PASS. If Vitest hits the known Windows sandbox `spawn EPERM` failure, rerun the same command with approved escalation instead of treating it as a product failure.

- [ ] **Step 5: Run the production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 6: Start the local dev server for visual smoke**

Run:

```powershell
npm run dev
```

Expected: Next dev server starts. Use the first available local URL, usually `http://localhost:3000`.

- [ ] **Step 7: Browser smoke the first five minutes**

Open:

```text
http://localhost:3000/w/workspace-demo
```

Verify:

- The first visible product is Money Leak Run.
- The first screen says 손해 고객, 마진 깨는 기능, 정책 후보, PDF.
- RAG, Watchtower, agent route, parser strategy, source id, and tool ref are not visible before opening evidence/expert mode.
- Click sample diagnosis.
- Select `요금제/credit 정책 변경 후보`.
- Click `Adopt`.
- `PDF 리포트 생성` becomes enabled.
- If the reports API lacks persistence, the UI shows `storage_not_configured` or `production_report_unavailable`, not fake success.

- [ ] **Step 8: Commit verification-safe adjustments**

If Task 6 required code changes:

```powershell
git add app/(app)/w/[workspaceId]/page.tsx src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
git commit -m "fix: keep money leak run first in workspace"
```

If Task 6 required no code changes, do not create an empty commit.

---

## Final Verification Checklist

- [ ] `npm run test:run -- src/features/report-first/lib/diagnosis.test.ts src/features/report-first/lib/moneyLeakRun.test.ts src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx src/features/report/lib/reportArtifacts.test.ts`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] Browser smoke on `/w/workspace-demo`
- [ ] Confirm no first-view RAG/Watchtower/agent/debug terminology
- [ ] Confirm explicit Adopt/Reject/Hold is required before PDF creation
- [ ] Confirm PDF download appears only after report artifact persistence succeeds

---

## Commit Sequence

1. `feat: require explicit money leak decision choice`
2. `feat: add money leak run step model`
3. `feat: add money leak run decision gate`
4. `feat: hide money leak internals behind evidence reveal`
5. `feat: format money leak report artifacts`
6. Optional: `fix: keep money leak run first in workspace`

Keep these commits scoped. Do not stage unrelated dirty files already present in the workspace.
