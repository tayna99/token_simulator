# Front Operating UI Panel TDD 구현 계획

> **agentic worker(에이전트형 작업자)용:** REQUIRED SUB-SKILL(필수 하위 스킬): 이 계획을 task-by-task(작업 단위)로 구현하려면 superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans를 사용한다. 단계 추적은 checkbox(`- [ ]`) 문법을 사용한다.

**목표:** AgentCost front operating asset(고객 획득/검증 앞단 운영 자산)을 app shell(앱의 기본 화면 껍데기)에 보여주고, 같은 visible context(화면에 보이는 맥락)가 기존 LangChain `create_agent` runtime payload(실행 요청 본문)로 전달되는지 검증한다.

**아키텍처:** 왼쪽 lifecycle navigation(업무 흐름 내비게이션)의 기존 internal(내부용) `OperatingTeamPanel` 옆에 작은 read-only(읽기 전용) `FrontOperatingPanel`을 추가한다. 이 panel은 display-only(표시 전용)로 유지한다. 새 calculator(계산기), mutable local state(변경 가능한 로컬 상태), 새 backend endpoint(서버 API 경로)는 만들지 않는다. 기존 `AGENTCOST_FRONT_OPERATING_SYSTEM -> buildAgentSnapshot() -> runAgentRuntime()` 경로가 agent payload의 source of truth(공식 출처)로 남는다.

**기술 스택:** Vite 6, React 18, TypeScript 5, Tailwind 3, Vitest 4, Testing Library, 기존 `src/shared/ui/primitives`.

---

## 범위

visible UI surface(사용자에게 보이는 화면 표면)와 App integration test(앱 통합 테스트)만 만든다.

범위 안:
- `icp_scorecard`, `data_readiness`, `offer_ladder`, `approval_matrix`, `learning_loop`의 front operating asset group(앞단 운영 자산 묶음)을 렌더한다.
- 새 page(페이지)를 만들지 않고 기존 app stage(앱 단계)로 이동하는 CTA(행동 버튼)를 추가한다.
- agent run control(에이전트 실행 버튼)을 눌러도 같은 `frontOperatingSystem` context가 `/api/agent/run`으로 POST되는지 검증한다.
- 초기에는 `OperatingTeamPanel`과 맞춰 internal/debug-gated(내부/디버그 모드에서만 보임)로 유지한다.

범위 밖:
- learning-loop record(학습 루프 기록) 편집 또는 저장.
- customer-facing intake workflow(고객용 데이터 접수 흐름) 생성.
- 새 LangChain tool 추가. backend tool은 이미 존재한다.
- static count(고정 개수)와 label 렌더링을 넘어서는 새 계산 또는 포맷 로직.

---

## 파일 구조

- Create: `src/features/front-operating/components/FrontOperatingPanel.tsx`
  - front operating asset, data readiness gate(데이터 준비도 관문), offer ladder(상품 제안 사다리), approval matrix(승인 매트릭스), learning-loop status(학습 루프 상태)를 보여주는 read-only display component.
- Create: `src/features/front-operating/components/FrontOperatingPanel.test.tsx`
  - 필수 label, asset ref, gate content, CTA callback을 검증하는 component-level test(컴포넌트 단위 테스트).
- Modify: `src/app/App.tsx`
  - `FrontOperatingPanel` import.
  - `AGENTCOST_FRONT_OPERATING_SYSTEM` 전달.
  - CTA callback을 기존 `DecisionStageId` transition(단계 전환)에 연결.
  - `OperatingTeamPanel` 아래 `showInternal` block에서만 panel 렌더.
- Modify: `src/app/App.test.tsx`
  - debug mode 밖에서는 panel이 숨겨지는지 검증.
  - debug mode에서 panel이 나타나고 필수 asset을 보여주는지 검증.
  - CTA가 기존 stage로 route되는지 검증.
  - all-hands 실행 시 agent payload에 `frontOperatingSystem`이 계속 포함되는지 검증.
- Optional docs update: `docs/PRD-v2.md`, `docs/PRD-v3.md`
  - 구현이 internal-only에서 customer-facing(고객 노출)으로 바뀔 때만 수정.

---

## Task 1: `FrontOperatingPanel` Component 추가

