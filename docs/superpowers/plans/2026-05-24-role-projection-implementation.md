# Role Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Developer / PM / CEO role selector change the workspace emphasis without forking calculations, snapshots, ledgers, or report pipelines.

**Architecture:** Keep `buildAgentSnapshot`, decision-log storage, `showInternal`, and the 5-stage decision flow as the durable spine. Add one typed projection layer under `src/features/role-views/` that converts already-computed app data into role-aware view models. React components render those view models, but all numeric calculation remains in the existing calculation modules and all display formatting remains in `src/lib/format.ts`.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS 3, Vitest 4, @testing-library/react 16.

---

## Source Context

- The source plan is `docs/architecture/2026-05-24-role-projection-plan.md`.
- The repo constitution is `CLAUDE.md` and `AGENTS.md`: cost math goes through `src/lib/calculator.ts`; display formatting goes through `src/lib/format.ts`; role/state tests must verify updates, not only static render.
- Current role gap: `state.role` is selected in `src/app/App.tsx`, but the main workspace and right assistant are stage/audience driven.
- Current audience axis: `showInternal` is derived from `?debug=1` or `?mode=admin` and must remain independent from role.
- Existing assets to reuse: `src/features/agent/lib/buildAgentSnapshot.ts`, `src/features/decision-log/lib/`, `DecisionAssistantPanel`, `OnePageReportPanel`, `SummaryCard`, `OperationalSignalSummary`, `CostAttributionWorkspace`, `MarginRiskWorkspace`, `PricingSimulatorWorkspace`.
- Current worktree note before execution: `src/app/App.test.tsx` is already modified and `.env`, `artifacts/`, and `docs/architecture/2026-05-24-role-projection-plan.md` are untracked. Preserve user-owned changes and stage only files touched by each task.

## File Structure

- Create `src/features/role-views/roleLanguage.ts`: canonical role labels, tone, KPI priority, stage panel order, report section order.
- Create `src/features/role-views/roleLanguage.test.ts`: verifies the three role packs are distinct and internally complete.
- Modify `src/lib/roleLanguage.ts`: compatibility re-export only.
- Create `src/features/role-views/snapshotTypes.ts`: typed read model for values already computed elsewhere.
- Create `src/features/role-views/snapshotBuilder.ts`: pure function that gathers already-computed app data into `RoleProjectionSnapshot`.
- Create `src/features/role-views/snapshotBuilder.test.ts`: verifies the builder preserves existing numbers and metadata.
- Create `src/features/role-views/roleViewModel.ts`: `projectSnapshotForRole(snapshot, role, audience)`.
- Create `src/features/role-views/roleViewModel.test.ts`: numeric consistency, role-specific ordering, audience masking, assumption badges.
- Create `src/features/role-views/components/RoleProjectionStrip.tsx`: compact role KPI/focus strip.
- Create `src/features/role-views/components/RoleProjectionStrip.test.tsx`: rerender-based state sync test.
- Modify `src/features/report/lib/reportArtifacts.ts`: optional role/report section ordering.
- Modify `src/features/report/lib/reportArtifacts.test.ts`: role order does not invent numbers or drop refs.
- Modify `src/app/App.tsx`: build snapshot/view model once, inject into stage workspace, assistant, and report.
- Modify `src/app/App.test.tsx`: integration tests for role switching and audience masking.

## Task 1: Promote Role Language Into `features/role-views`

**Files:**
- Create: `src/features/role-views/roleLanguage.ts`
- Create: `src/features/role-views/roleLanguage.test.ts`
- Modify: `src/lib/roleLanguage.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/components/RoleSelector.tsx`

- [ ] **Step 1: Write the failing role language test**

Create `src/features/role-views/roleLanguage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  ALL_ROLES,
  ROLE_PACK,
  type ReportSectionKey,
  type Role,
  type WorkspacePanelKey,
} from './roleLanguage'

describe('ROLE_PACK', () => {
  it('defines the three supported roles with distinct panel priorities', () => {
    expect(ALL_ROLES).toEqual(['developer', 'pm', 'ceo'])

    const orders = ALL_ROLES.map(role => ROLE_PACK[role].workspacePanelOrder.join('|'))
    expect(new Set(orders).size).toBe(3)
  })

  it('keeps every role pack complete enough for projection', () => {
    const requiredPanels: WorkspacePanelKey[] = [
      'cost.operationalSignals',
      'cost.costAttribution',
      'cost.marginRisk',
      'optimize.pricing',
      'optimize.report',
      'decisionLog.onePageReport',
    ]
    const requiredReportSections: ReportSectionKey[] = [
      'grounding',
      'risk',
      'aiTeamCostDecision',
      'operatingAssetHealth',
    ]

    for (const role of ALL_ROLES) {
      const pack = ROLE_PACK[role]
      expect(pack.label).toMatch(/\S/)
      expect(pack.assistantTitle).toMatch(/\S/)
      expect(pack.assistantFocus).toMatch(/\S/)
      expect(pack.workspacePanelOrder).toEqual(expect.arrayContaining(requiredPanels))
      expect(pack.reportSectionOrder).toEqual(expect.arrayContaining(requiredReportSections))
    }
  })

  it('has role-specific KPI priority', () => {
    const firstKpiByRole: Record<Role, string> = {
      developer: ROLE_PACK.developer.kpiOrder[0],
      pm: ROLE_PACK.pm.kpiOrder[0],
      ceo: ROLE_PACK.ceo.kpiOrder[0],
    }

    expect(firstKpiByRole).toEqual({
      developer: 'top-agent-share',
      pm: 'gross-margin',
      ceo: 'monthly-cost',
    })
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/role-views/roleLanguage.test.ts
```

