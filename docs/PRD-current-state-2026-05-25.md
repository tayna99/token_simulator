# PRD: AgentPayroll — 현 상태 기준 (Implementation Truth Record, 구현 사실 기록)

문서 버전: current-state · 2026-05-26
상태: 사실 기록 + 2026-05-26 확정 전환 방향 (내부 정렬용)
성격: §1~§8은 *"지금 코드에 무엇이 실제로 존재하고, 무엇이 검증됐고, 무엇이 아직 검증 안 됐는가"* 를 정직하게 기록한다. §9~§11은 이미 확정된 **Next.js primary frontend(주 프론트엔드) + Production Demo First(운영 경로 기준 데모 우선)** 방향을 UI/UX 기획으로 내려쓰기 위한 실행 기준이다.
관계: `docs/PRD-v3.md`(v3.4, 합의된 방향+다음 MVP)와 병존한다. v3.4가 "가야 할 곳"이라면 이 문서는 "지금 있는 곳 + 지금부터 Next.js로 옮길 때 지켜야 할 UX 기준"이다. 충돌 시 구현 사실은 §1~§8, Next 전환/UX 기준은 §9~§11을 우선한다.

---

## 0. 이 문서를 믿는 법

각 항목에 검증 상태 태그를 단다.

- ✅ **안정** — 코드 + 테스트 존재, 핵심 경로에 배선됨
- 🟡 **진행중** — 코드 존재하나 부분적이거나 일부만 배선
- ⚠️ **미검증** — 코드/테스트는 존재하나 이 기록 시점에 그린(통과)을 확인하지 못함

검증 갭은 §8에 따로 모은다. 이 기록은 2026-05-26 현재 로컬 파일과 최근 커밋을 기준으로 하며, 최신 실행 검증 결과는 §8에 따로 적는다.

---

## 1. 한 줄 정의 & 현 정체성

AgentPayroll은 AI SaaS의 사용 로그를 **고객·기능·모델·플랜·세션별 원가와 마진**으로 재분류하고, **어떤 결정을 내려야 하는지까지 운영 일지에 남기는 의사결정 워크스페이스**다.

현 코드 기준 이 제품은 더 이상 "토큰 계산기"가 아니다. 실제로는 다음을 갖춘 **AI SaaS Cost · Margin · Decision Operating System(AI SaaS 비용·마진·결정 운영체계)**이다:

- 결정론적 비용·마진 엔진
- Money Leak Run: CSV/summary → Trust Gate → 손해 고객/마진 깨는 기능 → Decision Candidate → Adopt/Reject/Hold → PDF artifact 흐름
- usage import → attribution → margin risk → pricing scenario → decision ledger → one-page report 흐름
- 11개 운영 에이전트 + 10개 운영 자산
- LangChain 1.0 `agent_service` runtime + HITL checkpoint/resume + runtime proof
- C1~C9 RAG(검색으로 근거 문서를 붙여 답하는 방식) corpus(문서 묶음: 공식·벤치마크·서빙·usage-schema·decision-history 등)
- 역할별(dev/pm/ceo) projection + 내부/고객 audience 분리
- TypeScript 프런트 + Python `agent_service`(agentic runtime, 에이전트 실행 환경) 2-런타임
- `AI Cost Snapshot report` 유료 리포트 서비스 검증 자산(ICP, data readiness, offer, review call, ledger)

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
4. **RAG는 스니펫만, 숫자는 사람 승인 후 Fact Ledger(사실 장부).** retrieve(검색) 결과를 바로 숫자로 쓰지 않는다. `official_docs_change_monitor`가 "Human approval before Fact Ledger update"를 명시. ✅
5. **baseline 없으면 지어내지 않는다.** 벤치마크 peer가 없으면 평균을 만들지 않고 `baseline_unavailable`을 반환. ✅ (`modelBenchmarkCorpus.ts`, `agentic_runtime.py`)
6. **billing(과금) 실행 안 함.** 가격 정책은 `draft_only`, `stripeExecutable:false`, `requiresHumanApproval:true`. ✅ (`rateCardDraft.ts`)
7. **역할별 화면은 달라도 숫자는 같다.** dev/pm/ceo는 같은 deterministic snapshot을 읽는다. ✅ (`projectSnapshotForRole.ts`)
8. **자동번역 보호.** `<meta name="google" content="notranslate">` + root `translate="no"` + 영어 블록 `lang="en"` 유지. ✅ (헌법 회귀 경로)
9. **Prompt-free 기본값.** raw prompt/messages/API key/PII 기본 미수집. 🟡 (trust intake 부분 구현)
10. **Runtime proof 없이는 실행 완료로 보지 않는다.** provider/fallback/unavailable/interrupt/resume 상태와 `providerRunId`, `agentInvocationProof`, checkpoint metadata를 분리한다. ✅ (`runtimeApprovalMetadata.ts`, `agentRunRuntime.ts`, `reportArtifacts.ts`)
11. **HITL resume은 human approval과 함께 남긴다.** checkpoint resume 이후 Decision Log/report artifact는 `runtime.status=resumed`와 `humanApproval.approvalMode=checkpoint_resume`을 보여줄 수 있다. ✅
12. **Forbidden tool claim은 거부한다.** Python runtime과 middleware가 외부 mutation/forbidden agent tool claim을 차단한다. ✅

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
- Next `/w/[workspaceId]` 첫 화면: `ReportFirstDiagnosisWorkspace`가 Money Leak Run을 primary workspace로 렌더한다. ✅
- Money Leak step rail: Trust Gate → Diagnosis → Margin Story → Policy Candidate → Decision Choice → PDF Artifact. ✅ (`moneyLeakRun.ts`, `ReportFirstDiagnosisWorkspace.test.tsx`)
- explicit decision gate: Adopt/Reject/Hold 선택 전에는 PDF payload/report artifact를 완료 상태로 열지 않는다. ✅
- decision-flow 5단계: Design → Cost → Bottleneck → Optimize+Risk → Decision Log (`App.tsx` `DECISION_STAGES`) ✅
- 역할 projection: dev/pm/ceo, `projectSnapshotForRole(snapshot, role, audience)` → KPI/panelOrder/assistant ✅
- audience: internal/customer (`showInternal`, `?mode=admin`/`?debug=1`) ✅
- 역할 projection layout policy: Design/Cost/Bottleneck/Optimize+Risk/Decision Log의 중앙 workspace 카드가 role affinity에 따라 primary/auxiliary로 재배치되고, customer audience에서는 internal-only 패널이 숨겨진다. ✅ (`stageCards.ts`, `App.test.tsx`)
- 남은 갭: Next workspace는 shared policy를 읽기 시작했지만 아직 Vite legacy 수준의 full dashboard parity는 아니다. 🟡

### 4.4 운영 조직(에이전트/자산) ✅
- 11개 운영 에이전트, 10개 운영 자산, 11개 P1 자동화 모듈: `src/features/operating-assets/lib/operatingAssets.ts`
- 에이전트 런타임(TS): `src/features/agent/lib/`(agentRuntime, agentRunRuntime, teamCostAgentRuntime, toolContract, riskCards)
- 에이전트 런타임(Python): `agent_service/agentic_runtime.py`(+ `main.py`, `rag/chroma_store.py`, tests)
- HITL checkpoint/resume: TS runtime input/output, Python LangGraph checkpointer, UI resume queue, decision/report proof까지 연결. ✅
- provider/mutation guard: Python middleware와 runtime이 forbidden mutation claim을 거부하고 fallback warning을 남긴다. ✅

### 4.5 RAG 코퍼스 ✅ / 🟡 / ⚠️
- C1 공식 소스: `officialSourceRegistry.json`에 OpenAI/Anthropic/Google Big3 공식 가격 source가 등록되어 있다. coverage audit은 non-blocking warning과 freshness/parser review를 노출한다. ✅
- C2 벤치마크: `modelBenchmarkRegistry.json` + `modelBenchmarkCorpus.ts` + `scripts/research/benchmark-corpus.mjs`(parseArtificialAnalysis, JSONL 산출). baseline 없으면 `baseline_unavailable`; manual-review 소스는 `needs_review` readiness로 노출한다. ✅ / 🟡
- C3 서빙 경제성: `rag/data/servingEconomicsRegistry.ts` + Supabase `serving_economics` collection path. manual-review 상태로 운영자 확인 필요. 🟡
- C4 usage 스키마: `rag/data/usageSchemaRegistry.ts` + Supabase `usage_schema` collection path. 🟡
- C9 decision-history: `rag/lib/decisionHistoryCorpus.ts` + Supabase `decision_history` collection path. 🟡
- 공통 계약: `rag/lib/corpusTypes.ts`, `research/lib/corpusRegistry.ts` (`corpusId`/`corpusTrust`/`consumerAgentIds`/`evidenceRefPrefix`)
- agent runtime 입력: `ragCollections.official_docs`, `ragCollections.benchmark_evidence`, `ragCollections.decision_history`를 분리해서 넘긴다. ✅ (`agentRunRuntime.ts`, `agentic_runtime.py`)
- 설계 정본: `docs/architecture/2026-05-25-agent-rag-corpus-design.md`
- 참고: C2-only로 계획됐으나 실제로는 C3/C4/C9까지 함께 들어와 **계획보다 범위가 넓다.**

