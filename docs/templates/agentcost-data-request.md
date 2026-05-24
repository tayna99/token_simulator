# AgentCost Data Request Template

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
