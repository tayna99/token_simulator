from scripts import smoke_provider
from schemas import AgentEvent, AgentRunResponse, AgentRunRuntimeProof


def test_smoke_provider_skips_without_live_flag(capsys):
    exit_code = smoke_provider.main({"OPENAI_API_KEY": "sk-test"})

    assert exit_code == 0
    assert "SKIP" in capsys.readouterr().out


def test_smoke_provider_skips_without_api_key(capsys):
    exit_code = smoke_provider.main({"AGENT_LIVE_TESTS": "1"})

    assert exit_code == 0
    assert "OPENAI_API_KEY" in capsys.readouterr().out


def test_smoke_provider_validates_event_order_and_grounding():
    events = [
        AgentEvent(type="tool_snapshot", message="Snapshot", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
        AgentEvent(type="analysis", message="Analysis cites tool:monthlyAiCogs.", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
        AgentEvent(type="pricing_strategy", message="Pricing cites tool:monthlyAiCogs.", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
        AgentEvent(type="risk_audit", message="Risk attached.", toolResultRefs=[], riskCardIds=["risk-credit"]),
        AgentEvent(type="report_draft", message="Report cites tool:monthlyAiCogs.", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=["risk-credit"]),
    ]

    smoke_provider.validate_smoke_events(events)


def test_smoke_provider_rejects_uncited_numeric_claims():
    events = [
        AgentEvent(type="tool_snapshot", message="Snapshot", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
        AgentEvent(type="analysis", message="This saves 38 percent.", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
        AgentEvent(type="pricing_strategy", message="Pricing cites tool:monthlyAiCogs.", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
        AgentEvent(type="risk_audit", message="Risk attached.", toolResultRefs=[], riskCardIds=[]),
        AgentEvent(type="report_draft", message="Report cites tool:monthlyAiCogs.", toolResultRefs=["tool:monthlyAiCogs"], riskCardIds=[]),
    ]

    try:
        smoke_provider.validate_smoke_events(events)
    except smoke_provider.SmokeValidationError as exc:
        assert "uncited numeric claim" in str(exc)
    else:
        raise AssertionError("Expected uncited numeric claim to fail smoke validation")


def test_agentic_smoke_validates_provider_stage_committee_grounding():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in tool:monthlyAiCogs.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
                "usedCapabilityTools": ["lookup_snapshot_value"],
            }
        ],
        answer="Cost review is grounded in tool:monthlyAiCogs.",
        report="Report is grounded in tool:monthlyAiCogs.",
        llmMode="provider-llm",
        runtime=AgentRunRuntimeProof(
            status="provider_llm",
            providerRunId="agent-service:snapshot:smoke:cost_modeling",
            agentInvocationProof=["call_cost_modeling_agent"],
        ),
        calledAgentIds=["cost_modeling"],
        primaryAgentId="cost_modeling",
        reviewerAgentIds=[],
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    smoke_provider.validate_agentic_provider_smoke_response(response)


def test_agentic_smoke_rejects_provider_response_without_tool_refs():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in the snapshot.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": [],
                "riskCardIds": [],
            }
        ],
        answer="Cost review is grounded in tool:monthlyAiCogs.",
        report="Report is grounded in tool:monthlyAiCogs.",
        llmMode="provider-llm",
        runtime=AgentRunRuntimeProof(
            status="provider_llm",
            providerRunId="agent-service:snapshot:smoke:cost_modeling",
            agentInvocationProof=["call_cost_modeling_agent"],
        ),
        calledAgentIds=["cost_modeling"],
        primaryAgentId="cost_modeling",
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "missing tool refs" in str(exc)
    else:
        raise AssertionError("Expected missing event refs to fail agentic smoke validation")


def test_agentic_smoke_rejects_uncited_numeric_provider_claims():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "This saves 38 percent.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
            }
        ],
        answer="Cost review is grounded in tool:monthlyAiCogs.",
        report="Report is grounded in tool:monthlyAiCogs.",
        llmMode="provider-llm",
        runtime=AgentRunRuntimeProof(
            status="provider_llm",
            providerRunId="agent-service:snapshot:smoke:cost_modeling",
            agentInvocationProof=["call_cost_modeling_agent"],
        ),
        calledAgentIds=["cost_modeling"],
        primaryAgentId="cost_modeling",
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "uncited numeric claim" in str(exc)
    else:
        raise AssertionError("Expected uncited provider claim to fail agentic smoke validation")


def test_agentic_smoke_validates_all_hands_fallback_route_refs():
    response = AgentRunResponse(
        events=[
            {
                "type": "runtime_unavailable",
                "message": "Agent runtime unavailable; deterministic preview is grounded in tool:monthlyAiCogs.",
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
            }
        ],
        llmMode="deterministic-fallback",
        runtime=AgentRunRuntimeProof(status="unavailable", fallbackReason="provider_unavailable"),
        agentRoute={
            "executionMode": "all_hands",
            "routedAgentIds": [
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
            ],
            "calledAgentIds": [],
            "previewOnly": True,
        },
        snapshotVersion="snapshot:all-hands-smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    smoke_provider.validate_agentic_all_hands_fallback_response(response)
