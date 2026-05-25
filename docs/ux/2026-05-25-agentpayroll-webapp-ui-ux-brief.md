# AgentPayroll 웹앱 UI/UX 상세 기획 브리프

작성일: 2026-05-25

## 1. 제품 한 문장

AgentPayroll은 AI SaaS의 사용 로그를 고객·기능·모델·플랜·세션·agent-run(에이전트 실행) 단위로 원가/마진화하고, RAG(검색으로 근거 문서를 붙여 답하는 방식) 근거·Watchtower(공식 가격/모델 변화를 감시하는 내부 검토함) 검토·rate card(요금표 초안)·report(보고서)·external action(외부 시스템 실행)까지 연결해 "무엇을 승인/보류/수정해야 하는지"를 운영자가 결정하게 만드는 AI 비용·마진 운영 웹앱이다.

## 2. 핵심 UX 원칙

- 데모라도 production path(실제 운영 경로) 위에서만 성공으로 보인다.
- Supabase/Auth/pgvector(Postgres 안의 벡터 검색 확장)/report/agent_service가 없으면 fake dashboard(가짜 대시보드) 대신 `unavailable`을 보여준다.
- RAG는 숫자를 만들지 않는다. RAG는 근거이고, 숫자는 calculator/fact ledger에서만 온다.
- 모든 실행은 gate-first(조건 확인 먼저)다. approval(승인), idempotency(중복 실행 방지), rollback metadata(되돌릴 정보), ledger(기록 장부)가 없으면 실행 CTA가 아니라 blocked state를 보여준다.
- 기본 persona는 `developer`다.
- 제품명은 `AgentPayroll`이다.
- report 첫 CTA는 PDF다.
- Trust Gate는 숨겨진 보안 기능이 아니라 첫 번째 안심 장치다. 업로드 직후 raw prompt/API key/PII/사용 범위를 먼저 말해 구매 장벽을 낮춘다.
- 역할별 화면은 하나의 진실, 세 개의 렌즈다. Developer/PM/CEO는 같은 snapshot id(분석 시점 묶음 ID)와 KPI(핵심 지표)를 보되 질문과 카드 우선순위만 다르다.
- PDF는 export(내보내기) 부가기능이 아니라 가치 증명물이다. "대시보드에 머무르게 하기"보다 "대표/고객에게 공유 가능한 리포트"를 흐름의 종착점으로 둔다.
- 초기 MVP는 billing push(과금 시스템 반영)보다 decision draft(결정 초안)를 판다. connector 실행은 admin readiness(관리자 준비도)의 보조/잠금 섹션으로 낮추고, primary outcome(주요 결과)은 Rate Card Draft + human decision(사람의 결정)이다.

## 3. 주요 사용자

| 사용자 | 주요 관심 | 기본 화면 강조 |
|---|---|---|
| Developer | import schema, trace, retry/cache, model usage, agent-run 병목 | operational signals, debug refs, serving bottleneck |
| PM | feature/customer/plan economics, pricing scenario | feature economics, decision readiness, customer-safe report |
| CEO | margin risk, 손실 고객, rate card, report | margin risk, one-page summary, export/billing gate |
| Admin/Owner | auth, membership, corpus, connector, retention | readiness checklist, blocked reasons, sandbox controls |
| Customer viewer | 내부 ref 없는 결과 확인 | report, accepted evidence, masked refs |

## 4. Route 구조

| Route | 목적 | 성공 상태 | 실패 상태 |
|---|---|---|---|
| `/` | SSR marketing + production demo 진입 | 제품명, 카테고리, demo CTA, report 예시 | fake screenshot 금지 |
| `/login` | Supabase Auth login | seeded demo account 직접 입력 | auth/env/session error |
| `/w/[workspaceId]` | 메인 운영 workspace | production checks + KPI + decision flow | `production_demo_unavailable` |
| `/w/[workspaceId]/admin` | 운영 readiness/admin | corpus, connector, retention, billing status | 권한 없음, env 누락 |
| `/reports/[id]` | persisted artifact(저장된 결과물) 조회 | PDF first + Markdown/JSON 보조 | artifact 없음 |

## 5. 메인 Workspace 레이아웃

