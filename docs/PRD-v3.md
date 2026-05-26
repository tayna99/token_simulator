# PRD: AgentPayroll v3.4

부제: **AI SaaS Cost · Margin · Decision Operating System(AI SaaS 비용·마진·결정 운영체계)**
문서 버전: 3.4 · 2026-05-26
상태: Draft · Next.js 웹앱 + Money Leak Run + HITL runtime proof 기준 PRD
관계: `docs/PRD-v2.md`는 구현 사실 복구 정본으로 보존한다. `docs/PRD-current-state-2026-05-25.md`는 현재 코드 사실 기록이다. 이 문서는 v1/v2/v3의 제품 방향, 2026-05-26 현재 구현 내용, 그리고 Next.js 프론트 웹앱으로 이관하며 구현할 범위를 한데 묶은 **현재 방향 PRD**다.

---

## 0. 이번 버전이 포괄하는 범위

v3.4는 단순히 "PRD 문구 업데이트"가 아니라 다음 세 종류의 진실을 합친다.

| 출처 | 이 문서에 반영한 내용 |
| --- | --- |
| 기존 PRD(v1, v2, v3.2) | AgentPayroll의 문제, 페르소나, 5단계 결정 흐름, deterministic cost/margin 원칙, SDK-lite와 Margin Guard 방향 |
| 현재 구현 사실(2026-05-26) | Next App Router shell, Money Leak Run(비용 누수 진단 실행), 11개 운영 에이전트, LangChain 1.0 agent runtime, HITL checkpoint/resume, runtime proof(실행 증거)와 human approval metadata(사람 승인 메타데이터), C1-C9 RAG 코퍼스 계약, 분리된 RAG collection, report artifact, retention/runtime/status route |
| 지금 구현 계획 | Money Leak Run을 첫 5분 고객 경험으로 고정하고, Supabase pgvector(Postgres 안의 벡터 검색 확장) official-doc retrieval(공식 문서 검색), production demo tenant, persisted decision/report ledger, AI Cost Snapshot report(유료 1회 리포트) 서비스 검증 루프를 운영화 |

이 문서는 "지금 있는 것"과 "Next.js로 옮기며 만들 것"을 분리한다. 구현 사실은 `docs/PRD-current-state-2026-05-25.md`가 더 엄격한 기준이고, 이 문서는 제품과 구현 계획을 함께 잡는 실행용 PRD다.

---

## 1. 한 줄 정의

AgentPayroll은 AI SaaS의 사용 기록을 고객·기능·모델·요금제·세션·에이전트 실행별 원가와 마진으로 바꾸고, 어떤 결정을 내려야 하는지까지 운영 일지에 남기는 **AI 비용·마진·가격 결정 워크스페이스**다.

핵심은 토큰 계산기가 아니다. 질문은 "토큰을 얼마 썼나"가 아니라 다음이다.

- 어떤 고객이 AI 원가 때문에 손해인가?
- 어떤 기능이 gross margin(매출총이익률)을 깨고 있는가?
- 정액제, credit(충전식 크레딧), cap(사용 상한), overage(초과 요금), hybrid(혼합 과금) 중 무엇으로 가격을 바꿔야 하는가?
- 모델을 바꾸면 비용은 줄어도 품질·지연·리스크가 감당 가능한가?
- Developer, PM, CEO가 같은 숫자와 같은 근거로 의사결정할 수 있는가?
- 다음 달에도 같은 기준으로 반복 리뷰와 리포트를 만들 수 있는가?

장기 비전은 **AI Native Company(AI를 운영 방식의 기본으로 삼는 회사)의 CFO/Ops 레이어(재무·운영 판단층)**다. Observability(관측/추적 도구)와 Billing(과금 도구) 사이에 비어 있는 "LLM 사용량을 비즈니스 판단으로 번역하는 레이어"를 차지한다.

---

## 2. 문제

AI 기능이 들어간 SaaS에서 LLM 비용은 단순 운영비가 아니라 매출 원가(COGS)다. 전통 SaaS는 사용량이 늘어도 한계비용이 낮지만, AI SaaS는 요청 수, 입출력 길이, 재시도, 캐시 적중률, 모델 선택, latency(지연 시간), human review(사람 검수) 여부에 따라 원가가 계속 변한다.

OpenAI, Anthropic, Gemini 콘솔이나 Helicone, Langfuse 같은 도구는 총 토큰과 총 비용을 보여준다. 하지만 팀이 실제로 내려야 하는 결정은 더 비즈니스적이다.

