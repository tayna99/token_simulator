# AgentPayroll Data Readiness Checklist

이 체크리스트는 고객이 raw prompt, 개인정보, API key 없이 공유할 수 있는 usage metadata로 어떤 리포트 섹션을 만들 수 있는지 판단한다.

## 받을 수 있는 데이터

- [ ] timestamp
- [ ] customer_id 또는 익명 customer_key
- [ ] plan_id 또는 plan_name
- [ ] feature
- [ ] model
- [ ] input_tokens
- [ ] output_tokens
- [ ] total_cost 또는 provider_cost
- [ ] status
- [ ] retry_count
- [ ] revenue 또는 plan_price

## 받지 않는 데이터

- raw prompt
- 대화 원문
- 이메일
- 전화번호
- 실명
- API key
- access token
- secret key
- 고객 계약서 원문

## 분석 가능 범위

| Data present | Report section enabled |
|---|---|
| feature + cost | 기능별 AI 원가 |
| customer_id + cost | 고객별 AI 원가 |
| plan_id + revenue + cost | 요금제별 gross margin |
| model + token/cost | 모델별 비용 구조 |
| status + retry_count | 실패/재시도 비용 |

## 막히는 범위

| Missing data | Report limitation |
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
- 가격 또는 limit 결정 예정일:
- 반복 리포트 관심: 월간 / 분기 / 없음

## Readiness Verdict

| Verdict | Criteria | Next action |
|---|---|---|
| Snapshot ready | 필수 usage metadata와 revenue 또는 plan price가 있다 | `AI Cost Snapshot` 제안 |
| Mapping needed | usage metadata는 있으나 customer_id, plan_id, revenue 중 일부가 없다 | Data Readiness Check 또는 preview 리포트 |
| Trust blocked | raw prompt, 개인정보, API key, secret이 섞여 있다 | 정제된 export를 다시 요청 |
| Not ready | 비용/토큰/feature 기준이 없다 | 샘플 리포트와 export template 공유 |
