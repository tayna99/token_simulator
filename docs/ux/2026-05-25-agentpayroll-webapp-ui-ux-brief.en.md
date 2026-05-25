# AgentPayroll 웹앱 UI/UX 상세 기획 브리프

작성일: 2026-05-25
참고: 파일명은 `.en.md`이지만, 이 문서는 한국어 현지화본으로 유지한다.

## 1. 제품 한 문장

AgentPayroll은 AI SaaS 팀을 위한 AI cost and margin operations web app(AI 비용·마진 운영 웹앱)이다. Usage logs(사용 로그)를 고객·기능·모델·요금제·세션·agent-run(에이전트 실행) 단위의 원가/마진으로 바꾸고, RAG(검색으로 근거 문서를 붙여 답하는 방식) evidence(근거), Watchtower(공식 가격·모델 변화를 감시하는 내부 검토함), rate card(요금표 초안), report(보고서), external action(외부 시스템 실행)까지 연결해 운영자가 무엇을 승인·보류·수정해야 하는지 결정하게 만든다.

## 2. 핵심 UX 원칙

- 데모라도 production path(실제 운영 경로) 위에서만 성공으로 보인다.
- Supabase, Auth(로그인/권한), pgvector(Postgres 안의 벡터 검색 확장), report, `agent_service`가 없으면 fake dashboard(가짜 대시보드) 대신 `unavailable`을 보여준다.
- RAG는 숫자를 만들지 않는다. RAG는 evidence(근거)이고, 숫자의 권위는 calculator(계산기)와 accepted fact ledger(승인된 사실 장부)에서만 온다.
- 모든 execution path(실행 경로)는 gate-first(조건 확인 먼저)다. approval(승인), idempotency(중복 실행 방지), rollback metadata(되돌릴 정보), ledger row(기록 행)가 없으면 실행 CTA가 아니라 blocked state(막힌 상태)를 보여준다.
- 기본 persona(사용자 관점)는 `developer`다.
- 제품명은 `AgentPayroll`이다.
- 첫 report CTA는 PDF다.
- Trust Gate(신뢰 확인 단계)는 숨겨진 보안 기능이 아니라 첫 번째 reassurance moment(안심시키는 순간)다. 업로드 직후 raw prompt/API key/PII 처리와 제한된 분석 범위를 설명해 구매 장벽을 낮춘다.
- Role-specific UX(역할별 화면)는 하나의 진실, 세 개의 렌즈다. Developer/PM/CEO는 같은 snapshot id(분석 시점 묶음 ID)와 KPI(핵심 지표)를 보되 질문, 강조점, 카드 순서만 달라진다.
- PDF는 보조 export가 아니라 founder(창업자), board(이사회), customer(고객)가 공유할 수 있는 value proof(가치 증명물)다.
- MVP는 billing automation(과금 자동 실행)보다 decision confidence(결정 확신)를 먼저 판다. Connector 실행은 admin readiness/locked section(관리자 준비도/잠금 섹션)에 두고, primary outcome(주요 결과)은 Rate Card Draft(요금표 초안)와 human decision(사람의 결정)이다.

## 3. 주요 사용자

| 사용자 | 주요 관심 | 기본 화면 강조 |
|---|---|---|
| Developer | import schema(가져오기 스키마), trace(추적 로그), retry/cache, model usage, agent-run 병목 | operational signals, debug refs, serving bottlenecks |
| PM | 기능/고객/요금제 economics(단위경제성), pricing scenarios | feature economics, decision readiness, customer-safe report |
| CEO | margin risk(마진 위험), 손실 고객, rate card, report | margin risk, one-page summary, export/billing gate |
| Admin/Owner | Auth, membership, corpus(문서 묶음), connectors, retention(보관/삭제) | readiness checklist, blocked reasons, sandbox controls |
| Customer viewer | 내부 ref(참조 ID) 없는 결과 확인 | report, accepted evidence, masked refs |

