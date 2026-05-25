# PRD(제품 요구사항 문서) v0.2: AI SaaS 비용·마진 워크스페이스

## 1. 제품 정의

이 제품은 **LLM(대규모 언어 모델) 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고, AI SaaS(AI 기능을 제공하는 구독형 소프트웨어)의 마진과 가격정책 판단으로 연결하는 워크스페이스**다.

단순히 "이번 달 LLM 비용이 얼마인가?"를 보여주는 도구가 아니다. 이 제품의 핵심 질문은 다음이다.

> 우리 AI 기능은 고객별·기능별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가?

약한 포지션은 "LLM 비용 계산기"다. 강한 포지션은 **개발자의 LLM 운영 로그를 비즈니스 원가와 가격정책 판단으로 번역하는 AI SaaS unit economics workspace(단위 경제성 워크스페이스)**다.

## 2. 리서치 근거

공식 원본은 [evidence_board.csv](evidence_board.csv)다. 2026-05-07 기준 공식 evidence(검증 근거 사례)는 38개이고, [evidence_candidates_unverified.csv](evidence_candidates_unverified.csv)에 후보/검증 이력 44개를 별도로 보관한다.

현재 Top Pain(가장 중요한 문제)은 validator(검증 스크립트)로 계산한다.

```bash
npm run research:validate
```

현재 결과:

| 순위 | pain | 점수 | 의미 |
| --- | --- | ---: | --- |
| 1 | `pain_margin_unknown` | 259 | AI 기능이 gross margin(매출총이익률)을 얼마나 깎는지 모른다. |
| 2 | `pain_heavy_user_loss` | 201 | 많이 쓰는 고객이 오히려 마진을 깨는 고객이 된다. |
| 3 | `pain_usage_pricing_mismatch` | 193 | 비용은 usage 기반인데 가격은 seat/flat이라 마진이 깨진다. |

이 결과는 MVP(최소 기능 제품)를 비용 절감 도구가 아니라 **unit economics와 pricing decision(가격정책 결정) 도구**로 잡아야 한다는 신호다. 특히 대부분의 high-WTP(지불 의향이 높은) pain은 "지금 구조로 계속 팔면 마진이 어떻게 될까?", "heavy user(많이 쓰는 고객)가 늘면 손해가 날까?", "usage-based pricing(사용량 기준 가격정책)이나 credit pricing(크레딧 기준 가격정책)으로 바꾸면 나아질까?" 같은 **what-if 질문(가정 실험 질문)**으로 이어진다.

## 2.1 경쟁 제품과 차별점

Helicone, LangSmith, Phoenix, Langfuse, Portkey 같은 도구는 LLM observability(LLM 요청에서 무슨 일이 일어났는지 추적하는 관측 기능), tracing(요청 흐름 추적), prompt debugging(LLM 입력 지시문 디버깅), gateway(LLM 호출을 한곳에서 받아 라우팅·제어하는 중간 관문), usage tracking(사용량 추적)에 강하다. 이 제품의 차별점은 dev observability가 아니라 **Finance/CEO decision layer(재무·CEO 의사결정 계층)**에 있다.

경쟁 제품 비교 원장은 [ai-saas-llm-cost-products-comparison-2026.md](ai-saas-llm-cost-products-comparison-2026.md)에 둔다. 핵심 결론은 관측 도구와 billing 도구 사이에 빈 공간이 있다는 것이다.

한 줄 차별점:

> LLM trace를 보는 도구가 아니라, 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고 gross margin과 가격정책 판단으로 바꾸는 도구다.

조금 더 구체적으로 말하면:

> Observability는 개발자에게 무슨 일이 있었는지 보여주고, billing(청구)은 고객에게 사용량을 청구한다. 이 제품은 그 사이에서 그 사용량이 이익인지 손실인지, 가격정책을 어떻게 바꿔야 하는지 설명한다.

## 2.2 3-Layer Product Model(3층 제품 모델)

