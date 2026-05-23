# Metrics & Thresholds

AgentPayroll separates facts from judgments.

- **Fact Ledger**: provider/model facts such as token price, cache discount, batch discount, context window, source URL, and `lastVerifiedAt`.
- **Judgment Ledger**: product judgments such as loss, thin margin, waste, bottleneck, and risk. Every judgment must cite one of three basis types: `rule`, `self_baseline`, or `peer_benchmark`.

Official API documents can justify price and model facts. They do not justify whether a workload is wasteful or risky.

## P0 Threshold Policy

| ID | Default | Basis | Confidence | Adjustable | Meaning |
|---|---:|---|---|---|---|
| `gross_margin_loss_usd` | `0` | `rule` | high | yes | Gross margin below zero dollars is a loss. |
| `gross_margin_thin_pct` | `0.4` | `rule` | high | yes | Gross margin below 40% is thin by default. |
| `retry_rate_pct` | `0.1` | `rule` | high | yes | Retry rate above 10% can inflate effective cost. |
| `cache_hit_low_pct` | `0.5` | `rule` | high | yes | Reused large inputs below 50% cache hit are cache-miss candidates. |
| `large_reused_input_tokens` | `5000` | `rule` | high | yes | Reused input artifacts above this size should be checked for caching. |
| `top_agent_concentration_pct` | `0.4` | `rule` | medium | yes | One agent at or above 40% of AI team cost is a concentration bottleneck. |
| `top_agent_concentration_high_pct` | `0.45` | `rule` | medium | yes | One agent at or above 45% is a high-severity concentration. |
| `agent_loop_depth_count` | `4` | `rule` | medium | yes | Calls per run at or above 4 may indicate an agent loop bottleneck. |
| `agent_loop_depth_high_count` | `5` | `rule` | medium | yes | Calls per run at or above 5 is high severity. |
| `output_heavy_input_ratio` | `0.8` | `self_baseline` | medium | yes | Output tokens above 80% of input tokens may indicate oversized responses. |
| `output_heavy_min_tokens` | `2000` | `self_baseline` | medium | yes | Output-heavy findings require enough absolute output volume. |
| `human_review_monthly_runs` | `20` | `rule` | medium | yes | All-item review above this monthly run count may bottleneck operations. |
| `stale_fact_source_days` | `30` | `rule` | high | yes | Official pricing/spec facts should be re-verified after 30 days. |

## Required UI Behavior

- Thresholds must be visible as policy values, not hidden constants.
- User overrides become the current workspace policy.
- Every flag must show a basis label such as `rule:gross_margin_thin_pct`, `self_baseline:output_heavy_input_ratio`, or `peer_benchmark:similar_team_frequency`.
- If a peer benchmark corpus is insufficient, the UI must say `No baseline` or `Assumption-based`; it must not invent an average.
- Quality-dependent recommendations must be framed as what-if recommendations, not definitive waste.

## Decision Log Snapshot

Every decision should preserve:

- `thresholdSnapshot`: the policy values used at decision time.
- `factSourceSnapshot`: official model/provider fact sources and freshness status.
- `aiMode`: `llm_assisted`, `deterministic_fallback`, or `unknown`.

This makes old decisions explainable even after thresholds or provider prices change.

## P1 Serving Economics

Self-hosted GPU/vLLM optimization is a P1 module and must not be mixed with P0 provider API cost math.

P1 metrics:

- TTFT
- ITL/TPOT
- throughput
- GPU utilization
- KV cache usage
- P95/P99 latency

P1 bottlenecks:

- prefill-heavy workload
- decode-heavy workload
- KV cache pressure
- low batching efficiency
- poor prefix cache hit rate

P1 what-if levers:

- prefix caching
- chunked prefill
- continuous batching
- quantization
- tensor/pipeline parallelism