Expected: FAIL because `src/features/role-views/roleLanguage.ts` does not exist.

- [ ] **Step 3: Implement canonical role language**

Create `src/features/role-views/roleLanguage.ts`:

```ts
export type Role = 'developer' | 'pm' | 'ceo'
export type Audience = 'internal' | 'customer'

export type WorkspacePanelKey =
  | 'design.import'
  | 'design.teamDesigner'
  | 'design.teamCostStack'
  | 'cost.operationalSignals'
  | 'cost.costAttribution'
  | 'cost.marginRisk'
  | 'bottleneck.teamCostForecast'
  | 'optimize.pricing'
  | 'optimize.optimizationReview'
  | 'optimize.report'
  | 'decisionLog.log'
  | 'decisionLog.wedgeALog'
  | 'decisionLog.onePageReport'

export type ReportSectionKey =
  | 'grounding'
  | 'risk'
  | 'aiTeamCostDecision'
  | 'operatingAssetHealth'

export type RoleKpiKey =
  | 'monthly-cost'
  | 'top-agent-share'
  | 'gross-margin'
  | 'loss-customers'
  | 'failed-share'

export interface SummaryContext {
  currentModel: string
  candidateModel: string
  monthlyCost: string
  annualCost: string
  switchSavings: string
  switchPct: string
  perRequest: string
  perUser: string
  maxUsers: string
  topDriver: string
}

export interface RolePack {
  label: string
  summaryTone: 'technical' | 'product' | 'executive'
  assistantTitle: string
  assistantFocus: string
  kpiOrder: RoleKpiKey[]
  workspacePanelOrder: WorkspacePanelKey[]
  reportSectionOrder: ReportSectionKey[]
}

export const ALL_ROLES: Role[] = ['developer', 'pm', 'ceo']

const fullStageOrder: WorkspacePanelKey[] = [
  'design.import',
  'design.teamDesigner',
  'design.teamCostStack',
  'cost.operationalSignals',
  'cost.costAttribution',
  'cost.marginRisk',
  'bottleneck.teamCostForecast',
  'optimize.pricing',
  'optimize.optimizationReview',
  'optimize.report',
  'decisionLog.log',
  'decisionLog.wedgeALog',
  'decisionLog.onePageReport',
]

function orderPanels(priority: WorkspacePanelKey[]): WorkspacePanelKey[] {
  return [...priority, ...fullStageOrder.filter(panel => !priority.includes(panel))]
}

export const ROLE_PACK: Record<Role, RolePack> = {
  developer: {
    label: 'Developer',
    summaryTone: 'technical',
    assistantTitle: 'Developer cost debugger',
    assistantFocus: 'Trace model, retry, cache, and snapshot causes before changing routing.',
    kpiOrder: ['top-agent-share', 'failed-share', 'monthly-cost', 'gross-margin', 'loss-customers'],
    workspacePanelOrder: orderPanels([
      'cost.operationalSignals',
      'cost.costAttribution',
      'bottleneck.teamCostForecast',
      'optimize.optimizationReview',
      'decisionLog.log',
    ]),
    reportSectionOrder: ['grounding', 'aiTeamCostDecision', 'risk', 'operatingAssetHealth'],
  },
  pm: {
    label: 'PM',
    summaryTone: 'product',
    assistantTitle: 'PM rollout analyst',
    assistantFocus: 'Connect feature cost, margin risk, and rollout decisions for the next product move.',
    kpiOrder: ['gross-margin', 'monthly-cost', 'loss-customers', 'top-agent-share', 'failed-share'],
    workspacePanelOrder: orderPanels([
      'cost.costAttribution',
      'cost.marginRisk',
      'optimize.pricing',
      'optimize.report',
      'decisionLog.onePageReport',
    ]),
    reportSectionOrder: ['aiTeamCostDecision', 'risk', 'grounding', 'operatingAssetHealth'],
  },
  ceo: {
    label: 'CEO',
    summaryTone: 'executive',
    assistantTitle: 'CEO margin operator',
    assistantFocus: 'Keep spend, gross margin, loss customers, pricing policy, and decision history in view.',
    kpiOrder: ['monthly-cost', 'gross-margin', 'loss-customers', 'top-agent-share', 'failed-share'],
    workspacePanelOrder: orderPanels([
      'cost.marginRisk',
      'optimize.pricing',
      'decisionLog.onePageReport',
      'decisionLog.log',
      'optimize.report',
    ]),
    reportSectionOrder: ['aiTeamCostDecision', 'operatingAssetHealth', 'risk', 'grounding'],
  },
}

export function summaryTemplate(tone: RolePack['summaryTone'], ctx: SummaryContext): string {
  if (tone === 'technical') {
    return `At current config, 1 request costs ${ctx.perRequest} on ${ctx.currentModel}. ` +
      `Monthly ${ctx.monthlyCost}. ${ctx.topDriver} ` +
      `Switching to ${ctx.candidateModel} changes per-request cost by ${ctx.switchPct}.`
  }
  if (tone === 'executive') {
    return `Spend on ${ctx.currentModel}: ${ctx.monthlyCost}/mo (${ctx.annualCost}/yr). ` +
      `Switching to ${ctx.candidateModel} saves ${ctx.switchSavings} (${ctx.switchPct}) annually. ` +
      `Worst case doubled traffic: exposure grows proportionally. ` +
      `${ctx.topDriver}`
  }
  return `At ${ctx.maxUsers} users on ${ctx.currentModel}, monthly cost is ${ctx.monthlyCost} ` +
    `(${ctx.perUser} per user). Switching to ${ctx.candidateModel} would save ${ctx.switchSavings}. ` +
    `${ctx.topDriver}`
}
```

- [ ] **Step 4: Replace the legacy file with a re-export shim**

