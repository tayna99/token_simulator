from schemas import Analysis, RunInput
from pipeline import run_pipeline


class FakeInterpreter:
    def analyze_margin(self, facts, refs):
        return Analysis(headline="FAKE margin", explanation=f"Grounded in {refs[0]}")

    def pricing_comment(self, facts, refs):
        return Analysis(headline="FAKE pricing", explanation=f"Grounded in {refs[0]}")

    def team_cost_report(self, facts, refs, messages):
        return Analysis(headline="FAKE team report", explanation=f"Grounded in {refs[0]}")


def test_pipeline_order_and_tool_refs():
    payload = RunInput(
        toolResults={"monthlyAiCogs": 4820, "grossMarginPct": 0.41},
        riskCardIds=["risk-credit"],
    )

    events = run_pipeline(payload, FakeInterpreter())

    assert [event.type for event in events] == [
        "tool_snapshot",
        "analysis",
        "pricing_strategy",
        "risk_audit",
        "report_draft",
    ]
    assert "tool:monthlyAiCogs" in events[1].toolResultRefs
    assert events[3].riskCardIds == ["risk-credit"]
