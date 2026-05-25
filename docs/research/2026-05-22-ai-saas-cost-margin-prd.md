# PRD v1.0: AI SaaS Cost & Margin Workspace(비용·마진 의사결정 워크스페이스)

작성일: 2026-05-22  
기준 문서: `docs/research/2026-05-22-token-simulator-work-summary.md`  
공식 리서치 원장: `docs/research/evidence_board.csv`

## 1. 제품 요약

이 제품은 **LLM 운영 로그를 고객·기능·모델·플랜·세션·agent-run 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스**다.

한 문장으로 말하면:

> 개발자의 LLM 운영 로그를 비즈니스 원가와 가격정책 판단으로 번역하는 AI SaaS unit economics workspace(고객/기능/요금제 단위 수익성을 보는 업무 공간).

이 제품은 단순히 "이번 달 LLM 비용이 얼마인가?"를 보여주는 비용 계산기가 아니다. 핵심 질문은 다음이다.

> 우리 AI 기능은 고객별·기능별·플랜별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가?

## 2. 배경

AI 기능이 들어간 SaaS에서는 LLM 비용이 단순 운영비가 아니라 매출 원가, 즉 COGS(Cost of Goods Sold, 매출원가)가 된다.

전통 SaaS에서는 고객이 많이 써도 marginal cost가 낮았다. 그러나 AI SaaS에서는 요청 수, 입력 토큰, 출력 토큰, agent loop, cache miss, 모델 선택에 따라 원가가 계속 변한다.

그래서 기존 질문은 약하다.

> 어떤 모델이 더 싼가?

더 중요한 질문은 이것이다.

> 우리가 이 AI 기능을 얼마에 팔아야 손해를 안 보는가?

## 3. 리서치 근거

현재 공식 리서치 상태:

- 공식 evidence: 38개
- 후보/검증 보류 evidence: 44개
- 다음 official evidence id: `GR-039`
- 검증 기준: URL, published date, exact quote, persona, group, pain tag

검증 명령:

```bash
npm run research:validate
```

현재 Top Pain:

| 순위 | pain tag | 점수 | 의미 |
| --- | --- | ---: | --- |
| 1 | `pain_margin_unknown` | 259 | AI 기능이 gross margin을 얼마나 깎는지 모른다. |
| 2 | `pain_heavy_user_loss` | 201 | 많이 쓰는 고객이 오히려 마진을 깨는 고객이 된다. |
| 3 | `pain_usage_pricing_mismatch` | 193 | 비용은 usage 기반인데 가격은 seat/flat이라 마진이 깨진다. |

이 결과는 MVP를 비용 절감 도구가 아니라 **unit economics(고객/기능/요금제 단위 수익성)와 pricing decision(가격정책 결정) 도구**로 잡아야 한다는 신호다.

## 4. 제품 포지션

약한 포지션:

> LLM 비용 계산기

강한 포지션:

> AI SaaS의 LLM 사용량을 기능별·고객별·플랜별 원가, gross margin, 가격정책 판단으로 바꿔주는 워크스페이스.

경쟁 제품 대비 포지션:

- Helicone, Langfuse, LangSmith, Portkey는 LLM observability(LLM 요청 로그/성능/비용 관측)에 강하다.
- OpenMeter, Metronome, Stripe는 usage-based billing(사용량 기반 과금)에 강하다.
- CloudZero, Vantage는 FinOps(클라우드/기술 비용을 재무적으로 운영하는 방식)와 cost allocation(비용 배부)에 강하다.

이 제품의 빈 공간:

```txt
LLM usage / trace / bill
→ customer, feature, model, plan, session, agent-run cost attribution
→ gross margin and customer profitability
→ usage-based / credit / hybrid pricing decision
→ CEO / CFO / Board-ready explanation
```

차별점:

> Observability는 개발자에게 무슨 일이 있었는지 보여주고, billing은 고객에게 사용량을 청구한다. 이 제품은 그 사이에서 그 사용량이 이익인지 손실인지, 가격정책을 어떻게 바꿔야 하는지 설명한다.

