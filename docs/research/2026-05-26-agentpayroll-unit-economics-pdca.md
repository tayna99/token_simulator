# AgentPayroll 유닛 이코노믹스 PDCA 실행 계획 (2026-05-26)

이 문서는 `2026-05-26-agentpayroll-unit-economics-risk-review.md`와 `2026-05-26-agentpayroll-unit-economics-subagent-research.md`를 실행으로 옮기기 위한 PDCA 계획이다.

## 왜 이 일을 해야 하는가

AgentPayroll은 "좋아 보이는 AI 원가 분석 제품"이 아니라 실제로 돈을 버는 반복 매출 구조를 검증해야 한다. 핵심 pain은 AI SaaS 팀이 고객별, 기능별, 플랜별 AI 원가를 매출과 연결하지 못해 가격, cap, credit, 모델 mix, 고객별 마진 결정을 늦춘다는 점이다.

따라서 이번 실행의 목적은 무료 진단을 많이 돌리는 것이 아니다. A급 ICP를 빠르게 선별하고, Trust Gate로 데이터 불안을 낮추며, `AI Cost Snapshot`을 `Monthly Decision Review`로 전환할 수 있는지를 검증하는 것이다.

## Plan(계획)

### 실행 가설

1. 고객은 "토큰 절감"보다 가격/마진 결정을 위한 근거에 돈을 낸다.
2. `AI Cost Snapshot`보다 `AI Margin Snapshot`, `Loss-Making Customer Review`, `AI Pricing Decision Pack` 메시지가 더 높은 WTP를 만든다.
3. Free Fit Check는 무료 컨설팅이 아니라 10분 이하 ICP 필터로 제한해야 CAC가 방어된다.
4. Trust Gate는 보안 문구가 아니라 전환율을 높이는 conversion UX이며, 수동 설명 시간을 줄이면 CAC와 CS 비용이 낮아진다.
5. Monthly Review는 새 PDF 반복이 아니라 지난 `adopt/reject/hold` 결정의 결과 검산과 다음 가격/마진 결정 생성으로 팔려야 유지율이 생긴다.

### 우선순위

1. **ICP 선별:** A/B/C 리드 기준을 먼저 고정한다. A급은 production AI 기능, 월 LLM/API 비용, metadata export 가능성, 매출/플랜/기능 연결성, decision owner가 있어야 한다.
2. **WTP 검증:** 15명 인터뷰에서 실제 데이터 파일럿, 예약금, 예산 출처를 확인한다.
3. **운영 시간 측정:** Free Fit Check, Data Readiness, Snapshot, Review Call별 사람 시간을 time-and-motion으로 기록한다.
4. **Trust Gate 실험:** 업로드 전/후 설명, no-training, retention/delete, PII/blocked column 안내가 전환과 이탈에 미치는 영향을 본다.
5. **Decision Loop 설계:** 모든 리포트가 비용 설명이 아니라 결정, owner, 다음 리뷰 날짜, outcome review로 끝나게 만든다.

### Plan(계획) 성공 기준

- 15명 인터뷰 중 5명 이상이 "우리 데이터로 해보고 싶다"고 말한다.
- 3명 이상이 유료 파일럿, 예약금, 또는 명확한 예산 출처를 제시한다.
- Free Fit Check는 사람 투입 10분 이하로 끝난다.
- Free Fit Check에서 paid readiness/snapshot 전환율이 15-25% 이상 나온다.
- Data Readiness Check는 사람 투입 45분 이하, gross margin 60% 이상을 만족한다.
- 첫 Snapshot은 70만-100만 원 가격에서 사람 투입 3.5시간 이하, gross margin 60% 이상을 만족한다.
- 유료 Snapshot 고객의 40% 이상이 30일 안에 Monthly Review 또는 다음 분석 일정을 잡는다.
- 리포트의 70% 이상이 `adopt/reject/hold` 중 하나의 결정으로 끝난다.
- 첫 3개월 Monthly Review cohort의 GRR이 90% 이상이다.

