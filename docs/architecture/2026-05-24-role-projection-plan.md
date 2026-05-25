# 역할별 화면 Projection — 문서 평가와 점진적 반영 계획

> 대상 문서: `AgentPayroll_role_based_frontend_architecture.md`
> 작성일: 2026-05-24
> 방향: 실용적 점진 (기존 decision-flow stage + showInternal 구조를 유지하면서 role을 projection 레이어로 되살린다)

---

## 0. 한 줄 결론

문서의 **핵심 원칙**("계산·데이터·스냅샷은 하나로, 화면만 역할별로 분기")은 이 코드베이스에 **이미 더 엄격하게 지켜지고 있다.** 문제는 그 위에 얹혀야 할 **역할별 projection 기능이 실제로는 거의 비어 있다**는 점이다. 지금 화면을 실제로 가르는 축은 `role`이 아니라 `showInternal`(내부/고객)과 decision-flow stage다. 그래서 이 계획은 "새 아키텍처 도입"이 아니라 **이미 있는 뼈대 위에 role projection을 채워 넣고, 죽은 코드를 정리하는 일**이다.

---

## 1. 문서에 대한 평가

### 1.1 강점 — 그대로 유지할 것

- **"계산 로직을 역할별로 나누지 말라"**(§1.1)는 정확하다. 그리고 이건 이미 `CLAUDE.md` 헌법(`calculateCost` 단일 경로, 페르소나 간 일관성)으로 강제되고 있다. 문서가 새로 만든 규칙이 아니라 **이미 합의된 규칙을 재확인**하는 셈이다.
- **`projectSnapshotForRole(snapshot, role)` 패턴**(§1.2, §6)은 올바른 분리 방향이다. "하나의 snapshot → 역할별 ViewModel"은 React 컴포넌트가 계산을 직접 하지 않게 만드는 좋은 경계다.
- **역할별 정보 needs 정리**(§3)는 제품적으로 가치가 크다. Developer=기술 원인 추적, PM=기능·고객·정책, CEO=손익·가격·보고 — 이 분류 자체는 실제 패널 설계에 바로 쓸 수 있다.
- **AI 요약에 `tool:`/`snapshot:`/`risk:`/`decision:` ref 강제**(§13 Guardrails)는 이미 코드에 부분 구현돼 있다(`ASSISTANT_TOOL_REFS`, `ToolRefChip`). 문서가 이걸 가드레일로 명문화한 건 옳다.

### 1.2 약점 — 보정이 필요한 부분

- **이미 있는 자산을 모른다.** 문서는 `buildDeterministicSnapshot`, `decision ledger`, `RightAssistantPanel`을 "새로 만들 것"처럼 쓰지만, 실제로는 `buildAgentSnapshot.ts`, `decision-log/`, `DecisionAssistantPanel`로 **이미 존재한다.** 그대로 따르면 중복 구현 위험이 있다.
- **role과 audience(내부/고객)를 한 축으로 뭉갠다.** 문서는 Developer/PM/CEO만 본다. 그런데 실제 제품에는 **직교하는 두 번째 축**이 이미 있다 — "고객에게 보여줄 화면" vs "내부 운영자(`?mode=admin`)가 보는 화면". 이 둘을 합치면 안 된다. (자세히는 §3.2)
- **파일 구조 제안(§12)이 실제와 다르다.** 문서는 `features/workspace`, `role-views`, `snapshots`, `reports`를 제안하지만 실제는 도메인 단위(`features/usage`, `features/unit-economics`, `features/pricing` …) + `domain/`이다. 문서 구조를 그대로 따르면 기존 폴더 관례(`docs/architecture/folder-structure.md`)와 충돌한다.
- **stage 목록이 다르다.** 문서 §4는 홈/업로드/비용·마진/병목/최적화/의사결정/리포트/실행/근거/설정 10단계인데, 실제는 `DECISION_STAGES` 5단계(Design → Cost → Bottleneck → Optimize+Risk → Decision Log)다. 문서가 이상적이긴 하나 현재 구현과의 매핑을 먼저 정의해야 한다.

