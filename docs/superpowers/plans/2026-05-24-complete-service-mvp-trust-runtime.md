# Complete Service MVP Trust Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn AgentCost from a demo decision workspace into a service MVP runtime where real customer usage exports pass a Trust pipeline, become deterministic cost snapshots, get reviewed by the 11-agent operating team, and produce auditable human decisions.

**Architecture:** The product keeps the current `TS deterministic snapshot -> Python stage-routed operating agents -> supervisor synthesis -> human decision -> append-only ledger` runtime. This plan adds the missing front half: `Customer CSV/export -> Data Intake Policy -> Security Middleware -> Normalized Usage Table`, and preserves P1 extensions in a queue so later work can be checked against this plan.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind, Vitest, FastAPI, Python LangChain 1.0, Pydantic, existing deterministic cost/margin engines, existing Operating Agent and Operating Asset registries.

---

## Review Verdict

The playbook and four diagrams are directionally correct. The strongest architecture is the long vertical flow from raw customer export through Trust checks, normalized usage, deterministic snapshot, stage-routed agents, supervisor synthesis, human decision, and append-only ledger.

The current repo already covers the middle and back half well:

- `src/features/usage/lib/usageImport.ts` already parses CSV, creates `normalized_usage_table`, reports missing dimensions, and counts basic PII candidates.
- `src/features/agent/lib/buildAgentSnapshot.ts` already creates deterministic `snapshotVersion`.
- `src/features/agent/lib/agentRunRuntime.ts` already normalizes provider/fallback metadata.
- `agent_service/agentic_runtime.py` already has stage routing, 11 operating agents, read-only tools, tool envelopes, and supervisor fields.
- `src/features/decision-log/lib/decisionLog.ts` already stores `agentReview` metadata.
- `src/features/operating-assets/lib/operatingAssets.ts` already tracks 11 agents, 10 assets, and P1 automation modules.

The main gap is the **Trust Pipeline as a first-class product stage**. Right now PII scanning and schema health exist inside import parsing, but the product does not yet clearly show: data intake policy, file validation, anonymization status, analysis scope, blocked scope, retention note, and report review gate.

## Diagram Corrections To Preserve

- P0 should label the 11 agents as `Stage-routed Operating Agents`. `Agent-as-Tool` is P1 terminology unless the Supervisor LLM is actually choosing `call_*_agent` tools.
- The arrow direction must be `Snapshot Store -> Read-only Capability Tools`, not tools mutating snapshots.
- The arrow direction must be `Ledger Store -> Read-only Capability Tools`, with writes only through `Human Decision -> Ledger Writer -> Ledger`.
- Raw customer CSV must never go directly to Python/LangChain or the right AI panel. Only normalized metadata and deterministic snapshots can cross that boundary.
- `Run full operating review` should remain explicit. All-hands should not run automatically on every stage change.

## P0 Queue

P0 means the service MVP can accept a customer CSV/export, tell the operator what analysis is possible, compute costs deterministically, ask the operating team for review, and store the human decision with enough evidence to defend the report.

### Task 1: Trust Pipeline Domain Model

**Files:**
- Create: `src/features/trust/lib/dataIntakePolicy.ts`
- Create: `src/features/trust/lib/securityMiddleware.ts`
- Create: `src/features/trust/lib/securityMiddleware.test.ts`
- Modify: `src/features/usage/lib/usageImport.ts`
- Modify: `src/features/usage/lib/usageImport.test.ts`

- [ ] **Step 1: Write failing tests for PII, file, schema, and analysis-scope checks**