## Do(실행)

| 작업 | owner(담당자) | 입력 | 산출물 | due(기한) | acceptance criteria(완료 판정 기준) |
|---|---|---|---|---|---|
| WTP 인터뷰 15명 모집/진행 | Revenue/WTP subagent | `mvp-wtp-interview-guide.md`, ICP A/B/C 기준, 인터뷰 질문지 | 인터뷰 로그 15개 | 2026-05-31 | founder/CEO/PM 5명, dev/infra 5명, finance/ops/revops 5명 완료. 각 로그에 `monthly_llm_cost`, `current_workaround`, `decision_delayed`, `buyer`, `wtp_signal`, `objection_tags` 기록 |
| 인터뷰 신호 코딩 | Revenue/WTP subagent | 인터뷰 로그 15개 | WTP/구매거부/결정지연 태그 매트릭스 | 2026-06-01 | 5명 이상 "우리 데이터로 해보고 싶다", 3명 이상 유료 파일럿/예약금/예산 출처 확인 여부 판정 |
| 상품명 A/B 테스트 | Pricing/WTP subagent | `AI Cost Snapshot`, `AI Margin Snapshot`, `Loss-Making Customer Review`, `AI Pricing Decision Pack` | 이름별 반응/선호/가격저항 요약 | 2026-06-02 | 각 이름별 최소 5개 반응 확보. "로그 대시보드" 오해와 "의사결정 패키지" 인식 구분 |
| 가격 사다리 WTP 제안 | Pricing/WTP subagent | Free Fit Check, Data Readiness 9만 원, Snapshot 50/70/150만 원, Monthly Review 월 49만 원 | 가격별 수락/거절/조건부 수락 표 | 2026-06-03 | 최소 10명에게 실제 가격 제시. 예약금 10만 원 또는 유료 pilot 수락 신호 3건 이상 여부 판정 |
| Trust Gate self-serve asset v0 제작 | Trust/CAC subagent | data flow, no-training, retention/delete, PII mapping, blocked columns, raw prompt-free export | 1-page Trust Pack + FAQ + 업로드 전/후 설명 copy | 2026-05-29 | 고객이 업로드 전 확인할 수 있는 self-serve 자료 1개 완성. "우리 데이터가 어디로 가나?" 질문에 자료만으로 답변 가능 |
| Trust Gate A/B 실험 | Trust/CAC subagent | 업로드 전 설명안, 업로드 직후 설명안, Trust Pack | A/B별 이탈/질문/전환 로그 | 2026-06-05 | 각 조건 최소 5명 노출. `데이터 불안`, `PII`, `retention`, `training`, `raw prompt` objection 태그 기록 |
| Free Fit Check 10분 캡 운영 | CAC/ICP subagent | ICP scoring form: LLM spend, usage log, revenue link, decision urgency, raw prompt-free export | A/B/C 리드 분류표 | 2026-06-04 | Fit Check 평균 10분 이하. 10분 초과 리드는 무료 분석 중단 후 paid Data Readiness로 라우팅 |
| messy CSV time-and-motion 3건 | COGS subagent | 실제/샘플 messy CSV 3개, revenue/plan/customer 매핑 가정 | 단계별 소요시간 로그와 COGS 계산표 | 2026-06-03 | intake, schema 이해, column mapping, Trust 설명, report QA, review/follow-up 시간이 분리 기록됨. Snapshot 3.5h 이하 가능 여부 판정 |
| Report QA 수정 태깅 | COGS subagent | Snapshot draft, QA checklist | 사람이 수정한 항목 태그 리포트 | 2026-06-04 | narrative claim, 숫자 오류, 컬럼 매핑, Trust 문구, pricing recommendation 수정이 태그별 집계됨. 자동화 우선순위 3개 도출 |
| Monthly Review follow-up 번들 테스트 | Retention subagent | Snapshot 고객/파일럿 후보, Decision Log, adopt/reject/hold gate | 30-day Outcome Review 제안안 + 예약 로그 | 2026-06-07 | Snapshot 또는 pilot 대화 말미에 월 49만 원 follow-up 제안. decision 기록 고객의 50% 이상이 다음 리뷰 예약하는지 판정 |
| Decision-before-report gate | Retention subagent | Snapshot report flow, Decision Log | 리포트 마지막 장 `adopt/reject/hold` 결정 섹션 | 2026-06-05 | 리포트의 70% 이상이 `adopt/reject/hold` 중 하나로 끝나는지 측정 가능. decision owner와 다음 리뷰 날짜 필드 포함 |
| Trigger-based 재접촉 memo | Expansion subagent | 모델 가격 변화, heavy user 증가, plan margin 하락, budget/cap 초과, board/CEO 보고 일정 | 고객별 follow-up trigger memo | 2026-06-07 | 각 유료/파일럿 고객에 최소 1개 재접촉 트리거 기록. "지난번과 달라진 것" 3개 이상을 Monthly Review 입력으로 연결 |

