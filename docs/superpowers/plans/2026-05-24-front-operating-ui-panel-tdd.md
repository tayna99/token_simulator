# Front Operating UI Panel TDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the AgentCost front operating assets in the app shell and verify that the same visible context is sent to the existing LangChain `create_agent` runtime payload.

**Architecture:** Add a small read-only `FrontOperatingPanel` beside the existing internal `OperatingTeamPanel` in the left lifecycle navigation. Keep the panel display-only: no new calculators, no mutable local state, and no new backend endpoint. The existing `AGENTCOST_FRONT_OPERATING_SYSTEM -> buildAgentSnapshot() -> runAgentRuntime()` path remains the source of truth for agent payloads.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind 3, Vitest 4, Testing Library, existing `src/shared/ui/primitives`.

---

## Scope

Build only the visible UI surface and its App integration tests.

In scope:
- Render front operating asset groups for `icp_scorecard`, `data_readiness`, `offer_ladder`, `approval_matrix`, and `learning_loop`.
- Add CTAs that route into existing app stages instead of creating new pages.
- Verify that clicking agent run controls still posts the same `frontOperatingSystem` context to `/api/agent/run`.
- Keep this panel internal/debug-gated initially, matching `OperatingTeamPanel`.

Out of scope:
- Editing or persisting learning-loop records.
- Creating a customer-facing intake workflow.
- Adding new LangChain tools. The backend tools already exist.
- New calculation or formatting logic beyond rendering static counts and labels.

---

## File Structure

- Create: `src/features/front-operating/components/FrontOperatingPanel.tsx`
  - Read-only display component for front operating assets, data readiness gate, offer ladder, approval matrix, and learning-loop status.
- Create: `src/features/front-operating/components/FrontOperatingPanel.test.tsx`
  - Component-level tests for required labels, asset refs, gate content, and CTA callbacks.
- Modify: `src/app/App.tsx`
  - Import `FrontOperatingPanel`.
  - Pass `AGENTCOST_FRONT_OPERATING_SYSTEM`.
  - Wire CTA callbacks to existing `DecisionStageId` transitions.
  - Render panel only in `showInternal` block below `OperatingTeamPanel`.
- Modify: `src/app/App.test.tsx`
  - Verify panel is hidden outside debug mode.
  - Verify panel appears in debug mode and shows the required assets.
  - Verify CTAs route to existing stages.
  - Verify agent payload still includes `frontOperatingSystem` when running all-hands.
- Optional docs update: `docs/PRD-v2.md`, `docs/PRD-v3.md`
  - Only if implementation changes visibility from internal-only to customer-facing.

---

## Task 1: Add FrontOperatingPanel Component

**Files:**
- Create: `src/features/front-operating/components/FrontOperatingPanel.test.tsx`
- Create: `src/features/front-operating/components/FrontOperatingPanel.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/features/front-operating/components/FrontOperatingPanel.test.tsx`.

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from '../lib/frontOperatingContext'
import { FrontOperatingPanel } from './FrontOperatingPanel'