## 4. Route 구조

| Route | 목적 | 성공 상태 | 실패 상태 |
|---|---|---|---|
| `/` | SSR marketing(서버 렌더링 마케팅) + production demo 진입 | 제품명, 카테고리, demo CTA, report 예시 | fake screenshot 금지 |
| `/login` | Supabase Auth login | 사용자가 seeded demo account(시드된 데모 계정)를 직접 입력 | auth/env/session error |
| `/w/[workspaceId]` | 메인 운영 workspace | production checks + KPI + decision flow | `production_demo_unavailable` |
| `/w/[workspaceId]/admin` | 운영 readiness/admin | corpus, connector, retention, billing status | 권한 또는 env 누락 |
| `/reports/[id]` | persisted artifact(저장된 결과물) 조회 | PDF 우선 + Markdown/JSON 보조 | artifact 없음 |

## 5. 메인 Workspace 레이아웃

1. Health header: workspace id/name, role switch, audience mode, production status, stale badge.
2. KPI strip: monthly AI cost, margin risk, loss-making customers/features, recommended next decision.
3. Stage navigator: `Design -> Cost -> Bottleneck -> Optimize+Risk -> Decision Log`.
4. Primary work area: 역할별 primary card.
5. Evidence/Agent rail: RAG refs, accepted facts, provider proof, fallback reason.
6. Decision footer/rail: adopt/reject/hold, report export gate, last actor/time.

## 6. Stage별 기능

| Stage | 주요 기능 | 대표 UI |
|---|---|---|
| Design | usage import, schema mapping, team/agent setup, trust gate | import panel, schema checklist, trust warnings |
| Cost | customer/feature/model/plan/session/agent-run attribution(비용 귀속) | tables, KPI cards, cost breakdown |
| Bottleneck | retry/cache/model/serving 병목 | operational signal cards, trace refs |
| Optimize+Risk | routing, pricing, benchmark, rate card, risk cards | scenario panel, risk cards, rate-card readiness |
| Decision Log | adopt/reject/hold, report gate, ledger | decision list, export gate, report CTA |

## 6.1 Trust Gate First

Design/Import stage의 첫 성공 순간은 비용 차트가 아니다. AgentPayroll이 무엇을 수집하지 않았고 무엇에 쓰지 않았는지 확인시키는 것이다.

- 필수 안심 문구:
  - "raw prompt는 수집하지 않았습니다."
  - "API key 후보는 차단했습니다."
  - "PII 후보가 있어 매핑 검토가 필요합니다."
  - "이 데이터는 원가/마진 분석에 필요한 범위로만 사용됩니다."
- `ready`: cost/margin analysis(비용/마진 분석)로 진행할 수 있음을 보여준다.
- `needs_mapping`: PII/plan/customer/revenue 매핑 검토가 필요하며 fake success를 만들지 않는다.
- `blocked`: 차단된 데이터가 usage snapshot(사용량 분석 묶음), decision history corpus(결정 이력 문서 묶음), report artifact로 넘어갈 수 없음을 명시한다.
- 상세 security/retention metadata(보안/보관 메타데이터)는 보조 패널에 두고, 첫 패널은 신뢰와 다음 행동에 집중한다.

## 7. Role Projection

모든 role은 같은 snapshot을 쓰지만 중앙 콘텐츠 순서가 바뀐다. 숫자 값은 바뀌면 안 된다.

| Role | Primary | Auxiliary/Hidden |
|---|---|---|
| Developer | operational signals, import/schema, trace, retry/cache, serving | CEO summary, customer-facing report |
| PM | feature economics, pricing scenario, customer/plan readiness | low-level debug refs |
| CEO | margin risk, loss-making customers, rate card/report/export | detailed trace/debug |
| Customer audience | accepted facts, public-safe report | internal refs, debug, raw trace |