---

## 2. 문서 ↔ 실제 코드 갭 분석

| 문서가 제안한 것 | 실제 코드 상태 | 판정 | 근거 위치 |
|---|---|---|---|
| 하나의 deterministic snapshot | `buildAgentSnapshot()` → `AgentSnapshotPayload` (snapshotVersion 해시) 존재 | ✅ 이미 있음 (단, 타입이 `Record<string, unknown>` bag으로 약함) | `src/features/agent/lib/buildAgentSnapshot.ts:32-65` |
| 계산 단일 경로 | `calculator.ts` 단일 경로 + 헌법으로 강제 | ✅ 문서보다 엄격 | `CLAUDE.md`, `src/lib/calculator.ts` |
| decision ledger | `decisionLog.ts` / `decisionStore.ts` / `DecisionLogWorkspace` | ✅ 이미 있음 | `src/features/decision-log/lib/`, `App.tsx:601` |
| role switcher (Dev/PM/CEO) | `RoleSelector` 헤더에 렌더됨 | 🟡 UI만 있음 | `src/components/RoleSelector.tsx`, `App.tsx:2704` |
| `projectSnapshotForRole` / `RoleViewModel` | **없음** | ❌ 미구현 | — |
| 역할별 KPI/primaryTable/secondaryPanels | **없음.** stage별로만 분기, role 무시 | ❌ 미구현 | `App.tsx:2531-2644` (stageWorkspace는 role 미참조) |
| 역할별 우측 AI 패널 | `DecisionAssistantPanel`은 stage + showInternal로만 분기, role 무참조 | ❌ role 미반영 | `App.tsx:954-` |
| 역할별 리포트 (Dev/PM/CEO Report) | 단일 `OnePageReportPanel`("CEO/CFO/PM/Developer Report") + SummaryCard audience 토글 | 🟡 audience 토글로 일부 대체 | `App.tsx:482-599`, `SummaryCard/index.tsx:114` |
| `ROLE_PACK` / `summaryTemplate` (역할별 라벨·톤) | **정의돼 있으나 어디서도 import 안 됨 = 죽은 코드** | ⚠️ 정리 필요 | `src/lib/roleLanguage.ts` (참조 0건) |

### 결정적 발견

1. **`state.role`은 거의 아무것도 안 한다.** 헤더에서 토글은 되지만, 실제로 그 값을 읽는 곳은 `SummaryCard`의 리포트 기본 청중 한 줄뿐이다(`index.tsx:114`). stage 콘텐츠도, 우측 AI 패널도 role을 안 본다. **즉 사용자가 [개발자]/[PM]/[CEO]를 눌러도 화면이 사실상 안 바뀐다.**
2. **`roleLanguage.ts`는 과거에 역할별 projection을 시도했던 흔적인데 지금은 연결이 끊겨 있다.** 살릴지 지울지 결정해야 한다.
3. **실제 projection 축은 `showInternal`이다** — `?debug=1` 또는 `?mode=admin`일 때만 내부 ref/tool chip/snapshot version을 노출(`App.tsx:1410-1414`). 이건 "Dev vs PM vs CEO"가 아니라 **"운영자 vs 고객"** 축이다.

---

## 3. 화면·코드를 역할별로 나눠야 하는가 — 그렇다, 단 두 축으로

### 3.1 역할별 정보 needs (문서 §3을 실제 패널에 매핑)

| 역할 | 핵심 질문 | 필요한 데이터 | 이미 있는 재료 |
|---|---|---|---|
| **Developer** | 왜 비용이 튀었나, 어디서 retry가 많나 | 모델별 비용, 토큰, latency, retry, cache, snapshot version, tool refs | `CostAttributionWorkspace`(model 축), `operationalSignals`, `agentSnapshot` |
| **PM** | 어떤 기능이 돈 먹나, 어느 플랜부터 열까 | 기능별 원가/마진, 고객군 영향, feature gating, CS 영향 | `unit-economics/`(margin, featureCost), `attribution`(feature 축), `riskCards` |
| **CEO** | 돈 남나, 누가 손해 고객인가, 가격 올릴까 | 총비용·매출·마진율, 손해 고객, 가격 시나리오, 1장 리포트 | `MarginRiskWorkspace`, `pricingScenario`, `OnePageReportPanel` |

