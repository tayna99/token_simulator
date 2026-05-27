# Model Performance Matrix Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `model_perf_matrix` from a partial evidence note into an auditable model-by-task performance gate for routing, pricing, and report claims.

**Architecture:** Keep provider prices and deterministic cost math separate from quality evidence. Public benchmark and model-card records become review-only evidence, internal/customer evals can become routing evidence after review, and sparse evidence remains `baseline_unavailable` instead of invented scores.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5, Vitest, Supabase `rag_chunks` / `accepted_facts` / `watchtower_candidates`, existing `modelBenchmarkCorpus` and `optimizationPolicies` modules.

---

## Why This Is Partial Today

The current system already has benchmark source registry and RAG evidence:

- `src/features/research/data/modelBenchmarkRegistry.json` lists C2 benchmark sources.
- `src/features/rag/data/modelBenchmarkRegistry.ts` defines `MODEL_BENCHMARK_RECORDS` and a small `MODEL_PERF_MATRIX`.
- `src/features/rag/lib/modelBenchmarkCorpus.ts` retrieves benchmark evidence and correctly returns `baseline_unavailable` when sparse.
- `scripts/research/benchmark-corpus.mjs` can parse Artificial Analysis-style tables into evidence chunks.

The gap is that `MODEL_PERF_MATRIX` is still a small static list. It does not yet answer the operational question:

> “For this task and this candidate model, do we have enough evidence to route production work, or must this stay a what-if?”

The fix is not to add fake quality scores. The fix is to make the matrix explicit, typed, evidence-backed, and wired into routing and reports.

---

## File Structure

- Create `src/features/research/lib/modelPerformanceMatrix.ts`  
  Builds model-by-task rows from model catalog, benchmark records, and optional internal evals.

- Create `src/features/research/lib/modelPerformanceMatrix.test.ts`  
  Proves sparse evidence remains `baseline_unavailable`, public benchmark evidence remains review-gated, and verified internal evals can pass routing gates.

- Modify `src/features/rag/data/modelBenchmarkRegistry.ts`  
  Replace the static `MODEL_PERF_MATRIX` constant with rows built by `buildModelPerformanceMatrix`.

- Modify `src/features/rag/lib/modelBenchmarkCorpus.test.ts`  
  Update expectations so the matrix must include evidence status, decision authority, refs, and no fabricated score.

- Modify `src/features/team-cost/lib/optimizationPolicies.ts`  
  Add a model performance gate to cheap-model routing. Savings remain a what-if unless the matrix says routing is allowed.

- Modify `src/features/team-cost/lib/optimizationPolicies.test.ts`  
  Add routing tests for `baseline_unavailable`, `needs_review`, and `verified` evidence states.

- Modify `src/app/App.tsx` and `src/app/App.test.tsx`  
  Ensure snapshots include full matrix rows and report/routing decisions show evidence refs and validation status.

- Replace or quarantine legacy assumption UI in:
  - `src/components/ModelPerformanceBenchmarks/index.tsx`
  - `src/components/ProviderComparisonDashboard/index.tsx`

  These currently show hard-coded quality/reliability numbers. Either remove them from active routes or relabel all such values as assumptions and prevent them from feeding routing decisions.

---

## Task 1: Add Model Performance Matrix Builder