Add tests to `src/features/trust/lib/securityMiddleware.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { inspectUsageImportSecurity } from './securityMiddleware'

describe('inspectUsageImportSecurity', () => {
  it('blocks raw prompt and API key fields from snapshot ingestion', () => {
    const result = inspectUsageImportSecurity({
      filename: 'usage.csv',
      rawCsv: 'timestamp,prompt,api_key,input_tokens\n2026-05-01,"hello","sk-test",100',
    })

    expect(result.status).toBe('blocked')
    expect(result.warnings).toContain('raw_prompt_detected')
    expect(result.warnings).toContain('api_key_candidate_detected')
    expect(result.allowedForSnapshot).toBe(false)
  })

  it('marks plan margin analysis as blocked when plan_id is missing', () => {
    const result = inspectUsageImportSecurity({
      filename: 'usage.csv',
      rawCsv: 'timestamp,feature,model,input_tokens,output_tokens,total_cost\n2026-05-01,summary,gpt-5-mini,100,20,0.1',
    })

    expect(result.status).toBe('needs_mapping')
    expect(result.analysisScope.available).toContain('feature_cost')
    expect(result.analysisScope.blocked).toContain('plan_margin')
  })
})
```

- [ ] **Step 2: Implement `DataIntakePolicy`**

Create `src/features/trust/lib/dataIntakePolicy.ts`:

```ts
export type TrustWarning =
  | 'raw_prompt_detected'
  | 'pii_candidate_detected'
  | 'api_key_candidate_detected'
  | 'schema_mapping_required'
  | 'plan_id_missing'
  | 'customer_id_missing'
  | 'revenue_missing'
  | 'retention_policy_unconfirmed'

export interface DataIntakePolicy {
  allowRawPrompt: false
  allowPiiByDefault: false
  allowedFileTypes: readonly ['csv', 'jsonl']
  maxFileSizeMb: number
  retentionDays: number
  requiredColumns: readonly string[]
}

export const DEFAULT_DATA_INTAKE_POLICY: DataIntakePolicy = {
  allowRawPrompt: false,
  allowPiiByDefault: false,
  allowedFileTypes: ['csv', 'jsonl'],
  maxFileSizeMb: 10,
  retentionDays: 30,
  requiredColumns: ['timestamp', 'feature', 'model', 'input_tokens', 'output_tokens'],
}
```

- [ ] **Step 3: Implement `inspectUsageImportSecurity`**

Create `src/features/trust/lib/securityMiddleware.ts`:

```ts
import { DEFAULT_DATA_INTAKE_POLICY, type TrustWarning } from './dataIntakePolicy'

export type TrustInspectionStatus = 'ready' | 'needs_mapping' | 'blocked'

export interface TrustAnalysisScope {
  available: string[]
  blocked: string[]
}

export interface TrustInspectionInput {
  filename: string
  rawCsv: string
}

export interface TrustInspectionResult {
  status: TrustInspectionStatus
  warnings: TrustWarning[]
  allowedForSnapshot: boolean
  anonymizationStatus: 'not_needed' | 'required' | 'blocked'
  retentionNote: string
  analysisScope: TrustAnalysisScope
}

function headerSet(rawCsv: string): Set<string> {
  const firstLine = rawCsv.split(/\r?\n/)[0] ?? ''
  return new Set(firstLine.split(',').map(item => item.trim()))
}

function containsRawPrompt(headers: Set<string>): boolean {
  return ['prompt', 'raw_prompt', 'messages', 'conversation', 'transcript'].some(key => headers.has(key))
}

function containsApiKey(rawCsv: string): boolean {
  return /\bsk-[A-Za-z0-9_-]{12,}\b/.test(rawCsv)
}

function containsPii(rawCsv: string): boolean {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(rawCsv)
    || /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(rawCsv)
}

export function inspectUsageImportSecurity(input: TrustInspectionInput): TrustInspectionResult {
  const headers = headerSet(input.rawCsv)
  const warnings: TrustWarning[] = []

  if (containsRawPrompt(headers)) warnings.push('raw_prompt_detected')
  if (containsApiKey(input.rawCsv)) warnings.push('api_key_candidate_detected')
  if (containsPii(input.rawCsv)) warnings.push('pii_candidate_detected')
  if (!headers.has('plan_id')) warnings.push('plan_id_missing')
  if (!headers.has('customer_id')) warnings.push('customer_id_missing')

  const blocked = warnings.includes('raw_prompt_detected') || warnings.includes('api_key_candidate_detected')
  const needsMapping = warnings.includes('plan_id_missing') || warnings.includes('customer_id_missing')
  const available = ['feature_cost', 'model_cost', 'retry_cost'].filter(scope => (
    scope !== 'retry_cost' || headers.has('retry_count')
  ))
  const blockedScopes = [
    ...(headers.has('plan_id') ? [] : ['plan_margin']),
    ...(headers.has('customer_id') ? [] : ['customer_profitability']),
  ]

  return {
    status: blocked ? 'blocked' : needsMapping ? 'needs_mapping' : 'ready',
    warnings,
    allowedForSnapshot: !blocked,
    anonymizationStatus: warnings.includes('pii_candidate_detected') ? 'required' : 'not_needed',
    retentionNote: `Raw upload should be deleted or re-confirmed after ${DEFAULT_DATA_INTAKE_POLICY.retentionDays} days.`,
    analysisScope: { available, blocked: blockedScopes },
  }
}
```