## 5. 3-Layer Product Model(3층 제품 모델)

제품은 Group A와 Group B를 따로 보지 않는다.

```txt
Group A: Entry Point
실시간 비용/운영 문제
token spike, cache miss, quota, agent loop, provider delay
        ↓
Core Engine
비용 귀속 / 원인 분해 / 비즈니스 단위 변환
고객별, 기능별, 모델별, 플랜별, 세션별, agent-run별 비용
        ↓
Group B: Paid Value
마진/가격/수익성 의사결정
고객별 수익성, 플랜별 gross margin, heavy user 손실,
pricing simulation, CEO/CFO report
```

## 6. 타깃 사용자

| 구분 | 대상 | 원하는 것 |
| --- | --- | --- |
| Primary buyer(핵심 구매자) | Founder, CEO, CFO, Finance | 고객별 수익성, gross margin(매출총이익률), 가격정책 판단, Board reporting(이사회/투자자 보고) |
| Primary user(핵심 사용자) | AI SaaS developer, backend, ML, infra | CSV/log import(파일/로그 가져오기), feature mapping(기능 매핑), cost attribution(비용 귀속), 모델/캐싱/라우팅 판단 |
| Secondary user(보조 사용자) | PM, RevOps, CS/Ops | 기능별 원가, rollout(출시/배포) 판단, 고객별 비용 설명 |
| Expansion user(확장 사용자) | 내부 AI 도구 운영팀 | 팀별 비용 추적, bill surprise(예상 못 한 청구서 폭증) 방지, 내부 RAG 비용 관리 |

초기 MVP의 핵심 구매자는 개발자가 아니라 Founder, CEO, CFO, Finance다. 다만 실제 데이터 연결과 CSV 준비는 개발자가 담당할 가능성이 높다.

## 7. 해결할 문제

### 7.1 Entry Point Pain(진입점 고통)

개발자와 운영자가 자주 보는 문제다.

- 토큰 비용이 갑자기 튄다.
- cache miss / cache TTL 때문에 비용이 늘어난다.
- quota가 예상보다 빨리 소진된다.
- provider dashboard 반영이 늦다.
- session이나 agent loop가 예상보다 많은 토큰을 쓴다.

이 pain은 제품 진입점이다. 하지만 여기서만 머물면 고액 지불 의향은 약할 수 있다.

### 7.2 Core Engine Pain(핵심 엔진이 해결할 고통)

운영 로그가 있어도 비즈니스 원가로 해석되지 않는 문제다.

- 어떤 기능이 비용을 먹는지 모른다.
- 어떤 고객이 비용을 만드는지 모른다.
- 어떤 플랜이 마진을 깨는지 모른다.
- agent run이나 session 단위 비용이 보이지 않는다.
- provider invoice와 내부 feature/customer usage가 맞지 않는다.

이 레이어가 제품의 핵심이다.

### 7.3 Paid Value Pain(돈을 낼 만한 고통)

돈을 낼 가능성이 큰 문제다.

- AI 기능이 gross margin을 얼마나 깎는지 모른다.
- heavy user가 손해 고객인지 모른다.
- flat/seat pricing과 variable AI usage가 맞지 않는다.
- usage-based, credit, hybrid, overage pricing을 검토해야 한다.
- CEO/CFO/Board에 설명할 AI unit economics 지표가 필요하다.

## 8. MVP 목표

MVP는 다음을 증명해야 한다.

> AI SaaS 팀은 LLM 운영 로그를 올리면, 고객·기능·모델·플랜·세션·agent-run별 원가를 보고 gross margin과 가격정책 결정을 할 수 있다.

MVP의 핵심은 예쁜 대시보드가 아니라 **의사결정 가능한 숫자와 보고 문장**이다.

## 9. 핵심 사용자 흐름

