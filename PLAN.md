# Developer-First Cost Decision Workspace Plan

> Purpose: Reconcile the existing broad feature set with the developer-first planner direction. Keep only features that help a developer make a pricing, workload, migration, or optimization decision quickly. Collapse or defer everything else.

## North Star

The app should answer these questions in one working screen:

1. What will this workload cost?
2. Which lever changes cost fastest?
3. What happens if we switch models?
4. Can I trust the pricing assumptions?

This is not a feature gallery. Panels that do not support one of those questions should be hidden, collapsed, or deferred.

## Current Broad Additions vs Developer-First Plan

### Strong Keep

These are useful for developers and should remain first-class, but many need tighter placement and calculation discipline.

| Component | Keep? | Developer Value | Required Adjustment |
|---|---:|---|---|
| `WorkloadBuilder` | Yes | Converts real traffic assumptions into monthly tokens and requests. | Make default input mode. Direct token mode becomes Advanced. |
| `ModelSelector` | Yes | Lets developers compare model price/context/source quickly. | Show provider, context, price pair, source link, verified date, cache/batch support. |
| `DecisionSummaryStrip` | Yes | Gives immediate current vs candidate cost and cost/request. | Put directly below inputs. Keep compact. |
| `MigrationPanel` | Yes | Core model-switch decision. | Add input/output breakdown, cache/batch savings, and same-model guard. |
| `ScenarioPlanner` | Yes | Helps reason about best/base/worst traffic changes. | Editable requests/input/output/cache/batch per column. |
| `SummaryCard` | Yes | Board-ready export. | Make secondary; use workload assumptions and static provenance wording. |
| `CacheAnalyzer` | Yes | Practical optimization lever. | Use calculator outputs only; show estimated savings from cache changes. |
| `BatchAnalyzer` | Yes | Practical optimization lever. | Show when batch is applicable, not as generic advice. |
| `RequestPatternAnalyzer` | Yes | Helps developers map request types to cost drivers. | Tie request patterns to workload math, not invented percentages. |
| `CostAttributionByFeature` | Yes | Useful when teams know which product features drive usage. | Keep as editable allocation, not static fake analysis. |
| `CostPerBusinessMetric` | Yes | Useful if the metric is configured by the user. | Keep only with explicit denominator input such as tickets, PRs, users, jobs. |
| `ModelComparisonMatrix` | Yes | Useful for model shortlist decisions. | Keep compact; rank by cost/request, context, cache/batch support. |

### Keep, But Demote

These can be useful, but they should not compete with the main developer decision flow.

| Component | Placement | Why |
|---|---|---|
| `BudgetCap` | Collapsed under Guardrails | Useful once cost is known. |
| `BudgetAlert` / `CostAlertConfig` | Collapse into one Guardrails panel | Duplicate intent. Merge into one budget/alert configuration. |
| `CostTrendAnalyzer` | Later section | Useful only after scenario assumptions exist. Avoid pretending to have historical data. |
| `SavingsPaybackTimeline` | Fold into Migration or Roadmap | Useful only when savings are real and based on calculator deltas. |
| `CostOptimizationRoadmap` | Keep as Optimization Queue | Useful if it ranks actual levers: cache, batch, model switch, input reduction, output reduction. |
| `ModelRecommendation` | Later section | Helpful if it explains rank criteria; avoid black-box recommendation. |
| `RequirementsFilter` | Later section | Useful for narrowing model candidates by context/provider/features. |
| `TokenEfficiency` | Later section | Useful if it uses cost/request and input/output ratio. |
| `ExportAnalysis` | Bottom action | Export is output, not part of analysis. |
| `ConfigPanel` | Header utility | Good for saving/loading assumptions. |

### Defer Or Remove From Main Flow

These are either executive-oriented, not backed by current data, or likely to make the tool noisy.

| Component | Decision | Reason |
|---|---|---|
| `TCOCalculator` | Defer | Three-year TCO is mostly business planning; not core developer cost debugging. |
| `BreakevenAnalysis` | Fold into `MigrationPanel` | Useful, but a full panel is redundant. Show payback months only when candidate saves money. |
| `RegionalCostAnalysis` | Defer | Needs real regional pricing/catalog support. Static regional multipliers would be misleading. |
| `SLACostCalculator` | Defer | Needs real latency/SLA model assumptions. Otherwise it is speculative. |
| `ComplianceRequirements` | Defer | Important for procurement, not the core developer pricing workflow. |
| `ROICalculator` | Defer | Executive value, weak developer actionability. |
| `TeamCostAnalysis` | Replace with `CostAllocationByTeam` later | Team-level attribution is useful, but needs explicit team inputs. |
| `ProviderComparisonDashboard` | Collapse | Too broad; selected-model provenance and matrix cover the practical need. |
| `ProviderComparison` | Collapse | Same as above unless it shows concrete selected-model differences. |
| `CustomPricingInput` | Advanced only | Useful for enterprise/private pricing, but should not crowd default flow. |
| `UseCaseRecommendations` | Defer | Often generic; better handled by requirements filter plus model matrix. |
| `PerformanceTiers` | Defer | Needs real benchmark data to be trustworthy. |
| `ModelPerformanceBenchmarks` | Defer | Needs sourced benchmarks. Do not invent performance comparisons. |
| `FeatureCostBreakdown` | Merge into `CostAttributionByFeature` | Duplicate concept. |
| `OptimizationOpportunities` | Merge into `CostOptimizationRoadmap` | Duplicate concept. |
| `MigrationPlaybook` | Defer | Useful after a model decision, not before. |
| `ModelFeatures` | Merge into selected model cards | Support badges are enough in the main flow. |

