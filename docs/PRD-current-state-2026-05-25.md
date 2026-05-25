# PRD: AgentPayroll — 현 상태 기준 (Implementation Truth Record)

문서 버전: current-state · 2026-05-25
상태: 사실 기록 + 2026-05-25 확정 전환 방향 (내부 정렬용)
성격: §1~§8은 *"지금 코드에 무엇이 실제로 존재하고, 무엇이 검증됐고, 무엇이 아직 검증 안 됐는가"* 를 정직하게 기록한다. §9~§11은 이미 확정된 **Next.js primary frontend + Production Demo First** 방향을 UI/UX 기획으로 내려쓰기 위한 실행 기준이다.
관계: `docs/PRD-v3.md`(v3.2, 합의된 방향+다음 MVP)와 병존한다. v3.2가 "가야 할 곳"이라면 이 문서는 "지금 있는 곳 + 지금부터 Next.js로 옮길 때 지켜야 할 UX 기준"이다. 충돌 시 구현 사실은 §1~§8, Next 전환/UX 기준은 §9~§11을 우선한다.

---

## 0. 이 문서를 믿는 법

각 항목에 검증 상태 태그를 단다.

- ✅ **안정** — 코드 + 테스트 존재, 핵심 경로에 배선됨
- 🟡 **진행중** — 코드 존재하나 부분적이거나 일부만 배선
- ⚠️ **미검증** — 코드/테스트는 존재하나 이 기록 시점에 그린(통과)을 확인하지 못함

검증 갭은 §8에 따로 모은다. 이 기록은 2026-05-25 현재 로컬 검증(`npm run test:run -- --testTimeout 60000`, `uv run pytest agent_service/tests`, `npm run build`)을 통과한 상태를 기준으로 한다.

---

## 1. 한 줄 정의 & 현 정체성

AgentPayroll은 AI SaaS의 사용 로그를 **고객·기능·모델·플랜·세션별 원가와 마진**으로 재분류하고, **어떤 결정을 내려야 하는지까지 운영 일지에 남기는 의사결정 워크스페이스**다.

현 코드 기준 이 제품은 더 이상 "토큰 계산기"가 아니다. 실제로는 다음을 갖춘 **AI SaaS Cost · Margin · Decision Operating System**이다:

- 결정론적 비용·마진 엔진
- usage import → attribution → margin risk → pricing scenario → decision ledger → one-page report 흐름
- 11개 운영 에이전트 + 10개 운영 자산
- C1~C9 RAG 코퍼스(공식·벤치마크·서빙·usage-schema·decision-history 등)
- 역할별(dev/pm/ceo) projection + 내부/고객 audience 분리
- TypeScript 프런트 + Python `agent_service`(agentic runtime) 2-런타임

README의 1차 표현("토큰 시뮬레이터")은 현 실체보다 좁다. 정체성 표현은 본 문서 기준으로 통일한다.

---

## 2. 문제 & 페르소나

AI SaaS 팀은 OpenAI/Anthropic/Gemini 콘솔, Helicone, Langfuse로 *총* 토큰·비용은 보지만, "어떤 고객이 손해인가 / 어떤 기능이 마진을 깨는가 / 어떤 가격정책으로 바꿔야 하는가 / 모델을 바꾸면 품질·지연 리스크는 / dev·PM·CEO에게 같은 숫자로 설명 가능한가"에는 바로 답하지 못한다.

| 페르소나 | 원하는 것 | 우선 화면 |
|---|---|---|
| Developer / Backend / ML | 로그·모델·latency·retry·cache·비용 급증 원인 | Developer projection |
| Founder / CEO / CFO | 남는 돈, 손해 고객, 가격 결정, 보고 자료 | CEO projection |
| PM / RevOps / CS | 기능별 원가, 출시 판단, 고객 설명 | PM projection |
| Bootcamp / early team | 예산 소진 위험, 발표용 AI 사용 리포트 | Guided setup + report |

---

## 3. 절대 원칙 (코드로 강제되는 불변식)

이 원칙들은 "지향"이 아니라 현재 코드/헌법(`CLAUDE.md`)으로 강제되는 제약이다.