### 4.6 신뢰·보안 intake ✅ / 🟡
- `src/features/trust/`(dataIntakePolicy, securityMiddleware, ImportTrustCheckPanel) — raw prompt/API key/file type/file size 차단, PII needs_mapping, retention job intent 연결.

### 4.7 산출물 ✅ / 🟡
- 의사결정 원장: `src/features/decision-log/`(decisionLog, decisionStore) ✅
- one-page report + export gate(adopt/reject/hold 기록 필요) + decision header: `decision-loop/lib/`(exportGate, decisionHeader) ✅
- runtime proof + human approval metadata: decision log와 report artifact가 provider/preview/resume 상태, checkpoint id, approval mode를 보존한다. ✅
- rate card state machine + billing readiness: `pricing/lib/rateCardDraft.ts` (`draft → approved → pushed_to_billing | failed`, connector_not_configured/blocked/ready 표시) ✅
- evidence drawer(benchmark_evidence 섹션, baseline unavailable 표시): `App.tsx` ✅

### 4.8 Service MVP Validation ✅
- `docs/service-validation/icp-scorecard.md`: 유료 리포트 적합 고객과 broad SaaS feature 관심 고객 분리.
- `docs/service-validation/data-readiness-checklist.md`: 받을 데이터/받지 않을 데이터/분석 가능 범위/막히는 범위.
- `docs/service-validation/ai-cost-snapshot-offer-one-pager.md`: `AI Cost Snapshot report 30만~100만 원` 제안.
- `docs/service-validation/review-call-script.md`: 데이터 공유·리포트 공유·가격/limit 결정 quote 검증.
- `docs/service-validation/learning-loop-template.md`, `service-mvp-validation-ledger.md`: 반복 리포트 요청 중심 pass/fail 판정.

---

## 5. 핵심 흐름

화면 축은 세 개가 겹친다.

```text
stage   : Design → Cost → Bottleneck → Optimize+Risk → Decision Log  (공통, 항상)
role    : developer | pm | ceo                                       (무엇을 강조)
audience: internal | customer                                        (얼마나 노출)
```

같은 deterministic snapshot(결정론 계산으로 만든 그 시점 분석 데이터 묶음) 위에서 stage가 큰 단계를, role이 그 안의 강조/순서를, audience가 내부 ref(참조 ID) 노출 여부를 정한다. 흐름의 종착점은 항상 **결정 기록(Adopt/Reject/Hold)**이며, 이 결정이 있어야 one-page report export(1장 보고서 내보내기)가 열린다(`exportGate`). 2026-05-26 기준 첫 화면은 이 흐름을 Money Leak Run으로 압축해 Trust Gate, 손해 고객/기능 진단, Decision Candidate, 명시 decision, PDF artifact를 한 줄로 연결한다. agent runtime이 개입하면 runtime proof와 human approval이 함께 남아야 한다.

---

## 6. Non-goals / 명시적 경계

- LLM이 비용/마진 숫자를 계산하거나 덮어쓰지 않는다.
- 벤치마크가 부족할 때 가짜 peer 평균을 만들지 않는다(`baseline_unavailable`).
- billing(Stripe/Metronome 등)은 자동 실행하지 않는다. Rate card는 `draft → approved → pushed_to_billing | failed` 상태 머신과 connector readiness gate를 통과해야 한다.
- raw prompt/API key/PII를 기본 수집하지 않는다.
- Vector DB(벡터 검색 저장소)/저장소는 Supabase pgvector(Postgres 안의 벡터 검색 확장) production path(실제 운영 경로)를 기준으로 둔다. KV/memory/request-body chunk는 preview/test adapter이며 production demo 성공으로 렌더하지 않는다. RAG는 여전히 스니펫/근거만 제공하고 숫자 권위는 Fact Ledger/결정론 레지스트리에 둔다.
- 개인용 ChatGPT 구독 비교 도구가 아니다 — API 기반 AI 기능 운영 팀 대상.
- provider output이 실제 실행하지 않은 billing/customer send/decision mutation을 했다고 주장해도 그대로 믿지 않는다.
- raw checkpoint resume payload를 고객 리포트에 노출하지 않는다.
- Service MVP 검증에서 broad SaaS 기능 요청을 pass로 계산하지 않는다.

