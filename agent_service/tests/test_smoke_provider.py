from scripts import smoke_provider
from schemas import AgentEvent


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
