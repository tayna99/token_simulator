# AI Team Ops P0 Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current SparkClaw P0 demo up to the two PRDs: `AI SaaS Cost & Margin Workspace v2.0` and `AI Team Operations Workspace v0.4`.

**Architecture:** Keep P0 client-only. Deterministic numbers stay in pure TypeScript tools; LangGraph.js orchestrates interpretation and approval, and never performs arithmetic. Risk Cards and benchmarks start as bundled JSON/TS corpus with deterministic tag search.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind 3, Vitest 4, `@langchain/langgraph`, localStorage, JSON export.

---

## PRD Gap Review

### P0 Must-Fix Gaps

1. `src/features/agent/lib/agentRuntime.ts` is not a LangGraph runtime yet.
   It accepts `apiKey`, but does not import `@langchain/langgraph`, does not define `StateGraph`, does not model Orchestrator / Margin Analyst / Pricing Strategy / Risk Auditor / CFO Reporter nodes, and does not stream graph events. Current behavior is a deterministic fallback array.

2. `src/features/agent/lib/riskCards.ts` has only 3 cards.
   PRD v0.4 requires a Risk Card catalog of 10+ cards with evidence metadata. It also requires each recommendation to receive risk review independently, ideally through Risk Auditor as a sub-agent/subgraph.

3. `PricingSimulatorWorkspace` renders only `flat`, `credit`, and `cap`.
   `src/features/pricing/lib/pricingScenario.ts` supports `flat | usage | credit | hybrid | cap | overage`, but `src/app/App.tsx` only creates three scenarios. PRD v2.0 requires flat, usage-based, credit bundle, overage, cap, hybrid, AI add-on, and tier upgrade comparison at least at the P0 scenario layer.

4. `AITeamConfiguration` is too thin for the architecture PRD.
   `src/features/team/lib/aiTeamConfiguration.ts` tracks `companyProfile`, `agents`, `usage`, `attribution`, and `decisionLog`, but lacks the PRD fields that make it the shared Wedge A+B object: prompt template, guardrails, expected volume as structured numbers, cost budget, performance history hook, and config snapshot reference.

5. Team Designer UI is a thin card list, not the PRD/mockup Team Designer.
   `src/app/App.tsx` renders no onboarding conversation, scenario selector, org chart, selected-agent detail panel, or benchmark row from `team-designer-mockup.html`. The current panel is acceptable as a stub, not as the P0 demo surface.

6. Report Output is partly split but still not the PRD report system.
   `SummaryCard` has 4 audience labels, but `AgentReportWorkspace` is a generic event list. PRD requires Developer breakdown, PM report, CEO/CFO 1-pager, and Board-ready summary grounded in tool refs and risk cards.

7. Decision Log is missing deletion and real export UI.
   `src/features/decision-log/lib/decisionLog.ts` supports serialization, load, and save, but `DecisionLogWorkspace` only shows entries. PRD test plan explicitly calls for save/delete/export.

8. Operational Signal Summary is absent.
   PRD v2.0 P0 asks for token spike candidates, cache miss/cacheable share, and top session/agent-run cost guidance. Current attribution tables expose top rows, but no operational summary object or UI.

9. Raw vs Effective Cost is absent.
   PRD v2.0 requires `effectiveCost = rawCost + retryCost + humanReviewCost + csEscalationCost` as assumption-based what-if. Current margin uses raw LLM cost only.

10. Sample data is one fixed CSV, not the 5-scenario sample generator from v0.4.
    The SparkClaw sample is useful, but v0.4 P0 asks for five synthetic scenarios and benchmark corpus seed statistics.

### What Is Already Sound

- CSV contract extension and required-column validation are in place in `src/features/usage/lib/usageImport.ts`.
- Multi-axis attribution is in place in `src/features/usage/lib/attribution.ts`.
- Plan/customer margin and heavy-user detection are in place in `src/features/unit-economics/lib/margin.ts`.
- The pricing engine supports the six named policy types in `src/features/pricing/lib/pricingScenario.ts`.
- The current implementation respects the client-only P0 constraint and formatter-only display rule.