모든 role header에는 `same snapshot` proof badge(같은 분석 묶음을 보고 있다는 증거 배지)를 둔다. Developer는 "왜 비용이 늘었는지", PM은 "어떤 기능이나 요금제가 문제인지", CEO는 "얼마가 새고 어떤 결정이 필요한지"를 묻지만 monthly cost, margin, customer count, snapshot id는 동일해야 한다.

## 7.1 PDF와 Decision Draft

- 첫 report CTA는 "Share board-ready PDF"처럼 가치 중심 문구를 쓴다.
- Report page는 PDF preview/download 주변에 persisted artifact metadata, source decision, content type, generated time을 보여준다.
- primary rate-card panel은 billing execution panel(과금 실행 패널)이 아니라 decision draft(결정 초안)다.
- decision draft에는 가격을 바꿔야 하는 이유, 추천 방식, 영향받는 고객, 예상 마진 개선, 필요한 승인이 포함되어야 한다.
- Stripe/Metronome 실행은 admin의 `Execution deferred`/readiness 영역에 두고, 모든 safety gate(안전 조건)가 충족될 때까지 secondary locked UI로 남긴다.

## 8. 핵심 상태 모델

- `connected`: production store/service에서 실제 데이터를 읽었다.
- `unavailable`: env, DB, service, membership, corpus가 없다.
- `blocked`: permission, approval, idempotency, rollback, ledger가 부족하다.
- `connector_not_configured`: Slack, Resend, Stripe, Metronome env가 없다.
- `deterministic_preview`: 계산 preview일 뿐 agent 실행 완료가 아니다.
- `provider_llm`: 실제 provider-backed agent run(제공사 LLM을 호출한 실행)이다.
- `needs_review`: benchmark, parser, source 검토가 필요하다.
- `baseline_unavailable`: benchmark가 없다. peer average(동종 평균)를 만들면 안 된다.
- `stale`: Watchtower, fact, corpus freshness SLA(신선도 기준)를 넘겼다.

## 9. 기능 전체 목록

- Supabase Auth login
- workspace membership/RLS gate
- production demo readiness check
- usage CSV/summary/SDK-lite import
- Trust Gate: raw prompt/API key 차단, PII needs mapping, file type/size 검사
- deterministic cost/margin calculator
- customer/feature/model/plan/session/agent-run attribution
- C1 official source corpus
- C2 benchmark corpus
- C3 serving economics corpus
- C4 usage schema corpus
- C9 decision history corpus
- pgvector-backed RAG search
- Watchtower runs/review/accepted facts
- provider-backed agent runtime
- runtime status API
- risk cards
- optimization recommendations
- rate-card state machine
- billing readiness panel
- Slack/Email/Stripe/Metronome connector readiness
- external action approval/execution ledger
- persisted report artifacts: PDF, Markdown, JSON
- retention jobs: deletion/export audit
- admin readiness/review surface

## 10. Admin UX

Admin은 운영자가 무작정 action을 실행하는 곳이 아니라, 무엇이 왜 막혔는지 먼저 보는 곳이다.

필수 패널:

- Supabase/Auth readiness
- workspace membership status
- corpus readiness: C1/C2/C3/C4/C9
- Watchtower latest run + review queue
- accepted facts ledger status
- RAG index status
- connector status
- rate card/billing gate
- retention jobs
- report artifacts
- `agent_service` reachability

Mutation button(변경 실행 버튼)은 기본적으로 blocked다.

- owner/admin permission 필요
- sandbox/test env 필요
- human approval 필요
- idempotency key 필요
- rollback metadata 필요
- ledger row 필요

## 11. Report UX

Report page는 persisted artifact viewer(저장된 결과물 뷰어)다.

우선순위:

1. PDF download primary CTA
2. Markdown secondary
3. JSON secondary/internal

반드시 표시:

- report id
- workspace id
- artifact format/content type
- source decision ids
- generated timestamp
- evidence refs
- unavailable/deleted status

