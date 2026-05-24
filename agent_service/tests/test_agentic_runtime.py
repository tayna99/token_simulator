import json

from schemas import AgentRunInput
from agentic_runtime import (
    AGENT_TOOL_PERMISSION_MATRIX,
    FORBIDDEN_AGENT_TOOL_NAMES,
    build_agent_tools,
    build_operating_agent_call_tools,
    route_operating_agents,
    run_agentic_runtime,
)


OPERATING_AGENTS = [
    {"id": "provider_api_intelligence", "label": "Provider & API Intelligence Agent", "role": "Official pricing", "ownedAssetIds": ["provider_registry"]},
    {"id": "model_inference_research", "label": "Model & Inference Research Agent", "role": "Model fit", "ownedAssetIds": ["model_perf_matrix"]},
    {"id": "cost_modeling", "label": "Cost Modeling Agent", "role": "Cost formula", "ownedAssetIds": ["cost_formula_registry"]},
    {"id": "usage_data_ingestion", "label": "Usage Data Ingestion Agent", "role": "Usage import", "ownedAssetIds": ["usage_schema_mapping"]},
    {"id": "cost_engine_qa", "label": "Cost Engine / QA Agent", "role": "Snapshot QA", "ownedAssetIds": ["calculation_snapshots"]},
    {"id": "optimization_routing", "label": "Optimization & Routing Agent", "role": "Optimization", "ownedAssetIds": ["optimization_playbook"]},
    {"id": "customer_diagnostic_pricing", "label": "Customer Diagnostic / Pricing Agent", "role": "Customer margin", "ownedAssetIds": ["customer_cost_review"]},
    {"id": "pricing_revenue_ops", "label": "Pricing & Revenue Ops Agent", "role": "Pricing policy", "ownedAssetIds": ["pricing_policy_library"]},
    {"id": "trust_security_compliance", "label": "Trust / Security / Compliance Agent", "role": "Security review", "ownedAssetIds": ["security_runbook"]},
    {"id": "finance_ops", "label": "Finance Ops Agent", "role": "Finance operations", "ownedAssetIds": ["operating_ledger"]},
    {"id": "knowledge_release_ops", "label": "Knowledge & Release Ops Agent", "role": "Operating ledger", "ownedAssetIds": ["operating_ledger"]},
]


class FakeAgent:
    def __init__(self):
        self.invocations = []

    def invoke(self, payload):
        self.invocations.append(payload)
        return {
            "structured_response": {
                "events": [
                    {
                        "type": "analysis",
                        "message": "Margin pressure is grounded in tool:monthlyAiCogs.",
                        "toolResultRefs": ["tool:monthlyAiCogs"],
                        "riskCardIds": ["risk-model-routing-quality"],
                        "usedTools": ["lookup_snapshot_value"],
                        "evidenceRefs": ["evidence:benchmark-v0"],
                    }
                ],
                "answer": "The expensive surface is grounded in tool:monthlyAiCogs.",
                "report": "CEO/CFO one-pager grounded in tool:monthlyAiCogs.",
                "usedTools": ["lookup_snapshot_value"],
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": ["risk-model-routing-quality"],
                "decisionIds": [],
                "evidenceRefs": ["evidence:benchmark-v0"],
                "warnings": [],
            }
        }