1. **계산은 결정론 엔진 단일 경로.** 비용·마진·절감·예산초과·alert 조건은 `src/lib/calculator.ts`, `src/domain/cost/`, `unit-economics`/`pricing` 순수 모듈에서만 계산한다. 컴포넌트 내 가격 연산 금지. ✅
2. **표시는 format 단일 경로.** 사용자 표시 숫자는 `src/lib/format.ts`(`fmtCurrency`/`fmtPercent`/`fmtTokens`/`fmtDelta`)를 통과. inline `toFixed`/`toLocaleString` 금지. ✅
3. **AI는 숫자를 만들지 않는다.** AI는 `tool:*`/`snapshot:*`/`risk:*`/`decision:*`/`evidence:*` ref를 설명하고 다음 액션 초안만 쓴다. ✅
4. **RAG는 스니펫만, 숫자는 사람 승인 후 Fact Ledger.** retrieve 결과를 바로 숫자로 쓰지 않는다. `official_docs_change_monitor`가 "Human approval before Fact Ledger update"를 명시. ✅
5. **baseline 없으면 지어내지 않는다.** 벤치마크 peer가 없으면 평균을 만들지 않고 `baseline_unavailable`을 반환. ✅ (`modelBenchmarkCorpus.ts`, `agentic_runtime.py`)
6. **billing 실행 안 함.** 가격 정책은 `draft_only`, `stripeExecutable:false`, `requiresHumanApproval:true`. ✅ (`rateCardDraft.ts`)
7. **역할별 화면은 달라도 숫자는 같다.** dev/pm/ceo는 같은 deterministic snapshot을 읽는다. ✅ (`projectSnapshotForRole.ts`)
8. **자동번역 보호.** `<meta name="google" content="notranslate">` + root `translate="no"` + 영어 블록 `lang="en"` 유지. ✅ (헌법 회귀 경로)
9. **Prompt-free 기본값.** raw prompt/messages/API key/PII 기본 미수집. 🟡 (trust intake 부분 구현)

---

## 4. 현재 존재하는 것 (Capability Inventory)

### 4.1 결정론 코어 ✅
- 비용 계산: `src/lib/calculator.ts`, `src/domain/cost/calculator.ts`
- 마진/단위경제: `src/features/unit-economics/lib/`(margin, effectiveCost, businessMetrics, unitEconomics)
- 가격 시나리오: `src/features/pricing/lib/pricingScenario.ts`
- 결정론 스냅샷: `src/features/agent/lib/buildAgentSnapshot.ts`(snapshotVersion 해시)

### 4.2 사용량 → 귀속 → 마진 → 가격 흐름 ✅
- import/정규화: `src/features/usage/lib/`(usageImport, attribution, operationalSignals)
- 귀속 축: customer/feature/model/plan/session/agent_run (`CostAttributionWorkspace`)
- 마진 리스크: 손해 고객, 플랜 마진, heavy-user 집중 (`MarginRiskWorkspace`)
- 가격 시뮬레이터: flat/credit/cap/hybrid + risk card 게이트 (`PricingSimulatorWorkspace`)

### 4.3 의사결정 흐름 UI ✅ / 🟡
- decision-flow 5단계: Design → Cost → Bottleneck → Optimize+Risk → Decision Log (`App.tsx` `DECISION_STAGES`) ✅
- 역할 projection: dev/pm/ceo, `projectSnapshotForRole(snapshot, role, audience)` → KPI/panelOrder/assistant ✅
- audience: internal/customer (`showInternal`, `?mode=admin`/`?debug=1`) ✅
- **역할 projection이 stage 내부 카드 순서까지 강하게 재배치하지는 않음** — `RoleProjectionPanel`은 panelOrder를 Badge로만 노출, stageWorkspace는 고정 순서. 🟡 (개선안: `docs/architecture/2026-05-24-role-projection-plan.md`)

