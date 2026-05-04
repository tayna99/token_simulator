# Folder Structure MVP Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project easier to extend from a token cost simulator into an AI product cost, margin, pricing, usage import, and alert workspace.

**Architecture:** Keep the current working MVP behavior intact, then reorganize files around product capabilities instead of a flat component pile. Preserve `src/lib/calculator.ts` and `src/lib/format.ts` as public calculation/formatting entry points to satisfy the project rules while gradually moving feature-specific logic into clearer folders.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS 3, Vitest 4, Testing Library.

---

## Why Change The Structure

Current structure is workable for a demo, but weak for MVP expansion.

The main issue:

- `src/components` contains MVP screens, legacy panels, future experiments, and reusable UI at the same level.
- Business logic is split across `src/lib`, but the product concepts are not obvious from folder names.
- Design-system code exists in both `design_system/` and `src/components/ui` / `src/styles`, but the relationship is not documented.
- The next product direction needs separate areas for usage import, cost calculation, quality burden, pricing/margin, reporting, and operations alerts.

The target should make a non-developer founder, a developer, and a future contributor understand this quickly:

```txt
This app takes LLM usage data,
turns it into feature-level cost,
adds quality burden,
maps it to business metrics,
then helps decide pricing, margin, savings, and alerts.
```

---

## Recommended Target Structure

```txt
src/
  app/
    App.tsx
    App.test.tsx
    providers/
      I18nProvider.tsx
    layout/
      AppShell.tsx

  features/
    usage/
      components/
        UsageSetup.tsx
        UsageImportPanel.tsx
        WorkloadBuilder.tsx
      lib/
        usageImport.ts
        workload.ts
      data/
        workloadPresets.ts

    current-cost/
      components/
        CurrentCostPanel.tsx
        CostBreakdown.tsx
      lib/
        breakdown.ts

    alternatives/
      components/
        AlternativeComparison.tsx
        ModelComparisonMatrix.tsx
        RequirementsFilter.tsx
      data/
        models.ts
        qualityProfiles.ts

    savings/
      components/
        SavingsLeverTable.tsx
        CostOptimizationRoadmap.tsx
      lib/
        savingsLevers.ts

    unit-economics/
      components/
        CostPerBusinessMetric.tsx
        FeatureUnitEconomicsPanel.tsx
        CostAttributionByFeature.tsx
      lib/
        businessMetrics.ts
        unitEconomics.ts

    report/
      components/
        ExportAnalysis.tsx
        SummaryCard.tsx

    guardrails/
      components/
        BudgetGuardrails.tsx
        BudgetCap.tsx
      lib/
        budget.ts

  domain/
    cost/
      calculator.ts
      decisionMetrics.ts
      period.ts
    pricing/
      providerPricing.ts
    quality/
      qualityBurden.ts

  shared/
    ui/
      Button.tsx
      Badge.tsx
      Field.tsx
      MetricTile.tsx
      Surface.tsx
      Toast.tsx
      Tooltip.tsx
    format/
      format.ts
    i18n/
      i18n.ts
    styles/
      montage.css
      fonts/
        PretendardVariable.woff2

  lib/
    calculator.ts
    format.ts

  main.tsx
  index.css
  vite-env.d.ts
  test-setup.ts
```

Important compatibility rule:

- Keep `src/lib/calculator.ts` as the official import path for cost math.
- Keep `src/lib/format.ts` as the official import path for display formatting.
- If implementation moves under `src/domain/`, `src/lib/*` should re-export or wrap the new files.
- This avoids breaking `AGENTS.md` rules and keeps old tests/imports stable.

---

## Folder Meaning In Plain Korean

- `app/`: 앱의 껍데기입니다. 전체 레이아웃, provider, root state가 여기 있습니다.
- `features/`: 사용자가 보는 기능 단위입니다. Usage, Cost, Alternative, Savings, Report처럼 화면 흐름과 맞춥니다.
- `domain/`: 화면과 상관없는 순수 계산 규칙입니다. 비용, 품질 부담, 가격, 마진 계산이 들어갑니다.
- `shared/`: 여러 기능에서 같이 쓰는 UI, 포맷, i18n, 스타일입니다.
- `data/`는 장기적으로 줄입니다. 모델 단가나 프리셋은 관련 feature 또는 domain 안으로 옮깁니다.
- `components/`는 최종적으로 비우거나 compatibility re-export만 남깁니다.

