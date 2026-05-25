# Service MVP 학습 루프

이 템플릿은 각 리드(잠재 고객)와 리포트 전달 이후에 무엇을 배웠는지 기록합니다. 목표는 “무엇을 만들까”보다 “어떤 리포트 서비스를 다시 팔 수 있는가”를 답하는 것입니다.

## 리드

- Company(회사):
- ICP grade(이상적인 고객군 등급):
- Industry(산업):
- AI feature live(운영 중인 AI 기능 여부): yes / no
- Monthly LLM/API cost band(월 LLM/API 비용 구간):

## 제안

- Offered package(제안 패키지): AI Cost Snapshot / Data Readiness Check / sample only
- Offered price(제안 가격):
- Accepted price(수락 가격):
- Rejected reason(거절 이유):

## 의도 신호

- Data sharing intent(데이터 공유 의도): yes / conditional / no
- Report sharing intent(리포트 공유 의도): yes / conditional / no
- Price or limit decision intent(가격 또는 사용량 제한 결정 의도): yes / conditional / no
- Repeat report request signal(반복 리포트 요청 신호): monthly / quarterly / one_more_after_change / no

## 결과

- Validation verdict(검증 판정): pass / conditional_pass / fail / invalid
- Strongest quote(가장 강한 고객 원문):
- Biggest blocker(가장 큰 장애물):
- Next artifact to improve(다음에 개선할 결과물):

## 분류 규칙

| 신호 | 분류 |
|---|---|
| 같은 리포트를 월간/분기로 받고 싶다고 말함 | service_repeat_request |
| 리포트 결과로 가격/limit 결정을 하겠다고 말함 | decision_report_pull |
| 대시보드, 알림, Slack, 팀 계정만 요구함 | broad_saas_feature_request |
| 데이터 export가 불가능하다고 말함 | data_readiness_blocker |
| raw prompt 분석을 기대함 | trust_mismatch |

## 주간 리뷰 질문

- 이번 주 리드 중 A급은 몇 명인가.
- 유료 리포트 가격에 명시적으로 반응한 사람은 몇 명인가.
- 리포트를 팀에 공유하겠다고 말한 사람은 몇 명인가.
- 반복 리포트를 요청한 사람은 몇 명인가.
- SaaS 기능 요구만 있고 리포트 구매 의사가 없는 리드는 몇 명인가.
- 다음 주에 고칠 문서는 ICP(이상적인 고객군), 데이터 요청, 오퍼, 리뷰콜 중 무엇인가.

## 주간 요약

```text
week:
qualified_a_leads:
paid_report_price_reactions:
report_sharing_yes:
repeat_report_requests:
broad_saas_feature_only:
top_data_blocker:
top_trust_blocker:
next_artifact_to_improve:
```
