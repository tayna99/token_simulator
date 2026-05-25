# AgentPayroll Unit Economics Risk Review (2026-05-26)

## 결론

AgentPayroll의 유닛 이코노믹스에서 가장 위험한 비용은 LLM API, Supabase, pgvector, 서버비가 아니라 **고객 획득과 신뢰 형성에 드는 사람 시간**이다. 제품 pain은 명확하다. AI SaaS 팀은 고객별, 기능별, 플랜별 AI 원가와 매출을 연결하지 못하면 누가 마진을 깨는지, 가격을 바꿔야 하는지, 어떤 결정을 남겨야 하는지 판단하기 어렵다.

하지만 현재 가격 사다리와 운영 방식이 그대로라면 `Data Readiness Check`는 유료 리드 선별 장치가 아니라 저마진 수작업으로 변질될 수 있고, `AI Cost Snapshot`은 SaaS 매출이 아니라 일회성 컨설팅 리포트로 끝날 수 있다. 따라서 초기 목표는 "많이 무료 진단하기"가 아니라 **A급 ICP만 빠르게 선별하고, Trust Gate로 데이터 불안을 낮추고, Snapshot을 Monthly Decision Review로 전환하는 것**이다.

## 근거 범위

로컬 근거:

- `PM.md`: AgentPayroll은 토큰 계산기가 아니라 AI SaaS 운영 의사결정 워크스페이스다.
- `docs/AgentCost_AI_Native_Front_Operating_System.md`: Free Fit Check, Data Readiness Check, AI Cost Snapshot, Monthly Review 가격 사다리.
- `docs/research/mvp-wtp-interview-guide.md`: WTP 인터뷰 대상, 강한 신호, 구매 거부 문장 코딩.
- `docs/PRD-current-state-2026-05-25.md`: Trust Gate first, one truth three lenses, PDF as value proof, Decision Log, billing execution deferred.

외부 근거:

- [ChartMogul AI churn wave](https://chartmogul.com/reports/saas-retention-the-ai-churn-wave/): 2025년 AI-native 회사는 retention이 약하고, 특히 저가/실험성 매출일수록 취소가 쉽다.
- [ChartMogul SaaS retention new normal](https://chartmogul.com/reports/saas-retention-the-new-normal/): 100%+ NRR 달성은 더 어려워졌고 retention이 성장의 핵심 레버다.
- [CloudZero SaaS unit economics guide](https://www.cloudzero.com/blog/saas-unit-economics/): SaaS unit economics의 핵심은 총 cloud bill이 아니라 customer, feature, API call, inference 단위 비용을 매출과 연결하는 것이다.
- [CloudZero inference cost guide](https://www.cloudzero.com/blog/inference-cost/): AI inference 비용은 high-cost/low-margin feature와 unprofitable customer를 숨기기 쉽다.
- [FinOps Foundation State of FinOps 2026](https://data.finops.org/): AI cost management는 FinOps의 최우선 역량으로 올라왔고, SaaS/AI/labor 비용까지 관리 범위가 넓어지고 있다.
- [6sense B2B Buyer Experience 2025](https://6sense.com/science-of-b2b/buyer-experience-report-2025/): AI 구매자는 모델 학습, 데이터 저장, privacy/security, 비용 설명을 더 일찍 요구한다.
- [Benchmarkit 2025 B2B SaaS metrics](https://www.benchmarkit.ai/_files/ugd/2a084b_1b2e8054260b44cba36242807d1c3eea.pdf): CAC payback, GRR, NRR, CLTV:CAC 등 SaaS 지표 정의를 기준으로 삼는다.

## 현재 가격 사다리와 경제성 가정

| 상품 | 가격 가설 | 역할 | 주요 위험 |
|---|---:|---|---|
| Free Fit Check | 무료 | ICP와 데이터 존재 여부 확인 | 무료 분석으로 번지면 CAC 폭발 |
| Data Readiness Check | 5만-15만 원 | 유료 선별 장치 | 1-2시간만 들어가도 마진 훼손 |
| AI Cost Snapshot | 30만-100만 원 | 핵심 유료 진단 | 일회성 리포트로 끝나면 LTV 낮음 |
| Monthly AI Cost Review | 월 30만-150만 원 | 반복 매출 | Decision Log가 약하면 retainer처럼 보임 |

핵심 공식:

```text
Report gross margin
= (price - human_ops_cost - variable_infra_cost - support_rework_cost) / price

CAC payback months
= CAC / monthly_gross_profit

Monthly gross profit
= monthly_price - recurring_analysis_ops_cost - support_security_followup_cost - variable_infra_cost
```

## 1. 매출 위험

가장 큰 매출 위험은 `AI Cost Snapshot`이 "한 번 예쁘게 받는 PDF"로 인식되는 것이다. 30만-100만 원 리포트는 컨설팅처럼 팔릴 수 있지만, Monthly Review로 전환되지 않으면 SaaS식 LTV가 생기지 않는다.

`AI Cost Snapshot`이라는 이름도 조심해야 한다. "비용 리포트"로 들리면 Helicone, Langfuse, OpenAI dashboard, SQL, spreadsheet와 비교된다. 더 강한 paid value는 `AI Margin Snapshot`, `Loss-Making Customer Review`, `AI Pricing Decision Pack`이다. 고객은 비용을 본 사실보다 "가격, cap, credit, plan boundary를 바꿀 근거가 생겼다"에 돈을 낸다.

위험 신호:

- 고객이 "비용은 궁금하지만 가격/마진 결정은 아직 없다"고 말한다.
- 보고서 공유 대상이 CEO, CFO, PM, RevOps 중 누구인지 불명확하다.
- 월 LLM/API 비용은 있지만 customer/feature/plan/revenue 매핑이 없다.
- 고객이 "한 번 받아보고 필요하면 다시 연락"이라고 말한다.

성공 기준:

- 15명 인터뷰 중 5명 이상이 "우리 데이터로 해보고 싶다"고 말한다.
- 3명 이상이 유료 파일럿, 예약금, 또는 명확한 예산 출처를 제시한다.
- Snapshot 고객의 40% 이상이 30일 안에 Monthly Review나 follow-up review를 예약한다.

## 2. 비용 위험

COGS의 핵심은 서버비가 아니라 사람 시간이다. 데이터 이해, 컬럼 매핑, Trust 설명, report QA, review call, follow-up이 붙으면 30만 원 상품은 금방 적자가 된다.

보수적 모델:

```text
Report COGS
= direct human hours * loaded hourly cost
+ LLM/API/inference
+ Supabase/server/storage
+ report/export/tooling
+ review-call/support/rework allowance
```

가드레일 예시:

| 상품 가격 | 목표 GM | 허용 COGS | loaded cost 8만 원/h 기준 허용 인력 시간 |
|---:|---:|---:|---:|
| 30만 원 | 60% | 12만 원 | 약 1.25h |
| 70만 원 | 60% | 28만 원 | 약 3.1h |
| 100만 원 | 60% | 40만 원 | 약 4.5h |
| 월 50만 원 | 65% | 17.5만 원 | 약 1.8h |

위험 신호:

- Data Readiness Check에 45분 이상 들어간다.
- Snapshot 하나에 5시간 이상 들어간다.
- Trust 질문이 매 고객마다 새로 생긴다.
- 리포트 QA에서 narrative claim을 사람이 대부분 다시 쓴다.

성공 기준:

- Free Fit Check는 사람 투입 10-15분 이하.
- Data Readiness Check는 사람 투입 45분 이하, gross margin 60% 이상.
- 첫 AI Cost Snapshot은 70만-100만 원 가격에서 사람 투입 3.5시간 이하.
- 반복 Monthly Review는 사람 투입 1.5시간 이하, gross margin 70% 이상.

## 3. 고객획득비용(CAC) 위험

CAC의 가장 큰 항목은 광고비가 아니라 신뢰 형성 시간이다. AgentPayroll은 usage log, revenue CSV, plan 정보처럼 민감한 데이터를 다루기 때문에 구매자는 "얼마나 아끼나?"와 동시에 "우리 데이터가 어디로 가나?"를 묻는다.

Trust Gate는 보안 기능이 아니라 conversion UX다. 업로드 직후 raw prompt, API key, PII, retention, allowed scope를 보여주는 것은 마찰이 아니라 구매 불안을 낮추는 핵심 장치다.

CAC risk model:

```text
CAC
= acquisition_cost
+ free_fit_check_minutes * operator_hourly_cost
+ trust_review_minutes * operator_hourly_cost
+ data_mapping_minutes * operator_hourly_cost
+ sales_review_minutes * operator_hourly_cost
+ security_artifact_cost
```

ICP 필터:

| 등급 | 조건 | 라우팅 |
|---|---|---|
| A | AI 기능 production, 월 LLM/API 비용 존재, raw prompt 없는 metadata export 가능, 고객/기능/플랜/매출 중 3개 이상 매핑 가능, pricing/margin decision owner 있음 | AI Cost Snapshot 또는 Monthly Review |
| B | AI 기능은 운영 중이나 schema/revenue mapping이 불완전, metadata-only 분석에는 열려 있음 | 유료 Data Readiness Check |
| C | 아이디어 단계, 비용 작음, 로그/매출 연결 없음, "나중에" 반응 | sample report, waitlist, 재접촉 |

성공 기준:

- Free Fit Check 완료 시간 10분 이하.
- Free Fit Check에서 paid readiness/snapshot 전환율 15-25% 이상.
- A급 리드의 첫 유료 전환까지 operator touch 2회 이하.
- 초기 paid CAC payback은 12개월 이하, 18개월 초과 시 ICP/가격/온보딩 재설계.

## 4. 유지율 위험

유지율은 "매월 같은 문제가 반복되는가"에 달려 있다. 비용이 한 번 보였다는 사실만으로 월구독은 유지되지 않는다. 유지되는 고객은 매월 모델 mix, usage, heavy user, pricing, cap, enterprise deal, margin policy가 변하는 팀이다.

Decision Log가 retention engine인 이유는 "운영 기억"을 만들기 때문이다. 다음 달 리뷰는 새 PDF가 아니라 지난달 `adopt/reject/hold`의 결과를 검산하고 다음 결정을 만드는 흐름이어야 한다.

Monthly Review 활성화 조건:

- Snapshot 완료.
- 최소 1개 이상의 `adopt/reject/hold` 결정.
- 다음 리뷰 날짜와 owner 지정.
- customer/feature/plan 중 최소 2개 축의 attribution 가능.
- CEO/PM/Finance에게 공유 가능한 persisted report artifact 생성.

위험 신호:

- Snapshot 후 14일 내 decision이 없다.
- report 공유 대상이 없다.
- 다음 리뷰 날짜가 없다.
- customer-level margin이 없다.
- 고객이 "필요할 때 다시 연락"이라고 말한다.

성공 기준:

- Snapshot 고객의 40% 이상이 Review Call에서 실제 decision을 기록한다.
- decision 기록 고객의 50% 이상이 다음 달 follow-up review를 예약한다.
- 첫 3개월 cohort 기준 Monthly Review GRR 90% 이상.
- Monthly Review 고객의 30% 이상이 workspace, connector, report recipient, pricing scenario 중 하나를 확장한다.

## 5. 반복구매 가능성 위험

PDF는 가치 증명물이지만 반복구매 이유는 아니다. 반복구매는 "지난번과 무엇이 달라졌는가"에서 나온다.

반복 트리거:

| 트리거 | 고객 신호 | AgentPayroll 액션 |
|---|---|---|
| 모델 가격/성능 변화 | provider 가격표, 신모델, cache/batch/context 정책 변경 | 지난 결정 재검토 + workload별 재시뮬레이션 |
| 고객 사용량 변화 | heavy user 증가, 특정 고객/플랜 margin 하락 | 손해 고객/기능 리포트 + cap/credit/overage 초안 |
| 가격정책 변경 | seat -> usage, credit, hybrid, fair-use cap 검토 | pricing scenario + rate card draft |
| 예산/cap 초과 | 월 budget, project cap, alert threshold 접근 | spend guardrail + next-month forecast |
| Board/CEO/CFO 보고 | 월간 운영회의, 투자자 업데이트 | persisted PDF + decision history diff |
| 데이터 구조 변화 | 새 feature/model/session/agent_run 추가 | schema mapping check + attribution coverage report |
| 결정 후 결과 확인 | 지난 adopt/reject/hold 효과 불명 | decision outcome review |

성공 기준:

- 유료 Snapshot 고객 중 40% 이상이 30일 내 Monthly Review 또는 다음 분석 일정을 잡는다.
- 리포트의 70% 이상이 `adopt/reject/hold` 중 하나로 끝난다.
- 리포트 수신자 중 50% 이상이 CEO/PM/Finance/RevOps 중 1명 이상에게 공유한다.
- 매월 리포트에서 "지난번과 달라진 것"이 최소 3개 이상 자동 산출된다.

## 위험한 부분 TOP 5

1. **ACV가 낮은데 신뢰 형성 비용이 높다.** 민감한 usage/revenue/log를 맡기는 제품이라 Trust 설명과 onboarding 시간이 커질 수 있다.
2. **저가 Data Readiness가 적자 리드 처리로 변질될 수 있다.** 5만-15만 원이면 자동화 없이는 돈을 벌기 어렵다.
3. **Snapshot이 일회성 컨설팅으로 끝날 수 있다.** Monthly Review로 전환되지 않으면 LTV가 낮다.
4. **고객의 LLM 비용 규모가 작으면 ROI 설명이 약하다.** 월 LLM/API 비용이나 매출 연결이 약한 팀은 30만-100만 원 리포트도 비싸게 느낀다.
5. **Trust Gate가 구매 장벽이자 운영 비용이다.** 잘 보여주면 전환율을 높이지만, 매번 수동 설명하면 CAC와 CS 비용이 커진다.

## 추천 방향

- Free Fit Check는 무료 컨설팅이 아니라 10분 이하 ICP 필터로 제한한다.
- Data Readiness Check는 유료 선별 장치로 유지하되 사람 투입 45분을 넘으면 가격 또는 범위를 조정한다.
- AI Cost Snapshot은 `AI Margin Snapshot` 또는 `AI Pricing Decision Pack`으로 메시지를 테스트하고 70만-150만 원 가격대를 검증한다.
- Monthly Review는 "월간 리포트 반복"이 아니라 "지난 결정의 효과 검산 + 새 손해 고객/기능 감시 + pricing policy 초안"으로 판다.
- 핵심 KPI는 `report당 사람 시간`, `Snapshot -> Monthly 전환율`, `월간 유지 개월 수`, `고객당 발견한 비용 누수액`, `누수액 대비 가격 비율`, `Trust 질문 왕복 횟수`다.

한 문장으로 줄이면: **AgentPayroll은 pain은 좋지만, 돈을 버는 구조는 리포트 자동화보다 ICP 선별, Trust 온보딩, Monthly Review 전환율에 달려 있다.**