1. Health header: workspace id/name, role switch, audience mode, production status, stale badge.
2. KPI strip: monthly AI cost, margin risk, loss customers/features, recommended next decision.
3. Stage navigator: `Design -> Cost -> Bottleneck -> Optimize+Risk -> Decision Log`.
4. Primary work area: role별 primary card.
5. Evidence/Agent rail: RAG refs, accepted facts, provider proof, fallback reason.
6. Decision footer/rail: adopt/reject/hold, report export gate, last actor/time.

## 6. Stage별 기능

| Stage | 주요 기능 | 대표 UI |
|---|---|---|
| Design | usage import, schema mapping, team/agent setup, trust gate | import panel, schema checklist, trust warnings |
| Cost | customer/feature/model/plan/session/agent-run attribution | tables, KPI cards, cost breakdown |
| Bottleneck | retry/cache/model/serving 병목 | operational signal cards, trace refs |
| Optimize+Risk | routing, pricing, benchmark, rate card, risk cards | scenario panel, risk cards, rate card readiness |
| Decision Log | adopt/reject/hold, report gate, ledger | decision list, export gate, report CTA |

## 6.1 Trust Gate First

Design/Import stage의 첫 성공 순간은 비용 차트가 아니라 "이 데이터로 무엇을 하지 않았는가"를 확인시키는 것이다.

- 필수 안심 문구:
  - "raw prompt는 수집하지 않았습니다."
  - "API key 후보는 차단했습니다."
  - "PII 후보가 있어 매핑 검토가 필요합니다."
  - "이 데이터는 원가/마진 분석에 필요한 범위로만 사용됩니다."
- `ready`: 원가/마진 분석으로 진행할 수 있음을 보여준다.
- `needs_mapping`: PII/plan/customer/revenue 매핑 검토가 필요하며, fake success를 만들지 않는다.
- `blocked`: usage snapshot(사용량 분석 묶음), decision history corpus(결정 이력 문서 묶음), report artifact(보고서 결과물)로 넘어가지 않는다고 명시한다.
- 상세 보안/retention 정보는 보조 패널로 두되, 첫 화면은 신뢰와 다음 행동 중심으로 쓴다.

## 7. Role Projection

같은 snapshot을 쓰되 중앙 콘텐츠 순서가 바뀐다. 숫자는 바뀌면 안 된다.

| Role | Primary | Auxiliary/Hidden |
|---|---|---|
| Developer | operational signals, import/schema, trace, retry/cache, serving | CEO summary, customer-facing report |
| PM | feature economics, pricing scenario, customer/plan readiness | low-level debug refs |
| CEO | margin risk, loss customers, rate card/report/export | detailed trace/debug |
| Customer audience | accepted facts, public-safe report | internal refs, debug, raw trace |

모든 role header에는 `same snapshot` 배지를 둔다. Developer는 "왜 비용이 늘었는지", PM은 "어떤 기능/플랜이 문제인지", CEO는 "얼마가 새고 어떤 결정을 해야 하는지"를 먼저 묻지만 월 비용, 마진, 고객 수, snapshot id는 동일해야 한다.

## 7.1 PDF와 Decision Draft

- Report CTA의 첫 문구는 "Share board-ready PDF" 계열로 둔다.
- Report page는 persisted artifact metadata, source decision, content type, 생성 시각을 PDF preview 전후에 보여준다.
- Rate card의 primary panel은 billing 실행이 아니라 decision draft다.
- Decision draft에는 가격 변경 이유, 추천 방식, 영향 고객, 예상 마진 개선, 필요한 승인을 포함한다.
- Stripe/Metronome 실행은 admin의 `Execution deferred`/readiness 영역에 두고, 안전 조건이 모두 충족되기 전까지 secondary locked state로 둔다.

## 8. 핵심 상태 모델

- `connected`: production store/service에서 실제 읽음.
- `unavailable`: env, DB, service, membership, corpus 없음.
- `blocked`: 권한/approval/idempotency/rollback/ledger 부족.
- `connector_not_configured`: Slack/Resend/Stripe/Metronome env 없음.
- `deterministic_preview`: 계산 preview일 뿐 agent 실행 완료 아님.
- `provider_llm`: 실제 provider-backed agent run.
- `needs_review`: benchmark/parser/source 검토 필요.
- `baseline_unavailable`: benchmark 없음. peer 평균 생성 금지.
- `stale`: watchtower/fact/corpus freshness 초과.

## 9. 기능 전체 목록

