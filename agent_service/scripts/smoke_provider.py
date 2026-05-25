"""Opt-in provider smoke test for the interpretation and agentic runtimes.

Run manually from agent_service/:

    AGENT_LIVE_TESTS=1 uv run python scripts/smoke_provider.py

The script intentionally calls the same functions behind /api/agent and
/api/agent/run without requiring the FastAPI server to be running.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Mapping, Sequence

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

from agentic_runtime import run_agentic_runtime
from interpreter import Interpreter, has_uncited_numeric_claim
from pipeline import run_pipeline
from schemas import AgentEvent, AgentRunInput, AgentRunResponse, RunInput

EXPECTED_EVENT_TYPES = [
    "tool_snapshot",
    "analysis",
    "pricing_strategy",
    "risk_audit",
    "report_draft",
]
AI_PROSE_EVENT_TYPES = {"analysis", "pricing_strategy", "report_draft"}
SAMPLE_TOOL_RESULTS = {
    "monthlyAiCogs": 4820,
    "grossMarginPct": 0.41,
    "topFeature": "report_generation",
    "lossCustomerCount": 3,
}
SAMPLE_RISK_CARD_IDS = ["risk-credit-confusion"]
SAMPLE_AGENTIC_TOOL_RESULTS = {
    "monthlyAiCogs": 4820,
    "grossMarginPct": 0.41,
}
EXPECTED_ALL_HANDS_AGENT_COUNT = 11


class SmokeValidationError(AssertionError):
    """Raised when the live provider smoke response violates the contract."""


def _env_value(environ: Mapping[str, str], key: str) -> str | None:
    value = environ.get(key)
    return value if value else None


def resolve_api_key(environ: Mapping[str, str]) -> str | None:
    return _env_value(environ, "AGENT_SMOKE_API_KEY") or _env_value(environ, "OPENAI_API_KEY")


def validate_smoke_events(events: Sequence[AgentEvent]) -> None:
    event_types = [event.type for event in events]
    if event_types != EXPECTED_EVENT_TYPES:
        raise SmokeValidationError(f"Unexpected event order: {event_types}")

    for event in events:
        if event.type not in AI_PROSE_EVENT_TYPES:
            continue
        if not event.toolResultRefs:
            raise SmokeValidationError(f"{event.type} is missing tool refs")
        if has_uncited_numeric_claim(event.message, event.toolResultRefs):
            raise SmokeValidationError(f"{event.type} has an uncited numeric claim")


def _validate_grounded_texts(response: AgentRunResponse, refs: list[str]) -> None:
    texts = [response.answer, response.report, *(event.message for event in response.events)]
    for text in texts:
        if has_uncited_numeric_claim(text, refs):
            raise SmokeValidationError("agentic response has an uncited numeric claim")


def validate_agentic_provider_smoke_response(response: AgentRunResponse) -> None:
    """Validate the provider path used by /api/agent/run."""
    if response.llmMode != "provider-llm":
        raise SmokeValidationError(f"Expected provider-llm, got {response.llmMode}")
    if response.runtime.status != "provider_llm":
        raise SmokeValidationError(f"Expected provider_llm runtime, got {response.runtime.status}")
    if not response.runtime.providerRunId:
        raise SmokeValidationError("provider response is missing providerRunId")
    if not response.runtime.agentInvocationProof:
        raise SmokeValidationError("provider response is missing agent invocation proof")
    if not response.calledAgentIds or not response.primaryAgentId:
        raise SmokeValidationError("provider response is missing called operating agents")
    if not response.toolResultRefs:
        raise SmokeValidationError("provider response is missing top-level tool refs")

    for event in response.events:
        if not event.agentId:
            raise SmokeValidationError("agentic provider event is missing agentId")
        if not event.calledAgentTool:
            raise SmokeValidationError("agentic provider event is missing calledAgentTool")
        if not event.toolResultRefs:
            raise SmokeValidationError("agentic provider event is missing tool refs")
        if event.calledAgentTool not in response.runtime.agentInvocationProof:
            raise SmokeValidationError(f"{event.calledAgentTool} is missing from invocation proof")

    refs = sorted({*response.toolResultRefs, *(ref for event in response.events for ref in event.toolResultRefs)})
    _validate_grounded_texts(response, refs)


def validate_agentic_all_hands_fallback_response(response: AgentRunResponse) -> None:
    """Validate the explicit all-hands fallback path used when no provider is configured."""
    if response.llmMode != "deterministic-fallback":
        raise SmokeValidationError(f"Expected deterministic fallback, got {response.llmMode}")
    if response.runtime.status not in {"unavailable", "deterministic_preview"}:
        raise SmokeValidationError(f"Unexpected fallback runtime status: {response.runtime.status}")
    if response.agentRoute.get("executionMode") != "all_hands":
        raise SmokeValidationError("fallback smoke did not preserve all_hands route")
    routed_agent_ids = response.agentRoute.get("routedAgentIds", [])
    if not isinstance(routed_agent_ids, list) or len(routed_agent_ids) != EXPECTED_ALL_HANDS_AGENT_COUNT:
        raise SmokeValidationError(f"all_hands fallback routed {len(routed_agent_ids) if isinstance(routed_agent_ids, list) else 0} agents")
    if response.agentRoute.get("calledAgentIds") != []:
        raise SmokeValidationError("fallback smoke should not claim provider agent calls")
    if not response.agentRoute.get("previewOnly"):
        raise SmokeValidationError("fallback smoke must mark the route as previewOnly")
    if not response.toolResultRefs:
        raise SmokeValidationError("fallback response is missing top-level tool refs")
    for event in response.events:
        if not event.toolResultRefs:
            raise SmokeValidationError("fallback event is missing tool refs")

    refs = sorted({*response.toolResultRefs, *(ref for event in response.events for ref in event.toolResultRefs)})
    _validate_grounded_texts(response, refs)


def run_live_smoke(api_key: str, model_name: str) -> list[AgentEvent]:
    payload = RunInput(toolResults=SAMPLE_TOOL_RESULTS, riskCardIds=SAMPLE_RISK_CARD_IDS)
    events = run_pipeline(payload, Interpreter(api_key=api_key, model_name=model_name))
    validate_smoke_events(events)
    return events


def _sample_agentic_payload(*, execution_mode: str = "stage_committee") -> AgentRunInput:
    return AgentRunInput(
        mode="ask",
        activeStage="cost",
        question="What is breaking margin?",
        executionMode=execution_mode,  # type: ignore[arg-type]
        snapshotVersion=f"snapshot:smoke:{execution_mode}",
        toolResults=SAMPLE_AGENTIC_TOOL_RESULTS,
        riskCards=[{"id": "risk-model-routing-quality", "tags": ["routing"], "source": "risk:smoke"}],
        benchmarkCards=[{"id": "bench-smoke", "evidenceId": "benchmark-smoke", "tags": ["cost"]}],
        decisionHistory=[{"id": "decision-smoke", "what": "Held model routing until QA"}],
        officialSourceSnippets=[
            {
                "snippetId": "source:provider-pricing#smoke",
                "text": "Official provider pricing source for smoke validation.",
                "refs": ["source:provider-pricing"],
            }
        ],
    )


def run_live_agentic_smoke(api_key: str, model_name: str) -> tuple[AgentRunResponse, AgentRunResponse]:
    from langchain.chat_models import init_chat_model

    model = init_chat_model(model_name, api_key=api_key)
    provider_response = run_agentic_runtime(
        _sample_agentic_payload(execution_mode="stage_committee"),
        model=model,
    )
    validate_agentic_provider_smoke_response(provider_response)

    fallback_response = run_agentic_runtime(
        _sample_agentic_payload(execution_mode="all_hands"),
        model=None,
    )
    validate_agentic_all_hands_fallback_response(fallback_response)
    return provider_response, fallback_response


def main(environ: Mapping[str, str] | None = None) -> int:
    load_dotenv()
    env = environ or os.environ

    if env.get("AGENT_LIVE_TESTS") != "1":
        print("SKIP: set AGENT_LIVE_TESTS=1 to run the live provider smoke.")
        return 0

    api_key = resolve_api_key(env)
    if not api_key:
        print("SKIP: set OPENAI_API_KEY or AGENT_SMOKE_API_KEY to run the live provider smoke.")
        return 0

    model_name = env.get("AGENT_MODEL", "gpt-5-mini")
    events = run_live_smoke(api_key, model_name)
    provider_response, fallback_response = run_live_agentic_smoke(api_key, model_name)
    print(
        "OK: provider smoke returned "
        f"{len(events)} interpretation events, "
        f"{len(provider_response.events)} agentic provider event(s), and "
        f"{len(fallback_response.agentRoute.get('routedAgentIds', []))} all-hands fallback routes with {model_name}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
