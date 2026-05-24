# PRD v0.4 (Architecture): AI Team Operations Workspace — AI Native 구현 아키텍처

작성일: 2026-05-22  
성격: **기술 아키텍처 PRD** (제품 PRD가 아니라, 그것을 어떻게 구현하는가)  
상위 문서:
- `docs/research/ai-saas-cost-margin-prd.md` (v1.0, Wedge B)
- `docs/research/2026-05-22-ai-saas-cost-margin-prd-v2.md` (v2.0, AI Native 프레이밍)
- `2026-05-22-ai-team-ops-workspace-prd.md` (v0.3, Wedge A+B 통합, AITeamConfiguration)

이 문서는 위 세 PRD가 **무엇을** 만들지 정의한 것을 받아, **어떻게** 만들지를 정의한다. 코드베이스 현황 진단 → 시스템 아키텍처 → LLM 실행 모델 → Agent 아키텍처(서브에이전트 포함) → Tool Contract → RAG 설계 → 구현 단계 순서로 간다.

---

## 0. 문서 간 관계 — 충돌하지 않는다

| 문서 | 무엇을 정의 | 이 문서와의 관계 |
| --- | --- | --- |
| v1.0 | Wedge B (사후형 마진/가격 분석) | v0.4의 Wedge B 경로로 그대로 흡수 |
| v2.0 | "계산은 deterministic, 해석은 AI" 프레이밍 + 6화면 + MVP1/2/3 | v0.4의 **절대 원칙**과 동일. 충돌 없음 |
| v0.3 | Wedge A 추가, AITeamConfiguration 단일 객체, 5개 Agent, Risk Card, Decision Log | v0.4가 **구현 레이어로 구체화** |

핵심 확인: v2.0 §6.1과 v0.3 §8.1은 **같은 원칙**을 말한다 — *숫자는 deterministic 엔진, 해석·서술은 AI Agent*. 이 문서는 그 원칙을 깨지 않고, 그 위에 LangGraph 기반 Agent 그래프와 RAG를 얹는다.

> v0.4가 새로 결정하는 것: (1) LLM을 어디서 실행하나, (2) 어떤 Agent 프레임워크, (3) Agent가 deterministic 엔진을 어떻게 호출하나(Tool Contract), (4) RAG corpus와 검색 경로, (5) Decision Log를 어디에 저장하나, (6) 기존 client-only 헌법과의 충돌을 어떻게 푸나.

---

## 1. 코드베이스 현황 진단 (구현 가능성)

### 1.1 현재 스택

`C:\token_simulator` — **클라이언트 사이드 only.** Vite 6 + React 18 + TS 5 + Tailwind 3 + Recharts + i18next + jsPDF/html-to-image. 서버 없음, DB 없음, LLM 연동 없음 (`CLAUDE.md` 헌법에 명시).

```
src/
  domain/cost/calculator.ts        ← 단일 계산 경로 (calculateCost, calculateMigrationDelta)
  features/usage/lib/usageImport.ts ← CSV 파싱 + feature roll-up
  features/unit-economics/lib/unitEconomics.ts ← feature 단위 gross margin
  features/savings/lib/savingsLevers.ts ← 절감 레버 5종
  lib/format.ts                    ← 표시 포맷 단일 경로
  app/App.tsx                      ← 단일 페이지, SimState/PlannerState
```

### 1.2 재사용 가능한 자산 (이미 있음)

| 자산 | 파일 | PRD 요구와의 매핑 | 상태 |
| --- | --- | --- | --- |
| Deterministic 계산 엔진 | `domain/cost/calculator.ts` | v0.3 §8.1 "Deterministic" 전부 | ✅ 견고. 헌법으로 단일 경로 보호 |
| CSV usage import | `features/usage/lib/usageImport.ts` | 화면1 Import, 스키마 파싱 | ⚠️ feature만 집계. customer 파싱O/집계X |
| Feature gross margin | `features/unit-economics/lib/unitEconomics.ts` | 화면3 Margin (일부) | ⚠️ feature 단위만, plan/customer 없음 |
| 절감 레버 (model/cache/batch/cap/routing) | `features/savings/lib/savingsLevers.ts` | 화면4 Optimization (일부) | ⚠️ "절감"이지 "가격정책 시뮬"은 아님 |
| 모델 가격 데이터 | `features/alternatives/data/models.ts` | 비용 계산 입력 | ✅ 25+ 모델, 출처/검증일 포함 |
| 역할 언어 (dev/pm/ceo) | `lib/roleLanguage.ts`, `RoleSelector` | 화면5 Report 페르소나 | ✅ 리포트 4종의 기반 |
| 리포트/내보내기 | `features/report/.../SummaryCard`, jsPDF | 화면5 Report Output | ⚠️ 1종 존재. 4종 분리 필요 |
| 포맷 단일 경로 | `lib/format.ts` | 자동번역 회귀 방지 | ✅ 헌법 보호 |
| 테스트 문화 | vitest, `*.test.ts(x)` | 전 영역 | ✅ TDD, lib 100% 커버리지 규칙 |

