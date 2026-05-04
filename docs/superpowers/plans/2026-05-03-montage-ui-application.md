# Montage UI Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the local `design_system` Montage/Wanted visual language to the cost-quality decision workspace without breaking calculator correctness or the five-step UX.

**Architecture:** Use a token-first migration. Import/copy Montage tokens into app-owned styles, extend Tailwind with semantic colors/type/radii, then replace repeated ad hoc card/button/badge patterns with small local primitives. Do not install `@wanteddev/wds` in this pass because the app already uses Tailwind, network/package registry access may be restricted, and the local `design_system` mirror is sufficient for a controlled UI migration.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS 3, local Montage CSS tokens, Pretendard variable font, Vitest 4, Testing Library.

---

## Source Design System Readout

Use these assets from `design_system/`:

- `design_system/colors_and_type.css`: source of truth for colors, typography, spacing, radii, shadows, and Pretendard.
- `design_system/fonts/PretendardVariable.woff2`: local font asset.
- `design_system/ui_kits/wanted/Components.jsx`: reference for Button, Chip, Badge, IconButton, card hover, and sticky nav behavior.
- `design_system/preview/*.html`: visual reference for tokens and component states.

Rules to preserve:

- Primary blue is `#0066FF`; do not invent another primary.
- Use Pretendard everywhere.
- Use cool-tinted neutrals, not warm gray palettes.
- Keep UI quiet and work-focused; no gradients in chrome, no emoji in product copy.
- English copy uses sentence case. Korean copy should use polite endings when new Korean strings are added.
- Cards use translucent neutral borders, 12-16px radius, and no resting shadow. Interactive cards can lift on hover.

## Business Metric Calculation

### Current implementation

`src/components/CostPerBusinessMetric/index.tsx` asks the user for an explicit monthly denominator, then computes unit economics:

```ts
currentMonthlyCost = calculateCost(currentModelInput).monthlyCost
candidateMonthlyCost = calculateCost(candidateModelInput).monthlyCost

currentUnitCost = currentMonthlyCost / denominator
candidateUnitCost = candidateMonthlyCost / denominator
diff = currentUnitCost - candidateUnitCost
diffPct = currentUnitCost > 0 ? diff / currentUnitCost : 0
```

Example:

- Current monthly cost: `$225`
- Monthly support tickets: `1000`
- Cost per support ticket: `$225 / 1000 = $0.2250`

This is deliberately not invented. The denominator must be entered by the user: tickets, PRs, users, reports, jobs, transactions, or another monthly business count.

### Required upgrade

After the cost-quality layer, business metrics should show both:

```ts
rawCostPerMetric = rawMonthlyCost / monthlyDenominator
effectiveCostPerMetric = effectiveMonthlyCost / monthlyDenominator
qualityBurdenPerMetric = (retryCost + humanReviewCost + csEscalationCost) / monthlyDenominator
```

If the user later supplies success rate or accepted-output rate:

```ts
successfulDenominator = monthlyDenominator * successRate
costPerSuccessfulMetric = effectiveMonthlyCost / successfulDenominator
```

Do not infer denominator or success rate from model names. If the value is not user-entered or imported from usage data, render an empty state.

## Target Visual Direction

The app should feel like a Korean SaaS decision console, not a marketing landing page:

- Header: sticky, translucent white, 64px-ish height, cool neutral border, compact role/language controls.
- Page width: centered 1200px max column.
- Main flow: five numbered sections stay visible as the product spine.
- Primary action color: `var(--semantic-primary-normal)` / `#0066FF`.
- Metrics: use calm cards with strong numbers, compact captions, and semantic status badges.
- Risk/quality companion: use WDS-style badges/chips instead of colored border blocks.
- Tables: cool neutral divider lines, no heavy zebra striping, compact rows.

## File Structure

- Create: `src/styles/montage.css`
  - App-owned token import/copy layer. Use local Pretendard and semantic variables from `design_system/colors_and_type.css`.
- Modify: `src/index.css`
  - Import `./styles/montage.css` before Tailwind layers.
- Modify: `tailwind.config.js`
  - Extend colors, fontFamily, borderRadius, spacing, boxShadow from CSS variables.
- Create: `src/components/ui/Surface.tsx`
  - Shared section/card wrapper for WDS-like surfaces.
- Create: `src/components/ui/Button.tsx`
  - Local WDS-like button primitive using Tailwind and semantic CSS variables.
- Create: `src/components/ui/Badge.tsx`
  - Status and assumption badges for savings/risk/quality.
- Create: `src/components/ui/MetricTile.tsx`
  - Compact metric card for monthly cost, annual cost, risk score, business metric values.
- Create: `src/components/ui/Field.tsx`
  - Consistent label/input/select shell.
- Modify: `src/App.tsx`
  - Apply sticky Montage-style header and 1200px content column.