→ **세 역할이 필요로 하는 숫자는 거의 다 이미 계산되고 있다.** 단지 한 화면에 다 쏟아붓고 있어서 누구에게도 최적화돼 있지 않을 뿐이다. **projection은 "새 계산"이 아니라 "기존 결과의 재배치 + 강조 순서 변경 + 군더더기 숨김"이다.**

### 3.2 핵심 설계 결정: role과 audience는 직교한다

문서가 놓친 부분이다. 화면을 가르는 축은 **두 개**다.

```text
축 1) role     : developer | pm | ceo      ← 무엇을 강조하나 (정보 선택·순서)
축 2) audience : internal  | customer       ← 얼마나 보여주나 (내부 ref 노출 여부)
                 (= 현재 showInternal)
```

- `internal × ceo` = 운영자가 보는 CEO 뷰: 손익 KPI + 내부 tool ref/snapshot version 노출
- `customer × ceo` = 고객 CEO에게 export하는 1장 리포트: 같은 숫자, 내부 ref는 "저장된 근거"로 마스킹 (이미 `customerSafeAgentText`로 부분 구현됨, `App.tsx:743`)

**이 둘을 하나로 합치면 안 된다.** projection 함수 시그니처는 `projectSnapshotForRole(snapshot, role, audience)` 로 가야 한다.

---

## 4. 점진적 반영 계획 (4단계)

원칙: **기존 stage·showInternal 구조를 깨지 않는다.** 각 Phase는 독립적으로 머지 가능하고, 각 단계 끝에 `npm run test:run` + `npm run build` 통과를 조건으로 한다(헌법).

### Phase 0 — 죽은 코드 정리 + 의사결정 (0.5일)

목적: 혼란 제거. 지금 `roleLanguage.ts`가 "role이 구현돼 있다"는 착각을 준다.

- [ ] `src/lib/roleLanguage.ts`의 `ROLE_PACK`/`summaryTemplate`이 정말 미사용인지 최종 확인 (grep 결과 참조 0건).
- [ ] **재사용 결정**: 살린다. `ROLE_PACK`의 `emphasisOrder`/`summaryTone`은 Phase 2 projection의 좋은 출발점이다. 단 현 위치(`src/lib`)가 아니라 `src/features/role-views/`(신규)로 이동.
- [ ] 이동 시 `src/lib/roleLanguage.ts`는 re-export 셔임만 남긴다 (folder-structure.md의 점진 마이그레이션 관례 준수).
- [ ] 실패 테스트 먼저: `roleLanguage`의 `ROLE_PACK[role].emphasisOrder`가 세 역할에서 서로 다른 순서를 반환하는지 확인하는 테스트 추가(TDD).

산출물: 죽은 코드가 "의도된 projection 입력"으로 승격되거나 삭제됨. 더 이상 미스리딩 없음.

### Phase 1 — 타입 있는 snapshot 경계 정의 (1~1.5일)

목적: 문서의 "DeterministicSnapshot"을 실제 타입으로. 지금 `AgentSnapshotPayload`는 `Record<string, unknown>` bag이라 projection이 타입 안전하지 않다.

- [ ] `src/features/role-views/snapshotTypes.ts` 신규: `RoleProjectionSnapshot` 타입 정의.
  - 이미 계산되는 값들을 한 곳에 모은 **읽기 전용 뷰 타입**이다 (새 계산 아님):
    ```ts
    interface RoleProjectionSnapshot {
      cost: { totalUsd: number; byModel: ModelCostRow[]; byFeature: FeatureCostRow[] }
      margin: { grossMarginPct: number; lossCustomers: CustomerMarginRow[]; planMargins: MarginRow[] }
      performance: { avgLatency?: number; retryRate?: number; cacheHitRate?: number }
      pricing: ScenarioResult[]
      risk: RiskCard[]
      meta: { snapshotVersion: string; formulaVersion: string; providerRegistryVersion: string }
    }
    ```