---

## Migration Rule

Do not move everything at once.

Move in this order:

1. Shared UI and styles
2. Usage import/workload
3. Current cost and alternatives
4. Savings and unit economics
5. Report and guardrails
6. App shell
7. Remove compatibility folders only after all imports are migrated

Each task must end with:

```bash
npm run test:run
npm run build
```

---

### Task 1: Add Architecture Document

**Files:**
- Create: `docs/architecture/folder-structure.md`

- [ ] **Step 1: Create the architecture folder document**

Create `docs/architecture/folder-structure.md` with this structure:

```md
# Folder Structure

이 프로젝트는 단순 LLM 비용 계산기가 아니라 AI 제품의 사용량 기반 원가, 마진, 품질 리스크를 판단하는 도구다.

## Top-Level Intent

- `src/app`: 앱 조립과 전역 상태
- `src/features`: 사용자가 보는 기능 단위
- `src/domain`: 화면과 무관한 계산 규칙
- `src/shared`: 공통 UI, 포맷, i18n, 스타일
- `docs`: 제품/기술 의사결정 문서
- `design_system`: 원본 디자인 시스템 레퍼런스

## Compatibility

`src/lib/calculator.ts`와 `src/lib/format.ts`는 계속 공식 public path로 유지한다.
```

- [ ] **Step 2: Verify the document is readable**

Run:

```bash
git diff -- docs/architecture/folder-structure.md
```

Expected:

```txt
The new document explains app/features/domain/shared boundaries.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/folder-structure.md
git commit -m "docs: define folder structure direction"
```

---

### Task 2: Move Shared UI Primitives

**Files:**
- Create: `src/shared/ui/primitives.tsx`
- Create: `src/shared/ui/primitives.test.tsx`
- Modify: `src/components/ui/primitives.tsx`
- Modify imports in components that use primitives.

- [ ] **Step 1: Move implementation into shared UI**

Move the current contents of `src/components/ui/primitives.tsx` into:

```txt
src/shared/ui/primitives.tsx
```

Keep the old file as a compatibility re-export:

```ts
export * from '../../shared/ui/primitives'
```

- [ ] **Step 2: Move the primitive test**

Move:

```txt
src/components/ui/primitives.test.tsx
```

to:

```txt
src/shared/ui/primitives.test.tsx
```

Update imports inside the test:

```ts
import { Button, Surface, Badge, Field, MetricTile } from './primitives'
```

- [ ] **Step 3: Run focused test**

Run:

```bash
npm run test:run -- src/shared/ui/primitives.test.tsx
```

Expected:

```txt
PASS src/shared/ui/primitives.test.tsx
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run test:run
npm run build
```

Expected:

```txt
177 tests pass, build succeeds
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui src/components/ui/primitives.tsx
git commit -m "refactor: move UI primitives to shared"
```

---

### Task 3: Group Usage Workflow

**Files:**
- Create folder: `src/features/usage/components`
- Create folder: `src/features/usage/lib`
- Create folder: `src/features/usage/data`
- Move:
  - `src/components/UsageSetup`
  - `src/components/UsageImportPanel`
  - `src/components/WorkloadBuilder`
  - `src/lib/usageImport.ts`
  - `src/lib/workload.ts`
  - `src/data/workloadPresets.ts`

- [ ] **Step 1: Move usage components**

Move these component folders:

```txt
src/components/UsageSetup -> src/features/usage/components/UsageSetup
src/components/UsageImportPanel -> src/features/usage/components/UsageImportPanel
src/components/WorkloadBuilder -> src/features/usage/components/WorkloadBuilder
```

- [ ] **Step 2: Move usage logic**

Move these pure logic files:

```txt
src/lib/usageImport.ts -> src/features/usage/lib/usageImport.ts
src/lib/usageImport.test.ts -> src/features/usage/lib/usageImport.test.ts
src/lib/workload.ts -> src/features/usage/lib/workload.ts
src/lib/workload.test.ts -> src/features/usage/lib/workload.test.ts
src/data/workloadPresets.ts -> src/features/usage/data/workloadPresets.ts
src/data/workloadPresets.test.ts -> src/features/usage/data/workloadPresets.test.ts
```

- [ ] **Step 3: Add compatibility re-exports**

Create `src/lib/usageImport.ts`:

```ts
export * from '../features/usage/lib/usageImport'
```

Create `src/lib/workload.ts`:

```ts
export * from '../features/usage/lib/workload'
```

Create `src/data/workloadPresets.ts`:

```ts
export * from '../features/usage/data/workloadPresets'
```

- [ ] **Step 4: Update direct imports in `src/App.tsx`**

Replace:

```ts
import { USE_CASE_PRESETS, type UseCasePresetId } from './data/workloadPresets'
import type { UsageImportSummary } from './lib/usageImport'
import { UsageSetup } from './components/UsageSetup'
```

with:

```ts
import { USE_CASE_PRESETS, type UseCasePresetId } from './features/usage/data/workloadPresets'
import type { UsageImportSummary } from './features/usage/lib/usageImport'
import { UsageSetup } from './features/usage/components/UsageSetup'
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test:run -- src/features/usage
```

Expected:

```txt
Usage import, workload, workload preset, UsageSetup, UsageImportPanel, WorkloadBuilder tests pass.
```

- [ ] **Step 6: Run full verification and commit**

```bash
npm run test:run
npm run build
git add src/features/usage src/lib/usageImport.ts src/lib/workload.ts src/data/workloadPresets.ts src/App.tsx
git commit -m "refactor: group usage workflow feature"
```

---

### Task 4: Group Cost, Alternatives, Savings, Unit Economics, Report

**Files:**
- Create folders:
  - `src/features/current-cost`
  - `src/features/alternatives`
  - `src/features/savings`
  - `src/features/unit-economics`
  - `src/features/report`
  - `src/features/guardrails`

- [ ] **Step 1: Move current cost**

Move:

```txt
src/components/CurrentCostPanel -> src/features/current-cost/components/CurrentCostPanel
src/components/CostBreakdown -> src/features/current-cost/components/CostBreakdown
src/lib/breakdown.ts -> src/features/current-cost/lib/breakdown.ts
src/lib/breakdown.test.ts -> src/features/current-cost/lib/breakdown.test.ts
```

Keep compatibility:

```ts
// src/lib/breakdown.ts
export * from '../features/current-cost/lib/breakdown'
```

- [ ] **Step 2: Move alternatives**

Move:

```txt
src/components/AlternativeComparison -> src/features/alternatives/components/AlternativeComparison
src/components/ModelComparisonMatrix -> src/features/alternatives/components/ModelComparisonMatrix
src/components/RequirementsFilter -> src/features/alternatives/components/RequirementsFilter
src/data/models.ts -> src/features/alternatives/data/models.ts
src/data/models.test.ts -> src/features/alternatives/data/models.test.ts
src/data/qualityProfiles.ts -> src/features/alternatives/data/qualityProfiles.ts
src/data/qualityProfiles.test.ts -> src/features/alternatives/data/qualityProfiles.test.ts
```

Keep compatibility:

```ts
// src/data/models.ts
export * from '../features/alternatives/data/models'
```

```ts
// src/data/qualityProfiles.ts
export * from '../features/alternatives/data/qualityProfiles'
```

- [ ] **Step 3: Move savings**

Move:

```txt
src/components/SavingsLeverTable -> src/features/savings/components/SavingsLeverTable
src/components/CostOptimizationRoadmap -> src/features/savings/components/CostOptimizationRoadmap
src/lib/savingsLevers.ts -> src/features/savings/lib/savingsLevers.ts
src/lib/savingsLevers.test.ts -> src/features/savings/lib/savingsLevers.test.ts
```