제품은 Group A와 Group B를 따로 보지 않는다. Group A는 entry point(제품을 처음 쓰게 만드는 진입점), Core Engine(비용 귀속과 의사결정 계산을 맡는 핵심 엔진)은 비용 귀속 레이어, Group B는 paid value(돈을 내고 살 만한 의사결정 가치)다.

```txt
Group A: Entry Point
실시간 비용/운영 문제
token spike, cache miss, quota, agent loop, provider delay
        ↓
Core Engine
비용 귀속 / 원인 분해 / 비즈니스 단위 변환
고객별, 기능별, 모델별, 플랜별, 세션별 비용
        ↓
Group B: Paid Value
마진/가격/수익성 의사결정
고객별 수익성, 플랜별 gross margin, heavy user 손실, pricing simulation, CEO/CFO report
```

핵심은 "비용이 튀었다"에서 멈추지 않는 것이다. 운영 로그를 attribution dimension(비용 귀속 기준)으로 재분류해야 "어떤 고객, 기능, 플랜, 세션이 마진을 깨는가?"라는 유료 의사결정 질문에 답할 수 있다.

## 3. Evidence 운영 원칙

리서치 자료는 두 층으로 관리한다.

| 파일 | 역할 | 제품 주장 사용 |
| --- | --- | --- |
| [evidence_board.csv](evidence_board.csv) | URL, 날짜, quote(원문 인용)가 확인된 공식 검증 원장 | 가능 |
| [evidence_candidates_unverified.csv](evidence_candidates_unverified.csv) | quote 없음, 접근 제한, 중복, Group C 후보 보관 | 불가. 검증 후 승격 |

공식 Evidence Board에 들어가려면 다음이 필요하다.

- URL
- published date(게시일)
- exact short quote(짧은 원문 인용)
- persona
- group
- pain_tag 1~3개
- frequency_signal
- wtp_score
- evidence_strength
- quote_verified

Forbes/Metronome처럼 후보 가치는 있지만 quote를 직접 확인하지 못한 자료는 버리지 않는다. 다만 공식 제품 주장에는 쓰지 않는다.

## 4. 시장 구분과 제품 레이어

### Layer 1: Group A Entry Point(진입점)

개발자/운영자가 자주 겪는 반복 pain이다. 이 레이어는 제품을 써볼 이유를 만든다.

대표 signal(신호):

- token cost spike
- cache miss / cache TTL 문제
- quota 소진
- provider dashboard(공급자 대시보드) 지연
- session/agent loop 비용 폭증

제품 역할:

- CSV/log import의 필요성을 만든다.
- 비용이 왜 튀었는지 usage/spike 요약으로 설명한다.
- 실시간 budget guardrail(예산 초과를 막는 안전장치)은 아직 research-gated(리서치로 검증된 뒤 재도입할)로 둔다.

### Layer 2: Core Engine

운영 로그를 비즈니스 원가로 바꾸는 핵심 엔진이다. 이 레이어가 없으면 제품은 단순 비용 대시보드에 머문다.

Core Engine이 귀속해야 하는 축:

- customer
- feature / workflow
- model
- plan
- session
- agent run

제품 역할:

- request/token/cost를 여러 attribution dimension으로 묶는다.
- 비용을 cost object(비즈니스 원가 단위)와 business denominator(원가를 나눌 기준값)로 바꾼다.
- Group A의 운영 문제를 Group B의 마진/가격 판단으로 연결한다.

### Layer 3: Group B Paid Value(유료 가치)

AI SaaS의 원가·마진·가격정책 문제다. 이쪽이 MVP의 중심이다.

대표 pain:

- gross margin 압박
- 고객별 수익성 불명확
- heavy user 손실
- AI COGS(매출원가) 미분리
- usage-based / credit / hybrid pricing 필요
- CEO/CFO/Finance/Board 보고 필요

구매자는 Founder, CEO, CFO, Finance, PM이다. 돈을 낼 이유는 "토큰을 아끼기"보다 **손해 보는 고객과 잘못된 가격정책을 찾기**다.

