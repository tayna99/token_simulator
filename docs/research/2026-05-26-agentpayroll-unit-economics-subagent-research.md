# AgentPayroll Unit Economics Subagent Research (2026-05-26)

이 문서는 유닛 이코노믹스의 다섯 문제를 각각 별도 서브에이전트가 조사한 1차 결과를 적재한다. 목적은 "좋아 보이는 사업"이 아니라 **어떤 가정이 깨지면 돈을 못 버는지**를 분해하고, 후속 PDCA 실행의 성공 기준을 명확히 만드는 것이다.

## Subagent 1. 매출/WTP 위험

### 조사 질문

- 고객은 AgentPayroll에 왜 돈을 내는가?
- `AI Cost Snapshot`은 얼마까지 받을 수 있는가?
- 일회성 리포트에서 Monthly Review로 넘어가는 구매 이유는 무엇인가?
- 관측/로그 도구와 비교될 때 WTP가 낮아지는 지점은 어디인가?

### 1차 발견

1. 돈 내는 이유는 "토큰 절감"이 아니라 가격과 마진 결정이다.
2. usage-based, credit, hybrid pricing으로 시장이 움직이는 것은 AgentPayroll의 pricing decision pack 포지션을 강화한다.
3. 일회성 리포트는 팔릴 수 있지만 SaaS 반복 매출로는 약하다.
4. `AI Cost Snapshot`은 비용 리포트처럼 들리므로 `AI Margin Snapshot`, `Loss-Making Customer Review`, `AI Pricing Decision Pack` 이름을 테스트해야 한다.
5. Helicone, Langfuse, Arize 같은 관측 도구와 경쟁하면 WTP가 낮아진다. AgentPayroll은 "로그 대시보드"가 아니라 "CEO/PM/Finance가 승인할 결정 패키지"여야 한다.

### 위험한 가정

- 고객이 실제로 월 LLM/API 비용을 아프게 느낀다.
- 고객이 usage log를 고객/기능/플랜/매출과 연결할 수 있다.
- 구매자가 개발자가 아니라 founder/CEO/Finance/PM이다.
- Monthly Review가 매월 새로운 결정을 만든다.
- Data Readiness 5만-15만 원이 유료 선별 장치로 작동하면서도 운영 시간을 잡아먹지 않는다.

### 검증 질문

- 최근 3개월 안에 AI 비용 때문에 가격, 플랜, 사용량 제한, 모델 변경을 논의한 적이 있는가?
- 월 LLM/API 비용은 얼마이고 매출 대비 몇 퍼센트인가?
- 고객별/기능별/플랜별 AI 원가를 지금 볼 수 있는가?
- 이 숫자가 없어서 늦어진 결정은 무엇인가?
- 이 리포트를 받으면 누구에게 공유하는가?
- 1회 리포트 후 다음 달에도 다시 보고 싶은 변화 지표는 무엇인가?

### 성공 기준

- 15명 인터뷰 완료: founder/CEO/PM 5명, dev/infra 5명, finance/ops/revops 5명.
- 각 인터뷰에 `monthly_llm_cost`, `current_workaround`, `decision_delayed`, `buyer`, `wtp_signal`, `objection_tags`가 기록된다.
- 최소 5명이 "우리 데이터로 해보고 싶다"고 말한다.
- 최소 3명이 유료 파일럿 또는 예약금에 동의한다.
- 가격 사다리별 전환 기준이 정의된다.

### 추천 실험

- 이름 A/B: `AI Cost Snapshot` vs `AI Margin Snapshot` vs `Loss-Making Customer Review`.
- 유료 선별: Free Fit Check 이후 `Data Readiness Check 9만 원` 제안.
- 예약금: `AI Margin Snapshot 50만 원`에 10만 원 예약금 요청.
- Monthly Review 선판매: Snapshot 끝에 `월 49만 원` follow-up 제안.

## Subagent 2. 비용/COGS/서비스 제공 시간 위험

### 조사 질문

- 리포트 하나를 만드는 데 사람 시간이 얼마나 들어가면 적자인가?
- LLM/Supabase/server 비용보다 큰 COGS는 무엇인가?
- 어느 작업을 먼저 자동화해야 gross margin이 방어되는가?

### 1차 발견

1. 초기 COGS 리스크는 LLM/Supabase가 아니라 리포트 생산 노동이다.
2. SaaS gross margin과 professional services margin의 벤치마크가 다르므로 "리포트 대행"으로 보이면 경제성이 낮다.
3. AI-native gross margin 압박은 주로 inference/cloud 이야기지만, AgentPayroll은 여기에 사람 검수 시간이 추가된다.
4. 30만 원 Snapshot은 full custom report 가격이 아니다.
5. 자동화 우선순위는 모델 비용 최적화보다 반복 설명, schema mapping, report QA 제거다.