### 1.3 새로 만들어야 하는 것 (gap)

| Gap | 설명 | 의존성 | 난이도 |
| --- | --- | --- | --- |
| 다축 attribution roll-up | customer/plan/session/agent-run 집계 (현재 feature만) | 기존 calculator 재사용 | 중 (순수 함수) |
| Plan-level margin / customer profitability / heavy-user 탐지 | plan_id × revenue → gross margin, top-decile share | denominator 입력 | 중 (순수 함수) |
| 가격정책 시뮬레이터 | flat/usage/credit/hybrid/cap/overage 모델별 재계산 | calculator 재사용 | 중~상 |
| **Agent 레이어** | Onboarding/Cost Analyst/Optimization/Risk Auditor/CFO Reporter | **LLM 실행 환경** | 상 (신규 인프라) |
| **영속성** | Decision Log, AITeamConfiguration, 주간 히스토리 | 저장소 결정 | 상 (헌법 충돌) |
| **RAG** | 벤치마크, Risk Card 카탈로그 | corpus + 검색 | 상 (신규) |
| Team Designer / AITeamConfiguration | Wedge A 조직도·Agent 카드·org chart | 신규 객체 | 상 |
| Sample Data Generator | 5개 시나리오 synthetic CSV | 신규 | 중 |
| 주간 리뷰 / Plan vs Actual | 반복 리포트, 가정 vs 실측 | 영속성 + 스케줄 | 상 |

### 1.4 한 줄 결론

> deterministic 절반은 이미 있다. **AI Native가 되려면 (a) LLM 실행 환경, (b) 영속성, (c) RAG** — 이 세 가지 신규 인프라가 핵심이고, 이게 현재 "client-only, 서버 없음" 헌법과 직접 충돌한다. v0.4는 이 충돌을 단계적으로 푼다 (§9).

---

## 2. 시스템 아키텍처 (목표 상태)

### 2.1 4개 레이어

```
┌─────────────────────────────────────────────────────────────┐
│ L1. Presentation (기존 React 앱 확장)                          │
│   6화면 + Team Designer. SimState → AITeamConfiguration 로 확장 │
└───────────────▲─────────────────────────────┬────────────────┘
                │ 숫자/표(결정론적 결과)          │ 해석/서술(스트리밍)
┌───────────────┴─────────────┐   ┌────────────▼────────────────┐
│ L2. Deterministic Core      │   │ L3. Agent Layer (LangGraph)  │
│ (순수 TS, 브라우저/서버 공용)  │◀──│  Orchestrator                │
│  calculateCost              │tool│   ├ Onboarding Agent          │
│  attributionRollup          │호출│   ├ Cost Analyst Agent        │
│  marginByPlan/customer      │   │   ├ Optimization Agent ─┐     │
│  pricingScenario            │   │   │      └ Risk Auditor(sub) │ │
│  heavyUserDetection         │   │   └ CFO Reporter Agent        │
└─────────────────────────────┘   └──────┬───────────────▲───────┘
                                          │ retrieve       │ ground
                                   ┌──────▼───────┐  ┌─────┴──────┐
                                   │ L4a. RAG      │  │ L4b. Store │
                                   │ benchmark +   │  │ Decision   │
                                   │ risk catalog  │  │ Log, Config│
                                   └──────────────┘  └────────────┘
```

### 2.2 절대 원칙 (v2.0 §6.1 = v0.3 §8.1, 재확인)

> **L2(계산)는 절대 LLM을 쓰지 않는다. L3(Agent)는 절대 산술을 직접 하지 않는다.**