**Files:**
- Create: `src/features/research/lib/modelPerformanceMatrix.ts`
- Test: `src/features/research/lib/modelPerformanceMatrix.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildModelPerformanceMatrix, routingGateForMatrixRow } from './modelPerformanceMatrix'

const models = [
  {
    id: 'expensive-model',
    name: 'Expensive Model',
    contextWindow: 128_000,
    modalities: ['text'],
    outputModalities: ['text'],
  },
  {
    id: 'cheap-model',
    name: 'Cheap Model',
    contextWindow: 32_000,
    modalities: ['text'],
    outputModalities: ['text'],
  },
]

describe('modelPerformanceMatrix', () => {
  it('does not invent quality scores when no benchmark exists', () => {
    const rows = buildModelPerformanceMatrix({
      models,
      benchmarkRecords: [],
      taskProfiles: [{
        taskType: 'report_generation',
        requiredInputModalities: ['text'],
        requiredOutputModalities: ['text'],
        minContextTokens: 16_000,
        qualityFloor: 0.86,
      }],
      capturedAt: '2026-05-28T00:00:00.000Z',
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      evidenceStatus: 'baseline_unavailable',
      decisionAuthority: 'review_only',
      evidenceRefs: [],
      normalizedQualityScore: null,
    })
    expect(JSON.stringify(rows)).not.toMatch(/average|peerAverage|mean/i)
  })

  it('keeps third-party benchmark rows review-gated until verified', () => {
    const rows = buildModelPerformanceMatrix({
      models,
      benchmarkRecords: [{
        id: 'bench-cheap-routing',
        modelIds: ['cheap-model'],
        taskTags: ['routing', 'classification'],
        metricKinds: ['quality', 'latency'],
        benchmarkSuite: ['arena_elo'],
        sourceRefs: ['evidence:lmarena-leaderboard'],
        reviewStatus: 'needs_review',
        qualityBasis: 'third_party_benchmark',
      }],
      taskProfiles: [{
        taskType: 'classification',
        requiredInputModalities: ['text'],
        requiredOutputModalities: ['text'],
        minContextTokens: 4_000,
        qualityFloor: 0.75,
      }],
      capturedAt: '2026-05-28T00:00:00.000Z',
    })

    const cheap = rows.find(row => row.modelId === 'cheap-model')
    expect(cheap).toMatchObject({
      evidenceStatus: 'needs_review',
      qualityBasis: 'third_party_benchmark',
      decisionAuthority: 'validation_required',
      evidenceRefs: ['evidence:lmarena-leaderboard'],
    })
  })

  it('allows routing only with verified evidence and task fit', () => {
    const [row] = buildModelPerformanceMatrix({
      models: [models[1]],
      benchmarkRecords: [{
        id: 'internal-eval-cheap-classification',
        modelIds: ['cheap-model'],
        taskTags: ['classification'],
        metricKinds: ['quality'],
        benchmarkSuite: ['customer_eval'],
        sourceRefs: ['evidence:internal-eval-cheap-classification'],
        reviewStatus: 'verified',
        qualityBasis: 'internal_eval',
      }],
      taskProfiles: [{
        taskType: 'classification',
        requiredInputModalities: ['text'],
        requiredOutputModalities: ['text'],
        minContextTokens: 4_000,
        qualityFloor: 0.75,
      }],
      capturedAt: '2026-05-28T00:00:00.000Z',
    })

    expect(row.decisionAuthority).toBe('routing_allowed')
    expect(routingGateForMatrixRow(row)).toEqual({
      allowed: true,
      status: 'routing_allowed',
      warnings: [],
      refs: ['evidence:internal-eval-cheap-classification'],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/features/research/lib/modelPerformanceMatrix.test.ts --reporter=dot
```

Expected: fail because `modelPerformanceMatrix.ts` does not exist.

- [ ] **Step 3: Add the matrix builder**

Add this file:

```ts
export type MatrixQualityBasis = 'assumption' | 'third_party_benchmark' | 'official_model_card' | 'internal_eval'
export type MatrixEvidenceStatus = 'verified' | 'needs_review' | 'baseline_unavailable' | 'assumption'
export type MatrixDecisionAuthority = 'routing_allowed' | 'validation_required' | 'review_only'
export type MatrixModality = 'text' | 'image' | 'audio' | 'video'

export interface MatrixModelLike {
  id: string
  name: string
  contextWindow: number
  modalities?: MatrixModality[]
  outputModalities?: MatrixModality[]
}

export interface MatrixBenchmarkRecordLike {
  id: string
  modelIds: string[]
  taskTags: string[]
  metricKinds: string[]
  benchmarkSuite: string[]
  sourceRefs: string[]
  reviewStatus: 'verified' | 'needs_review'
  qualityBasis: MatrixQualityBasis
}

export interface MatrixTaskProfile {
  taskType: string
  requiredInputModalities: MatrixModality[]
  requiredOutputModalities: MatrixModality[]
  minContextTokens: number
  qualityFloor: number
}

export interface ModelPerformanceMatrixRow {
  taskType: string
  modelId: string
  modelName: string
  qualityBasis: MatrixQualityBasis
  evidenceStatus: MatrixEvidenceStatus
  decisionAuthority: MatrixDecisionAuthority
  evidenceRefs: string[]
  benchmarkRecordIds: string[]
  metricKinds: string[]
  benchmarkSuites: string[]
  normalizedQualityScore: number | null
  taskFit: {
    contextWindowOk: boolean
    inputModalitiesOk: boolean
    outputModalitiesOk: boolean
  }
  risk: string
  capturedAt: string
}

export interface RoutingGate {
  allowed: boolean
  status: MatrixDecisionAuthority
  warnings: string[]
  refs: string[]
}

const DEFAULT_TASK_PROFILES: MatrixTaskProfile[] = [
  {
    taskType: 'classification',
    requiredInputModalities: ['text'],
    requiredOutputModalities: ['text'],
    minContextTokens: 4_000,
    qualityFloor: 0.75,
  },
  {
    taskType: 'report_generation',
    requiredInputModalities: ['text'],
    requiredOutputModalities: ['text'],
    minContextTokens: 16_000,
    qualityFloor: 0.86,
  },
  {
    taskType: 'customer_support',
    requiredInputModalities: ['text'],
    requiredOutputModalities: ['text'],
    minContextTokens: 8_000,
    qualityFloor: 0.8,
  },
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function modelModalities(model: MatrixModelLike, key: 'modalities' | 'outputModalities'): MatrixModality[] {
  const values = model[key]
  return values && values.length > 0 ? values : ['text']
}

function hasEvery(required: MatrixModality[], actual: MatrixModality[]): boolean {
  return required.every(item => actual.includes(item))
}

function recordMatchesTask(record: MatrixBenchmarkRecordLike, taskType: string): boolean {
  const tags = record.taskTags.map(tag => tag.toLowerCase())
  return tags.includes(taskType.toLowerCase()) || tags.includes('routing') || tags.includes('general')
}

function strongestBasis(records: MatrixBenchmarkRecordLike[]): MatrixQualityBasis {
  if (records.some(record => record.qualityBasis === 'internal_eval')) return 'internal_eval'
  if (records.some(record => record.qualityBasis === 'third_party_benchmark')) return 'third_party_benchmark'
  if (records.some(record => record.qualityBasis === 'official_model_card')) return 'official_model_card'
  return 'assumption'
}

function evidenceStatus(records: MatrixBenchmarkRecordLike[]): MatrixEvidenceStatus {
  if (records.length === 0) return 'baseline_unavailable'
  if (records.some(record => record.reviewStatus === 'verified')) return 'verified'
  if (records.some(record => record.qualityBasis === 'assumption')) return 'assumption'
  return 'needs_review'
}

function decisionAuthority(input: {
  status: MatrixEvidenceStatus
  taskFit: ModelPerformanceMatrixRow['taskFit']
}): MatrixDecisionAuthority {
  const fitOk = input.taskFit.contextWindowOk
    && input.taskFit.inputModalitiesOk
    && input.taskFit.outputModalitiesOk
  if (!fitOk) return 'review_only'
  if (input.status === 'verified') return 'routing_allowed'
  if (input.status === 'needs_review' || input.status === 'assumption') return 'validation_required'
  return 'review_only'
}

function riskText(input: {
  status: MatrixEvidenceStatus
  authority: MatrixDecisionAuthority
  taskType: string
}): string {
  if (input.authority === 'routing_allowed') {
    return `${input.taskType} routing has verified model performance evidence.`
  }
  if (input.status === 'baseline_unavailable') {
    return `${input.taskType} has no benchmark baseline for this model; keep routing as review-only.`
  }
  return `${input.taskType} routing requires human quality validation before production adoption.`
}

export function buildModelPerformanceMatrix(input: {
  models: MatrixModelLike[]
  benchmarkRecords?: MatrixBenchmarkRecordLike[]
  taskProfiles?: MatrixTaskProfile[]
  capturedAt?: string
}): ModelPerformanceMatrixRow[] {
  const records = input.benchmarkRecords ?? []
  const taskProfiles = input.taskProfiles ?? DEFAULT_TASK_PROFILES
  const capturedAt = input.capturedAt ?? new Date().toISOString()

  return input.models.flatMap(model => taskProfiles.map(task => {
    const matched = records.filter(record => (
      record.modelIds.includes(model.id) && recordMatchesTask(record, task.taskType)
    ))
    const status = evidenceStatus(matched)
    const taskFit = {
      contextWindowOk: model.contextWindow >= task.minContextTokens,
      inputModalitiesOk: hasEvery(task.requiredInputModalities, modelModalities(model, 'modalities')),
      outputModalitiesOk: hasEvery(task.requiredOutputModalities, modelModalities(model, 'outputModalities')),
    }
    const authority = decisionAuthority({ status, taskFit })

    return {
      taskType: task.taskType,
      modelId: model.id,
      modelName: model.name,
      qualityBasis: matched.length > 0 ? strongestBasis(matched) : 'assumption',
      evidenceStatus: status,
      decisionAuthority: authority,
      evidenceRefs: unique(matched.flatMap(record => record.sourceRefs)),
      benchmarkRecordIds: matched.map(record => record.id),
      metricKinds: unique(matched.flatMap(record => record.metricKinds)),
      benchmarkSuites: unique(matched.flatMap(record => record.benchmarkSuite)),
      normalizedQualityScore: null,
      taskFit,
      risk: riskText({ status, authority, taskType: task.taskType }),
      capturedAt,
    }
  }))
}

export function routingGateForMatrixRow(row: ModelPerformanceMatrixRow | undefined): RoutingGate {
  if (!row) {
    return {
      allowed: false,
      status: 'review_only',
      warnings: ['model_perf_matrix_row_missing'],
      refs: [],
    }
  }
  if (row.decisionAuthority === 'routing_allowed') {
    return {
      allowed: true,
      status: row.decisionAuthority,
      warnings: [],
      refs: row.evidenceRefs,
    }
  }
  return {
    allowed: false,
    status: row.decisionAuthority,
    warnings: [row.evidenceStatus],
    refs: row.evidenceRefs,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/features/research/lib/modelPerformanceMatrix.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/research/lib/modelPerformanceMatrix.ts src/features/research/lib/modelPerformanceMatrix.test.ts
git commit -m "feat: add model performance matrix builder"
```