---

## P1 / P2 Roadmap Review

P0 is the SparkClaw demo: client-only, sample/import driven, BYO-key, localStorage/export. P1 and P2 are not "more dashboard panels"; they change the product from a demo workspace into a repeatable SaaS workflow.

### P1 Goal: Real Logs + Repeatable SaaS Workflow

P1 should start only after P0 proves that users want to analyze their own anonymized usage logs. The key shift is from static/local demo to a thin backend that can safely hold keys, persist decisions, run agents, and create recurring reports.

P1 implementation units:

1. **Thin Serverless Backend**
   - Add `/api/agent` as the server-side implementation behind the existing `runAgent(input) -> events` interface.
   - Store provider keys server-side or accept session-scoped encrypted keys.
   - Keep deterministic L2 functions shared from TypeScript packages; do not fork calculations.

2. **Persistent Decision Log and Config Store**
   - Move Decision Log, `AITeamConfiguration`, and report history from localStorage to KV/DB.
   - Preserve JSON export/import for trust and portability.
   - Add `config_snapshot_ref` and `tool_snapshot_ref` so every report can be traced back to the exact assumptions.

3. **Actual Usage CSV and Observability Export Support**
   - Add import profiles for OpenAI/Anthropic usage exports and common observability CSVs.
   - Add anonymization guidance and PII-safe preview before analysis.
   - Add invoice reconciliation fields: provider invoice total vs internal row total.

4. **Recurring Weekly/Monthly Reports**
   - Add scheduled report generation.
   - Store report runs with period, inputs, deltas, adopted decisions, and unresolved risks.
   - Add CEO/CFO digest output and downloadable report history.

5. **Plan vs Actual**
   - Compare previous pricing/model-routing decisions against new usage.
   - Show expected margin vs actual margin, expected cost reduction vs actual cost reduction.
   - Mark decisions as `validated`, `missed`, or `needs-review`.

6. **Server RAG Upgrade**
   - Move benchmark and Risk Card retrieval behind server tools once corpus grows.
   - Add evidence metadata from `evidence_board.csv`.
   - Keep deterministic "no evidence, no claim" behavior.

7. **P1 Verification**
   - Unit: API contract, persistence schema, report-run diffing, import profiles.
   - Integration: upload real/anonymized CSV -> agent report -> saved decision -> next-period comparison.
   - Browser: login/session -> upload -> recurring report preview -> export.

### P2 Goal: Integrations + Multi-Tenant Product

P2 should begin only after P1 shows repeated use: users ask for next-month reporting, integrations, shared access, or billing/observability connection. P2 is the expansion from "workspace" to "operating layer."

P2 implementation units:

1. **SDK / Gateway / Proxy Ingestion**
   - Add optional automatic event collection.
   - Support trace/session/agent-run ids at source.
   - Preserve CSV import as the fallback path.

2. **Helicone / Langfuse / LangSmith / Portkey Connectors**
   - Import observability exports directly.
   - Map external trace fields into the internal `UsageImportRow` contract.
   - Keep connector mapping deterministic and testable.

3. **Billing Integrations**
   - Add Stripe/Metronome/OpenMeter mapping for customer, plan, subscription, credit, and overage data.
   - Compare billable usage vs LLM cost attribution.
   - Produce "pricing change impact" reports with real subscription data.

4. **Multi-Tenant Workspace**
   - Add organizations, projects, roles, and access control.
   - Separate developer, PM, finance, and board-view permissions.
   - Add audit log for pricing decisions and report exports.

5. **Board Deck / Finance Package Export**
   - Promote Board summary into a recurring package.
   - Add PPTX/PDF export from structured report artifacts.
   - Include margin waterfall, heavy-user concentration, pricing scenario comparison, and decision log appendix.

6. **Continuous Customer Profitability Monitoring**
   - Track customer/plan margin over time.
   - Alert on margin degradation, agent loop runaway, and plan-level loss.
   - Turn one-off analysis into monthly operating review.