- 모든 숫자(월 COGS, plan gross margin, scenario margin)는 L2의 순수 TS 함수에서만 나온다. `CLAUDE.md` 헌법: "모든 비용 계산은 `calculator.ts` 단일 경로를 통과한다."
- Agent는 L2 함수를 **tool로 호출**해서 숫자를 받고, 그 숫자를 **해석/설명/추천/번역**만 한다. Agent 출력에 등장하는 모든 수치는 tool 결과를 그대로 인용해야 하며, Agent가 만든 숫자가 아니다 (검증 가능, 환각 차단).

이 원칙이 곧 신뢰성의 근거이자, "왜 이게 그냥 챗봇이 아닌가"의 답이다.

### 2.3 L2를 브라우저/서버 공용으로 두는 이유

`domain/cost/`는 순수 TS, 부수효과 없음. 따라서 **같은 코드가 (1) 브라우저에서 화면 즉시 계산, (2) Agent의 tool 실행 양쪽에서 동작**한다. LLM 실행 위치가 어디든 L2는 한 벌만 유지한다. 이것이 "deterministic 절반은 이미 있다"가 강점인 이유다.

---

## 3. LLM 실행 모델 — 두 방식 명세 + 추천

현재 앱엔 서버가 없다. Agent가 LLM을 호출하려면 키와 실행 위치가 필요하다. 두 방식을 모두 명세한다.

### 3.1 방식 A — BYO-key, 풀 클라이언트

사용자가 자기 OpenAI/Anthropic API 키를 입력하고, 브라우저에서 직접 LLM·Agent를 실행. L2/L3 모두 브라우저.

| 항목 | 평가 |
| --- | --- |
| 헌법(서버 없음) | ✅ 유지 |
| MVP 속도 | ✅ 가장 빠름 (배포 = 정적 호스팅 그대로) |
| 키 보안 | ❌ 브라우저에 키 노출. 데모/본인 사용엔 OK, 배포 제품엔 부담 |
| Decision Log 영속성 | ⚠️ localStorage/파일 export만. 기기 종속 |
| 주간 리뷰·반복 리포트 | ❌ 불가 (스케줄러 없음) |
| RAG | ⚠️ 정적 corpus를 번들로 싣고 in-browser 임베딩 검색은 가능하나 무겁다 |
| SparkClaw 데모 | ✅ 충분 |

### 3.2 방식 B — 얇은 서버리스 백엔드

Edge/serverless 함수(예: Vercel/Cloudflare Functions)가 LLM 호출·RAG·Decision Log 영속성 담당. 프런트는 그 API를 호출. L2는 양쪽 공유, L3는 서버.

| 항목 | 평가 |
| --- | --- |
| 헌법(서버 없음) | ❌ 수정 필요 (§9에서 다룸) |
| MVP 속도 | ⚠️ 인프라 셋업 추가 |
| 키 보안 | ✅ 서버 보관 |
| Decision Log 영속성 | ✅ DB/KV에 저장 |
| 주간 리뷰·반복 리포트 | ✅ cron/스케줄 가능 → **SaaS 반복성(v0.3 §5.1)의 전제** |
| RAG | ✅ 벡터스토어 서버 운영 |
| SparkClaw 데모 | ✅ + 실제 제품으로 직행 |

### 3.3 추천 — 하이브리드 (MVP는 A, P1부터 B)

> **MVP/P0(SparkClaw 데모)는 방식 A**로 빠르게: BYO-key + Sample Data Generator + Decision Log는 localStorage/JSON export. 헌법 거의 유지, 정적 호스팅 그대로.
>
> **P1부터 방식 B**로 전환: 키 서버 보관, Decision Log 영속화, 주간 리뷰 자동 발송. 이때 헌법을 "프런트는 client-only, AI/영속성은 얇은 backend"로 개정.

이 경로의 핵심은 **L2(deterministic)와 L3(agent graph)를 처음부터 실행 위치 독립적으로 설계**하는 것이다. 그러면 A→B 전환 시 프런트·엔진 재작성 없이 "Agent를 어디서 돌리나"만 바뀐다. 구체적으로:

- L2 함수: 부수효과 없는 순수 TS (이미 그러함). 변경 없음.
- L3 그래프: `runtime` 추상화 뒤에 둔다. `runAgent(input) → stream` 인터페이스를 프런트가 호출. MVP엔 그 구현이 브라우저 내 LangGraph.js, P1엔 fetch('/api/agent'). 인터페이스 동일.

---

## 4. Agent 프레임워크 — LangChain 1.0 스택 비교 + 추천

