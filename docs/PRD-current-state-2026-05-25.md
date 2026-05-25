# PRD: AgentPayroll — 현 상태 기준 (Implementation Truth Record)

문서 버전: current-state · 2026-05-25
상태: 사실 기록 (내부 정렬용)
성격: 이 문서는 **방향이나 다음 MVP를 정의하지 않는다.** 오직 *"지금 코드에 무엇이 실제로 존재하고, 무엇이 검증됐고, 무엇이 아직 검증 안 됐는가"* 를 정직하게 기록한다.
관계: `docs/PRD-v3.md`(v3.2, 합의된 방향+다음 MVP)와 병존한다. v3.2가 "가야 할 곳"이라면 이 문서는 "지금 있는 곳"이다. 충돌 시 이 문서가 현 구현 사실의 정본이다.

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
2. Production demo tenant 완성 — Supabase Auth, workspace membership, pgvector RAG, accepted fact ledger, report artifact, sandbox connector path가 모두 연결되어야 데모 성공으로 본다.
3. 역할 projection 고도화 — stage 카드 affinity 기반 재배치/접기 (`role-projection-plan.md` Phase 3)
4. RAG 코퍼스 운영화 — C4 usage-schema → C9 decision-history → C2 manual-review benchmark queue
5. Rate card draft UX — "왜/언제 export/billing 아님" 시각 강조

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

## 11. 참조 인덱스

- 헌법: `CLAUDE.md`
- 방향 PRD: `docs/PRD-v3.md`(v3.2), `docs/PRD-v2.md`(v2.5 복구 정본)
- 폴더 구조: `docs/architecture/folder-structure.md`
- 역할 projection 계획: `docs/architecture/2026-05-24-role-projection-plan.md`
- RAG 코퍼스 설계: `docs/architecture/2026-05-25-agent-rag-corpus-design.md`
- 운영 조직: `src/features/operating-assets/lib/operatingAssets.ts`
- 결정론 코어: `src/lib/calculator.ts`, `src/lib/format.ts`
- 에이전트 런타임: `src/features/agent/lib/`, `agent_service/agentic_runtime.py`
