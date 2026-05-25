# AgentPayroll Unit Economics Subagent Research (2026-05-26)

이 문서는 유닛 이코노믹스(고객 1명을 얻고 유지할 때 매출, 비용, 이익, 회수 기간이 맞는지 보는 사업 체력 지표)의 다섯 문제를 각각 별도 서브에이전트가 조사한 1차 결과를 적재한다. 목적은 "좋아 보이는 사업"이 아니라 **어떤 가정이 깨지면 돈을 못 버는지**를 분해하고, 후속 PDCA(Plan-Do-Check-Act, 계획하고 실행하고 측정하고 조정하는 반복 개선 방식) 실행의 성공 기준을 명확히 만드는 것이다.

## Subagent 1. 매출/WTP 위험

### 조사 질문

- 고객은 AgentPayroll에 왜 돈을 내는가?(단순히 비용표를 보기 위해서인지, 가격/마진 결정을 내리기 위해서인지 구분)
- `AI Cost Snapshot`은 얼마까지 받을 수 있는가?(한 번의 AI 비용/마진 진단 리포트에 고객이 실제로 지불할 수 있는 가격 범위)
- 일회성 리포트에서 Monthly Review로 넘어가는 구매 이유는 무엇인가?(한 번 보고 끝나는 리포트가 아니라 매월 다시 사야 하는 이유)
- 관측/로그 도구와 비교될 때 WTP가 낮아지는 지점은 어디인가?(Helicone/Langfuse/OpenAI dashboard/SQL/엑셀과 비슷해 보이면 돈 낼 이유가 약해지는 지점)

### 1차 발견

1. 돈 내는 이유는 "토큰 절감"이 아니라 가격과 마진 결정이다(몇 원 아꼈는지보다 어떤 고객/기능/요금제를 바꿔야 하는지 알려줄 때 돈을 낼 가능성이 높다).
2. usage-based, credit, hybrid pricing(사용량 과금, 포인트/크레딧 차감 과금, 기본료+사용량 혼합 과금)으로 시장이 움직이는 것은 AgentPayroll의 pricing decision pack(가격정책 결정을 돕는 패키지) 포지션을 강화한다.
3. 일회성 리포트는 팔릴 수 있지만 SaaS 반복 매출로는 약하다(한 번 납품하고 끝나면 매월 쌓이는 구독 매출이 생기지 않는다).
4. `AI Cost Snapshot`은 비용 리포트처럼 들리므로 `AI Margin Snapshot`(AI 기능이 매출 대비 얼마를 남기는지 보는 진단), `Loss-Making Customer Review`(쓰면 쓸수록 손해인 고객을 찾는 리뷰), `AI Pricing Decision Pack`(가격/요금제/사용량 제한을 바꾸기 위한 결정 패키지) 이름을 테스트해야 한다.
5. Helicone, Langfuse, Arize 같은 관측 도구(LLM 요청 로그, latency, cost, error를 보는 개발/운영 도구)와 경쟁하면 WTP가 낮아진다. AgentPayroll은 "로그 대시보드"가 아니라 "CEO/PM/Finance가 승인할 결정 패키지"여야 한다(대표/제품/재무 담당자가 가격정책을 바꾸는 데 쓰는 자료여야 한다).

### 위험한 가정

- 고객이 실제로 월 LLM/API 비용을 아프게 느낀다(비용이 작으면 리포트 가격을 정당화하기 어렵다).
- 고객이 usage log(사용 로그)를 고객/기능/플랜/매출과 연결할 수 있다(연결이 안 되면 "누가 손해인지"를 계산하기 어렵다).
- 구매자가 개발자가 아니라 founder/CEO/Finance/PM이다(개발자는 로그 도구로 충분하다고 느낄 수 있지만, 예산/가격 결정권자는 리포트에 돈을 낼 수 있다).
- Monthly Review가 매월 새로운 결정을 만든다(새로운 결정이 없으면 고객은 매월 돈 낼 이유를 잃는다).
- Data Readiness 5만-15만 원이 유료 선별 장치로 작동하면서도 운영 시간을 잡아먹지 않는다(저가 상품에 사람이 오래 붙으면 적자가 된다).

### 검증 질문