### 4.1 옵션 비교

| 기준 | LangGraph.js (in-repo, TS) | Python (LangChain 1.0 + LangGraph) 서비스 |
| --- | --- | --- |
| 언어 일관성 | ✅ repo가 TS. L2 엔진을 **그대로 import해 tool로** 노출 | ❌ L2(TS)를 API로 감싸야 함 (이중 유지 위험) |
| 방식 A(클라이언트) 호환 | ✅ 브라우저에서 실행 가능 | ❌ 불가 (별도 서비스 필수) |
| 생태계/RAG 도구 성숙도 | ⚠️ JS도 충분하나 Python이 더 풍부 | ✅ 가장 풍부 |
| human-in-the-loop(승인 게이트) | ✅ LangGraph interrupt 지원 | ✅ 동일 |
| 상태/체크포인트(Decision Log 연계) | ✅ checkpointer | ✅ checkpointer |
| 팀 역량/채용 | TS 단일 스택 | Python 별도 |
| 헌법(서버 없음) 충돌 | 작음 (A에서 무서버 가능) | 큼 |

### 4.2 추천 — LangGraph.js in-repo

> repo가 TS이고 **deterministic 엔진(L2)이 이미 TS 순수 함수**라는 점이 결정적이다. LangGraph.js를 쓰면 `calculateCost`, `attributionRollup` 등을 **추가 API 레이어 없이 그대로 tool로 노출**할 수 있다. Python 서비스를 택하면 L2를 API로 감싸 TS/Python 두 벌을 동기화해야 하는데, 이는 "계산은 단일 경로" 헌법과 정면으로 부딪힌다.
>
> RAG 생태계 성숙도에서 Python이 앞서지만, 본 제품의 RAG는 corpus가 작고 정적(벤치마크 + Risk Card 카탈로그)이라 JS 벡터스토어로 충분하다 (§7).

LangGraph 핵심 개념과 본 제품 매핑:
- **StateGraph**: AITeamConfiguration + 분석 컨텍스트를 그래프 state로. 노드 = Agent.
- **Tools**: L2 deterministic 함수를 tool로 바인딩 (§6).
- **interrupt / human-in-the-loop**: 모든 추천 전 "승인 게이트"에서 그래프를 멈추고 사용자 결정을 기다림 → v0.3 §4.3 "모든 자동화에 승인 게이트"의 직접 구현.
- **checkpointer**: 그래프 state 스냅샷 = Decision Log "가정 스냅샷"(v0.3 §9)의 저장 메커니즘.

---

## 5. Agent 아키텍처 — Orchestrator + 5 Agent + 서브에이전트

### 5.1 그래프 토폴로지

```
                    ┌──────────────────┐
   user input ─────▶│  Orchestrator     │  (라우터: wedge/의도 판별, 단계 진행)
                    └───┬───────────┬───┘
            wedge A 시작 │           │ 분석 요청
                  ┌──────▼─────┐    │
                  │ Onboarding │    │  (대화로 회사 파악 → 팀 구성 후보 제안)
                  │  Agent      │    │
                  └──────┬──────┘    │
                         └─────┬─────┘
                               ▼
                    ┌──────────────────┐   tool   ┌──────────────┐
                    │ Cost Analyst      │─────────▶│ L2 엔진 tools │
                    │  Agent            │◀─────────│ (deterministic)│
                    └────────┬─────────┘   숫자    └──────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Optimization      │  ── spawn ──▶ ┌──────────────────┐
                    │  Agent            │              │ Risk Auditor      │ (서브에이전트)
                    │ (절감/재배치/가격안)│ ◀── risk ──── │  Sub-Agent        │
                    └────────┬─────────┘   card        │ 각 추천에 리스크카드│
                             │                          └──────────────────┘
                       [승인 게이트: interrupt]  ← 사람이 채택/거부
                             ▼
                    ┌──────────────────┐
                    │ CFO Reporter      │  (역할별 4종 리포트 + Decision Log 초안)
                    │  Agent            │
                    └────────┬─────────┘
                             ▼
                    Decision Log + Report (stream to UI)
```

### 5.2 각 Agent 책임 (v0.3 §4.2 구체화)