7. **Advanced Optimization**
   - Add model routing simulation, cache policy simulation, output cap simulation, and tier migration simulation.
   - Require eval/risk cards before recommending quality-sensitive routing.
   - Keep all scenario numbers from deterministic tools only.

8. **P2 Verification**
   - Contract tests for every connector.
   - Multi-tenant authorization tests.
   - End-to-end integration tests with seeded usage + seeded billing.
   - Browser smoke for dashboard, report package, connector import, decision audit trail.

### Phase Boundary Rules

- Do not start P1 backend work until P0 has a convincing real-log import path and at least one user asks to analyze their own CSV.
- Do not start P2 connectors until P1 report history and Plan vs Actual prove repeat usage.
- Do not add SDK/gateway ingestion before CSV/import workflow is validated; otherwise the product becomes observability infrastructure too early.
- Do not let P1/P2 weaken the core invariant: deterministic tools produce all numbers; agents explain, compare, and draft.

---

## File Structure

### Agent Graph and Tool Contract

- Create: `src/features/agent/lib/toolContract.ts`
  - Owns typed deterministic tool payloads and tool result references.
  - Exposes `buildAgentToolSnapshot(input)`.
- Create: `src/features/agent/lib/agentGraph.ts`
  - Owns LangGraph.js `StateGraph` topology.
  - Nodes: `orchestrator`, `marginAnalyst`, `pricingStrategy`, `riskAuditor`, `cfoReporter`.
- Modify: `src/features/agent/lib/agentRuntime.ts`
  - Keeps public `runAgent(input)` API.
  - Delegates to LangGraph graph when `apiKey` is present.
  - Uses deterministic fallback only when no key/runtime is available.
- Test: `src/features/agent/lib/toolContract.test.ts`
- Test: `src/features/agent/lib/agentGraph.test.ts`
- Test: `src/features/agent/lib/agentRuntime.test.ts`

### RAG Corpus and Risk Cards

- Create: `src/features/agent/data/riskCards.ts`
  - Static catalog of at least 10 cards.
- Create: `src/features/agent/data/benchmarks.ts`
  - Bundled benchmark seed rows with evidence metadata.
- Modify: `src/features/agent/lib/riskCards.ts`
  - Replace inline 3-card array with corpus import.
  - Add severity/tag/evidence deterministic matching.
- Test: `src/features/agent/lib/riskCards.test.ts`

### Product State and Team Designer

- Modify: `src/features/team/lib/aiTeamConfiguration.ts`
  - Add prompt template, guardrails, structured volume, cost budget, config snapshot ref, and performance history seed.
- Create: `src/features/team/components/TeamDesignerPanel/index.tsx`
  - Extract current inline panel from `App.tsx`.
  - Add mockup-aligned org chart, selected-agent detail, and benchmark row.
- Test: `src/features/team/lib/aiTeamConfiguration.test.ts`
- Test: `src/features/team/components/TeamDesignerPanel/TeamDesignerPanel.test.tsx`

### Pricing and Unit Economics

- Modify: `src/features/pricing/lib/pricingScenario.ts`
  - Add `ai_add_on` and `tier_upgrade` if P0 UI exposes them as explicit scenario cards.
  - Keep existing six policy values stable unless tests and UI update together.
- Modify: `src/app/App.tsx`
  - Render all current supported policies: `flat`, `usage`, `credit`, `hybrid`, `cap`, `overage`.
- Create: `src/features/unit-economics/lib/effectiveCost.ts`
  - Owns raw vs effective cost assumptions.
- Test: `src/features/unit-economics/lib/effectiveCost.test.ts`
- Test: `src/features/pricing/lib/pricingScenario.test.ts`

### Operational Signals

- Create: `src/features/usage/lib/operationalSignals.ts`
  - Computes top session cost, top agent-run cost, high output-token candidates, failed/retry status share, and missing-dimension summary.
- Create: `src/features/usage/components/OperationalSignalSummary/index.tsx`
- Test: `src/features/usage/lib/operationalSignals.test.ts`
- Test: `src/features/usage/components/OperationalSignalSummary/OperationalSignalSummary.test.tsx`

### Reports and Decision Log