describe('FrontOperatingPanel', () => {
  it('renders the front operating assets required by the AgentCost workflow', () => {
    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    const panel = screen.getByTestId('front-operating-panel')
    expect(panel).toHaveTextContent(/AgentCost front operating system/i)
    expect(panel).toHaveTextContent(/ICP Scorecard/i)
    expect(panel).toHaveTextContent(/asset:icp_scorecard/i)
    expect(panel).toHaveTextContent(/Data Readiness Checklist/i)
    expect(panel).toHaveTextContent(/asset:data_readiness_checklist/i)
    expect(panel).toHaveTextContent(/Offer Ladder/i)
    expect(panel).toHaveTextContent(/asset:offer_ladder/i)
    expect(panel).toHaveTextContent(/Human Approval Matrix/i)
    expect(panel).toHaveTextContent(/asset:approval_matrix/i)
    expect(panel).toHaveTextContent(/Learning Loop Review/i)
    expect(panel).toHaveTextContent(/asset:learning_loop_review/i)
  })

  it('summarizes the data gate, offer ladder, approvals, and learning loop without mutation', () => {
    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    expect(screen.getByText(/accepted columns/i)).toHaveTextContent('10')
    expect(screen.getByText(/rejected columns/i)).toHaveTextContent('6')
    expect(screen.getByText(/offers/i)).toHaveTextContent('4')
    expect(screen.getByText(/approval gates/i)).toHaveTextContent('7')
    expect(screen.getByText(/learning records/i)).toHaveTextContent('0')
    expect(screen.getByText(/raw_prompt/i)).toBeInTheDocument()
    expect(screen.getByText(/api_key/i)).toBeInTheDocument()
  })

  it('routes panel actions through existing app callbacks', async () => {
    const user = userEvent.setup()
    const onOpenFitCheck = vi.fn()
    const onOpenDataGate = vi.fn()
    const onOpenSampleReport = vi.fn()

    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={onOpenFitCheck}
        onOpenDataGate={onOpenDataGate}
        onOpenSampleReport={onOpenSampleReport}
      />,
    )

    const panel = screen.getByTestId('front-operating-panel')
    await user.click(within(panel).getByRole('button', { name: /fit check/i }))
    await user.click(within(panel).getByRole('button', { name: /data gate/i }))
    await user.click(within(panel).getByRole('button', { name: /sample report/i }))

    expect(onOpenFitCheck).toHaveBeenCalledTimes(1)
    expect(onOpenDataGate).toHaveBeenCalledTimes(1)
    expect(onOpenSampleReport).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the component test to verify RED**

Run:

```powershell
npm run test:run -- src/features/front-operating/components/FrontOperatingPanel.test.tsx
```

Expected: FAIL because `FrontOperatingPanel.tsx` does not exist.

- [ ] **Step 3: Implement the minimal component**

Create `src/features/front-operating/components/FrontOperatingPanel.tsx`.

```tsx
import { Badge, Button } from '../../../shared/ui/primitives'
import type { FrontOperatingSystemContext } from '../lib/frontOperatingContext'

function assetById(context: FrontOperatingSystemContext, id: string) {
  return context.assets.find(asset => asset.id === id)
}

function RequiredAssetRow({
  context,
  id,
}: {
  context: FrontOperatingSystemContext
  id: string
}) {
  const asset = assetById(context, id)
  if (!asset) return null

  return (
    <div className="rounded-wds border border-line-neutral bg-fill-alternative px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-label-neutral">{asset.label}</p>
        <Badge>{asset.owner}</Badge>
      </div>
      <p className="mt-1 text-[11px] text-label-alternative" translate="no">
        {asset.ref}
      </p>
    </div>
  )
}

export function FrontOperatingPanel({
  context,
  onOpenFitCheck,
  onOpenDataGate,
  onOpenSampleReport,
}: {
  context: FrontOperatingSystemContext
  onOpenFitCheck: () => void
  onOpenDataGate: () => void
  onOpenSampleReport: () => void
}) {
  const requiredAssetIds = [
    'icp_scorecard',
    'data_readiness_checklist',
    'offer_ladder',
    'approval_matrix',
    'learning_loop_review',
  ]

  return (
    <div data-testid="front-operating-panel" className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-primary-normal">AgentCost front operating system</p>
        <Badge tone="primary">read-only</Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {requiredAssetIds.map(id => (
          <RequiredAssetRow key={id} context={context} id={id} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-label-neutral">
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">accepted columns: {context.dataReadinessGate.acceptedColumns.length}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">rejected columns: {context.dataReadinessGate.rejectedColumns.length}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">offers: {context.offerLadder.length}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">approval gates: {context.approvalGates.length}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">learning records: {context.learningLoopRecords.length}</p>
      </div>

      <div className="mt-3 rounded-wds bg-fill-alternative px-2 py-1.5 text-xs text-label-neutral">
        <p className="font-medium text-label-normal">Rejected data</p>
        <p className="mt-1" translate="no">{context.dataReadinessGate.rejectedColumns.join(', ')}</p>
      </div>

      <div className="mt-3 grid gap-2">
        <Button size="sm" variant="secondary" onClick={onOpenFitCheck}>Open fit check</Button>
        <Button size="sm" variant="secondary" onClick={onOpenDataGate}>Open data gate</Button>
        <Button size="sm" variant="secondary" onClick={onOpenSampleReport}>Open sample report</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the component test to verify GREEN**

Run:

```powershell
npm run test:run -- src/features/front-operating/components/FrontOperatingPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/features/front-operating/components/FrontOperatingPanel.tsx src/features/front-operating/components/FrontOperatingPanel.test.tsx
git commit -m "feat: add front operating panel"
```

---

## Task 2: Wire FrontOperatingPanel Into App Shell

**Files:**
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write failing App shell tests**

Add the following tests inside `describe('App AI team operations workspace', () => { ... })` in `src/app/App.test.tsx`, near the existing internal/debug surface tests.

```tsx
  it('shows the front operating panel only in admin mode', () => {
    render(<App />)

    expect(screen.queryByTestId('front-operating-panel')).not.toBeInTheDocument()

    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/AgentCost front operating system/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/ICP Scorecard/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Data Readiness Checklist/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Offer Ladder/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Human Approval Matrix/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Learning Loop Review/i)
  })

  it('routes front operating panel actions into existing decision stages', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    await user.click(screen.getByRole('button', { name: /open data gate/i }))
    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Design/i)
    expect(screen.getByRole('heading', { name: /1\. Import/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open sample report/i }))
    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Decision Log/i)
    expect(screen.getByTestId('decision-workspace-panel')).toHaveTextContent(/Decision & Approval Log/i)

    await user.click(screen.getByRole('button', { name: /open fit check/i }))
    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Design/i)
  })