---

## Task 2: Replace Static Matrix With Built Rows

**Files:**
- Modify: `src/features/rag/data/modelBenchmarkRegistry.ts`
- Test: `src/features/rag/lib/modelBenchmarkCorpus.test.ts`

- [ ] **Step 1: Write the failing test**

Add these assertions to the existing `exports P1-compatible benchmark records and upgrades model perf rows with evidence refs` test:

```ts
expect(MODEL_PERF_MATRIX.length).toBeGreaterThan(2)
expect(MODEL_PERF_MATRIX[0]).toEqual(expect.objectContaining({
  evidenceStatus: expect.any(String),
  decisionAuthority: expect.any(String),
  normalizedQualityScore: null,
  taskFit: expect.objectContaining({
    contextWindowOk: expect.any(Boolean),
    inputModalitiesOk: expect.any(Boolean),
    outputModalitiesOk: expect.any(Boolean),
  }),
}))
expect(MODEL_PERF_MATRIX.some(row => row.evidenceStatus === 'baseline_unavailable')).toBe(true)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/features/rag/lib/modelBenchmarkCorpus.test.ts --reporter=dot
```

Expected: fail because the static matrix lacks `evidenceStatus`, `decisionAuthority`, and `taskFit`.

- [ ] **Step 3: Modify the registry export**

In `src/features/rag/data/modelBenchmarkRegistry.ts`, import `MODELS` and the builder:

```ts
import { MODELS } from '../../alternatives/data/models'
import { buildModelPerformanceMatrix } from '../../research/lib/modelPerformanceMatrix'
```

Replace the existing static `MODEL_PERF_MATRIX` export with:

```ts
export const MODEL_PERF_MATRIX = buildModelPerformanceMatrix({
  models: MODELS,
  benchmarkRecords: MODEL_BENCHMARK_RECORDS,
  capturedAt: '2026-05-28T00:00:00.000Z',
})
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/features/rag/lib/modelBenchmarkCorpus.test.ts src/features/research/lib/modelPerformanceMatrix.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/rag/data/modelBenchmarkRegistry.ts src/features/rag/lib/modelBenchmarkCorpus.test.ts
git commit -m "feat: build model performance matrix from evidence"
```