### 단위 원가 모델

```text
Report COGS
= direct human hours * loaded hourly cost
+ LLM/API/inference
+ Supabase/server/storage
+ report/export/tooling
+ review-call/support/rework allowance
```

| 단계 | Green | Yellow | Red |
|---|---:|---:|---:|
| Intake / fit check | 0.15h | 0.5h | 1h+ |
| Data readiness / schema 이해 | 0.5h | 1.5h | 3h+ |
| Column mapping / QA | 0.5h | 1.5h | 3h+ |
| Trust 설명 / 보안 질문 | 0.25h | 1h | 2h+ |
| Report draft / 검수 | 1h | 2h | 4h+ |
| Review call / follow-up | 0.5h | 1h | 2h+ |

### 성공 기준

- Fit Check: 사람 투입 15분 이하.
- Data Readiness Check: 사람 투입 45분 이하, gross margin 60% 이상.
- 첫 AI Cost Snapshot: 70만-100만 원 가격에서 사람 투입 3.5시간 이하, gross margin 60% 이상.
- 반복 Monthly Review: 사람 투입 1.5시간 이하, gross margin 70% 이상.
- 세 번째 유사 고객부터 컬럼 80% 이상 자동 매핑.
- Trust 설명 추가 시간이 고객당 20분 이하.

### 추천 실험

- 3개 messy CSV time-and-motion 실험.
- 가격 사다리 WTP 테스트: 30만/70만/150만 원.
- Data Readiness Gate self-assessment 유무에 따른 사람 시간 비교.
- Report QA checklist로 사람이 수정한 항목 태깅.

## Subagent 3. CAC/신뢰 형성/온보딩 위험

### 조사 질문

- Trust Gate는 CAC를 낮추는가, 높이는가?
- Free Fit Check가 나쁜 리드를 얼마나 걸러야 하는가?
- A/B/C ICP를 어떤 기준으로 나눌 것인가?

### 1차 발견

1. 가장 큰 CAC 리스크는 마케팅 비용보다 신뢰 형성 시간이다.
2. Trust Gate는 보안 기능이 아니라 conversion UX다.
3. Free Fit Check는 리드 생성물이 아니라 리드 필터여야 한다.
4. ICP는 spend보다 "결정 가능성"으로 잘라야 한다.
5. 목표 payback은 낮게 잡아야 하며, 보안/데이터 온보딩 비용을 CAC에 포함해야 한다.

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

### ICP 필터

| 등급 | 기준 | 다음 액션 |
|---|---|---|
| A | AI 기능 production, 월 LLM/API 비용 10만 원 이상, raw prompt 없는 metadata export 가능, customer/feature/plan/revenue/retry 중 3개 이상, decision owner 있음 | Snapshot 또는 Monthly Review |
| B | AI 기능 운영 중이나 데이터 정리 부족, revenue 또는 plan 연결 누락, metadata-only 분석에 열려 있음 | Data Readiness Check |
| C | 아이디어 단계, 비용 작음, 로그/매출 연결 없음 | sample report, waitlist |

### 성공 기준

- Free Fit Check 완료 시간 10분 이하.
- Free Fit Check -> paid readiness/snapshot 전환율 15-25% 이상.
- Trust Gate 이탈 사유 중 "데이터 불안" 태그가 2주 단위로 감소.
- A급 리드의 첫 유료 전환까지 operator touch 2회 이하.
- 초기 paid CAC payback 12개월 이하, 18개월 초과 시 재설계.

### 추천 실험

- Trust Gate A/B: 업로드 전 설명 vs 업로드 직후 설명.
- Free Fit Check strict cap: 10분 초과 리드는 paid readiness로 전환.
- ICP scoring form: `LLM spend`, `usage log`, `revenue link`, `decision urgency`, `raw prompt-free export`.
- Trust Pack: data flow, no-training, retention/delete, PII mapping, blocked columns self-serve 제공.

## Subagent 4. 유지율/Monthly Review 위험

### 조사 질문

- Snapshot 이후 왜 매월 다시 사야 하는가?
- 어떤 고객이 Monthly Review에 적합한가?
- Decision Log는 retention engine으로 작동할 수 있는가?

### 1차 발견

