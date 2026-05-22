"""Interpretation pipelines matching the frontend agent event contracts."""

from collections.abc import Iterable

from interpreter import SupportsInterpret
from schemas import AgentEvent, RunInput, TeamCostGraphEvent, TeamCostRunInput


def _tool_ref(key: str) -> str:
    return key if key.startswith("tool:") else f"tool:{key}"


def _unique(items: Iterable[str]) -> list[str]:
    result: list[str] = []
    for item in items:
        if item not in result:
            result.append(item)
    return result


def _refs(tool_results: dict) -> list[str]:
    return [_tool_ref(key) for key in tool_results]


def _event_refs(events: list[TeamCostGraphEvent]) -> list[str]:
    return _unique(ref for event in events for ref in event.toolResultRefs)


def _facts(tool_results: dict) -> dict[str, str]:
    return {key: str(value) for key, value in tool_results.items()}


def run_pipeline(payload: RunInput, interpreter: SupportsInterpret) -> list[AgentEvent]:
    refs = _refs(payload.toolResults)
    facts = _facts(payload.toolResults)
    events: list[AgentEvent] = []

    events.append(
        AgentEvent(
            type="tool_snapshot",
            message=f"Received {len(refs)} deterministic tool field(s).",
            toolResultRefs=refs,
            riskCardIds=[],
        )
    )

    analysis = interpreter.analyze_margin(facts, refs)
    events.append(
        AgentEvent(
            type="analysis",
            message=f"{analysis.headline} {analysis.explanation}",
            toolResultRefs=refs,
            riskCardIds=[],
        )
    )

    pricing = interpreter.pricing_comment(facts, refs)
    events.append(
        AgentEvent(
            type="pricing_strategy",
            message=f"{pricing.headline} {pricing.explanation}",
            toolResultRefs=refs,
            riskCardIds=[],
        )
    )

    events.append(
        AgentEvent(
            type="risk_audit",
            message=(
                f"Attached {len(payload.riskCardIds)} risk card(s)."
                if payload.riskCardIds
                else "No matching risk card; adoption remains blocked."
            ),
            toolResultRefs=[],
            riskCardIds=payload.riskCardIds,
        )
    )

    refs_label = ", ".join(refs) if refs else "deterministic snapshot"
    events.append(
        AgentEvent(
            type="report_draft",
            message=f"Report draft is grounded in {refs_label}.",
            toolResultRefs=refs,
            riskCardIds=payload.riskCardIds,
        )
    )

    return events


def run_team_cost_pipeline(payload: TeamCostRunInput, interpreter: SupportsInterpret) -> list[TeamCostGraphEvent]:
    deterministic_events = list(payload.deterministicEvents)
    refs = _refs(payload.toolResults) or _event_refs(deterministic_events)
    facts = _facts(payload.toolResults)
    messages = [event.message for event in deterministic_events]
    risk_card_ids = payload.riskCardIds or _unique(
        risk_id for event in deterministic_events for risk_id in event.riskCardIds
    )
    recommendation_ids = _unique(
        recommendation_id
        for event in deterministic_events
        for recommendation_id in event.recommendationIds
    )

    if not deterministic_events:
        deterministic_events.append(
            TeamCostGraphEvent(
                type="tool_snapshot",
                message=f"Received {len(refs)} deterministic team-cost field(s).",
                toolResultRefs=refs,
                riskCardIds=[],
                recommendationIds=[],
            )
        )

    report = interpreter.team_cost_report(facts, refs, messages)
    return [
        *deterministic_events,
        TeamCostGraphEvent(
            type="report_draft",
            message=f"{report.headline} {report.explanation}",
            toolResultRefs=refs,
            riskCardIds=risk_card_ids,
            recommendationIds=recommendation_ids,
        ),
    ]