- "Pro 플랜 고객 중 누가 손해인가?"
- "이 기능을 출시하면 gross margin 기준을 넘는가?"
- "캐싱, batching, output cap, 모델 교체 중 무엇이 가장 안전한가?"
- "가격표를 바꿔도 되는가, 아니면 먼저 human review/A-B/rollback이 필요한가?"
- "경영진에게 한 장으로 설명 가능한가?"

AgentPayroll은 총액 dashboard(대시보드)가 아니라 **usage export(사용량 내보내기) → trust check(신뢰 확인) → deterministic snapshot(결정론 계산으로 만든 그 시점 분석 데이터 묶음) → operating agents(운영 분석 에이전트) → human decision(사람의 결정) → ledger/report(기록 장부/보고서)**까지 이어지는 의사결정 제품이다.

---

## 3. 절대 원칙

1. **계산은 TypeScript 결정론 엔진.** 비용, 마진, 절감액, 예산 초과, alert 조건은 `src/lib/calculator.ts`, `src/domain/cost/`, unit-economics/pricing pure modules가 권위다.
2. **표시는 format 경로.** 사용자 표시 숫자는 `src/lib/format.ts` 계열 함수를 통과한다.
3. **AI는 숫자를 만들지 않는다.** AI와 RAG는 `tool:*`, `snapshot:*`, `risk:*`, `decision:*`, `evidence:*` ref가 붙은 해석, 요약, 다음 액션 초안만 만든다.
4. **RAG(검색으로 근거 문서를 붙여 답하는 방식)는 스니펫과 근거만 제공한다.** 공식 가격 숫자는 Watchtower candidate(감시함의 후보 항목) → human review(사람 검토) → Fact Ledger(사실 장부) 경로를 거쳐야 한다.
5. **baseline 없으면 지어내지 않는다.** 벤치마크가 비어 있으면 `baseline_unavailable`을 유지하고 평균/순위/품질점수를 만들지 않는다.
6. **Prompt-free가 기본값.** raw prompt, messages, API key, secrets, PII는 기본 수집하지 않는다.
7. **역할별 화면은 달라도 숫자는 같다.** Developer/PM/CEO view는 같은 deterministic snapshot과 같은 usage rows를 읽는다.
8. **Billing(과금) 실행은 금지.** Rate Card(요금표 초안)와 pricing policy(가격 정책)는 draft/export/decision record(초안/내보내기/결정 기록)까지다. Stripe/Metronome 변경은 별도 human-approved mutation path(사람이 승인한 변경 실행 경로)가 생기기 전까지 실행하지 않는다.
9. **Next.js 서버 모듈은 lazy init.** Supabase, OpenAI, Resend, Slack 같은 runtime client는 module scope에서 만들지 않고 getter/handler 내부에서 초기화한다.
10. **Runtime proof 없이는 실행 완료가 아니다.** `provider_llm`, `resumed`, `interrupt_requested`, `deterministic_preview`, `unavailable` 상태와 `providerRunId`, `agentInvocationProof`, checkpoint metadata가 구분되어야 한다.
11. **HITL checkpoint는 사람 승인 이후에만 resume된다.** Adopt/Reject/Hold와 approval metadata가 decision/report artifact에 남아야 하며, raw resume payload는 report에 노출하지 않는다.
12. **Forbidden tool claim은 거부한다.** Provider output이 billing/customer send/decision creation 같은 forbidden mutation을 수행했다고 주장하면 `guardrail_rejected` 또는 fallback 상태로 낮춘다.

---

## 4. 페르소나

| 페르소나 | 원하는 것 | 우선 화면 |
| --- | --- | --- |
| Developer / Backend / ML | 로그, 모델, latency, error, retry, cache, 비용 급증 원인 | Developer workspace |
| Founder / CEO / CFO | 남는 돈, 손해 고객, 가격 결정, 보고 자료 | CEO workspace |
| PM / RevOps / CS | 기능별 원가, 출시 판단, 고객 설명 | PM workspace |
| Bootcamp / early team | API 예산 소진 위험, 발표용 AI 사용 리포트 | Guided setup + report |
| Operator / 내부 관리자 | 소스 신선도, RAG evidence, agent route, runtime 상태 | Admin/debug workspace |

역할은 권한 모델이 아니라 **강조점**이다. 같은 workspace에서 같은 snapshot을 읽되, Developer는 원인과 로그, PM은 기능·출시 판단, CEO는 마진·손해 고객·가격 결정을 우선한다.

---

## 5. 제품 척추

첫 화면은 빈 대시보드가 아니다. 사용자는 setup wizard가 아니라 **Money Leak Run(비용 누수 진단 실행)**으로 진입한다. 첫 5분의 질문은 "대시보드를 둘러볼까?"가 아니라 "이번 달 AI 때문에 돈이 새는 고객·기능·요금제를 찾을 수 있나?"다.

