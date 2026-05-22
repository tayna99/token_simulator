"""Dormant P1 interactive-agent skeleton.

This module is intentionally not imported by main.py. P0 stays on the fixed
interpretation pipeline. When the product needs open-ended questions, this
module provides a constrained create_agent surface with read-only tools.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Any

from langchain.agents import create_agent
from langchain.tools import tool

from interpreter import has_uncited_numeric_claim

READ_ONLY_TOOL_NAMES = (
    "retrieve_risk_cards",
    "lookup_snapshot_value",
    "retrieve_decision_history",
)
FORBIDDEN_CALCULATION_TOOL_NAMES = {
    "calculate_cost",
    "calculate_margin",
    "estimate_savings",
    "calculate_budget_delta",
    "estimate_budget_delta",
}
INTERACTIVE_SYSTEM_PROMPT = (
    "You answer open-ended questions about an AI SaaS cost workspace. "
    "Use tools only for read-only lookup. Never calculate cost, margin, "
    "savings, or budget deltas. If you mention a number, cite the exact "
    "tool ref that supplied it."
)

DEFAULT_RISK_CARDS = [
    {
        "id": "risk-credit-confusion",
        "title": "Credit confusion",
        "tags": ["credit", "pricing"],
        "source": "risk-corpus:p1-dormant",
    },
    {
        "id": "risk-human-review-bottleneck",
        "title": "Human review bottleneck",
        "tags": ["agent-loop", "review"],
        "source": "risk-corpus:p1-dormant",
    },
]


def _normalize_tool_ref(tool_ref: str) -> str:
    return tool_ref if tool_ref.startswith("tool:") else f"tool:{tool_ref}"


def _json(data: Mapping[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def assert_grounded_interactive_answer(text: str, refs: Sequence[str]) -> None:
    if has_uncited_numeric_claim(text, list(refs)):
        raise ValueError("Interactive answer contains an uncited numeric claim")


def _retrieve_risk_cards(tags: Sequence[str], risk_cards: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    tag_set = {tag.lower() for tag in tags}
    cards = []
    for card in risk_cards:
        card_tags = {str(tag).lower() for tag in card.get("tags", [])}
        if tag_set and not tag_set.intersection(card_tags):
            continue
        cards.append(
            {
                "id": card.get("id"),
                "title": card.get("title"),
                "source": card.get("source", "risk-corpus:unknown"),
            }
        )
    return {"cards": cards}


def build_interactive_tools(
    *,
    snapshot: Mapping[str, Any],
    risk_cards: Sequence[Mapping[str, Any]] | None = None,
    decision_history: Sequence[Mapping[str, Any]] | None = None,
):
    cards = list(risk_cards or DEFAULT_RISK_CARDS)
    decisions = list(decision_history or [])
    normalized_snapshot = {_normalize_tool_ref(key): value for key, value in snapshot.items()}

    @tool
    def retrieve_risk_cards(tags: list[str]) -> str:
        """Retrieve risk cards by tags. This is read-only and returns ids and sources."""
        return _json(_retrieve_risk_cards(tags, cards))

    @tool
    def lookup_snapshot_value(tool_ref: str) -> str:
        """Read one deterministic snapshot value by its tool ref. This never computes values."""
        ref = _normalize_tool_ref(tool_ref)
        if ref not in normalized_snapshot:
            return _json({"found": False, "toolRef": ref})
        return _json({"found": True, "toolRef": ref, "value": str(normalized_snapshot[ref])})

    @tool
    def retrieve_decision_history(topic: str) -> str:
        """Retrieve prior decision-log entries by topic. This is read-only."""
        needle = topic.lower()
        matches = [
            {
                "id": decision.get("id"),
                "what": decision.get("what"),
                "source": decision.get("source", "decision-log:p1-dormant"),
            }
            for decision in decisions
            if needle in str(decision.get("what", "")).lower()
            or needle in str(decision.get("why", "")).lower()
        ]
        return _json({"decisions": matches})

    tools = [retrieve_risk_cards, lookup_snapshot_value, retrieve_decision_history]
    names = {item.name for item in tools}
    if names.intersection(FORBIDDEN_CALCULATION_TOOL_NAMES):
        raise ValueError("Interactive agent cannot expose calculation tools")
    return tools


def create_interactive_agent(model, *, snapshot: Mapping[str, Any], risk_cards=None, decision_history=None):
    """Create the dormant P1 agent. Do not call from P0 endpoints."""
    return create_agent(
        model=model,
        tools=build_interactive_tools(
            snapshot=snapshot,
            risk_cards=risk_cards,
            decision_history=decision_history,
        ),
        system_prompt=INTERACTIVE_SYSTEM_PROMPT,
    )
