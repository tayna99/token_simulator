# AgentPayroll RAG Corpus Design (2026-05-25)

## Authority Boundary

RAG corpus chunks are evidence, not numeric authority. They can explain where a recommendation came from, but they must not override accepted facts or deterministic calculator outputs. Displayed cost, margin, token, and rate-card numbers still flow through `src/lib/calculator.ts` and `src/lib/format.ts`.

## Corpus Families

- C1 `official_source`: official pricing/docs and provider announcements. Big3 pricing sources are registered through `openai-api-pricing`, `anthropic-claude-pricing`, and `google-gemini-pricing`.
- C2 `model_benchmark`: third-party or official model-card quality/latency evidence. Missing peer baseline remains `baseline_unavailable`; manual-review sources surface as `needs_review`.
- C3 `serving_economics`: self-hosted serving economics such as vLLM TTFT, TPOT, throughput, GPU utilization, KV cache, prefix cache, and batching. Provider API price authority is excluded.
- C4 `usage_schema`: usage-log schema evidence for customer, feature, model, plan, session, agent run, input token, and output token dimensions.
- C9 `decision_history`: tenant-scoped internal decisions, risks, operating ledger rows, and report snapshots.

## Production Path

Production demo evidence must come from Supabase `rag_chunks` and pgvector search. Request body chunks are preview-only fixtures and cannot make a production screen look connected. `CorpusReadinessReport` is the operator-facing status model for source count, parser status, review warnings, and freshness.

## Trust And Billing

Usage intake must pass the Trust Gate before it can create snapshots, decision-history corpus rows, or report artifacts. Rate-card billing pushes require connector config, human approval, idempotency, rollback metadata, and a ledger row before execution can be marked ready.