- Create: `src/features/report/lib/reportArtifacts.ts`
  - Produces structured Developer / PM / CEO_CFO / Board report payloads from deterministic tool snapshot and agent interpretations.
- Modify: `src/features/report/components/SummaryCard/index.tsx`
  - Read structured report payloads rather than audience labels only.
- Modify: `src/features/decision-log/lib/decisionLog.ts`
  - Add `deleteDecision`, `exportDecisionLogFileName`, and schema validation on load.
- Modify: `src/app/App.tsx`
  - Wire delete/export buttons into Decision Log section.
- Test: `src/features/report/lib/reportArtifacts.test.ts`
- Test: `src/features/decision-log/lib/decisionLog.test.ts`
- Test: `src/app/App.test.tsx`

---

## Task 1: Lock Agent Tool Contract

**Files:**
- Create: `src/features/agent/lib/toolContract.ts`
- Test: `src/features/agent/lib/toolContract.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { buildAgentToolSnapshot } from './toolContract'

describe('buildAgentToolSnapshot', () => {
  it('stores only deterministic fields with stable refs', () => {
    const snapshot = buildAgentToolSnapshot({
      monthlyAiCogs: 4820,
      grossMarginPct: 0.68,
      topFeature: 'report_generation',
      lossCustomerCount: 13,
    })

    expect(snapshot.refs).toEqual([
      'tool:monthlyAiCogs',
      'tool:grossMarginPct',
      'tool:topFeature',
      'tool:lossCustomerCount',
    ])
    expect(snapshot.values['tool:monthlyAiCogs']).toBe(4820)
  })

  it('drops non-finite numbers instead of exposing agent math', () => {
    const snapshot = buildAgentToolSnapshot({
      monthlyAiCogs: Number.NaN,
      grossMarginPct: 0.41,
    })

    expect(snapshot.refs).toEqual(['tool:grossMarginPct'])
    expect(snapshot.values['tool:monthlyAiCogs']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run focused failing test**

Run: `npm run test:run -- toolContract`

Expected: FAIL because `toolContract.ts` does not exist.

- [ ] **Step 3: Implement the contract**

```ts
export type ToolValue = number | string | boolean | string[]

export interface AgentToolSnapshotInput {
  monthlyAiCogs?: number
  grossMarginPct?: number
  topFeature?: string
  lossCustomerCount?: number
  riskCardIds?: string[]
}

export interface AgentToolSnapshot {
  refs: string[]
  values: Record<string, ToolValue>
}