- Modify: `src/components/UsageSetup/index.tsx`
  - Replace ad hoc inputs/cards with `Surface`, `Field`, `Badge`, and `MetricTile`.
- Modify: `src/components/CurrentCostPanel/index.tsx`
  - Use `MetricTile` and source badge styling.
- Modify: `src/components/AlternativeComparison/index.tsx`
  - Keep savings prominent but use Montage badges for quality/risk/latency.
- Modify: `src/components/SavingsLeverTable/index.tsx`
  - Convert strategy/risk/condition cells into quiet WDS-style badges and table rhythm.
- Modify: `src/components/CostPerBusinessMetric/index.tsx`
  - Add raw vs effective business metric calculations and WDS-style empty state.

## Task 1: Token And Font Layer

**Files:**
- Create: `src/styles/montage.css`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Write token smoke test**

Create `src/styles/montage.test.ts` using a small exported token map if needed, or add a component test that asserts a rendered app root uses `font-family: Pretendard`.

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected before implementation: FAIL if the app does not expose Montage font/tokens.

- [ ] **Step 2: Add app-owned Montage CSS**

Copy only needed token sections from `design_system/colors_and_type.css` into `src/styles/montage.css`.

Required content:

```css
@font-face {
  font-family: "Pretendard";
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  src: url("/src/styles/fonts/PretendardVariable.woff2") format("woff2-variations");
}

:root {
  --semantic-primary-normal: #0066FF;
  --semantic-primary-strong: #005EEB;
  --semantic-primary-heavy: #0054D1;
  --semantic-label-normal: #171719;
  --semantic-label-neutral: rgba(46,47,51,0.88);
  --semantic-label-alternative: rgba(55,56,60,0.61);
  --semantic-background-normal-normal: #ffffff;
  --semantic-background-normal-alternative: #F7F7F8;
  --semantic-line-normal-neutral: rgba(112,115,124,0.16);
  --semantic-fill-normal: rgba(112,115,124,0.08);
  --semantic-status-positive: #00BF40;
  --semantic-status-cautionary: #FF9200;
  --semantic-status-negative: #FF4242;
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --radius-md: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --shadow-medium: 0px 4px 6px -2px rgba(23,23,23,0.07), 0px 10px 15px -3px rgba(23,23,23,0.07);
}
```

Copy `design_system/fonts/PretendardVariable.woff2` to `src/styles/fonts/PretendardVariable.woff2`.

- [ ] **Step 3: Wire Tailwind tokens**

Extend `tailwind.config.js`:

```js
theme: {
  extend: {
    fontFamily: {
      sans: ['Pretendard', 'system-ui', 'sans-serif'],
    },
    colors: {
      primary: 'var(--semantic-primary-normal)',
      surface: {
        normal: 'var(--semantic-background-normal-normal)',
        alternative: 'var(--semantic-background-normal-alternative)',
      },
      label: {
        normal: 'var(--semantic-label-normal)',
        neutral: 'var(--semantic-label-neutral)',
        alternative: 'var(--semantic-label-alternative)',
      },
      line: {
        neutral: 'var(--semantic-line-normal-neutral)',
      },
    },
    borderRadius: {
      wds: 'var(--radius-xl)',
      'wds-lg': 'var(--radius-2xl)',
    },
    boxShadow: {
      wds: 'var(--shadow-medium)',
    },
  },
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:run -- src/App.test.tsx
npm run build
```

Expected: tests and build pass.

## Task 2: Local WDS-Like Primitives

**Files:**
- Create: `src/components/ui/Surface.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/MetricTile.tsx`
- Create: `src/components/ui/Field.tsx`
- Create tests beside each component or one `src/components/ui/ui-primitives.test.tsx`.

- [ ] **Step 1: Write primitive tests**

Test:

- `Button` renders solid/outlined variants and preserves native `<button>`.
- `Badge` renders `positive`, `cautionary`, `negative`, `neutral`, and `primary` tones.
- `MetricTile` renders label/value/help without layout-specific math.
- `Field` associates label with input/select by `htmlFor`.
- `Surface` renders as `<section>` when given a heading.

- [ ] **Step 2: Implement primitives**

Use semantic variables and Tailwind classes. Keep APIs small:

```ts
type ButtonVariant = 'solid' | 'outlined' | 'ghost'
type BadgeTone = 'primary' | 'positive' | 'cautionary' | 'negative' | 'neutral'
```

- [ ] **Step 3: Verify**

Run:

```bash
npm run test:run -- src/components/ui
```

Expected: primitive tests pass.

## Task 3: Apply Design System To Five-Step Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/UsageSetup/index.tsx`
- Modify: `src/components/CurrentCostPanel/index.tsx`
- Modify: `src/components/AlternativeComparison/index.tsx`
- Modify: `src/components/SavingsLeverTable/index.tsx`
- Modify existing tests for these components.