- 최근 3개월 안에 AI 비용 때문에 가격, 플랜, 사용량 제한, 모델 변경을 논의한 적이 있는가?
- 월 LLM/API 비용은 얼마이고 매출 대비 몇 퍼센트인가?(비용이 매출에 비해 작으면 구매 우선순위가 낮을 수 있다)
- 고객별/기능별/플랜별 AI 원가를 지금 볼 수 있는가?(이걸 못 보면 AgentPayroll이 해결할 문제가 크다)
- 이 숫자가 없어서 늦어진 결정은 무엇인가?(가격 인상, 사용량 제한, 모델 변경, 특정 고객 대응 등)
- 이 리포트를 받으면 누구에게 공유하는가?(공유 대상이 CEO/CFO/PM이면 구매 명분이 강해진다)
- 1회 리포트 후 다음 달에도 다시 보고 싶은 변화 지표는 무엇인가?(반복구매 이유가 있는지 확인)

### 성공 기준

- 15명 인터뷰 완료: founder/CEO/PM 5명, dev/infra 5명, finance/ops/revops 5명(대표/제품, 개발/인프라, 재무/운영/매출 운영 관점을 나누어 본다).
- 각 인터뷰에 `monthly_llm_cost`(월 AI 비용), `current_workaround`(현재 대체 방법), `decision_delayed`(숫자가 없어서 늦어진 결정), `buyer`(구매 책임자), `wtp_signal`(돈 낼 의향 신호), `objection_tags`(거절 이유 태그)가 기록된다.
- 최소 5명이 "우리 데이터로 해보고 싶다"고 말한다.
- 최소 3명이 유료 파일럿 또는 예약금에 동의한다.
- 가격 사다리별 전환 기준이 정의된다.

### 추천 실험

- 이름 A/B: `AI Cost Snapshot` vs `AI Margin Snapshot` vs `Loss-Making Customer Review`(같은 상품이라도 이름에 따라 "비용표"로 보이는지 "마진/손해 고객 결정 자료"로 보이는지 확인).
- 유료 선별: Free Fit Check 이후 `Data Readiness Check 9만 원` 제안(무료 관심과 실제 구매 의향을 분리).
- 예약금: `AI Margin Snapshot 50만 원`에 10만 원 예약금 요청(말뿐인 관심과 실제 지불 의향을 구분).
- Monthly Review 선판매: Snapshot 끝에 `월 49만 원` follow-up 제안(1회 진단이 반복 리뷰로 이어질 수 있는지 확인).

## Subagent 2. 비용/COGS/서비스 제공 시간 위험

### 조사 질문

- 리포트 하나를 만드는 데 사람 시간이 얼마나 들어가면 적자인가?(상품 가격 대비 인건비가 어느 순간부터 남는 돈을 없애는지)
- LLM/Supabase/server 비용보다 큰 COGS는 무엇인가?(매출원가 중 모델/서버비보다 더 큰 사람이 하는 일은 무엇인지)
- 어느 작업을 먼저 자동화해야 gross margin이 방어되는가?(남는 비율을 지키려면 어떤 수작업을 먼저 줄여야 하는지)

### 1차 발견

1. 초기 COGS 리스크는 LLM/Supabase가 아니라 리포트 생산 노동이다(CSV 이해, 컬럼 매핑, 보안 설명, 리포트 검수 같은 사람 일이 원가의 대부분이 될 수 있다).
2. SaaS gross margin과 professional services margin의 벤치마크가 다르므로 "리포트 대행"으로 보이면 경제성이 낮다(SaaS는 소프트웨어가 반복 제공되어 마진이 높아야 하는데, 대행/컨설팅은 사람 시간이 늘수록 마진이 낮아진다).
3. AI-native gross margin 압박은 주로 inference/cloud 이야기지만, AgentPayroll은 여기에 사람 검수 시간이 추가된다(AI 제품 원가에 운영자 검수 비용까지 붙는다는 뜻).
4. 30만 원 Snapshot은 full custom report 가격이 아니다(고객마다 맞춤 분석/검수/미팅을 길게 해주기에는 가격이 낮다).
5. 자동화 우선순위는 모델 비용 최적화보다 반복 설명, schema mapping, report QA 제거다(모델 비용 몇 천 원 줄이는 것보다 사람 1시간 줄이는 것이 경제성에 더 크다).

### 단위 원가 모델

```text
Report COGS
= direct human hours * loaded hourly cost
+ LLM/API/inference
+ Supabase/server/storage
+ report/export/tooling
+ review-call/support/rework allowance
```

