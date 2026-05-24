# AI SaaS Cost-Quality-Margin Decision Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the simulator from a pure cost calculator into a workspace that turns LLM operational logs into customer-, feature-, model-, plan-, and session-level cost, then connects that cost to gross margin, pricing decisions, and cost-quality-latency-risk tradeoffs.

**Architecture:** Keep raw token pricing and monthly cost math inside `src/lib/calculator.ts`. Add a Core Engine that turns usage logs into attributed cost by customer, feature, model, plan, session, and agent run. Surface those results through a six-step UX: usage import, operational signal summary, cost attribution, margin analysis, pricing simulation, and report output.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS 3, Recharts, html-to-image, Vitest 4, Testing Library.

---

## Product Shape

## 2026-05-07 Research Alignment

The product positioning is no longer "LLM 비용 계산기." The stronger direction is:

> LLM 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스.

The core product question is:

> 우리 AI 기능은 고객별·기능별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가?

The product model is:

> Group A는 entry point, Core Engine은 비용 귀속 레이어, Group B는 paid value다.

- Group A: entry point. Frequent developer/operations complaints such as token spike, cache miss, quota, agent loop, and provider delay explain adoption and onboarding.
- Core Engine: cost attribution layer. It maps usage to customer, feature, model, plan, session, and agent run cost.
- Group B: paid value. Customer profitability, plan gross margin, heavy-user loss, usage-based pricing, credit pricing, and CEO/CFO/Board reporting explain why a company pays.

The new first-run path should read like an AI SaaS unit economics workflow:

1. Bring in LLM usage.
2. Summarize operational signals such as token spikes, cache miss candidates, and agent loop cost.
3. Attribute cost by customer, feature, model, plan, session, and agent run.
4. Understand raw cost, effective cost, and plan/customer gross margin.
5. Simulate pricing choices: usage-based, credit, hybrid, cap, and overage.
6. Export a PM, developer, CEO/CFO, or Finance report.

The headline savings number remains the strongest demo artifact: examples like `$287/mo -> $10/mo` and `96.3% savings` should stay visually prominent. The change is that every savings claim gets an adjacent quality/risk assessment so the UI does not imply that cheaper is automatically better.

## MVP Scope

Build these surfaces first:

- Usage input and presets: RAG chatbot, document summary, code generation, customer inquiry classification, report generation.
- Current model vs candidate model comparison: monthly cost, annual cost, cost/request, customer cost, input/output breakdown.
- Attribution and business unit economics: customer, feature, model, plan, session, and agent-run cost; cost per customer/report/ticket/job; selling price; gross margin; heavy-user loss.
- Pricing scenarios: seat, usage-based, credit, hybrid, cap, and overage assumptions where the user provides the denominator, selling price, and plan assumptions.
- Savings simulation: model switch, prompt caching, batch processing, output token cap, feature-level routing.
- Report generation: PM summary, developer breakdown, CEO savings summary.

Explicitly defer live eval harness integration, real benchmark ingestion, price auto-fetch, anomaly detection, and budget time-series alerts. The MVP should expose assumptions clearly rather than pretend to know live production truth.

## File Structure

- Modify: `src/data/models.ts`
  - Keep static catalog, source URL, and verified date.
  - Do not add unsourced benchmark claims to model rows.
- Create: `src/data/workloadPresets.ts`
  - Owns the five use-case presets and default feature mix.
- Create: `src/data/qualityProfiles.ts`
  - Owns editable default assumptions for quality score, latency score, risk score, retry rate, review rate, CS escalation rate, and tool-call reliability by use case/model tier.
- Modify: `src/lib/workload.ts`
  - Add feature-level mix derivation and keep monthly request/token derivation deterministic.
- Modify: `src/lib/calculator.ts`
  - Preserve raw cost calculation as the only path for token costs.
  - Add optional effective-cost helpers only if they call `calculateCost` internally.
- Create: `src/lib/decisionMetrics.ts`
  - Computes quality-adjusted cost, retry cost, review cost, CS cost, latency/risk labels, and decision verdicts.
- Create: `src/lib/savingsLevers.ts`
  - Ranks model switch, caching, batch, output cap, and feature routing using calculator-derived deltas plus condition text.