| Agent | 입력 | 호출하는 tool | 출력 | 서브에이전트 |
| --- | --- | --- | --- | --- |
| **Orchestrator** | user turn, 현재 state | 없음 (라우팅만) | 다음 노드 선택 | — |
| **Onboarding** | 대화 | `suggestTeamTemplates` (RAG) | 회사 프로필, 팀 구성 후보 3개 | — |
| **Cost Analyst** | attribution 결과 | `attributionRollup`, `marginByPlan`, `heavyUserDetection` | "왜 이 숫자인가" 자연어 해석 (출처·메커니즘) | — |
| **Optimization** | 비용 구조, 목표 | `pricingScenario`, `savingsLevers`, `modelRouting` | 절감/재배치/가격 대안 N개 | **Risk Auditor** 호출 |
| **Risk Auditor (sub)** | 각 추천안 | `retrieveRiskCards` (RAG) | 추천별 Risk Card (영향/조건/안전망) | — |
| **CFO Reporter** | 위 전부 + 채택된 결정 | `formatReport` (L2), 역할 언어 | dev/pm/ceo/board 4종 리포트, Decision Log 초안 | — |

### 5.3 서브에이전트를 쓰는 이유 (Risk Auditor)

v0.3의 절대 규칙: **"모든 추천에는 Risk Card가 붙는다"**(§7 원칙, §4.3 철학). 이를 Optimization Agent 안에 섞으면 "절감액을 키우려고 리스크를 축소"하는 인센티브 충돌이 생긴다. 그래서 **Risk Auditor를 독립 서브에이전트로 분리**한다:

- Optimization Agent가 대안을 만들면, 각 대안을 Risk Auditor sub-agent에 넘긴다 (fan-out).
- Risk Auditor는 RAG로 Risk Card 카탈로그를 검색해 **독립적으로** 리스크를 부착한다.
- 둘의 관심사가 분리되어 "절감 제안자 ≠ 리스크 심사자" 구조 → 추천 신뢰성↑, 안티-지표(v0.3 §10.4 "모든 추천이 그냥 받아들여짐") 방어.

서브에이전트 패턴은 LangGraph의 subgraph 또는 tool-as-agent로 구현. 각 대안마다 격리된 컨텍스트에서 평가되므로 교차 오염이 없다.

### 5.4 Human-in-the-loop = 승인 게이트

Optimization 출력 직후 그래프를 `interrupt`로 멈춘다. UI는 대안 + Risk Card를 보여주고 사용자가 채택/거부/수정. 결정이 들어오면 그래프 재개 → CFO Reporter가 **그 결정과 이유를 Decision Log에 기록**(가정 스냅샷 포함). v0.3 §6.2의 7·9단계가 이 한 흐름이다.

---

## 6. Tool Contract — Agent ↔ Deterministic 엔진

Agent가 호출할 수 있는 tool 목록. 모두 **L2 순수 함수** (기존 자산 재사용 또는 신규 순수 함수). Agent는 이 결과만 인용한다.

| Tool | 시그니처(개념) | 출처 | 신규 여부 |
| --- | --- | --- | --- |
| `calcCost` | `(CalcInput) → CalcResult` | `domain/cost/calculator.ts` | ✅ 기존 |
| `calcMigrationDelta` | `(MigrationInput) → MigrationResult` | 동상 | ✅ 기존 |
| `parseUsage` | `(csv, models) → UsageImportSummary` | `usageImport.ts` | ✅ 기존(확장 필요) |
| `attributionRollup` | `(rows, axis) → CostByDimension[]` axis∈{customer,feature,model,plan,session,agent_run} | 신규 (순수) | 🆕 |
| `marginByPlan` | `(rows, planRevenue) → PlanMarginRow[]` | 신규 | 🆕 |
| `customerProfitability` | `(rows, mrrByCustomer) → CustomerMarginRow[]` | 신규 | 🆕 |
| `heavyUserDetection` | `(rows) → {topDecileShare, lossCustomers[]}` | 신규 | 🆕 |
| `unitEconomics` | `(cost, denominator) → costPerMetric` | `unitEconomics.ts` 확장 | ⚠️ 확장 |
| `savingsLevers` | `(input) → SavingsLever[]` | `savingsLevers.ts` | ✅ 기존 |
| `pricingScenario` | `(rows, policy) → ScenarioResult` policy∈{flat,usage,credit,hybrid,cap,overage} | 신규 | 🆕 |
| `formatReport` | `(data, role) → structured` | `roleLanguage.ts` + 신규 | ⚠️ 확장 |

**RAG tool** (L4a):