- [ ] `buildRoleProjectionSnapshot(deps)`: App.tsx가 이미 들고 있는 `attribution`, `planMargins`, `customerMargins`, `scenarios`, `teamCostEstimate`, `agentSnapshot`을 받아 위 타입으로 모으는 **순수 함수**. 계산은 기존 lib 재사용, 여기서 새 산술 금지.
- [ ] `src/lib/` 순수 함수 100% 커버리지 규칙에 따라 단위 테스트 동반.

산출물: 컴포넌트가 의존할 단일·타입 안전 projection 입력.

### Phase 2 — `projectSnapshotForRole` + RoleViewModel (2~3일)

목적: 문서 §6~§9의 핵심. 단 audience 축 포함.

- [ ] `src/features/role-views/roleViewModel.ts`:
    ```ts
    type Role = 'developer' | 'pm' | 'ceo'
    type Audience = 'internal' | 'customer'
    interface RoleViewModel {
      kpis: MetricCardModel[]
      primaryTable: TableModel
      secondaryPanels: PanelKey[]   // 렌더할 기존 패널의 key 목록
      assistant: { title: string; focus: string; refs: string[] }
      recommendedActions: ActionModel[]
    }
    function projectSnapshotForRole(
      snapshot: RoleProjectionSnapshot, role: Role, audience: Audience
    ): RoleViewModel
    ```
- [ ] `buildDeveloperView` / `buildPmView` / `buildCeoView` 구현. **secondaryPanels는 새 컴포넌트가 아니라 기존 패널의 key 리스트**를 반환한다 (예: dev=`['attribution:model','operationalSignals']`, pm=`['attribution:feature','marginRisk','riskCards']`, ceo=`['marginRisk','pricing','onePageReport']`). 재배치/숨김이 핵심.
- [ ] **TDD 가드레일 테스트(헌법 핵심)**: 같은 snapshot으로 세 역할 ViewModel을 만들어도 **공통 숫자(총 비용·마진율)는 동일**해야 한다. role이 다르면 순서/노출만 다르고 값은 같다.
- [ ] `audience='customer'`일 때 `assistant.refs`가 마스킹되는지 테스트 (`customerSafeAgentText` 재사용).

산출물: role을 누르면 실제로 화면 강조가 바뀌는 projection 계층.

### Phase 3 — 화면 주입 + 우측 AI 패널 + 리포트 (2~3일)

목적: projection을 실제 렌더에 연결. 주입 지점은 이미 특정됨.

- [ ] **stageWorkspace 주입** (`App.tsx:2531-2644`): 각 stage 분기 안에서 `const view = projectSnapshotForRole(snapshot, state.role, showInternal ? 'internal' : 'customer')`를 읽어 `view.secondaryPanels` 순서/포함 여부로 패널을 렌더. stage 구조는 유지, role이 그 안의 구성을 바꾼다.
- [ ] **우측 AI 패널** (`DecisionAssistantPanel`, `App.tsx:954`): props에 `role` 추가, `view.assistant.title/focus/refs`로 헤더와 ref를 역할별로 교체. (문서 §10 그대로, 단 기존 컴포넌트 확장)
- [ ] **리포트**: 단일 `OnePageReportPanel`을 유지하되 `role` prop으로 섹션 강조를 바꾼다. 완전 3분할(`DeveloperReport`/`PmReport`/`CeoReport`)은 비용 대비 효과가 낮으므로 **보류** — 이미 `SummaryCard`의 audience 토글이 절반을 한다. 대신 `OnePageReportPanel`이 `role`에 따라 섹션 순서를 `ROLE_PACK.emphasisOrder`로 정렬하게.
- [ ] **컴포넌트 테스트(헌법)**: `rerender`로 role을 바꿨을 때 KPI·패널 순서가 갱신되는지 검증. 정적 BASE_STATE만으로는 안 됨(헌법 명시).

산출물: [개발자]/[PM]/[CEO] 전환이 실제로 의미 있는 화면 차이를 만든다.

