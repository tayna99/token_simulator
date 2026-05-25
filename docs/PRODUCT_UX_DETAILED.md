# PRODUCT_UX_DETAILED: AI Team Cost Simulator(AI 팀 비용 시뮬레이터) — 상세 UI/UX 기획

작성일: 2026-05-23  
상위 문서: `docs/PRODUCT_UX.md` (원칙) · `DESIGN.md` (Wanted Montage/WDS 디자인 시스템 — 랜딩·앱 공통 토큰/컴포넌트 권위)  
성격: **빌드 가능한 상세 스펙.** PRODUCT_UX.md의 원칙을 단계별 contract(계약), component anatomy(컴포넌트 구성), 상태 매트릭스, App.tsx 분리 설계로 구체화한다.

## 0.1 Google I/O 2026 반영 상세 스펙 (2026-05-24)

### 모델 상태 표시

| 상태 | 의미 | 고객 화면 | Admin/debug 화면 |
| --- | --- | --- | --- |
| `verified` | 공식 API 단가로 계산 가능 | 모델 선택 가능, 단가 반영 badge(배지) | source URL, lastVerifiedAt, priceSourceUrl |
| `estimated` / `tbd` | 후속 확인 필요 | 계산 전 경고 | 추정/미정 사유, 검증 작업 링크 |
| `unavailable` | 공식 발표 모델이지만 API 가격 미공개 | 모델 레이더에는 표시, 계산 선택은 비활성화 | announcement URL, pricing unavailable reason |

### Google I/O 2026 모델별 처리

- Gemini 3.5 Flash: 계산 가능 모델. text input/output, context caching(반복 입력 캐싱), batch(일괄 처리) 할인 단가를 Fact Ledger(사실 장부)에 저장한다.
- Gemini 3.5 Pro: 발표 모델. API 가격 미공개이므로 계산 비활성, 사용자 단가 입력이 있어야 시나리오 계산 가능.
- Gemini Omni / Gemini Omni Flash: 발표 모델. 비디오/멀티모달 capability로 표시하되 공식 API 단가가 나오기 전까지 비용/절감액 계산 금지.

### 고객/admin 노출 분리

- 고객 화면: “최신 단가 반영”, “가격 출처 확인일”, “공식 API 단가 확인 필요”, “사용자 단가 입력 시 계산 가능”만 노출한다.
- Admin/debug 화면: `tool:*`, `asset:*`, `snapshot:*`(그 시점의 분석 데이터 묶음), source URL, agent route(에이전트 실행 경로), stale warning(오래된 정보 경고), pricing unavailable reason(가격 미공개 사유)을 표시한다.
- Decision Log와 Report는 고객 화면에서 요약 중심으로 렌더하고, 내부 ref는 admin/debug 모드에서만 펼친다.

### 멀티모달 비용 skeleton(골격)

- `calculateCost`의 text-token 경로는 유지한다.
- `calculateModalityCost`와 `calculateMultimodalScenario`는 image/audio/video/search/cache storage 차원을 받되, 공식 단가가 없으면 숫자 0이 아니라 `unsupported_pricing`을 반환한다.
- Agent/LLM은 미공개 단가를 생성하지 않는다. 필요한 숫자가 없으면 `snapshot_missing` 또는 `unsupported_pricing` warning을 반환한다.

> 진단 요약(이미 합의됨): 방향과 핵심 부품은 맞다. 다음 작업은 **새 기능 추가가 아니라** (1) 부품을 "단계별 판단 흐름"으로 재배치, (2) App.tsx 책임 축소, (3) 숫자/AI/리스크/결정의 시각 분리 강화, (4) 디자인 부채(apple-*) 청산이다.

---

## 0. 설계 불변식 (모든 화면에 적용)