Modify `src/lib/roleLanguage.ts`:

```ts
export {
  ALL_ROLES,
  ROLE_PACK,
  summaryTemplate,
  type Audience,
  type ReportSectionKey,
  type Role,
  type RoleKpiKey,
  type RolePack,
  type SummaryContext,
  type WorkspacePanelKey,
} from '../features/role-views/roleLanguage'
```

- [ ] **Step 5: Move app-level Role typing to the feature boundary**

Modify the top of `src/app/App.tsx`:

```ts
import type { Role } from '../features/role-views/roleLanguage'
```

Replace the local role export:

```ts
export type { Role }
export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'
```

Modify `src/components/RoleSelector.tsx`:

```ts
import type { Role } from '../features/role-views/roleLanguage'
```

- [ ] **Step 6: Run focused tests and commit**

Run:

```powershell
npm run test:run -- src/features/role-views/roleLanguage.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/features/role-views/roleLanguage.ts src/features/role-views/roleLanguage.test.ts src/lib/roleLanguage.ts src/app/App.tsx src/components/RoleSelector.tsx
git commit -m "refactor: promote role language packs"
```

## Task 2: Define A Typed Role Projection Snapshot

**Files:**
- Create: `src/features/role-views/snapshotTypes.ts`
- Create: `src/features/role-views/snapshotBuilder.ts`
- Create: `src/features/role-views/snapshotBuilder.test.ts`

- [ ] **Step 1: Write the failing snapshot builder test**

Create `src/features/role-views/snapshotBuilder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AttributionResult } from '../usage/lib/attribution'
import { buildRoleProjectionSnapshot } from './snapshotBuilder'

const featureAttribution: AttributionResult = {
  axis: 'feature',
  totalCostUsd: 612,
  missingCount: 0,
  rows: [
    {
      key: 'report_generation',
      label: 'report_generation',
      requestCount: 10,
      inputTokens: 1000,
      outputTokens: 500,
      totalCostUsd: 400,
      avgInputTokensPerRequest: 100,
      avgOutputTokensPerRequest: 50,
      costPerRequest: 40,
      shareOfCost: 0.65,
    },
  ],
}

describe('buildRoleProjectionSnapshot', () => {
  it('preserves already-computed numbers and metadata without recomputing cost', () => {
    const snapshot = buildRoleProjectionSnapshot({
      attribution: { feature: featureAttribution },
      operationalSignals: {
        topSession: null,
        topAgentRun: { id: 'run-1', costUsd: 400, requestCount: 10 },
        highOutputTokenRows: [],
        failedShare: 0.12,
        missingStatusCount: 1,
        missingDimensionCount: 0,
      },
      planMargins: [
        {
          planId: 'pro',
          requestCount: 10,
          totalCostUsd: 612,
          effectiveCostUsd: 620,
          revenueUsd: 1000,
          grossMarginUsd: 388,
          grossMarginPct: 0.388,
          effectiveGrossMarginUsd: 380,
          effectiveGrossMarginPct: 0.38,
          marginRisk: 'thin',
        },
      ],
      customerMargins: [],
      pricingScenarios: [],
      riskCards: [],
      teamEstimate: {
        monthlyCostUsd: 612,
        monthlyInputTokens: 1000,
        monthlyOutputTokens: 500,
        monthlyRequests: 10,
        cacheSavingsUsd: 0,
        batchSavingsUsd: 0,
        topAgentId: 'agent-engineering',
        topAgentShare: 0.65,
      },
      recommendations: [],
      refs: ['tool:team.monthlyCostUsd', 'snapshot:cost:abc'],
      meta: {
        snapshotVersion: 'snapshot:cost:abc',
        formulaVersion: 'cost_formula_v0.3',
        providerRegistryVersion: 'provider_registry_v0.4',
      },
      performanceQualityBasis: 'assumption',
    })

    expect(snapshot.cost.totalMonthlyUsd).toBe(612)
    expect(snapshot.cost.byFeature[0]?.label).toBe('report_generation')
    expect(snapshot.margin.primaryGrossMarginPct).toBe(0.388)
    expect(snapshot.performance.failedShare).toBe(0.12)
    expect(snapshot.performance.qualityBasis).toBe('assumption')
    expect(snapshot.refs).toContain('snapshot:cost:abc')
    expect(snapshot.meta.formulaVersion).toBe('cost_formula_v0.3')
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/role-views/snapshotBuilder.test.ts
```

Expected: FAIL because `snapshotBuilder.ts` does not exist.

- [ ] **Step 3: Add snapshot types**

Create `src/features/role-views/snapshotTypes.ts`:

```ts
import type { AttributionResult, AttributionRow } from '../usage/lib/attribution'
import type { OperationalSignalSummary } from '../usage/lib/operationalSignals'
import type { CustomerMarginRow, MarginRow } from '../unit-economics/lib/margin'
import type { ScenarioResult } from '../pricing/lib/pricingScenario'
import type { RiskCard } from '../agent/lib/riskCards'
import type { TeamCostEstimate } from '../team-cost/lib/estimateAgentWorkload'
import type { OptimizationRecommendation } from '../team-cost/lib/optimizationPolicies'

export type ProjectionQualityBasis = 'observed' | 'assumption'

export interface RoleProjectionSnapshotInput {
  attribution: Partial<Record<AttributionResult['axis'], AttributionResult>>
  operationalSignals: OperationalSignalSummary
  planMargins: MarginRow[]
  customerMargins: CustomerMarginRow[]
  pricingScenarios: ScenarioResult[]
  riskCards: RiskCard[]
  teamEstimate: TeamCostEstimate
  recommendations: OptimizationRecommendation[]
  refs: string[]
  meta: {
    snapshotVersion: string
    formulaVersion: string
    providerRegistryVersion: string
  }
  performanceQualityBasis: ProjectionQualityBasis
}

export interface RoleProjectionSnapshot {
  cost: {
    totalMonthlyUsd: number
    byModel: AttributionRow[]
    byFeature: AttributionRow[]
    byCustomer: AttributionRow[]
    teamEstimate: TeamCostEstimate
  }
  margin: {
    primaryGrossMarginPct: number
    primaryGrossMarginUsd: number
    planMargins: MarginRow[]
    customerMargins: CustomerMarginRow[]
    lossCustomers: CustomerMarginRow[]
  }
  performance: OperationalSignalSummary & {
    qualityBasis: ProjectionQualityBasis
  }
  pricing: ScenarioResult[]
  risk: RiskCard[]
  recommendations: OptimizationRecommendation[]
  refs: string[]
  meta: {
    snapshotVersion: string
    formulaVersion: string
    providerRegistryVersion: string
  }
}
```