```txt
1. LLM 사용량 가져오기
CSV upload / paste / sample data

2. 운영 문제 요약
token spike, cache miss, quota, agent loop 후보

3. 비용 귀속
고객별 / 기능별 / 모델별 / 플랜별 / 세션별 / agent-run별

4. 비즈니스 기준값 입력
고객 수, report 수, ticket 수, workflow 수, 플랜별 매출, 판매 가격

5. 마진 분석
고객별 수익성 / 플랜별 gross margin / heavy-user 손실

6. 가격 시뮬레이션
seat / usage-based / credit / hybrid / cap / overage

7. 보고서 출력
CEO/CFO / PM / Developer / Board-ready summary
```

## 10. 데이터 입력 정책

사용자가 토큰 수를 추측하게 만들지 않는다.

토큰 사용량은 가능하면 아래에서 가져온다.

- provider usage log(제공자 사용량 로그)
- API response usage field(API 응답의 사용량 필드)
- gateway export(게이트웨이 내보내기 파일)
- observability export(관측 도구 내보내기 파일)
- CSV log

사용자가 직접 입력해야 하는 값은 business denominator다.

- 월 고객 문의 수
- 월 report 생성 수
- 월 workflow/job 실행 수
- 플랜별 월 매출
- 고객별 MRR
- 기능별 판매가
- credit/overage 단가

LLM 로그만 보고 business denominator를 추정하면 안 된다.

## 11. CSV 스키마

최소 필수 컬럼:

```csv
timestamp,feature,model,input_tokens,output_tokens
```

권장 컬럼:

```csv
request_id,customer_id,plan_id,session_id,agent_run_id,total_cost,latency_ms,status
```

전체 권장 스키마:

```csv
timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status
```

`customer_id`, `plan_id`, `session_id`, `agent_run_id`는 선택 컬럼이지만, Core Engine의 가치가 커지려면 샘플 데이터와 데모에서는 반드시 보여줘야 한다.

## 12. MVP 기능 요구사항

### 12.1 Usage Import(사용량 가져오기)

목표:

> 사용자가 토큰량을 직접 추측하지 않고 실제 사용 로그로 시작하게 한다.

요구사항:

- CSV upload(CSV 파일 업로드)
- CSV paste(CSV 내용 붙여넣기)
- sample CSV template(샘플 CSV 템플릿)
- 필수 컬럼 검증
- 선택 컬럼 인식
- total_cost가 있으면 사용
- total_cost가 없으면 모델 단가 기반 계산
- input/output token 분리

### 12.2 Operational Signal Summary(운영 신호 요약)

목표:

> Group A pain을 제품 진입점으로 보여준다.

요구사항:

- token spike 후보
- cache miss 또는 cacheable context 비중
- quota / provider dashboard 지연은 assumption으로 표시
- session/agent-run 비용 상위 항목
- 알림 기능이 아니라 "어떤 로그를 더 봐야 하는지"를 안내

### 12.3 Attribution Cost Engine(비용 귀속 엔진)

목표:

> LLM usage event를 비즈니스 cost object로 바꾼다.

귀속 축:

- customer(고객)
- feature(기능)
- model(모델)
- plan(요금제)
- session(사용자 작업 세션)
- agent run(AI agent 실행 단위)

요구사항:

- 각 축별 cost roll-up
- input/output 비용 분해
- 요청 수, 평균 token, 평균 cost
- top cost item 표시
- missing dimension 안내

### 12.4 Feature-Level Cost(기능별 원가)

목표:

> 어떤 기능이 비용을 먹는지 보여준다.

요구사항:

- 기능별 월 비용
- 기능별 요청 수
- 기능별 input/output 비용
- 전체 비용 기여도
- Top cost feature 강조

### 12.5 Customer-Level Cost(고객별 원가)

목표:

> 어떤 고객이 비용을 만드는지 보여준다.

요구사항:

- 고객별 월 LLM cost
- 고객별 요청 수
- 고객별 cost per request
- top-decile customer cost vs median(상위 10% 고객 비용과 중앙값 비교)
- heavy-user 후보 표시

