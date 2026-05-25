# AgentPayroll 데이터 준비 체크리스트

이 체크리스트는 고객이 raw prompt(원문 프롬프트), 개인정보, API key 없이 공유할 수 있는 usage metadata(사용량 메타데이터)로 어떤 리포트 섹션을 만들 수 있는지 판단합니다.

## 받을 수 있는 데이터

- [ ] timestamp: 요청 시각
- [ ] customer_id 또는 익명 customer_key: 고객 식별자
- [ ] plan_id 또는 plan_name: 요금제 식별자
- [ ] feature: AI 기능
- [ ] model: 사용 모델
- [ ] input_tokens: 입력 토큰
- [ ] output_tokens: 출력 토큰
- [ ] total_cost 또는 provider_cost: 모델 제공자 기준 원가
- [ ] status: 성공/실패 상태
- [ ] retry_count: 재시도 횟수
- [ ] revenue 또는 plan_price: 고객 매출 또는 요금제 가격

## 받지 않는 데이터

- raw prompt: 원문 프롬프트
- 대화 원문
- 이메일
- 전화번호
- 실명
- API key
- access token(접근 토큰)
- secret key(비밀 키)
- 고객 계약서 원문

## 분석 가능 범위

| 있는 데이터 | 활성화되는 리포트 섹션 |
|---|---|
| feature + cost | 기능별 AI 원가 |
| customer_id + cost | 고객별 AI 원가 |
| plan_id + revenue + cost | 요금제별 gross margin(매출총이익률) |
| model + token/cost | 모델별 비용 구조 |
| status + retry_count | 실패/재시도 비용 |

## 막히는 범위

| 빠진 데이터 | 리포트 제한 |
|---|---|
| customer_id 없음 | 고객별 손익 판단 불가 |
| plan_id 없음 | 요금제별 마진 판단 불가 |
| revenue 없음 | 손해 고객 또는 손해 플랜 판단 제한 |
| feature 없음 | 기능별 비용 우선순위 판단 제한 |
| retry_count 없음 | 재시도 비용 절감안 판단 제한 |

## 고객 의도 기록

- 데이터 공유 의도: 예 / 아니오 / 조건부
- 공유 가능한 파일 형태: CSV / JSONL / 집계표 / 화면 공유만 가능
- 리포트 공유 대상: 대표 / 재무 / 제품 / 엔지니어링 / 투자자 / 기타
- 가격 또는 limit(사용량 제한) 결정 예정일:
- 반복 리포트 관심: 월간 / 분기 / 없음

## 준비도 판정

| 판정 | 기준 | 다음 행동 |
|---|---|---|
| Snapshot ready(분석 데이터 묶음 준비됨) | 필수 usage metadata와 revenue 또는 plan price가 있다 | `AI Cost Snapshot` 제안 |
| Mapping needed(매핑 확인 필요) | usage metadata는 있으나 customer_id, plan_id, revenue 중 일부가 없다 | Data Readiness Check 또는 preview 리포트 |
| Trust blocked(신뢰 단계에서 차단됨) | raw prompt, 개인정보, API key, secret이 섞여 있다 | 정제된 export를 다시 요청 |
| Not ready(준비 전) | 비용/토큰/feature 기준이 없다 | 샘플 리포트와 export template 공유 |
