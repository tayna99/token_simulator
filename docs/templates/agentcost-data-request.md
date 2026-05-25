# AgentCost 데이터 요청 템플릿

AgentPayroll은 기본 분석에서 raw prompt(원문 프롬프트), 대화 원문, 개인정보, API key를 요청하지 않습니다. 가능하면 `customer_id`와 `plan_id`는 익명 key(실제 고객을 바로 알 수 없게 바꾼 식별자)로 바꿔서 보내주세요.

metadata column(분석에 필요한 설명용 컬럼)만 포함한 anonymized usage export(익명화된 사용량 내보내기)를 보내주세요.

권장 컬럼:

- date 또는 month: 날짜 또는 월
- customer 또는 account id: 고객/계정 식별자
- plan: 요금제
- feature 또는 workflow: 기능 또는 업무 흐름
- model: 사용 모델
- provider: 모델 제공자
- session id: 사용 세션 식별자
- agent run id: 에이전트 실행 식별자
- task type 또는 deliverable type: 작업 유형 또는 산출물 유형
- input tokens: 입력 토큰
- output tokens: 출력 토큰
- request count: 요청 수
- retry count: 재시도 수
- error count: 오류 수
- cache hit rate 또는 cache eligible tokens: 캐시 적중률 또는 캐시 적용 가능 토큰
- human review count: 사람 검토 횟수
- revenue 또는 plan amount if available: 가능하면 고객 매출 또는 요금제 금액

raw prompts(원문 프롬프트), raw completions(모델 원문 응답), API keys, 고객 이메일, 전화번호, 기타 PII(Personally Identifiable Information, 개인을 식별할 수 있는 정보)는 포함하지 마세요. 사용할 수 없는 컬럼은 빈칸으로 두거나 `missing`으로 표시하세요. AgentCost는 빠진 attribution(비용을 고객/기능/요금제에 연결하는 정보)을 임의로 추론하지 않습니다.

## 안전한 내보내기 예시

```csv
timestamp,customer_id,plan_id,feature,model,input_tokens,output_tokens,total_cost,status,retry_count
2026-05-01,cus_anon_001,pro,summary,gpt-5-mini,1200,350,0.048,success,0
```

## 보내면 안 되는 예시

아래처럼 raw prompt, 개인정보, API key가 섞인 export(내보내기 파일)는 보내지 마세요.

```csv
email,real_name,prompt,api_key
customer@example.com,Kim Example,"Please summarize this contract...",sk-example-secret
```

## 분석 제한 사항

일부 컬럼이 없어도 리포트는 만들 수 있습니다. 다만 없는 컬럼은 리포트의 제한 사항으로 표시되며, 고객별 손익, 요금제별 마진, 재시도 비용 같은 섹션은 비활성화될 수 있습니다.