### 4.4 운영 조직(에이전트/자산) ✅
- 11개 운영 에이전트, 10개 운영 자산, 11개 P1 자동화 모듈: `src/features/operating-assets/lib/operatingAssets.ts`
- 에이전트 런타임(TS): `src/features/agent/lib/`(agentRuntime, agentRunRuntime, teamCostAgentRuntime, toolContract, riskCards)
- 에이전트 런타임(Python): `agent_service/agentic_runtime.py`(+ `main.py`, `rag/chroma_store.py`, tests)

### 4.5 RAG 코퍼스 ✅ / 🟡 / ⚠️
- C1 공식 소스: `officialSourceRegistry.json`(중국계 13종 + Cursor). 서구권 빅3는 **누락 → audit warning만**(`corpusRegistry.ts`, non-blocking) 🟡
- C2 벤치마크: `modelBenchmarkRegistry.json` + `modelBenchmarkCorpus.ts` + `scripts/research/benchmark-corpus.mjs`(parseArtificialAnalysis, JSONL 산출). baseline 없으면 `baseline_unavailable`. ✅(지원 parser 범위는 테스트 그린, manual-review 소스는 warning으로 남김)
- C3 서빙 경제성: `rag/data/servingEconomicsRegistry.ts` 🟡
- C4 usage 스키마: `rag/data/usageSchemaRegistry.ts` 🟡
- C9 decision-history: `rag/lib/decisionHistoryCorpus.ts` 🟡
- 공통 계약: `rag/lib/corpusTypes.ts`, `research/lib/corpusRegistry.ts` (`corpusId`/`corpusTrust`/`consumerAgentIds`/`evidenceRefPrefix`)
- 설계 정본: `docs/architecture/2026-05-25-agent-rag-corpus-design.md`
- 참고: C2-only로 계획됐으나 실제로는 C3/C4/C9까지 함께 들어와 **계획보다 범위가 넓다.**

### 4.6 신뢰·보안 intake 🟡
- `src/features/trust/`(dataIntakePolicy, securityMiddleware, ImportTrustCheckPanel) — raw prompt/PII 차단, retention note

### 4.7 산출물 ✅ / 🟡
- 의사결정 원장: `src/features/decision-log/`(decisionLog, decisionStore) ✅
- one-page report + export gate(adopt/reject/hold 기록 필요) + decision header: `decision-loop/lib/`(exportGate, decisionHeader) ✅
- rate card draft(draft-only, billing 미실행): `pricing/lib/rateCardDraft.ts` ✅ (UX 시각 강조는 개선 여지 🟡)
- evidence drawer(benchmark_evidence 섹션, baseline unavailable 표시): `App.tsx` ✅

---

## 5. 핵심 흐름

화면 축은 세 개가 겹친다.

```text
stage   : Design → Cost → Bottleneck → Optimize+Risk → Decision Log  (공통, 항상)
role    : developer | pm | ceo                                       (무엇을 강조)
audience: internal | customer                                        (얼마나 노출)
```

같은 deterministic snapshot 위에서 stage가 큰 단계를, role이 그 안의 강조/순서를, audience가 내부 ref 노출 여부를 정한다. 흐름의 종착점은 항상 **결정 기록(adopt/reject/hold)**이며, 이 결정이 있어야 one-page report export가 열린다(`exportGate`).

---

## 6. Non-goals / 명시적 경계

- LLM이 비용/마진 숫자를 계산하거나 덮어쓰지 않는다.
- 벤치마크가 부족할 때 가짜 peer 평균을 만들지 않는다(`baseline_unavailable`).
- billing(Stripe/Metronome 등)을 자동 실행하지 않는다(draft only).
- raw prompt/API key/PII를 기본 수집하지 않는다.
- Vector DB/저장소는 단계적으로 둔다. 현재 런타임에는 Python `agent_service`의 Chroma official-docs store와 TS workspace KV 기반 RAG index가 있으며, Supabase pgvector 마이그레이션은 production store 준비물이다. 단 RAG는 여전히 스니펫/근거만 제공하고 숫자 권위는 Fact Ledger/결정론 레지스트리에 둔다.
- 개인용 ChatGPT 구독 비교 도구가 아니다 — API 기반 AI 기능 운영 팀 대상.

---

## 7. 성공 기준 / 수용 조건