- [ ] **Step 4: Add the pure snapshot builder**

Create `src/features/role-views/snapshotBuilder.ts`:

```ts
import type { RoleProjectionSnapshot, RoleProjectionSnapshotInput } from './snapshotTypes'

function firstFinite(values: number[]): number {
  return values.find(Number.isFinite) ?? 0
}

export function buildRoleProjectionSnapshot(input: RoleProjectionSnapshotInput): RoleProjectionSnapshot {
  const primaryPlanMargin = input.planMargins[0]
  const grossMarginPct = firstFinite([
    primaryPlanMargin?.grossMarginPct,
    input.pricingScenarios[0]?.grossMarginPct,
  ])
  const grossMarginUsd = firstFinite([
    primaryPlanMargin?.grossMarginUsd,
    input.pricingScenarios[0]?.grossMarginUsd,
  ])

  return {
    cost: {
      totalMonthlyUsd: input.teamEstimate.monthlyCostUsd,
      byModel: input.attribution.model?.rows ?? [],
      byFeature: input.attribution.feature?.rows ?? [],
      byCustomer: input.attribution.customer?.rows ?? [],
      teamEstimate: input.teamEstimate,
    },
    margin: {
      primaryGrossMarginPct: grossMarginPct,
      primaryGrossMarginUsd: grossMarginUsd,
      planMargins: input.planMargins,
      customerMargins: input.customerMargins,
      lossCustomers: input.customerMargins.filter(row => row.marginRisk === 'loss'),
    },
    performance: {
      ...input.operationalSignals,
      qualityBasis: input.performanceQualityBasis,
    },
    pricing: input.pricingScenarios,
    risk: input.riskCards,
    recommendations: input.recommendations,
    refs: [...new Set(input.refs)],
    meta: input.meta,
  }
}
```

This function is allowed to select and sanitize already-computed values. It must not call `calculateCost`, `calculateMigrationDelta`, or implement pricing arithmetic.

- [ ] **Step 5: Run focused tests and commit**

Run:

```powershell
npm run test:run -- src/features/role-views/snapshotBuilder.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/features/role-views/snapshotTypes.ts src/features/role-views/snapshotBuilder.ts src/features/role-views/snapshotBuilder.test.ts
git commit -m "feat: add typed role projection snapshot"
```

## Task 3: Implement `projectSnapshotForRole`

**Files:**
- Create: `src/features/role-views/roleViewModel.ts`
- Create: `src/features/role-views/roleViewModel.test.ts`

- [ ] **Step 1: Write the failing role projection tests**

Create `src/features/role-views/roleViewModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { projectSnapshotForRole } from './roleViewModel'
import type { RoleProjectionSnapshot } from './snapshotTypes'

const baseSnapshot: RoleProjectionSnapshot = {
  cost: {
    totalMonthlyUsd: 612,
    byModel: [],
    byFeature: [],
    byCustomer: [],
    teamEstimate: {
      monthlyCostUsd: 612,
      monthlyInputTokens: 1000,
      monthlyOutputTokens: 500,
      monthlyRequests: 10,
      cacheSavingsUsd: 0,
      batchSavingsUsd: 0,
      topAgentId: 'agent-engineering',
      topAgentShare: 0.65,
    },
  },
  margin: {
    primaryGrossMarginPct: 0.388,
    primaryGrossMarginUsd: 388,
    planMargins: [],
    customerMargins: [],
    lossCustomers: [],
  },
  performance: {
    topSession: null,
    topAgentRun: { id: 'run-1', costUsd: 400, requestCount: 10 },
    highOutputTokenRows: [],
    failedShare: 0.12,
    missingStatusCount: 1,
    missingDimensionCount: 0,
    qualityBasis: 'assumption',
  },
  pricing: [],
  risk: [],
  recommendations: [],
  refs: ['tool:team.monthlyCostUsd', 'snapshot:cost:abc', 'risk:agent-loop'],
  meta: {
    snapshotVersion: 'snapshot:cost:abc',
    formulaVersion: 'cost_formula_v0.3',
    providerRegistryVersion: 'provider_registry_v0.4',
  },
}

describe('projectSnapshotForRole', () => {
  it('keeps common numeric values consistent across roles', () => {
    const dev = projectSnapshotForRole(baseSnapshot, 'developer', 'internal')
    const pm = projectSnapshotForRole(baseSnapshot, 'pm', 'internal')
    const ceo = projectSnapshotForRole(baseSnapshot, 'ceo', 'internal')

    const monthlyCost = (view: typeof dev) => view.kpis.find(kpi => kpi.id === 'monthly-cost')?.numericValue
    const grossMargin = (view: typeof dev) => view.kpis.find(kpi => kpi.id === 'gross-margin')?.numericValue

    expect(monthlyCost(dev)).toBe(612)
    expect(monthlyCost(pm)).toBe(612)
    expect(monthlyCost(ceo)).toBe(612)
    expect(grossMargin(dev)).toBe(0.388)
    expect(grossMargin(pm)).toBe(0.388)
    expect(grossMargin(ceo)).toBe(0.388)
  })

  it('changes KPI and panel ordering by role', () => {
    const dev = projectSnapshotForRole(baseSnapshot, 'developer', 'internal')
    const ceo = projectSnapshotForRole(baseSnapshot, 'ceo', 'internal')

    expect(dev.kpis[0]?.id).toBe('top-agent-share')
    expect(ceo.kpis[0]?.id).toBe('monthly-cost')
    expect(dev.workspacePanelOrder[0]).toBe('cost.operationalSignals')
    expect(ceo.workspacePanelOrder[0]).toBe('cost.marginRisk')
  })

  it('masks raw internal refs for customer audience', () => {
    const customer = projectSnapshotForRole(baseSnapshot, 'ceo', 'customer')

    expect(customer.assistant.refs).toEqual(['stored:cost-evidence', 'stored:risk-evidence', 'stored:decision-log'])
    expect(customer.assistant.refs.some(ref => ref.startsWith('tool:') || ref.startsWith('snapshot:'))).toBe(false)
  })

  it('marks developer performance signals as assumption-based when needed', () => {
    const dev = projectSnapshotForRole(baseSnapshot, 'developer', 'internal')

    expect(dev.kpis.some(kpi => kpi.qualityBasis === 'assumption')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/role-views/roleViewModel.test.ts
```