---

## Task 3: Gate Cheap-Model Routing With Matrix Evidence

**Files:**
- Modify: `src/features/team-cost/lib/optimizationPolicies.ts`
- Test: `src/features/team-cost/lib/optimizationPolicies.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests:

```ts
it('keeps cheaper-model routing validation-gated when matrix evidence is not verified', () => {
  const [candidate] = proposeOptimizationCandidates({
    findings: [
      { id: 'finding-route', kind: 'top_agent_concentration', agentId: 'agent-engineering', severity: 'high', message: 'route lower risk work' },
    ],
  })

  const recommendation = recommendationFromCandidate(candidate, {
    agents: AI_TEAM_AGENT_CATALOG,
    modelPerformanceMatrix: [{
      taskType: 'classification',
      modelId: 'gpt-5.4-nano',
      decisionAuthority: 'validation_required',
      evidenceStatus: 'needs_review',
      evidenceRefs: ['evidence:artificial-analysis-models'],
    }],
  })

  expect(recommendation.decisionMode).toBe('what_if')
  expect(recommendation.requiredValidation).toEqual(expect.arrayContaining([
    expect.stringMatching(/model performance matrix/i),
  ]))
  expect(recommendation.toolResultRefs).toEqual(expect.arrayContaining([
    expect.stringMatching(/^tool:optimization\..*\.affectedAgentIds$/),
  ]))
})

