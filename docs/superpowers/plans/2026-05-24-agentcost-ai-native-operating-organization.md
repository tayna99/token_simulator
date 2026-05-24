# AgentCost AI-Native Operating Organization Implementation Plan

Status: implemented as an operating layer on top of the P0 AI Team Cost Decision Workspace.

## Summary

AgentCost is not only a token calculator. It is an AI-native FinOps operating system that connects provider/model facts, usage data, cost formulas, margin diagnosis, optimization, risk, and decision records.

This plan keeps the existing deterministic boundary:

- TypeScript owns cost, margin, savings, budget deltas, and official numeric rendering.
- Python agents use read-only tools to retrieve, explain, cite, and draft.
- Human decisions update the Decision & Approval Log / Operating Ledger.

## P0 Operating Organization

All 11 operating agents are surfaced in the product as active organizational roles:

1. Provider & API Intelligence Agent
2. Model & Inference Research Agent
3. Cost Modeling Agent
4. Usage Data Ingestion Agent
5. Cost Engine / QA Agent
6. Optimization & Routing Agent
7. Customer Diagnostic / Pricing Agent
8. Pricing & Revenue Ops Agent
9. Trust / Security / Compliance Agent
10. Finance Ops Agent
11. Knowledge & Release Ops Agent

The first six remain the core execution path for the SparkClaw P0 demo. The remaining agents are still active in the operating organization, but their heavier automations are guarded by explicit P1 activation criteria.

## Operating Assets

The operating organization owns these first-class assets:

- `provider_registry`
- `model_perf_matrix`
- `cost_formula_registry`
- `usage_schema_mapping`
- `calculation_snapshots`
- `optimization_playbook`
- `pricing_policy_library`
- `customer_cost_review`
- `security_runbook`
- `operating_ledger`

Each asset has an `asset:*` ref and owner agents. The UI should display asset health beside cost/margin/risk decisions.

## Operating Ledger

Decision Log is extended into an Operating Ledger without losing existing decision fields.

Each operating row records:

- workstream
- source
- agent used
- proposed change
- human decision
- artifact updated
- impact
- follow-up
- tool refs / risk refs / threshold snapshot / fact source snapshot / AI mode

SparkClaw sample load creates sample operating rows for provider registry, usage schema mapping, and model routing quality gates.

## Agentic Runtime

`/api/agent/run` remains the canonical endpoint.

Python `create_agent` runtime exposes read-only tools:

- `lookup_snapshot_value`
- `retrieve_threshold_policy`
- `retrieve_metric_flags`
- `retrieve_risk_cards`
- `retrieve_benchmark_evidence`
- `retrieve_decision_history`
- `retrieve_fact_sources`
- `retrieve_operating_assets`
- `retrieve_provider_registry`
- `retrieve_model_perf_matrix`
- `retrieve_operating_ledger`

Forbidden tools remain forbidden:

- cost calculation
- margin calculation
- savings estimation
- budget delta calculation
- decision mutation
- billing mutation

## P1 Automation Roadmap

These items are not discarded. They are explicit `automation_ready` modules:

- Official docs change monitor
- Full vector RAG
- vLLM / GPU serving economics
- Slack / Email alerts
- Stripe billing execution
- Benchmark marketplace

Each P1 module needs a deterministic input contract, source labeling, testable acceptance criteria, fallback behavior, and human approval before any mutation.

## Test Plan

Focused tests:

- Operating asset registry returns 10 assets and 11 active operating agents.
- Operating Ledger rows require workstream, source, agent, artifact, human decision, impact, and follow-up.
- Usage import reports missing attribution dimensions without guessing values.
- Report artifacts include operating asset health.
- Python agent tool registry exposes operating-asset read tools and no calculation/mutation tools.
- App shell shows all 11 operating agents, asset health, P1 automation-ready modules, and SparkClaw operating ledger rows.

Final gates:

- `cd agent_service && uv run pytest`
- `npm run test:run`
- `npm run build`
- provider smoke with `.env`
- browser smoke: SparkClaw sample -> stage routing -> AI panel used tools -> Operating Ledger -> report export
