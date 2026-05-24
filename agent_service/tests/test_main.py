from fastapi.testclient import TestClient

import main
from schemas import Analysis


class FakeInterpreter:
    def __init__(self, api_key=None, model_name="fake"):
        self.api_key = api_key
        self.model_name = model_name

    def analyze_margin(self, facts, refs):
        return Analysis(headline="API margin", explanation=f"Grounded in {refs[0]}")

    def pricing_comment(self, facts, refs):
        return Analysis(headline="API pricing", explanation=f"Grounded in {refs[0]}")

    def team_cost_report(self, facts, refs, messages):
        return Analysis(headline="API team report", explanation=f"Grounded in {refs[0]}")


def test_health_endpoint():
    client = TestClient(main.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_agent_endpoint_contract(monkeypatch):
    monkeypatch.setattr(main, "Interpreter", FakeInterpreter)
    client = TestClient(main.app)

    response = client.post(
        "/api/agent",
        json={
            "toolResults": {"monthlyAiCogs": 4820, "grossMarginPct": 0.41},
            "riskCardIds": ["risk-credit"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert [event["type"] for event in body["events"]] == [
        "tool_snapshot",
        "analysis",
        "pricing_strategy",
        "risk_audit",
        "report_draft",
    ]


def test_team_cost_agent_endpoint_contract(monkeypatch):
    monkeypatch.setattr(main, "Interpreter", FakeInterpreter)
    client = TestClient(main.app)

    response = client.post(
        "/api/team-cost-agent",
        json={
            "apiKey": "test-key",
            "workflowMode": "optimize",
            "deterministicEvents": [
                {
                    "type": "tool_snapshot",
                    "message": "TS deterministic snapshot",
                    "toolResultRefs": ["tool:team.monthlyCostUsd"],
                    "riskCardIds": [],
                    "recommendationIds": [],
                }
            ],
            "toolResults": {"team.monthlyCostUsd": 300},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["llmMode"] == "provider-llm"
    assert body["events"][-1]["type"] == "report_draft"
    assert "API team report" in body["events"][-1]["message"]


def test_agent_run_endpoint_contract():
    client = TestClient(main.app)

    response = client.post(
        "/api/agent/run",
        json={
            "mode": "ask",
            "activeStage": "cost",
            "question": "What is breaking margin?",
            "toolResults": {"monthlyAiCogs": 4820},
            "riskCards": [{"id": "risk-model-routing-quality", "tags": ["routing"], "source": "risk:test"}],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["llmMode"] in ["deterministic-fallback", "provider-llm"]
    assert "tool:monthlyAiCogs" in body["toolResultRefs"]
    assert body["answer"]