def test_agent_tool_registry_is_read_only_and_extensible():
    tools = build_agent_tools(
        tool_results={"monthlyAiCogs": 4820},
        threshold_policy={"gross_margin_thin_pct": {"currentValue": 0.4}},
        metric_flags=[],
        risk_cards=[],
        benchmark_cards=[],
        decision_history=[],
        fact_sources=[],
        operating_agents=OPERATING_AGENTS,
        operating_assets=[{"id": "provider_registry", "ownerAgentId": "provider_api_intelligence"}],
        provider_registry=[{"id": "gpt-5-mini", "sourceUrl": "https://openai.com/api/pricing/"}],
        model_perf_matrix=[{"taskType": "classification", "modelId": "gpt-5-mini", "qualityBasis": "assumption"}],
        operating_ledger=[{"id": "decision-provider", "workstream": "Provider Registry"}],
        official_source_snippets=[{"snippetId": "source:zai-pricing#glm-5", "sourceId": "zai-pricing", "text": "GLM-5 input price", "refs": ["source:zai-pricing"]}],
        front_operating_system={
            "assets": [{"id": "icp_scorecard", "ref": "asset:icp_scorecard", "owner": "operator"}],
            "dataReadinessGate": {"acceptedColumns": ["timestamp", "customer_id"], "rejectedColumns": ["raw_prompt"]},
            "offerLadder": [{"id": "ai_cost_snapshot", "label": "AI Cost Snapshot"}],
            "learningLoopRecords": [{"id": "learning-1", "customerId": "cust_1"}],
        },
    )
    names = {tool.name for tool in tools}

    assert "lookup_snapshot_value" in names
    assert "retrieve_risk_cards" in names
    assert "retrieve_decision_history" in names
    assert "retrieve_operating_assets" in names
    assert "retrieve_provider_registry" in names
    assert "retrieve_model_perf_matrix" in names
    assert "retrieve_operating_ledger" in names
    assert "retrieve_official_source_registry" in names
    assert "retrieve_model_release_candidates" in names
    assert "retrieve_pricing_fact_candidates" in names
    assert "retrieve_fx_rate_snapshot" in names
    assert "retrieve_official_source_snippets" in names
    assert "retrieve_operating_agent_profile" in names
    assert "route_operating_agents" in names
    assert "retrieve_operating_asset" in names
    assert "retrieve_front_operating_system" in names
    assert "retrieve_front_operating_assets" in names
    assert "retrieve_front_operating_gate" in names
    assert "retrieve_learning_loop_records" in names
    assert names.isdisjoint(FORBIDDEN_AGENT_TOOL_NAMES)


def test_capability_tools_return_grounded_envelopes():
    tools = {
        tool.name: tool for tool in build_agent_tools(
            tool_results={"monthlyAiCogs": 4820},
            threshold_policy={"gross_margin_thin_pct": {"currentValue": 0.4}},
            metric_flags=[{"metricId": "gross_margin", "basisRef": "basis:rule:gross_margin_thin_pct"}],
            risk_cards=[{"id": "risk-model-routing-quality", "tags": ["routing"], "source": "risk:test"}],
            benchmark_cards=[],
            decision_history=[{"id": "decision-1", "what": "Adopt credit pricing"}],
            fact_sources=[{"id": "fact-openai", "sourceUrl": "https://openai.com/api/pricing/"}],
            operating_agents=OPERATING_AGENTS,
            operating_assets=[{"id": "provider_registry", "ref": "asset:provider_registry"}],
        provider_registry=[{"id": "gpt-5-mini", "sourceUrl": "https://openai.com/api/pricing/"}],
        model_perf_matrix=[{"taskType": "classification", "modelId": "gpt-5-mini", "qualityBasis": "assumption"}],
        operating_ledger=[{"id": "ledger-1", "workstream": "Provider Registry"}],
        official_source_registry=[{"id": "zai-pricing", "modelOwner": "zai_glm", "pricingRegion": "global"}],
        model_release_candidates=[{"candidateId": "zai:glm:z-ai:global", "modelOwner": "zai_glm", "servingProvider": "z_ai", "status": "needs_pricing_review"}],
        pricing_fact_candidates=[{"id": "fact:zai-glm-5", "modelFamily": "glm", "region": "global"}],
        fx_rate_snapshots=[{"base": "CNY", "quote": "USD", "rate": None, "source": "manual_review_required"}],
        official_source_snippets=[{"snippetId": "source:zai-pricing#glm-5", "sourceId": "zai-pricing", "text": "GLM-5 input price", "refs": ["source:zai-pricing"]}],
    )
    }

    snapshot = json.loads(tools["lookup_snapshot_value"].invoke({"tool_ref": "monthlyAiCogs"}))
    risk = json.loads(tools["retrieve_risk_cards"].invoke({"query": "routing", "tags": ["routing"]}))
    benchmark = json.loads(tools["retrieve_benchmark_evidence"].invoke({"query": "missing", "tags": ["peer"]}))
    official_sources = json.loads(tools["retrieve_official_source_registry"].invoke({"provider_region": "global"}))
    official_snippets = json.loads(tools["retrieve_official_source_snippets"].invoke({"query": "GLM-5"}))
    release_candidates = json.loads(tools["retrieve_model_release_candidates"].invoke({"model_owner": "zai_glm", "serving_provider": "z_ai", "status": "needs_pricing_review"}))
    fx_snapshot = json.loads(tools["retrieve_fx_rate_snapshot"].invoke({"currency": "CNY", "date": "2026-05-24"}))

    assert snapshot == {
        "toolName": "lookup_snapshot_value",
        "refs": ["tool:monthlyAiCogs"],
        "found": True,
        "data": {"toolRef": "tool:monthlyAiCogs", "value": "4820"},
        "warnings": [],
    }
    assert risk["toolName"] == "retrieve_risk_cards"
    assert risk["refs"] == ["risk:risk-model-routing-quality"]
    assert risk["found"] is True
    assert benchmark["toolName"] == "retrieve_benchmark_evidence"
    assert benchmark["found"] is False
    assert "baseline_unavailable" in benchmark["warnings"]
    assert official_sources["refs"] == ["source:zai-pricing"]
    assert official_snippets["refs"] == ["source:zai-pricing#glm-5"]
    assert release_candidates["refs"] == ["candidate:zai:glm:z-ai:global"]
    assert "manual_review_required" in fx_snapshot["warnings"]