---

## 7. 성공 기준 / 수용 조건

- **숫자 일관성:** 동일 snapshot에서 dev/pm/ceo 공통 KPI(총비용·마진율)가 동일.
- **근거성:** 모든 AI 문장에 `tool:`/`snapshot:`/`risk:`/`decision:`/`evidence:` ref가 붙고, 없으면 렌더/판단 차단.
- **Runtime proof:** provider/preview/unavailable/interrupt/resume 상태를 섞지 않고, checkpoint resume은 human approval과 함께 남김.
- **결정론 회귀:** `src/lib` 순수 함수 100% 커버리지, state 변화 시 갱신 테스트(`rerender`).
- **신선도:** 코퍼스별 cadence(가격 daily, 모델/벤치마크 weekly, 내부 ledger on-write) 유지.
- **서비스 검증:** 유료 리포트 요청, 반복 리포트 요청, 데이터 공유 의도, 가격/limit 결정 의도를 원장에 기록.
- **검증 게이트(헌법):** 각 작업 후 `npm run test:run` 전체 통과 + `npm run build` 성공 + `agent_service` pytest 통과.

---

## 8. 현 상태 · 검증 갭 · 리스크 (정직 섹션)

이 문서의 가장 중요한 섹션. "구현됐다"와 "검증됐다"를 분리한다.

1. **Full verification snapshot(2026-05-27).** 현재 slice 기준 `npm run test:run` 115 files / 605 tests passed, `cd agent_service; uv run pytest` 69 passed, `npm run build` 성공. 추가로 `npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx` 13 passed로 직접 지정 테스트도 확인했다.
2. **브랜치 divergence 존재.** 로컬 브랜치가 원격보다 앞선 상태라 push 전 정책 결정이 필요하다.
3. **역할 projection은 workspace layout policy로 승격됨.** Design/Cost/Bottleneck/Optimize/Decision Log stage 카드가 role affinity에 따라 primary/auxiliary/hidden으로 재배치되고, Next workspace도 같은 shared policy를 읽는다. ✅
4. **C1 공식 가격 커버리지는 빅3까지 확장됐고 readiness로 노출됨.** OpenAI/Anthropic/Google 가격 source는 등록됐으며, coverage audit과 `CorpusReadinessReport`가 운영 UI/API에서 연결 상태·manual review·stale 여부를 드러낸다.
5. **Trust intake 강제 경로 보강됨.** CSV import, SDK-lite, 서버 summary passthrough가 단일 Trust Gate를 통과해야 하며, file type/size, raw prompt, API key, PII, mapping gap을 검사한다. blocked import는 snapshot/report/decision-history로 넘어가지 않는다. ✅
6. **2-런타임(TS/Python) 동기화 리스크.** 같은 개념(benchmark evidence, baseline_unavailable, RAG context block)이 양쪽에 구현됨 — 계약 드리프트 방지 테스트가 지속적으로 필요.
7. **HITL runtime proof는 구현됨.** provider/preview/interrupt/resume 상태, checkpoint metadata, human approval이 decision/report artifact에 보존된다. raw resume payload는 report에 노출하지 않는다. ✅
8. **RAG collection split은 구현됨.** `official_docs`, `benchmark_evidence`, `decision_history`를 runtime 입력과 Python tool에서 분리한다. ✅
9. **Service validation assets는 구현됨.** `docs/service-validation/*`가 `AI Cost Snapshot report` 유료 리포트 검증 루프를 정의한다. ✅
10. **Production persistence는 schema+adapter 준비 단계.** Supabase pgvector/checkpoint/report/decision 경로는 테스트와 adapter가 있으나, 실제 production demo tenant 전체 연결은 아직 완료 기준이 아니다.

---

## 9. 다음 마일스톤 후보 · 확정 방향

후보(우선순위):