- [ ] **Step 4: Thread the trust result into usage import summary**

Extend `UsageImportSummary` in `src/features/usage/lib/usageImport.ts`:

```ts
import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'

export interface UsageImportSummary {
  // existing fields
  trustInspection?: TrustInspectionResult
}
```

Inside `parseUsageCsv`, call `inspectUsageImportSecurity({ filename: 'inline.csv', rawCsv })` and include the result in both empty and successful summaries.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm run test:run -- src/features/trust/lib/securityMiddleware.test.ts src/features/usage/lib/usageImport.test.ts
```

Expected: all tests pass.

### Task 2: Import & Trust Check UI

**Files:**
- Create: `src/features/trust/components/ImportTrustCheckPanel.tsx`
- Create: `src/features/trust/components/ImportTrustCheckPanel.test.tsx`
- Modify: `src/features/usage/components/UsageImportPanel/index.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `src/features/trust/components/ImportTrustCheckPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImportTrustCheckPanel } from './ImportTrustCheckPanel'

describe('ImportTrustCheckPanel', () => {
  it('shows available and blocked analysis scope', () => {
    render(<ImportTrustCheckPanel result={{
      status: 'needs_mapping',
      warnings: ['plan_id_missing'],
      allowedForSnapshot: true,
      anonymizationStatus: 'not_needed',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: {
        available: ['feature_cost', 'model_cost'],
        blocked: ['plan_margin'],
      },
    }} />)

    expect(screen.getByText(/Trust check/i)).toBeInTheDocument()
    expect(screen.getByText(/feature_cost/i)).toBeInTheDocument()
    expect(screen.getByText(/plan_margin/i)).toBeInTheDocument()
    expect(screen.getByText(/30 days/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement the panel**

Create `src/features/trust/components/ImportTrustCheckPanel.tsx`:

```tsx
import type { TrustInspectionResult } from '../../lib/securityMiddleware'

interface Props {
  result: TrustInspectionResult | null | undefined
}