### Group C: 확장 시장

일반 개발 환경과 내부 AI 도구 비용 문제다.

대표 사례:

- 내부 RAG(검색으로 근거 문서를 붙여 답하는 방식) 비용 관리
- dev team LLM spend tracking(개발팀 LLM 지출 추적)
- Claude/OpenAI bill surprise
- cache 최적화
- 팀 예산 알림

Group C는 버리지 않는다. 다만 초기 MVP의 메인 포지션에 섞지 않고, [evidence_candidates_unverified.csv](evidence_candidates_unverified.csv)에 보관한다. 나중에 **Internal Mode** 또는 **Developer Lite**로 확장할 수 있다.

Group C의 v2 가능성:

- 내부 RAG 비용 대시보드
- dev team LLM spend tracking
- bill surprise(예상 밖 청구) 알림
- cache/token waste 최적화
- 팀/프로젝트/API key별 비용 리포트

## 5. 타깃 사용자와 구매자

| 구분 | 대상 | 얻는 가치 |
| --- | --- | --- |
| Primary buyer | Founder, CEO, CFO, Finance | 고객별 수익성, gross margin, 가격정책 판단, Board reporting(이사회 보고) |
| Primary user | AI SaaS developer, backend, ML, infra | CSV/log import, feature mapping(기능 매핑), cost attribution(비용 귀속), 모델/캐싱/라우팅 판단 |
| Secondary user | PM, RevOps, CS/Ops | 기능별 원가, rollout(출시·확대 적용) 판단, CS escalation(고객지원 이관) 비용 이해 |
| Expansion user | 내부 AI 도구 운영팀 | 팀별 비용 추적, bill surprise 방지, cache 최적화 |

## 6. MVP 목표

MVP는 다음 문장을 증명해야 한다.

> AI SaaS 팀은 LLM 운영 로그를 올리면, 고객·기능·모델·플랜·세션별 원가를 보고 gross margin과 가격정책 결정을 할 수 있다.

MVP에서 중요한 것은 예쁜 대시보드가 아니라 **의사결정 가능한 숫자**다.

## 7. 핵심 사용자 흐름

```txt
1. LLM 운영 로그 가져오기
2. token spike, cache miss, quota, agent loop 같은 운영 signal 요약
3. customer/feature/model/plan/session/agent run 기준으로 비용 귀속
4. business denominator와 판매가 입력
5. customer/feature/plan/session 단위 원가 계산
6. 고객별 수익성, 플랜별 gross margin, heavy-user 손실 확인
7. Token/Pricing Simulator에서 volume(사용량 규모), model, pricing, heavy-user scenario(많이 쓰는 고객 가정)를 바꿔본다.
8. seat / usage / credit / hybrid / cap / overage 시뮬레이션
9. CEO/CFO/PM/Developer report 출력
```

## 8. 데이터 입력 정책

사용자가 토큰 수를 추측하게 만들지 않는다. 가능한 한 실제 LLM usage log에서 가져온다.

초기 MVP 입력 방식:

- CSV upload(파일 업로드)
- CSV paste(붙여넣기)
- 샘플 CSV template(양식)

권장 CSV 컬럼:

```csv
timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status
```

최소 필수 컬럼:

```csv
timestamp,feature,model,input_tokens,output_tokens
```

앱이 추정하지 않는 값:

- 월 고객 수
- 월 report 수
- 월 ticket 수
- 월 workflow/job 수
- 기능별 판매가
- 고객당 매출
- 플랜별 월 매출
- credit/overage 단가

이 값들은 사용자가 직접 입력한다. LLM log만 보고 business denominator를 추정하면 안 된다.

## 9. MVP 핵심 기능

### 9.1 Usage Import(사용량 가져오기)

CSV를 통해 LLM 사용량을 가져온다.

요구사항:

- sample CSV 제공
- feature, customer, model, plan, session, agent run 컬럼 인식
- input/output token 분리
- total_cost가 있으면 사용하고, 없으면 모델 단가로 계산
- import 후 feature/customer/model/plan/session별 집계 미리보기