1. **Money Leak Run을 production demo의 첫 화면으로 고정** — `/w/[workspaceId]`에서 Trust Gate → 진단 → decision → PDF artifact가 끊기지 않아야 한다.
2. **Production demo tenant 완성** — Supabase Auth, workspace membership, pgvector RAG, accepted fact ledger, report artifact, sandbox connector path가 모두 연결되어야 데모 성공으로 본다.
3. **HITL runtime proof smoke** — interrupt/resume, human approval, decision/report artifact proof를 한 시나리오로 검증한다.
4. **Service MVP validation 운영** — `AI Cost Snapshot report` 유료 리포트 제안, 리뷰콜, 반복 리포트 요청 원장을 실제 리드에 사용한다.
5. 역할 projection 고도화 — stage 카드 affinity 기반 재배치/접기 (`role-projection-plan.md` Phase 3)
6. RAG 코퍼스 운영화 — C1/C2/C3/C4/C9 readiness와 Supabase pgvector collection path를 production UI/API에 연결
7. Rate card readiness UX — connector_not_configured/blocked/ready/pushed/failed 상태를 billing 실행 조건과 함께 표시

미결정:
- v3.4 방향 문서와 이 사실 문서의 정본 관계를 어디까지 합칠 것인가
- decision-flow 5단계 vs v3.4가 그리는 더 넓은 stage 집합의 통합 시점
- Supabase 실제 project ref/token 적용 시점과 production demo smoke 일정
- Watchtower accepted fact review workflow와 실제 Supabase project 적용 시점
- `AI Cost Snapshot report` 반복 요청 몇 건을 SaaS dashboard build trigger로 볼 것인가

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
- `/w/demo`은 demo user session + workspace membership + usage snapshot + accepted facts + watchtower run + C1/C2/C3/C4/C9 pgvector RAG chunks + report artifact + `agent_service` reachability를 확인한다.
- 하나라도 없으면 fake success가 아니라 `production_demo_unavailable`로 실패한다.

### 10.3 단계 시퀀스

- **Phase 0: Next primary shell** — `app/layout.tsx`, `(marketing)`, `/login`, `/w/[workspaceId]`, `/w/[workspaceId]/admin`, `/reports/[id]`, `notranslate` 보호 이전.
- **Phase 1: Money Leak Run first screen** — `/w/[workspaceId]`에서 report-first diagnosis, Trust Gate, explicit decision, PDF gate를 primary experience로 유지.
- **Phase 2: Production demo tenant** — `workspace_memberships`, `usage_snapshots`, membership RLS, idempotent seed script.
- **Phase 3: BFF route handlers** — `/api/runtime/status`, `/api/agent/run`, `/api/rag/*`, `/api/watchtower/*`, `/api/reports/*`, `/api/retention/run`, `/api/p1/external-actions`, `/api/decisions`.
- **Phase 4: Runtime proof smoke** — provider/preview/interrupt/resume, human approval, report artifact proof를 한 smoke로 묶는다.
- **Phase 5: Dashboard parity** — 기존 Vite workspace의 핵심 계산/리포트/RAG/Watchtower 화면을 Next server/client component로 이전.
- **Phase 6: Vite legacy 제거** — Next production smoke가 통과한 뒤 Vite entry와 Vercel `api/*.ts` wrappers를 제거한다.

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
- **Trust Gate first:** Trust Gate는 숨겨진 보안 기능이 아니라 구매 장벽을 낮추는 첫 안심 장치다. 업로드 직후 raw prompt/API key/PII/사용 범위를 먼저 설명한다.
- **Same numbers, different emphasis:** developer/PM/CEO는 같은 snapshot을 보되 우선순위와 설명 깊이가 다르다. 숫자는 항상 `calculator.ts`/`format.ts` 경로를 통과한다.
- **One truth, three lenses:** role projection은 다른 제품 세 개가 아니라 같은 `snapshotId`, 같은 KPI, 같은 generated timestamp를 공유하는 세 가지 렌즈다.
- **PDF as value proof:** PDF report는 export 부가기능이 아니라 구매 이유가 되는 persisted artifact다. 첫 CTA는 board/customer 공유 가능한 PDF여야 한다.
- **Decision draft before billing execution:** 초기 MVP의 primary outcome은 Stripe/Metronome 실행이 아니라 Rate Card Draft + human decision이다. connector/billing 실행은 admin readiness의 secondary locked surface로 둔다.
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
   - 서버/모델/env가 없으면 `unavailable` 또는 `deterministic_preview`이며 `call_*_agent`처럼 보이는 이벤트를 만들지 않는다.
   - all-hands/HITL 경로가 `interrupt_requested`를 반환하면 사용자 Adopt/Reject/Hold 후 `resumeCheckpoint`로 이어지고, Decision Log/report artifact는 `runtime.status=resumed` + `humanApproval.approvalMode=checkpoint_resume`으로 남을 수 있다.

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
| Trust Gate | raw prompt/API key/PII 처리, allowed scope, next action | Continue only after ready/mapping review | 보안 검사를 숨기거나 blocked 데이터를 snapshot처럼 사용 금지 |
| Admin | membership role, connector config status, seed/watchtower/RAG/report/retention readiness | Run checks / review queue | owner/admin 아닌 사용자의 connector 실행 UI 노출 금지 |
| Report | artifact metadata, source decision, content type, download choices | Share board-ready PDF first, then Markdown/JSON | 저장되지 않은 markdown 문자열 즉석 report처럼 렌더 금지 |

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
- `RuntimeProofPanel`: runtime status, checkpoint id/thread id, approval mode, fallback reason을 expert surface에 표시한다.
- `DecisionLedgerPanel`: adopt/reject/hold, actor, timestamp, export gate.
- `ConnectorApprovalPanel`: approval/idempotency/rollback/ledger checklist.
- `TrustAssurancePanel`: 업로드 직후 raw prompt/API key/PII/사용 범위를 먼저 안심시키는 primary panel.
- `SnapshotTruthBadge`: role 전환 중에도 같은 snapshot/KPI를 보고 있음을 증명하는 badge.
- `BoardReadyReportCTA`: PDF를 핵심 가치 산출물로 보여주는 report CTA.
- `RateCardDecisionDraftPanel`: 가격 변경 이유, 추천 방식, 영향 고객, 예상 마진 개선, 승인 필요성을 묶는 primary decision panel.
- `ExecutionDeferredPanel`: billing/connector 실행을 admin secondary locked surface로 낮추는 readiness panel.
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
- Design/Import stage는 비용 분석 전에 Trust reassurance를 먼저 보여준다.
- Role projection header는 `same snapshot` 증거를 보여준다.
- PDF CTA는 report actions 중 첫 번째 가치 산출물로 보인다.
- HITL checkpoint resume 후 report에는 checkpoint status/id와 approval mode가 보이고 raw resume payload는 보이지 않는다.
- Optimize/Decision flow의 primary outcome은 Rate Card Draft이며 billing push는 secondary/admin readiness로만 보인다.
- report page는 저장된 artifact가 없으면 `production_report_unavailable`을 보여준다.
- connector 실행 UI는 approval/idempotency/rollback/ledger 조건이 모두 충족되기 전까지 blocked state다.
- 모바일 375px 폭에서 버튼/카드 텍스트가 부모 영역을 넘지 않는다.
- 자동번역 보호가 layout, report, provider/model/source id에 유지된다.