## 12. 화면 카피 원칙

- "completed"는 ledger row와 external ref가 있을 때만 쓴다.
- "recommended"는 evidence/ref가 있을 때만 쓴다.
- "executable"은 모든 readiness condition이 true일 때만 쓴다.
- production connectivity가 없으면 상태는 "demo unavailable"이지 "sample data shown"이 아니다.
- provider/model/source id는 `translate="no"`로 보호한다.

## 13. Mobile UX

Desktop dashboard를 그대로 줄이지 않는다. 흐름 순서를 다시 배열한다.

모바일 순서:

1. production status
2. next decision
3. top 3 KPIs
4. current stage primary card
5. evidence summary
6. decision action
7. report/export gate

## 14. 디자인 톤

- 조용하고 밀도 있는 SaaS operations tool(운영 도구).
- decorative hero/card excess(장식적인 히어로/카드 과잉) 금지.
- purple gradients, neon, glassmorphism 금지.
- status color는 connected, caution, blocked, unavailable이 명확히 구분되어야 한다.
- nested cards(카드 안의 카드)를 피한다.
- table과 list는 반복 사용자가 쉽게 훑을 수 있어야 한다.

## 15. UI 수용 조건

- production route에서 `DEMO_*` import 금지.
- `/w/demo` checks 실패 시 KPI/chart/agent success 금지.
- role 변경 시 cost/margin 숫자는 바뀌지 않는다.
- customer audience는 internal refs/debug를 숨긴다.
- report는 saved artifacts에서만 렌더한다.
- RAG는 fact나 calculator 숫자를 override하지 않는다.
- Billing push는 connector + approval + idempotency + rollback + ledger 없이는 blocked다.
- 375px 모바일 폭에서 텍스트나 버튼이 넘치지 않는다.

## 16. Language Switch / i18n 요구사항

AgentPayroll은 한국어와 영어를 separate language resources(분리된 언어 리소스)로 제공해야 하며, 사용자가 웹앱 안에서 전환할 수 있어야 한다.

핵심 요구:

- 한국어와 영어는 같은 screen structure(화면 구조)를 공유하되, visible copy/source text(보이는 문구/원문)는 별도 리소스로 관리한다.
- language switch는 workspace header 또는 user/account menu에 둔다.
- 선택한 언어는 workspace/user preference로 저장한다. 로그인 전에는 browser/session preference로 보존한다.
- provider name, model id, source id, ref id, code-like token은 번역하지 않는다.
- `translate="no"` 보호를 유지한다. 브라우저 자동번역에 의존하지 않는다.
- report artifact는 locale metadata를 가져야 한다. 예: `locale: ko-KR | en-US`.
- PDF/Markdown/JSON report download는 locale별 artifact를 구분해야 한다.
- 한국어판과 영어판은 같은 의미를 담되, 기계적 직역이 아니라 각 언어에서 자연스러운 운영 도구 문체를 쓴다.

필수 locale:

- `ko-KR`: 기본 한국어 운영 UI.
- `en-US`: 영어 운영 UI와 customer-facing report.

언어별 분리 대상:

- route/page visible copy
- status/error/blocked reason copy
- stage/card titles and descriptions
- role projection copy
- Trust Gate warning copy
- Admin readiness copy
- Rate-card/billing readiness copy
- Report artifact copy
- Email/Slack connector draft copy

언어 전환 수용 조건:

- 언어를 바꿔도 cost, margin, token, percentage 값은 바뀌지 않는다.
- provider/model/source/ref id는 양쪽 언어에서 동일하다.
- unavailable/blocked/error 상태는 양쪽 언어에 모두 있어야 한다.
- customer audience internal ref masking 정책은 언어와 무관하게 동일하다.
- 한국어와 영어 텍스트 모두 375px 모바일 폭에서 button/card overflow 없이 들어맞아야 한다.