```text
CSV 또는 summary 입력
-> Trust Gate
-> 손해 고객 / 마진 깨는 기능 진단
-> Margin Story
-> Policy Candidate
-> 사람의 Adopt / Reject / Hold 결정
-> PDF Artifact / Decision Ledger / 다음 반복 리포트
```

기존 v3.2의 5단계 decision flow는 유지한다.

```text
Design -> Cost -> Bottleneck -> Optimize + Risk -> Decision Log
```

Next.js 웹앱에서는 이 흐름을 route와 server boundary로 더 명확히 나눈다.

| Route 후보 | 목적 | 주요 컴포넌트/기능 |
| --- | --- | --- |
| `/` | 제품 진입 또는 workspace redirect | guided setup, sample load |
| `/w/[workspaceId]` | 주 작업 공간 | Money Leak Run, Trust Gate, diagnosis, decision choice, PDF gate |
| `/w/[workspaceId]/admin` | tenant/admin readiness | Supabase, RAG, Watchtower, retention, connector readiness |
| `/reports/[id]` | one-page report와 artifacts | markdown/json/pdf artifact download, runtime proof, human approval |
| `/api/usage/import` | 사용량 업로드/adapter intake | Trust check, schema mapping, normalized usage |
| `/api/decisions` | Decision/Operating Ledger | adopt/reject/hold, runtime proof, human approval |
| `/admin/sources` | 내부 소스/Watchtower/RAG 관리 | C1-C9 registry, source freshness, review queue |

초기 Next.js 전환에서는 모든 route를 한 번에 완성하지 않는다. 먼저 `/w/[workspaceId]`의 Money Leak Run, `/w/[workspaceId]/admin`, report artifact, runtime status, RAG/watchtower/report/retention route handler를 P0로 잡는다.

---

## 6. 현재 구현 기반

| 영역 | 현재 상태 |
| --- | --- |
| 모델/가격 카탈로그 | `models.ts`, official source registry, pricing freshness/watchtower 계열 테스트 |
| 사용 기록 | CSV import, SDK-lite event normalize, OpenAI/Anthropic/Vercel AI Gateway/Helicone/Langfuse/OpenRouter/LiteLLM schema evidence |
| 비용 계산 | text 중심 deterministic cost engine, multimodal skeleton, unsupported pricing guard |
| 비용 귀속 | customer / feature / model / plan / session / agent_run |
| 마진 | plan margin, customer margin, heavy-user detection |
| 가격 | flat / usage / credit / hybrid / cap / overage, rate-card draft는 billing 미실행 |
| Trust | Data Intake Policy, Security Middleware, raw prompt/API key/PII 차단, retention note |
| Front Operating | ICP, self-assessment, data readiness, offer ladder, approval matrix, learning loop context |
| Operating Team | 11 operating agents, 10 operating assets, stage routing, all-hands/fallback smoke |
| Agent Runtime | TypeScript deterministic runtime + Python `agent_service` FastAPI/LangChain runtime + provider/fallback/hardening guardrails |
| HITL / Runtime Proof | checkpoint interrupt/resume, providerRunId, agentInvocationProof, runtime status, human approval metadata |
| RAG | C1-C9 corpus contract, official docs vector RAG, benchmark/usage/decision split retrieval, backend Chroma store, Supabase production store 준비, `official_docs`/`benchmark_evidence`/`decision_history` collection 분리 |
| Reports | one-page report, report artifacts, `/api/reports/[id]/download`, runtime proof + human approval + checkpoint resume proof |
| Runtime Ops | `/api/runtime/status`, `/api/retention/run`, `/api/watchtower/*`, `/api/reports/*`, audit export refs, retention jobs |
| Service Validation | `AI Cost Snapshot report` 유료 리포트 offer, ICP scorecard, data readiness checklist, review call script, validation ledger |

진행 중인 구현 범위:

- Supabase pgvector official-doc RAG retrieval: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`가 있을 때 official docs index/retrieval을 production store로 연결한다.
- Production demo tenant: Supabase Auth, membership, usage snapshot, accepted facts, watchtower run, RAG chunks, report artifact, `agent_service` reachability가 모두 연결되어야 성공이다.
- Money Leak Run hardening: Trust Gate, 손해 고객/기능 진단, Decision Candidate, explicit Adopt/Reject/Hold, PDF artifact gate를 첫 화면의 기본 흐름으로 유지한다.
- HITL runtime proof hardening: checkpoint resume는 human approval과 함께 decision/report ledger에 남기고, provider/preview/unavailable 상태를 섞지 않는다.
- Service MVP validation: broad SaaS 기능 요구가 아니라 `AI Cost Snapshot report 30만~100만 원` 유료 리포트 반복 요청으로 시장 신호를 판정한다.

---

## 7. Next.js 프론트 웹앱 범위

### 7.1 목표

Next.js 전환의 목적은 단순 프레임워크 교체가 아니다. 현재 Vite 단일 앱에 섞여 있는 UI, API wrapper, persistence fallback, admin/debug surface를 제품 수준의 웹앱 경계로 나누는 것이다.

P0 목표:

- App Router 기반 workspace shell 구성
- Server Component는 workspace/report/source 상태를 읽고, interactive workspace는 Client Component island로 유지
- Route Handler로 기존 `/api/*` 기능 이관
- Server Action은 authenticated workspace mutation에만 제한적으로 사용
- Supabase persistence와 local demo fallback의 경계를 명확화
- Python `agent_service`는 별도 runtime으로 유지하고 Next Route Handler가 bridge/proxy 역할을 한다

### 7.2 App Router 설계 원칙

| 원칙 | 적용 |
| --- | --- |
| Server Components default | report list, workspace metadata, source registry, runtime status read 모델 |
| Client island 최소화 | stage workspace, role selector, file upload, pricing scenario controls, agent run buttons |
| Route Handler 사용 | public API, report download, RAG index/evidence, retention run, runtime status, agent bridge |
| Server Action 사용 | workspace decision 저장, report 생성 요청, settings update처럼 app-internal mutation |
| Lazy runtime clients | Supabase/OpenAI/Resend/Slack/Stripe/Metronome client는 handler/getter 내부에서 초기화 |
| 계산 경계 유지 | Next 서버도 숫자 계산을 새로 만들지 않는다. 기존 deterministic TS 모듈을 재사용한다 |

### 7.3 API 이관 대상

현재 목표는 Vercel `api/*` wrapper의 책임을 Next Route Handler로 옮기고, production route에서 demo/memory/request fixture를 운영 데이터처럼 쓰지 않는 것이다.

| 현재 API | Next.js 목표 | 역할 |
| --- | --- | --- |
| `api/rag/p1-evidence.ts` | `app/api/rag/p1-evidence/route.ts` | C1/C2/C4/C9 evidence retrieval |
| `api/rag/index.ts` | `app/api/rag/index/route.ts` | official doc chunks index |
| `api/runtime/status.ts` | `app/api/runtime/status/route.ts` | Supabase/OpenAI/agent/connectors capability |
| `api/retention/run.ts` | `app/api/retention/run/route.ts` | retention jobs, audit export refs |
| `api/reports/[id]/download.ts` | `app/api/reports/[id]/download/route.ts` | markdown/json/pdf artifact serving |
| `api/usage/import.ts` | `app/api/usage/import/route.ts` | Trust-safe usage import |
| `api/team-cost/calibrate.ts` | future `app/api/team-cost/calibrate/route.ts` | planned vs actual calibration |
| `api/agent/run.ts` | `app/api/agent/run/route.ts` | Python agent service bridge |
| decision store API | `app/api/decisions/route.ts` | decision ledger CRUD with runtime proof/human approval |
| watchtower API | `app/api/watchtower/runs/route.ts`, `app/api/watchtower/review/route.ts` | official source run/review queue |

### 7.4 Next.js에서 유지할 UI 경계

- `src/lib/calculator.ts`, `src/lib/format.ts`는 public compatibility path로 유지한다.
- `src/features/*`의 순수 domain/lib는 Next에서도 그대로 재사용한다.
- `src/app/App.tsx`에 몰려 있는 workspace shell은 점진적으로 route-level page와 feature component로 분리한다.
- role projection은 stage를 복제하지 않고 같은 snapshot을 role-aware view model로 projection한다.
- admin/debug surface는 customer workspace와 분리한다. 내부 ref(`tool:*`, `source:*`, `asset:*`)는 admin/debug에서 더 많이 보이고 고객 화면은 decision/action 중심으로 줄인다.

---

## 8. MVP 순서

### MVP 1: Money Leak Run + AI Cost Snapshot report Service MVP

샘플/CSV/export 기반으로 실제 사용 기록을 분석하고, 첫 산출물은 넓은 SaaS dashboard가 아니라 `AI Cost Snapshot report 30만~100만 원` 유료 리포트다.

- Trust Intake로 prompt/API key/PII/schema health 확인
- normalized usage table 생성
- customer/feature/model/plan/session/agent_run 귀속
- 원가/마진/손해 고객/가격 시나리오 계산
- stage-routed operating agents review
- adopt/reject/hold decision ledger
- runtime proof + human approval metadata가 붙은 report artifact export
- Next.js workspace shell에서 같은 flow 제공
- ICP scorecard, data readiness checklist, review call script, validation ledger로 반복 리포트 요청 여부 기록

### MVP 2: SDK-lite 자동 수집

SDK-lite는 "붙이고 끝"이 목표다. Gateway보다 먼저 만든다.

수집 이벤트:

```text
timestamp, request_id, customer_id, plan_id, feature, model,
session_id, agent_run_id, input_tokens, output_tokens,
total_cost, latency_ms, status
```

허용:

- feature/model/tokens/cost/latency/status
- customer/plan/session/agent_run 같은 business metadata
- retry/cache/human_review 같은 운영 metadata

금지:

- raw prompt
- messages
- API key / secrets
- PII

SDK 이벤트도 CSV와 동일하게 Trust pipeline을 통과해야 snapshot에 들어간다.

### MVP 3: Alert / Margin Guard

Alert는 "비용 알림"이 아니라 "결정 필요한 알림"이다. v1은 4종만 둔다.

| Alert family | 조건 | 사용자가 내려야 할 결정 |
| --- | --- | --- |
| 비용 급증 | 최근 사용량/원가가 baseline 대비 급증 | 모델/기능/호출 제한 확인 |
| 예산 초과 예측 | 현재 추세로 월 예산 초과 예상 | cap, plan, usage policy 조정 |
| 손해 고객/기능 | 고객/기능 gross margin이 기준 이하 | 가격 정책 또는 feature gating |
| 모델 변경 리스크 | 모델 교체 후보가 비용은 낮지만 품질/latency/risk 조건 있음 | A/B, human review, rollback |

조건 판정은 deterministic rule이다. AI는 설명문과 다음 액션 초안만 작성한다.

### MVP 4: Gateway / Proxy

Gateway는 선택형 고급 모드다. 초기 MVP가 아니다.

가능 기능:

- 비싼 요청 차단
- 싼 모델 라우팅
- provider fallback
- 고객별 예산 제한
- 모델/기능별 policy enforcement

진입 조건:

- SDK-lite로 반복 사용 데이터가 충분히 쌓임
- Trust/security/outage 책임 문서화
- 장애 시 fallback 정책 정의
- 고객 트래픽 중간에 서는 리스크에 대한 명시적 승인

---

## 9. 현재 구현 계획으로 확정된 범위

### 9.1 Trust Pipeline

P0 제품 stage로 승격한다.

- raw customer export가 Python/LangChain이나 AI panel로 직접 가지 않는다.
- Data Intake Policy, Security Middleware, schema mapping, anonymization status, analysis scope, retention note를 먼저 만든다.
- snapshot에 들어가는 것은 normalized metadata와 deterministic usage rows다.

### 9.2 Front Operating System

고객 선별과 데이터 준비도를 제품 flow의 앞문으로 둔다.

- ICP scorecard
- self-assessment 8문항
- Data Readiness Gate
- sample report 진입
- offer ladder
- human approval matrix
- learning loop

P0에서는 실제 결제, 이메일 발송, LinkedIn/Notion/Airtable 동기화는 하지 않는다.

### 9.3 Operating Team Runtime

11개 operating agents는 stage router로 실행한다.

- Design, Cost, Bottleneck, Optimize, Decision Log 단계별 primary/reviewer agent
- all-hands review
- supervisor synthesis
- tool/ref chips
- fallback mode
- provider-backed smoke

Python agent는 숫자를 계산하지 않고, deterministic snapshot과 read-only tools만 읽는다.

### 9.4 RAG Corpus Full Coverage

RAG 설계는 "공식 문서 카탈로그 하나"가 아니라 C1-C9 코퍼스 레지스트리와 분리 retriever 집합이다.

| Corpus | 목적 | 상태 |
| --- | --- | --- |
| C1 official_source | 가격·모델 문서·changelog | official docs vector RAG, Watchtower candidate |
| C2 model_benchmark | 품질/benchmark evidence | `baseline_unavailable` 원칙 포함 |
| C3 serving_economics | vLLM/GPU serving economics | self-hosted 비용과 API 가격 분리 |
| C4 usage_schema | adapter/export schema mapping | OpenAI/Anthropic/Vercel/Helicone/Langfuse/OpenRouter/LiteLLM |
| C5 cost_methodology | 비용 공식/회계 방법론 | deterministic registry 권위 |
| C6 optimization_playbook | caching/routing/batching/output cap | recommendation basis |
| C7 pricing_strategy | credit/overage/cap/hybrid 정책 | pricing scenario/rate card draft |
| C8 trust_compliance | PII/retention/output guard | Trust pipeline |
| C9 decision_history | decisions/risks/snapshots | decision retriever |

Next.js에서는 C1/C2/C4/C9 retrieval을 먼저 workspace API로 노출하고, C3/C5-C8은 registry/read model부터 안정화한다.

### 9.5 Production Persistence

현재 목표 store는 Supabase다.

- `rag_chunks`: official docs chunks + embedding + metadata
- `checkpoints`: agent/team-cost runtime checkpoint
- `decisions`: adopted/rejected/held decision rows
- `reports`: report run shells and artifact metadata
- `retention_jobs`: deletion/audit jobs
- `workspace_settings`: runtime/connectors/settings

local memory/localStorage fallback은 demo와 개발용으로 유지한다. production path는 Supabase를 우선한다.

### 9.6 Report, Retention, Runtime Ops

P1 runtime endpoints는 Next.js 전환 후에도 제품 요구로 유지한다.

- report artifact download: markdown/json/pdf body와 metadata 제공
- retention run: raw upload 삭제 job, audit export ref 기록
- runtime status: agent service, OpenAI embedding, Supabase, Slack/Resend/Stripe/Metronome readiness 표시

### 9.7 Rate Card Decision Loop

가격 변경은 실행이 아니라 **결정과 초안 산출물**이다.

- Decision Header: 오늘 내려야 할 결정 1개
- Export Gate: adopt/reject/hold 전에는 report/rate-card export 차단
- Pricing Freshness: source verified/estimated/tbd/source_changed 상태
- UsageEvent v2: multimodal/cache/tool/search 컬럼 확장
- Rate Card Draft: included credits, overage, cap, affected customers, margin basis, draft_only

### 9.8 Money Leak Run

Money Leak Run은 `/w/[workspaceId]`의 첫 고객 경험이다.

- CSV/summary 입력 직후 Trust Gate가 raw prompt, API key, PII, mapping gap을 먼저 설명한다.
- 진단은 손해 고객, 마진 깨는 기능, Decision Candidate, Adopt/Reject/Hold, PDF artifact 순서로 이어진다.
- `ReportFirstDiagnosisWorkspace`는 일반 고객 화면에서 evidence refs를 요약하고, expert/audience surface에서 tool/snapshot/evidence refs를 펼친다.
- Decision Candidate는 기본 선택을 갖지 않는다. 사용자가 Adopt/Reject/Hold를 명시해야 report payload와 PDF gate가 열린다.
- blocked 또는 needs_mapping 상태에서는 손익 판단과 PDF를 완료처럼 렌더하지 않는다.

### 9.9 HITL Runtime Proof and Human Approval

LangChain 1.0 runtime은 결정을 대신하지 않고 checkpoint를 통해 사람 승인을 기다린다.

- `hitlCheckpoint`는 all-hands 또는 민감한 agent delegation에서 `interrupt_requested`로 멈출 수 있다.
- Adopt/Reject/Hold 후 resume은 Decision Log/report artifact에서 `runtime.status=resumed`와 `humanApproval.approvalMode=checkpoint_resume`으로 남을 수 있다.
- Decision Log와 report artifact는 `runtimeProof`, `humanApproval`, checkpoint id/thread id를 보존한다.
- report는 raw `resumePayload`를 출력하지 않고 checkpoint status/id와 approval mode만 공유한다.
- provider output이 forbidden mutation tool claim을 만들면 runtime은 거부하거나 fallback으로 낮춘다.

### 9.10 Service MVP Validation

제품 검증은 "대시보드 기능을 더 만들자"가 아니라 유료 리포트 반복 요청으로 판정한다.

- Offer: `AI Cost Snapshot report 30만~100만 원`, 데이터 수령 후 3~5영업일, 1장 요약 리포트 + 계산 부록 + 30분 리뷰콜.
- ICP: 실제 AI 기능 운영, 월 LLM/API 비용, usage metadata 보유, 가격/limit 결정 압박, 리포트 공유 대상이 있는 리드를 A/B/C로 나눈다.
- Data readiness: raw prompt, 개인정보, API key 없이 customer/plan/feature/model/token/cost/revenue metadata만 받는다.
- Review call: 데이터 공유 의도, 리포트 공유 의도, 가격/limit 결정 의도, 반복 리포트 요청 신호를 quote로 기록한다.
- Pass는 반복 서비스 리포트 요청 또는 2개 이상 ICP 적합 고객의 유료 리포트 요청으로만 준다.

---

## 10. 아키텍처

```text
Next.js App Router
  Server Components: workspace/report/source read models
  Client Components: interactive decision workspace
  Route Handlers: rag, runtime, retention, reports, sdk-lite, agent bridge
  Server Actions: app-internal workspace mutations

Customer CSV / SDK-lite / Adapter export
  -> Trust Pipeline
  -> Normalized Usage Table
  -> Deterministic Snapshot
  -> Cost / Margin / Pricing Pure Modules
  -> RAG Evidence Retrieval
  -> Python Operating Agents
  -> HITL Checkpoint when approval is required
  -> Supervisor Synthesis
  -> Human Decision
  -> Runtime Proof + Human Approval Metadata
  -> Decision + Operating Ledger
  -> PDF Report / Rate Card Draft / Audit Export
  -> Service MVP Learning Loop
```

권위:

- 가격/모델 spec: structured fact table + approved Fact Ledger
- 계산: TypeScript pure functions
- RAG: evidence snippets, source refs, context blocks
- 해석: AI agent with refs
- 결정: human approval + ledger
- 실행 증거: runtime proof + checkpoint proof + provider/fallback status
- 반복 학습: Plan vs Actual + Decision history

Runtime 분리:

- Next.js: UI, API route boundary, authenticated workspace, persistence bridge
- TypeScript domain: deterministic math and policy
- Python `agent_service`: LangChain operating agents, read-only tool use, supervisor prose
- Supabase: production persistence and pgvector RAG
- Chroma: backend agent-service RAG runtime proof and local vector store path

---

## 11. 성공 지표

정량:

- usage import/SDK ingestion 성공률
- Trust check blocked/needs_mapping/ready 비율
- attribution coverage
- report export 횟수
- pricing scenario와 rate-card draft 생성 횟수
- decision log 기록 수(adopt/reject/hold)
- checkpoint interrupt/resume 중 human approval metadata가 붙은 비율
- role switch 후 핵심 숫자 불일치 0건
- RAG evidence coverage(C1/C2/C4/C9 refs)
- runtime status configured workspace 수
- retention/audit job 완료율
- 유료 `AI Cost Snapshot report` 요청 수와 반복 리포트 요청 수

정성:

- "이 고객이 손해인지 몰랐다."
- "이걸로 가격을 바꿔야겠다."
- "우리 실제 사용 기록으로 해볼 수 있나?"
- "prompt를 안 가져가면 붙여볼 수 있다."
- "다음 달에도 같은 리포트를 받고 싶다."
- "개발자와 CEO가 같은 숫자로 이야기할 수 있다."
- "raw prompt 없이 이 정도 usage metadata는 공유할 수 있다."

안티지표:

- 토큰 계산기로만 사용됨
- 리포트 export는 하지만 decision log를 쓰지 않음
- alert가 너무 많아 무시됨
- Developer/CEO view 숫자가 서로 다름
- AI가 근거 없는 숫자를 설명함
- RAG 결과가 가격 숫자를 직접 덮어씀
- provider output이 실제 실행하지 않은 tool/customer/billing mutation을 실행 완료처럼 주장함
- checkpoint resume 또는 human approval 없이 report가 ledger-backed처럼 보임
- Next.js 전환 후 client bundle이 과도하게 커지고 workspace 첫 진입이 느려짐
- SaaS dashboard 기능 요청만 많고 유료 리포트 반복 요청은 없음

---

## 12. Non-goals

- LLM이 비용/마진/절감액/예산 초과 숫자를 계산하지 않는다.
- 공식 가격 변경을 RAG retrieve 결과만으로 Fact Ledger에 반영하지 않는다.
- 벤치마크가 부족할 때 peer average를 만들지 않는다.
- Billing/Stripe/Metronome mutation을 자동 실행하지 않는다.
- Gateway/Proxy를 초기 MVP에 넣지 않는다.
- prompt, messages, API key, secrets, PII를 기본 수집하지 않는다.
- Next.js 전환을 핑계로 계산 모듈을 UI 컴포넌트 안으로 옮기지 않는다.
- 고객 화면에 내부 `tool:*`, `asset:*`, `source:*`, raw agent route를 과도하게 노출하지 않는다.
- provider output의 forbidden mutation claim을 그대로 신뢰하지 않는다.
- raw checkpoint resume payload를 customer-facing report에 노출하지 않는다.
- 넓은 SaaS 기능 관심을 Service MVP pass로 계산하지 않는다.

---

## 13. 리스크

| 리스크 | 완화 |
| --- | --- |
| 비용 계산 신뢰 하락 | 계산 경로 단일화, focused tests, `tool:*` refs, format 헌법 유지 |
| prompt/privacy 불안 | prompt-free default, Trust Intake, retention jobs, customer-visible data policy |
| Next.js 전환 중 기능 회귀 | route-by-route migration, old Vite behavior parity tests, focused browser smoke |
| Server/client 경계 혼선 | Server Component read model + Client island interaction 원칙 |
| Supabase/OpenAI env로 build crash | lazy initialization, runtime status endpoint, not_configured fallback |
| RAG가 fact authority처럼 보임 | `mayOverrideFacts:false`, Fact Ledger approval flow, source refs |
| 2-runtime 드리프트 | shared schemas, provider smoke, Python/TS contract tests |
| provider가 forbidden mutation을 했다고 주장 | middleware/tool allowlist, forbidden tool claim rejection, fallback status |
| HITL resume이 승인 없는 실행처럼 보임 | checkpoint metadata, humanApproval, approvalMode, report artifact proof |
| alert fatigue | decision-needed 4종만 customer-facing alert로 시작 |
| Gateway 책임 과중 | SDK-lite 이후 P2, outage/security plan 먼저 |
| 모델 가격 신선도 하락 | Watchtower, official source registry, human review queue |
| 서비스 검증이 SaaS 기능 요구로 흐림 | AI Cost Snapshot report offer/ledger에서 반복 리포트 요청만 pass로 계산 |

---

## 14. 미해결 질문

- 내부 문서의 `AgentCost` 잔여 표현을 언제 `AgentPayroll`로 정리할지.
- Next.js route handler와 legacy Vercel/Vite wrapper 제거 시점.
- Supabase Auth를 production membership/RLS와 어디까지 묶어 P0 demo 성공 기준으로 볼지.
- Supabase를 모든 persistence의 기본으로 승격할 트리거.
- SDK-lite 패키지 형태: npm package, snippet, server endpoint 중 무엇부터인가.
- Alert delivery: in-app first, Slack/Email opt-in later.
- Gateway의 첫 지원 provider 범위.
- Chroma와 Supabase pgvector의 장기 역할 분리. local proof vs production default.
- `AI Cost Snapshot report` 반복 리포트 요청이 몇 건이면 SaaS dashboard build로 넘어갈지.

---

## 15. 참고 문서와 구현 기준

| 문서/파일 | 역할 |
| --- | --- |
| `docs/PRD.md` | v1 product narrative |
| `docs/PRD-v2.md` | 복구된 구현 사실과 제품 가치 매핑 |
| `docs/PRD-current-state-2026-05-25.md` | 현재 코드 사실 기록 |
| `docs/superpowers/plans/2026-05-24-complete-service-mvp-trust-runtime.md` | Trust runtime/service MVP 계획 |
| `docs/superpowers/plans/2026-05-24-agentcost-front-operating-system.md` | Front Operating System 구현 계획 |
| `docs/superpowers/plans/2026-05-24-operating-team-runtime-remaining-scope.md` | 11-agent runtime 남은 범위 |
| `docs/superpowers/plans/2026-05-24-rate-card-decision-loop.md` | Rate Card, Decision Header, export gate 계획 |
| `docs/superpowers/plans/2026-05-23-p1-extension-backlog.md` | P1 backlog와 activation rule |
| `docs/superpowers/plans/2026-05-26-agentpayroll-money-leak-run.md` | Money Leak Run 구현 계획 |
| `docs/superpowers/specs/2026-05-26-agentpayroll-langchain-1-agent-runtime-design.md` | LangChain 1.0 agent runtime / HITL 설계 |
| `docs/superpowers/plans/2026-05-26-agentpayroll-service-mvp-validation.md` | AI Cost Snapshot report 서비스 검증 계획 |
| `docs/service-validation/` | ICP, data readiness, offer, review call, learning loop, validation ledger 운영 자산 |
| `src/lib/calculator.ts` | 비용 계산 헌법상 단일 경로 |
| `src/lib/format.ts` | 표시 숫자 formatting 경계 |
| `src/features/p1/lib/p1OperatingSystem.ts` | P1 usage, external action, RAG, retention 운영 계약 |
| `src/server/p1ApiHandlers.ts` | 현재 API handler 구현 경계 |
| `src/server/storage/supabaseProductionStore.ts` | Supabase persistence/pgvector store 준비 |
| `src/features/report-first/` | Money Leak Run 진단/step rail/first-view workspace |
| `src/features/provenance/lib/runtimeApprovalMetadata.ts` | runtime proof와 human approval metadata |
| `agent_service/` | Python FastAPI/LangChain operating agent runtime |
