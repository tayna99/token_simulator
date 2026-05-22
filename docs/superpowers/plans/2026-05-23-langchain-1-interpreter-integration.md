# Python LangChain 1.0 Agent Service Integration Plan

> Status: P0 active implementation plan for the Python-service path. P1 `create_agent` + tool-calling support is intentionally dormant until the product needs open-ended analysis.

## Goal

Move provider-backed interpretation from the Vite client into a separate Python FastAPI service under `agent_service/`, while keeping the existing frontend boundary:

```text
runAgent(input) -> AgentEvent[]
runTeamCostAgentRuntime(input) -> TeamCostGraphEvent[] + llmMode
```

The frontend remains the deterministic authority for cost, margin, team-cost workload, optimization, and budget math. Python receives precomputed tool snapshots and writes interpretation/report events only.

## Product Rules

- `src/lib/calculator.ts`, `estimateAgentWorkload`, and adjacent TS engines remain the only numeric calculation paths.
- Python must not calculate token cost, margin, savings, budget delta, approval thresholds, or bottleneck scores.
- Python may summarize, prioritize, draft decision/report prose, and attach existing `tool:*` refs.
- LLM output schemas must not contain numeric fields.
- If no provider key exists, or if a provider response invents an uncited number, the service returns deterministic fallback prose.

## Architecture

```text
React app
  runAgent(input)
    local: existing browser fallback
    server: POST /api/agent

  runTeamCostAgentRuntime(input)
    always first runs TS deterministic team-cost graph
    local: returns deterministic events
    server: POST /api/team-cost-agent with deterministicEvents snapshot

Python FastAPI agent_service/
  /health
  /api/agent
  /api/team-cost-agent

P1 dormant extension
  interactive_agent.py
  create_agent + read-only tools
  no endpoint and no UI wiring yet
```

## Python Service Scope

Files:

- `agent_service/schemas.py`
  - `RunInput`, `RunOutput`, `AgentEvent`
  - `TeamCostRunInput`, `TeamCostRunOutput`, `TeamCostGraphEvent`
  - structured-output `Analysis`
- `agent_service/interpreter.py`
  - uses LangChain `init_chat_model`
  - uses `model.with_structured_output(Analysis)`
  - falls back when no `OPENAI_API_KEY` or BYO `apiKey`
  - rejects uncited numeric claims
- `agent_service/pipeline.py`
  - `/api/agent`: `tool_snapshot -> analysis -> pricing_strategy -> risk_audit -> report_draft`
  - `/api/team-cost-agent`: preserve deterministic events, append Python report event
- `agent_service/main.py`
  - FastAPI app with CORS, `/health`, `/api/agent`, `/api/team-cost-agent`
- `agent_service/scripts/smoke_provider.py`
  - opt-in live provider smoke for `Interpreter -> run_pipeline`
  - skipped unless `AGENT_LIVE_TESTS=1` and a provider key is present
- `agent_service/interactive_agent.py`
  - dormant P1 `create_agent` skeleton
  - read-only tools only: risk cards, snapshot lookup, decision history
  - no cost, margin, savings, or budget-delta calculation tools

## Frontend Scope

- Keep `@langchain/langgraph` because existing browser fallback graphs still use it.
- Remove direct frontend dependencies from the abandoned JS experiment:
  - `@langchain/core`
  - `@langchain/openai`
  - `zod`
- Keep Vercel fallback shells in `api/agent.ts` and `api/team-cost-agent.ts`.
- `serverAgentRuntime.ts` supports optional `VITE_AGENT_API_BASE_URL`.
- `teamCostAgentRuntime.ts` chooses local deterministic mode or server mode using `VITE_TEAM_COST_RUNTIME=server`.
- `vite.config.ts` proxies `/api` to `http://localhost:8000` for local development.
- App integration is intentionally limited to runtime selection, Python report-event rendering, and the `LLM assisted` / `Deterministic fallback` chip. Team-cost should call `runTeamCostAgentRuntime`, not the graph directly.

## TDD Checklist

- Python:
  - no-key fallback returns deterministic `Analysis`
  - fake structured model path returns provider prose
  - uncited numeric claims are rejected
  - `/api/agent` preserves the five-event order
  - `/api/team-cost-agent` preserves deterministic events and appends report event
  - FastAPI contracts expose `/health`, `/api/agent`, `/api/team-cost-agent`
- TypeScript:
  - `runServerAgent` posts to `/api/agent` or `VITE_AGENT_API_BASE_URL + /api/agent`
  - `runTeamCostAgentRuntime` does not fetch in local mode
  - server mode posts deterministic events to `/api/team-cost-agent`
  - App renders the Python report event and an `LLM assisted` mode chip when server output arrives
- P1 dormant:
  - interactive tool catalog exposes only read-only lookup tools
  - no calculation tool names are present
  - risk-card lookup results include both `id` and `source`
  - interactive answer guard rejects uncited numeric claims

## Verification

Run from `agent_service/`:

```bash
uv run pytest
```

Optional provider smoke from `agent_service/`:

```bash
$env:OPENAI_API_KEY="..."
$env:AGENT_MODEL="gpt-5-mini"
$env:AGENT_LIVE_TESTS="1"
uv run python scripts/smoke_provider.py
```

Expected: skipped when no key/live flag is present; otherwise validates the event order, AI prose `tool:*` refs, and uncited numeric-claim guard.

Run from repo root:

```bash
npm run test:run -- src/features/agent/lib/serverAgentRuntime.test.ts src/features/agent/lib/teamCostAgentRuntime.test.ts src/app/App.test.tsx
npm run test:run
npm run build
```

Manual smoke:

```bash
cd agent_service
uv run uvicorn main:app --reload --port 8000
```

In a second terminal:

```bash
$env:VITE_AGENT_RUNTIME="server"
$env:VITE_TEAM_COST_RUNTIME="server"
npm run dev
```

Expected result: SparkClaw demo loads, the AI team-cost assistant still shows deterministic `tool:*` chips, and server mode can append Python-backed report/analysis prose without changing official TS-rendered numbers.
