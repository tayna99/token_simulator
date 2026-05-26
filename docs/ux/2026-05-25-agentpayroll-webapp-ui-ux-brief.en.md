# AgentPayroll 웹앱 UI/UX 상세 기획 브리프

작성일: 2026-05-25

> 파일명에는 과거 호환용 `.en`이 남아 있지만, 프로젝트 Markdown 현지화 원칙에 맞춰 본문은 한국어로 유지한다.

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
| PM | 기능/고객/요금제 경제성, 가격 시나리오 | 기능 경제성, 결정 준비도, 고객에게 보여도 안전한 리포트 |
| CEO | margin risk, 손실 고객, rate card, report | margin risk, one-page summary, export/billing gate |
| Admin/Owner | 인증, 멤버십, 근거 문서 묶음, 외부 연동, 보관 정책 | 준비도 체크리스트, 차단 이유, 샌드박스 제어 |
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

1. Health header(상태 헤더): workspace id/name, role switch, audience mode, production status, stale badge.
2. KPI strip(핵심 지표 막대): monthly AI cost, margin risk, loss customers/features, recommended next decision.
3. Stage navigator(단계 이동): `Design -> Cost -> Bottleneck -> Optimize+Risk -> Decision Log`.
4. Primary work area: role별 primary card.
5. Evidence/Agent rail(근거·에이전트 보조 영역): RAG refs, accepted facts, provider proof, fallback reason.
6. Decision footer/rail(결정 하단 영역): adopt/reject/hold, report export gate, last actor/time.

## 6. Stage별 기능

| Stage | 주요 기능 | 대표 UI |
|---|---|---|
| Design | 사용량 가져오기, 스키마 매핑, 팀/에이전트 설정, trust gate | import panel, schema checklist, trust warnings |
| Cost | 고객/기능/모델/요금제/세션/에이전트 실행별 귀속 | tables, KPI cards, cost breakdown |
| Bottleneck | retry/cache/model/serving 병목 | operational signal cards, trace refs |
| Optimize+Risk | 라우팅, 가격, 벤치마크, 요금표 초안, 위험 카드 | scenario panel, risk cards, rate card readiness |
| Decision Log | 채택/거절/보류, 리포트 관문, 장부 | decision list, export gate, report CTA |

## 6.1 Trust Gate First(신뢰 관문 우선)

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

## 7. Role Projection(역할별 투영)

같은 snapshot을 쓰되 중앙 콘텐츠 순서가 바뀐다. 숫자는 바뀌면 안 된다.

| 역할 | 우선 영역 | 보조/숨김 영역 |
|---|---|---|
| Developer | 운영 신호, 가져오기/스키마, trace, retry/cache, serving | CEO 요약, 고객용 리포트 |
| PM | 기능 경제성, 가격 시나리오, 고객/요금제 준비도 | 낮은 수준의 debug refs |
| CEO | 마진 리스크, 손해 고객, 요금표/리포트/export | 세부 trace/debug |
| Customer audience | 승인된 사실, 공개 가능한 리포트 | 내부 ref, debug, 원시 trace |

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

- Supabase Auth login(Supabase 인증 로그인)
- workspace membership/RLS gate(작업공간 멤버십과 행 단위 보안 관문)
- production demo readiness check(운영 데모 준비도 확인)
- usage CSV/summary/SDK-lite import(사용량 CSV/요약/SDK-lite 가져오기)
- Trust Gate: raw prompt/API key blocked, PII needs_mapping, file type/size 검사
- deterministic cost/margin calculator(결정론 비용·마진 계산기)
- customer/feature/model/plan/session/agent-run attribution(고객·기능·모델·요금제·세션·에이전트 실행별 귀속)
- C1 official source corpus(공식 출처 문서 묶음)
- C2 benchmark corpus(비교 기준 문서 묶음)
- C3 serving economics corpus(서빙 비용 문서 묶음)
- C4 usage schema corpus(사용량 스키마 문서 묶음)
- C9 decision history corpus(결정 이력 문서 묶음)
- pgvector-backed RAG search(pgvector 기반 근거 검색)
- Watchtower runs/review/accepted facts(감시 실행·검토·승인 사실)
- provider-backed agent runtime(제공자 모델을 실제 호출하는 에이전트 실행)
- runtime status API(실행 상태 API)
- risk cards(위험 카드)
- optimization recommendation(최적화 추천)
- rate card state machine(요금표 초안 상태 기계)
- billing readiness panel(과금 준비도 패널)
- Slack/Email/Stripe/Metronome connector readiness(외부 연동 준비도)
- external action approval/execution ledger(외부 실행 승인·실행 장부)
- persisted report artifacts: PDF, Markdown, JSON(저장된 리포트 산출물)
- retention jobs: deletion/export audit(보관 작업: 삭제·내보내기 감사)
- admin readiness/review surface(관리자 준비도·검토 화면)