## Check(점검)

### 측정 지표

- WTP/매출: 15명 인터뷰 완료, 5명 이상 "우리 데이터로 해보고 싶다", 3명 이상 유료 파일럿/예약금/예산 출처 확인.
- 전환: Free Fit Check -> paid readiness/snapshot 전환율 15-25% 이상, Snapshot 고객 40% 이상이 30일 내 Monthly Review 또는 후속 리뷰 예약.
- COGS: Free Fit Check 사람 시간 10-15분 이하, Data Readiness 45분 이하/GM 60% 이상, 첫 Snapshot 3.5시간 이하/GM 60% 이상, Monthly Review 1.5시간 이하/GM 70% 이상.
- CAC/Trust: A급 리드 첫 유료 전환까지 operator touch 2회 이하, Trust 질문 왕복 횟수 감소, paid CAC payback 12개월 이하.
- Retention: Review Call에서 Snapshot 고객 40% 이상이 `adopt/reject/hold` 결정 기록, decision 고객 50% 이상이 다음 follow-up 예약, 3개월 Monthly Review GRR 90% 이상.
- 반복구매/확장: 리포트 70% 이상이 결정으로 끝남, 리포트 수신자 50% 이상이 CEO/PM/Finance/RevOps 포함, 유료 고객 30% 이상이 workspace/connector/report recipient/pricing scenario 확장.
- 제품/데이터 품질: customer/feature/plan/revenue/retry 중 3개 이상 attribution 가능, 매월 "지난번과 달라진 것" 3개 이상 자동 산출.

### 통과/실패 기준

- **Pass(통과):** 각 위험 영역이 `Plan -> Do -> Check -> Act`로 연결되고, 모든 Check 항목이 숫자/조건/기한/다음 액션을 가진다.
- **Pass(통과):** Snapshot이 PDF 산출물에서 끝나지 않고 Decision Log, Outcome Review, Monthly Review로 이어지는 증거가 있다.
- **Pass(통과):** Trust Gate가 보안 설명문이 아니라 CAC/전환율 측정 흐름으로 설계되어 있다.
- **Conditional(조건부 통과):** 목표 수치는 일부 미달이지만 원인 태그, 재실험 조건, 가격/ICP/온보딩 조정안이 명확하다.
- **Fail(실패):** "좋아 보인다", "수요가 있다", "비용 절감 가능"처럼 판정 불가능한 문장으로 성공을 대체한다.
- **Fail(실패):** Free Fit Check 또는 Data Readiness가 무료/저가 컨설팅으로 번져 사람 시간이 목표를 초과한다.
- **Fail(실패):** production evidence와 demo/static seed/fallback 데이터를 구분하지 않는다.
- **Fail(실패):** Monthly Review 전환, decision 기록, CAC payback, COGS 중 하나라도 측정 설계가 없다.

### 문서 리뷰 체크리스트

