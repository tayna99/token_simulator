"""Extensible create_agent runtime for the P0 decision workspace.

The TypeScript app remains the numeric authority. This module exposes only
read-only lookup/retrieval tools to the LangChain agent.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from langchain.agents import create_agent
from langchain.tools import tool

from interpreter import has_uncited_numeric_claim
from schemas import AgenticEvent, AgentRunInput, AgentRunResponse

FORBIDDEN_AGENT_TOOL_NAMES = {
    "calculate_cost",
    "calculate_margin",
    "estimate_savings",
    "calculate_budget_delta",
    "create_decision",
    "adopt_recommendation",
    "send_email",
    "charge_billing",
}

AGENT_SYSTEM_PROMPT = (
    "You are the agentic decision assistant for an AI Team Cost Decision Workspace. "
    "Use read-only tools to retrieve deterministic snapshots, threshold policy, "
    "risk cards, benchmark evidence, decision history, front operating assets, "
    "operating assets, and fact sources. "
    "Never calculate cost, margin, savings, or budget deltas. If you mention a "
    "number, cite the exact tool ref next to the claim. Cite operating assets with asset:* refs. Return concise output."
)

OPERATING_AGENT_IDS = [
    "provider_api_intelligence",
    "model_inference_research",
    "cost_modeling",
    "usage_data_ingestion",
    "cost_engine_qa",
    "optimization_routing",
    "customer_diagnostic_pricing",
    "pricing_revenue_ops",
    "trust_security_compliance",
    "finance_ops",
    "knowledge_release_ops",
]

AGENT_TOOL_PERMISSION_MATRIX: dict[str, set[str]] = {
    "provider_api_intelligence": {
        "retrieve_provider_registry",
        "retrieve_fact_sources",
        "retrieve_operating_ledger",
        "retrieve_operating_asset",
        "retrieve_official_source_registry",
        "retrieve_official_source_snippets",
        "retrieve_model_release_candidates",
        "retrieve_pricing_fact_candidates",
        "retrieve_fx_rate_snapshot",
        "retrieve_p1_vector_rag_evidence",
    },
    "model_inference_research": {
        "retrieve_model_perf_matrix",
        "retrieve_benchmark_evidence",
        "retrieve_risk_cards",
        "retrieve_operating_asset",
        "retrieve_p1_vector_rag_evidence",
    },
    "cost_modeling": {
        "lookup_snapshot_value",
        "list_available_tool_refs",
        "retrieve_threshold_policy",
        "retrieve_metric_flags",
    },
    "usage_data_ingestion": {
        "retrieve_operating_assets",
        "retrieve_operating_asset",
        "retrieve_front_operating_system",
        "retrieve_front_operating_gate",
        "retrieve_front_operating_assets",
        "lookup_snapshot_value",
    },
    "cost_engine_qa": {
        "list_available_tool_refs",
        "lookup_snapshot_value",
        "retrieve_metric_flags",
        "retrieve_operating_asset",
        "retrieve_pricing_fact_candidates",
        "retrieve_fx_rate_snapshot",
        "retrieve_p1_vector_rag_evidence",
    },
    "optimization_routing": {
        "retrieve_metric_flags",
        "retrieve_risk_cards",
        "retrieve_model_perf_matrix",
        "retrieve_operating_asset",
    },
    "customer_diagnostic_pricing": {
        "lookup_snapshot_value",
        "retrieve_threshold_policy",
        "retrieve_decision_history",
        "retrieve_operating_asset",
        "retrieve_front_operating_system",
        "retrieve_front_operating_gate",
    },
    "pricing_revenue_ops": {
        "retrieve_decision_history",
        "retrieve_risk_cards",
        "retrieve_operating_assets",
        "retrieve_operating_asset",
        "retrieve_front_operating_gate",
    },
    "trust_security_compliance": {
        "retrieve_risk_cards",
        "retrieve_operating_assets",
        "retrieve_operating_ledger",
        "retrieve_operating_asset",
        "retrieve_front_operating_assets",
        "retrieve_front_operating_gate",
    },
    "finance_ops": {
        "lookup_snapshot_value",
        "retrieve_decision_history",
        "retrieve_operating_ledger",
        "retrieve_operating_asset",
        "retrieve_front_operating_system",
    },
    "knowledge_release_ops": {
        "retrieve_operating_ledger",
        "retrieve_decision_history",
        "retrieve_fact_sources",
        "retrieve_operating_asset",
        "retrieve_front_operating_system",
        "retrieve_front_operating_assets",
        "retrieve_learning_loop_records",
        "retrieve_official_source_registry",
        "retrieve_official_source_snippets",
        "retrieve_model_release_candidates",
        "retrieve_p1_vector_rag_evidence",
    },
}

STAGE_AGENT_ROUTES = {
    "design": ["usage_data_ingestion", "provider_api_intelligence", "cost_engine_qa"],
    "cost": ["cost_modeling", "cost_engine_qa", "finance_ops"],
    "bottleneck": ["customer_diagnostic_pricing", "usage_data_ingestion", "cost_engine_qa"],
    "optimize": ["optimization_routing", "model_inference_research", "trust_security_compliance"],
    "decision-log": ["knowledge_release_ops", "finance_ops", "pricing_revenue_ops"],
}


def _tool_ref(key: str) -> str:
    return key if key.startswith("tool:") else f"tool:{key}"


def _json(data: Mapping[str, Any] | Sequence[Mapping[str, Any]]) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def _envelope(
    *,
    tool_name: str,
    refs: Sequence[str] = (),
    found: bool = True,
    data: Mapping[str, Any] | Sequence[Mapping[str, Any]] | None = None,
    warnings: Sequence[str] = (),
) -> str:
    return _json({
        "toolName": tool_name,
        "refs": _unique([str(ref) for ref in refs]),
        "found": found,
        "data": data if data is not None else {},
        "warnings": list(warnings),
    })


def _matches_query(record: Mapping[str, Any], query: str, tags: Sequence[str]) -> bool:
    haystack = json.dumps(record, ensure_ascii=False).lower()
    tag_set = {tag.lower() for tag in tags}
    record_tags = {str(tag).lower() for tag in record.get("tags", [])}
    return (query.lower() in haystack if query else True) and (
        not tag_set or bool(tag_set.intersection(record_tags))
    )


def _matches_text(record: Mapping[str, Any], query: str) -> bool:
    if not query:
        return True
    terms = [term for term in query.lower().split() if term]
    if not terms:
        return True
    haystack = json.dumps(record, ensure_ascii=False).lower()
    return any(term in haystack for term in terms)


def _refs_from_tool_results(tool_results: Mapping[str, Any]) -> list[str]:
    return [_tool_ref(key) for key in tool_results]


def _asset_refs(operating_assets: Sequence[Mapping[str, Any]]) -> list[str]:
    refs: list[str] = []
    for asset in operating_assets:
        asset_id = asset.get("id")
        if isinstance(asset_id, str) and asset_id:
            refs.append(asset_id if asset_id.startswith("asset:") else f"asset:{asset_id}")
    return refs


def _front_asset_refs(front_operating_system: Mapping[str, Any] | None) -> list[str]:
    if not front_operating_system:
        return []
    assets = front_operating_system.get("assets", [])
    if not isinstance(assets, Sequence) or isinstance(assets, (str, bytes)):
        return []
    refs: list[str] = []
    for asset in assets:
        if not isinstance(asset, Mapping):
            continue
        asset_ref = asset.get("ref")
        asset_id = asset.get("id")
        if isinstance(asset_ref, str) and asset_ref:
            refs.append(asset_ref if asset_ref.startswith("asset:") else f"asset:{asset_ref}")
        elif isinstance(asset_id, str) and asset_id:
            refs.append(asset_id if asset_id.startswith("asset:") else f"asset:{asset_id}")
    return _unique(refs)


def _payload_asset_refs(payload: AgentRunInput) -> list[str]:
    return _unique([
        *_asset_refs(payload.operatingAssets),
        *_front_asset_refs(payload.frontOperatingSystem),
    ])


def _unique(items: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _agent_tool_name(agent_id: str) -> str:
    return f"call_{agent_id}_agent"


def _known_agent_ids(operating_agents: Sequence[Mapping[str, Any]] | None = None) -> list[str]:
    provided = [
        str(agent.get("id"))
        for agent in (operating_agents or [])
        if isinstance(agent.get("id"), str) and agent.get("id")
    ]
    return provided or OPERATING_AGENT_IDS


def _agent_profile(agent_id: str, operating_agents: Sequence[Mapping[str, Any]]) -> Mapping[str, Any]:
    for agent in operating_agents:
        if agent.get("id") == agent_id:
            return agent
    return {"id": agent_id, "label": agent_id.replace("_", " ").title(), "role": "Operating agent"}


def route_operating_agents(
    *,
    active_stage: str,
    question: str = "",
    requested_agent_id: str | None = None,
    execution_mode: str = "stage_committee",
    operating_agents: Sequence[Mapping[str, Any]] | None = None,
    trust_inspection: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    known_agent_ids = _known_agent_ids(operating_agents)
    default_route = [
        agent_id for agent_id in STAGE_AGENT_ROUTES.get(active_stage, STAGE_AGENT_ROUTES["design"])
        if agent_id in known_agent_ids
    ]
    if not default_route:
        default_route = known_agent_ids[:3]
    requested = requested_agent_id if requested_agent_id in known_agent_ids else None
    mode = execution_mode if execution_mode in {"stage_committee", "all_hands", "single_agent"} else "stage_committee"

    trust_warnings = trust_inspection.get("warnings", []) if trust_inspection else []
    trust_blocked = bool(trust_inspection) and (
        trust_inspection.get("status") == "blocked"
        or trust_inspection.get("allowedForSnapshot") is False
        or "raw_prompt_detected" in trust_warnings
        or "api_key_candidate_detected" in trust_warnings
    )
    if mode != "all_hands" and trust_blocked:
        trust_route = [
            agent_id for agent_id in ["trust_security_compliance", "usage_data_ingestion", "cost_engine_qa"]
            if agent_id in known_agent_ids
        ] or known_agent_ids[:3]
        called = [requested] if mode == "single_agent" and requested else trust_route[:3]
        primary = called[0]
        return {
            "executionMode": mode,
            "activeStage": active_stage,
            "question": question,
            "primaryAgentId": primary,
            "reviewerAgentIds": [agent_id for agent_id in called if agent_id != primary],
            "calledAgentIds": called,
            "reason": "trust pipeline requires review before snapshot use",
        }

    if mode == "all_hands":
        primary = requested or default_route[0]
        called = _unique([primary, *known_agent_ids])
    elif mode == "single_agent":
        primary = requested or default_route[0]
        called = [primary]
    else:
        primary = requested or default_route[0]
        called = _unique([primary, *[agent_id for agent_id in default_route if agent_id != primary]])[:3]

    reviewers = [agent_id for agent_id in called if agent_id != primary]
    return {
        "executionMode": mode,
        "activeStage": active_stage,
        "question": question,
        "primaryAgentId": primary,
        "reviewerAgentIds": reviewers,
        "calledAgentIds": called,
        "reason": (
            "requested agent override"
            if requested else f"{active_stage} stage default operating team"
        ),
    }


def _fallback_response(payload: AgentRunInput, warnings: list[str] | None = None) -> AgentRunResponse:
    refs = _refs_from_tool_results(payload.toolResults)
    refs_label = ", ".join(refs) if refs else "deterministic snapshot"
    route = route_operating_agents(
        active_stage=payload.activeStage,
        question=payload.question,
        requested_agent_id=payload.requestedAgentId,
        execution_mode=payload.executionMode,
        operating_agents=payload.operatingAgents,
        trust_inspection=payload.trustInspection,
    )
    answer = f"Operating team fallback is grounded in {refs_label}."
    report = f"One-page report fallback uses {refs_label} and does not create new numbers."
    asset_refs = _payload_asset_refs(payload)
    reviewer_ids = route["reviewerAgentIds"]
    events = [
        {
            "type": "analysis",
            "message": f"{_agent_profile(agent_id, payload.operatingAgents).get('label', agent_id)} fallback is grounded in {refs_label}.",
            "agentId": agent_id,
            "calledAgentTool": _agent_tool_name(agent_id),
            "toolResultRefs": refs,
            "riskCardIds": [str(card.get("id")) for card in payload.riskCards if card.get("id")],
            "usedTools": [],
            "usedCapabilityTools": [],
            "reviewerAgentIds": [item for item in reviewer_ids if item != agent_id],
            "evidenceRefs": [],
            "assetRefs": asset_refs,
        }
        for agent_id in route["calledAgentIds"]
    ]
    return AgentRunResponse(
        events=events,
        answer=answer,
        report=report,
        llmMode="deterministic-fallback",
        supervisorSummary=(
            f"{route['primaryAgentId']} led a fallback review with "
            f"{len(route['reviewerAgentIds'])} reviewer agent(s), grounded in {refs_label}."
        ),
        disagreements=[],
        decisionReadiness="needs_review",
        nextQuestions=[
            "Confirm provider runtime availability before treating AI interpretation as LLM assisted.",
            "Review the cited deterministic refs before adopting a recommendation.",
        ],
        calledAgentIds=route["calledAgentIds"],
        primaryAgentId=route["primaryAgentId"],
        reviewerAgentIds=reviewer_ids,
        agentRoute=route,
        snapshotVersion=payload.snapshotVersion,
        usedTools=[],
        toolResultRefs=refs,
        riskCardIds=[str(card.get("id")) for card in payload.riskCards if card.get("id")],
        evidenceRefs=[
            str(card.get("evidenceId") or card.get("evidenceRef"))
            for card in payload.benchmarkCards
            if card.get("evidenceId") or card.get("evidenceRef")
        ],
        assetRefs=asset_refs,
        warnings=_unique([
            *(warnings or ["provider unavailable; deterministic fallback used"]),
            *(["trust pipeline requires review before snapshot use"] if route["reason"] == "trust pipeline requires review before snapshot use" else []),
        ]),
    )


def build_agent_tools(
    *,
    tool_results: Mapping[str, Any],
    threshold_policy: Mapping[str, Any],
    metric_flags: Sequence[Mapping[str, Any]],
    risk_cards: Sequence[Mapping[str, Any]],
    benchmark_cards: Sequence[Mapping[str, Any]],
    decision_history: Sequence[Mapping[str, Any]],
    fact_sources: Sequence[Mapping[str, Any]],
    operating_agents: Sequence[Mapping[str, Any]] = (),
    operating_assets: Sequence[Mapping[str, Any]] = (),
    provider_registry: Sequence[Mapping[str, Any]] = (),
    model_perf_matrix: Sequence[Mapping[str, Any]] = (),
    operating_ledger: Sequence[Mapping[str, Any]] = (),
    official_source_registry: Sequence[Mapping[str, Any]] = (),
    official_source_snippets: Sequence[Mapping[str, Any]] = (),
    model_release_candidates: Sequence[Mapping[str, Any]] = (),
    pricing_fact_candidates: Sequence[Mapping[str, Any]] = (),
    fx_rate_snapshots: Sequence[Mapping[str, Any]] = (),
    front_operating_system: Mapping[str, Any] | None = None,
    allowed_tool_names: set[str] | None = None,
):
    normalized_snapshot = {_tool_ref(key): value for key, value in tool_results.items()}
    front_context = front_operating_system or {}
    front_assets_raw = front_context.get("assets", [])
    front_assets: Sequence[Mapping[str, Any]] = (
        [
            asset for asset in front_assets_raw
            if isinstance(asset, Mapping)
        ]
        if isinstance(front_assets_raw, Sequence) and not isinstance(front_assets_raw, (str, bytes))
        else []
    )

    def front_gate(gate_id: str) -> tuple[Any, list[str]]:
        normalized = gate_id.strip().lower().replace("-", "_")
        gates: dict[str, tuple[Any, list[str]]] = {
            "": (front_context, _front_asset_refs(front_context)),
            "system": (front_context, _front_asset_refs(front_context)),
            "lead_fit": (
                front_context.get("leadFitRules", {}),
                ["asset:icp_scorecard", "asset:lead_intake_log"],
            ),
            "icp": (
                front_context.get("leadFitRules", {}),
                ["asset:icp_scorecard", "asset:lead_intake_log"],
            ),
            "self_assessment": (
                front_context.get("selfAssessment", {}),
                ["asset:self_assessment_rules"],
            ),
            "data_readiness": (
                front_context.get("dataReadinessGate", {}),
                ["asset:data_readiness_checklist"],
            ),
            "offer_ladder": (
                front_context.get("offerLadder", []),
                ["asset:offer_ladder"],
            ),
            "approval": (
                front_context.get("approvalGates", []),
                ["asset:approval_matrix"],
            ),
            "learning_loop": (
                front_context.get("learningLoopRecords", []),
                ["asset:learning_loop_review", "asset:productization_backlog"],
            ),
        }
        return gates.get(normalized, ({}, []))

    @tool
    def lookup_snapshot_value(tool_ref: str) -> str:
        """Read one deterministic snapshot value by tool ref. This never computes values."""
        ref = _tool_ref(tool_ref)
        if ref not in normalized_snapshot:
            return _envelope(
                tool_name="lookup_snapshot_value",
                refs=[ref],
                found=False,
                data={"toolRef": ref},
                warnings=["snapshot_missing"],
            )
        return _envelope(
            tool_name="lookup_snapshot_value",
            refs=[ref],
            found=True,
            data={"toolRef": ref, "value": str(normalized_snapshot[ref])},
        )

    @tool
    def list_available_tool_refs() -> str:
        """List deterministic tool refs available for citation."""
        refs = sorted(normalized_snapshot)
        return _envelope(
            tool_name="list_available_tool_refs",
            refs=refs,
            found=bool(refs),
            data={"toolRefs": refs},
            warnings=[] if refs else ["snapshot_missing"],
        )

    @tool
    def retrieve_threshold_policy(metric_id: str) -> str:
        """Retrieve adjustable threshold policy by metric or threshold id."""
        if metric_id in threshold_policy:
            return _envelope(
                tool_name="retrieve_threshold_policy",
                refs=[f"basis:{metric_id}"],
                found=True,
                data={"threshold": threshold_policy[metric_id]},
            )
        matches = [
            value for key, value in threshold_policy.items()
            if metric_id.lower() in key.lower() or metric_id.lower() in json.dumps(value).lower()
        ]
        return _envelope(
            tool_name="retrieve_threshold_policy",
            refs=[f"basis:{metric_id}"] if matches else [],
            found=bool(matches),
            data={"thresholds": matches},
            warnings=[] if matches else ["basis_unavailable"],
        )

    @tool
    def retrieve_metric_flags(metric_id: str) -> str:
        """Retrieve deterministic metric flags and basis refs."""
        matches = [
            flag for flag in metric_flags
            if metric_id.lower() in json.dumps(flag, ensure_ascii=False).lower()
        ]
        refs = [
            str(flag.get("basisRef") or flag.get("basis") or flag.get("metricId"))
            for flag in matches
            if flag.get("basisRef") or flag.get("basis") or flag.get("metricId")
        ]
        return _envelope(
            tool_name="retrieve_metric_flags",
            refs=refs,
            found=bool(matches),
            data={"flags": matches},
            warnings=[] if matches else ["metric_flag_unavailable"],
        )

    @tool
    def retrieve_risk_cards(query: str = "", tags: list[str] | None = None) -> str:
        """Retrieve risk cards by query and tags. Returns ids and sources."""
        matches = [
            card for card in risk_cards
            if _matches_query(card, query, tags or [])
        ]
        refs = [f"risk:{card.get('id')}" for card in matches if card.get("id")]
        return _envelope(
            tool_name="retrieve_risk_cards",
            refs=refs,
            found=bool(matches),
            data={"cards": matches},
            warnings=[] if matches else ["risk_card_unavailable"],
        )

    @tool
    def retrieve_benchmark_evidence(query: str = "", tags: list[str] | None = None) -> str:
        """Retrieve benchmark evidence by query and tags. Returns evidence ids when available."""
        matches = [
            card for card in benchmark_cards
            if _matches_query(card, query, tags or [])
        ]
        refs = [
            f"evidence:{card.get('evidenceId') or card.get('evidenceRef') or card.get('id')}"
            for card in matches
            if card.get("evidenceId") or card.get("evidenceRef") or card.get("id")
        ]
        if not matches:
            return _envelope(
                tool_name="retrieve_benchmark_evidence",
                refs=[],
                found=False,
                data={"cards": []},
                warnings=["baseline_unavailable"],
            )
        return _envelope(
            tool_name="retrieve_benchmark_evidence",
            refs=refs,
            found=True,
            data={"cards": matches},
        )

    @tool
    def retrieve_decision_history(topic: str) -> str:
        """Retrieve prior decision log rows by topic. This is read-only."""
        needle = topic.lower()
        matches = [
            decision for decision in decision_history
            if needle in json.dumps(decision, ensure_ascii=False).lower()
        ]
        refs = [f"decision:{decision.get('id')}" for decision in matches if decision.get("id")]
        return _envelope(
            tool_name="retrieve_decision_history",
            refs=refs,
            found=bool(matches),
            data={"decisions": matches},
            warnings=[] if matches else ["decision_history_unavailable"],
        )

    @tool
    def retrieve_fact_sources(provider_or_model: str = "") -> str:
        """Retrieve official fact-source snapshots for model pricing/spec provenance."""
        needle = provider_or_model.lower()
        matches = [
            source for source in fact_sources
            if not needle or needle in json.dumps(source, ensure_ascii=False).lower()
        ]
        refs = [f"fact:{source.get('id')}" for source in matches if source.get("id")]
        return _envelope(
            tool_name="retrieve_fact_sources",
            refs=refs,
            found=bool(matches),
            data={"factSources": matches},
            warnings=[] if matches else ["fact_source_unavailable"],
        )

    @tool
    def retrieve_operating_assets(query: str = "", owner_agent_id: str = "") -> str:
        """Retrieve AgentCost operating assets and owning agents. Read-only."""
        query_lower = query.lower()
        owner_lower = owner_agent_id.lower()
        matches = [
            asset for asset in operating_assets
            if (not query_lower or query_lower in json.dumps(asset, ensure_ascii=False).lower())
            and (not owner_lower or owner_lower in json.dumps(asset.get("ownerAgentIds", []), ensure_ascii=False).lower())
        ]
        refs = _asset_refs(matches)
        return _envelope(
            tool_name="retrieve_operating_assets",
            refs=refs,
            found=bool(matches),
            data={"assets": matches, "assetRefs": refs},
            warnings=[] if matches else ["asset_unavailable"],
        )

    @tool
    def retrieve_operating_agent_profile(agent_id: str) -> str:
        """Retrieve one operating agent profile, role, owned assets, and allowed tools."""
        profile = _agent_profile(agent_id, operating_agents)
        if profile.get("id") not in _known_agent_ids(operating_agents):
            return _envelope(
                tool_name="retrieve_operating_agent_profile",
                refs=[],
                found=False,
                data={"agentId": agent_id},
                warnings=["agent_profile_unavailable"],
            )
        profile_id = str(profile.get("id"))
        return _envelope(
            tool_name="retrieve_operating_agent_profile",
            refs=[f"agent:{profile_id}"],
            found=True,
            data={
                "agent": profile,
                "allowedTools": sorted(AGENT_TOOL_PERMISSION_MATRIX.get(profile_id, set())),
            },
        )

    @tool("route_operating_agents")
    def route_operating_agents_tool(
        stage: str = "",
        question: str = "",
        requested_agent_id: str = "",
        execution_mode: str = "stage_committee",
    ) -> str:
        """Preview the deterministic operating-agent route for a stage and question."""
        route = route_operating_agents(
            active_stage=stage or "design",
            question=question,
            requested_agent_id=requested_agent_id or None,
        execution_mode=execution_mode,
        operating_agents=operating_agents,
        trust_inspection=None,
    )
        return _envelope(
            tool_name="route_operating_agents",
            refs=[f"agent:{agent_id}" for agent_id in route["calledAgentIds"]],
            found=True,
            data=route,
        )

    @tool
    def retrieve_operating_asset(asset_ref: str, query: str = "") -> str:
        """Retrieve a single operating asset by asset ref and optional query."""
        normalized_ref = asset_ref if asset_ref.startswith("asset:") else f"asset:{asset_ref}"
        query_lower = query.lower()
        matches = [
            asset for asset in operating_assets
            if asset.get("ref") == normalized_ref or f"asset:{asset.get('id')}" == normalized_ref
        ]
        if query_lower:
            matches = [
                asset for asset in matches
                if query_lower in json.dumps(asset, ensure_ascii=False).lower()
            ]
        return _envelope(
            tool_name="retrieve_operating_asset",
            refs=[normalized_ref] if matches else [],
            found=bool(matches),
            data={"asset": matches[0] if matches else None, "assetRef": normalized_ref},
            warnings=[] if matches else ["asset_unavailable"],
        )

    @tool
    def retrieve_front_operating_system(query: str = "") -> str:
        """Retrieve the front operating system context: ICP, self-assessment, data gate, offers, approvals, and learning loop."""
        query_lower = query.lower()
        found = bool(front_context)
        if query_lower and query_lower not in json.dumps(front_context, ensure_ascii=False).lower():
            found = False
        return _envelope(
            tool_name="retrieve_front_operating_system",
            refs=_front_asset_refs(front_context) if found else [],
            found=found,
            data={"frontOperatingSystem": front_context if found else {}},
            warnings=[] if found else ["front_operating_system_unavailable"],
        )

    @tool
    def retrieve_front_operating_assets(query: str = "", owner: str = "") -> str:
        """Retrieve front operating assets such as ICP scorecard, data readiness checklist, and learning loop review."""
        query_lower = query.lower()
        owner_lower = owner.lower()
        matches = [
            asset for asset in front_assets
            if (not query_lower or query_lower in json.dumps(asset, ensure_ascii=False).lower())
            and (not owner_lower or owner_lower in json.dumps(asset, ensure_ascii=False).lower())
        ]
        refs = _front_asset_refs({"assets": matches})
        return _envelope(
            tool_name="retrieve_front_operating_assets",
            refs=refs,
            found=bool(matches),
            data={"assets": matches, "assetRefs": refs},
            warnings=[] if matches else ["front_operating_asset_unavailable"],
        )

    @tool
    def retrieve_front_operating_gate(gate_id: str = "") -> str:
        """Retrieve one front operating gate: lead_fit, self_assessment, data_readiness, offer_ladder, approval, or learning_loop."""
        gate, refs = front_gate(gate_id)
        found = bool(gate)
        return _envelope(
            tool_name="retrieve_front_operating_gate",
            refs=refs if found else [],
            found=found,
            data={"gateId": gate_id or "system", "gate": gate if found else {}},
            warnings=[] if found else ["front_operating_gate_unavailable"],
        )

    @tool
    def retrieve_learning_loop_records(query: str = "") -> str:
        """Retrieve recorded customer learning-loop rows. This is read-only and never mutates the backlog."""
        records = front_context.get("learningLoopRecords", [])
        if not isinstance(records, Sequence) or isinstance(records, (str, bytes)):
            records = []
        query_lower = query.lower()
        matches = [
            record for record in records
            if isinstance(record, Mapping)
            and (not query_lower or query_lower in json.dumps(record, ensure_ascii=False).lower())
        ]
        return _envelope(
            tool_name="retrieve_learning_loop_records",
            refs=["asset:learning_loop_review"] if matches else [],
            found=bool(matches),
            data={"learningLoopRecords": matches},
            warnings=[] if matches else ["learning_loop_unavailable"],
        )

    @tool
    def retrieve_provider_registry(provider_or_model: str = "") -> str:
        """Retrieve structured provider/model facts. This does not scrape or mutate docs."""
        needle = provider_or_model.lower()
        matches = [
            item for item in provider_registry
            if not needle or needle in json.dumps(item, ensure_ascii=False).lower()
        ]
        refs = [f"fact:{item.get('id')}" for item in matches if item.get("id")]
        return _envelope(
            tool_name="retrieve_provider_registry",
            refs=refs,
            found=bool(matches),
            data={"providerRegistry": matches},
            warnings=[] if matches else ["provider_registry_unavailable"],
        )

    @tool
    def retrieve_model_perf_matrix(task_type: str = "") -> str:
        """Retrieve model performance assumptions and eval-needed rows."""
        needle = task_type.lower()
        matches = [
            item for item in model_perf_matrix
            if not needle or needle in json.dumps(item, ensure_ascii=False).lower()
        ]
        refs = [f"asset:model_perf_matrix"]
        return _envelope(
            tool_name="retrieve_model_perf_matrix",
            refs=refs if matches else [],
            found=bool(matches),
            data={"modelPerfMatrix": matches},
            warnings=[] if matches else ["model_perf_matrix_unavailable"],
        )

    @tool
    def retrieve_operating_ledger(workstream: str = "") -> str:
        """Retrieve operating ledger rows by workstream. This is read-only."""
        needle = workstream.lower()
        matches = [
            item for item in operating_ledger
            if not needle or needle in json.dumps(item, ensure_ascii=False).lower()
        ]
        refs = [f"decision:{item.get('id')}" for item in matches if item.get("id")]
        return _envelope(
            tool_name="retrieve_operating_ledger",
            refs=refs,
            found=bool(matches),
            data={"operatingLedger": matches},
            warnings=[] if matches else ["operating_ledger_unavailable"],
        )

    @tool
    def retrieve_official_source_registry(provider_region: str = "") -> str:
        """Retrieve official source registry rows for provider/release monitoring."""
        needle = provider_region.lower()
        matches = [
            item for item in official_source_registry
            if not needle or needle in json.dumps(item, ensure_ascii=False).lower()
        ]
        refs = [f"source:{item.get('id')}" for item in matches if item.get("id")]
        return _envelope(
            tool_name="retrieve_official_source_registry",
            refs=refs,
            found=bool(matches),
            data={"officialSourceRegistry": matches},
            warnings=[] if matches else ["official_source_unavailable"],
        )

    @tool
    def retrieve_official_source_snippets(query: str = "", source_id: str = "") -> str:
        """Retrieve captured official source snippets for explanation. They never override structured facts."""
        needle = query.lower()
        source_filter = source_id.lower()
        matches = [
            item for item in official_source_snippets
            if (not needle or needle in json.dumps(item, ensure_ascii=False).lower())
            and (not source_filter or source_filter in str(item.get("sourceId", "")).lower())
        ]
        refs: list[str] = []
        for item in matches:
            if item.get("snippetId"):
                refs.append(str(item.get("snippetId")))
                continue
            item_refs = item.get("refs")
            if isinstance(item_refs, list):
                refs.extend(str(ref) for ref in item_refs if ref)
        return _envelope(
            tool_name="retrieve_official_source_snippets",
            refs=refs,
            found=bool(matches),
            data={"officialSourceSnippets": matches},
            warnings=[] if matches else ["official_source_snippet_unavailable"],
        )

    @tool
    def retrieve_p1_vector_rag_evidence(query: str = "") -> str:
        """Retrieve P1 RAG evidence across official docs, benchmark/risk evidence, and decision history. Read-only."""
        official_matches = [
            item for item in official_source_snippets
            if _matches_text(item, query)
        ]
        benchmark_matches = [
            item for item in benchmark_cards
            if _matches_text(item, query)
        ]
        risk_matches = [
            item for item in risk_cards
            if _matches_text(item, query)
        ]
        decision_matches = [
            item for item in decision_history
            if _matches_text(item, query)
        ]

        official_refs: list[str] = []
        for item in official_matches:
            if item.get("snippetId"):
                official_refs.append(str(item.get("snippetId")))
            else:
                official_refs.extend(str(ref) for ref in item.get("refs", []) if ref)
        benchmark_refs = [
            f"evidence:{item.get('evidenceId') or item.get('evidenceRef') or item.get('id')}"
            for item in benchmark_matches
            if item.get("evidenceId") or item.get("evidenceRef") or item.get("id")
        ]
        risk_refs = [
            f"risk:{item.get('id')}"
            for item in risk_matches
            if item.get("id")
        ]
        decision_refs = [
            f"decision:{item.get('id')}"
            for item in decision_matches
            if item.get("id")
        ]
        refs = _unique([*official_refs, *benchmark_refs, *risk_refs, *decision_refs])
        warnings = []
        if not benchmark_matches:
            warnings.append("baseline_unavailable")
        if not official_matches:
            warnings.append("official_docs_unavailable")
        if not decision_matches:
            warnings.append("decision_history_unavailable")

        return _envelope(
            tool_name="retrieve_p1_vector_rag_evidence",
            refs=refs,
            found=bool(refs),
            data={
                "mayOverrideFacts": False,
                "officialDocs": official_matches,
                "benchmarkEvidence": benchmark_matches,
                "riskEvidence": risk_matches,
                "decisionHistory": decision_matches,
            },
            warnings=warnings,
        )

    @tool
    def retrieve_model_release_candidates(
        model_owner: str = "",
        serving_provider: str = "",
        status: str = "",
    ) -> str:
        """Retrieve model release candidates detected by the official research watchtower."""
        owner = model_owner.lower()
        provider = serving_provider.lower()
        status_filter = status.lower()
        matches = [
            item for item in model_release_candidates
            if (not owner or owner in str(item.get("modelOwner", "")).lower())
            and (not provider or provider in str(item.get("servingProvider", "")).lower())
            and (not status_filter or status_filter in str(item.get("status", "")).lower())
        ]
        refs = [f"candidate:{item.get('candidateId')}" for item in matches if item.get("candidateId")]
        return _envelope(
            tool_name="retrieve_model_release_candidates",
            refs=refs,
            found=bool(matches),
            data={"modelReleaseCandidates": matches},
            warnings=[] if matches else ["model_release_candidate_unavailable"],
        )

    @tool
    def retrieve_pricing_fact_candidates(model_family: str = "", region: str = "") -> str:
        """Retrieve extracted pricing fact candidates before human Fact Ledger acceptance."""
        family = model_family.lower()
        region_filter = region.lower()
        matches = [
            item for item in pricing_fact_candidates
            if (not family or family in str(item.get("modelFamily", "")).lower())
            and (not region_filter or region_filter in json.dumps(item, ensure_ascii=False).lower())
        ]
        refs = [str(item.get("id")) for item in matches if item.get("id")]
        return _envelope(
            tool_name="retrieve_pricing_fact_candidates",
            refs=refs,
            found=bool(matches),
            data={"pricingFactCandidates": matches},
            warnings=[] if matches else ["pricing_fact_candidate_unavailable"],
        )

    @tool
    def retrieve_fx_rate_snapshot(currency: str, date: str = "") -> str:
        """Retrieve an explicit FX snapshot. If missing, native prices must remain unconverted."""
        needle = currency.upper()
        matches = [
            item for item in fx_rate_snapshots
            if str(item.get("base", "")).upper() == needle
            and (
                not date
                or not item.get("capturedAt")
                or date in str(item.get("capturedAt", ""))
            )
        ]
        warnings: list[str] = []
        if not matches:
            warnings.append("fx_snapshot_unavailable")
        elif any(item.get("rate") in {None, ""} for item in matches):
            warnings.append("manual_review_required")
        return _envelope(
            tool_name="retrieve_fx_rate_snapshot",
            refs=[f"fx:{item.get('base')}-{item.get('quote')}" for item in matches if item.get("base") and item.get("quote")],
            found=bool(matches),
            data={"fxRateSnapshots": matches},
            warnings=warnings,
        )

    @tool
    def compose_report_outline() -> str:
        """Return the required one-page report outline for the UI renderer."""
        return _envelope(
            tool_name="compose_report_outline",
            found=True,
            data={
                "sections": [
                    "AI team work ledger",
                    "Cost attribution",
                    "Margin and profitability",
                    "Waste and bottleneck flags",
                    "Optimization and risk",
                    "Decision log citations",
                ]
            },
        )

    tools = [
        lookup_snapshot_value,
        list_available_tool_refs,
        retrieve_threshold_policy,
        retrieve_metric_flags,
        retrieve_risk_cards,
        retrieve_benchmark_evidence,
        retrieve_decision_history,
        retrieve_fact_sources,
        retrieve_operating_assets,
        retrieve_operating_agent_profile,
        route_operating_agents_tool,
        retrieve_operating_asset,
        retrieve_front_operating_system,
        retrieve_front_operating_assets,
        retrieve_front_operating_gate,
        retrieve_learning_loop_records,
        retrieve_provider_registry,
        retrieve_model_perf_matrix,
        retrieve_operating_ledger,
        retrieve_official_source_registry,
        retrieve_official_source_snippets,
        retrieve_p1_vector_rag_evidence,
        retrieve_model_release_candidates,
        retrieve_pricing_fact_candidates,
        retrieve_fx_rate_snapshot,
        compose_report_outline,
    ]
    names = {item.name for item in tools}
    if names.intersection(FORBIDDEN_AGENT_TOOL_NAMES):
        raise ValueError("Agentic runtime cannot expose calculation or mutation tools")
    if allowed_tool_names is not None:
        return [item for item in tools if item.name in allowed_tool_names]
    return tools


def build_operating_agent_call_tools(payload: AgentRunInput):
    """Return 11 Agent-as-Tool callables for supervisor-style orchestration."""
    operating_agents = payload.operatingAgents or [
        {"id": agent_id, "label": agent_id.replace("_", " ").title(), "role": "Operating agent"}
        for agent_id in OPERATING_AGENT_IDS
    ]
    profiles = {str(agent.get("id")): agent for agent in operating_agents if agent.get("id")}

    def make_agent_tool(agent_id: str):
        profile = profiles.get(agent_id, {"id": agent_id, "label": agent_id, "role": "Operating agent"})
        allowed_tools = sorted(AGENT_TOOL_PERMISSION_MATRIX.get(agent_id, set()))

        def call_operating_agent(question: str = "") -> str:
            return _json({
                "agentId": agent_id,
                "label": profile.get("label", agent_id),
                "role": profile.get("role", ""),
                "question": question or payload.question,
                "allowedCapabilityTools": allowed_tools,
                "calledAgentTool": _agent_tool_name(agent_id),
            })

        call_operating_agent.__name__ = _agent_tool_name(agent_id)
        call_operating_agent.__doc__ = f"Call {profile.get('label', agent_id)} as a read-only operating agent."
        return tool(call_operating_agent)

    tools = [make_agent_tool(agent_id) for agent_id in OPERATING_AGENT_IDS]
    names = {item.name for item in tools}
    if names.intersection(FORBIDDEN_AGENT_TOOL_NAMES):
        raise ValueError("Operating agent tools cannot expose forbidden mutations")
    return tools


def _validate_grounding(response: AgentRunResponse, refs: list[str]) -> list[str]:
    warnings: list[str] = []
    texts = [response.answer, response.report, *(event.message for event in response.events)]
    for text in texts:
        if has_uncited_numeric_claim(text, refs):
            warnings.append("uncited numeric claim rejected")
            break
    return warnings


def _agent_system_prompt(agent_id: str, payload: AgentRunInput) -> str:
    profile = _agent_profile(agent_id, payload.operatingAgents)
    allowed = sorted(AGENT_TOOL_PERMISSION_MATRIX.get(agent_id, set()))
    return (
        f"{AGENT_SYSTEM_PROMPT}\n"
        f"You are operating as {profile.get('label', agent_id)} ({agent_id}). "
        f"Role: {profile.get('role', '')}. "
        f"Use only these capability tools: {', '.join(allowed)}. "
        "Return events with your agentId and usedCapabilityTools."
    )


def _annotate_agent_response(
    *,
    agent_id: str,
    response: AgentRunResponse,
    route: Mapping[str, Any],
    payload: AgentRunInput,
) -> AgentRunResponse:
    refs = _refs_from_tool_results(payload.toolResults)
    agent_tool = _agent_tool_name(agent_id)
    capability_tools = _unique([*response.usedTools])
    reviewer_ids = [item for item in route["reviewerAgentIds"] if item != agent_id]
    events = []
    source_events = response.events or [
        {
            "type": "analysis",
            "message": response.answer or f"{agent_id} response is grounded in {', '.join(refs) or 'deterministic snapshot'}.",
            "toolResultRefs": response.toolResultRefs or refs,
            "riskCardIds": response.riskCardIds,
            "usedTools": response.usedTools,
            "evidenceRefs": response.evidenceRefs,
            "assetRefs": response.assetRefs,
        }
    ]
    for event in source_events:
        event_model = event if isinstance(event, AgenticEvent) else AgenticEvent.model_validate(event)
        used_tools = _unique([*(event_model.usedTools or []), *capability_tools])
        events.append(event_model.model_copy(update={
            "agentId": event_model.agentId or agent_id,
            "calledAgentTool": event_model.calledAgentTool or agent_tool,
            "usedTools": used_tools,
            "usedCapabilityTools": event_model.usedCapabilityTools or used_tools,
            "reviewerAgentIds": event_model.reviewerAgentIds or reviewer_ids,
            "toolResultRefs": _unique([*refs, *(event_model.toolResultRefs or [])]),
            "assetRefs": event_model.assetRefs or _payload_asset_refs(payload),
        }))
    return response.model_copy(update={
        "events": events,
        "calledAgentIds": [agent_id],
        "primaryAgentId": agent_id,
        "reviewerAgentIds": reviewer_ids,
        "agentRoute": dict(route),
        "snapshotVersion": payload.snapshotVersion,
        "usedTools": capability_tools,
        "toolResultRefs": response.toolResultRefs or refs,
        "assetRefs": response.assetRefs or _payload_asset_refs(payload),
    })


def _run_single_operating_agent(
    *,
    agent_id: str,
    payload: AgentRunInput,
    route: Mapping[str, Any],
    model: Any,
    agent_factory: Callable[..., Any],
) -> AgentRunResponse:
    allowed = AGENT_TOOL_PERMISSION_MATRIX.get(agent_id, set())
    tools = build_agent_tools(
        tool_results=payload.toolResults,
        threshold_policy=payload.thresholdPolicy,
        metric_flags=payload.metricFlags,
        risk_cards=payload.riskCards,
        benchmark_cards=payload.benchmarkCards,
        decision_history=payload.decisionHistory,
        fact_sources=payload.factSources,
        operating_agents=payload.operatingAgents,
        operating_assets=payload.operatingAssets,
        provider_registry=payload.providerRegistry,
        model_perf_matrix=payload.modelPerfMatrix,
        operating_ledger=payload.operatingLedger,
        front_operating_system=payload.frontOperatingSystem,
        official_source_registry=payload.officialSourceRegistry,
        official_source_snippets=payload.officialSourceSnippets,
        model_release_candidates=payload.modelReleaseCandidates,
        pricing_fact_candidates=payload.pricingFactCandidates,
        fx_rate_snapshots=payload.fxRateSnapshots,
        allowed_tool_names=allowed,
    )
    agent = agent_factory(
        model=model,
        tools=tools,
        response_format=AgentRunResponse,
        system_prompt=_agent_system_prompt(agent_id, payload),
    )
    result = agent.invoke({
        "messages": [
            {
                "role": "user",
                "content": _json({
                    "mode": payload.mode,
                    "activeStage": payload.activeStage,
                    "executionMode": payload.executionMode,
                    "snapshotVersion": payload.snapshotVersion,
                    "agentId": agent_id,
                    "question": payload.question,
                    "availableToolRefs": _refs_from_tool_results(payload.toolResults),
                }),
            }
        ]
    })
    raw = result.get("structured_response", result) if isinstance(result, dict) else result
    response = raw if isinstance(raw, AgentRunResponse) else AgentRunResponse.model_validate(raw)
    return _annotate_agent_response(agent_id=agent_id, response=response, route=route, payload=payload)


def _synthesize_supervisor_fields(
    *,
    payload: AgentRunInput,
    route: Mapping[str, Any],
    responses: Sequence[AgentRunResponse],
    warnings: Sequence[str] = (),
) -> dict[str, Any]:
    refs = _refs_from_tool_results(payload.toolResults)
    primary = str(route["primaryAgentId"])
    reviewers = list(route["reviewerAgentIds"])
    warning_list = _unique([*warnings, *[warning for response in responses for warning in response.warnings]])
    missing_or_blocking = [
        warning for warning in warning_list
        if "missing" in warning or "unavailable" in warning or "uncited" in warning
    ]
    readiness = "blocked" if any("uncited" in warning for warning in warning_list) else (
        "needs_review" if missing_or_blocking or reviewers else "ready"
    )
    disagreements = [
        f"{reviewer} should review {primary}'s recommendation before adoption."
        for reviewer in reviewers
    ]
    next_questions = [
        "Which recommendation should a human approve, hold, or reject?",
        "Are the cited tool refs and risk cards sufficient for the Decision Log?",
    ]
    if missing_or_blocking:
        next_questions.insert(0, "Which missing snapshot, benchmark, or evidence ref should be added before adoption?")
    return {
        "supervisorSummary": (
            f"{primary} led {len(route['calledAgentIds'])} operating agent(s), "
            f"grounded in {', '.join(refs) or 'the deterministic snapshot'}."
        ),
        "disagreements": disagreements,
        "decisionReadiness": readiness,
        "nextQuestions": next_questions,
    }


def _merge_agent_responses(
    *,
    payload: AgentRunInput,
    route: Mapping[str, Any],
    responses: Sequence[AgentRunResponse],
) -> AgentRunResponse:
    refs = _refs_from_tool_results(payload.toolResults)
    events = [event for response in responses for event in response.events]
    used_tools = _unique([tool_name for response in responses for tool_name in response.usedTools])
    risk_ids = _unique([risk_id for response in responses for risk_id in response.riskCardIds])
    evidence_refs = _unique([ref for response in responses for ref in response.evidenceRefs])
    asset_refs = _unique([ref for response in responses for ref in response.assetRefs] or _payload_asset_refs(payload))
    primary_response = responses[0] if responses else AgentRunResponse()
    called_agent_ids = list(route["calledAgentIds"])
    supervisor = _synthesize_supervisor_fields(payload=payload, route=route, responses=responses)
    return AgentRunResponse(
        events=events,
        answer=primary_response.answer or f"Operating team answer is grounded in {', '.join(refs) or 'deterministic snapshot'}.",
        report="\n".join(response.report for response in responses if response.report) or primary_response.report,
        llmMode="provider-llm",
        **supervisor,
        calledAgentIds=called_agent_ids,
        primaryAgentId=route["primaryAgentId"],
        reviewerAgentIds=route["reviewerAgentIds"],
        agentRoute=dict(route),
        snapshotVersion=payload.snapshotVersion,
        usedTools=used_tools,
        toolResultRefs=_unique([*refs, *[ref for response in responses for ref in response.toolResultRefs]]),
        riskCardIds=risk_ids,
        decisionIds=_unique([decision_id for response in responses for decision_id in response.decisionIds]),
        evidenceRefs=evidence_refs,
        assetRefs=asset_refs,
        warnings=_unique([warning for response in responses for warning in response.warnings]),
    )


def run_agentic_runtime(
    payload: AgentRunInput,
    *,
    model=None,
    agent_factory: Callable[..., Any] = create_agent,
) -> AgentRunResponse:
    refs = _refs_from_tool_results(payload.toolResults)
    route = route_operating_agents(
        active_stage=payload.activeStage,
        question=payload.question,
        requested_agent_id=payload.requestedAgentId,
        execution_mode=payload.executionMode,
        operating_agents=payload.operatingAgents,
        trust_inspection=payload.trustInspection,
    )
    if model is None:
        return _fallback_response(payload)

    max_workers = min(3, max(1, len(route["calledAgentIds"])))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        responses = list(executor.map(
            lambda agent_id: _run_single_operating_agent(
                agent_id=agent_id,
                payload=payload,
                route=route,
                model=model,
                agent_factory=agent_factory,
            ),
            route["calledAgentIds"],
        ))

    response = _merge_agent_responses(payload=payload, route=route, responses=responses)
    warnings = _validate_grounding(response, refs)
    if warnings:
        return _fallback_response(payload, warnings)
    return response