이 모델은 "리포트 하나를 팔 때 실제로 무엇이 원가인가"를 분해한다. `direct human hours`는 사람이 직접 쓴 시간, `loaded hourly cost`는 시간당 실제 비용, `review-call/support/rework allowance`는 리뷰콜/고객지원/재작업을 미리 반영한 여유 원가다.

| 단계 | Green | Yellow | Red |
|---|---:|---:|---:|
| Intake / fit check | 0.15h | 0.5h | 1h+ |
| Data readiness / schema 이해 | 0.5h | 1.5h | 3h+ |
| Column mapping / QA | 0.5h | 1.5h | 3h+ |
| Trust 설명 / 보안 질문 | 0.25h | 1h | 2h+ |
| Report draft / 검수 | 1h | 2h | 4h+ |
| Review call / follow-up | 0.5h | 1h | 2h+ |

### 성공 기준

- Fit Check: 사람 투입 15분 이하(무료 단계가 상담/분석으로 번지지 않게 제한).
- Data Readiness Check: 사람 투입 45분 이하, gross margin 60% 이상(저가 상품도 최소한 남는 구조여야 함).
- 첫 AI Cost Snapshot: 70만-100만 원 가격에서 사람 투입 3.5시간 이하, gross margin 60% 이상(맞춤 리포트라도 반나절 안에 끝나야 함).
- 반복 Monthly Review: 사람 투입 1.5시간 이하, gross margin 70% 이상(반복 상품은 자동화되어야 함).
- 세 번째 유사 고객부터 컬럼 80% 이상 자동 매핑(비슷한 CSV를 다시 받을 때 사람이 새로 해석하지 않아야 함).
- Trust 설명 추가 시간이 고객당 20분 이하(보안/개인정보 질문이 매번 긴 미팅으로 번지면 CAC가 커짐).

### 추천 실험

- 3개 messy CSV time-and-motion 실험(지저분한 고객 CSV 3개를 실제처럼 처리하며 단계별 시간을 재는 실험).
- 가격 사다리 WTP 테스트: 30만/70만/150만 원(가격을 실제로 제시했을 때 어디에서 거절/수락이 갈리는지 확인).
- Data Readiness Gate self-assessment 유무에 따른 사람 시간 비교(self-assessment는 고객이 먼저 데이터 상태를 체크하는 질문지).
- Report QA checklist로 사람이 수정한 항목 태깅(숫자 오류, 문장 오류, 매핑 오류, Trust 문구 오류를 분류해 자동화 우선순위를 찾음).

## Subagent 3. CAC/신뢰 형성/온보딩 위험

### 조사 질문

- Trust Gate는 CAC를 낮추는가, 높이는가?(안심 장치가 구매 전환을 돕는지, 아니면 설명 시간이 늘어 비용이 커지는지)
- Free Fit Check가 나쁜 리드를 얼마나 걸러야 하는가?(무료 단계에서 돈 안 될 고객을 얼마나 빨리 제외해야 하는지)
- A/B/C ICP를 어떤 기준으로 나눌 것인가?(가장 잘 맞는 고객, 준비가 덜 된 고객, 지금은 아닌 고객을 어떻게 구분할지)

### 1차 발견

1. 가장 큰 CAC 리스크는 마케팅 비용보다 신뢰 형성 시간이다(민감한 데이터를 맡기는 제품이라 설명/안심/보안 질문 대응 시간이 커질 수 있다).
2. Trust Gate는 보안 기능이 아니라 conversion UX다(사용자가 "이 정도면 안전하게 업로드해도 되겠다"라고 느끼게 하는 구매 전환 장치다).
3. Free Fit Check는 리드 생성물이 아니라 리드 필터여야 한다(많은 사람을 받는 것이 아니라 유료 분석 가능성이 낮은 사람을 빨리 걸러야 한다).
4. ICP는 spend보다 "결정 가능성"으로 잘라야 한다(비용이 큰 팀보다 가격/마진/고객 제한 결정을 곧 해야 하는 팀이 더 좋은 고객이다).
5. 목표 payback은 낮게 잡아야 하며, 보안/데이터 온보딩 비용을 CAC에 포함해야 한다(payback은 고객획득비용을 몇 개월 만에 회수하는지 보는 지표다).