### 12.6 Plan-Level Gross Margin(요금제별 매출총이익률)

목표:

> 어떤 플랜이 사용량이 늘수록 손해가 되는지 보여준다.

요구사항:

- plan_id별 월 LLM cost
- 플랜별 고객 수 또는 매출 입력
- 플랜별 gross margin
- free/pro/team/enterprise plan 손실 가능성 표시
- heavy user가 특정 plan에 몰리는지 표시

### 12.7 Unit Economics(단위 수익성)

목표:

> 요청당 비용이 아니라 business metric당 원가를 보여준다.

지원 metric:

- report당 원가
- ticket당 원가
- workflow당 원가
- user당 원가
- customer당 월 원가
- transaction당 원가

공식:

```txt
rawCostPerMetric = rawMonthlyCost / denominator
effectiveCostPerMetric = effectiveMonthlyCost / denominator
```

### 12.8 Gross Margin(매출총이익률)

목표:

> 판매가와 원가를 비교해 마진이 남는지 보여준다.

공식:

```txt
grossMargin = (sellingPrice - effectiveUnitCost) / sellingPrice
```

요구사항:

- 기능별 판매 가격 입력
- 플랜별 매출 입력
- raw margin과 effective margin 분리
- margin이 낮거나 음수인 항목 강조

### 12.9 Heavy-User Profitability(많이 쓰는 고객의 수익성)

목표:

> 많이 쓰는 고객이 정말 좋은 고객인지 확인한다.

요구사항:

- top 10% customers cost share(상위 10% 고객의 비용 비중)
- top-decile customer cost vs median(상위 10% 고객 비용과 중앙값 비교)
- heavy user가 전체 margin에 미치는 영향
- flat pricing에서 손해 가능성 표시
- 특정 plan에 heavy user가 집중되는지 표시

### 12.10 Pricing & Token Simulator(가격정책·토큰 시뮬레이터)

목표:

> 가격정책과 토큰 사용량 변화가 원가, 고객별 수익성, gross margin에 어떤 영향을 주는지 비교한다.

지원 시나리오:

- seat-based pricing(좌석당 과금)
- usage-based pricing(사용량 기반 과금)
- credit-based pricing(크레딧 기반 과금)
- hybrid pricing(기본료+사용량 혼합 과금)
- overage pricing(초과 사용 과금)
- usage cap(사용량 상한)
- AI add-on(AI 기능 추가 요금)
- tier upgrade(상위 요금제로 이동)
- model switch(모델 교체)
- request volume growth(요청량 증가)
- 평균 input/output token 증가
- heavy-user concentration(많이 쓰는 고객 집중)
- plan mix change(요금제 구성 변화)
- session/agent loop reduction(세션/에이전트 반복 감소)
- cache/batch/output cap savings(캐시/배치/출력 상한 절감)

출력:

- 월 AI COGS
- 고객당 원가
- 기능별 원가
- 플랜별 gross margin
- 손해 고객 수
- 예상 margin 개선
- pricing recommendation(가격정책 추천)

### 12.11 Raw Cost vs Effective Cost(표면 비용과 실제 비용)

목표:

> 싼 모델이 진짜 싼지 확인한다.

공식:

```txt
effectiveCost = rawCost + retryCost + humanReviewCost + csEscalationCost
```

입력:

- retry rate(재시도율)
- human review rate(사람 검수율)
- CS escalation rate(고객지원 에스컬레이션율)
- review cost per case(건당 검수 비용)
- CS cost per escalation(건당 고객지원 에스컬레이션 비용)

주의:

초기 MVP에서는 실제 품질 평가가 아니라 assumption 기반 what-if로 표시한다.

### 12.12 Report Output(리포트 출력)

목표:

> 개발자 숫자를 CEO/CFO/PM/Board가 이해하는 문장으로 바꾼다.

리포트 유형:

| 리포트 | 포함 내용 |
| --- | --- |
| Developer breakdown(개발자 상세 분해) | token, model, feature, customer, plan, session, agent-run breakdown |
| PM report | 기능별 원가, rollout 영향, 가격정책 영향, 품질 리스크 |
| CEO/CFO 1-pager | AI COGS, gross margin, 손해 고객, pricing risk, next action |
| Board-ready summary(이사회/투자자 공유용 요약) | AI unit economics, margin trend, customer concentration, plan risk, pricing model risk |

CEO/CFO용 문장 예시:

```txt
지난 30일 AI COGS는 $X이며, 비용의 Y%는 [기능]에서 발생했습니다.
상위 10% 고객이 전체 AI 비용의 Z%를 만들고 있어 현재 [가격정책]에서는 margin risk가 있습니다.
[대안 가격정책]으로 바꾸면 예상 gross margin은 A%에서 B%로 개선됩니다.
```

## 13. MVP에서 하지 않을 것

초기 MVP에서 제외한다.

- 실시간 예산/쿼터 가드레일
- 개발자 진단 전용 화면
- Slack/Email 알림
- SDK 자동 수집
- Gateway / Proxy(요청 관문/대리 서버)
- 실시간 provider price sync
- 실제 eval harness 연동
- ontology 화면
- Jarvis형 assistant
- 실시간 anomaly detection

이유:

현재 구매 pain은 실시간 알림보다 **마진/가격정책 판단**에 더 강하다.

## 14. Research-Gated 기능

| 기능 | 재검토 조건 |
| --- | --- |
| Budget / quota guardrails | `pain_team_budget` 또는 `pain_cost_unpredictable`이 50개 evidence 기준 Top 3이고 평균 `wtp_score >= 4` |
| Developer diagnostics | `pain_tracking_wrong` 또는 `pain_token_waste`가 Top 3 |
| Internal Mode | Group C 후보가 검증 evidence 15개 이상이고 팀 예산/내부 RAG 비용 WTP가 4 이상 |
| SDK / Middleware | CSV로 실제 로그 분석 요청이 반복되고 자동 수집 니즈가 인터뷰에서 확인됨 |
| Gateway / Proxy | routing, fallback, budget cap이 유료 action과 직접 연결됨 |

## 15. 성공 기준

MVP가 성공하려면 사용자가 다음 질문에 답할 수 있어야 한다.

1. 이번 달 AI 기능 총 원가는 얼마인가?
2. 어떤 기능이 비용을 가장 많이 쓰는가?
3. 어떤 고객이 AI 원가를 가장 많이 만드는가?
4. 어떤 플랜이 사용량이 늘수록 손해가 되는가?
5. 어떤 모델, 세션, agent run이 비용을 키우는가?
6. report/ticket/workflow당 원가는 얼마인가?
7. 판매 가격을 넣었을 때 gross margin은 얼마인가?
8. heavy user 때문에 손해 보는 고객이 있는가?
9. usage-based, credit, hybrid, overage, cap 중 어떤 가격정책이 더 나은가?
10. CEO/CFO/Board에 공유할 수 있는 문장형 리포트가 나오는가?

## 16. 성공 지표

정량 지표:

- CSV import 성공률
- 필수 컬럼 오류율
- customer/feature/plan attribution coverage(고객/기능/요금제 비용 귀속 범위)
- 보고서 복사/다운로드 횟수
- pricing simulation 실행 횟수
- 사용자가 입력한 business denominator 수

정성 지표:

- "이 고객이 손해인지 몰랐다"는 반응
- "CEO/CFO에게 공유해도 되겠다"는 반응
- "이걸로 가격정책을 바꿔야겠다"는 반응
- "우리 로그로 해볼 수 있나?"라는 연결 요청

강한 구매 신호:

- 익명화된 usage CSV 제공
- 다음 달에도 리포트를 받고 싶다는 요청
- finance/CEO/PM에게 공유
- 가격정책 변경 논의에 사용
- SDK/Gateway 자동 수집 문의

## 17. 인터뷰 질문