- **숫자 일관성:** 동일 snapshot에서 dev/pm/ceo 공통 KPI(총비용·마진율)가 동일.
- **근거성:** 모든 AI 문장에 `tool:`/`snapshot:`/`risk:`/`decision:`/`evidence:` ref가 붙고, 없으면 렌더/판단 차단.
- **결정론 회귀:** `src/lib` 순수 함수 100% 커버리지, state 변화 시 갱신 테스트(`rerender`).
- **신선도:** 코퍼스별 cadence(가격 daily, 모델/벤치마크 weekly, 내부 ledger on-write) 유지.
- **검증 게이트(헌법):** 각 작업 후 `npm run test:run` 전체 통과 + `npm run build` 성공 + `agent_service` pytest 통과.

---

## 8. 현 상태 · 검증 갭 · 리스크 (정직 섹션)

이 문서의 가장 중요한 섹션. "구현됐다"와 "검증됐다"를 분리한다.

1. **검증 그린 확인됨.** `npm run test:run -- --testTimeout 60000` → 98 files / 445 tests passed, `uv run pytest agent_service/tests` → 42 passed, `npm run build` → 성공. 단 Vitest 전체 실행은 약 7분 20초로 느리며 `maxWorkers: 4` 상한이 필요하다.
2. **브랜치 divergence 존재.** 로컬 브랜치가 원격과 ahead/behind 상태라 push 전 rebase/merge 정책 결정이 필요하다.
3. **역할 projection이 "표시 레이어"에 머문다(🟡).** stage 카드 실제 재배치 미적용 — 사용자가 role을 바꿔도 중앙 콘텐츠 차이가 약함.
4. **C1 공식 가격 커버리지는 빅3까지 확장됐지만 운영 감시는 계속 필요.** OpenAI/Anthropic/Google 가격 source는 등록됐고, 지역/모델 family drift는 watchtower review 대상으로 남는다.
5. **Trust intake 부분 구현(🟡).** Prompt-free/PII 차단이 모든 import 경로에서 강제되는지 일관성 점검 필요.
6. **2-런타임(TS/Python) 동기화 리스크.** 같은 개념(benchmark evidence, baseline_unavailable, RAG context block)이 양쪽에 구현됨 — 계약 드리프트 방지 테스트가 지속적으로 필요.
7. **Production persistence는 schema 준비 단계.** Supabase pgvector migration은 존재하지만 앱 런타임은 아직 Supabase DB adapter로 완전히 배선되지 않았다.

---

## 9. 다음 마일스톤 후보 · 확정 방향

후보(우선순위):

1. **Next.js primary frontend 전환 착수 (§10 참조)** — A/B 질문은 폐기한다. Next.js App Router가 주 프론트이고, Vite는 전환 중 legacy baseline이다.
2. **Next.js UI/UX 상세 기획 (§11 참조)** — Production Demo First를 전제로 IA, 화면 상태, 컴포넌트, 사용자 흐름을 확정한다.
3. Production demo tenant 완성 — Supabase Auth, workspace membership, pgvector RAG, accepted fact ledger, report artifact, sandbox connector path가 모두 연결되어야 데모 성공으로 본다.
4. 역할 projection 고도화 — stage 카드 affinity 기반 재배치/접기 (`role-projection-plan.md` Phase 3)
5. RAG 코퍼스 운영화 — C4 usage-schema → C9 decision-history → C2 manual-review benchmark queue
6. Rate card draft UX — "왜/언제 export/billing 아님" 시각 강조

미결정:
- v3.2 방향 문서와 이 사실 문서의 정본 관계를 어디까지 합칠 것인가
- decision-flow 5단계 vs v3.2가 그리는 더 넓은 stage 집합의 통합 시점
- Supabase 실제 project ref/token 적용 시점과 production demo smoke 일정

---

## 10. 프론트엔드 타깃: Next.js Primary + Production Demo First

목적: 현재 Vite SPA를 제품의 주 실행면에서 내리고 Next.js(App Router)를 primary frontend로 전환한다. 데모는 하드코딩·메모리 fallback이 아니라 Supabase Auth + Supabase Postgres/pgvector + Next BFF + Python `agent_service` production path 위에서만 성공으로 판정한다.