### 11.10 UX 결정 완료

- 제품명 표기: primary product name은 `AgentPayroll`이다. Production Next UI/API/report/email sender는 이 이름을 사용한다.
- 역할별 기본 홈: demo workspace 기본 persona는 `developer`다. CEO/PM은 role query/control로 전환한다.
- demo login 정책: Supabase seeded demo account를 사용자가 직접 입력한다. 이메일은 env로 안내/프리필할 수 있지만 password는 UI/코드에 노출하지 않는다.
- report download 우선순위: PDF가 첫 CTA이며 Markdown/JSON은 보조 artifact다.
- admin 노출 범위: demo admin은 readiness/review-first다. connector/retention/billing mutation은 owner/admin + sandbox env + approval/idempotency/rollback/ledger 조건을 만족하기 전까지 blocked로 보인다.

---

## 12. 참조 인덱스

- 헌법: `CLAUDE.md`
- 방향 PRD: `docs/PRD-v3.md`(v3.4), `docs/PRD-v2.md`(v2.5 복구 정본)
- 폴더 구조: `docs/architecture/folder-structure.md`
- 역할 projection 계획: `docs/architecture/2026-05-24-role-projection-plan.md`
- RAG 코퍼스 설계: `docs/architecture/2026-05-25-agent-rag-corpus-design.md`
- Money Leak Run 계획: `docs/superpowers/plans/2026-05-26-agentpayroll-money-leak-run.md`
- LangChain runtime 설계: `docs/superpowers/specs/2026-05-26-agentpayroll-langchain-1-agent-runtime-design.md`
- Service validation 계획/자산: `docs/superpowers/plans/2026-05-26-agentpayroll-service-mvp-validation.md`, `docs/service-validation/`
- 운영 조직: `src/features/operating-assets/lib/operatingAssets.ts`
- 결정론 코어: `src/lib/calculator.ts`, `src/lib/format.ts`
- 에이전트 런타임: `src/features/agent/lib/`, `agent_service/agentic_runtime.py`