## 10. Admin UX(관리자 경험)

Admin은 "실행 도구"보다 "왜 막혔는지 보는 곳"이 먼저다.

필수 패널:

- Supabase/Auth readiness(Supabase/인증 준비도)
- workspace membership status(작업공간 멤버십 상태)
- corpus readiness: C1/C2/C3/C4/C9(문서 묶음 준비도)
- Watchtower latest run + review queue(최신 감시 실행과 검토 대기열)
- accepted facts ledger status(승인 사실 장부 상태)
- RAG index status(RAG 검색 색인 상태)
- connector status(외부 연동 상태)
- rate card/billing gate(요금표/과금 관문)
- retention jobs(보관·삭제 작업)
- report artifacts(리포트 산출물)
- agent_service reachability(agent_service 접근 가능 여부)

Mutation 버튼은 기본 blocked:

- owner/admin 권한 필요
- sandbox/test env 필요
- human approval 필요
- idempotency key 필요
- rollback metadata 필요
- ledger row 필요

## 11. Report UX(리포트 경험)

Report page는 persisted artifact viewer다.

우선순위:

1. PDF download primary CTA(PDF 다운로드를 1순위 행동으로 표시)
2. Markdown secondary(Markdown은 보조)
3. JSON secondary/internal(JSON은 보조 또는 내부용)

반드시 표시:

- report id(리포트 식별자)
- workspace id(작업공간 식별자)
- artifact format/content type(산출물 형식과 콘텐츠 타입)
- source decision ids(근거가 된 결정 식별자)
- generated timestamp(생성 시각)
- evidence refs(근거 참조)
- unavailable/deleted status(사용 불가 또는 삭제 상태)

## 12. 화면 카피 원칙

- "완료"는 ledger/externalRef가 있을 때만 사용한다.
- "추천"은 evidence/ref가 있을 때만 사용한다.
- "실행 가능"은 readiness 조건이 모두 true일 때만 사용한다.
- production 연결이 없으면 "demo unavailable"이지 "샘플 데이터 표시"가 아니다.
- provider/model/source id는 `translate="no"`로 보호한다.

## 13. Mobile UX(모바일 경험)

PC 대시보드를 축소하지 말고 순서를 바꾼다.

모바일 순서:

1. production status(운영 연결 상태)
2. next decision(다음 결정)
3. 핵심 KPI 3개
4. 현재 stage primary card
5. evidence summary(근거 요약)
6. decision action(결정 행동)
7. report/export gate(리포트/내보내기 관문)

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

- route/page visible copy(라우트/페이지에 보이는 문구)
- status/error/blocked reason copy(상태/오류/차단 이유 문구)
- stage/card 제목과 설명
- role projection copy(역할별 투영 문구)
- Trust Gate warning copy(신뢰 관문 경고 문구)
- Admin readiness copy(관리자 준비도 문구)
- Rate card/billing readiness copy(요금표/과금 준비도 문구)
- Report artifact copy(리포트 산출물 문구)
- Email/Slack connector draft copy(Email/Slack 연동 초안 문구)

언어 전환 수용 조건:

- 언어를 바꿔도 비용/마진/토큰/비율 숫자는 변하지 않는다.
- provider/model/source/ref id는 양쪽 언어에서 동일하다.
- unavailable/blocked/error 상태도 양쪽 언어에서 모두 제공된다.
- customer audience에서 internal ref masking 정책은 언어와 무관하게 동일하다.
- 모바일 375px 폭에서 한국어/영어 모두 버튼·카드 텍스트 overflow가 없어야 한다.