1. **숫자는 deterministic(결정론 계산), 해석은 AI.** 표시 숫자는 전부 `src/lib/format.ts`(`fmtCurrency`/`fmtPercent`/`fmtTokens`)만 통과. AI 문장은 숫자를 만들지 않고 `tool:*` chip(작은 근거 배지)으로 인용.
2. **모든 AI 문장 옆에 chip.** `tool:*`(숫자 출처) 또는 `risk:*`(리스크 근거). chip 없는 AI 문장은 렌더 금지 — 컴포넌트 레벨에서 강제(§4.1).
3. **결정은 사람.** AI는 Adopt/Reject하지 않는다. optimization 채택 버튼은 risk card가 붙어야만 활성.
4. **단계 이동이 곧 진행.** 좌측 nav는 라벨만 바꾸지 않고 중앙 작업대를 교체한다(현재 끊김의 핵심 수정).
5. `translate="no"` + `<meta name="google" content="notranslate">` 유지. apple-* 토큰/클래스는 앱 본체에서 제거(§7).

---

## 1. 결정 흐름 spine — 단계별 UX Contract

각 단계를 "진입 조건 → 중앙 작업대 → 우측 패널 → 완료(다음 이동) 기준 → 상태"로 못박는다. 여기서 spine은 제품의 판단 흐름을 지탱하는 중심축이라는 뜻이다.

### 1.1 Design

| 항목 | 내용 |
| --- | --- |
| 진입 조건 | 없음(시작점). 빈 상태면 Sample 로드 유도. |
| 중앙 작업대 | 회사/단계/예산 입력 · 업무 카탈로그(빈도) · Agent I/O 에디터(모델, calls, retry, review gate) |
| 우측 패널 | Onboarding 해석("이 구성으로 비용화 가능") · 누락 입력 경고(예: review gate 미설정) |
| 완료 기준 | 회사·업무량·Agent I/O·모델·review gate가 **모두** 채워져 비용 계산 가능 → "Cost 단계로" 활성 |
| 상태 | Empty/Sample · Assumption-based(기본 입력) |
| 컴포넌트 매핑 | `CompanyWorkInputPanel`, `AITeamSpecPanel`(team-cost) |

### 1.2 Cost

| 항목 | 내용 |
| --- | --- |
| 진입 조건 | Design 완료(비용 계산 가능 입력) |
| 중앙 작업대 | 월 비용 metric tile · Agent별 비용 table(요청수/토큰/원가/share) · 예산 대비 게이지 |
| 우측 패널 | Cost Analyst 해석("48%가 Engineering Agent") + `tool:monthlyCost` chip |
| 완료 기준 | 월 비용·요청수·토큰·상위 비용 Agent가 보이고, 사용자가 "예산 대비 허용/병목 보기" 선택 가능 |
| 상태 | Assumption-based · Plan vs Actual(실측 들어오면) |
| 컴포넌트 매핑 | `TeamCostForecastPanel`, `MetricTile`, `DataTable`, `CostShareChart` |

### 1.3 Bottleneck

| 항목 | 내용 |
| --- | --- |
| 진입 조건 | Cost 산출됨 |
| 중앙 작업대 | 병목 분해: 비용 share / retry / human review / 재로드 입력(캐싱 후보) / deliverable 성과 병목을 **분리된 행**으로 |
| 우측 패널 | "왜 병목인가" 해석 + `tool:*` chip. deliverable 성과(처리량/재작업률)도 인용 |
| 완료 기준 | 어디를 먼저 고칠지 1개 이상 선택 → Optimize로 |
| 상태 | Assumption-based · Plan vs Actual |
| 컴포넌트 매핑 | `bottleneckAnalysis`, `deliverableMetrics`, `DataTable` |

### 1.4 Optimize + Risk

| 항목 | 내용 |
| --- | --- |
| 진입 조건 | 병목 1개 이상 선택 |
| 중앙 작업대 | 절감안 카드(before/after 비용, 검토시간, 고위험 자동실행 수) · 차트(before/after) |
| 우측 패널 | Optimization 해석 + **Risk Auditor 카드**(영향/조건/안전망, 근거 ID) + Operating Decision(운영 결정) 컨트롤(Approve/Automate/Authority/Policy/Attribution) |
| 완료 기준 | 각 절감안에 채택/거부 결정 → 결정 시 Decision Log로 흐름 |
| 상태 | Post-decision(결정 후) · Failure(LLM/remote 미가용 → deterministic fallback) |
| 컴포넌트 매핑 | `optimizationPolicies`, `pricingScenario`, `RiskCard`, `OperationDecisionControls` |

