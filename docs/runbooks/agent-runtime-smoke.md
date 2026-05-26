# AgentPayroll agent runtime smoke runbook

## Purpose

Use this runbook to verify the AgentPayroll Money Leak Run runtime path without
overstating production connectivity. A local smoke can prove the frontend,
Python `agent_service`, runtime proof metadata, `tool:*` refs, Decision Log
metadata, and AI Cost Snapshot report path. It does not prove a production demo
tenant unless Supabase Auth/Postgres/pgvector, accepted facts, report artifacts,
and connector ledgers are configured and checked separately.

## Focused automated smoke assertions

```powershell
cd C:\token_simulator\agent_service
uv run pytest tests/test_smoke_provider.py
```

The focused suite validates the provider smoke contract without making a
network request:

- provider responses must use the stage committee shape;
- provider runtime proof must distinguish `provider_llm`, `interrupt_requested`,
  `resumed`, `deterministic_preview`, and `unavailable`;
- provider responses must preserve `tool:*` refs at the top level and event
  level;
- event-level `calledAgentTool` values such as `call_cost_modeling_agent` must
  appear in `runtime.agentInvocationProof` when a provider-backed agent call is
  claimed;
- top-level and event-level `usedTools` / `usedCapabilityTools` must reject
  forbidden mutation, billing, and external-send tool claims such as
  `create_decision`, `adopt_recommendation`, `send_email`, and
  `charge_billing`;
- fallback all-hands output must route agents in preview form without claiming
  provider-backed `call_*_agent` execution;
- AI prose must not include uncited numeric claims.

## Optional live provider smoke

Run this only when a real provider key is intentionally available.

```powershell
cd C:\token_simulator\agent_service
$env:AGENT_LIVE_TESTS = "1"
$env:OPENAI_API_KEY = "<provider key>"
uv run python scripts/smoke_provider.py
```

Live success criteria:

- interpretation smoke returns grounded events for the `/api/agent` path;
- agentic smoke returns a `/api/agent/run` provider response with
  `llmMode=provider-llm`, `runtime.status=provider_llm`, `providerRunId`, and
  non-empty `agentInvocationProof`;
- every provider event has an `agentId`, a `calledAgentTool`, and retained
  `tool:*` refs;
- every claimed `calledAgentTool` is included in `agentInvocationProof`;
- forbidden mutation, billing, and external-send tool names are absent from
  provider `usedTools` and `usedCapabilityTools`;
- the no-provider all-hands fallback remains `deterministic_preview` or
  `unavailable`, not a completed provider run.

## Start the Python agent service

```powershell
cd C:\token_simulator\agent_service
uv run uvicorn main:app --reload --port 8000
```

## Start the Next frontend against the server runtime

```powershell
cd C:\token_simulator
$env:VITE_AGENT_RUNTIME = "server"
npm run dev
```

If the frontend needs an explicit service URL in your shell, set it before
`npm run dev`:

```powershell
$env:VITE_AGENT_API_BASE_URL = "http://127.0.0.1:8000"
```

## Manual success criteria

Use the SparkClaw sample in the app.

1. Load the SparkClaw sample.
2. Run the Money Leak Run stage routing review for the current stage.
3. Confirm the right panel shows the called agents for the stage committee.
4. Confirm the right panel preserves `tool:*` refs and does not claim
   `provider_llm` when provider credentials are absent.
5. Confirm a Decision Candidate has no default choice and requires explicit
   Adopt/Reject/Hold before the report path opens.
6. Record the selected Adopt/Reject/Hold item in the Decision Log.
7. Open the AI Cost Snapshot report and confirm it includes runtime/review
   metadata.

## HITL runtime proof checks

Use these checks when a HITL checkpoint path is part of the smoke.

- If the runtime returns `interrupt_requested`, the UI should show checkpoint
  status/id/thread metadata and should not render the AI Cost Snapshot report as
  complete.
- After the user selects Adopt/Reject/Hold and resumes the checkpoint, Decision
  Log and report artifacts can show `runtime.status=resumed` and
  `humanApproval.approvalMode=checkpoint_resume`.
- A resumed provider-backed path can retain `providerRunId` and
  `call_*_agent` proof. A preview or unavailable path must not invent
  `call_*_agent` proof.
- Reports expose checkpoint status/id and approval mode, not the raw
  `resumePayload`.

The local no-credential path should render as a deterministic preview or
unavailable runtime, not as a completed provider LLM execution.