def test_front_operating_tools_expose_customer_selection_and_learning_assets():
    tools = {
        tool.name: tool for tool in build_agent_tools(
            tool_results={"monthlyAiCogs": 4820},
            threshold_policy={},
            metric_flags=[],
            risk_cards=[],
            benchmark_cards=[],
            decision_history=[],
            fact_sources=[],
            operating_agents=OPERATING_AGENTS,
            operating_assets=[],
            front_operating_system={
                "assets": [
                    {"id": "icp_scorecard", "ref": "asset:icp_scorecard", "owner": "operator"},
                    {"id": "data_readiness_checklist", "ref": "asset:data_readiness_checklist", "owner": "trust_review"},
                    {"id": "learning_loop_review", "ref": "asset:learning_loop_review", "owner": "knowledge_ops"},
                ],
                "leadFitRules": {"grades": ["A", "B", "C"], "nextActions": ["AI Cost Snapshot", "Data Readiness Check"]},
                "selfAssessment": {"questionCount": 8, "result": "snapshot_ready"},
                "dataReadinessGate": {
                    "acceptedColumns": ["timestamp", "customer_id", "feature"],
                    "rejectedColumns": ["raw_prompt", "api_key"],
                    "availableAnalysis": ["feature_cost", "customer_cost"],
                },
                "offerLadder": [{"id": "ai_cost_snapshot", "label": "AI Cost Snapshot"}],
                "approvalGates": [{"id": "final_numbers", "required": True}],
                "learningLoopRecords": [{"id": "learning-1", "customerId": "cust_1", "productizableWork": ["schema mapping"]}],
            },
        )
    }

    system = json.loads(tools["retrieve_front_operating_system"].invoke({"query": "snapshot"}))
    assets = json.loads(tools["retrieve_front_operating_assets"].invoke({"query": "readiness"}))
    gate = json.loads(tools["retrieve_front_operating_gate"].invoke({"gate_id": "data_readiness"}))
    learning = json.loads(tools["retrieve_learning_loop_records"].invoke({"query": "schema"}))

    assert system["toolName"] == "retrieve_front_operating_system"
    assert "asset:icp_scorecard" in system["refs"]
    assert "asset:data_readiness_checklist" in system["refs"]
    assert assets["refs"] == ["asset:data_readiness_checklist"]
    assert gate["data"]["gate"]["rejectedColumns"] == ["raw_prompt", "api_key"]
    assert learning["refs"] == ["asset:learning_loop_review"]
    assert learning["data"]["learningLoopRecords"][0]["customerId"] == "cust_1"


