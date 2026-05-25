# Service MVP 검증 원장

Pass(합격)는 반복 서비스 리포트 요청이 있을 때만 부여한다. 대시보드, 알림, 자동화, SaaS 계정 관리 요청은 제품 힌트로 기록하되 Service MVP Validation(서비스 형태의 최소 검증)의 Pass로 계산하지 않는다.

## 원장 컬럼

| 컬럼 | 의미 |
|---|---|
| lead_id | 리드 식별자 |
| icp_grade | A / B / C |
| offered_price_krw | 제안 가격 |
| accepted_price_krw | 수락 가격 |
| data_sharing_intent | yes / conditional / no |
| report_sharing_intent | yes / conditional / no |
| price_or_limit_decision_intent | yes / conditional / no |
| repeat_report_request_signal | monthly / quarterly / one_more_after_change / no |
| dominant_request_type | service_report / broad_saas_feature / data_readiness / sample_only |
| verdict | pass / conditional_pass / fail / invalid |

## 판정 규칙

| 판정 | 규칙 |
|---|---|
| pass | 반복 서비스 리포트를 요청했거나, 2개 이상의 ICP 적합 고객이 유료 리포트를 요청했다. |
| conditional_pass | 1개 고객이 유료 리포트를 구매하고 세 의도 중 2개 이상이 yes 또는 conditional이다. |
| fail | 넓은 SaaS 기능 요구만 있고 유료 리포트 또는 반복 분석 요청이 없다. |
| invalid | raw prompt, 개인정보, API key 제공을 전제로만 분석을 이해하거나 trust-safe export가 불가능하다. |

## 운영 주기

- 매 리드 통화 후 24시간 안에 원장 업데이트
- 매 유료 리포트 전달 후 리뷰콜 기록 연결
- 매주 금요일 Pass/Conditional Pass/Fail/Invalid 집계
- 3건 이상 같은 blocker가 반복되면 다음 주 문서 개선 Task로 승격

## 원장 템플릿

| lead_id | icp_grade | offered_price_krw | accepted_price_krw | data_sharing_intent | report_sharing_intent | price_or_limit_decision_intent | repeat_report_request_signal | dominant_request_type | verdict |
|---|---|---:|---:|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

## 주간 질문

- 돈을 내고 받은 리포트가 몇 건인가.
- 반복 리포트 요청은 몇 건인가.
- 리포트를 공유하겠다는 고객은 몇 건인가.
- 가격/limit 결정을 하겠다는 고객은 몇 건인가.
- 넓은 SaaS 기능 요구는 몇 건이며, 왜 검증 합격에서 제외했는가.