- Supabase Auth login
- workspace membership/RLS gate
- production demo readiness check
- usage CSV/summary/SDK-lite import
- Trust Gate: raw prompt/API key blocked, PII needs_mapping, file type/size 검사
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
- optimization recommendation
- rate card state machine
- billing readiness panel
- Slack/Email/Stripe/Metronome connector readiness
- external action approval/execution ledger
- persisted report artifacts: PDF, Markdown, JSON
- retention jobs: deletion/export audit
- admin readiness/review surface

## 10. Admin UX

Admin은 "실행 도구"보다 "왜 막혔는지 보는 곳"이 먼저다.

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
- agent_service reachability

Mutation 버튼은 기본 blocked:

- owner/admin 권한 필요
- sandbox/test env 필요
- human approval 필요
- idempotency key 필요
- rollback metadata 필요
- ledger row 필요

## 11. Report UX

Report page는 persisted artifact viewer다.

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

- "완료"는 ledger/externalRef가 있을 때만 사용한다.
- "추천"은 evidence/ref가 있을 때만 사용한다.
- "실행 가능"은 readiness 조건이 모두 true일 때만 사용한다.
- production 연결이 없으면 "demo unavailable"이지 "샘플 데이터 표시"가 아니다.
- provider/model/source id는 `translate="no"`로 보호한다.

## 13. Mobile UX

PC 대시보드를 축소하지 말고 순서를 바꾼다.

모바일 순서:

1. production status
2. next decision
3. 핵심 KPI 3개
4. 현재 stage primary card
5. evidence summary
6. decision action
7. report/export gate

## 14. 디자인 톤

- SaaS 운영 도구: 조용하고 밀도 있게.
- 과한 hero/card 장식 금지.
- 보라 그라데이션, neon, glassmorphism 금지.
- status color는 명확하게: connected, caution, blocked, unavailable.
- 카드 안에 카드 중첩 피하기.
- 표/리스트는 반복 사용자가 스캔하기 쉽게.

## 15. UI 수용 조건

- production route에서 `DEMO_*` import 금지.
- `/w/demo` checks 실패 시 KPI/chart/agent success 금지.
- role 변경 시 비용/마진 숫자는 동일.
- customer audience에서 internal refs/debug 숨김.
- report는 저장된 artifact에서만 렌더.
- RAG는 fact/calculator 숫자를 override하지 않음.
- billing push는 connector + approval + idempotency + rollback + ledger 없으면 blocked.
- 375px 모바일에서 텍스트/버튼 overflow 없음.

## 16. 언어 전환 / i18n 요구사항

AgentPayroll 웹앱은 한국어 버전과 영어 버전이 **분리된 언어 리소스**로 존재해야 하며, 사용자가 앱 안에서 전환할 수 있어야 한다.

핵심 요구:

- 한국어와 영어는 같은 화면 구조를 공유하되, copy/source text는 별도 리소스로 관리한다.
- 언어 스위치는 workspace header 또는 user/account menu에 둔다.
- 선택한 언어는 workspace/user preference로 저장하고, 미로그인 상태에서는 browser/session preference로 유지한다.
- provider name, model id, source id, ref id, code-like token은 번역하지 않는다.
- `translate="no"` 보호는 계속 유지한다. 브라우저 자동번역에 의존하지 않는다.
- report artifact는 생성 언어를 metadata로 가져야 한다. 예: `locale: ko-KR | en-US`.
- PDF/Markdown/JSON report download도 locale별 artifact를 구분한다.
- 영어판과 한국어판은 의미가 같아야 하지만 직역이 아니라 각 언어에서 자연스러운 운영 도구 문체를 쓴다.

필수 locale:

- `ko-KR`: 기본 한국어 운영 화면.
- `en-US`: 영어 운영 화면 및 customer-facing report.

언어별 분리 대상:

- route/page visible copy
- status/error/blocked reason copy
- stage/card 제목과 설명
- role projection copy
- Trust Gate warning copy
- Admin readiness copy
- Rate card/billing readiness copy
- Report artifact copy
- Email/Slack connector draft copy

언어 전환 수용 조건:

- 언어를 바꿔도 비용/마진/토큰/비율 숫자는 변하지 않는다.
- provider/model/source/ref id는 양쪽 언어에서 동일하다.
- unavailable/blocked/error 상태도 양쪽 언어에서 모두 제공된다.
- customer audience에서 internal ref masking 정책은 언어와 무관하게 동일하다.
- 모바일 375px 폭에서 한국어/영어 모두 버튼·카드 텍스트 overflow가 없어야 한다.