```

- [ ] **Step 2: Run App tests to verify RED**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected: FAIL because `front-operating-panel` is not rendered.

- [ ] **Step 3: Wire the panel into `App.tsx`**

Modify imports in `src/app/App.tsx`.

```tsx
import { FrontOperatingPanel } from '../features/front-operating/components/FrontOperatingPanel'
```

Modify the `LifecycleNavigation` props type and function signature.

```tsx
function LifecycleNavigation({
  activeStage,
  operatingAgents,
  selectedAgentId,
  savedDecisionCount,
  showInternal,
  onStageChange,
  onAgentSelect,
  onRunAllHands,
  onOpenFrontFitCheck,
  onOpenFrontDataGate,
  onOpenFrontSampleReport,
}: {
  activeStage: DecisionStageId
  operatingAgents: OperatingAgent[]
  selectedAgentId: OperatingAgentId | null
  savedDecisionCount: number
  showInternal: boolean
  onStageChange: (stage: DecisionStageId) => void
  onAgentSelect: (agentId: OperatingAgentId) => void
  onRunAllHands: () => void
  onOpenFrontFitCheck: () => void
  onOpenFrontDataGate: () => void
  onOpenFrontSampleReport: () => void
}) {
```

Render the panel after `OperatingTeamPanel`, inside the same `showInternal` block.

```tsx
      {showInternal && (
        <FrontOperatingPanel
          context={AGENTCOST_FRONT_OPERATING_SYSTEM}
          onOpenFitCheck={onOpenFrontFitCheck}
          onOpenDataGate={onOpenFrontDataGate}
          onOpenSampleReport={onOpenFrontSampleReport}
        />
      )}
```

Add callbacks in `App()` near `handleRunAllHands`.

```tsx
  const handleOpenFrontFitCheck = () => {
    setActiveDecisionStage('design')
    setRequestedOperatingAgentId(null)
    setAgentExecutionMode('stage_committee')
  }

  const handleOpenFrontDataGate = () => {
    setActiveDecisionStage('design')
    setRequestedOperatingAgentId('usage_data_ingestion')
    setAgentExecutionMode('single_agent')
  }

  const handleOpenFrontSampleReport = () => {
    setActiveDecisionStage('decision-log')
    setRequestedOperatingAgentId('knowledge_release_ops')
    setAgentExecutionMode('single_agent')
  }
```

Pass callbacks into `LifecycleNavigation`.

```tsx
          onOpenFrontFitCheck={handleOpenFrontFitCheck}
          onOpenFrontDataGate={handleOpenFrontDataGate}
          onOpenFrontSampleReport={handleOpenFrontSampleReport}
```

- [ ] **Step 4: Run App tests to verify GREEN**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: wire front operating panel into app"
```

---

## Task 3: Verify Visible Panel Context Reaches Agent Payload

**Files:**
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing payload integration test**

Add this test near `lets the user call one operating agent or the full operating team`.

```tsx
  it('sends the visible front operating context when running the operating team', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/agent/run')) {
        return new Response(JSON.stringify({
          answer: 'Front operating assets were included.',
          supervisorSummary: 'All-hands reviewed front operating context.',
          events: [],
          toolResults: [],
          assetRefs: ['asset:icp_scorecard'],
          warnings: [],
          llmMode: 'deterministic-fallback',
          snapshotVersion: 'snapshot:design:test',
          calledAgentIds: ['usage_data_ingestion', 'trust_security_compliance', 'knowledge_release_ops'],
          primaryAgentId: 'usage_data_ingestion',
          reviewerAgentIds: ['trust_security_compliance', 'knowledge_release_ops'],
          agentRoute: { executionMode: 'all_hands', reason: 'test all-hands' },
        }), { status: 200 })
      }

      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.pushState({}, '', '/token_simulator/?debug=1')

    render(<App />)

    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/asset:icp_scorecard/i)
    await user.click(screen.getByRole('button', { name: /Run full operating review/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/agent/run',
      expect.objectContaining({ method: 'POST' }),
    ))

    const agentRunCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/api/agent/run'))
    expect(agentRunCall).toBeDefined()
    const body = JSON.parse(String(agentRunCall?.[1]?.body))
    expect(body.executionMode).toBe('all_hands')
    expect(body.frontOperatingSystem.assets.map((asset: { ref: string }) => asset.ref)).toContain('asset:icp_scorecard')
    expect(body.frontOperatingSystem.assets.map((asset: { ref: string }) => asset.ref)).toContain('asset:approval_matrix')
    expect(body.frontOperatingSystem.dataReadinessGate.rejectedColumns).toContain('raw_prompt')
    expect(body.frontOperatingSystem.offerLadder.map((offer: { id: string }) => offer.id)).toContain('ai_cost_snapshot')
    expect(body.frontOperatingSystem.learningLoopRecords).toEqual([])
  }, 15000)
```

- [ ] **Step 2: Run App tests to verify RED or guard against regression**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected before Task 2 implementation: FAIL because panel is missing.
Expected after Task 2 implementation: PASS if the existing `frontOperatingSystem` payload path is still intact.

- [ ] **Step 3: Make the minimal App fix if needed**

If the test fails because `/api/agent/run` is called before the click, preserve the final all-hands call by filtering for the request body:

```tsx
const agentRunCall = fetchMock.mock.calls.find(([, init]) => {
  if (!init?.body) return false
  const body = JSON.parse(String(init.body))
  return body.executionMode === 'all_hands'
})
```

If the test fails because the payload lacks `frontOperatingSystem`, ensure the existing call still passes the snapshot field:

```tsx
frontOperatingSystem: agentSnapshot.frontOperatingSystem,
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx src/features/front-operating/components/FrontOperatingPanel.test.tsx src/features/agent/lib/agentRunRuntime.test.ts src/features/agent/lib/buildAgentSnapshot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add src/app/App.test.tsx
git commit -m "test: verify front operating context reaches agent payload"
```

---

## Task 4: Final Verification And Documentation Check

**Files:**
- Modify only if needed: `docs/PRD-v2.md`, `docs/PRD-v3.md`

- [ ] **Step 1: Run frontend suite**

```powershell
npm run test:run
```

Expected: all Vitest files pass.

- [ ] **Step 2: Run Python agent tests**

```powershell
uv run pytest agent_service/tests/test_agentic_runtime.py agent_service/tests/test_main.py
```

Expected: all Python tests pass.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: build succeeds. If sandbox blocks esbuild with `spawn EPERM`, rerun with approved escalation for `npm run build`.

- [ ] **Step 4: Decide whether PRD needs another update**

No PRD update is required if the panel remains debug/internal-only because `docs/PRD-v2.md` already documents the `frontOperatingSystem` context and `create_agent` payload.

Update PRD only if the panel becomes customer-facing. Add this bullet under `docs/PRD-v3.md` section 6:

```markdown
| Front Operating UI | Internal panel exposes ICP, data readiness, offer ladder, approval matrix, and learning-loop context before agent review |
```

- [ ] **Step 5: Commit docs only if changed**

```powershell
git add docs/PRD-v2.md docs/PRD-v3.md
git commit -m "docs: document front operating panel"
```

Skip this commit if no docs changed.

---

## Acceptance Criteria

- `FrontOperatingPanel` renders these visible asset refs:
  - `asset:icp_scorecard`
  - `asset:data_readiness_checklist`
  - `asset:offer_ladder`
  - `asset:approval_matrix`
  - `asset:learning_loop_review`
- The panel is hidden in normal mode and visible with `?debug=1`.
- Panel CTAs route into existing stages:
  - fit check -> `design`
  - data gate -> `design` with `usage_data_ingestion` as requested agent
  - sample report -> `decision-log` with `knowledge_release_ops` as requested agent
- Running all-hands sends `frontOperatingSystem` in the `/api/agent/run` request body.
- No component performs cost arithmetic or inline number formatting.
- `npm run test:run`, Python agent tests, and `npm run build` pass before final commit.

---

## Self-Review

Spec coverage:
- Required visible assets are covered by Task 1 component tests and Task 2 App tests.
- Agent payload continuity is covered by Task 3.
- Existing `create_agent` backend integration is not reimplemented because it already exists and is covered by `agent_service/tests/test_agentic_runtime.py`.

Placeholder scan:
- No open TODO/TBD placeholders are required for implementation.
- Optional PRD update is explicitly conditional and has the exact text to add.

Type consistency:
- The plan uses existing `FrontOperatingSystemContext`, `AGENTCOST_FRONT_OPERATING_SYSTEM`, `DecisionStageId`, `OperatingAgentId`, and `AgentRunExecutionMode` names.
- All new callbacks are local App callbacks and do not change backend schema.