it('does not present routing as allowed when matrix evidence is baseline unavailable', () => {
  const [candidate] = proposeOptimizationCandidates({
    findings: [
      { id: 'finding-route', kind: 'top_agent_concentration', agentId: 'agent-engineering', severity: 'high', message: 'route lower risk work' },
    ],
  })

  const recommendation = recommendationFromCandidate(candidate, {
    agents: AI_TEAM_AGENT_CATALOG,
    modelPerformanceMatrix: [],
  })

  expect(recommendation.decisionMode).toBe('what_if')
  expect(recommendation.isDefinitiveWaste).toBe(false)
  expect(recommendation.qualityCaveat).toMatch(/baseline|validation|matrix/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/features/team-cost/lib/optimizationPolicies.test.ts --reporter=dot
```

Expected: fail because `OptimizationRecommendationInput` does not accept `modelPerformanceMatrix`.

- [ ] **Step 3: Add matrix input and gate wording**

Extend `OptimizationRecommendationInput`:

```ts
modelPerformanceMatrix?: Array<{
  taskType: string
  modelId: string
  decisionAuthority: 'routing_allowed' | 'validation_required' | 'review_only'
  evidenceStatus: string
  evidenceRefs: string[]
}>
```

When `candidate.policy === 'route_low_risk_to_cheaper_model'`, look up the candidate model row. If no row exists or the row is not `routing_allowed`, keep `decisionMode: 'what_if'`, keep `isDefinitiveWaste: false`, and add:

```ts
'Model performance matrix evidence is not verified for production routing.'
```

to `requiredValidation`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/features/team-cost/lib/optimizationPolicies.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/team-cost/lib/optimizationPolicies.ts src/features/team-cost/lib/optimizationPolicies.test.ts
git commit -m "feat: gate model routing with performance matrix"
```

---

## Task 4: Attach Matrix Evidence To Agent Snapshots

**Files:**
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or extend the all-hands snapshot test:

```ts
expect(allHandsBody.modelPerfMatrix[0]).toEqual(expect.objectContaining({
  modelId: expect.any(String),
  taskType: expect.any(String),
  evidenceStatus: expect.any(String),
  decisionAuthority: expect.any(String),
  evidenceRefs: expect.any(Array),
}))
expect(JSON.stringify(allHandsBody.modelPerfMatrix)).not.toMatch(/peerAverage|fakeScore|typical production measurements/i)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/app/App.test.tsx --reporter=dot
```

Expected: fail if the snapshot still contains the old partial rows or hidden assumption claims.

- [ ] **Step 3: Pass matrix rows through snapshot**

In `src/app/App.tsx`, keep `modelPerfMatrix: MODEL_PERF_MATRIX.map(row => ({ ...row }))`, but ensure `MODEL_PERF_MATRIX` now comes from the hardened builder.

Do not add model quality numbers in `toolResults`. Keep performance evidence in `modelPerfMatrix` and benchmark refs only.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/app/App.test.tsx src/features/rag/lib/modelBenchmarkCorpus.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: expose model performance matrix in snapshots"
```

---

## Task 5: Remove Misleading Legacy Performance Claims

**Files:**
- Modify: `src/components/ModelPerformanceBenchmarks/index.tsx`
- Modify: `src/components/ProviderComparisonDashboard/index.tsx`
- Test: existing component/app tests if these components are still reachable

- [ ] **Step 1: Search active usage**

Run:

```bash
rg -n "ModelPerformanceBenchmarks|ProviderComparisonDashboard" src app
```

Expected: identify whether these legacy components are mounted anywhere.

- [ ] **Step 2: If unreachable, document as legacy-only**

If no active import path exists, add a top-level comment to each component:

```ts
// Legacy Vite-only component. Do not use for AgentPayroll model routing decisions;
// quality and reliability values in this component are assumption-only display values.
```

- [ ] **Step 3: If reachable, replace hard-coded quality/reliability with matrix state**

Render only:

```text
Verified evidence
Needs review
Baseline unavailable
Assumption only
```

Do not render hard-coded provider quality or reliability percentages.

- [ ] **Step 4: Run relevant tests**

Run:

```bash
npx vitest run src/app/App.test.tsx --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModelPerformanceBenchmarks/index.tsx src/components/ProviderComparisonDashboard/index.tsx src/app/App.test.tsx
git commit -m "fix: quarantine legacy benchmark assumptions"
```

---

## Task 6: Add Research Collection Runbook

**Files:**
- Create: `docs/runbooks/model-performance-matrix.md`

- [ ] **Step 1: Add the runbook**

Create:

```md
# Model Performance Matrix Runbook

## Purpose

The Model Performance Matrix answers whether a cheaper or alternative model has enough evidence for production routing. It never overrides provider pricing facts or deterministic cost calculations.

## Evidence Levels

- `verified`: reviewed internal eval or reviewed public benchmark evidence.
- `needs_review`: public benchmark or model-card evidence exists but has not been approved for routing.
- `baseline_unavailable`: no relevant evidence exists for this model and task.
- `assumption`: editable planning assumption; not production routing evidence.

## Weekly Research Flow

1. Run `npm run research:benchmark-corpus`.
2. Inspect `artifacts/research/benchmark-corpus/latest-report.json`.
3. Upload or review generated `model_benchmark` chunks.
4. Promote evidence only after human review.
5. Keep model routing decisions as `Hold` when evidence is `needs_review`, `baseline_unavailable`, or `assumption`.

## Product Rule

Cost savings can be deterministic. Quality safety cannot. A cheaper model recommendation must stay `what_if` until the matrix row is `routing_allowed`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/model-performance-matrix.md
git commit -m "docs: add model performance matrix runbook"
```

---

## Verification

Run focused tests:

```bash
npx vitest run src/features/research/lib/modelPerformanceMatrix.test.ts src/features/rag/lib/modelBenchmarkCorpus.test.ts src/features/team-cost/lib/optimizationPolicies.test.ts src/app/App.test.tsx --reporter=dot
```

Run full suite:

```bash
npm run test:run
```

Run build:

```bash
npm run build
```

Manual smoke:

1. Open the AgentPayroll workspace.
2. Run the sample diagnosis.
3. Inspect the model routing / evidence section.
4. Confirm routing says `Hold` or `validation_required` when benchmark evidence is not verified.
5. Confirm no UI says a provider/model has a hard-coded quality score without evidence refs.

---

## Completion Criteria

- `model_perf_matrix` rows include `taskType`, `modelId`, `evidenceStatus`, `decisionAuthority`, `evidenceRefs`, `taskFit`, and `risk`.
- Public benchmarks are evidence, not pricing facts.
- Sparse benchmark evidence returns `baseline_unavailable`.
- Cheap-model routing cannot be presented as production-ready without verified matrix evidence.
- Agent snapshots preserve matrix rows and refs.
- Legacy hard-coded quality/reliability claims are removed from active decision paths or clearly marked assumption-only.
- Focused tests, full tests, and build pass.