### 9.2 Operational Signal Summary(운영 신호 요약)

Group A의 운영 문제를 제품 진입점으로 보여준다.

요구사항:

- token spike 후보 표시
- cache miss 또는 cacheable context 비중 표시
- quota나 provider dashboard 지연은 수동/CSV 한계로 assumption(가정)임을 표시
- session/agent run 비용 상위 항목 표시
- 이 섹션의 목적은 alert가 아니라 "어떤 로그를 더 봐야 하는지"를 안내하는 것이다.

### 9.3 Attribution Cost Engine(비용 귀속 엔진)

Core Engine은 비용을 여러 기준으로 재분류한다.

요구사항:

- 고객별 비용
- 기능별 비용
- 모델별 비용
- 플랜별 비용
- 세션별 비용
- agent run별 비용
- input/output 비용 분해
- total_cost가 있는 로그와 모델 단가 기반 계산을 구분 표시

핵심 질문:

> 운영 로그에서 발생한 비용이 어떤 고객, 기능, 모델, 플랜, 세션에 귀속되는가?

### 9.4 Feature-Level Cost(기능별 원가)

어떤 기능이 비용을 먹는지 보여준다.

요구사항:

- 기능별 월 비용
- 기능별 요청 수
- 기능별 input/output token 비용
- 전체 비용 기여도
- Top cost feature(가장 비용이 큰 기능) 강조

핵심 질문:

> 어떤 기능부터 최적화해야 하는가?

### 9.5 Customer-Level Cost(고객별 원가)

고객별 AI 원가를 보여준다.

요구사항:

- 고객별 월 LLM cost
- 고객별 요청 수
- 고객별 cost per request(요청당 원가)
- top-decile customer cost vs median(상위 10% 고객 원가와 중앙값 비교)
- heavy-user 후보 표시

핵심 질문:

> 어떤 고객이 많이 쓸수록 손해인가?

### 9.6 Plan-Level Margin(요금제별 마진)

플랜별로 원가와 마진이 맞는지 보여준다.

요구사항:

- plan_id별 월 LLM cost
- 플랜별 고객 수 또는 매출 입력
- 플랜별 gross margin
- free/pro/team/enterprise 같은 plan에서 손해 가능성 표시
- heavy user가 특정 plan에 몰리는지 표시

핵심 질문:

> 어떤 플랜이 사용량이 늘수록 손해가 되는가?

### 9.7 Unit Economics(단위 경제성)

비즈니스 단위당 원가를 계산한다.

공식:

```txt
rawCostPerMetric = rawMonthlyCost / denominator
effectiveCostPerMetric = effectiveMonthlyCost / denominator
```

denominator(원가를 나눌 기준값) 예시:

- monthly reports
- monthly tickets
- monthly workflows
- monthly customers
- monthly transactions

### 9.8 Gross Margin(매출총이익률)

판매 가격과 원가를 비교한다.

공식:

```txt
grossMargin = (sellingPrice - effectiveUnitCost) / sellingPrice
```

요구사항:

- 기능별 판매 가격 입력
- 고객/기능/플랜/workflow 단위 gross margin
- margin이 낮거나 음수인 항목 강조
- raw margin(순수 API 비용 기준 마진)과 effective margin(품질·운영 부담 포함 마진) 분리

### 9.9 Heavy-User Profitability(많이 쓰는 고객의 수익성)

상위 사용 고객이 수익성에 미치는 영향을 보여준다.

요구사항:

- top 10% customers cost share(상위 10% 고객의 비용 비중)
- top-decile customer cost vs median
- heavy user가 전체 margin에 미치는 영향
- flat pricing에서 손해 가능성 표시
- 특정 plan에 heavy user가 집중되는지 표시

### 9.10 Pricing & Token Simulator(가격정책·토큰 시뮬레이터)

가격정책과 토큰 사용량 변화가 원가, 고객별 수익성, gross margin에 어떤 영향을 주는지 비교한다. 이 기능은 MVP의 핵심 엔진이다.