export function ImportTrustCheckPanel({ result }: Props) {
  if (!result) {
    return (
      <section className="rounded-wds border border-line-solid bg-surface-normal p-3 text-xs text-label-alternative">
        <h3 className="text-sm font-semibold text-label-normal">Trust check</h3>
        <p>Upload or load sample usage data to inspect file safety, schema health, and analysis scope.</p>
      </section>
    )
  }

  return (
    <section className="rounded-wds border border-line-solid bg-surface-normal p-3 text-xs text-label-alternative">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-label-normal">Trust check</h3>
        <span className="rounded-wds bg-fill-alternative px-2 py-1 font-semibold">{result.status}</span>
      </div>
      <p className="mt-2">Anonymization: {result.anonymizationStatus}</p>
      <p>Snapshot allowed: {result.allowedForSnapshot ? 'yes' : 'no'}</p>
      <p>Retention: {result.retentionNote}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <p className="font-semibold text-label-normal">Analysis available</p>
          {result.analysisScope.available.map(item => <span key={item} className="mr-1 inline-block rounded-wds bg-status-positive/10 px-2 py-1">{item}</span>)}
        </div>
        <div>
          <p className="font-semibold text-label-normal">Analysis blocked</p>
          {result.analysisScope.blocked.map(item => <span key={item} className="mr-1 inline-block rounded-wds bg-status-warning/10 px-2 py-1">{item}</span>)}
        </div>
      </div>
      {result.warnings.length > 0 && (
        <div className="mt-3">
          <p className="font-semibold text-label-normal">Warnings</p>
          {result.warnings.map(item => <span key={item} className="mr-1 inline-block rounded-wds bg-status-negative/10 px-2 py-1">{item}</span>)}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Render Trust check inside Usage Import**

Modify `UsageImportPanel` to render:

```tsx
<ImportTrustCheckPanel result={importedSummary?.trustInspection} />
```

Place it below the CSV controls and above the metric tiles so users see whether data is safe before trusting the numbers.

- [ ] **Step 4: Add App-level acceptance test**

In `src/app/App.test.tsx`, add:

```tsx
it('shows the trust pipeline before cost interpretation', async () => {
  render(<App />)

  expect(screen.getByText(/Trust check/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Load SparkClaw sample/i }))

  expect(screen.getByText(/Snapshot allowed:/i)).toBeInTheDocument()
  expect(screen.getByText(/Analysis available/i)).toBeInTheDocument()
})
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm run test:run -- src/features/trust/components/ImportTrustCheckPanel.test.tsx src/app/App.test.tsx
```

Expected: all tests pass.

### Task 3: Snapshot Contract v2 With Trust and Formula Metadata

**Files:**
- Modify: `src/features/agent/lib/buildAgentSnapshot.ts`
- Modify: `src/features/agent/lib/buildAgentSnapshot.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/features/agent/lib/agentRunRuntime.ts`

- [ ] **Step 1: Add failing snapshot contract tests**

Extend `buildAgentSnapshot.test.ts`:

```ts
it('includes trust, formula, provider, and data limitation metadata', () => {
  const snapshot = buildAgentSnapshot({
    activeStage: 'cost',
    toolResults: { monthlyAiCogs: 120 },
    deterministicEvents: [],
    thresholdPolicy: {},
    metricFlags: [],
    riskCards: [],
    benchmarkCards: [],
    decisionHistory: [],
    factSources: [],
    operatingAgents: [],
    operatingAssets: [],
    providerRegistry: [],
    modelPerfMatrix: [],
    operatingLedger: [],
    trustInspection: {
      status: 'needs_mapping',
      warnings: ['plan_id_missing'],
      allowedForSnapshot: true,
      anonymizationStatus: 'not_needed',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: { available: ['feature_cost'], blocked: ['plan_margin'] },
    },
    formulaVersion: 'cost_formula_v0.3',
    providerRegistryVersion: 'provider_registry_v0.4',
  })

  expect(snapshot.trustInspection?.status).toBe('needs_mapping')
  expect(snapshot.formulaVersion).toBe('cost_formula_v0.3')
  expect(snapshot.providerRegistryVersion).toBe('provider_registry_v0.4')
  expect(snapshot.dataLimitations).toContain('plan_margin')
})
```

- [ ] **Step 2: Extend `BuildAgentSnapshotInput`**

Add fields:

```ts
trustInspection?: TrustInspectionResult | null
formulaVersion?: string
providerRegistryVersion?: string
dataLimitations?: string[]
```

`buildAgentSnapshot` should derive `dataLimitations` from `trustInspection.analysisScope.blocked` if not provided.

- [ ] **Step 3: Send the extended snapshot to `/api/agent/run`**

In `App.tsx`, pass `importedUsage?.trustInspection`, formula version, and provider registry version into `buildAgentSnapshot`.

In `runAgentRuntime`, include these fields in `AgentRunInput` as `unknown` or typed fields, preserving backwards compatibility.

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test:run -- src/features/agent/lib/buildAgentSnapshot.test.ts src/features/agent/lib/agentRunRuntime.test.ts src/app/App.test.tsx
```

Expected: all tests pass.

### Task 4: Trust-Aware Operating Agent Routing

**Files:**
- Modify: `src/features/agent/lib/agentRunRuntime.ts`
- Modify: `src/features/agent/lib/agentRunRuntime.test.ts`
- Modify: `agent_service/agentic_runtime.py`
- Modify: `agent_service/tests/test_agentic_runtime.py`

- [ ] **Step 1: Add failing routing tests**

In TypeScript and Python tests, assert:

- `design` stage includes `usage_data_ingestion`, `provider_api_intelligence`, and `cost_engine_qa`.
- When trust warnings include `raw_prompt_detected`, `trust_security_compliance` is added as primary or reviewer.
- `all_hands` still returns all 11 agents explicitly.

Example TypeScript test:

```ts
it('adds Trust/Security reviewer when snapshot has trust warnings', async () => {
  const result = await runAgentRuntime({
    mode: 'report',
    activeStage: 'design',
    question: 'Can we analyze this customer export?',
    executionMode: 'stage_committee',
    snapshotVersion: 'snapshot:design:test',
    toolResults: { monthlyAiCogs: 0 },
    deterministicEvents: [],
    thresholdPolicy: {},
    metricFlags: [],
    riskCards: [],
    benchmarkCards: [],
    decisionHistory: [],
    factSources: [],
    operatingAgents: [],
    operatingAssets: [],
    trustInspection: {
      status: 'blocked',
      warnings: ['raw_prompt_detected'],
      allowedForSnapshot: false,
      anonymizationStatus: 'blocked',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: { available: [], blocked: ['all_analysis'] },
    },
  }, { runtime: 'local' })

  expect(result.calledAgentIds).toContain('trust_security_compliance')
})
```

- [ ] **Step 2: Update route policy**

In both frontend fallback router and Python router, if trust warnings include blocking data issues, route:

```text
trust_security_compliance -> usage_data_ingestion -> cost_engine_qa
```

Keep `all_hands` explicit and unchanged.

- [ ] **Step 3: Add permission guard**

Trust/Security may retrieve risk cards, operating assets, and operating ledger. It must not access mutation or calculation tools.

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test:run -- src/features/agent/lib/agentRunRuntime.test.ts
cd agent_service
uv run pytest tests/test_agentic_runtime.py
```

Expected: all tests pass.

### Task 5: Report Review Gate and One-Page Service Report

**Files:**
- Modify: `src/features/report/lib/reportArtifacts.ts`
- Modify: `src/features/report/lib/reportArtifacts.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Add failing report artifact test**

Extend `reportArtifacts.test.ts`:

```ts
it('includes trust, formula, provider source, and snapshot metadata in the one-page report', () => {
  const report = buildOnePageReportArtifact({
    title: 'SparkClaw AI Cost Snapshot',
    executiveSummary: 'AI COGS is concentrated in summarization.',
    metrics: [{ label: 'AI COGS', value: '$612' }],
    recommendations: ['Route short summaries to a cheaper model after A/B validation.'],
    risks: ['Quality regression requires human review.'],
    refs: ['tool:monthlyAiCogs', 'snapshot:cost:abc'],
    trust: {
      status: 'ready',
      dataLimitations: ['raw prompt was not collected'],
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
    },
    formulaVersion: 'cost_formula_v0.3',
    providerRegistryVersion: 'provider_registry_v0.4',
  })

  expect(report.markdown).toContain('Trust and data handling')
  expect(report.markdown).toContain('cost_formula_v0.3')
  expect(report.markdown).toContain('provider_registry_v0.4')
  expect(report.markdown).toContain('tool:monthlyAiCogs')
})
```

- [ ] **Step 2: Extend report artifact contract**

Add `trust`, `formulaVersion`, and `providerRegistryVersion` fields to the report builder input.

The report must include:

- Executive summary
- Cost and margin metrics
- Top bottleneck
- Recommendation and what-if savings
- Risk cards
- Trust and data limitations
- Formula version
- Provider registry version
- Snapshot version
- Decision refs

- [ ] **Step 3: Add report review gate copy**

In App export/report area, show a review checklist before export:

```text
Report review gate:
- No raw prompt in report
- No uncited numeric claim
- Provider price source visible
- Formula version visible
- Decision refs visible
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test:run -- src/features/report/lib/reportArtifacts.test.ts src/app/App.test.tsx
```

Expected: all tests pass.

### Task 6: Decision and Operating Ledger Audit Fields

**Files:**
- Modify: `src/features/decision-log/lib/decisionLog.ts`
- Modify: `src/features/decision-log/lib/decisionLog.test.ts`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Add tests for trust and report metadata in decisions**

Extend `decisionLog.test.ts`:

```ts
it('stores trust and report review metadata with operating decisions', () => {
  const decision = createDecision({
    what: 'Export customer AI Cost Snapshot',
    why: 'Customer accepted analysis scope and report review gate passed',
    assumptions: {},
    toolResultRefs: ['tool:monthlyAiCogs'],
    riskCards: [],
    status: 'adopted',
    kind: 'export',
    trustReview: {
      status: 'ready',
      warnings: [],
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
    },
    reportReview: {
      noRawPrompt: true,
      noUncitedNumbers: true,
      providerSourceVisible: true,
      formulaVersionVisible: true,
    },
  })

  expect(decision.trustReview?.status).toBe('ready')
  expect(decision.reportReview?.noUncitedNumbers).toBe(true)
})
```

- [ ] **Step 2: Extend decision metadata**

Add optional normalized fields:

```ts
trustReview: {
  status: 'ready' | 'needs_mapping' | 'blocked' | 'unknown'
  warnings: string[]
  retentionNote: string
} | null

reportReview: {
  noRawPrompt: boolean
  noUncitedNumbers: boolean
  providerSourceVisible: boolean
  formulaVersionVisible: boolean
} | null
```

Legacy decisions should normalize these fields to `null`.

- [ ] **Step 3: Save review metadata on adopt/hold/reject/export**

When App records a decision, include:

- `thresholdSnapshot`
- `factSourceSnapshot`
- `agentReview`
- `trustReview`
- `reportReview` for export decisions

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test:run -- src/features/decision-log/lib/decisionLog.test.ts src/app/App.test.tsx
```

Expected: all tests pass.

### Task 7: Service MVP Runbook and Customer-Facing Templates

**Files:**
- Create: `docs/runbooks/agentcost-service-mvp-runbook.md`
- Create: `docs/templates/agentcost-first-reply.md`
- Create: `docs/templates/agentcost-data-request.md`
- Create: `docs/templates/agentcost-report-disclaimer.md`

- [ ] **Step 1: Write the runbook**

Create `docs/runbooks/agentcost-service-mvp-runbook.md` with:

```md
# AgentCost Service MVP Runbook

## Flow

1. Lead intake
2. A/B/C fit scoring
3. Discovery call
4. Data request
5. Trust check
6. Normalized usage table
7. Deterministic cost snapshot
8. Operating team review
9. Report review gate
10. Customer review call
11. Decision/Operating Ledger entry

## Do Not Promise

- Real-time monitoring before SDK/gateway collection exists
- Guaranteed savings without quality validation
- Raw prompt analysis by default
- Billing changes without explicit human approval

## Definition of Done For One Customer

- Usage export passed Trust check or blocked scopes were explained
- Snapshot has formula and provider versions
- Report has no raw prompt and no uncited numeric claim
- Customer decision was recorded with refs
```

- [ ] **Step 2: Add customer templates**

Create the three templates using the exact text patterns from the source playbook:

- first reply asks only three questions
- data request asks for metadata columns and explicitly excludes raw prompt/PII
- disclaimer says numbers depend on provided usage data, provider price source date, and formula version

- [ ] **Step 3: Link runbook from implementation docs**

Append a link to `docs/PRODUCT_UX.md` or `docs/cost-quality-decision-workspace.md`:

```md
See `docs/runbooks/agentcost-service-mvp-runbook.md` for the service MVP operating flow.
```

### Task 8: P0 Final Verification

**Files:**
- No code file required unless tests fail.

- [ ] **Step 1: Run Python tests**

```powershell
cd C:\token_simulator\agent_service
uv run pytest
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript tests**

```powershell
cd C:\token_simulator
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 3: Run build**

```powershell
npm run build
```

Expected: production build succeeds.

- [ ] **Step 4: Run provider smoke**

```powershell
cd C:\token_simulator\agent_service
$env:AGENT_LIVE_TESTS="1"
uv run python scripts/smoke_provider.py
```

Expected: provider returns grounded events with `tool:*` refs.

- [ ] **Step 5: Run browser smoke**

```text
SparkClaw sample
-> Trust check visible
-> Cost stage
-> Optimize + Risk stage
-> Run full operating review
-> Decision Log
-> Report export
```

Expected: right panel shows called agents, supervisor synthesis, snapshotVersion, and refs. Decision details show agentReview, trustReview, threshold/fact snapshots, and report review metadata.

---

## P1 Backlog Queue

These items are not discarded. They are queued behind the P0 Service MVP because each needs either external integration, larger data volume, or mutation safety.

### 2026-05-24 Direction Addendum: MVP 2-4 Sequencing

This addendum turns the PRD follow-up table into implementation constraints for the backlog. It is binding for the first P1/P2 cuts.

| Area | Implementation constraint | First concrete action |
| --- | --- | --- |
| MVP 2: SDK-lite automatic collection | Build SDK-lite before Gateway. The event contract must match the shared usage schema: `timestamp`, `request_id`, `customer_id`, `plan_id`, `feature`, `model`, `session_id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_cost`, `latency_ms`, `status`. Do not collect raw prompt, messages, API keys, or PII by default. Collect only feature/model/tokens/cost/latency/status plus business metadata. | Add a typed SDK event contract and normalize it into `normalized_usage_table` through the same Trust pipeline as CSV import. |
| MVP 3: Alert / Margin Guard | Alerts are decision-needed alerts, not noisy telemetry alerts. Margin Guard v1 has exactly four alert families: cost surge, projected budget overrun, loss-making customer/feature, and model-change risk. | Create rule-based alert policies from deterministic snapshots. AI may draft explanation and next action text only. |
| MVP 4: Gateway / Proxy | Gateway is optional advanced mode, not the next MVP. It can later block expensive requests, route cheaper models, provide fallback, and enforce customer budgets, but only after SDK-lite and recommendation-only guardrails prove useful. | Keep Gateway in P2 until trust, failure-mode, security, and customer-traffic responsibility docs exist. |
| Guided first-run flow | Do not start users on an empty dashboard. First experience is a setup wizard: usage import -> feature mapping -> business baselines -> cost/margin -> recommendations -> report. | Promote setup wizard tasks ahead of customer-facing dashboard polish. |
| Developer usability | Developer view starts from logs, model, latency, errors, retries, and cache behavior. CEO view starts from margin, loss-making customers, and pricing decisions. The two views must read the same deterministic snapshot. | Split role-specific screens without forking calculation paths or usage rows. |
| AI interpretation trust | Alert conditions, guardrails, and margin classifications are deterministic. AI never invents numbers and never decides alert state. | Store alert condition refs as `tool:*` / `snapshot:*`; AI output is explanatory copy plus action draft. |

### P1-A: Supervisor Agent-as-Tool Orchestration

**Goal:** Promote P0 stage-routed workers into a Supervisor LLM that can call `call_*_agent` tools.

**Files later:**
- `agent_service/agentic_runtime.py`
- `agent_service/tests/test_agentic_runtime.py`

**Acceptance:**
- Supervisor may choose `call_cost_modeling_agent`, `call_trust_security_compliance_agent`, etc.
- Code still guarantees at least one operating agent runs.
- Forbidden calculation and mutation tools remain unavailable.

### P1-B: Full Vector RAG

**Goal:** Replace lexical/tag retrieval with separated vector retrievers.

**Queues:**
- Official docs RAG for provider prose explanations.
- Benchmark RAG for evidence-board peer comparisons.
- Decision-history RAG for prior operating decisions.

**Boundary:** Structured fact tables remain the authority for prices, model specs, context windows, and verified dates.

### P1-C: Official Docs Change Monitor

**Goal:** Detect provider pricing/spec changes and propose registry updates.

**Owners:** Provider/API Intelligence Agent, Knowledge & Release Ops Agent.

**Approval:** Human must approve provider registry changes before they affect snapshots.

### P1-D: SDK-lite Automatic Collection

**Goal:** Let developers add ongoing usage collection with minimal DX, security, and performance burden.

**Event contract:** SDK-lite records `timestamp`, `request_id`, `customer_id`, `plan_id`, `feature`, `model`, `session_id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_cost`, `latency_ms`, `status`, and optional business metadata.

**Privacy boundary:** SDK-lite does not collect raw prompts, chat messages, API keys, secrets, or PII by default. Any future prompt capture requires a separate opt-in plan, customer-facing disclosure, retention policy, and Trust review gate.

**Boundary:** All SDK events and third-party adapter events must normalize into `normalized_usage_table` and run through Trust checks before snapshot creation.

**Deferred:** Gateway/Proxy remains P2 advanced mode until SDK-lite and recommendation-only guardrails have adoption evidence.

### P1-E: vLLM / GPU Serving Economics

**Goal:** Add self-hosted inference economics for teams serving open models on GPUs.

**Metrics:**
- TTFT
- ITL/TPOT
- throughput
- GPU utilization
- KV cache usage
- P95/P99 latency
- prefix cache hit rate
- batching efficiency
- context length distribution

**Boundary:** Keep this separate from provider API pricing. Savings are what-if until measured throughput and quality evidence exist.

### P1-F: Slack / Email Alerts

**Goal:** Alert only when a human decision is needed.

**Triggers:**
- cost surge
- projected budget overrun
- loss-making customer or feature
- model-change risk

**Boundary:** Alert state is rule-based and computed from deterministic snapshots. AI may draft the explanation, recommended next action, and Slack/Email wording, but it cannot create numeric values or decide whether the alert fired.

**Approval:** Alerts require opt-in destination, rate limiting, and audit log entry. Retry spikes, stale provider fact sources, low cache hit rate, and follow-up reminders remain developer/admin signals unless they map to one of the four decision-needed alert families above.

### P1-G: Stripe / Billing Execution

**Goal:** Turn adopted pricing recommendations into billing-plan drafts or Stripe changes.

**Approval:** Requires adopted decision, explicit billing approval, rollback metadata, and ledger entry.

### P1-H: Benchmark Marketplace

**Goal:** Expand evidence board into verified peer datasets or customer-provided cohorts.

**Boundary:** If evidence is sparse, show `baseline unavailable`. Never fabricate a peer average.

### P1-I: Customer-Facing SaaS Dashboard

**Goal:** Move from operator-run internal admin to a guided customer-facing workspace.

**Scope:**
- workspace auth
- setup wizard: usage import -> feature mapping -> business baselines -> cost/margin -> recommendations -> report
- customer upload flow with Trust Intake first
- role-specific Developer and CEO views
- recurring monthly reviews
- customer-visible decision history
- report exports

**Boundary:** Raw prompt and PII defaults remain off. Developer and CEO screens may use different language and layout, but they must render numbers from the same deterministic snapshot and shared usage rows.

### P1-J: Retention and Data Room Automation

**Goal:** Make retention policy enforceable rather than copy-only.

**Scope:**
- raw upload deletion reminders
- evidence artifact inventory
- customer folder/data-room structure
- audit log exports

---

## Final Acceptance Criteria

P0 is done when a user can run:

```text
Upload customer usage CSV or Load SparkClaw sample
-> Trust check explains what is safe and analyzable
-> Deterministic snapshot computes cost/margin/flags
-> Stage-routed operating agents review it
-> Supervisor synthesis explains readiness and questions
-> Human adopts/holds/rejects/exports
-> Decision/Operating Ledger stores snapshot, trust, agent, and report metadata
```

The user should be able to say:

> "이 고객 데이터로 어떤 분석이 가능한지 안전하게 확인했고, AI 팀이 근거를 조회해 비용/마진/리스크를 검토했으며, 내가 내린 결정과 리포트 근거가 ledger에 남았다."
