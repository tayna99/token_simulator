# AI Team Cost Simulator PRD Gap Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps between `docs/research/2026-05-22-ai-team-cost-simulator-prd.md` and the current `C:\token_simulator` implementation.

**Architecture:** Keep the Wedge A simulator client-only for P0. Deterministic TypeScript tools produce all token and cost numbers; LangGraph.js and UI copy only explain, compare, audit risk, and draft decisions.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, `@langchain/langgraph`, localStorage Decision Log, existing `calculateCost`.

---

## Current Implementation Status

Implemented:

- `AgentSpec`, `Artifact`, `Frequency`, review gate schema in `src/features/team-cost/lib/agentSpec.ts`.
- `AgentSpec -> monthly tokens -> calculateCost` mapper in `src/features/team-cost/lib/estimateAgentWorkload.ts`.
- 25 artifact token templates in `src/features/team-cost/lib/artifactTemplates.ts`.
- 9-agent catalog in `src/features/team-cost/lib/agentCatalog.ts`.
- Bottleneck detection in `src/features/team-cost/lib/bottleneckAnalysis.ts`.
- Optimization candidate mapping in `src/features/team-cost/lib/optimizationPolicies.ts`.
- LangGraph.js team-cost flow in `src/features/agent/lib/teamCostGraph.ts`.
- Tool snapshot contract in `src/features/agent/lib/teamCostToolContract.ts`.
- UI panels for screens 1-4 in `src/features/team-cost/components/*`.
- A Wedge A toggle path in `src/app/App.tsx`.
- Decision Log primitives in `src/features/decision-log/lib/decisionLog.ts`.

Verified:

```bash
npm test -- --run src/features/team-cost/lib/agentSpec.test.ts src/features/team-cost/lib/estimateAgentWorkload.test.ts src/features/team-cost/lib/artifactTemplates.test.ts src/features/team-cost/lib/agentCatalog.test.ts src/features/team-cost/lib/bottleneckAnalysis.test.ts src/features/team-cost/lib/optimizationPolicies.test.ts src/features/agent/lib/teamCostGraph.test.ts src/features/agent/lib/teamCostRuntime.test.ts src/features/agent/lib/teamCostToolContract.test.ts
```

Expected: 9 files / 13 tests pass.

```bash
npm test -- --run src/app/App.test.tsx
```

Expected: 1 file / 6 tests pass.

Main remaining gap:

The core engine exists, but the PRD's 5-screen MVP is not fully productized. Screen 1 is mostly static, Screen 2 only edits monthly runs, Screen 4 does not expose risk cards and adoption controls, and Screen 5 is a placeholder instead of a Wedge A Decision Log workflow.

---

## Task 1: Make Screen 1 Editable

**Files:**