### Remaining Wishlist Triage

| Wishlist Item | Priority | Decision |
|---|---:|---|
| Cost Allocation by Team/Project | Medium | Build after feature attribution. Needs editable team/project shares. |
| Savings Tracker | Medium | Useful after optimization plan exists. Track projected vs actual manually. |
| Cost Anomaly Detection | Low | Defer until there is real time-series data or imported usage data. |
| Quota Management | Medium | Useful if user enters rate limits/monthly caps. Build as Guardrails, not a chart. |
| Custom Report Generator | Low | Defer. Current summary/export should be enough. |

## Target Page Structure

### 1. Setup

Keep this above the fold.

- Current model selector
- Candidate model selector
- Provenance shown directly under each selected model:
  - provider
  - context window
  - input/output price
  - source link
  - last verified date
  - cache/batch support badges
- Input mode:
  - `Workload Builder` default
  - `Direct Tokens (Advanced)` fallback
- Shared optimization controls:
  - cache hit rate
  - batch enabled

### 2. Decision Strip

One compact strip immediately below setup.

- Current monthly cost
- Candidate monthly cost
- Monthly delta
- Annual delta
- Current cost/request
- Candidate cost/request

This is the primary answer. If a developer sees only one section, this should be enough.

### 3. Lever Breakdown

This section explains what to change.

- Input cost
- Output cost
- Cached input cost
- Uncached input cost
- Cache savings
- Batch savings
- Largest cost driver
- Largest model-switch difference

Use `MigrationPanel`, `CacheAnalyzer`, and `BatchAnalyzer` here. Avoid three separate large cards if the same numbers can fit in one panel.

### 4. Scenario Planner

Three editable columns:

- Best
- Base
- Worst

Editable fields per column:

- request multiplier
- average input multiplier
- average output multiplier
- cache hit rate
- batch mode

Base should inherit the current workload.

### 5. Developer Diagnostics

Lower on the page, collapsed by default if needed.

Keep:

- `RequestPatternAnalyzer`
- `CostAttributionByFeature`
- `CostPerBusinessMetric`
- `ModelComparisonMatrix`
- `RequirementsFilter`
- `TokenEfficiency`

Rule: each panel must let the user edit or choose an assumption, or it must explain a concrete decision. Static dashboards are not useful here.

### 6. Guardrails

Keep compact and operational.

Merge these into one area:

- `BudgetCap`
- `BudgetAlert`
- `CostAlertConfig`
- future `Quota Management`

This section should answer:

- Will this workload exceed budget?
- At what traffic level does it exceed budget?
- What manual alert threshold should we use?
- What monthly quota is implied?

### 7. Export

Bottom section.

- `SummaryCard`
- copy/export actions
- static pricing catalog disclaimer
- selected model source links
- selected model verified dates

Do not use the current month as pricing freshness proof.

## Data And Calculation Rules

### Cost Math

All cost math remains in `src/lib/calculator.ts`.

Required result fields:

- `monthlyCost`
- `annualCost`
- `inputCost`
- `outputCost`
- `cachedInputCost`
- `uncachedInputCost`
- `monthlyRequests`
- `costPerRequest`
- `cacheSavings`
- `batchSavings`

Definitions:

- `cacheSavings`: same workload/model with requested cache rate vs `cacheHitRate: 0`, keeping batch unchanged.
- `batchSavings`: same workload/model with requested batch setting vs `batchEnabled: false`, keeping cache unchanged.
- `costPerRequest`: `monthlyCost / monthlyRequests`, or `0` when monthly requests are `0`.

### Workload Math

Workload assumptions live in `src/lib/workload.ts`.

Primary mode:

- `volumeBasis: 'requestsPerDay' | 'activeUsers'`
- `activeDaysPerMonth`
- `retryRate`
- `requestsPerDay`
- `activeUsers`
- `requestsPerUserPerDay`
- `avgInputTokensPerRequest`
- `avgOutputTokensPerRequest`