function keepValue(value: unknown): value is ToolValue {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.length > 0
  if (typeof value === 'boolean') return true
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function buildAgentToolSnapshot(input: AgentToolSnapshotInput): AgentToolSnapshot {
  return Object.entries(input).reduce<AgentToolSnapshot>((snapshot, [key, value]) => {
    if (!keepValue(value)) return snapshot
    const ref = `tool:${key}`
    snapshot.refs.push(ref)
    snapshot.values[ref] = value
    return snapshot
  }, { refs: [], values: {} })
}
```

- [ ] **Step 4: Verify**

Run: `npm run test:run -- toolContract`

Expected: PASS.

---

## Task 2: Replace Fallback-Only Runtime With LangGraph.js Skeleton

**Files:**
- Create: `src/features/agent/lib/agentGraph.ts`
- Modify: `src/features/agent/lib/agentRuntime.ts`
- Test: `src/features/agent/lib/agentGraph.test.ts`
- Test: `src/features/agent/lib/agentRuntime.test.ts`

- [ ] **Step 1: Write graph tests**

```ts
import { createAgentGraph } from './agentGraph'

describe('createAgentGraph', () => {
  it('runs deterministic P0 nodes in PRD order', async () => {
    const graph = createAgentGraph()
    const result = await graph.invoke({
      events: [],
      toolRefs: ['tool:monthlyAiCogs', 'tool:grossMarginPct'],
      riskCardIds: ['risk-credit-confusion'],
    })

    expect(result.events.map(event => event.type)).toEqual([
      'tool_snapshot',
      'analysis',
      'pricing_strategy',
      'risk_audit',
      'report_draft',
    ])
  })
})
```

- [ ] **Step 2: Run focused failing test**

Run: `npm run test:run -- agentGraph`

Expected: FAIL because `agentGraph.ts` does not exist.

- [ ] **Step 3: Implement `StateGraph` topology**

Use `@langchain/langgraph` in `agentGraph.ts`. The graph state must contain:

```ts
export interface AgentGraphState {
  events: AgentEvent[]
  toolRefs: string[]
  riskCardIds: string[]
}
```

Node responsibilities:
- `tool_snapshot`: append event proving deterministic refs were received.
- `analysis`: append Margin Analyst interpretation with no new numeric fields.
- `pricing_strategy`: append Pricing Strategy explanation that refers to tool refs only.
- `risk_audit`: append risk card ids.
- `report_draft`: append report event grounded in refs and risk cards.

- [ ] **Step 4: Modify `runAgent`**

`runAgent` should:
- build a tool snapshot with `buildAgentToolSnapshot`
- call `createAgentGraph().invoke(...)`
- return `result.events`
- keep no-key behavior graph-backed, not hand-written fallback

- [ ] **Step 5: Verify**

Run:

```bash
npm run test:run -- agentGraph agentRuntime
npm run test:run
```

Expected: focused tests pass, then full suite passes.

---

## Task 3: Expand Risk Card Corpus to PRD Minimum

**Files:**
- Create: `src/features/agent/data/riskCards.ts`
- Modify: `src/features/agent/lib/riskCards.ts`
- Test: `src/features/agent/lib/riskCards.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { RISK_CARDS, retrieveRiskCards } from './riskCards'

describe('Risk Card corpus', () => {
  it('contains at least ten grounded cards for P0', () => {
    expect(RISK_CARDS).toHaveLength(10)
    expect(RISK_CARDS.every(card => card.evidenceId.startsWith('GR-'))).toBe(true)
  })

  it('matches pricing and model-routing risks deterministically', () => {
    const cards = retrieveRiskCards(['credit', 'overage', 'model-switch'])
    expect(cards.map(card => card.id)).toEqual([...cards.map(card => card.id)].sort())
    expect(cards.some(card => card.tags.includes('credit'))).toBe(true)
    expect(cards.some(card => card.tags.includes('model-switch'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run focused failing test**

Run: `npm run test:run -- riskCards`

Expected: FAIL because current corpus has only 3 cards.

- [ ] **Step 3: Add 10-card corpus**

Include these card ids:
- `risk-credit-confusion`
- `risk-cap-perceived-value`
- `risk-overage-bill-shock`
- `risk-hybrid-complexity`
- `risk-usage-pricing-forecast`
- `risk-model-routing-quality`
- `risk-cache-staleness`
- `risk-output-cap-quality`
- `risk-agent-loop-runaway`
- `risk-human-review-bottleneck`

- [ ] **Step 4: Verify**

Run: `npm run test:run -- riskCards`

Expected: PASS.

---

## Task 4: Render All Pricing Policies in P0 UI

**Files:**
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`
- Test: `src/features/pricing/lib/pricingScenario.test.ts`

- [ ] **Step 1: Write failing component test**

```tsx
it('renders all P0 pricing policies after sample import', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /Load SparkClaw sample/i }))

  expect(screen.getByText('flat')).toBeInTheDocument()
  expect(screen.getByText('usage')).toBeInTheDocument()
  expect(screen.getByText('credit')).toBeInTheDocument()
  expect(screen.getByText('hybrid')).toBeInTheDocument()
  expect(screen.getByText('cap')).toBeInTheDocument()
  expect(screen.getByText('overage')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run failing test**

Run: `npm run test:run -- App`

Expected: FAIL because UI only renders `flat`, `credit`, and `cap`.

- [ ] **Step 3: Update scenario list**

In `App.tsx`, build six scenarios from the same imported rows:
- `flat`: current customer revenue
- `usage`: `usagePricePerRequest`
- `credit`: `baseSubscriptionUsd`, `includedRequests`, `overagePricePerRequest`
- `hybrid`: base plus usage price
- `cap`: cost cap
- `overage`: current revenue plus included/overage

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:run -- pricingScenario App
npm run test:run
```

Expected: all pass.

---

## Task 5: Add Operational Signal Summary

**Files:**
- Create: `src/features/usage/lib/operationalSignals.ts`
- Create: `src/features/usage/components/OperationalSignalSummary/index.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/features/usage/lib/operationalSignals.test.ts`
- Test: `src/features/usage/components/OperationalSignalSummary/OperationalSignalSummary.test.tsx`

- [ ] **Step 1: Write failing lib tests**

```ts
import { summarizeOperationalSignals } from './operationalSignals'

describe('summarizeOperationalSignals', () => {
  it('finds top session and agent-run costs', () => {
    const result = summarizeOperationalSignals(rowsWithSessionAndAgentRun)

    expect(result.topSession?.id).toBe('session-heavy')
    expect(result.topAgentRun?.id).toBe('agent-run-loop')
  })

  it('reports failed status share without throwing on missing status', () => {
    const result = summarizeOperationalSignals(rowsWithMixedStatus)

    expect(result.failedShare).toBeGreaterThan(0)
    expect(result.missingStatusCount).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Implement signals**

Return:

```ts
{
  topSession: { id, costUsd, requestCount } | null,
  topAgentRun: { id, costUsd, requestCount } | null,
  highOutputTokenRows: UsageImportRow[],
  failedShare: number,
  missingStatusCount: number,
}
```

- [ ] **Step 3: Wire UI**

Place the component between Import and Cost Attribution so PRD screen 1 produces operational guidance before attribution.

- [ ] **Step 4: Verify**

Run: `npm run test:run -- operationalSignals App`

Expected: PASS.

---

## Task 6: Add Raw vs Effective Cost Engine

**Files:**
- Create: `src/features/unit-economics/lib/effectiveCost.ts`
- Modify: `src/features/unit-economics/lib/margin.ts`
- Test: `src/features/unit-economics/lib/effectiveCost.test.ts`
- Test: `src/features/unit-economics/lib/margin.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { calculateEffectiveCost } from './effectiveCost'

describe('calculateEffectiveCost', () => {
  it('adds retry, human review, and CS escalation assumptions', () => {
    expect(calculateEffectiveCost({
      rawCostUsd: 100,
      retryCostUsd: 10,
      humanReviewCostUsd: 25,
      csEscalationCostUsd: 5,
    })).toBe(140)
  })

  it('guards NaN and negative assumptions', () => {
    expect(calculateEffectiveCost({
      rawCostUsd: Number.NaN,
      retryCostUsd: -10,
      humanReviewCostUsd: 5,
      csEscalationCostUsd: 1,
    })).toBe(6)
  })
})
```

- [ ] **Step 2: Implement**

Use a `finiteNonNegative` helper and return only a number. No formatting in this lib.

- [ ] **Step 3: Extend margin rows**

Add optional effective cost fields:
- `effectiveCostUsd`
- `effectiveGrossMarginUsd`
- `effectiveGrossMarginPct`

- [ ] **Step 4: Verify**

Run: `npm run test:run -- effectiveCost margin`

Expected: PASS.

---

## Task 7: Upgrade Team Designer Toward Mockup

**Files:**
- Modify: `src/features/team/lib/aiTeamConfiguration.ts`
- Create: `src/features/team/components/TeamDesignerPanel/index.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/features/team/components/TeamDesignerPanel/TeamDesignerPanel.test.tsx`

- [ ] **Step 1: Write failing UI tests**

```tsx
it('renders org chart, selected agent details, review gate, and benchmark', async () => {
  render(<TeamDesignerPanel config={demoConfig} />)

  expect(screen.getByRole('heading', { name: /Team Designer/i })).toBeInTheDocument()
  expect(screen.getByText(/team org chart/i)).toBeInTheDocument()
  expect(screen.getByText(/selected agent/i)).toBeInTheDocument()
  expect(screen.getByText(/review gate/i)).toBeInTheDocument()
  expect(screen.getByText(/benchmark/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Extract and expand component**

Implement:
- company profile panel
- org chart area using CSS layout, not SVG-heavy generated art
- selectable agent cards
- selected-agent detail panel
- benchmark row from bundled corpus

- [ ] **Step 3: Verify**

Run: `npm run test:run -- TeamDesignerPanel App`

Expected: PASS.

---

## Task 8: Finish Decision Log Save/Delete/Export

**Files:**
- Modify: `src/features/decision-log/lib/decisionLog.ts`
- Modify: `src/app/App.tsx`
- Test: `src/features/decision-log/lib/decisionLog.test.ts`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing tests**

```ts
import { deleteDecision, exportDecisionLogFileName } from './decisionLog'

describe('Decision Log utilities', () => {
  it('deletes a decision by id', () => {
    expect(deleteDecision([{ id: 'a' } as any, { id: 'b' } as any], 'a').map(d => d.id)).toEqual(['b'])
  })

  it('uses a stable export filename prefix', () => {
    expect(exportDecisionLogFileName('2026-05-22T00:00:00.000Z')).toBe('ai-team-ops-decision-log-2026-05-22.json')
  })
})
```

- [ ] **Step 2: Implement library helpers**

Add:
- `deleteDecision(decisions, id)`
- `exportDecisionLogFileName(nowIso)`
- schema guard in `loadDecisionLog` that keeps only decisions with `id`, `what`, `why`, `status`, `createdAt`

- [ ] **Step 3: Wire UI**

Add buttons:
- `Export JSON`
- one delete button per decision

- [ ] **Step 4: Verify**

Run: `npm run test:run -- decisionLog App`

Expected: PASS.

---

## Task 9: Build Structured Report Artifacts

**Files:**
- Create: `src/features/report/lib/reportArtifacts.ts`
- Modify: `src/features/report/components/SummaryCard/index.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/features/report/lib/reportArtifacts.test.ts`
- Test: `src/features/report/components/SummaryCard/SummaryCard.test.tsx`

- [ ] **Step 1: Write failing tests**

```ts
import { buildReportArtifact } from './reportArtifacts'

describe('buildReportArtifact', () => {
  it('builds board report from deterministic refs and risk cards', () => {
    const report = buildReportArtifact({
      audience: 'board',
      toolSnapshot: snapshot,
      riskCards: [riskCard],
      decisionStatus: 'adopted',
    })

    expect(report.audience).toBe('board')
    expect(report.toolResultRefs).toContain('tool:monthlyAiCogs')
    expect(report.sections.some(section => section.title.includes('Risk'))).toBe(true)
  })
})
```

- [ ] **Step 2: Implement structured artifacts**

`ReportArtifact` shape:

```ts
{
  audience: 'developer' | 'pm' | 'ceo_cfo' | 'board',
  title: string,
  sections: { title: string; body: string }[],
  toolResultRefs: string[],
  riskCardIds: string[],
}
```

- [ ] **Step 3: Wire SummaryCard**

Summary text must remain wrapped with `lang="en"` where English prose is rendered.

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:run -- reportArtifacts SummaryCard App
npm run test:run
```

Expected: all pass.

---

## Task 10: Full Verification

- [ ] **Step 1: Run all unit/component tests**

Run: `npm run test:run`

Expected: all tests pass.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: Vite build succeeds.

- [ ] **Step 3: Preview**

Run: `npm run preview -- --host 127.0.0.1`

Expected: app served at `http://127.0.0.1:4173/token_simulator/`.

- [ ] **Step 4: Browser smoke**

Manual flow:
1. Open `http://127.0.0.1:4173/token_simulator/`.
2. Load SparkClaw sample.
3. Confirm Operational Signal Summary has session or agent-run guidance.
4. Confirm all six pricing policies render.
5. Confirm risk cards attach to a recommendation.
6. Adopt one recommendation.
7. Export Decision Log JSON.
8. Delete the saved decision.
9. Confirm report audiences render: Developer, PM, CEO/CFO, Board.

Expected: every step works without console errors, and no visible user number is formatted inline outside `src/lib/format.ts`.