| Tool | 용도 | 검색 corpus |
| --- | --- | --- |
| `suggestTeamTemplates` | Onboarding: 유사 회사 팀 구성 + 벤치마크 | 벤치마크 corpus |
| `retrieveBenchmark` | "비슷한 1인 B2B SaaS 12개 평균" 같은 비교 기준 | 벤치마크 corpus |
| `retrieveRiskCards` | Risk Auditor: 추천 유형별 리스크 카드 | Risk Card 카탈로그 |

규칙: tool은 모두 **결정론적**(RAG 검색도 동일 corpus·쿼리에 동일 결과). Agent의 비결정성은 *해석 문장*에만 존재하고, *숫자와 인용 근거*는 tool이 고정한다.

---

## 7. RAG 설계 (벤치마크 + Risk Card)

### 7.1 왜 RAG가 필요한가

v0.3는 두 곳에서 "외부 지식"을 요구한다:
1. **벤치마크**(§6.2 4단계): "비슷한 1인 B2B SaaS 12개 평균: 주 3회. 현재 입력은 3배 ⚠️" — 사용자 입력을 *기준선*과 비교.
2. **Risk Card 카탈로그**(§16-4): 자주 나오는 추천 10개에 대한 리스크 카드 — 추천마다 *근거 있는* 경고.

둘 다 "Agent가 지어내면 안 되고, 검증된 근거에서 인용해야" 한다. 이미 repo에 검증 원장이 있다: `docs/research/evidence_board.csv`(38개 공식), plan-level 사례(GitHub Copilot/Cursor/Claude/Replit/Stripe). 이게 RAG corpus의 씨앗이다.

### 7.2 두 corpus

```
corpus/benchmark/        ← 회사 유형별 업무 빈도·토큰량·비용 기준선
   - evidence_board.csv 의 정량 사례
   - plan-level margin 사례 (Copilot/Cursor/...)
   - Sample Data Generator 시나리오 5종의 통계
corpus/risk_cards/       ← 추천 유형 → 리스크/조건/안전망
   - "Haiku 라우팅 → 의료/법률 정확도 하락, 화이트리스트 안전망"
   - "캐싱 → TTL/무효화 비용", "cap → 고객 이탈" 등 10+ 카드
```

각 chunk는 `{claim, evidence_id, source_url, persona, pain_tag}` 메타데이터를 단다. Agent 출력은 인용된 `evidence_id`/`source_url`을 그대로 노출 → 검증 가능 (v0.3 신뢰성 + repo의 evidence 검증 문화 계승).

### 7.3 검색 경로

- MVP(방식 A): corpus가 작으므로 **번들 JSON + 경량 임베딩(in-browser) 또는 키워드+태그 필터**로 충분. 벡터DB 불필요.
- P1(방식 B): corpus 성장 시 서버 벡터스토어(예: pgvector/경량 임베딩)로 승격. tool 인터페이스(`retrieveRiskCards` 등)는 동일하게 유지 → 프런트·Agent 무변경.

### 7.4 RAG가 아닌 것

RAG는 **숫자를 만들지 않는다.** 벤치마크 "평균 주 3회"는 corpus의 *사실*이고, "현재 입력이 3배"라는 *비교*는 L2 산술이다. RAG는 근거 문장과 기준선 값을 제공하고, 판정은 deterministic, 서술은 Agent.

---

## 8. AITeamConfiguration ↔ 기존 상태 매핑

v0.3 §5의 단일 객체를 기존 `SimState`/`PlannerState`(`app/App.tsx`, `lib/plannerState.ts`)에서 **확장**으로 도출한다. 재작성이 아니라 superset.

```
AITeamConfiguration {
  company_profile: { type, stage, budget, locale }     // 신규 (Onboarding 산출)
  agents: [{                                            // 신규 (Wedge A)
    role, model(=기존 Model), prompt_template,
    guardrails[], review_gate, assigned_tasks[],
    expected_volume, cost_budget
  }]
  // ↓ 기존 SimState가 agent 1개의 비용 입력으로 흡수됨
  //   currentModel/candidateModel/tokens/cache/batch → agents[].model + workload
  usage: UsageImportSummary | null                      // 기존 import 결과
  attribution: { byCustomer, byPlan, bySession, byAgentRun }  // 신규 roll-up
  decision_log: Decision[]                              // 신규 (영속)
  performance_history: WeeklyReview[]                   // 신규 (P1)
}
```