### 1.5 Decision & Approval Log

| 항목 | 내용 |
| --- | --- |
| 진입 조건 | 1개 이상 결정 발생 |
| 중앙 작업대 | ledger(결정/이유/종류/상태/tool refs/risk refs/가정 스냅샷) · Plan vs Actual 카드 |
| 우측 패널 | 다음 보정 CTA("실측 usage 올려 가정 검증") |
| 완료 기준 | 결정이 재현 가능하게 저장(스냅샷 포함) + export 가능 |
| 상태 | Post-decision · Plan vs Actual · Failure(remote store off → local fallback 명시) |
| 컴포넌트 매핑 | `DecisionLogPanel`, `decisionLog`, `decisionStore` |

---

## 2. SparkClaw 9-step → spine 매핑 (데모 스크립트)

9단계는 좌측 nav의 보조 progress이고, 중앙은 해당 stage 작업대로 전환된다.

| Step | Spine 단계 | 중앙 작업대 | 우측 패널(데모 대사) |
| --- | --- | --- | --- |
| 1 회사 유형 | Design | 회사/예산 입력 | "1인 B2B SaaS / 월 30만원으로 시작" |
| 2 업무 선택 | Design | 업무 카탈로그 체크 | "이 업무들을 AI로 옮기는군요" |
| 3 Agent 배정 | Design | Agent I/O 에디터 | "Research Agent 입력/출력 정의 — 토큰 계산 가능" |
| 4 빈도/문서량 | Design | 빈도 입력 + 벤치마크 | "비슷한 팀 평균 주3회 — 현재 3배 ⚠️" |
| 5 비용 계산 | Cost | 월 비용 tile + 표 | "월 예상 61만원, `tool:monthlyCost`" |
| 6 병목 | Bottleneck | 병목 분해 표 | "48% Engineering, Research 재로드 → 캐싱" |
| 7 최적화안 | Optimize+Risk | 절감안 카드 | "Haiku 라우팅 + Risk Card(의료 키워드 정확도↓)" |
| 8 최적화 후 비교 | Optimize+Risk | before/after 차트 | "61만→28만, 검토 2h→40m, 고위험 5→1" |
| 9 Decision Log | Decision Log | ledger row 생성 | "왜 이 라우팅을 택했는지 + 가정 스냅샷 기록" |

진행 감각: 각 step 완료 시 좌측 progress가 `done`으로 채워지고, 마지막 step만 `needs save`가 아니라 **각 단계가 ready→active→done**으로 전이한다(현재 "마지막만 needs save" 문제 수정).

---

## 3. 레이아웃 상세 (3-pane, 반응형)

### 3.1 데스크톱 (≥1200px, WDS `lg`)

```
┌──────────────┬───────────────────────────────┬──────────────────┐
│ 좌측 280px    │ 중앙 (flex, 고밀도 허용)        │ 우측 360px        │
│ Lifecycle nav │ active stage 작업대만 노출      │ AI 해석/리스크/결정 │
│ 9-step prog.  │ forms·tables·metric·charts     │ tool/risk chips   │
│ Agent list    │                                │ decision controls │
└──────────────┴───────────────────────────────┴──────────────────┘
```

중앙은 밀도를 높이되 **active stage만** 우선 노출(현재 "긴 문서 위 라벨만 바뀜" 수정). 그리드 24px 거터, 카드 간 16px, inline 8px(WDS 리듬).

### 3.2 태블릿 (768–1199px, `sm`/`md`)

- 우측 패널 → 중앙 하단 sticky **Decision Bar**(해석 1줄 + chip + Adopt/Reject)로 축소, 탭으로 전체 펼침.
- 좌측 nav 유지(좁게).