- [ ] 두 연구 문서의 5개 위험 영역이 모두 PDCA 항목으로 변환되었는가?
- [ ] 각 Plan은 검증할 가정, 대상 ICP, 실험 방식, 표본 수, 기간을 가지는가?
- [ ] 각 Do는 실행 산출물(인터뷰 로그, ICP scoring form, Trust Pack, report QA log, Decision Log)을 명시하는가?
- [ ] 각 Check는 정량 기준과 실패 시 판정 기준을 모두 포함하는가?
- [ ] 각 Act는 가격, ICP, onboarding, report flow, Monthly Review package 중 무엇을 바꿀지 지정하는가?
- [ ] `AI Cost Snapshot`이 단순 비용 리포트가 아니라 `AI Margin Snapshot`/`Pricing Decision Pack` 포지션으로 검증되는가?
- [ ] PDF/report는 value proof로 남되, 반복구매 이유는 Decision Log와 Outcome Review로 설명되는가?
- [ ] 외부 근거와 로컬 PRD/PM 문서의 주장이 섞일 때 출처와 확실성 수준이 구분되는가?
- [ ] demo/preview/seed 데이터가 production-connected fact처럼 쓰이지 않는가?

### 코드 리뷰 체크리스트

- [ ] 비용 계산은 `src/lib/calculator.ts`의 `calculateCost`/`calculateMigrationDelta` 또는 새 순수 계산 모듈을 통해서만 흐르는가?
- [ ] 사용자 표시 숫자는 `src/lib/format.ts`의 formatter를 통과하며 inline `toFixed`, `toLocaleString`, `$ + n`이 없는가?
- [ ] NaN/Infinity 입력은 `Number.isFinite()`로 방어되고 UI에는 `—` 등 명시적 unavailable 상태로 렌더되는가?
- [ ] Next production route/page에서 `DEMO_*`, `VITE_AGENTCOST_DEMO_SEED`, request fixture, memory fallback을 production 결과처럼 import/use하지 않는가?
- [ ] connector/env가 없을 때 `unavailable`, `deterministic_preview`, `connector_not_configured`처럼 완료가 아닌 상태로 표시되는가?
- [ ] Decision Log의 `adopt/reject/hold`, report provenance, pricing freshness, attribution coverage가 테스트 가능한 데이터 구조로 남는가?
- [ ] 컴포넌트 테스트는 `rerender`로 state 변화 후 값 갱신을 검증하는가?
- [ ] 문장성 영어 요약 블록은 `lang="en"`이고, `notranslate` meta/root translate 보호가 유지되는가?

### Red flags(위험 신호)

- Snapshot 산출물이 "예쁜 PDF"로 끝나고 다음 decision/follow-up 날짜가 없다.
- "비용 절감"만 강조하고 가격 변경, cap, credit, plan boundary 같은 의사결정이 없다.
- 고객별/기능별/플랜별/매출 attribution 없이 ROI를 주장한다.
- Trust 질문이 매 고객마다 새로 생기고 self-serve Trust Pack으로 흡수되지 않는다.
- 30만 원대 Snapshot에 5시간 이상 들어가거나 Data Readiness에 45분 이상 들어간다.
- A/B 실험이 이름/가격/패키지를 바꾸지만 성공 기준이 예약금, 전환율, decision 기록으로 연결되지 않는다.
- 코드가 demo seed 또는 deterministic preview를 production evidence처럼 보여준다.
- 리포트 claim을 사람이 대부분 다시 쓰고, QA 수정 항목이 태깅되지 않는다.

## Act(조정)

### 가격 조정 규칙

- `AI Cost Snapshot` 이름은 기본 중단하고 `AI Margin Snapshot` 또는 `AI Pricing Decision Pack`으로 실험한다. 고객이 "비용 확인"보다 "가격/마진 결정"에 반응하면 새 이름을 채택한다.
- `Snapshot 30만 원`은 custom report가 아니라 entry test로만 둔다. 사람 투입이 3.5시간을 넘거나 gross margin 60% 미만이면 `70만-150만 원`으로 올리거나 범위를 축소한다.
- `Data Readiness Check 9만 원`은 paid filter로 유지한다. 45분 안에 끝나면 keep, 45분 초과가 반복되면 가격을 15만 원 이상으로 올리거나 self-assessment로 전환한다.
- `Monthly Review 월 49만 원`은 Snapshot 후 decision이 기록된 고객에게만 제안한다. decision 없는 고객에게 월구독을 팔지 않는다.