---

## 5. 가드레일 (문서 §13 + 헌법 통합)

이 작업이 헌법을 위반하지 않도록 다음 테스트를 반드시 동반한다.

1. **숫자 일관성**: 동일 snapshot → 세 역할의 공통 KPI(총비용·마진율) 값 동일. (문서 §13 + `CLAUDE.md` 페르소나 일관성)
2. **계산 금지**: role-view 함수와 컴포넌트에서 `calculator.ts` 외 산술 호출 금지. projection은 재배치만.
3. **포맷 단일 경로**: ViewModel의 표시 문자열은 `fmtCurrency`/`fmtPercent`/`fmtTokens` 통과 (inline `toFixed` 금지, 헌법).
4. **AI ref 강제**: `assistant.refs`가 비면 렌더 차단 (문서 §13).
5. **audience 마스킹**: `customer` audience에서 `tool:`/`snapshot:` ref가 원문 노출되지 않음.
6. **translate 보호 유지**: 새 역할별 영어 요약 블록은 `lang="en"`, 숫자/모델명은 `translate="no"` (헌법, feedback round 1 회귀 경로).
7. **state sync**: 모든 role-view 컴포넌트 테스트는 `rerender`로 role 변경 시 갱신 검증 (헌법).

---

## 6. 추가 발전 가능 영역 (이번 범위 밖, 백로그)

- **Developer 뷰의 실측 신호 부족**: latency/retry/cache는 현재 대부분 가정(assumption)값이다(`MODEL_PERF_MATRIX`의 `qualityBasis: 'assumption'`). 진짜 Developer 가치를 주려면 import한 usage 로그에서 retry/latency를 **실측**으로 끌어올리는 파이프라인이 필요하다. 그 전까지 Developer 뷰는 "가정 기반"임을 배지로 명시.
- **stage 통합**: 문서 §4의 10단계 vs 실제 5단계 간극. 단계를 늘리기보다, 현 5단계에 role projection을 먼저 입히고 사용 데이터를 본 뒤 stage 추가 여부를 판단.
- **URL 상태 공유**: `role`은 이미 URL config(`App.tsx:1469`)에 들어간다. audience(`?mode=admin`)도 URL이다. 역할별 화면을 그대로 공유 링크로 만들 수 있으니, "PM 뷰 링크 공유" 같은 기능으로 발전 가능.
- **역할별 기본 stage**: CEO는 Decision Log/리포트로, Developer는 Cost로 진입하는 게 자연스럽다. role 선택 시 권장 stage로 점프하는 UX 검토.

---

## 2026-05-25 Implementation Status

Role projection is now wired into the real stage workspace card order.

- `projectSnapshotForRole(...).panelOrder` is applied through `orderWorkspacePanels` in `App.tsx`.
- Stage cards keep their existing content and are reordered, not duplicated or dropped.
- The first role-prioritized card receives the visible emphasis ring.
- Regression coverage lives in `App.test.tsx`: CEO view moves `margin_risk` before `cost_attribution`, Developer view moves `operational_signals` before `margin_risk`, and required cards remain present after role switching.

The earlier note that `stageWorkspace` stays in a fixed order is no longer current.

---

## 7. 작업 순서 요약

```text
Phase 0  죽은 roleLanguage 정리 + role-views로 승격        (0.5d)
Phase 1  RoleProjectionSnapshot 타입 + 빌더 (순수함수)      (1~1.5d)
Phase 2  projectSnapshotForRole + 3개 view + 가드레일 테스트 (2~3d)
Phase 3  stageWorkspace/우측패널/리포트에 주입 + 컴포넌트 테스트 (2~3d)
─────────────────────────────────────────────────────────
총 ~6~8일. 각 Phase 독립 머지, 매 Phase 끝 test:run + build 통과.
```

핵심 메시지 한 번 더: **계산·snapshot·ledger는 이미 하나로 잘 모여 있다. 우리가 채워야 할 건 그 위의 역할별 projection 한 겹뿐이고, 필요한 숫자는 대부분 이미 계산되고 있다.**