1. Snapshot은 paid acquisition 상품이고 Monthly Review는 retention 상품이다.
2. Decision Log는 "운영 기억"을 만들기 때문에 retention engine이 될 수 있다.
3. 월구독에 적합한 고객은 비용이 큰 고객이 아니라 반복 의사결정이 있는 고객이다.
4. GRR/NRR 기준은 AgentPayroll 자신의 retention뿐 아니라 고객에게 팔 메시지도 된다.
5. 가장 큰 위험은 Monthly Review가 recurring workflow가 아니라 consulting retainer처럼 보이는 것이다.

### Retention model

```text
Free Fit Check
-> Data Readiness Check
-> AI Cost Snapshot
-> Review Call
-> Decision Log(adopt/reject/hold)
-> 30일 후 Outcome Review
-> Monthly AI Cost Review
-> Expansion: more workspaces / connectors / report seats / pricing scenarios
```

### 성공 기준

- Snapshot 고객의 40% 이상이 Review Call에서 실제 decision을 기록한다.
- decision 기록 고객의 50% 이상이 다음 달 follow-up review를 예약한다.
- 첫 3개월 cohort 기준 Monthly Review GRR 90% 이상.
- Monthly Review 고객의 30% 이상이 workspace, connector, report recipient, pricing scenario 중 하나를 추가한다.
- 매월 리뷰에서 최소 1개 이상 지난 decision outcome이 검산된다.

### 추천 실험

- Decision-before-report gate.
- 30-day Outcome Review 번들.
- ICP scoring과 Monthly Review 전환율 비교.
- Monthly Review vs Quarterly Review 패키지 테스트.
- "월간 비용 리포트"가 아니라 "지난 결정 검산" copy 테스트.

## Subagent 5. 반복구매/확장 가능성 위험

### 조사 질문

- PDF 리포트는 반복구매 이유가 될 수 있는가?
- 어떤 이벤트가 재구매 트리거가 되는가?
- expansion은 어디에서 생기는가?

### 1차 발견

1. PDF 리포트만 팔면 단발 컨설팅으로 끝난다.
2. 반복구매의 진짜 트리거는 외부 가격표보다 고객 내부 사용량 변화다.
3. AI SaaS pricing은 정적 가격표가 아니라 운영 정책이 되고 있다.
4. 모델 가격 변화만으로는 부족하고, 실제 workload의 per-request cost/quality drift가 반복 분석 이유다.
5. 확장 경로는 관측성 도구가 아니라 운영 결재 루프에 있다.

### 반복구매 트리거

| 트리거 | 고객 신호 | AgentPayroll 액션 |
|---|---|---|
| 모델 가격/성능 변화 | provider 가격표, 신모델, cache/batch/context 변경 | 지난 결정 재검토 + 재시뮬레이션 |
| 고객 사용량 변화 | heavy user 증가, 특정 고객/플랜 margin 하락 | 손해 고객/기능 리포트 + cap/credit/overage 초안 |
| 가격정책 변경 | seat -> usage, credit, hybrid 검토 | pricing scenario + rate card draft |
| 예산/cap 초과 | 월 budget, cap, alert 접근 | spend guardrail + forecast |
| Board/CEO/CFO 보고 | 월간 운영회의, 투자자 업데이트 | persisted PDF + decision history diff |
| 데이터 구조 변화 | 새 feature/model/session/agent_run | schema mapping + attribution coverage |
| 결정 후 결과 확인 | 지난 결정 효과 불명 | decision outcome review |

### 성공 기준

- 유료 Snapshot 고객 중 40% 이상이 30일 내 Monthly Review 또는 다음 분석 일정을 잡는다.
- 리포트의 70% 이상이 `adopt/reject/hold` 중 하나의 결정으로 끝난다.
- 리포트 수신자 중 50% 이상이 CEO/PM/Finance/RevOps 중 1명 이상에게 공유한다.
- 유료 고객의 30% 이상이 expansion path를 밟는다.
- 매월 리포트에서 "지난번과 달라진 것"이 최소 3개 이상 자동 산출된다.

### 추천 실험

- PDF-only vs Decision-loop A/B.
- `Snapshot + 2회 Monthly Review` 번들 판매.
- Trigger-based 재접촉 memo.
- report 마지막 장을 `가격정책 초안`으로 교체.
- 2주 후 decision outcome review.

## 공통 성공 기준

1. 각 문제 영역마다 검증 질문, 성공 기준, 실험 설계가 존재한다.
2. 성공 기준은 정성 문장이 아니라 숫자 또는 판정 가능한 조건을 가진다.
3. 리서치 결과는 WTP 인터뷰, UI/UX, pricing, onboarding, report flow에 바로 반영 가능하다.
4. 다음 문서인 PDCA 실행 계획에서 각 subagent 결과가 `Plan`, `Do`, `Check`, `Act` 항목으로 연결된다.