Wedge A는 이 객체를 *설계*로 채우고, Wedge B는 *실측 로그*로 채운다. 같은 객체 → 같은 화면 2~6 재사용 (v0.3 §7 표의 "A+B" 화면들이 코드 공유).

### 8.1 Decision Log 스키마 (JSON, v0.3 §16-5)

```jsonc
Decision {
  id, ts,
  what,                       // "CS Agent 모델 Sonnet→Haiku"
  why,                        // Optimization+Risk Auditor 근거 요약
  assumptions: {              // 가정 스냅샷 — 이게 핵심
    inputs: {...},            // 그때의 빈도/denominator
    cost_table_ref,           // L2 결과 스냅샷
    benchmark_refs[],         // 인용된 evidence_id
    risk_cards[]              // 부착된 리스크
  },
  status: 'adopted'|'rejected'|'superseded',
  config_snapshot_ref         // LangGraph checkpoint id
}
```

저장: MVP=localStorage/JSON export, P1=서버 KV/DB. checkpoint_ref로 "그때 상태"를 재현 → Plan vs Actual(§11 v0.3)의 기반.

---

## 9. 헌법(CLAUDE.md) 충돌과 해소

`C:\token_simulator\CLAUDE.md`:
> "클라이언트 사이드 only — 서버 없음, DB 없음."  
> "모든 비용 계산은 `calculator.ts` 단일 경로를 통과한다."

| 헌법 조항 | v0.4와의 관계 | 해소 |
| --- | --- | --- |
| 계산 단일 경로 | ✅ **강화**. Agent도 이 경로(tool)만 쓴다 | 변경 없음. tool contract가 헌법을 코드로 집행 |
| 포맷 단일 경로 | ✅ 유지. 리포트도 `format.ts` 통과 | 변경 없음 |
| translate="no" 보호 | ✅ 유지 | 변경 없음 |
| 서버 없음 / DB 없음 | ⚠️ **MVP 유지, P1에서 개정 필요** | 아래 |

제안 헌법 개정(P1 진입 시):
> "**프런트엔드는 client-side only**를 유지한다. AI Agent 실행·LLM 키·Decision Log 영속성·RAG는 **얇은 backend(서버리스)**가 담당하며, deterministic 계산 엔진(L2)은 프런트/백엔드가 **단일 TS 소스를 공유**한다. 계산은 여전히 한 경로만 통과한다."

이렇게 하면 "단일 계산 경로"라는 헌법의 *진짜 의도*(숫자 일관성)는 보존하면서, "서버 없음"이라는 *수단*만 완화한다.

---

## 10. 데이터 흐름 (end-to-end, Wedge B 예)

```
1. 사용자: usage CSV 업로드 (또는 Sample Generator)
2. parseUsage (L2) → UsageImportSummary  [브라우저, 즉시]
3. attributionRollup × {customer,plan,feature,model,session,agent_run} (L2)
4. 사용자: business denominator 입력 (plan 매출, MRR, 판매가)
5. marginByPlan / customerProfitability / heavyUserDetection (L2)
   → 화면2·3 즉시 렌더 (숫자, LLM 미사용)
6. 사용자: "왜 이래?" → Cost Analyst Agent
   - tool로 위 결과 받아 자연어 해석 (스트리밍)
7. "어떻게 개선?" → Optimization Agent
   - pricingScenario(flat/credit/cap...) tool 호출 → 시나리오 숫자(L2)
   - 각 안 → Risk Auditor sub-agent → retrieveRiskCards(RAG) → Risk Card
8. [승인 게이트 interrupt] 사용자 채택/거부
9. CFO Reporter → 4종 리포트 + Decision Log 기록 (checkpoint)
```

5번까지는 LLM 0회 (deterministic, 빠르고 무료). 6번부터 Agent. → **비용 효율적이고 신뢰 가능**.

---

## 11. 구현 단계 (코드베이스 기준)

### P0 — SparkClaw 데모 (방식 A, 4–6주)

재사용: `calculator.ts`, `usageImport.ts`(확장), `savingsLevers.ts`, `unitEconomics.ts`(확장), `SummaryCard`, role 언어, Recharts/jsPDF.