### 3.3 모바일 (<768px, `xs`)

- 좌측 nav → 상단 **segmented control**(단계 전환).
- 우측 패널 → 하단 **drawer**(또는 sticky decision bar). 3열을 그대로 접지 않는다(판단 흐름 소실 방지).
- 표는 top 3 + "더보기", 차트는 단일 지표 우선.

---

## 4. 핵심 컴포넌트 스펙 (anatomy / props / states)

WDS 토큰 사용. 모든 신규 컴포넌트는 `*.test.tsx` 동반(헌법: state 변화 검증).

### 4.1 ToolRefChip — AI 신뢰의 핵심

```tsx
interface ToolRefChipProps { kind: 'tool' | 'risk'; id: string }  // id: 'tool:monthlyCost' | 'risk:credit-confusion'
```
- tool: 중립 톤(`fill-alternative`), risk: cautionary(주의) 톤.
- **강제 규칙**: AI 문장 컴포넌트(`AIAnnotation`)는 `refs: string[]`가 비면 렌더 자체를 막거나 "근거 없음" 경고 표시. → 진단의 "chip 일관성" 해결.

### 4.2 AIAnnotation — 해석 callout(짧은 주석 박스)

```tsx
interface AIAnnotationProps { text: string; refs: string[]; tone?: 'analysis' | 'pricing' | 'report' }
```
- 숫자 metric과 **다른 스타일**: 연한 배경 callout, 좌측 강조선, 짧은 문장. 고정폭 metric tile과 시각적으로 구분.
- 하단에 `refs`를 ToolRefChip로 렌더. refs 없으면 렌더 거부.

### 4.3 MetricTile / DataTable — deterministic 숫자

- MetricTile: 큰 숫자(format.ts), 라벨, 보조 delta. `translate="no"`. 단단한 톤.
- DataTable: 숫자 우측정렬, 이름 좌측정렬, top 5 기본 + 확장. **inline 계산/포맷 금지**(헌법). 정렬 가능 컬럼.

### 4.4 CostChart (share / before-after / plan-vs-actual)

- 의사결정 질문이 있을 때만. bar(share/before-after), line(plan vs actual).
- tooltip도 `fmtCurrency`/`fmtPercent`/`fmtTokens`. Recharts 재사용.

### 4.5 PlanVsActualCard

```tsx
interface PlanVsActualCardProps {
  planned: number; actual: number; variancePct: number
  cause?: string; suggestedPatch?: string; decisionRequired: boolean
}
```
- 고정 구조: planned / actual / variance / 원인 / 제안 patch / 결정 필요 배지.

### 4.6 RiskCard

```tsx
interface RiskCardProps { id: string; severity: 'low'|'med'|'high'; impact: string; condition: string; mitigation: string; evidenceId: string; onAction?: () => void }
```
- cautionary/negative 톤 + 근거 ID 노출 + **mitigation/action CTA**(진단 보강 지점).
- 이 카드가 없으면 연결된 Adopt 버튼 비활성.

### 4.7 OperationDecisionControls — Human Operating Decision

```tsx
type DecisionKind = 'approve'|'automate'|'authority'|'policy'|'attribution'|'ownership'
interface OperationDecisionControlsProps { kinds: DecisionKind[]; onDecide: (kind: DecisionKind, note: string) => void; adoptionEnabled: boolean }
```
- OK/Reject만이 아니라 6종 운영 결정(고도화 문서 축2). `adoptionEnabled`는 risk card 유무로 결정.

### 4.8 DecisionLogRow — ledger(장부) (JSON pre 탈피)

```tsx
interface DecisionLogRowProps {
  what: string; why: string; kind: DecisionKind
  status: 'adopted'|'rejected'|'superseded'
  toolRefs: string[]; riskRefs: string[]
  assumptions: Record<string,string>; snapshotRef: string; ts: string
}
```
- 필드를 **분리 렌더**(현재 JSON pre 중심 → ledger UX). 상태 배지, chip, 스냅샷 펼침.