**파일:**
- 생성: `src/features/front-operating/components/FrontOperatingPanel.test.tsx`
- 생성: `src/features/front-operating/components/FrontOperatingPanel.tsx`

- [ ] **Step 1: 실패하는 component test 작성**

`src/features/front-operating/components/FrontOperatingPanel.test.tsx`를 만든다.

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

- [ ] **Step 2: component test를 실행해 RED 확인**

실행:

```powershell
npm run test:run -- src/features/front-operating/components/FrontOperatingPanel.test.tsx
```

기대 결과: `FrontOperatingPanel.tsx`가 없기 때문에 FAIL.

- [ ] **Step 3: 최소 component 구현**

`src/features/front-operating/components/FrontOperatingPanel.tsx`를 만든다.

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

- [ ] **Step 4: component test를 실행해 GREEN 확인**

실행:

```powershell
npm run test:run -- src/features/front-operating/components/FrontOperatingPanel.test.tsx
```

기대 결과: PASS.

- [ ] **Step 5: Task 1 commit**

```powershell
git add src/features/front-operating/components/FrontOperatingPanel.tsx src/features/front-operating/components/FrontOperatingPanel.test.tsx
git commit -m "feat: add front operating panel"
```

---

## Task 2: `FrontOperatingPanel`을 App Shell에 연결

**파일:**
- 수정: `src/app/App.test.tsx`
- 수정: `src/app/App.tsx`

- [ ] **Step 1: 실패하는 App shell test 작성**

`src/app/App.test.tsx`의 `describe('App AI team operations workspace', () => { ... })` 안, 기존 internal/debug surface test 근처에 아래 test를 추가한다.

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

- [ ] **Step 2: App test를 실행해 RED 확인**

실행:

```powershell
npm run test:run -- src/app/App.test.tsx
```

기대 결과: `front-operating-panel`이 렌더되지 않기 때문에 FAIL.

- [ ] **Step 3: panel을 `App.tsx`에 연결**

`src/app/App.tsx`의 import를 수정한다.

```tsx
import { FrontOperatingPanel } from '../features/front-operating/components/FrontOperatingPanel'
```

`LifecycleNavigation` props type(속성 타입)과 function signature(함수 시그니처)를 수정한다.

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

같은 `showInternal` block 안에서 `OperatingTeamPanel` 뒤에 panel을 렌더한다.

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

`App()` 안의 `handleRunAllHands` 근처에 callback을 추가한다.

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

callback을 `LifecycleNavigation`에 전달한다.

```tsx
          onOpenFrontFitCheck={handleOpenFrontFitCheck}
          onOpenFrontDataGate={handleOpenFrontDataGate}
          onOpenFrontSampleReport={handleOpenFrontSampleReport}
```

- [ ] **Step 4: App test를 실행해 GREEN 확인**

실행:

```powershell
npm run test:run -- src/app/App.test.tsx
```

기대 결과: PASS.

- [ ] **Step 5: Task 2 commit**

```powershell
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: wire front operating panel into app"
```

---

## Task 3: Visible Panel Context가 Agent Payload에 도달하는지 검증

**파일:**
- 수정: `src/app/App.test.tsx`

- [ ] **Step 1: 실패하는 payload integration test 작성**

이 test를 `lets the user call one operating agent or the full operating team` 근처에 추가한다.

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

- [ ] **Step 2: App test를 실행해 RED 또는 regression guard(회귀 방지)를 확인**

실행:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Task 2 구현 전 기대 결과: panel이 없기 때문에 FAIL.
Task 2 구현 후 기대 결과: 기존 `frontOperatingSystem` payload path가 그대로라면 PASS.

- [ ] **Step 3: 필요하면 최소 App fix 적용**

`/api/agent/run`이 click 전에 호출되어 test가 실패하면 request body로 filtering(필터링)해서 최종 all-hands call을 보존한다.

```tsx
const agentRunCall = fetchMock.mock.calls.find(([, init]) => {
  if (!init?.body) return false
  const body = JSON.parse(String(init.body))
  return body.executionMode === 'all_hands'
})
```

payload에 `frontOperatingSystem`이 없어서 test가 실패하면 기존 call이 snapshot field를 계속 넘기는지 확인한다.

```tsx
frontOperatingSystem: agentSnapshot.frontOperatingSystem,
```

