# AgentPayroll ICP Scorecard

이 점수표의 목적은 AgentPayroll을 넓은 SaaS 기능 관심사로 검증하는 것이 아니라, 고객이 `AI Cost Snapshot 30만~100만 원` 유료 리포트를 실제로 요청할 가능성이 있는지 판별하는 것이다.

## 사용 원칙

- A급 판정은 영업 우선순위가 아니라 유료 리포트 검증 우선순위다.
- "대시보드가 있으면 써보겠다"는 제품 관심 신호일 수 있지만, Service MVP 검증의 합격 신호는 아니다.
- raw prompt, 개인정보, API key 제공을 전제로만 분석을 이해하는 리드는 Trust mismatch로 분리한다.
- 각 리드는 점수와 별도로 데이터 공유 의도, 리포트 공유 의도, 가격/limit 결정 의도, 반복 리포트 요청 신호를 반드시 기록한다.

## Scoring Fields

| Field | Strong signal | Weak signal | Score |
|---|---|---|---:|
| 실제 AI 기능 운영 | 외부 고객이 쓰는 AI 기능이 운영 중 | 내부 실험 또는 아이디어 단계 | 0-2 |
| 월 LLM/API 비용 | 월 30만 원 이상 또는 비용 증가 중 | 월 비용을 모름 | 0-2 |
| usage metadata 보유 | customer_id, plan_id, feature, model, token/cost 중 4개 이상 보유 | raw prompt만 있거나 export 불가 | 0-2 |
| 의사결정 압박 | 가격, limit, credit, margin 중 하나를 이번 달 결정해야 함 | 단순 관심 또는 벤치마크 탐색 | 0-2 |
| 리포트 공유 대상 | 대표, 재무, 제품, 투자자/이사회 중 공유 대상이 있음 | 개인 학습용 | 0-2 |

## Grade Rule

| Grade | Score | Next action |
|---|---:|---|
| A | 8-10 | `AI Cost Snapshot 30만~100만 원` 제안 |
| B | 5-7 | Data Readiness Check 또는 축소 리포트 제안 |
| C | 0-4 | 샘플 리포트 공유, 유료 검증 대상에서 제외 |

## Disqualification Guardrails

다음 조건 중 하나라도 있으면 A급으로 올리지 않는다.

- raw prompt 분석을 기본으로 요구한다.
- 개인정보 또는 API key 제거가 어렵다고 말한다.
- "대시보드가 있으면 써보겠다"만 있고 유료 리포트 구매 의사가 없다.
- 가격, limit, credit, 모델 라우팅, gross margin 중 어떤 결정에도 연결되지 않는다.
- 월 비용이 매우 작고 대표/재무/제품 의사결정 압박이 없다.

## Lead Record

```text
lead_id:
company:
date:
persona:
ai_feature_live: yes / no
monthly_llm_api_cost_band:
usage_metadata_available:
decision_pressure:
report_sharing_target:
score:
grade: A / B / C
next_action:
data_sharing_intent: yes / conditional / no
report_sharing_intent: yes / conditional / no
price_or_limit_decision_intent: yes / conditional / no
repeat_report_request_signal: monthly / quarterly / one_more_after_change / no
disqualification_guardrail_hit:
strongest_quote:
notes:
```

## Acceptance Check

각 리드 기록에는 `data_sharing_intent`, `report_sharing_intent`, `price_or_limit_decision_intent`, `repeat_report_request_signal` 네 항목이 반드시 들어간다.
