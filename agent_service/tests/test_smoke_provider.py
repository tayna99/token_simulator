from scripts import smoke_provider
from schemas import AgentEvent, AgentRunCheckpoint, AgentRunResponse, AgentRunRuntimeProof


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
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        reviewerAgentIds=[],
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    smoke_provider.validate_agentic_provider_smoke_response(response)


def test_agentic_smoke_validates_provider_resumed_runtime_proof():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Resumed cost review is grounded in tool:monthlyAiCogs.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
                "usedCapabilityTools": ["lookup_snapshot_value"],
            }
        ],
        answer="Resumed cost review is grounded in tool:monthlyAiCogs.",
        report="Resumed report is grounded in tool:monthlyAiCogs.",
        llmMode="provider-llm",
        runtime=AgentRunRuntimeProof(
            status="resumed",
            providerRunId="agent-service:snapshot:resume:cost_modeling",
            agentInvocationProof=["call_cost_modeling_agent"],
            checkpoint=AgentRunCheckpoint(
                persistence="memory",
                threadId="thread-resume-smoke",
                checkpointNamespace="agentpayroll",
                checkpointId="checkpoint-resume-smoke",
                status="resumed",
                reason="resume_approved",
            ),
        ),
        calledAgentIds=["cost_modeling"],
        primaryAgentId="cost_modeling",
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:resume",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    smoke_provider.validate_agentic_provider_smoke_response(response)


def test_agentic_smoke_validates_provider_interrupt_runtime_proof_before_agent_calls():
    response = AgentRunResponse(
        events=[
            {
                "type": "interrupt_requested",
                "message": "Human approval is required before delegated operating agents run.",
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
            }
        ],
        answer="Paused for human approval before delegated operating agent tools run.",
        report="Checkpoint interrupt requested; no delegated operating agent result has been executed yet.",
        llmMode="provider-llm",
        runtime=AgentRunRuntimeProof(
            status="interrupt_requested",
            agentInvocationProof=[],
            checkpoint=AgentRunCheckpoint(
                persistence="memory",
                threadId="thread-interrupt-smoke",
                checkpointNamespace="agentpayroll",
                checkpointId="checkpoint-interrupt-smoke",
                interruptId="interrupt-smoke",
                status="interrupt_requested",
                reason="approval_required_before_operating_agent_tools",
            ),
        ),
        calledAgentIds=[],
        primaryAgentId=None,
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": [],
            "checkpointInterrupted": True,
        },
        snapshotVersion="snapshot:interrupt",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    smoke_provider.validate_agentic_provider_smoke_response(response)


def test_agentic_smoke_rejects_provider_response_without_stage_committee_route():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in tool:monthlyAiCogs.",
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
        agentRoute={"executionMode": "all_hands", "calledAgentIds": ["cost_modeling"]},
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "stage_committee" in str(exc)
    else:
        raise AssertionError("Expected non-stage-committee provider route to fail validation")


def test_agentic_smoke_rejects_provider_response_that_drops_event_tool_refs():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in tool:grossMarginPct.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": ["tool:grossMarginPct"],
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
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "preserve tool refs" in str(exc)
    else:
        raise AssertionError("Expected dropped event tool refs to fail validation")


def test_agentic_smoke_rejects_non_tool_result_refs():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in source:pricing.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": ["source:pricing"],
                "riskCardIds": [],
            }
        ],
        answer="Cost review is grounded in source:pricing.",
        report="Report is grounded in source:pricing.",
        llmMode="provider-llm",
        runtime=AgentRunRuntimeProof(
            status="provider_llm",
            providerRunId="agent-service:snapshot:smoke:cost_modeling",
            agentInvocationProof=["call_cost_modeling_agent"],
        ),
        calledAgentIds=["cost_modeling"],
        primaryAgentId="cost_modeling",
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["source:pricing"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "tool:* refs" in str(exc)
    else:
        raise AssertionError("Expected non-tool refs to fail validation")


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
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
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
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "uncited numeric claim" in str(exc)
    else:
        raise AssertionError("Expected uncited provider claim to fail agentic smoke validation")


def test_agentic_smoke_rejects_forbidden_capability_tool_names():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in tool:monthlyAiCogs.",
                "agentId": "cost_modeling",
                "calledAgentTool": "call_cost_modeling_agent",
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
                "usedTools": ["calculate_cost"],
                "usedCapabilityTools": ["calculate_cost"],
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
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
        usedTools=["calculate_cost"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "forbidden" in str(exc)
    else:
        raise AssertionError("Expected forbidden capability tools to fail agentic smoke validation")


def test_agentic_smoke_rejects_top_level_forbidden_capability_tool_claims():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in tool:monthlyAiCogs.",
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
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    ).model_copy(update={"usedCapabilityTools": ["send_email", "charge_billing"]})

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "forbidden" in str(exc)
        assert "charge_billing" in str(exc)
        assert "send_email" in str(exc)
    else:
        raise AssertionError("Expected top-level forbidden capability tools to fail agentic smoke validation")


def test_agentic_smoke_requires_provider_status_for_provider_mode():
    response = AgentRunResponse(
        events=[
            {
                "type": "analysis",
                "message": "Cost pressure is grounded in tool:monthlyAiCogs.",
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
            status="deterministic_preview",
            providerRunId=None,
            agentInvocationProof=["call_cost_modeling_agent"],
        ),
        calledAgentIds=["cost_modeling"],
        primaryAgentId="cost_modeling",
        agentRoute={
            "executionMode": "stage_committee",
            "routedAgentIds": ["cost_modeling"],
            "calledAgentIds": ["cost_modeling"],
        },
        snapshotVersion="snapshot:smoke",
        toolResultRefs=["tool:monthlyAiCogs"],
    )

    try:
        smoke_provider.validate_agentic_provider_smoke_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "provider_llm runtime" in str(exc)
    else:
        raise AssertionError("Expected preview-like provider response to fail validation")


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


def test_agentic_smoke_rejects_all_hands_fallback_that_drops_event_refs():
    response = AgentRunResponse(
        events=[
            {
                "type": "runtime_unavailable",
                "message": "Agent runtime unavailable; deterministic preview is grounded in tool:grossMarginPct.",
                "toolResultRefs": ["tool:grossMarginPct"],
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

    try:
        smoke_provider.validate_agentic_all_hands_fallback_response(response)
    except smoke_provider.SmokeValidationError as exc:
        assert "preserve tool refs" in str(exc)
    else:
        raise AssertionError("Expected dropped fallback event refs to fail validation")