### CAC risk model

```text
CAC
= acquisition_cost
+ free_fit_check_minutes * operator_hourly_cost
+ trust_review_minutes * operator_hourly_cost
+ data_mapping_minutes * operator_hourly_cost
+ sales_review_minutes * operator_hourly_cost
+ security_artifact_cost

Payback months = CAC / monthly_gross_profit
```

이 식은 "고객을 얻는 데 쓴 돈과 시간을 몇 개월 만에 회수하는가"를 보기 위한 것이다. 예를 들어 고객 한 명을 얻는 데 60만 원이 들고 월 gross profit(매월 실제 남는 이익)이 10만 원이면 payback은 6개월이다.

### ICP 필터

| 등급 | 기준 | 다음 액션 |
|---|---|---|
| A | AI 기능 production(실제 고객이 쓰는 상태), 월 LLM/API 비용 10만 원 이상, raw prompt 없는 metadata export 가능, customer/feature/plan/revenue/retry 중 3개 이상, decision owner(결정 책임자) 있음 | Snapshot 또는 Monthly Review |
| B | AI 기능 운영 중이나 데이터 정리 부족, revenue 또는 plan 연결 누락, metadata-only 분석(민감한 원문 없이 메타데이터만 분석)에 열려 있음 | Data Readiness Check |
| C | 아이디어 단계, 비용 작음, 로그/매출 연결 없음 | sample report, waitlist |

### 성공 기준

- Free Fit Check 완료 시간 10분 이하.
- Free Fit Check -> paid readiness/snapshot 전환율 15-25% 이상(무료 확인 후 유료 준비도 점검/진단으로 넘어가는 비율).
- Trust Gate 이탈 사유 중 "데이터 불안" 태그가 2주 단위로 감소(안심 설명이 개선되고 있다는 증거).
- A급 리드의 첫 유료 전환까지 operator touch 2회 이하(사람이 직접 개입하는 횟수가 적어야 CAC가 낮아짐).
- 초기 paid CAC payback 12개월 이하, 18개월 초과 시 재설계(1년 안에 고객획득비용을 회수하지 못하면 가격/ICP/온보딩을 바꿔야 함).

### 추천 실험

- Trust Gate A/B: 업로드 전 설명 vs 업로드 직후 설명(어느 시점에 안심 메시지를 보여줄 때 전환이 좋아지는지 비교).
- Free Fit Check strict cap: 10분 초과 리드는 paid readiness로 전환(무료 상담이 길어지는 순간 유료 준비도 점검으로 넘김).
- ICP scoring form: `LLM spend`(월 AI 비용), `usage log`(사용 로그), `revenue link`(매출 연결), `decision urgency`(결정 긴급도), `raw prompt-free export`(민감 원문 없는 export 가능 여부).
- Trust Pack: data flow(데이터 흐름도), no-training(업로드 데이터가 모델 학습에 쓰이지 않는다는 설명), retention/delete(보관/삭제 정책), PII mapping(개인정보 후보 처리), blocked columns(차단 컬럼) self-serve 제공.

## Subagent 4. 유지율/Monthly Review 위험

### 조사 질문

- Snapshot 이후 왜 매월 다시 사야 하는가?(1회 진단 이후에도 계속 돈 낼 이유가 있는지)
- 어떤 고객이 Monthly Review에 적합한가?(매월 비용/마진/가격정책이 바뀌어 반복 검산이 필요한 고객은 누구인지)
- Decision Log는 retention engine으로 작동할 수 있는가?(결정 기록이 고객을 계속 돌아오게 만드는 핵심 장치가 될 수 있는지)

### 1차 발견

1. Snapshot은 paid acquisition 상품이고 Monthly Review는 retention 상품이다(Snapshot은 돈을 내고 시작하게 만드는 첫 상품, Monthly Review는 계속 남게 만드는 반복 상품).
2. Decision Log는 "운영 기억"을 만들기 때문에 retention engine이 될 수 있다(지난달 어떤 결정을 왜 했는지 남아 있어야 다음 달에 효과를 검산할 이유가 생긴다).
3. 월구독에 적합한 고객은 비용이 큰 고객이 아니라 반복 의사결정이 있는 고객이다(매월 가격, cap, 모델, 고객 제한을 조정해야 하는 팀).
4. GRR/NRR 기준은 AgentPayroll 자신의 retention뿐 아니라 고객에게 팔 메시지도 된다(GRR은 기존 매출 유지율, NRR은 확장 매출까지 포함한 순매출 유지율이며, AI 원가가 고객 수익성을 깨면 이 지표에도 영향을 준다고 설명할 수 있다).
5. 가장 큰 위험은 Monthly Review가 recurring workflow가 아니라 consulting retainer처럼 보이는 것이다(recurring workflow는 매월 자동으로 해야 할 일이 생기는 흐름, consulting retainer는 명확한 반복 산출물 없이 매달 자문료처럼 보이는 계약).

