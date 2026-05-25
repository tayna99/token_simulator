# Agent Runtime Smoke Runbook

## Purpose

Verify that the AgentCost operating-team runtime can move from deterministic
snapshot to `/api/agent/run`, preserve `tool:*` refs, show routed operating
agents in the UI, and keep the all-hands fallback explicit when no provider is
available.

## Provider Smoke

Run only when a live provider key is intentionally available.

```powershell
cd C:\token_simulator\agent_service
$env:AGENT_LIVE_TESTS = "1"
$env:OPENAI_API_KEY = "<provider key>"
uv run python scripts/smoke_provider.py
```

Success criteria:

- Interpretation smoke returns grounded events for `/api/agent`.
- Agentic smoke validates the `/api/agent/run` provider path.
- Provider response includes `providerRunId` and `agentInvocationProof`.
- Agentic events preserve `agentId`, `calledAgentTool`, and `tool:*` refs.
- All-hands fallback routes 11 agents but does not claim provider calls.
- No response contains an uncited numeric claim.

## Local Browser Smoke

Terminal 1:

```powershell
cd C:\token_simulator\agent_service
uv run uvicorn main:app --reload --port 8000
```

Terminal 2:

```powershell
cd C:\token_simulator
$env:VITE_AGENT_RUNTIME = "server"
$env:VITE_AGENT_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev
```

Open:

```text
http://127.0.0.1:5173/token_simulator/
```

Manual path:

1. Load SparkClaw sample.
2. Confirm Trust check is visible before cost interpretation.
3. Move through Design, Cost, Bottleneck, Optimize, and Decision Log stages.
4. Run stage committee review.
5. Run full operating review.
6. Record adopt, reject, or hold.
7. Export the one-page report.

Success criteria:

- Right AI panel shows execution mode, primary agent, reviewers, snapshot
  version, and refs.
- Stage committee path shows the routed operating agents for the active stage.
- Full operating review uses all-hands routing.
- Decision Log details preserve `agentReview`, `trustReview`, threshold/fact
  snapshots, and report review metadata.
- Report export remains blocked until a human decision is recorded.
- Browser auto-translate protection remains in place: `notranslate` meta and
  root `translate="no"` are still present.
