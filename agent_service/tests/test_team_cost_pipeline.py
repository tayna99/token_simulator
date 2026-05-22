from schemas import Analysis, TeamCostGraphEvent, TeamCostRunInput
from pipeline import run_team_cost_pipeline


class FakeInterpreter:
    def analyze_margin(self, facts, refs):
        return Analysis(headline="FAKE margin", explanation=f"Grounded in {refs[0]}")

    def pricing_comment(self, facts, refs):
        return Analysis(headline="FAKE pricing", explanation=f"Grounded in {refs[0]}")

    def team_cost_report(self, facts, refs, messages):
        return Analysis(headline="Python team report", explanation=f"Grounded in {refs[0]}")


def test_team_cost_pipeline_preserves_deterministic_events_and_appends_report():
    deterministic = TeamCostGraphEvent(
        type="tool_snapshot",
        message="TS deterministic snapshot",
        toolResultRefs=["tool:team.monthlyCostUsd"],
        riskCardIds=[],
        recommendationIds=[],
    )
    payload = TeamCostRunInput(
        workflowMode="optimize",
        deterministicEvents=[deterministic],
        toolResults={"team.monthlyCostUsd": 300},
    )

    events = run_team_cost_pipeline(payload, FakeInterpreter())

    assert events[0].message == "TS deterministic snapshot"
    assert events[-1].type == "report_draft"
    assert "Python team report" in events[-1].message
    assert events[-1].toolResultRefs == ["tool:team.monthlyCostUsd"]