Keep compatibility:

```ts
// src/lib/savingsLevers.ts
export * from '../features/savings/lib/savingsLevers'
```

- [ ] **Step 4: Move unit economics**

Move:

```txt
src/components/CostPerBusinessMetric -> src/features/unit-economics/components/CostPerBusinessMetric
src/components/FeatureUnitEconomicsPanel -> src/features/unit-economics/components/FeatureUnitEconomicsPanel
src/components/CostAttributionByFeature -> src/features/unit-economics/components/CostAttributionByFeature
src/lib/businessMetrics.ts -> src/features/unit-economics/lib/businessMetrics.ts
src/lib/businessMetrics.test.ts -> src/features/unit-economics/lib/businessMetrics.test.ts
src/lib/unitEconomics.ts -> src/features/unit-economics/lib/unitEconomics.ts
src/lib/unitEconomics.test.ts -> src/features/unit-economics/lib/unitEconomics.test.ts
```

- [ ] **Step 5: Move report and guardrails**

Move:

```txt
src/components/SummaryCard -> src/features/report/components/SummaryCard
src/components/ExportAnalysis -> src/features/report/components/ExportAnalysis
src/components/BudgetGuardrails -> src/features/guardrails/components/BudgetGuardrails
src/components/BudgetCap -> src/features/guardrails/components/BudgetCap
src/lib/budget.ts -> src/features/guardrails/lib/budget.ts
src/lib/budget.test.ts -> src/features/guardrails/lib/budget.test.ts
```

- [ ] **Step 6: Update `src/App.tsx` imports**

Update imports so active MVP panels come from `src/features/*`.

Example:

```ts
import { CurrentCostPanel } from './features/current-cost/components/CurrentCostPanel'
import { AlternativeComparison } from './features/alternatives/components/AlternativeComparison'
import { SavingsLeverTable } from './features/savings/components/SavingsLeverTable'
import { SummaryCard } from './features/report/components/SummaryCard'
```

- [ ] **Step 7: Run verification**

```bash
npm run test:run
npm run build
```

Expected:

```txt
All tests pass and production build succeeds.
```

- [ ] **Step 8: Commit**

```bash
git add src/features src/components src/lib src/data src/App.tsx
git commit -m "refactor: group MVP panels by product feature"
```

---

### Task 5: Create Domain Layer Without Breaking Public Imports

**Files:**
- Create: `src/domain/cost/calculator.ts`
- Create: `src/domain/cost/decisionMetrics.ts`
- Create: `src/domain/cost/period.ts`
- Create: `src/domain/quality/qualityBurden.ts`
- Modify:
  - `src/lib/calculator.ts`
  - `src/lib/decisionMetrics.ts`
  - `src/lib/period.ts`

- [ ] **Step 1: Move pure cost domain files**

Move:

```txt
src/lib/calculator.ts -> src/domain/cost/calculator.ts
src/lib/calculator.test.ts -> src/domain/cost/calculator.test.ts
src/lib/decisionMetrics.ts -> src/domain/cost/decisionMetrics.ts
src/lib/decisionMetrics.test.ts -> src/domain/cost/decisionMetrics.test.ts
src/lib/period.ts -> src/domain/cost/period.ts
src/lib/period.test.ts -> src/domain/cost/period.test.ts
```

- [ ] **Step 2: Preserve official calculator import path**

Create `src/lib/calculator.ts`:

```ts
export * from '../domain/cost/calculator'
```

Create `src/lib/decisionMetrics.ts`:

```ts
export * from '../domain/cost/decisionMetrics'
```

Create `src/lib/period.ts`:

```ts
export * from '../domain/cost/period'
```

- [ ] **Step 3: Add quality burden placeholder domain**

Create `src/domain/quality/qualityBurden.ts`:

```ts
export interface QualityBurdenInput {
  retryCostUsd: number
  humanReviewCostUsd: number
  csEscalationCostUsd: number
}

export function calculateQualityBurden(input: QualityBurdenInput): number {
  const values = [input.retryCostUsd, input.humanReviewCostUsd, input.csEscalationCostUsd]
  if (values.some(value => !Number.isFinite(value))) return 0
  return Math.max(0, input.retryCostUsd) +
    Math.max(0, input.humanReviewCostUsd) +
    Math.max(0, input.csEscalationCostUsd)
}
```

Create `src/domain/quality/qualityBurden.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calculateQualityBurden } from './qualityBurden'

describe('calculateQualityBurden', () => {
  it('adds retry, review, and CS escalation costs', () => {
    expect(calculateQualityBurden({
      retryCostUsd: 10,
      humanReviewCostUsd: 20,
      csEscalationCostUsd: 30,
    })).toBe(60)
  })

  it('guards invalid and negative values', () => {
    expect(calculateQualityBurden({
      retryCostUsd: Number.NaN,
      humanReviewCostUsd: 20,
      csEscalationCostUsd: 30,
    })).toBe(0)

    expect(calculateQualityBurden({
      retryCostUsd: -10,
      humanReviewCostUsd: 20,
      csEscalationCostUsd: 30,
    })).toBe(50)
  })
})
```

- [ ] **Step 4: Run verification**

```bash
npm run test:run -- src/domain src/lib/calculator.test.ts
npm run test:run
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/domain src/lib
git commit -m "refactor: introduce domain cost layer"
```

---

### Task 6: Move App Shell Last

**Files:**
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Move root app implementation**

Move:

```txt
src/App.tsx -> src/app/App.tsx
src/App.test.tsx -> src/app/App.test.tsx
```

- [ ] **Step 2: Keep root compatibility file**

Create `src/App.tsx`:

```ts
export { default } from './app/App'
export type { Role, Period, SimState } from './app/App'
```

- [ ] **Step 3: Update `src/main.tsx`**

Use:

```ts
import App from './app/App'
```

- [ ] **Step 4: Run app-level tests**

```bash
npm run test:run -- src/app/App.test.tsx
npm run test:run
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app src/App.tsx src/main.tsx
git commit -m "refactor: move app shell into app folder"
```

---

## What Not To Move Yet

Do not move these in the first pass:

- `design_system/`: keep as external design reference.
- `.github/`: keep at root.
- `phases/`: keep until the harness workflow is either retired or documented.
- `scripts/`: keep at root.
- `docs/superpowers/`: keep existing plan/spec history.
- root config files: `vite.config.ts`, `tailwind.config.js`, `tsconfig*.json`, `postcss.config.js`, `eslint.config.js`.

Also keep these ignored local files on disk but out of git:

- `클로드 코드 구조 (5).jpg`
- `클로드 코드 구조(5).jpg`
- `하네스 프레임워크 튜토리얼 가이드 1103fbff97b0828286a781accadb81dc.md`

---

## Final MVP Shape

After the refactor, the MVP product should read like this:

```txt
src/features/usage
  사용량을 가져온다.

src/features/current-cost
  지금 얼마 쓰는지 계산한다.

src/features/alternatives
  후보 모델로 바꾸면 어떻게 되는지 비교한다.

src/features/savings
  캐싱, 배치, 출력 제한, 라우팅 중 뭘 할지 추천한다.

src/features/unit-economics
  request, ticket, report, user 같은 비즈니스 단위당 원가를 보여준다.

src/features/report
  PM, CEO, 개발자에게 공유 가능한 요약을 만든다.

src/features/guardrails
  예산 초과와 비용 폭증을 감시한다.
```

This is better than the current flat structure because the folder names match the product story.

---

## Self Review

- Spec coverage: Covers current MVP, CSV import, cost comparison, savings levers, raw/effective unit economics, report, guardrails, and future domain split.
- Placeholder scan: No TBD/TODO placeholders are used.
- Type consistency: Compatibility re-exports keep existing import paths stable, especially `src/lib/calculator.ts` and `src/lib/format.ts`.
- Risk: Moving many files can create noisy diffs. Execute task-by-task and commit after each verified move.