Expected: FAIL because `roleViewModel.ts` does not exist.

- [ ] **Step 3: Implement the role view model**

Create `src/features/role-views/roleViewModel.ts`:

```ts
import { fmtCurrency, fmtPercent, fmtTokens } from '../../lib/format'
import { ROLE_PACK, type Audience, type ReportSectionKey, type Role, type RoleKpiKey, type WorkspacePanelKey } from './roleLanguage'
import type { ProjectionQualityBasis, RoleProjectionSnapshot } from './snapshotTypes'

export interface MetricCardModel {
  id: RoleKpiKey
  label: string
  value: string
  numericValue: number
  help: string
  qualityBasis?: ProjectionQualityBasis
}

export interface RoleAssistantModel {
  title: string
  focus: string
  refs: string[]
  evidenceNote: string
}

export interface RoleViewModel {
  role: Role
  audience: Audience
  label: string
  kpis: MetricCardModel[]
  workspacePanelOrder: WorkspacePanelKey[]
  assistant: RoleAssistantModel
  reportSectionOrder: ReportSectionKey[]
}

const customerRefs = ['stored:cost-evidence', 'stored:risk-evidence', 'stored:decision-log']

function metricMap(snapshot: RoleProjectionSnapshot): Record<RoleKpiKey, MetricCardModel> {
  return {
    'monthly-cost': {
      id: 'monthly-cost',
      label: 'Monthly AI cost',
      value: fmtCurrency(snapshot.cost.totalMonthlyUsd),
      numericValue: snapshot.cost.totalMonthlyUsd,
      help: 'Uses the existing team cost estimate.',
    },
    'top-agent-share': {
      id: 'top-agent-share',
      label: 'Top agent share',
      value: fmtPercent(snapshot.cost.teamEstimate.topAgentShare),
      numericValue: snapshot.cost.teamEstimate.topAgentShare,
      help: 'Concentration of cost in the highest-cost AI agent.',
      qualityBasis: snapshot.performance.qualityBasis,
    },
    'gross-margin': {
      id: 'gross-margin',
      label: 'Gross margin',
      value: fmtPercent(snapshot.margin.primaryGrossMarginPct),
      numericValue: snapshot.margin.primaryGrossMarginPct,
      help: 'Lowest current plan margin or selected pricing scenario margin.',
    },
    'loss-customers': {
      id: 'loss-customers',
      label: 'Loss customers',
      value: fmtTokens(snapshot.margin.lossCustomers.length),
      numericValue: snapshot.margin.lossCustomers.length,
      help: 'Customers whose current cost exceeds revenue.',
    },
    'failed-share': {
      id: 'failed-share',
      label: 'Failed/retry share',
      value: fmtPercent(snapshot.performance.failedShare),
      numericValue: snapshot.performance.failedShare,
      help: 'Usage rows marked failed, error, timeout, or retry.',
      qualityBasis: snapshot.performance.qualityBasis,
    },
  }
}

function refsForAudience(snapshot: RoleProjectionSnapshot, audience: Audience): string[] {
  if (audience === 'customer') return customerRefs
  return snapshot.refs.length > 0 ? snapshot.refs : [snapshot.meta.snapshotVersion]
}

export function projectSnapshotForRole(
  snapshot: RoleProjectionSnapshot,
  role: Role,
  audience: Audience,
): RoleViewModel {
  const pack = ROLE_PACK[role]
  const metrics = metricMap(snapshot)

  return {
    role,
    audience,
    label: `${pack.label} view`,
    kpis: pack.kpiOrder.map(key => metrics[key]),
    workspacePanelOrder: pack.workspacePanelOrder,
    reportSectionOrder: pack.reportSectionOrder,
    assistant: {
      title: pack.assistantTitle,
      focus: pack.assistantFocus,
      refs: refsForAudience(snapshot, audience),
      evidenceNote: audience === 'internal'
        ? 'Internal refs show exact tool, snapshot, risk, and decision sources.'
        : 'Evidence is stored in the decision record; raw tool refs are hidden from customer view.',
    },
  }
}
```

- [ ] **Step 4: Run focused tests and commit**

Run:

```powershell
npm run test:run -- src/features/role-views/roleViewModel.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/features/role-views/roleViewModel.ts src/features/role-views/roleViewModel.test.ts
git commit -m "feat: add role projection view models"
```

## Task 4: Add A Role Projection Strip

**Files:**
- Create: `src/features/role-views/components/RoleProjectionStrip.tsx`
- Create: `src/features/role-views/components/RoleProjectionStrip.test.tsx`

- [ ] **Step 1: Write the failing component rerender test**

Create `src/features/role-views/components/RoleProjectionStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoleProjectionStrip } from './RoleProjectionStrip'
import type { RoleViewModel } from '../roleViewModel'

function view(label: string, firstKpi: string): RoleViewModel {
  return {
    role: label.startsWith('Developer') ? 'developer' : 'ceo',
    audience: 'internal',
    label,
    workspacePanelOrder: [],
    reportSectionOrder: [],
    assistant: {
      title: `${label} assistant`,
      focus: `${label} focus`,
      refs: ['tool:team.monthlyCostUsd'],
      evidenceNote: 'Internal refs show exact sources.',
    },
    kpis: [
      {
        id: firstKpi === 'Top agent share' ? 'top-agent-share' : 'monthly-cost',
        label: firstKpi,
        value: firstKpi === 'Top agent share' ? '65%' : '$612',
        numericValue: firstKpi === 'Top agent share' ? 0.65 : 612,
        help: 'Test KPI',
        qualityBasis: firstKpi === 'Top agent share' ? 'assumption' : undefined,
      },
    ],
  }
}

describe('RoleProjectionStrip', () => {
  it('updates visible role and KPI content when rerendered', () => {
    const { rerender } = render(<RoleProjectionStrip view={view('Developer view', 'Top agent share')} />)

    expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Developer view/i)
    expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Top agent share/i)
    expect(screen.getByText(/Assumption based/i)).toBeInTheDocument()

    rerender(<RoleProjectionStrip view={view('CEO view', 'Monthly AI cost')} />)

    expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/CEO view/i)
    expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Monthly AI cost/i)
    expect(screen.queryByText(/Assumption based/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/role-views/components/RoleProjectionStrip.test.tsx
```

Expected: FAIL because `RoleProjectionStrip.tsx` does not exist.

- [ ] **Step 3: Implement the strip**

Create `src/features/role-views/components/RoleProjectionStrip.tsx`:

```tsx
import { Badge, Surface } from '../../../shared/ui/primitives'
import type { RoleViewModel } from '../roleViewModel'

export function RoleProjectionStrip({ view }: { view: RoleViewModel }) {
  return (
    <Surface
      eyebrow="Role projection"
      title={view.label}
      description={view.assistant.focus}
    >
      <div data-testid="role-projection-strip" className="grid gap-3 md:grid-cols-3">
        {view.kpis.slice(0, 3).map(kpi => (
          <div key={kpi.id} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-label-alternative">{kpi.label}</p>
              {kpi.qualityBasis === 'assumption' && (
                <Badge tone="caution">Assumption based</Badge>
              )}
            </div>
            <p className="mt-1 text-lg font-semibold text-label-normal" translate="no">{kpi.value}</p>
            <p className="mt-1 text-xs text-label-alternative">{kpi.help}</p>
          </div>
        ))}
      </div>
    </Surface>
  )
}
```

- [ ] **Step 4: Run focused tests and commit**

Run:

```powershell
npm run test:run -- src/features/role-views/components/RoleProjectionStrip.test.tsx
```

Expected: PASS.

Commit:

```powershell
git add src/features/role-views/components/RoleProjectionStrip.tsx src/features/role-views/components/RoleProjectionStrip.test.tsx
git commit -m "feat: add role projection strip"
```

## Task 5: Integrate Projection Into `App.tsx` Stage Rendering

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing app role-switch test**

Add this test to `src/app/App.test.tsx` inside the existing `describe` block:

```tsx
it('updates the workspace role projection when the role selector changes', async () => {
  const user = userEvent.setup()
  render(<App />)

  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/PM view/i)
  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Gross margin/i)

  await user.click(screen.getByRole('tab', { name: /Developer view/i }))

  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Developer view/i)
  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Top agent share/i)
  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Assumption based/i)

  await user.click(screen.getByRole('tab', { name: /CEO view/i }))

  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/CEO view/i)
  expect(screen.getByTestId('role-projection-strip')).toHaveTextContent(/Monthly AI cost/i)
})
```

- [ ] **Step 2: Run the focused app test to verify it fails**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected: FAIL because the role projection strip is not yet rendered by `App`.

- [ ] **Step 3: Build the projection snapshot and view in `App`**

Modify imports in `src/app/App.tsx`:

```ts
import { RoleProjectionStrip } from '../features/role-views/components/RoleProjectionStrip'
import { buildRoleProjectionSnapshot } from '../features/role-views/snapshotBuilder'
import { projectSnapshotForRole } from '../features/role-views/roleViewModel'
import type { Audience, ReportSectionKey, Role, WorkspacePanelKey } from '../features/role-views/roleLanguage'
```

After `agentSnapshot` is built, add:

```ts
  const roleAudience: Audience = showInternal ? 'internal' : 'customer'
  const roleProjectionSnapshot = useMemo(() => buildRoleProjectionSnapshot({
    attribution,
    operationalSignals,
    planMargins,
    customerMargins,
    pricingScenarios: scenarios,
    riskCards: teamCostRiskCards.length > 0 ? teamCostRiskCards : riskCards,
    teamEstimate: teamCostEstimate,
    recommendations: teamCostRecommendations,
    refs: [
      ...ASSISTANT_TOOL_REFS,
      agentSnapshot.snapshotVersion,
      ...agentRun.toolResultRefs,
      ...agentRun.riskCardIds.map(refId => `risk:${refId}`),
      ...agentRun.evidenceRefs.map(refId => `evidence:${refId}`),
    ],
    meta: {
      snapshotVersion: agentSnapshot.snapshotVersion,
      formulaVersion: COST_FORMULA_VERSION,
      providerRegistryVersion: PROVIDER_REGISTRY_VERSION,
    },
    performanceQualityBasis: importedUsage?.rows.length ? 'observed' : 'assumption',
  }), [
    agentRun.evidenceRefs,
    agentRun.riskCardIds,
    agentRun.toolResultRefs,
    agentSnapshot.snapshotVersion,
    attribution,
    customerMargins,
    importedUsage?.rows.length,
    operationalSignals,
    planMargins,
    riskCards,
    scenarios,
    teamCostEstimate,
    teamCostRecommendations,
    teamCostRiskCards,
  ])

  const roleView = useMemo(
    () => projectSnapshotForRole(roleProjectionSnapshot, state.role, roleAudience),
    [roleAudience, roleProjectionSnapshot, state.role],
  )
```

- [ ] **Step 4: Render the role strip above the active stage**

Inside `<section data-testid="decision-workspace-panel" ...>`, render this immediately before `{stageWorkspace}`:

```tsx
          <RoleProjectionStrip view={roleView} />
```

- [ ] **Step 5: Use role panel order for the cost stage without hiding all core panels**

In `App`, add a local helper before `stageWorkspace`:

```ts
  const costPanelOrder = roleView.workspacePanelOrder.filter(panel => (
    panel === 'cost.operationalSignals'
    || panel === 'cost.costAttribution'
    || panel === 'cost.marginRisk'
  ))

  const renderCostPanel = (panel: WorkspacePanelKey) => {
    if (panel === 'cost.operationalSignals') {
      return <OperationalSignalSummary key={panel} summary={operationalSignals} />
    }
    if (panel === 'cost.costAttribution') {
      return <CostAttributionWorkspace key={panel} attribution={attribution} />
    }
    if (panel === 'cost.marginRisk') {
      return (
        <MarginRiskWorkspace
          key={panel}
          planMargins={planMargins}
          customerMargins={customerMargins}
          topDecileShare={heavyUsers.topDecileShare}
        />
      )
    }
    return null
  }
```

Replace the current cost stage body:

```tsx
      {activeDecisionStage === 'cost' && (
        <>
          {costPanelOrder.map(renderCostPanel)}
        </>
      )}
```

This first integration changes ordering by role but keeps all three cost-stage panels visible. Later phases can hide optional panels after usage feedback.

- [ ] **Step 6: Run focused tests and commit**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected: PASS.

Commit:

```powershell
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: connect role projection to workspace"
```

## Task 6: Connect Role Projection To Assistant And Report Output

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/features/report/lib/reportArtifacts.ts`
- Modify: `src/features/report/lib/reportArtifacts.test.ts`

- [ ] **Step 1: Write failing report artifact ordering test**

Add to `src/features/report/lib/reportArtifacts.test.ts`:

```ts
it('orders report sections from a supplied role projection order', () => {
  const report = buildReportArtifact({
    audience: 'ceo_cfo',
    toolResultRefs: ['tool:monthlyAiCogs'],
    riskCardIds: ['risk-price-staleness'],
    headline: 'Margin needs review',
    sectionOrder: ['aiTeamCostDecision', 'operatingAssetHealth', 'risk', 'grounding'],
    costSummary: 'AI team monthly cost: $612.',
    operatingAssetHealth: ['provider_registry: fresh'],
  })

  expect(report.sections.map(section => section.key)).toEqual([
    'aiTeamCostDecision',
    'operatingAssetHealth',
    'risk',
    'grounding',
  ])
  expect(report.sections[0]?.body).toContain('$612')
  expect(report.sections.some(section => section.body.includes('tool:monthlyAiCogs'))).toBe(true)
})
```

- [ ] **Step 2: Extend report artifacts with section keys**

Modify `src/features/report/lib/reportArtifacts.ts`:

```ts
import type { ReportSectionKey } from '../../role-views/roleLanguage'

export interface ReportSection {
  key: ReportSectionKey
  title: string
  body: string
}

export interface ReportArtifactInput {
  audience: ReportAudience
  headline: string
  toolResultRefs: string[]
  riskCardIds: string[]
  sectionOrder?: ReportSectionKey[]
  costSummary?: string
  marginSummary?: string
  bottleneckSummary?: string
  optimizationSummary?: string
  decisionSummary?: string
  evidenceRefs?: string[]
  operatingAssetHealth?: string[]
}
```

Build sections before returning:

```ts
  const sectionMap: Record<ReportSectionKey, ReportSection> = {
    grounding: {
      key: 'grounding',
      title: 'Grounding',
      body: `${input.headline}. Deterministic refs: ${refs}.`,
    },
    risk: {
      key: 'risk',
      title: 'Risk',
      body: `Risk refs: ${riskRefs}.`,
    },
    aiTeamCostDecision: {
      key: 'aiTeamCostDecision',
      title: 'AI team cost decision',
      body: [
        input.costSummary,
        input.marginSummary,
        input.bottleneckSummary,
        input.optimizationSummary,
        input.decisionSummary,
        `Evidence refs: ${evidenceRefs}.`,
      ].filter(Boolean).join(' '),
    },
    operatingAssetHealth: {
      key: 'operatingAssetHealth',
      title: 'Operating asset health',
      body: input.operatingAssetHealth?.join(' ') || 'No operating asset health notes attached.',
    },
  }
  const order = input.sectionOrder ?? ['grounding', 'risk', 'aiTeamCostDecision', 'operatingAssetHealth']