- Modify: `src/lib/format.ts`
  - Reuse existing formatters; add only missing score/label helpers if needed.
- Modify: `src/App.tsx`
  - Reorder the page into the five-step UX and add the new state fields.
- Create: `src/components/UsageSetup/index.tsx`
  - First section: presets, monthly requests, average input/output tokens, feature mix, cacheable share, batchable share.
- Create: `src/components/CurrentCostPanel/index.tsx`
  - Second section: current monthly/annual/request cost and input/output/cached breakdown.
- Create: `src/components/AlternativeComparison/index.tsx`
  - Third section: current vs candidate cost plus quality/risk/latency/context/tool-call comparison.
- Create: `src/components/SavingsLeverTable/index.tsx`
  - Fourth section: strategy, cost effect, risk, conditions, recommended use case.
- Modify: `src/components/SummaryCard/index.tsx`
  - Fifth section: role-specific report copy and source/provenance notes.
- Keep and adapt: `src/components/BudgetGuardrails/index.tsx`
  - Move below the core flow as operational guardrails.

## Data Model

Add a decision layer that is explicit about being assumption-based:

```ts
export type UseCasePresetId =
  | 'rag-chatbot'
  | 'document-summary'
  | 'code-generation'
  | 'customer-inquiry-classification'
  | 'report-generation'

export interface FeatureMixItem {
  id: string
  name: string
  requestShare: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheableShare: number
  batchableShare: number
  qualityFloor: number
}

export interface QualityAssumptions {
  qualityScore: number
  latencyScore: number
  riskScore: number
  toolCallReliabilityScore: number
  retryRate: number
  humanReviewRate: number
  csEscalationRate: number
  reviewCostPerRequestUsd: number
  csCostPerEscalationUsd: number
}
```

Score convention:

- `100` means strongest or lowest concern depending on label wording.
- Show scores as directional assumptions, not benchmark facts.
- NaN and invalid values clamp through shared finite guards.

## Task 1: Decision Metrics Library

**Files:**
- Create: `src/lib/decisionMetrics.ts`
- Create: `src/lib/decisionMetrics.test.ts`

- [ ] **Step 1: Write failing tests for effective cost**

Cover these cases:

- Higher retry rate increases effective monthly cost.
- Human review and CS escalation costs are included.
- Quality/risk/latency scores are clamped to `0..100`.
- NaN inputs render as safe zero assumptions.
- The helper calls `calculateCost` rather than duplicating token price math.

- [ ] **Step 2: Implement `calculateDecisionMetrics`**

Expose:

- `rawMonthlyCost`
- `effectiveMonthlyCost`
- `retryCost`
- `humanReviewCost`
- `csEscalationCost`
- `costPerSuccessfulRequest`
- `qualityLabel`
- `latencyLabel`
- `riskLabel`
- `verdict`

- [ ] **Step 3: Run focused tests**

Run: `npm run test:run -- src/lib/decisionMetrics.test.ts`

Expected: all decision metric tests pass.

## Task 2: Workload Presets And Feature Mix

**Files:**
- Create: `src/data/workloadPresets.ts`
- Create: `src/data/workloadPresets.test.ts`
- Modify: `src/lib/workload.ts`
- Modify: `src/lib/workload.test.ts`

- [ ] **Step 1: Add five presets**

Presets:

- RAG chatbot
- Document summary
- Code generation
- Customer inquiry classification
- Report generation

Each preset must include monthly request defaults, average input/output tokens, feature mix, cacheable share, batchable share, and default quality floor.

- [ ] **Step 2: Derive monthly usage from feature mix**

Add deterministic helpers that convert feature shares into monthly input tokens, output tokens, cacheable tokens, and batchable requests.

- [ ] **Step 3: Verify share math**

Run: `npm run test:run -- src/data/workloadPresets.test.ts src/lib/workload.test.ts`

Expected: feature shares sum safely and derived token totals update when a preset changes.

## Task 3: Savings Lever Ranking

**Files:**
- Create: `src/lib/savingsLevers.ts`
- Create: `src/lib/savingsLevers.test.ts`

- [ ] **Step 1: Write failing tests for lever ranking**

Cover:

- Model switch can rank first when candidate cost delta is largest.
- Prompt caching requires cacheable share above zero.
- Batch processing warns about lower real-time suitability.
- Output token cap warns about possible answer quality loss.
- Feature routing includes implementation complexity.