WTP 확인 질문:

- 고객별 AI 원가를 알고 있나요?
- heavy user 때문에 손해 본 적 있나요?
- AI 기능별 gross margin을 보나요?
- usage-based pricing이나 credit pricing을 고민 중인가요?
- 이 숫자를 CEO/CFO/투자자에게 보고해야 하나요?
- 지금은 이 계산을 spreadsheet, SQL, 감으로 하고 있나요?
- 이 리포트를 매주 받으면 누구에게 공유하나요?
- 이 숫자가 없어서 가격정책이나 영업 의사결정이 늦어진 적 있나요?
- 지금 당장 결제하려면 어떤 조건이 필요하나요?

## 18. 로드맵

### Phase 0: Research Foundation(리서치 기반)

상태: 진행 중

- Evidence Board 38개
- 후보 evidence 44개
- Pain Taxonomy(고객 고통 분류 체계)
- Token Cost Ontology(토큰 비용 온톨로지)
- PRD
- 경쟁 제품 비교
- CFO/CEO/Board reporting expression library(재무/대표/이사회 보고 표현 라이브러리)

### Phase 1: MVP Dashboard(MVP 대시보드)

목표:

- CSV import(CSV 가져오기)
- attribution table(비용 귀속 표)
- feature/customer/model/plan/session cost(기능/고객/모델/요금제/세션별 비용)
- unit economics(단위 수익성)
- gross margin(매출총이익률)
- pricing simulator(가격정책 시뮬레이터)
- report output(리포트 출력)

### Phase 2: Better Decision Engine(더 나은 의사결정 엔진)

목표:

- raw vs effective cost(표면 비용과 실제 비용)
- retry/review/CS cost assumptions(재시도/검수/고객지원 비용 가정)
- invoice reconciliation(청구서 대조)
- model switching / routing scenario(모델 교체/라우팅 시나리오)
- plan-level overage/credit simulation(요금제별 초과 과금/크레딧 시뮬레이션)

### Phase 3: Data Collection Automation(데이터 수집 자동화)

목표:

- SDK wrapper(SDK 래퍼)
- gateway/proxy export(게이트웨이/프록시 내보내기)
- observability integration(관측 도구 연동)
- recurring report(반복 리포트)

### Phase 4: Enterprise / Finance Workflow(기업/재무 업무 흐름)

목표:

- CFO monthly package(재무 책임자용 월간 패키지)
- Board deck export(이사회/투자자용 발표자료 내보내기)
- customer profitability monitoring(고객별 수익성 모니터링)
- pricing policy recommendation(가격정책 추천)
- contract/plan design support(계약/요금제 설계 지원)

## 19. 주요 파일

| 파일 | 역할 |
| --- | --- |
| `docs/research/2026-05-22-token-simulator-work-summary.md` | 지금까지 작업 전체 요약 |
| `docs/research/evidence_board.csv` | 공식 evidence 원장 |
| `docs/research/evidence_candidates_unverified.csv` | 검증 보류 후보 |
| `docs/research/pain_taxonomy.md` | pain 분류 |
| `docs/research/token_cost_ontology.md` | 제품 온톨로지 |
| `docs/research/ai-saas-llm-cost-products-comparison-2026.md` | 경쟁 제품 비교 |
| `docs/research/ai-saas-cfo-ceo-board-reporting-expressions-2026.md` | 리포트 표현 라이브러리 |
| `scripts/research/validate-evidence-board.mjs` | evidence 검증 스크립트 |

## 20. 결론

이 MVP는 `LLM 비용 계산기`로 설명하면 약하다.

가장 강한 설명은 다음이다.

> AI SaaS 팀이 LLM 운영 로그를 올리면, 고객·기능·모델·플랜·세션별 원가를 재분류하고, gross margin과 가격정책 판단까지 이어주는 unit economics workspace.

이 제품의 핵심 엔진은 **비용 귀속**이고, 유료 가치는 **마진/가격/수익성 의사결정**이다.