### Retention model

```text
Free Fit Check (무료 적합성 확인)
-> Data Readiness Check (데이터 준비도 점검)
-> AI Cost Snapshot (1회 비용/마진 진단)
-> Review Call (결과 설명 미팅)
-> Decision Log(adopt/reject/hold, 채택/거절/보류 기록)
-> 30일 후 Outcome Review (지난 결정의 결과 검산)
-> Monthly AI Cost Review (월간 AI 비용/마진 리뷰)
-> Expansion: more workspaces / connectors / report seats / pricing scenarios (추가 팀 공간, 외부 연결, 리포트 수신자, 가격 시나리오 확장)
```

### 성공 기준

- Snapshot 고객의 40% 이상이 Review Call에서 실제 decision(채택/거절/보류)을 기록한다.
- decision 기록 고객의 50% 이상이 다음 달 follow-up review(후속 검산 리뷰)를 예약한다.
- 첫 3개월 cohort(같은 시기에 시작한 고객 묶음) 기준 Monthly Review GRR 90% 이상.
- Monthly Review 고객의 30% 이상이 workspace(추가 팀/제품 공간), connector(외부 시스템 연결), report recipient(리포트 수신자), pricing scenario(가격정책 시뮬레이션) 중 하나를 추가한다.
- 매월 리뷰에서 최소 1개 이상 지난 decision outcome(지난 결정의 실제 결과)이 검산된다.

### 추천 실험

- Decision-before-report gate(결정을 기록해야 리포트를 export할 수 있게 하는 잠금).
- 30-day Outcome Review 번들(첫 Snapshot에 30일 후 검산 리뷰를 묶어 반복 사용을 만든다).
- ICP scoring과 Monthly Review 전환율 비교(어떤 등급의 리드가 실제 월간 리뷰로 넘어가는지 확인).
- Monthly Review vs Quarterly Review 패키지 테스트(매월이 부담스러운 고객에게 분기 리뷰가 더 잘 맞는지 비교).
- "월간 비용 리포트"가 아니라 "지난 결정 검산" copy 테스트(표현을 바꿨을 때 반복구매 의향이 올라가는지 확인).

## Subagent 5. 반복구매/확장 가능성 위험

### 조사 질문

- PDF 리포트는 반복구매 이유가 될 수 있는가?(예쁜 산출물 자체가 아니라 다음 달에도 다시 사게 만드는 이유가 되는지)
- 어떤 이벤트가 재구매 트리거가 되는가?(모델 가격 변경, heavy user 증가, 가격정책 변경처럼 다시 분석할 명분이 되는 사건)
- expansion은 어디에서 생기는가?(고객이 더 많은 기능/좌석/리포트/연결을 사게 되는 확장 지점)

### 1차 발견

1. PDF 리포트만 팔면 단발 컨설팅으로 끝난다(PDF를 한 번 받고 끝나면 매월 반복 매출이 생기지 않는다).
2. 반복구매의 진짜 트리거는 외부 가격표보다 고객 내부 사용량 변화다(모델 가격이 안 바뀌어도 특정 고객/기능 사용량이 늘면 마진이 깨질 수 있다).
3. AI SaaS pricing은 정적 가격표가 아니라 운영 정책이 되고 있다(한 번 정한 가격표가 아니라 cap, credit, overage, plan boundary를 계속 조정해야 한다).
4. 모델 가격 변화만으로는 부족하고, 실제 workload의 per-request cost/quality drift가 반복 분석 이유다(workload는 고객의 실제 사용 패턴, per-request cost는 요청 1건당 비용, quality drift는 모델 품질/성능이 시간이 지나며 달라지는 현상).
5. 확장 경로는 관측성 도구가 아니라 운영 결재 루프에 있다(로그를 보는 데서 끝나지 않고 가격정책 초안, 승인, 리포트 공유, 다음 달 검산으로 이어져야 더 살 이유가 생긴다).

