# AgentCost Data Request Template

AgentPayroll은 기본 분석에서 raw prompt, 대화 원문, 개인정보, API key를 요청하지 않습니다. 가능한 경우 customer_id와 plan_id는 익명 key로 바꿔서 보내주세요.

Please send an anonymized usage export with metadata columns only.

Recommended columns:

- date or month
- customer or account id
- plan
- feature or workflow
- model
- provider
- session id
- agent run id
- task type or deliverable type
- input tokens
- output tokens
- request count
- retry count
- error count
- cache hit rate or cache eligible tokens
- human review count
- revenue or plan amount if available

Do not include raw prompts, raw completions, API keys, customer emails, phone numbers, or other PII. If a column is unavailable, leave it blank or mark it `missing`; AgentCost should not infer missing attribution.

## Safe Export Example

```csv
timestamp,customer_id,plan_id,feature,model,input_tokens,output_tokens,total_cost,status,retry_count
2026-05-01,cus_anon_001,pro,summary,gpt-5-mini,1200,350,0.048,success,0
```

## Do Not Send

아래처럼 raw prompt, 개인정보, API key가 섞인 export는 보내지 마세요.

```csv
email,real_name,prompt,api_key
customer@example.com,Kim Example,"Please summarize this contract...",sk-example-secret
```

## Analysis Limitations

일부 컬럼이 없어도 리포트는 만들 수 있습니다. 다만 없는 컬럼은 리포트의 제한 사항으로 표시되며, 고객별 손익·요금제별 마진·재시도 비용 같은 섹션은 비활성화될 수 있습니다.