def test_agent_tool_permission_matrix_keeps_calculation_tools_out():
    assert set(AGENT_TOOL_PERMISSION_MATRIX) == {agent["id"] for agent in OPERATING_AGENTS}
    for allowed_tools in AGENT_TOOL_PERMISSION_MATRIX.values():
        assert set(allowed_tools).isdisjoint(FORBIDDEN_AGENT_TOOL_NAMES)
    assert "retrieve_front_operating_system" in AGENT_TOOL_PERMISSION_MATRIX["usage_data_ingestion"]
    assert "retrieve_front_operating_gate" in AGENT_TOOL_PERMISSION_MATRIX["trust_security_compliance"]
    assert "retrieve_learning_loop_records" in AGENT_TOOL_PERMISSION_MATRIX["knowledge_release_ops"]


def test_stage_router_supports_committee_single_agent_and_all_hands():
    cost_route = route_operating_agents(
        active_stage="cost",
        question="What is breaking margin?",
        execution_mode="stage_committee",
    )
    assert cost_route["primaryAgentId"] == "cost_modeling"
    assert cost_route["reviewerAgentIds"] == ["cost_engine_qa", "finance_ops"]
    assert cost_route["calledAgentIds"] == ["cost_modeling", "cost_engine_qa", "finance_ops"]

    single_route = route_operating_agents(
        active_stage="cost",
        question="Review the import mapping",
        requested_agent_id="usage_data_ingestion",
        execution_mode="single_agent",
    )
    assert single_route["calledAgentIds"] == ["usage_data_ingestion"]
    assert single_route["primaryAgentId"] == "usage_data_ingestion"

    all_hands_route = route_operating_agents(
        active_stage="optimize",
        question="Run full operating review",
        execution_mode="all_hands",
    )
    assert all_hands_route["primaryAgentId"] == "optimization_routing"
    assert len(all_hands_route["calledAgentIds"]) == 11


def test_stage_router_prioritizes_trust_agent_for_blocked_imports():
    route = route_operating_agents(
        active_stage="design",
        question="Can we analyze this customer export?",
        execution_mode="stage_committee",
        trust_inspection={
            "status": "blocked",
            "warnings": ["raw_prompt_detected"],
            "allowedForSnapshot": False,
        },
    )

    assert route["primaryAgentId"] == "trust_security_compliance"
    assert route["calledAgentIds"] == [
        "trust_security_compliance",
        "usage_data_ingestion",
        "cost_engine_qa",
    ]


def test_operating_agent_call_tools_are_registered_for_all_11_agents():
    tools = build_operating_agent_call_tools(
        AgentRunInput(
            activeStage="optimize",
            question="Run operating review",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
        )
    )
    names = {tool.name for tool in tools}

    assert names == {
        "call_provider_api_intelligence_agent",
        "call_model_inference_research_agent",
        "call_cost_modeling_agent",
        "call_usage_data_ingestion_agent",
        "call_cost_engine_qa_agent",
        "call_optimization_routing_agent",
        "call_customer_diagnostic_pricing_agent",
        "call_pricing_revenue_ops_agent",
        "call_trust_security_compliance_agent",
        "call_finance_ops_agent",
        "call_knowledge_release_ops_agent",
    }