- [ ] **Step 4: focused test 실행**

실행:

```powershell
npm run test:run -- src/app/App.test.tsx src/features/front-operating/components/FrontOperatingPanel.test.tsx src/features/agent/lib/agentRunRuntime.test.ts src/features/agent/lib/buildAgentSnapshot.test.ts
```

기대 결과: PASS.

- [ ] **Step 5: Task 3 commit**

```powershell
git add src/app/App.test.tsx
git commit -m "test: verify front operating context reaches agent payload"
```

---

## Task 4: 최종 검증과 문서 확인

**파일:**
- 필요할 때만 수정: `docs/PRD-v2.md`, `docs/PRD-v3.md`

- [ ] **Step 1: frontend suite(프론트엔드 전체 테스트) 실행**

```powershell
npm run test:run
```

기대 결과: 모든 Vitest file 통과.

- [ ] **Step 2: Python agent test 실행**

```powershell
uv run pytest agent_service/tests/test_agentic_runtime.py agent_service/tests/test_main.py
```

기대 결과: 모든 Python test 통과.

- [ ] **Step 3: production build 실행**

```powershell
npm run build
```

기대 결과: build 성공. sandbox가 esbuild를 `spawn EPERM`으로 막으면 `npm run build`에 대해 승인된 escalation(권한 상승 실행)으로 재실행한다.

- [ ] **Step 4: PRD 추가 업데이트 필요 여부 결정**

panel이 debug/internal-only로 남으면 PRD 업데이트는 필요 없다. `docs/PRD-v2.md`가 이미 `frontOperatingSystem` context와 `create_agent` payload를 문서화하고 있기 때문이다.

panel이 customer-facing이 되는 경우에만 PRD를 업데이트한다. `docs/PRD-v3.md` section 6 아래에 이 bullet을 추가한다.

```markdown
| Front Operating UI | Internal panel exposes ICP, data readiness, offer ladder, approval matrix, and learning-loop context before agent review |
```

- [ ] **Step 5: 문서가 바뀐 경우에만 docs commit**

```powershell
git add docs/PRD-v2.md docs/PRD-v3.md
git commit -m "docs: document front operating panel"
```

문서 변경이 없으면 이 commit은 건너뛴다.

---

## Acceptance Criteria(인수 기준)

- `FrontOperatingPanel`은 아래 visible asset ref를 렌더한다.
  - `asset:icp_scorecard`
  - `asset:data_readiness_checklist`
  - `asset:offer_ladder`
  - `asset:approval_matrix`
  - `asset:learning_loop_review`
- panel은 normal mode(일반 모드)에서 숨겨지고 `?debug=1`에서 보인다.
- panel CTA는 기존 stage로 route된다.
  - fit check -> `design`
  - data gate -> `design` with `usage_data_ingestion` as requested agent
  - sample report -> `decision-log` with `knowledge_release_ops` as requested agent
- all-hands 실행은 `/api/agent/run` request body에 `frontOperatingSystem`을 보낸다.
- 어떤 component도 cost arithmetic(비용 산술)이나 inline number formatting(컴포넌트 안 숫자 포맷)을 수행하지 않는다.
- final commit 전에 `npm run test:run`, Python agent test, `npm run build`가 통과한다.

---

## Self-Review(자가 검토)

Spec coverage(스펙 충족 범위):
- 필수 visible asset은 Task 1 component test와 Task 2 App test로 다룬다.
- Agent payload continuity(에이전트 요청 본문 연속성)는 Task 3에서 다룬다.
- 기존 `create_agent` backend integration은 이미 존재하고 `agent_service/tests/test_agentic_runtime.py`가 다루므로 다시 구현하지 않는다.

Placeholder scan(빈자리 점검):
- 구현에 필요한 열린 TODO/TBD placeholder는 없다.
- Optional PRD update는 명시적으로 조건부이며 추가할 정확한 문구가 있다.

Type consistency(타입 일관성):
- 이 계획은 기존 `FrontOperatingSystemContext`, `AGENTCOST_FRONT_OPERATING_SYSTEM`, `DecisionStageId`, `OperatingAgentId`, `AgentRunExecutionMode` 이름을 사용한다.
- 모든 새 callback은 local App callback이며 backend schema를 바꾸지 않는다.