### 10.1 아키텍처 원칙

- **Next.js primary:** `npm run dev/build/start`는 Next 앱을 대상으로 한다. Vite는 `legacy:vite:*` 명령으로만 남긴다.
- **Route groups:** `(marketing)` 공개 SSR / `(app)/w/[workspaceId]` 인증 워크스페이스 / `/reports/[id]` persisted artifact SSR.
- **BFF:** `app/api/**/route.ts`가 auth/session/workspace membership을 확인한 뒤 기존 `src/server/p1ApiHandlers.ts`와 Python `agent_service`를 호출한다.
- **Supabase Auth:** Supabase SSR cookie session을 기본 auth로 확정한다. service role은 server-only/lazy client에서만 쓴다.
- **결정론 단일 경로:** 비용 계산과 표시 포맷은 `calculator.ts`/`format.ts`를 유지한다.

### 10.2 Production demo 규칙

- demo 데이터는 Supabase provisioning seed가 넣은 production-shaped row에서만 나온다.
- Next production route/page에서 `DEMO_*`, `VITE_AGENTCOST_DEMO_SEED`, memory fallback, request body fixture를 production-connected data처럼 렌더하지 않는다.
- `/w/demo`은 demo user session + workspace membership + usage snapshot + accepted facts + watchtower run + pgvector RAG chunk + report artifact + `agent_service` reachability를 확인한다.
- 하나라도 없으면 fake success가 아니라 `production_demo_unavailable`로 실패한다.

### 10.3 단계 시퀀스

- **Phase 0: Next primary shell** — `app/layout.tsx`, `(marketing)`, `/login`, `/w/[workspaceId]`, `/w/[workspaceId]/admin`, `/reports/[id]`, `notranslate` 보호 이전.
- **Phase 1: Production demo tenant** — `workspace_memberships`, `usage_snapshots`, membership RLS, idempotent seed script.
- **Phase 2: BFF route handlers** — `/api/runtime/status`, `/api/agent/run`, `/api/rag/*`, `/api/watchtower/*`, `/api/reports/*`, `/api/retention/run`, `/api/p1/external-actions`.
- **Phase 3: Dashboard parity** — 기존 Vite workspace의 핵심 계산/리포트/RAG/Watchtower 화면을 Next server/client component로 이전.
- **Phase 4: Vite legacy 제거** — Next production smoke가 통과한 뒤 Vite entry와 Vercel `api/*.ts` wrappers를 제거한다.

### 10.4 헌법 영향

- “클라이언트 only” 원칙은 폐기한다. 새 원칙은 “Next/Supabase/agent_service는 production backend, 계산 엔진은 단일 결정론 모듈”이다.
- `<meta name="google" content="notranslate">`와 root `translate="no"`는 `app/layout.tsx`가 책임진다.
- localStorage workspace/session은 preview-only로 낮추고, production은 Supabase Auth + workspace membership으로 판정한다.
- connector demo는 sandbox/test account의 실제 HTTP path를 타되 approval, idempotency key, rollback metadata, ledger row 없이는 실행하지 않는다.

---

## 11. Next.js UI/UX 상세 기획 기준

목적: 이 섹션은 디자이너/PM/프런트엔드 구현자가 같은 그림을 잡기 위한 UI/UX brief다. 핵심은 "멋진 데모 화면"이 아니라 **production stack 위에서 실제로 연결됐는지, 어디가 막혔는지, 어떤 결정을 내려야 하는지**를 사용자가 즉시 이해하는 것이다. 데모 성공은 화면 연출이 아니라 Supabase/Auth/RAG/Watchtower/report/agent_service 연결 상태로 판정한다.

### 11.1 UX 원칙

