# AgentPayroll Review Call Script

이 리뷰콜의 목적은 리포트 설명이 아니라, 고객이 다음 세 문장을 실제로 말할 수 있는지 검증하는 것이다.

## Call Setup

- 리포트 소요 시간: 30분
- 시작 전에 확인할 것: 리포트 버전, 사용 데이터 범위, trust limitation, 계산 기준일
- 운영자 원칙: 숫자를 방어하려 하지 말고, 고객이 어떤 결정을 할 수 있는지 확인한다.

## Quote 1: 데이터 공유 의도

검증 문장:

```text
"raw prompt나 개인정보 없이도 이 정도 usage metadata는 공유할 수 있습니다."
```

확인 질문:

- 이 수준의 CSV를 실제로 export할 수 있나요?
- 익명 customer_id와 plan_id를 붙일 수 있나요?
- 내부 승인 없이 가능한가요, 아니면 보안/법무 확인이 필요한가요?

기록값:

- `data_sharing_intent`: yes / conditional / no
- `data_blocker`: 없음 / 컬럼 부족 / 보안 승인 / export 권한 / 기타
- 원문 반응:

## Quote 2: 리포트 공유 의도

검증 문장:

```text
"이 리포트는 팀 회의나 대표/재무/제품 의사결정에 공유할 수 있습니다."
```

확인 질문:

- 이 리포트를 누구에게 공유하겠습니까?
- 공유하려면 어떤 표현, 단위, 근거가 더 필요합니까?
- 1장 요약과 부록 중 어느 쪽이 의사결정에 더 중요합니까?

기록값:

- `report_sharing_intent`: yes / conditional / no
- `sharing_audience`: founder / finance / product / engineering / investor / board / other
- 원문 반응:

## Quote 3: 가격 또는 limit 결정 의도

검증 문장:

```text
"이 결과를 보고 가격, 사용량 제한, credit, overage, 모델 라우팅 중 하나를 결정하겠습니다."
```

확인 질문:

- 이번 리포트 이후 바꿀 가능성이 가장 큰 결정은 무엇입니까?
- 그 결정을 언제까지 해야 합니까?
- 결정을 못 하게 막는 추가 근거는 무엇입니까?

기록값:

- `price_or_limit_decision_intent`: yes / conditional / no
- `decision_type`: pricing / usage_limit / credit / overage / model_routing / no_decision
- `decision_deadline`: 날짜 또는 기간
- 원문 반응:

## Repeat Report Question

마지막 질문:

```text
이 리포트를 월간 또는 분기별로 반복해서 보면 의사결정에 도움이 됩니까? 도움이 된다면 다음 회차에서 같은 지표를 유지해야 합니까, 아니면 다른 지표가 필요합니까?
```

기록값:

- `repeat_report_request_signal`: monthly / quarterly / one_more_after_change / no
- `requested_next_report_scope`: same_metrics / new_segment / pricing_change_followup / data_readiness_followup
- 원문 반응:

## Acceptance Check

리뷰콜 기록은 세 quote의 원문 반응을 짧게 보존해야 한다. 합격 신호는 "기능이 있으면 좋겠다"가 아니라 "이 리포트를 다시 받고 싶다" 또는 "이 리포트로 결정을 하겠다"다.