- Modify: `src/app/App.tsx`
- Modify: `src/features/team-cost/components/CompanyWorkInputPanel/index.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to `src/app/App.test.tsx`:

```tsx
it('updates team cost company setup from screen 1 inputs', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
  await user.clear(screen.getByLabelText(/Monthly AI team budget/i))
  await user.type(screen.getByLabelText(/Monthly AI team budget/i), '500')

  expect(screen.getByText('$500')).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "updates team cost company setup"
```

Expected: fail because `CompanyWorkInputPanel` renders static cards, not editable inputs.

- [ ] **Step 3: Implement editable inputs**

Change `CompanyWorkInputPanel` props to:

```ts
interface CompanyWorkInputPanelProps {
  companyType: string
  stage: string
  monthlyBudgetUsd: number
  onCompanyTypeChange: (value: string) => void
  onStageChange: (value: string) => void
  onMonthlyBudgetUsdChange: (value: number) => void
}
```

Render accessible inputs:

```tsx
<Field label="Company type" htmlFor="team-cost-company-type">
  <input
    id="team-cost-company-type"
    value={companyType}
    onChange={event => onCompanyTypeChange(event.target.value)}
    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
  />
</Field>
<Field label="Stage" htmlFor="team-cost-stage">
  <input
    id="team-cost-stage"
    value={stage}
    onChange={event => onStageChange(event.target.value)}
    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
  />
</Field>
<Field label="Monthly AI team budget" htmlFor="team-cost-budget">
  <input
    id="team-cost-budget"
    type="number"
    min={0}
    value={monthlyBudgetUsd}
    onChange={event => onMonthlyBudgetUsdChange(Number(event.target.value))}
    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
  />
</Field>
```

In `App`, replace the memoized constant profile with state:

```ts
const [teamCostCompanyProfile, setTeamCostCompanyProfile] = useState({
  companyType: '1-person B2B SaaS',
  stage: 'MVP',
  monthlyBudgetUsd: 300,
  locale: i18n.language === 'ko' ? 'ko' as const : 'en' as const,
})
```

Keep locale synced with language:

```ts
useEffect(() => {
  setTeamCostCompanyProfile(profile => ({
    ...profile,
    locale: i18n.language === 'ko' ? 'ko' : 'en',
  }))
}, [i18n.language])
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "updates team cost company setup"
```

Expected: pass.

---

## Task 2: Make Screen 2 Edit I/O and Model Settings

**Files:**

- Modify: `src/features/team-cost/components/AITeamSpecPanel/index.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add:

```tsx
it('updates agent calls per run and cache rate from screen 2', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
  const before = screen.getByTestId('team-monthly-cost').textContent
  await user.clear(screen.getByLabelText(/Engineering Agent calls per run/i))
  await user.type(screen.getByLabelText(/Engineering Agent calls per run/i), '2')

  expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
})
```

- [ ] **Step 2: Verify failure**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "updates agent calls per run"
```

Expected: fail because only monthly runs are editable.

- [ ] **Step 3: Implement callbacks**

Extend `AITeamSpecPanelProps`:

```ts
onCallsPerRunChange: (agentId: string, callsPerRun: number) => void
onCacheHitRateChange: (agentId: string, cacheHitRate: number) => void
onHumanReviewGateChange: (agentId: string, gate: HumanReviewGate) => void
```

Render fields per agent:

```tsx
<Field label={`${agent.role} calls per run`} htmlFor={`team-cost-calls-${agent.id}`}>
  <input
    id={`team-cost-calls-${agent.id}`}
    type="number"
    min={0}
    value={agent.callsPerRun}
    onChange={event => onCallsPerRunChange(agent.id, Number(event.target.value))}
    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
  />
</Field>
<Field label={`${agent.role} cache hit rate`} htmlFor={`team-cost-cache-${agent.id}`}>
  <input
    id={`team-cost-cache-${agent.id}`}
    type="number"
    min={0}
    max={100}
    value={Math.round(agent.cacheHitRate * 100)}
    onChange={event => onCacheHitRateChange(agent.id, Number(event.target.value) / 100)}
    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
  />
</Field>
```

Add App handlers:

```ts
const patchTeamCostAgent = (agentId: string, patch: Partial<AgentSpec>) => {
  setTeamCostAgents(agents => agents.map(agent => agent.id === agentId ? { ...agent, ...patch } : agent))
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "updates agent calls per run"
```

Expected: pass.

---

## Task 3: Expose Risk Cards and Approval in Screen 4

**Files:**

- Modify: `src/features/team-cost/components/OptimizationReviewPanel/index.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add:

```tsx
it('shows risk cards and lets the user adopt a team-cost optimization', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))

  expect(screen.getByText(/Risk Auditor/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Adopt team-cost optimization/i }))
  expect(screen.getByText(/Adopt AI team cost optimization/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failure**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "shows risk cards"
```

Expected: fail because the Wedge A optimization panel currently lists recommendations and events only.

- [ ] **Step 3: Implement risk-carded adoption**

In `App`, derive risk cards for the first recommendation:

```ts
const teamCostRiskCards = useMemo(() => {
  const first = teamCostRecommendations[0]
  return first ? retrieveRiskCards(first.riskTags) : []
}, [teamCostRecommendations])
```

Add handler:

```ts
const handleAdoptTeamCostOptimization = () => {
  const recommendation = teamCostRecommendations[0]
  if (!recommendation) return
  const cards = retrieveRiskCards(recommendation.riskTags)
  const decision = createDecision({
    what: 'Adopt AI team cost optimization',
    why: recommendation.rationale,
    assumptions: {
      recommendationId: recommendation.id,
      agentId: recommendation.agentId,
      costAfterUsd: recommendation.costAfterUsd,
      monthlySavingsUsd: recommendation.monthlySavingsUsd,
    },
    toolResultRefs: recommendation.toolResultRefs,
    riskCards: cards.map(card => card.id),
    status: 'adopted',
  })
  const next = [decision, ...decisions]
  setDecisions(next)
  saveDecisionLog(next)
}
```

Pass `riskCards` and `onAdopt` into `OptimizationReviewPanel`.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "shows risk cards"
```

Expected: pass.

---

## Task 4: Turn Screen 5 into Wedge A Decision Log

**Files:**

- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add:

```tsx
it('records Wedge A assumptions in the Decision Log', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
  await user.click(screen.getByRole('button', { name: /Adopt team-cost optimization/i }))

  expect(screen.getByText(/monthlySavingsUsd/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failure**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "records Wedge A assumptions"
```

Expected: fail because `DecisionLogWorkspace` does not display assumptions.

- [ ] **Step 3: Show assumptions**

In `DecisionLogWorkspace`, render assumptions:

```tsx
<pre className="mt-2 max-h-40 overflow-auto rounded-wds bg-fill-alternative p-2 text-xs" translate="no">
  {JSON.stringify(decision.assumptions, null, 2)}
</pre>
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- --run src/app/App.test.tsx -t "records Wedge A assumptions"
```

Expected: pass.

---

## Task 5: Final Verification

- [ ] **Step 1: Run focused tests**

```bash
npm test -- --run src/app/App.test.tsx src/features/team-cost/lib/agentSpec.test.ts src/features/team-cost/lib/estimateAgentWorkload.test.ts src/features/team-cost/lib/artifactTemplates.test.ts src/features/team-cost/lib/agentCatalog.test.ts src/features/team-cost/lib/bottleneckAnalysis.test.ts src/features/team-cost/lib/optimizationPolicies.test.ts src/features/agent/lib/teamCostGraph.test.ts src/features/agent/lib/teamCostRuntime.test.ts src/features/agent/lib/teamCostToolContract.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: TypeScript build and Vite build pass.

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```

Open the local app, click `AI Team Cost Simulator`, complete the 5-screen Wedge A path, adopt one team-cost optimization, and verify the Decision Log shows the recommendation, risk cards, tool refs, and assumptions.