- **Production truth first:** 연결되지 않은 기능은 성공처럼 보이지 않는다. `unavailable`, `connector_not_configured`, `deterministic_preview`, `baseline_unavailable`을 숨기지 않고 사용자 행동으로 이어지게 한다.
- **Decision workspace, not dashboard museum:** 첫 화면은 많은 카드를 보여주는 곳이 아니라 "어떤 고객/기능/플랜이 마진을 깨고, 무엇을 승인/보류/수정해야 하는지"를 드러내야 한다.
- **Same numbers, different emphasis:** developer/PM/CEO는 같은 snapshot을 보되 우선순위와 설명 깊이가 다르다. 숫자는 항상 `calculator.ts`/`format.ts` 경로를 통과한다.
- **Evidence is inspectable:** RAG/Watchtower/benchmark 결과는 신뢰 배지, source, accepted/review 상태, stale 여부를 함께 보여준다.
- **Operations are gated:** Slack/Email/Billing/Retention 같은 실행 UI는 approval, idempotency, rollback, ledger 조건을 먼저 보여주고 조건 누락 시 실행 버튼 대신 block reason을 보여준다.
- **Dense but calm:** SaaS 운영 도구답게 스캔 가능하고 조용해야 한다. 앱 내부에서는 랜딩식 hero, 과한 카드 장식, 보라 그라데이션 중심 팔레트를 피한다.

### 11.2 Information Architecture

| Route | 목적 | 주요 사용자 | 화면의 첫 질문 | 성공 상태 | 실패/빈 상태 |
|---|---|---|---|---|---|
| `/` | 공개 SSR/마케팅 진입 | founder, buyer, evaluator | "이게 무엇을 운영해 주는가?" | 제품 카테고리, production demo CTA, persisted report 예시 링크 | fake screenshot 대신 demo 준비 상태 안내 |
| `/login` | Supabase Auth 진입 | demo user, tenant user | "어떤 workspace로 들어갈 수 있는가?" | cookie session 생성 후 `/w/demo` 또는 membership workspace로 이동 | auth env 누락, 로그인 실패, membership 없음 |
| `/w/[workspaceId]` | 메인 운영 워크스페이스 | dev, PM, CEO | "지금 마진/비용/근거/결정 중 무엇이 위험한가?" | production demo checks 통과 + deterministic snapshot + evidence + decision queue | `production_demo_unavailable`과 missing checklist |
| `/w/[workspaceId]/admin` | tenant 운영/설정 | owner, admin | "데모/운영 경로가 왜 막혔는가, 무엇을 연결해야 하는가?" | connector, seed, RLS, watchtower, retention 상태 관리 | 권한 없음, env 누락, connector 미설정 |
| `/reports/[id]` | persisted artifact 조회 | buyer, CEO, customer-facing owner | "이 리포트가 어떤 결정과 근거에서 나왔는가?" | 저장된 Markdown/JSON/PDF artifact와 download CTA | persisted artifact 없음, workspace 권한 없음 |

### 11.3 Primary User Flows

1. **Production demo readiness flow**
   - `/`에서 "Open production demo" 선택 → `/login` → Supabase session 생성 → `/w/demo`.
   - `/w/demo`은 env, membership, usage rows, accepted facts, latest watchtower run, rag chunks, report artifact, `agent_service` reachability를 체크한다.
   - 실패 시 fake dashboard로 대체하지 않고, missing checklist와 admin deep link를 제공한다.

2. **Cost-to-decision flow**
   - workspace overview → usage/cost attribution → margin risk → pricing scenario → adopt/reject/hold.
   - 각 단계는 같은 deterministic snapshot id를 공유한다.
   - decision이 없으면 report export는 잠금 상태이며, 잠금 이유를 한 문장으로 보여준다.

3. **Evidence review flow**
   - risk/agent card에서 evidence drawer 열기 → source, trust tier, accepted fact 여부, watchtower run timestamp 확인.
   - low-confidence parser 결과는 "review inbox"로만 보이고 accepted ledger처럼 렌더하지 않는다.
   - baseline이 없으면 비교 차트 대신 `baseline_unavailable` 상태와 필요한 corpus 항목을 보여준다.

4. **Agent run flow**
   - 사용자가 질문/작업 선택 → `/api/agent/run` BFF → Python `agent_service`.
   - provider path만 `provider_llm`, `providerRunId`, `agentInvocationProof`를 표시한다.
   - 서버/모델/env가 없으면 `runtime_unavailable`이며 `call_*_agent`처럼 보이는 이벤트를 만들지 않는다.