```

Return:

```ts
    sections: order.map(key => sectionMap[key]),
```

- [ ] **Step 3: Write failing app assistant/customer masking test**

Add to `src/app/App.test.tsx`:

```tsx
it('uses role-specific assistant framing while keeping customer audience refs masked', async () => {
  const user = userEvent.setup()
  render(<App />)

  expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/PM rollout analyst/i)
  expect(screen.getByTestId('decision-assistant-panel')).not.toHaveTextContent(/tool:team\.monthlyCostUsd/i)

  await user.click(screen.getByRole('tab', { name: /CEO view/i }))

  expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/CEO margin operator/i)
  expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Evidence is stored in the decision record/i)
  expect(screen.getByTestId('decision-assistant-panel')).not.toHaveTextContent(/snapshot:/i)
})
```

- [ ] **Step 4: Pass role assistant into `DecisionAssistantPanel`**

Modify `DecisionAssistantPanel` props in `src/app/App.tsx`:

```ts
  roleAssistant,
```

and type:

```ts
  roleAssistant: RoleViewModel['assistant']
```

Import the type:

```ts
import type { RoleViewModel } from '../features/role-views/roleViewModel'
```

Fold role-projection refs into the existing assistant refs:

```ts
  const assistantRefs = recommendation
    ? [...new Set([...roleAssistant.refs, ...ASSISTANT_TOOL_REFS, ...recommendation.toolResultRefs, ...agentRun.toolResultRefs])]
    : [...new Set(roleAssistant.refs)]
```

Replace the static assistant header text:

```tsx
          <p className="text-xs font-semibold uppercase text-primary-normal">{roleAssistant.title}</p>
```

Replace the static explanatory paragraph:

```tsx
        <p className="mt-2 text-sm text-label-neutral" lang="en">
          {roleAssistant.focus} It can explain refs, risk, and next decisions, but it does not create cost numbers.
        </p>
```

In the customer branch beneath refs, use:

```tsx
          <p className="mt-3 text-xs text-label-alternative">
            {roleAssistant.evidenceNote}
          </p>
```

Pass from the bottom of `App`:

```tsx
          roleAssistant={roleView.assistant}
```

- [ ] **Step 5: Pass role report ordering into `OnePageReportPanel`**

Modify `OnePageReportPanel` props:

```ts
  roleView,
```

and type:

```ts
  roleView: RoleViewModel
```

Use it in `buildReportArtifact`:

```ts
    audience: roleView.role === 'developer' ? 'developer' : roleView.role === 'pm' ? 'pm' : 'ceo_cfo',
    sectionOrder: roleView.reportSectionOrder as ReportSectionKey[],
```

Change the `Surface` title:

```tsx
      title={`${roleView.label} Report`}
```

Pass from the decision-log stage:

```tsx
            roleView={roleView}
```

- [ ] **Step 6: Run focused tests and commit**

Run:

```powershell
npm run test:run -- src/features/report/lib/reportArtifacts.test.ts src/app/App.test.tsx
```

Expected: PASS.

Commit:

```powershell
git add src/app/App.tsx src/app/App.test.tsx src/features/report/lib/reportArtifacts.ts src/features/report/lib/reportArtifacts.test.ts
git commit -m "feat: apply role projection to assistant and reports"
```

## Task 7: Full Verification And Browser Smoke

**Files:**
- Verify only unless a failure requires a scoped fix.

- [ ] **Step 1: Run all unit/component tests**

Run:

```powershell
npm run test:run
```

Expected: all tests pass. If this fails, fix the failing test or implementation in the smallest related file, then rerun the full command.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: Vite production build succeeds and writes `dist/`.

- [ ] **Step 3: Preview and smoke the role/audience flow**

Run:

```powershell
npm run preview
```

Open:

```text
http://127.0.0.1:4173/token_simulator/
```

Manual smoke:

1. Default PM view shows `PM view`, gross margin first, and no raw `tool:`/`snapshot:` refs.
2. Click `Developer`; role strip changes to `Developer view`, top agent share is first, and assumption badges are visible when no imported usage exists.
3. Click `CEO`; role strip changes to `CEO view`, monthly cost is first.
4. Go to `Cost`; the same panels remain available, but the order follows the selected role.
5. Go to `Decision Log`; the report title follows the selected role.
6. Open `http://127.0.0.1:4173/token_simulator/?mode=admin`; internal refs and snapshot chips are visible, while role projection still changes emphasis only.

- [ ] **Step 4: Commit final verification-only fixes if needed**

If verification required fixes:

```powershell
git add <only-files-touched-for-fix>
git commit -m "fix: stabilize role projection verification"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

Spec coverage:
- The plan preserves one calculation path by only selecting already-computed values in `snapshotBuilder.ts` and formatting through `roleViewModel.ts`.
- The plan treats `role` and `audience` as orthogonal axes through `projectSnapshotForRole(snapshot, role, audience)`.
- The plan reuses `buildAgentSnapshot`, decision-log data, `DecisionAssistantPanel`, `OnePageReportPanel`, and existing stage panels instead of creating duplicate replacements.
- The plan adds rerender-based component coverage and app-level role switching coverage.

Placeholder scan:
- No task uses placeholder markers, copy-forward shortcuts, or unspecified tests.
- Each code-changing task starts with a failing test and includes exact commands.

Type consistency:
- Canonical `Role` is exported from `src/features/role-views/roleLanguage.ts`.
- `Audience` is defined beside `Role` and used by `projectSnapshotForRole`.
- `ReportSectionKey` is shared between role language and report artifact ordering.
- `WorkspacePanelKey` is used by both role view models and `App.tsx` stage rendering.