핵심 질문:

- 요청 수가 2배가 되면 월 COGS와 gross margin은 어떻게 바뀌는가?
- 평균 출력 토큰이 30% 늘면 어떤 기능이 손해가 되는가?
- heavy user 상위 10%가 더 많이 쓰면 어떤 고객/플랜이 깨지는가?
- 현재 seat pricing(좌석 기준 가격정책)을 usage-based, credit, hybrid pricing으로 바꾸면 margin이 개선되는가?
- 후보 모델로 바꾸면 raw cost는 줄지만 effective margin은 나빠지지 않는가?
- plan별 included usage(포함 사용량), cap, overage를 바꾸면 손해 고객 수가 줄어드는가?

지원할 시나리오:

- seat-based(좌석 기준)
- usage-based(사용량 기준)
- credit-based(크레딧 기준)
- hybrid pricing(혼합 가격정책)
- model switch(모델 교체)
- request volume growth(요청량 증가)
- average input/output token growth(평균 입력/출력 토큰 증가)
- heavy-user concentration(많이 쓰는 고객 집중)
- plan mix change(요금제 구성 변화)
- session/agent loop reduction(세션/에이전트 반복 실행 감소)
- cache/batch/output cap savings(캐시·배치·출력 상한 절감)

요구사항:

- 사용자가 판매 가격과 포함 사용량을 입력
- overage/credit 단가를 입력
- 시나리오별 gross margin 비교
- heavy-user 손실이 줄어드는지 표시
- 현재 vs 시뮬레이션 결과를 월 비용, 고객당 원가, 플랜별 margin, gross margin, 손해 고객 수로 비교
- 시뮬레이션은 "예측"이 아니라 "사용자 입력 가정 기반 what-if"로 표시

### 9.11 Raw Cost vs Effective Cost(순수 비용 vs 실제 체감 비용)

싼 모델이 진짜 싼지 확인한다.

공식:

```txt
effectiveCost = rawCost + retryCost + humanReviewCost + csEscalationCost
```

요구사항:

- retry rate(재시도율)
- human review rate(사람 검수율)
- CS escalation rate(고객지원 이관율)
- review cost per case(검수 1건당 비용)
- CS cost per escalation(이관 1건당 비용)
- 기능별 assumption template(가정 템플릿)
- 모델 교체 전후 effective margin 비교
- 사용자 override UI(가정값을 직접 덮어쓰는 화면)
- raw cost, quality burden(품질 때문에 생기는 부담), effective cost를 분리 표시

기본 assumption template:

| 기능 유형 | retry rate | human review rate | CS escalation rate | 설명 |
| --- | ---: | ---: | ---: | --- |
| 고객 문의 분류 | 2% | 1% | 0.2% | 구조화된 단순 작업 |
| 문서 요약 | 5% | 3% | 0.5% | 품질 편차가 있는 내부/고객용 작업 |
| RAG 답변 | 8% | 5% | 1% | 고객-facing 답변, hallucination 리스크 |
| 리포트 생성 | 6% | 4% | 0.5% | 긴 출력과 검수 가능성 |
| 코드 생성 | 10% | 0% | 0% | 재시도는 많지만 CS 비용은 낮게 가정 |

이 값은 실제 eval harness(평가 자동화 장치)가 붙기 전까지 assumption으로 표시한다. 사용자는 모든 값을 직접 수정할 수 있어야 한다.

### 9.12 Report Output(리포트 출력)

역할별 리포트를 제공한다.

리포트 문장과 CFO/CEO/Board용 표현은 [ai-saas-cfo-ceo-board-reporting-expressions-2026.md](ai-saas-cfo-ceo-board-reporting-expressions-2026.md)를 기준 라이브러리로 사용한다.

리포트 유형:

- Developer: token, model, feature breakdown(기능별 분해)
- PM: 기능별/플랜별 원가, rollout, 가격정책 영향
- CEO/CFO/Finance: gross margin, 손해 고객, pricing risk(가격정책 리스크), next action(다음 조치)