- [ ] **Step 1: Header and page frame**

Change the root page frame to:

- `font-sans`
- `bg-surface-alternative`
- sticky white header with `backdrop-blur`
- centered `max-w-[1200px]`

Test that the page still shows:

- `1. Usage setup`
- `2. Current model cost`
- `3. Alternative comparison`
- `4. Savings lever recommendation`
- `Board-Ready Summary`

- [ ] **Step 2: Replace section shells**

Use `Surface` for all five primary sections. Preserve the numbering and explanatory copy.

- [ ] **Step 3: Replace metrics**

Use `MetricTile` for:

- monthly cost
- annual cost
- cost/request
- input cost
- output cost
- quality score
- latency score
- risk score
- tool-call reliability

- [ ] **Step 4: Replace badges/chips**

Use `Badge` for:

- savings percent
- model provenance
- quality/risk assumption labels
- lever risk levels
- cache/batch support

- [ ] **Step 5: Verify**

Run:

```bash
npm run test:run -- src/App.test.tsx src/components/UsageSetup src/components/CurrentCostPanel src/components/AlternativeComparison src/components/SavingsLeverTable
npm run build
```

Expected: tests and build pass.

## Task 4: Business Metric Upgrade

**Files:**
- Modify: `src/components/CostPerBusinessMetric/index.tsx`
- Modify: `src/components/CostPerBusinessMetric/CostPerBusinessMetric.test.tsx`
- Optionally create: `src/lib/businessMetrics.ts`
- Optionally create: `src/lib/businessMetrics.test.ts`

- [ ] **Step 1: Extract calculation**

Create `src/lib/businessMetrics.ts`:

```ts
export interface BusinessMetricInput {
  rawMonthlyCost: number
  effectiveMonthlyCost: number
  retryCost: number
  humanReviewCost: number
  csEscalationCost: number
  denominator: number
  successRate?: number
}

export function calculateBusinessMetric(input: BusinessMetricInput) {
  const denominator = Number.isFinite(input.denominator) && input.denominator > 0 ? input.denominator : 0
  const successRate = Number.isFinite(input.successRate ?? 1) ? Math.min(1, Math.max(0, input.successRate ?? 1)) : 1
  const successfulDenominator = denominator * successRate
  return {
    rawCostPerMetric: denominator > 0 ? input.rawMonthlyCost / denominator : 0,
    effectiveCostPerMetric: denominator > 0 ? input.effectiveMonthlyCost / denominator : 0,
    qualityBurdenPerMetric: denominator > 0
      ? (input.retryCost + input.humanReviewCost + input.csEscalationCost) / denominator
      : 0,
    costPerSuccessfulMetric: successfulDenominator > 0 ? input.effectiveMonthlyCost / successfulDenominator : 0,
  }
}
```

- [ ] **Step 2: Add failing tests**

Test:

- `$225 / 1000 = $0.225 raw cost per support ticket`.
- Effective monthly cost increases cost per metric when review/CS/retry burden is present.
- Invalid denominator returns zero values and does not render fake rows.
- Success rate affects `costPerSuccessfulMetric`.

- [ ] **Step 3: Render raw and effective columns**

Update the table columns:

- Metric
- Monthly denominator
- Current raw
- Candidate raw
- Candidate effective
- Quality burden
- Difference

Add a small note:

`Business metrics use your monthly denominator. Quality-adjusted values include retry, review, and CS burden assumptions.`

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:run -- src/lib/businessMetrics.test.ts src/components/CostPerBusinessMetric/CostPerBusinessMetric.test.tsx
```

Expected: tests pass.

## Task 5: Visual Smoke And Regression

**Files:**
- No required source changes unless smoke finds issues.

- [ ] **Step 1: Run full tests**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 3: Preview smoke**

```bash
npm run preview
```

Open:

```text
http://127.0.0.1:4173/token_simulator/
```

Check:

- Pretendard loads.
- Primary blue matches `#0066FF`.
- First viewport shows usage/current/alternative flow without looking like a marketing hero.
- Savings number remains visually strongest.
- Quality/risk indicators remain adjacent to savings.
- Business metric panel explains raw vs effective calculation.

## Acceptance Criteria

- The app uses Montage/Wanted tokens through app-owned CSS and Tailwind extensions.
- Primary UI surfaces no longer rely on scattered `gray-*`/`blue-*` ad hoc classes where semantic tokens exist.
- The five-step cost-quality UX remains intact.
- Savings stays visually prominent, with risk/quality context beside it.
- Business metrics are explicit denominator math, with no invented denominator.
- Quality-adjusted business metrics include retry, human review, and CS burden assumptions.
- `npm run test:run` and `npm run build` pass.