5. **External action/rate card flow**
   - pricing recommendation → rate card draft → human approval → connector config validation → sandbox/test HTTP execution → ledger row.
   - Slack/Email/Stripe/Metronome 중 하나라도 env/approval/idempotency/rollback metadata가 없으면 실행 CTA는 blocked state로 바뀐다.

6. **Report/retention flow**
   - adopted decision → report artifact 생성 → `/reports/[id]` SSR 조회/download.
   - retention admin은 job status, deletion/export audit row, artifact availability를 보여준다.
   - 삭제된 artifact는 "없음"이 아니라 deletion status와 audit ref를 보여준다.

### 11.4 Workspace 화면 구조

`/w/[workspaceId]`의 1차 정보 구조는 다음 순서를 기본값으로 둔다. 역할 projection이 들어오면 같은 블록을 재배치하거나 접지만, 숨겨진 숫자를 새로 만들지 않는다.

1. **Workspace health header:** workspace name/id, role/audience switch, production status, snapshot timestamp, stale badge.
2. **Decision KPI strip:** monthly AI cost, gross margin risk, loss-making customers/features, recommended next decision. 모든 값은 format 모듈을 통과한다.
3. **Stage navigator:** Design → Cost → Bottleneck → Optimize+Risk → Decision Log. 현재 단계와 잠긴 단계를 명확히 표시한다.
4. **Main work area:** 선택 stage의 테이블/차트/시나리오/agent recommendation. 앱 내부에서는 한 화면에 2-3개 핵심 패널만 노출한다.
5. **Evidence & agent side panel:** evidence refs, agent run proof, unavailable/block reason, accepted fact review.
6. **Decision ledger footer/rail:** adopt/reject/hold 기록, report export gate, last actor/time.

### 11.5 화면별 UI 요구사항

| 화면 | 반드시 보여줄 것 | 기본 액션 | 금지/주의 |
|---|---|---|---|
| Marketing | 제품명/카테고리, production demo 조건, report 예시 링크 | Login/demo 진입 | production 연결 없는 mock dashboard를 hero로 사용하지 않음 |
| Login | Supabase Auth 설명, email/password, auth error | Sign in | demo credential을 코드에 하드코딩 노출하지 않음 |
| Workspace unavailable | missing env/table/service checklist, admin link, retry | Fix setup / retry | fake KPI, fake chart, fake agent success 금지 |
| Workspace connected | KPI strip, stage nav, attribution/margin/pricing/decision data | Review next decision | 숫자 inline 계산 금지 |
| Admin | membership role, connector config status, seed/watchtower/RAG/report/retention readiness | Run checks / review queue | owner/admin 아닌 사용자의 connector 실행 UI 노출 금지 |
| Report | artifact metadata, source decision, content type, download choices | Download Markdown/JSON/PDF | 저장되지 않은 markdown 문자열 즉석 report처럼 렌더 금지 |

### 11.6 상태 모델

모든 주요 패널은 아래 상태를 명시적으로 설계한다.

- `connected`: production store/service에서 읽은 정상 데이터.
- `loading`: 서버 컴포넌트/route handler 응답 대기. skeleton은 레이아웃 흔들림 없이 고정 높이를 가진다.
- `unavailable`: env, DB, service, membership, corpus가 없어 production path를 탈 수 없음.
- `blocked`: 권한/approval/idempotency/rollback/ledger 조건 누락으로 액션 불가.
- `deterministic_preview`: 계산 엔진만으로 보여주는 preview. agent/provider 실행 완료처럼 표현하지 않는다.
- `empty`: 연결은 됐지만 row가 없음. seed/provisioning 또는 import CTA를 제안한다.
- `stale`: watchtower/fact/corpus snapshot이 freshness SLA를 넘김.
- `error`: 예외 발생. 사용자 메시지는 원인/다음 행동/trace ref를 분리한다.

### 11.7 컴포넌트 후보