- [ ] **Step 2: Implement the five fixed MVP levers**

Rows:

| Strategy | Risk | Recommended use |
|---|---|---|
| Model switch | Quality degradation possible | Classification, summary, simple extraction |
| Prompt caching | Requires repeatable prompt patterns | RAG system prompts, fixed policy blocks |
| Batch processing | Lower real-time responsiveness | Nightly analysis, bulk reports |
| Output token cap | Answer quality can degrade | Internal summaries, log analysis |
| Feature-level routing | Higher implementation complexity | Operational AI apps with mixed features |

- [ ] **Step 3: Verify no fake certainty**

Tests should assert that every lever has `conditionText` and `riskText`.

Run: `npm run test:run -- src/lib/savingsLevers.test.ts`

## Task 4: Five-Step UX Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/UsageSetup/index.tsx`
- Create: `src/components/CurrentCostPanel/index.tsx`
- Create: `src/components/AlternativeComparison/index.tsx`
- Create: `src/components/SavingsLeverTable/index.tsx`
- Create tests beside each new component.

- [ ] **Step 1: Reorder the screen**

Order:

1. Usage setup
2. Current cost
3. Alternative comparison
4. Savings lever recommendation
5. Report output

Keep Budget Guardrails below the core flow.

- [ ] **Step 2: Keep savings prominent but paired**

Alternative comparison must show:

- monthly delta
- annual delta
- percentage savings
- quality score
- latency score
- risk score
- context window difference
- tool-call reliability assumption

- [ ] **Step 3: Verify state updates**

Component tests must use `rerender` or user events to prove values update when model, preset, cache rate, batch rate, or output cap changes.

Run: `npm run test:run -- src/components/UsageSetup src/components/CurrentCostPanel src/components/AlternativeComparison src/components/SavingsLeverTable`

## Task 5: Report Output

**Files:**
- Modify: `src/components/SummaryCard/index.tsx`
- Modify: `src/components/SummaryCard/SummaryCard.test.tsx`

- [ ] **Step 1: Add role-specific report modes**

Modes:

- PM: trade-off summary and rollout recommendation.
- Developer: assumptions, breakdown, and lever conditions.
- CEO: monthly/annual savings, confidence/risk note, and budget impact.

- [ ] **Step 2: Preserve translation protection**

Keep:

- `lang="en"` around English summary text.
- `translate="no"` around model names, brand names, and numeric report output where needed.

- [ ] **Step 3: Add provenance**

Report must include:

- model price source links
- last verified dates
- note that quality/risk values are user-editable assumptions

Run: `npm run test:run -- src/components/SummaryCard/SummaryCard.test.tsx`

## Task 6: Pricing Catalog Trust

**Files:**
- Modify: `src/data/models.ts`
- Modify: `src/data/models.test.ts`
- Optionally create: `src/data/models.json` only if the app already has a clean import path for JSON data.

- [ ] **Step 1: Keep pricing provenance visible**

Every model row must have:

- `sourceUrl`
- `sourceLabel`
- `lastVerifiedAt`
- `supportsCaching`
- `supportsBatch`

- [ ] **Step 2: Do not fetch live prices in MVP**

Use static data with visible provenance. Live fetch is deferred because pricing pages vary by provider and would add network, parsing, and trust complexity.

- [ ] **Step 3: Verify catalog completeness**

Run: `npm run test:run -- src/data/models.test.ts`

## Task 7: Final Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Vite build succeeds.

- [ ] **Step 3: Manual smoke**

Run: `npm run preview`

Check:

- RAG chatbot preset updates usage and cost.
- Candidate model switch keeps savings number visible.
- Quality/risk panel remains visible beside savings.
- Cache and batch levers show conditional text.
- PM/developer/CEO reports produce different summaries.

## Acceptance Criteria

- The first screen teaches the user to enter service usage before looking at models.
- Current cost and candidate cost use the same calculator path.
- Savings are never shown without a risk/quality companion signal.
- The lever table ranks all five MVP levers and explains when each applies.
- Reports are shareable without implying unsourced benchmark truth.
- Pricing provenance and verified dates remain visible.
- Full test suite and production build pass before commit.