### ICP 조정 규칙

- A급 ICP: production AI 기능, 월 LLM/API 비용 10만 원 이상, raw prompt 없는 metadata export 가능, customer/feature/plan/revenue/retry 중 3개 이상 매핑 가능, decision owner 있음.
- B급 ICP: AI 기능은 운영 중이나 revenue/plan/schema 연결이 약한 팀. 이들은 Snapshot 직행 금지, `Data Readiness Check`로 라우팅한다.
- C급 ICP: 아이디어 단계, 비용 작음, 로그/매출 연결 없음, decision owner 없음. 무료 분석 금지, sample report 또는 waitlist로 보낸다.
- 실험 결과 A급 리드의 첫 유료 전환까지 operator touch가 2회를 넘으면 ICP 정의를 더 좁힌다.

### Data Readiness kill/keep 규칙

- **Keep:** 45분 이하, gross margin 60% 이상, blocked column/PII/raw prompt 범위를 고객이 self-serve로 표시 가능, Snapshot 전환 가능성이 명확함.
- **Kill:** 1.5시간 이상 schema 해석이 필요하거나, 매번 새 보안 설명이 발생하거나, customer/feature/plan/revenue 축 중 2개 미만만 존재함.
- **Pivot:** 고객 pain은 강하지만 데이터가 약하면 "분석 리포트"가 아니라 `Attribution Coverage Report`로 제품명을 바꾼다.
- 운영 규칙: Free Fit Check가 10분을 넘는 순간 무료 범위를 종료하고 paid readiness로 전환한다.

### Monthly Review 전환 규칙

- 전환 조건은 Snapshot 완료가 아니라 `adopt/reject/hold` decision 기록이다.
- Monthly Review 제안 가능 조건: decision 1개 이상, 다음 리뷰 날짜, owner, customer/feature/plan 중 2개 이상 attribution, 공유 가능한 persisted report artifact.
- 30일 내 Snapshot 고객의 40% 이상이 Monthly Review 또는 follow-up review를 예약하면 keep.
- decision 기록 고객의 50% 미만이 다음 달 리뷰를 예약하면 Monthly Review copy를 "월간 비용 리포트"에서 "지난 결정 검산 + 다음 가격정책 초안"으로 바꾼다.

### 제품/UI backlog 전환

- P0 backlog: Trust Gate self-serve, ICP scoring form, Data Readiness timer, schema coverage meter, decision-before-report gate.
- P1 backlog: Monthly outcome review, decision history diff, trigger-based 재접촉 memo, pricing scenario/rate card draft, report recipient tracking.
- UI는 비용 절감 단독이 아니라 cost + margin + quality/risk + decision outcome을 같이 보여준다.
- 계산/포맷 로직은 기존 원칙대로 pure TS numeric core에 두고, Agent/PDCA layer는 판정과 추천만 담당한다.

### 다음 커밋/실행 기준

- 다음 실행은 "문서 추가"가 아니라 실험 계측 commit이어야 한다.
- 최소 포함: ICP scoring schema, Data Readiness time tracking, Snapshot decision status, Monthly follow-up intent, operator touch count.
- 테스트 기준: 상태 변경 시 ICP 등급, Data Readiness 판정, Monthly 전환 가능 여부가 `rerender` 후 갱신되는지 검증한다.
- 실행 기준: 15명 인터뷰 또는 3개 messy CSV time-and-motion 중 하나를 먼저 완료하고, 결과가 가격/ICP/kill-keep/backlog 중 최소 1개 결정을 바꿔야 다음 Act로 인정한다.