### 4.9 Form Field — validation 표준

```tsx
interface FieldProps { label: string; help?: string; state?: 'default'|'invalid'|'assumption'; error?: string; ... }
```
- `invalid`(빨강 + error text), `assumption`(노랑 라벨), `default`. `Number.isFinite()` 가드, 잘못된 값 → `0`/`—`. 토큰량은 artifact template 기본값 제시(직접 추측 금지).

---

## 5. 상태 매트릭스

각 단계 × 5상태. (●=주요, ○=가능)

| 상태 | Design | Cost | Bottleneck | Optimize | Decision Log |
| --- | :--: | :--: | :--: | :--: | :--: |
| Empty/Sample | ● | ○ | ○ | ○ | ● |
| Assumption-based | ● | ● | ● | ● | ○ |
| Plan vs Actual | ○ | ● | ● | ● | ● |
| Post-decision | ○ | ○ | ○ | ● | ● |
| Failure/Fallback | ● | ● | ● | ● | ● |

- **Assumption-based**: 노란 라벨 + 조정 가능. (현재 약함 → 강화)
- **Failure/Fallback**: remote store off → local fallback 명시, LLM off → deterministic fallback event 명시, invalid input → field error, missing tool refs → AI 문장 렌더 거부. 조용하되 숨기지 않음.

공통 컴포넌트: `StateBanner`(상태 + 안내 + CTA 1개).

---

## 6. 디자인 부채 청산 (apple-* 완전 제거)

DESIGN.md가 Wanted Montage로 확정되면서 **랜딩도 Montage**다. 따라서 `apple-*` 토큰/클래스는 갈 곳이 없다 — Landing으로 "이전"이 아니라 **전부 제거**한다.

| 부채 | 위치 | 조치 |
| --- | --- | --- |
| `apple-utility-surface` 클래스 | `src/shared/ui/primitives.tsx` Surface | WDS 토큰 클래스(`bg-surface-normal`/`border-line-neutral`/`rounded-wds-lg`)만 남기고 apple 클래스 제거 |
| `--apple-*` 토큰 | `src/styles/montage.css` | **제거.** 랜딩도 Montage라 재사용처 없음 |
| Apple gallery/tile 스타일 | montage.css | 제거. 앱·랜딩 모두 Montage(화이트+`#F7F7F8`/`#F0F4F8` 패널, 12px 카드, gutter 분리) |
| 테스트 기대 | `App.test.tsx` | Apple gallery class 기대 제거(완료 기준에 이미 있음) |

원칙: **단일 웹앱 + Montage/WDS.** P1부터 별도 랜딩 라우트를 만들지 않고, 첫 화면 온보딩과 제품 workspace를 하나의 웹앱으로 합친다. 서체는 Pretendard 단일 서체로 통일하며, `LANDING_UX.md`는 웹앱 첫 화면의 참고 문서다. 공통 금지(glass/그라데이션 텍스트/네온) 유지.

---

## 7. App.tsx 분리 설계 (책임 축소)

현재 App.tsx가 상태·계산 orchestration·remote fallback·decision 저장·agent runtime·layout을 모두 들고 있어 UX 변경 비용이 큼. 아래로 분해.

### 7.1 컴포넌트 트리

```
WorkspaceShell                ← 3-pane 레이아웃 + 반응형(좌/중/우 슬롯)
├─ LifecycleNavigation        ← 단계 nav + 9-step progress + Agent list + 상태 badge
├─ DecisionStageWorkspace     ← active stage에 맞는 중앙 작업대만 렌더(라우터)
│   ├─ DesignStage  (CompanyWorkInputPanel + AITeamSpecPanel)
│   ├─ CostStage    (TeamCostForecastPanel + MetricTile/DataTable/CostChart)
│   ├─ BottleneckStage
│   ├─ OptimizeStage(절감안 + RiskCard + OperationDecisionControls)
│   └─ DecisionLogStage (DecisionLogPanel)
├─ DecisionAssistantPanel     ← 우측 AI 패널(해석 + chip + risk + 결정 버튼)
└─ StateBanner                ← 상태 표시(전 단계 공용)
공용: ToolRefChip, AIAnnotation, PlanVsActualCard
```