### 반복구매 트리거

| 트리거 | 고객 신호 | AgentPayroll 액션 |
|---|---|---|
| 모델 가격/성능 변화 | provider 가격표, 신모델, cache/batch/context 변경(provider는 모델 제공자, cache는 재사용 입력 할인, batch는 대량 비동기 처리, context는 긴 입력 처리 범위) | 지난 결정 재검토 + 재시뮬레이션 |
| 고객 사용량 변화 | heavy user 증가, 특정 고객/플랜 margin 하락(많이 쓰는 고객 때문에 특정 요금제가 손해가 되는 상황) | 손해 고객/기능 리포트 + cap/credit/overage 초안 |
| 가격정책 변경 | seat -> usage, credit, hybrid 검토(좌석 과금에서 사용량/크레딧/혼합 과금으로 바꿀지 검토) | pricing scenario + rate card draft(가격 시나리오와 요금표 초안) |
| 예산/cap 초과 | 월 budget, cap, alert 접근(월 예산, 사용량 상한, 경고 기준에 가까워짐) | spend guardrail + forecast(비용 가드레일과 예측) |
| Board/CEO/CFO 보고 | 월간 운영회의, 투자자 업데이트 | persisted PDF + decision history diff(저장된 PDF와 지난 결정 대비 변화 요약) |
| 데이터 구조 변화 | 새 feature/model/session/agent_run(기능, 모델, 사용자 세션, AI agent 실행 기록 추가) | schema mapping + attribution coverage(데이터 매핑과 비용 귀속 범위 확인) |
| 결정 후 결과 확인 | 지난 결정 효과 불명 | decision outcome review(지난 결정이 실제로 효과가 있었는지 검산) |

### 성공 기준

- 유료 Snapshot 고객 중 40% 이상이 30일 내 Monthly Review 또는 다음 분석 일정을 잡는다.
- 리포트의 70% 이상이 `adopt/reject/hold`(채택/거절/보류) 중 하나의 결정으로 끝난다.
- 리포트 수신자 중 50% 이상이 CEO/PM/Finance/RevOps(대표/제품/재무/매출 운영 담당) 중 1명 이상에게 공유한다.
- 유료 고객의 30% 이상이 expansion path(추가 기능/리뷰/연결/수신자 등으로 확장되는 경로)를 밟는다.
- 매월 리포트에서 "지난번과 달라진 것"이 최소 3개 이상 자동 산출된다.

### 추천 실험

- PDF-only vs Decision-loop A/B(PDF 다운로드만 강조하는 안과 결정 기록/다음 리뷰까지 연결하는 안을 비교).
- `Snapshot + 2회 Monthly Review` 번들 판매(1회 리포트와 2번의 후속 검산을 묶어 반복구매를 시험).
- Trigger-based 재접촉 memo(모델 가격 변화, heavy user 증가, cap 초과 같은 사건을 근거로 다시 분석을 제안하는 짧은 메모).
- report 마지막 장을 `가격정책 초안`으로 교체(단순 추천이 아니라 cap/credit/overage/plan boundary 변경안을 제시).
- 2주 후 decision outcome review(결정 직후 짧은 주기로 효과를 확인하는 후속 리뷰).

## 공통 성공 기준

1. 각 문제 영역마다 검증 질문, 성공 기준, 실험 설계가 존재한다(무엇을 물어보고, 무엇이 성공인지, 어떻게 확인할지 있어야 한다).
2. 성공 기준은 정성 문장이 아니라 숫자 또는 판정 가능한 조건을 가진다(예: "반응 좋음"이 아니라 "15명 중 5명이 자기 데이터 분석을 요청").
3. 리서치 결과는 WTP 인터뷰, UI/UX, pricing, onboarding, report flow에 바로 반영 가능하다(WTP는 지불 의향, onboarding은 고객 첫 세팅, report flow는 리포트 생성/공유 흐름).
4. 다음 문서인 PDCA 실행 계획에서 각 subagent 결과가 `Plan`, `Do`, `Check`, `Act` 항목으로 연결된다(조사에서 끝나지 않고 실행/측정/조정으로 이어져야 한다).