신규(순수 TS, TDD·100% 커버리지 규칙 적용):
1. `attributionRollup` (다축) + 테스트
2. `marginByPlan`, `customerProfitability`, `heavyUserDetection` + 테스트
3. `pricingScenario` (flat/usage/credit/cap/overage) + 테스트
4. Sample Data Generator (5 시나리오 synthetic CSV)
5. Team Designer UI + AITeamConfiguration 객체
6. Risk Card 카탈로그 v0 (정적 JSON, 10+ 카드) + benchmark corpus 씨앗

신규(Agent, 방식 A):
7. LangGraph.js 그래프 + 5 Agent + Risk Auditor 서브에이전트
8. Tool Contract 바인딩 (L2 함수 → tools)
9. RAG: 번들 JSON + 태그/키워드 검색 (벡터DB 없이)
10. 승인 게이트(interrupt) UI, Decision Log(localStorage/export)

### P1 — 실제 검증 + SaaS 반복성 (방식 B, 2–3개월)

11. 얇은 서버리스 백엔드 (LLM 키 보관, /api/agent)
12. Decision Log/Config 영속화 (KV/DB)
13. 주간 리뷰 자동 생성 + Slack/Email digest (cron)
14. Plan vs Actual (가정 스냅샷 vs 실측)
15. RAG 서버 벡터스토어 승격, corpus 확장
16. 4종 리포트 분리 완성
17. 헌법 개정 (§9)

### P2 — 확장

18. SDK/Gateway 자동 수집, Helicone/Langfuse export import
19. Stripe/Metronome billing 연동
20. Re-org 추천 알고리즘 (6주 누적)
21. Multi-tenant

---

## 12. 기술 리스크

| # | 리스크 | 완화 |
| --- | --- | --- |
| T1 | Agent가 숫자를 지어냄(환각) | 절대 원칙 §2.2: 숫자는 tool 결과만 인용. 출력 검증 단계에서 수치-tool 매칭 체크 |
| T2 | A→B 전환 시 재작성 비용 | L2 순수 TS 공유 + `runAgent` 인터페이스 추상화. 전환 = 실행 위치 교체뿐 |
| T3 | BYO-key 보안(MVP) | 데모/본인용으로 한정 명시, 키 메모리 only·미저장, P1에서 서버 이전 |
| T4 | RAG corpus 빈약 → 벤치마크/Risk Card 빈약 | evidence_board(38개)+plan 사례 씨앗, 인터뷰로 확장. 근거 없으면 "기준선 없음" 명시 |
| T5 | LangGraph.js 생태계가 Python보다 얕음 | 본 제품 RAG는 소형·정적이라 JS로 충분. 추후 필요 시 RAG만 서버 Python으로 분리 가능 |
| T6 | 단일 계산 경로 헌법 위반(Agent가 산술) | tool contract로 코드 차원 강제. 코드리뷰 체크리스트에 "Agent 내 산술 금지" |
| T7 | 영속성 도입이 헌법과 충돌 | §9 단계적 개정. "단일 계산 경로" 의도는 보존, "서버 없음" 수단만 완화 |

---

## 13. 다음 액션

1. `attributionRollup` 다축 함수 — 실패 테스트 먼저(TDD), `usageImport`에 plan/session/agent_run 파싱 추가
2. `pricingScenario` 순수 함수 + 테스트 (flat/usage/credit/cap/overage)
3. Risk Card 카탈로그 v0 (10+ 카드, evidence_id 메타) + benchmark corpus 씨앗 JSON
4. LangGraph.js 그래프 골격 + Tool Contract 바인딩 (방식 A, BYO-key)
5. Risk Auditor 서브에이전트 분리 구현 + 승인 게이트(interrupt) UI
6. Decision Log JSON 스키마 확정 + localStorage/export
7. Sample Data Generator 5 시나리오
8. (P1 게이트) 인터뷰 20건으로 WTP 검증 후 서버리스 백엔드 착수

---

## 14. 한 줄 요약

> deterministic 절반은 이미 repo에 있다(`calculator.ts`). AI Native가 되는 길은 그 위에 **LangGraph.js Agent 그래프 + Risk Auditor 서브에이전트 + 소형 RAG**를 얹되, **숫자는 끝까지 tool(=기존 단일 계산 경로)만** 만들게 하는 것이다. MVP는 BYO-key 무서버로 헌법을 지키며 시작하고, 반복 리포트가 필요한 P1에서 얇은 백엔드로 승격한다. v2.0·v0.3과 충돌하지 않으며, 그 둘의 "계산은 deterministic, 해석은 AI" 원칙을 코드(Tool Contract)로 집행한다.