def test_agentic_runtime_uses_create_agent_path_with_structured_response():
    fake_agent = FakeAgent()

    result = run_agentic_runtime(
        AgentRunInput(
            mode="report",
            activeStage="cost",
            question="What is breaking margin?",
            executionMode="stage_committee",
            snapshotVersion="snapshot:test",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
            riskCards=[{"id": "risk-model-routing-quality", "tags": ["routing"], "source": "risk:test"}],
            benchmarkCards=[{"id": "bench-test", "tags": ["cost"], "evidenceId": "benchmark-v0"}],
            operatingAssets=[{"id": "provider_registry", "ownerAgentId": "provider_api_intelligence"}],
            providerRegistry=[{"id": "gpt-5-mini", "sourceUrl": "https://openai.com/api/pricing/"}],
            modelPerfMatrix=[{"taskType": "classification", "modelId": "gpt-5-mini", "qualityBasis": "assumption"}],
            operatingLedger=[{"id": "decision-provider", "workstream": "Provider Registry"}],
        ),
        model=object(),
        agent_factory=lambda **_: fake_agent,
    )

    assert fake_agent.invocations
    assert result.llmMode == "provider-llm"
    assert result.primaryAgentId == "cost_modeling"
    assert result.reviewerAgentIds == ["cost_engine_qa", "finance_ops"]
    assert result.calledAgentIds == ["cost_modeling", "cost_engine_qa", "finance_ops"]
    assert result.snapshotVersion == "snapshot:test"
    assert result.usedTools == ["lookup_snapshot_value"]
    assert result.toolResultRefs == ["tool:monthlyAiCogs"]
    assert result.events[0].agentId == "cost_modeling"
    assert result.events[0].calledAgentTool == "call_cost_modeling_agent"
    assert result.events[0].usedTools == ["lookup_snapshot_value"]
    assert result.supervisorSummary
    assert result.decisionReadiness in {"ready", "needs_review", "blocked"}
    assert isinstance(result.disagreements, list)
    assert isinstance(result.nextQuestions, list)


def test_agentic_runtime_fallback_runs_stage_committee_without_provider():
    result = run_agentic_runtime(
        AgentRunInput(
            mode="ask",
            activeStage="optimize",
            question="Which optimization is safest?",
            executionMode="stage_committee",
            snapshotVersion="snapshot:fallback",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
            frontOperatingSystem={
                "assets": [{"id": "icp_scorecard", "ref": "asset:icp_scorecard"}],
                "learningLoopRecords": [],
            },
        )
    )

    assert result.llmMode == "deterministic-fallback"
    assert result.primaryAgentId == "optimization_routing"
    assert result.reviewerAgentIds == ["model_inference_research", "trust_security_compliance"]
    assert result.calledAgentIds == ["optimization_routing", "model_inference_research", "trust_security_compliance"]
    assert len(result.events) == 3
    assert {event.agentId for event in result.events} == set(result.calledAgentIds)
    assert all(event.calledAgentTool for event in result.events)
    assert result.snapshotVersion == "snapshot:fallback"
    assert "asset:icp_scorecard" in result.assetRefs
    assert result.supervisorSummary
    assert result.decisionReadiness == "needs_review"
    assert result.nextQuestions


def test_agentic_runtime_all_hands_fallback_returns_all_operating_agents():
    result = run_agentic_runtime(
        AgentRunInput(
            mode="report",
            activeStage="design",
            question="Run full operating review",
            executionMode="all_hands",
            snapshotVersion="snapshot:all-hands",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
        )
    )

    assert result.llmMode == "deterministic-fallback"
    assert len(result.calledAgentIds) == 11
    assert len(result.events) == 11
    assert result.events[0].agentId == result.calledAgentIds[0]
    assert result.supervisorSummary


def test_agentic_runtime_falls_back_when_numeric_claim_has_no_tool_ref():
    class BadAgent:
        def invoke(self, payload):
            return {
                "structured_response": {
                    "events": [],
                    "answer": "This saves 38 percent.",
                    "report": "Bad report.",
                    "usedTools": [],
                    "toolResultRefs": ["tool:monthlyAiCogs"],
                    "riskCardIds": [],
                    "decisionIds": [],
                    "evidenceRefs": [],
                    "warnings": [],
                }
            }

    result = run_agentic_runtime(
        AgentRunInput(
            mode="ask",
            activeStage="optimize",
            question="Can we save money?",
            toolResults={"monthlyAiCogs": 4820},
        ),
        model=object(),
        agent_factory=lambda **_: BadAgent(),
    )

    assert result.llmMode == "deterministic-fallback"
    assert "uncited numeric claim" in " ".join(result.warnings)
    assert "tool:monthlyAiCogs" in result.toolResultRefs
