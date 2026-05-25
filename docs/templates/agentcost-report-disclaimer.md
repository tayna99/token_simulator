# AgentCost 리포트 고지 문구 템플릿

이 리포트는 제공받은 사용량 데이터, 검토일 기준으로 확인 가능한 provider price source(모델 제공자의 가격 근거), 리포트에 표시된 formula version(계산식 버전)을 바탕으로 작성되었습니다.

비용, 마진, 절감액 숫자는 제출된 snapshot(그 시점의 분석 데이터 묶음)에서 나온 deterministic calculation(결정적 계산)입니다. AI가 만든 문장은 해석 계층일 뿐이며, `tool:*`, `asset:*`, `risk:*`, `basis:*`, `evidence:*`, `decision:*` 같은 refs(근거 참조)를 함께 표시해야 합니다.

Model routing(요청을 어떤 모델로 보낼지 정하는 방식)이나 cheaper-model recommendation(더 저렴한 모델로 바꾸자는 제안)은 대표성 있는 품질 검증을 통과하기 전까지 what-if(가정 시나리오)입니다. AgentCost는 명시적인 human approval(사람 승인) 없이 billing(과금), pricing(가격 정책), routing(모델 라우팅), Slack, email, 외부 시스템을 변경하지 않습니다.
