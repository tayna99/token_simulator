import json

import pytest

from middleware import (
    LangChainRuntimeContext,
    PayloadSecretBlocked,
    ToolCallBlocked,
    filter_tools_for_runtime_context,
    inspect_payload_for_secrets,
    invoke_tool_with_guardrails,
    raise_if_payload_blocked,
)
from schemas import AgentRunInput


class RecordingTool:
    def __init__(self, name, result=None):
        self.name = name
        self.calls = []
        self.result = result or {
            "toolName": name,
            "refs": ["tool:monthlyAiCogs"],
            "found": True,
            "data": {"value": "4820"},
            "warnings": [],
        }

    def invoke(self, payload):
        self.calls.append(payload)
        return json.dumps(self.result)


def test_runtime_context_filters_tools_to_allowed_read_only_set():
    context = LangChainRuntimeContext(
        agentId="cost_modeling",
        calledAgentTool="call_cost_modeling_agent",
        snapshotVersion="snapshot:test",
        allowedToolNames=("lookup_snapshot_value", "retrieve_threshold_policy", "calculate_cost"),
        toolResultRefs=("tool:monthlyAiCogs",),
        executionMode="stage_committee",
        runtimeRole="operating_agent",
    )
    tools = [
        RecordingTool("lookup_snapshot_value"),
        RecordingTool("calculate_cost"),
        RecordingTool("send_email"),
        RecordingTool("retrieve_threshold_policy"),
    ]

    filtered = filter_tools_for_runtime_context(tools, context)

    assert [tool.name for tool in filtered] == [
        "lookup_snapshot_value",
        "retrieve_threshold_policy",
    ]


def test_runtime_context_defaults_to_most_restrictive_when_missing():
    tools = [
        RecordingTool("lookup_snapshot_value"),
        RecordingTool("retrieve_threshold_policy"),
    ]

    assert filter_tools_for_runtime_context(tools, None) == []
    with pytest.raises(ToolCallBlocked, match="runtime context"):
        invoke_tool_with_guardrails(tools[0], {"tool_ref": "tool:monthlyAiCogs"}, context=None)
    assert tools[0].calls == []


def test_forbidden_tool_call_is_blocked_before_handler():
    context = LangChainRuntimeContext(
        agentId="cost_modeling",
        calledAgentTool="call_cost_modeling_agent",
        snapshotVersion="snapshot:test",
        allowedToolNames=("lookup_snapshot_value", "calculate_cost"),
        toolResultRefs=("tool:monthlyAiCogs",),
        executionMode="stage_committee",
        runtimeRole="operating_agent",
    )
    forbidden = RecordingTool("calculate_cost")

    with pytest.raises(ToolCallBlocked, match="calculate_cost"):
        invoke_tool_with_guardrails(forbidden, {"input_tokens": 10_000}, context=context)

    assert forbidden.calls == []


def test_allowed_tool_call_preserves_envelope_and_refs():
    context = LangChainRuntimeContext(
        agentId="cost_modeling",
        calledAgentTool="call_cost_modeling_agent",
        snapshotVersion="snapshot:test",
        allowedToolNames=("lookup_snapshot_value",),
        toolResultRefs=("tool:monthlyAiCogs",),
        executionMode="stage_committee",
        runtimeRole="operating_agent",
    )
    allowed = RecordingTool("lookup_snapshot_value")

    result = json.loads(
        invoke_tool_with_guardrails(
            allowed,
            {"tool_ref": "tool:monthlyAiCogs"},
            context=context,
        )
    )

    assert allowed.calls == [{"tool_ref": "tool:monthlyAiCogs"}]
    assert result == {
        "toolName": "lookup_snapshot_value",
        "refs": ["tool:monthlyAiCogs"],
        "found": True,
        "data": {"value": "4820"},
        "warnings": [],
    }


def test_payload_secret_guard_blocks_provider_invocation():
    payload = AgentRunInput(
        question="Can you inspect this key sk-live-secret-1234567890 before analysis?",
        toolResults={"monthlyAiCogs": 4820},
    )

    decision = inspect_payload_for_secrets(payload)

    assert decision.allowed is False
    assert decision.fallbackReason == "guardrail_rejected"
    assert "secret_like_text" in decision.warnings
    with pytest.raises(PayloadSecretBlocked, match="secret_like_text"):
        raise_if_payload_blocked(payload)
