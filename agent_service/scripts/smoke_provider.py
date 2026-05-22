"""Opt-in provider smoke test for the interpretation pipeline.

Run manually from agent_service/:

    AGENT_LIVE_TESTS=1 uv run python scripts/smoke_provider.py

The script intentionally calls Interpreter -> run_pipeline directly. It does
not add a new runtime path; it verifies the same interpretation contract used
by /api/agent without requiring the FastAPI server to be running.
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

from interpreter import Interpreter, has_uncited_numeric_claim
from pipeline import run_pipeline
from schemas import AgentEvent, RunInput

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


def run_live_smoke(api_key: str, model_name: str) -> list[AgentEvent]:
    payload = RunInput(toolResults=SAMPLE_TOOL_RESULTS, riskCardIds=SAMPLE_RISK_CARD_IDS)
    events = run_pipeline(payload, Interpreter(api_key=api_key, model_name=model_name))
    validate_smoke_events(events)
    return events


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
    print(f"OK: provider smoke returned {len(events)} grounded events with {model_name}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