- `MarketingHero`: 공개 진입용. 제품 카테고리와 production demo 조건을 설명한다.
- `AuthPanel`: Supabase login/error/session 상태.
- `AppShell`: workspace header, nav, role/audience control, responsive layout.
- `ProductionStatusBanner`: missing checks와 연결 상태를 한 줄/확장형으로 보여준다.
- `KpiStrip`: 공통 deterministic KPI 3-5개.
- `StageNavigator`: 5단계 decision flow와 잠금 상태.
- `WorkspaceStagePanel`: stage별 content outlet. Vite legacy App을 감싸는 대신 Next-native 블록으로 재구성한다.
- `EvidenceDrawer`: source, trust tier, accepted/review/stale 상태.
- `AgentRunPanel`: providerRunId, invocation proof, fallback reason, runtime status.
- `DecisionLedgerPanel`: adopt/reject/hold, actor, timestamp, export gate.
- `ConnectorApprovalPanel`: approval/idempotency/rollback/ledger checklist.
- `ReportArtifactViewer`: persisted artifact render/download.

### 11.8 반응형/접근성/콘텐츠 기준

- **Desktop:** 운영자는 반복 스캔을 하므로 좌측 stage nav + 중앙 work area + 우측 evidence rail을 기본으로 둔다.
- **Mobile:** PC 화면을 축소하지 않는다. health → next decision → KPI → evidence summary → ledger 순서의 단일 컬럼으로 재편한다.
- **Accessibility:** 모든 액션 버튼은 disabled 이유가 텍스트로 연결되어야 하며, table/chart는 숫자 요약을 함께 제공한다.
- **Language:** 내부 운영 텍스트는 한국어 기본, provider/model/source id와 code ref는 `translate="no"` 또는 `lang="en"` 보호를 적용한다.
- **Tone:** 성공/실패를 과장하지 않는다. "실행 완료"는 ledger row와 externalRef가 있을 때만 쓴다.

### 11.9 UI/UX 수용 조건

- production route/page(`app/**`)에서 `DEMO_*`, memory fallback, request body fixture를 import하지 않는다.
- `/w/demo`에서 production checks 실패 시 KPI/chart/agent success가 나타나지 않는다.
- 로그인하지 않은 사용자는 workspace data를 보지 못하고 `/login` 또는 unavailable state로 안내된다.
- 같은 snapshot에서 role을 바꿔도 핵심 비용/마진 숫자는 동일하다.
- report page는 저장된 artifact가 없으면 `production_report_unavailable`을 보여준다.
- connector 실행 UI는 approval/idempotency/rollback/ledger 조건이 모두 충족되기 전까지 blocked state다.
- 모바일 375px 폭에서 버튼/카드 텍스트가 부모 영역을 넘지 않는다.
- 자동번역 보호가 layout, report, provider/model/source id에 유지된다.

### 11.10 아직 정해야 할 UX 결정

- 제품명 표기: 문서에는 `AgentPayroll`, 구현/랜딩에는 `AgentCost`가 함께 남아 있다. Next UI에서 하나의 primary name을 정해야 한다.
- 역할별 기본 홈: demo workspace의 기본 persona를 CEO, PM, Developer 중 무엇으로 둘지 정해야 한다.
- demo login 정책: 사용자가 직접 credential을 입력할지, 초대/매직링크/seeded account 안내만 둘지 정해야 한다.
- report download 우선순위: Markdown, JSON, PDF 중 첫 CTA를 무엇으로 둘지 정해야 한다.
- admin 노출 범위: demo 환경에서 connector/retention 실행 UI를 얼마나 실제로 열어둘지 정해야 한다.

---

## 12. 참조 인덱스

- 헌법: `CLAUDE.md`
- 방향 PRD: `docs/PRD-v3.md`(v3.2), `docs/PRD-v2.md`(v2.5 복구 정본)
- 폴더 구조: `docs/architecture/folder-structure.md`
- 역할 projection 계획: `docs/architecture/2026-05-24-role-projection-plan.md`
- RAG 코퍼스 설계: `docs/architecture/2026-05-25-agent-rag-corpus-design.md`
- 운영 조직: `src/features/operating-assets/lib/operatingAssets.ts`
- 결정론 코어: `src/lib/calculator.ts`, `src/lib/format.ts`
- 에이전트 런타임: `src/features/agent/lib/`, `agent_service/agentic_runtime.py`
