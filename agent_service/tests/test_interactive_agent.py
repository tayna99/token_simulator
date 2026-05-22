import json

from interactive_agent import (
    FORBIDDEN_CALCULATION_TOOL_NAMES,
    READ_ONLY_TOOL_NAMES,
    assert_grounded_interactive_answer,
    build_interactive_tools,
)


def _tool_by_name(tools, name):
    return next(tool for tool in tools if tool.name == name)


def test_interactive_agent_tool_catalog_excludes_calculation_tools():
    tools = build_interactive_tools(
        snapshot={"tool:monthlyAiCogs": "4820"},
        risk_cards=[],
        decision_history=[],
    )
    names = {tool.name for tool in tools}

    assert names == set(READ_ONLY_TOOL_NAMES)
    assert names.isdisjoint(FORBIDDEN_CALCULATION_TOOL_NAMES)


def test_retrieve_risk_cards_returns_id_and_source():
    tools = build_interactive_tools(
        snapshot={},
        risk_cards=[
            {
                "id": "risk-credit-confusion",
                "title": "Credit confusion",
                "tags": ["credit"],
                "source": "risk-corpus:test",
            }
        ],
        decision_history=[],
    )

    result = json.loads(_tool_by_name(tools, "retrieve_risk_cards").invoke({"tags": ["credit"]}))

    assert result["cards"][0]["id"] == "risk-credit-confusion"
    assert result["cards"][0]["source"] == "risk-corpus:test"


def test_lookup_snapshot_value_returns_only_existing_tool_ref_values():
    tools = build_interactive_tools(
        snapshot={"tool:grossMarginPct": "0.41"},
        risk_cards=[],
        decision_history=[],
    )

    found = json.loads(_tool_by_name(tools, "lookup_snapshot_value").invoke({"tool_ref": "tool:grossMarginPct"}))
    missing = json.loads(_tool_by_name(tools, "lookup_snapshot_value").invoke({"tool_ref": "tool:missing"}))

    assert found == {"found": True, "toolRef": "tool:grossMarginPct", "value": "0.41"}
    assert missing == {"found": False, "toolRef": "tool:missing"}


def test_interactive_answer_rejects_numbers_without_tool_refs():
    try:
        assert_grounded_interactive_answer("This saves 38 percent.", ["tool:grossMarginPct"])
    except ValueError as exc:
        assert "uncited numeric claim" in str(exc)
    else:
        raise AssertionError("Expected uncited numeric claim to be rejected")

    assert_grounded_interactive_answer("This saves 38 percent according to tool:grossMarginPct.", ["tool:grossMarginPct"])