리포트는 복사 가능한 문장 형태여야 한다.

필수 템플릿:

| 템플릿 | 포함 내용 |
| --- | --- |
| CEO/CFO 1-pager | 월 AI COGS, gross margin 영향, 플랜별 margin, heavy-user risk, pricing recommendation(가격정책 추천), next action |
| PM 기능별 원가 리포트 | 기능별 비용 Top, 기능별/플랜별 margin, rollout 우선순위, 품질 리스크 |
| Developer breakdown | feature/model/customer/plan/session별 token, input/output cost, effective cost assumptions, savings levers(절감 수단) |
| Board-ready summary | AI unit economics, margin trend(마진 추세), customer concentration(고객 집중도), plan risk, pricing model risk |

CEO/CFO용 리포트에는 최소한 아래 문장이 생성되어야 한다.

```text
지난 30일 AI COGS는 $X이며, 비용의 Y%는 [기능]에서 발생했습니다.
상위 10% 고객이 전체 AI 비용의 Z%를 만들고 있어 현재 [가격정책]에서는 margin risk가 있습니다.
[대안 가격정책]으로 바꾸면 예상 gross margin은 A%에서 B%로 개선됩니다.
```

Board-ready summary(이사회에 바로 공유할 수 있는 요약)에는 최소한 아래 관점이 포함되어야 한다.

- AI COGS가 별도 비용층으로 생겼는가?
- AI infrastructure(인프라) 비용이 gross margin erosion(매출총이익률 침식)을 만들고 있는가?
- customer-level cost와 contribution margin(공헌이익률)이 보이는가?
- pricing alignment(가격정책과 비용 구조의 정렬)가 usage-driven cost(사용량에 따라 늘어나는 비용)와 맞는가?
- margin improvement roadmap(마진 개선 계획)이 있는가?

## 10. MVP에서 하지 않을 것

초기 MVP에서는 아래를 메인 기능으로 넣지 않는다.

- 실시간 예산/쿼터 가드레일
- 개발자 진단 전용 화면
- Slack/Email 알림
- SDK(개발자가 기능을 붙이는 코드 패키지) 자동 수집
- Gateway / Proxy(대리 호출 계층)
- 실시간 provider price sync(공급자 가격 동기화)
- 실제 eval harness 연동
- ontology(개념 관계 지도) 화면
- Jarvis형 assistant(도우미)
- 실시간 anomaly detection(이상 징후 탐지)

이유:

현재 구매 pain은 실시간 알림보다 **마진/가격정책 판단**에 더 강하다.

## 11. Research-Gated(리서치로 검증된 뒤 재도입할) 기능

| 기능 | 재검토 조건 |
| --- | --- |
| Budget / quota guardrails | `pain_team_budget` 또는 `pain_cost_unpredictable`이 50개 evidence 기준 Top 3이고 평균 `wtp_score >= 4` |
| Developer diagnostics | `pain_tracking_wrong` 또는 `pain_token_waste`가 Top 3 |
| Internal Mode | Group C 후보가 검증 evidence 15개 이상이고, 팀 예산/내부 RAG 비용 WTP가 4 이상 |
| SDK / Middleware | CSV로 실제 로그 분석 요청이 반복되고, 자동 수집 니즈가 인터뷰에서 확인됨 |
| Gateway / Proxy | routing(요청 경로 선택), fallback(대체 경로), budget cap(예산 상한)이 유료 action(실행할 조치)과 직접 연결됨 |

## 12. 성공 기준

MVP가 성공하려면 사용자가 다음 질문에 답할 수 있어야 한다.