### 7.2 책임 / 상태 소유

| 컴포넌트 | 책임 | 상태 소유 |
| --- | --- | --- |
| `WorkspaceShell` | 레이아웃, 반응형, 슬롯 배치 | 없음(prop drilling 최소화 위해 context 사용) |
| `LifecycleNavigation` | 단계 전환, 진행 표시 | `activeStage`(context) |
| `DecisionStageWorkspace` | active stage 라우팅 | 없음 |
| `DecisionAssistantPanel` | agent runtime 호출, 해석/리스크/결정 표시 | `agentEvents`, `riskCards` |
| 도메인 훅 `useTeamCostModel` | calculateCost/estimate/attribution orchestration | 계산 입력/결과 |
| 도메인 훅 `useDecisionLog` | decisionLog + remote/local fallback | decisions |

→ App.tsx는 `WorkspaceShell`에 context provider만 꽂는 ~30줄로 축소.

### 7.3 keep / modify / extract

| 분류 | 대상 |
| --- | --- |
| **유지(변경 없음)** | `calculateCost`, `estimateAgentWorkload`, `runAgent`, `runTeamCostAgentRuntime`, `decisionLog`, `pricingScenario`, `attribution`, `margin` |
| **수정** | `App.tsx`(축소), `primitives.tsx` Surface(apple 제거), `montage.css`(apple-* 토큰 제거), `AgentReportWorkspace`(chip 보강), `DecisionLogWorkspace`(ledger row) |
| **신규 추출** | `WorkspaceShell.tsx`, `LifecycleNavigation.tsx`, `DecisionStageWorkspace.tsx`, `DecisionAssistantPanel.tsx`, `DecisionLogPanel.tsx`, `ToolRefChip.tsx`, `StateBanner.tsx`, `AIAnnotation.tsx`, 훅 `useTeamCostModel.ts`/`useDecisionLog.ts` |

---

## 8. Decision & Approval Log row 스키마 (확정)

```jsonc
OperatingDecision {
  id, ts,
  kind: 'approve'|'automate'|'authority'|'policy'|'attribution'|'ownership',
  what,                      // "CS Agent 모델 Sonnet→Haiku"
  why,                       // Optimization+Risk 근거 요약
  status: 'adopted'|'rejected'|'superseded',
  toolRefs: string[],        // 'tool:*'
  riskRefs: string[],        // 'risk:*' (adopted면 1개 이상 필수)
  assumptions: Record<string,string>,   // 가정 스냅샷
  performanceSnapshot?: { throughput, reviewPassRate, costPerDeliverable },
  snapshotRef: string        // 그때 상태 재현 키
}
```
- UI: row를 필드별 분리 렌더(JSON pre 아님). adopted는 risk chip 필수 표시.

---

## 9. 구현 시퀀스 (TDD, 단계별)

1. **공용 컴포넌트 먼저**: `ToolRefChip`, `AIAnnotation`(refs 없으면 렌더 거부), `StateBanner` + 테스트.
2. **Shell 분해**: `WorkspaceShell` + `LifecycleNavigation` + `DecisionStageWorkspace` 추출, App.tsx 축소.
3. **단계 라우팅**: 좌측 nav가 중앙 stage를 실제 교체(끊김 수정) + 진행 상태 ready→active→done.
4. **우측 패널 통합**: `DecisionAssistantPanel`에 해석/chip/risk/결정 묶고, 모든 AI 문장에 chip 강제.
5. **Decision Log ledger**: `DecisionLogRow` + 스키마(§8) + Plan vs Actual 카드.
6. **디자인 부채 청산**: Surface/montage.css apple-* 제거(§6).
7. **상태 강화**: assumption/validation/fallback 상태를 UI contract로(§5).