Derived output:

- `monthlyRequests`
- `monthlyInputTokens`
- `monthlyOutputTokens`

Components consume derived monthly totals. They do not re-derive cost math locally.

### Formatting

All user-visible numbers go through `src/lib/format.ts`.

Allowed component formatting:

- none for currency
- none for percentages
- none for tokens
- no inline `toLocaleString`
- no inline `toFixed`
- no manual `'$' + value`

If a display format is missing, add a helper to `format.ts` with tests.

## Practical Implementation Order

### Phase 1: Make The Core Decision Flow Real

- [x] Add or finish `deriveMonthlyWorkload`.
- [x] Extend `calculateCost` and `calculateMigrationDelta` with request count and savings fields.
- [x] Add `PlannerState` and `toLegacySimState` so existing panels keep working.
- [x] Make `WorkloadBuilder` the default input.
- [x] Keep direct token entry as Advanced.
- [x] Add selected-model provenance to model selectors.
- [x] Add `DecisionSummaryStrip`.
- [x] Upgrade `MigrationPanel` with breakdown and payback months.

Exit criteria:

- `npm run test:run` passes.
- `npm run build` passes.
- Changing workload inputs updates decision strip, migration, scenario, and summary.

### Phase 2: Reduce Dashboard Noise

- [x] Reorder `App.tsx` into the target page structure.
- [x] Move demoted panels below Developer Diagnostics or Guardrails.
- [x] Remove duplicate panels from the main path.
- [x] Merge/remove duplicated default-surface panels:
  - `BudgetAlert` + `CostAlertConfig` removed from default Guardrails in favor of `BudgetCap` + `BudgetForecast`.
  - `FeatureCostBreakdown` removed from default surface; `CostAttributionByFeature` remains.
  - `OptimizationOpportunities` removed from default surface; `CostOptimizationRoadmap` remains.
  - `ProviderComparison` removed from default surface; `ModelComparisonMatrix` and selected model cards remain.
- [x] Hide/defer panels that require unsupported data:
  - regional pricing
  - SLA/latency cost modeling
  - benchmark comparisons
  - anomaly detection

Exit criteria:

- First viewport shows setup and decision summary, not a long component gallery.
- Every visible panel either changes an assumption or explains a decision.

### Phase 3: Make Diagnostics Editable

- [x] `RequestPatternAnalyzer`: allow editable request-type distribution.
- [x] `CostAttributionByFeature`: allow editable feature shares and validate totals.
- [x] `CostPerBusinessMetric`: require user-entered denominator.
- [x] `ModelComparisonMatrix`: rank by cost/request, total monthly cost, context, cache, batch.
- [x] `CostOptimizationRoadmap`: rank real levers by estimated monthly savings.

Exit criteria:

- No static fake analysis.
- No panel invents historical or operational data.
- All derived costs still pass through `calculator.ts`.

### Phase 4: Guardrails And Export

- [x] Add compact budget/quota guardrails.
- [x] Add optional manual savings tracker if projected savings exist.
- [x] Update `SummaryCard` to use workload assumptions and selected-model provenance.
- [x] Keep same-model copy non-misleading.
- [x] Keep `lang="en"` on summary text.

Exit criteria:

- Exported summary states assumptions, model sources, verified dates, and migration delta.
- Same-model scenario says delta is `$0`.

## Explicit Non-Goals For This Pass

- No prompt-paste tokenizer.
- No live pricing fetch.
- No regional pricing unless catalog supports it.
- No SLA/latency cost panel unless backed by explicit user inputs.
- No benchmark claims unless sourced.
- No anomaly detection without time-series usage data.
- No executive ROI/TCO-first page.

## Tests Required

### Unit

- `deriveMonthlyWorkload`
  - requests/day basis
  - active-users basis
  - retry rate
  - invalid/negative inputs
- `calculateCost`
  - cost/request
  - cache savings
  - batch savings
  - NaN guards
- `calculateMigrationDelta`
  - cheaper candidate
  - more expensive candidate
  - same-model zero delta

### Component

Every changed component must include a `rerender` or user-event state-change test.

Required coverage:

- mode switch updates visible input surface
- preset application updates workload mode
- model provenance renders source/date/support
- decision strip updates when workload changes
- migration breakdown updates when cache/batch changes
- scenario column edits affect only that column
- summary uses static pricing provenance, not current month

### Final Verification

Run:

```bash
npm run test:run
npm run build
```

Expected:

- all tests pass
- TypeScript build passes
- any bundle-size warning is documented but not treated as failure

## Final Product Shape

The finished app should feel like a developer cost workbench:

- dense but readable
- one-page
- calculator first
- explanation second
- governance third
- export last

Anything that looks like a generic executive dashboard should either be collapsed, merged, or removed from the default flow.
