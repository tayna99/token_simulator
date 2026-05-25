# Service MVP Learning Loop

이 템플릿은 각 리드와 리포트 전달 이후에 무엇을 배웠는지 기록한다. 목표는 "무엇을 만들까"보다 "어떤 리포트 서비스를 다시 팔 수 있는가"를 답하는 것이다.

## Lead

- Company:
- ICP grade:
- Industry:
- AI feature live: yes / no
- Monthly LLM/API cost band:

## Offer

- Offered package: AI Cost Snapshot / Data Readiness Check / sample only
- Offered price:
- Accepted price:
- Rejected reason:

## Intent Signals

- Data sharing intent: yes / conditional / no
- Report sharing intent: yes / conditional / no
- Price or limit decision intent: yes / conditional / no
- Repeat report request signal: monthly / quarterly / one_more_after_change / no

## Outcome

- Validation verdict: pass / conditional_pass / fail / invalid
- Strongest quote:
- Biggest blocker:
- Next artifact to improve:

## Classification Rules

| Signal | Classify as |
|---|---|
| 같은 리포트를 월간/분기로 받고 싶다고 말함 | service_repeat_request |
| 리포트 결과로 가격/limit 결정을 하겠다고 말함 | decision_report_pull |
| 대시보드, 알림, Slack, 팀 계정만 요구함 | broad_saas_feature_request |
| 데이터 export가 불가능하다고 말함 | data_readiness_blocker |
| raw prompt 분석을 기대함 | trust_mismatch |

## Weekly Review Prompts

- 이번 주 리드 중 A급은 몇 명인가.
- 유료 리포트 가격에 명시적으로 반응한 사람은 몇 명인가.
- 리포트를 팀에 공유하겠다고 말한 사람은 몇 명인가.
- 반복 리포트를 요청한 사람은 몇 명인가.
- SaaS 기능 요구만 있고 리포트 구매 의사가 없는 리드는 몇 명인가.
- 다음 주에 고칠 문서는 ICP, 데이터 요청, 오퍼, 리뷰콜 중 무엇인가.

## Weekly Summary

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