각 단계: 실패 테스트 → 최소 구현 → `npm run test:run` + `npm run build` 통과 → 커밋.

---

## 10. 완료 기준 (PRODUCT_UX.md §9 확장)

- 좌측 nav 클릭이 **중앙 작업대를 교체**한다(라벨만 바뀌지 않음).
- 모든 AI 문장에 `tool:*` 또는 `risk:*` chip이 보인다(중앙 agent report 영역 포함).
- risk card 없이 optimization adoption 불가.
- App.tsx가 레이아웃/계산/저장/runtime을 직접 들지 않는다(훅·하위 컴포넌트로 이전).
- `apple-utility-surface` 등 apple-* 클래스/토큰이 앱 본체에서 사라진다.
- 5상태(Empty/Assumption/PlanVsActual/Post-decision/Failure)가 각 단계에서 정의된다.
- Decision Log가 JSON pre가 아니라 필드 분리 ledger로 렌더된다.
- `translate="no"`, `notranslate` meta 유지. `npm run test:run`/`npm run build` 통과.

---

## 11. 결정 필요 / 열린 항목

- 단계 전환 상태(`activeStage`)를 URL query로 둘지(공유/딥링크 vs 단순 state) — 데모 공유엔 URL이 유리.
- 모바일에서 우측 패널을 drawer로 할지 sticky decision bar로 할지 — 데모 시연 환경(데스크톱 위주)이면 후순위.
- Plan vs Actual은 P1(실측 연동) 의존 — P0 데모에선 mock 스냅샷으로 시연.
## 12. Official Research Watchtower 상세 스펙 (2026-05-24)

### 목적

공식 가격/모델 조건은 제품의 Fact Ledger(사실 장부)다. 새 모델 발표나 가격 변경을 사람이 매번 수동으로 찾으면 I/O 같은 발표를 놓친다. Watchtower(공식 source를 감시하는 내부 검토함)는 공식 source를 감시하고, 모델/가격 후보를 inbox(검토함)에 넣고, 사람이 검토한 뒤 Fact Ledger로 승격시키는 내부 운영 표면이다.

### 데이터 구분

| 구분 | 설명 | 고객 화면 | admin/debug 화면 |
| --- | --- | --- | --- |
| `modelOwner` | 모델을 만든 회사/모델군 | 필요 시 provider 이름만 표시 | Qwen, Kimi, GLM, Doubao 등 taxon 표시 |
| `servingProvider` | 실제 API/클라우드로 서빙하는 플랫폼 | “Baidu Qianfan hosted” 같은 요약 | first-party/cloud-hosted/third-party router 구분 |
| `pricingRegion` | 가격 적용 지역 | “중국 본토 가격 / 국제 가격 다름” | region, endpoint, source language |
| `currency` | 원본 가격 통화 | 계산 가능 여부만 표시 | native price, normalized USD, FX snapshot |
| `officialSourceTrust` | 근거 종류 | 공식 가격/공식 발표 정도만 표시 | official_pricing, official_cloud_hosted, radar 등 |

### 후보 상태

- `detected`: 공식 source에서 새 후보가 발견됨.
- `needs_pricing_review`: 가격 후보가 있거나 가격 미공개 상태를 사람이 검토해야 함.
- `needs_region_review`: 지역/endpoint가 불명확함.
- `needs_fx_review`: CNY/JPY/EUR 가격은 있으나 USD 환산 snapshot이 없음.
- `accepted`: 사람이 Fact Ledger 반영을 승인함.
- `rejected` / `superseded`: 반영하지 않거나 더 최신 후보로 대체됨.

### Agent 연결

- Provider/API Intelligence Agent: 공식 source registry, pricing candidates, stale source를 검토한다.
- Knowledge/Release Ops Agent: 릴리즈노트/발표 변경 맥락을 요약한다.
- Cost Engine/QA Agent: candidate가 deterministic cost engine에 들어갈 수 있는지 검증한다.
- 어떤 Agent도 가격, 환율, 평균, 절감액을 새로 만들 수 없다.