1. 이번 달 AI 기능 총 원가는 얼마인가?
2. 어떤 기능이 비용을 가장 많이 쓰는가?
3. 어떤 고객이 AI 원가를 가장 많이 만드는가?
4. 어떤 모델, 플랜, 세션, agent run이 비용을 키우는가?
5. report/ticket/workflow당 원가는 얼마인가?
6. 현재 판매 가격과 플랜 구조에서 gross margin은 남는가?
7. heavy user 때문에 손해 보는 고객이나 플랜이 있는가?
8. seat-based pricing을 계속 써도 되는가?
9. usage-based / credit / hybrid / cap / overage로 바꾸면 margin이 개선되는가?
10. CEO/CFO/PM에게 공유할 수 있는 요약이 나오는가?

## 13. 제품 내 핵심 지표

- monthly LLM cost(월간 LLM 비용)
- cost by feature(기능별 비용)
- cost by customer(고객별 비용)
- cost by model(모델별 비용)
- cost by plan(요금제별 비용)
- cost by session(세션별 비용)
- cost by agent run(에이전트 실행별 비용)
- cost per request(요청당 비용)
- cost per report / ticket / workflow(리포트·티켓·워크플로우당 비용)
- AI COGS(매출원가)
- gross margin
- plan gross margin(요금제별 매출총이익률)
- top-decile customer cost vs median
- heavy-user cost share
- raw cost vs effective cost
- pricing scenario margin(가격 시나리오별 마진)
- input/output cost split(입력·출력 비용 분해)
- cache/batch/output-cap potential savings(캐시·배치·출력 상한으로 가능한 절감액)

## 14. WTP(지불 의향) 검증 기준

강한 구매 신호:

- "지금 스프레드시트로 하고 있어요."
- "SQL로 매번 뽑아요."
- "큰 고객이 손해인지 몰라요."
- "AI 기능별 gross margin을 CFO/CEO에게 보여줘야 해요."
- "usage-based pricing이나 AI credit으로 바꾸는 중이에요."
- "우리 로그로 해볼 수 있나요?"

약한 신호:

- "좋네요, 나중에 필요할 것 같아요."
- "아직 비용이 작아요."
- "개발자가 대충 보고 있어요."
- "pricing이나 margin 결정과는 연결되지 않아요."

## 15. 리서치와 PRD의 다음 게이트

현재는 38개 공식 evidence다. 50개까지 확장한 뒤 다음을 판단한다.

후보까지 포함하면 2026-05-07 기준 리서치 재료는 공식 38개 + 후보/검증 이력 44개다. 단, 후보는 검증 전까지 제품 주장에 사용하지 않는다.

MVP 방향 유지 조건:

- Stream B evidence가 20개 이상
- `pain_margin_unknown`이 Top 5
- `pain_customer_profitability_unknown` 또는 `pain_heavy_user_loss`가 Top 5
- business keyword evidence 평균 `wtp_score >= 4`
- PM/CEO/Finance 공유 니즈 evidence가 4개 이상

방향 보정 조건:

- 대부분이 개인 플랜/한도 불만뿐이다.
- margin/pricing evidence가 5개 미만이다.
- 리포트 공유 대상이 없다.
- 기존 observability 도구로 충분하다는 반응이 대부분이다.

## 16. 구현 원칙

- 모든 비용 계산은 `src/lib/calculator.ts`의 공식 경로를 통과한다.
- 모든 사용자 표시 숫자는 `src/lib/format.ts`의 formatter를 통과한다.
- 모델명, 브랜드명, 가격, 토큰 숫자는 자동 번역으로 깨지지 않게 보호한다.
- 비용 절감률만 보여주지 않고 quality/risk/effective cost를 함께 보여준다.
- quote가 검증되지 않은 자료는 제품 주장에 쓰지 않는다.
- Group C는 expansion evidence(확장 시장 근거)로 관리하되 MVP 포지션에 섞지 않는다.

## 17. 결론

지금까지의 리서치 결론은 다음이다.

> Group A는 entry point, Core Engine은 비용 귀속 레이어, Group B는 paid value다.

따라서 MVP는 **AI SaaS unit economics**에 집중한다.

최종 한 줄 설명:

> LLM 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 바꿔, 손해 보는 고객과 잘못된 가격정책을 찾게 해주는 서비스.
