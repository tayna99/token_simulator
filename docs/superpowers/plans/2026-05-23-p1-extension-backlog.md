# P1 Extension Backlog Plan

## Scope

P0 now focuses on the AI Team Cost Decision Workspace: SparkClaw sample flow, work ledger, cost attribution, margin/profitability, adjustable threshold policy, bottleneck flags, optimization plus risk, decision log, agentic AI panel, and one-page report export.

This file preserves the items that should not blur the MVP, while keeping the P0 runtime extensible. P0 already exposes a canonical agentic boundary through `/api/agent/run`, a read-only Tool Registry, and a local RAG adapter. P1 replaces or expands those adapters without moving numeric authority away from the deterministic TypeScript engine.

## Non-Negotiable Boundary

- TypeScript remains the only source for cost, margin, savings, budget delta, and official numeric rendering.
- Python agents may retrieve, interpret, cite, and draft.
- Agent tools must stay read-only unless a future plan explicitly adds a human-approved mutation path.
- Every AI prose claim that mentions numeric values must cite existing `tool:*` refs.
- SDK-lite and alert work must preserve the Trust boundary: no raw prompt, messages, API keys, secrets, or PII are collected by default.
- Alert state is deterministic and rule-based. AI may draft explanation and next-action text only.

## MVP 2-4 Product Direction

| Area | Backlog decision |
| --- | --- |
| MVP 2: SDK-lite automatic collection | Start with SDK-lite, not Gateway. Capture `timestamp`, `request_id`, `customer_id`, `plan_id`, `feature`, `model`, `session_id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_cost`, `latency_ms`, `status`, and business metadata only. |
| MVP 3: Alert / Margin Guard | Limit v1 to four decision-needed alert families: cost surge, projected budget overrun, loss-making customer/feature, and model-change risk. |
| MVP 4: Gateway / Proxy | Keep Gateway as optional advanced mode after SDK-lite proves value. Blocking, routing, fallback, and customer budget enforcement require separate trust, outage, and security planning. |
| Guided first-run flow | First experience is setup wizard, not blank dashboard: usage import -> feature mapping -> business baselines -> cost/margin -> recommendations -> report. |
| Developer usability | Developer view emphasizes logs, model, latency, errors, retries, and cache. CEO view emphasizes margin, loss-making customers, and pricing decisions. Both read the same deterministic snapshot. |
| AI interpretation trust | Guardrail and alert conditions are deterministic. AI explains and drafts next actions; it does not create numbers or decide alert state. |

## P1 Backlog

### vLLM / GPU Serving Economics

Add a separate self-hosted inference economics module for teams running open models on GPUs.

Track TTFT, ITL/TPOT, throughput, GPU utilization, KV cache usage, P95/P99 latency, prefix cache hit rate, batching efficiency, and context length distribution.

Classify bottlenecks as prefill-heavy, decode-heavy, KV-cache pressure, low batching efficiency, poor prefix caching, or oversized context. Recommendations can include prefix caching, chunked prefill, continuous batching, quantization, tensor parallelism, and pipeline parallelism, but all savings remain what-if until validated by measured throughput and quality.

### Full RAG / Vector Search

Upgrade the P0 lexical/tag retriever into separate retrievers:

- Official docs RAG for prose explanations of provider pricing/spec behavior.
- Benchmark RAG for evidence-board peer comparisons.
- Decision-history RAG for prior operating decisions.

Structured fact tables remain the authority for prices, model specs, context windows, and last-verified dates. RAG may explain those facts, not invent or override them.

### Official Research Watchtower

Add an official-source monitoring pipeline for pricing pages, model docs, release notes, blogs, RSS feeds, and changelogs.

This is not limited to Western providers. P1 must actively cover Qwen/Alibaba, Kimi/Moonshot, DeepSeek, Z.ai/GLM, MiniMax, ByteDance Doubao/Volcano Ark, Baidu ERNIE/Qianfan, Tencent Hunyuan, StepFun, and radar sources such as 01.AI/Yi, Baichuan, SenseTime, Huawei Pangu, and iFlytek Spark.

The Watchtower writes model-release candidates instead of directly editing the model catalog. It must preserve model owner, serving provider, region, native currency, FX snapshot, official source trust, and hosted third-party status. First-party API prices, cloud-hosted prices, third-party router prices, and subscription benchmarks must never be mixed.

### SDK-lite Automatic Collection

Add a small SDK path that lets developers send ongoing usage events without sending raw prompts.

Normalize SDK events into the existing work-ledger dimensions: customer, feature, model, plan, session, agent run, task type, retry, cacheability, human review, and deliverable.

The first event contract is the shared usage schema: `timestamp`, `request_id`, `customer_id`, `plan_id`, `feature`, `model`, `session_id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_cost`, `latency_ms`, `status`, plus optional business metadata.

Gateway/Proxy is deferred until after SDK-lite. Third-party adapters for OpenAI, Anthropic, Vercel AI Gateway, Helicone, Langfuse, and customer gateway logs must follow the same Trust checks before snapshot creation.

### Slack / Email Alerts

Use threshold policy, deterministic snapshots, and Decision Log history as alert sources.

Initial Margin Guard alerts are limited to four families: cost surge, projected budget overrun, loss-making customer/feature, and model-change risk.

Retry spike, stale pricing source, low cache hit rate, and decision follow-up due can remain developer/admin signals, but they should not become customer-facing Margin Guard alerts unless they map to one of the four decision-needed families.

### Billing / Stripe Execution

Keep P0 at recommendation plus decision recording. P1 may connect adopted pricing recommendations to billing-plan drafts or Stripe changes, but only behind an explicit approval flow.

### Complex Benchmark Marketplace

Expand the evidence board into verified external datasets or customer-provided peer cohorts.

If evidence is sparse, the product must show `baseline unavailable` instead of fabricating a peer average.

### Supervisor Agent-as-Tool Orchestration

Promote the P0 stage-routed operating workers into a LangChain Supervisor that can call `call_*_agent` tools.

The product must still guarantee that at least one operating agent runs for every stage request. The Supervisor can choose agents, but code orchestration must enforce permission boundaries and fallback behavior.

### Customer-Facing SaaS Dashboard

Move the operator-run internal admin flow into a guided customer-facing workspace.

Scope includes workspace auth, setup wizard, customer upload flow, monthly review history, customer-visible Decision/Operating Ledger, and one-page report export. Raw prompts and PII remain blocked by default.

The setup wizard order is: usage import, feature mapping, business baselines, cost/margin, recommendations, report.

Role split is required: Developer view starts from logs/model/latency/errors/retries/cache; CEO view starts from margin/loss-making customers/pricing decisions. Both views must use the same deterministic snapshot and shared usage rows.

### Retention and Data Room Automation

Automate the service MVP data-room discipline.

Scope includes raw upload deletion reminders, customer artifact inventory, schema mapping profile versions, report review gate evidence, and audit log exports.

### Trust Pipeline Expansion

Make Trust checks enforceable across every ingestion adapter.

Every SDK/gateway/import adapter must run through data intake policy, PII/API-key scanning, anonymization status, schema health, analysis-scope labeling, and retention notes before data can reach deterministic snapshots.

## Activation Rule

Promote a P1 item only when it has:

- A deterministic input contract.
- A testable acceptance criterion.
- A source/basis labeling strategy.
- A rollback or fallback path.
- A human approval boundary for any mutation.
