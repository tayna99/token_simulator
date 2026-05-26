import json

from schemas import AgentRunInput
from middleware import LangChainRuntimeContext
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
        self.invoke_kwargs = []

    def invoke(self, payload, **kwargs):
        self.invocations.append(payload)
        self.invoke_kwargs.append(kwargs)
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


class SupervisorToolCallingFactory:
    def __init__(self):
        self.supervisor_tool_names = []
        self.agent_tool_names = []
        self.factory_kwargs = []
        self.invoke_kwargs = []

    def __call__(self, **kwargs):
        tools = kwargs["tools"]
        self.factory_kwargs.append(kwargs)
        return SupervisorToolCallingAgent(tools, self)


class SupervisorToolCallingAgent:
    def __init__(self, tools, factory):
        self.tools = tools
        self.factory = factory

    def invoke(self, payload, **kwargs):
        self.factory.invoke_kwargs.append(kwargs)
        tool_names = [tool.name for tool in self.tools]
        call_tools = [tool for tool in self.tools if tool.name.startswith("call_")]
        if call_tools:
            self.factory.supervisor_tool_names = tool_names
            preferred = next(
                tool for tool in call_tools
                if tool.name == "call_cost_modeling_agent"
            )
            preferred.invoke({"question": "Inspect monthly cost evidence."})
            return {
                "structured_response": {
                    "answer": "Supervisor called the Cost Modeling Agent.",
                    "report": "Supervisor report cites delegated agent evidence.",
                    "usedTools": [preferred.name],
                    "toolResultRefs": ["tool:monthlyAiCogs"],
                    "warnings": [],
                }
            }

        self.factory.agent_tool_names.append(tool_names)
        assert set(tool_names).isdisjoint(FORBIDDEN_AGENT_TOOL_NAMES)
        return {
            "structured_response": {
                "events": [
                    {
                        "type": "analysis",
                        "message": "Cost Modeling Agent checked tool:monthlyAiCogs.",
                        "toolResultRefs": ["tool:monthlyAiCogs"],
                        "riskCardIds": [],
                        "usedTools": ["lookup_snapshot_value"],
                        "stance": "support",
                        "evidenceWarnings": [],
                        "nextQuestion": "Should Finance Ops review margin policy next?",
                    }
                ],
                "answer": "Cost evidence is grounded in tool:monthlyAiCogs.",
                "report": "Cost Modeling Agent report grounded in tool:monthlyAiCogs.",
                "usedTools": ["lookup_snapshot_value"],
                "toolResultRefs": ["tool:monthlyAiCogs"],
                "riskCardIds": [],
                "decisionIds": [],
                "evidenceRefs": [],
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
    assert "retrieve_p1_vector_rag_evidence" in names
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
        rag_context_blocks=[
            {
                "collection": "official_docs",
                "text": "GLM-5 routing official vector context.",
                "refs": ["source:zai-pricing#vector"],
                "mayOverrideFacts": False,
            }
        ],
    )
    }

    snapshot = json.loads(tools["lookup_snapshot_value"].invoke({"tool_ref": "monthlyAiCogs"}))
    risk = json.loads(tools["retrieve_risk_cards"].invoke({"query": "routing", "tags": ["routing"]}))
    benchmark = json.loads(tools["retrieve_benchmark_evidence"].invoke({"query": "missing", "tags": ["peer"]}))
    official_sources = json.loads(tools["retrieve_official_source_registry"].invoke({"provider_region": "global"}))
    official_snippets = json.loads(tools["retrieve_official_source_snippets"].invoke({"query": "GLM-5"}))
    vector_rag = json.loads(tools["retrieve_p1_vector_rag_evidence"].invoke({"query": "GLM-5 routing"}))
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
    assert vector_rag["toolName"] == "retrieve_p1_vector_rag_evidence"
    assert vector_rag["refs"] == ["source:zai-pricing#vector", "risk:risk-model-routing-quality"]
    assert vector_rag["data"]["contextBlocks"][0]["refs"] == ["source:zai-pricing#vector"]
    assert vector_rag["data"]["mayOverrideFacts"] is False
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


def test_p1_vector_rag_tool_keeps_collections_separated():
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
            rag_collections={
                "official_docs": [
                    {
                        "id": "source:google-pricing#pricing",
                        "collection": "official_docs",
                        "text": "Cached input token pricing.",
                        "refs": ["source:google-pricing"],
                        "mayOverrideFacts": False,
                    }
                ],
                "benchmark_evidence": [
                    {
                        "id": "bench:peer-margin",
                        "collection": "benchmark_evidence",
                        "text": "Peer margin benchmark for token-heavy reporting.",
                        "refs": ["evidence:peer-margin"],
                        "mayOverrideFacts": False,
                    }
                ],
                "decision_history": [
                    {
                        "id": "decision:routing-hold",
                        "collection": "decision_history",
                        "text": "Held token reporting routing change until Trust Gate review.",
                        "mayOverrideFacts": False,
                    }
                ],
            },
            rag_context_blocks=[
                {
                    "collection": "benchmark_evidence",
                    "text": "Token-heavy reporting benchmark from retrieved context.",
                    "refs": ["evidence:context-benchmark"],
                    "mayOverrideFacts": False,
                }
            ],
        )
    }

    vector_rag = json.loads(tools["retrieve_p1_vector_rag_evidence"].invoke({"query": "token reporting"}))

    assert vector_rag["toolName"] == "retrieve_p1_vector_rag_evidence"
    assert vector_rag["refs"] == [
        "source:google-pricing#pricing",
        "source:google-pricing",
        "evidence:peer-margin",
        "evidence:context-benchmark",
        "decision:routing-hold",
    ]
    assert vector_rag["data"]["mayOverrideFacts"] is False
    assert [item["collection"] for item in vector_rag["data"]["officialDocs"]] == ["official_docs"]
    assert [item["collection"] for item in vector_rag["data"]["benchmarkEvidence"]] == [
        "benchmark_evidence",
        "benchmark_evidence",
    ]
    assert [item["collection"] for item in vector_rag["data"]["decisionHistory"]] == ["decision_history"]
    assert vector_rag["warnings"] == []


def test_agent_tool_permission_matrix_keeps_calculation_tools_out():
    assert set(AGENT_TOOL_PERMISSION_MATRIX) == {agent["id"] for agent in OPERATING_AGENTS}
    for allowed_tools in AGENT_TOOL_PERMISSION_MATRIX.values():
        assert set(allowed_tools).isdisjoint(FORBIDDEN_AGENT_TOOL_NAMES)
    assert "retrieve_front_operating_system" in AGENT_TOOL_PERMISSION_MATRIX["usage_data_ingestion"]
    assert "retrieve_front_operating_gate" in AGENT_TOOL_PERMISSION_MATRIX["trust_security_compliance"]
    assert "retrieve_learning_loop_records" in AGENT_TOOL_PERMISSION_MATRIX["knowledge_release_ops"]
    assert "retrieve_p1_vector_rag_evidence" in AGENT_TOOL_PERMISSION_MATRIX["provider_api_intelligence"]
    assert "retrieve_p1_vector_rag_evidence" in AGENT_TOOL_PERMISSION_MATRIX["knowledge_release_ops"]
    assert "retrieve_benchmark_evidence" in AGENT_TOOL_PERMISSION_MATRIX["optimization_routing"]


def test_benchmark_tool_preserves_c2_evidence_refs_without_double_prefixing():
    tools = {
        tool.name: tool for tool in build_agent_tools(
            tool_results={"monthlyAiCogs": 4820},
            threshold_policy={},
            metric_flags=[],
            risk_cards=[],
            benchmark_cards=[
                {
                    "id": "evidence:artificial-analysis-models:gpt-5-5:intelligence-index",
                    "text": "GPT-5.5 intelligence_index benchmark evidence.",
                    "refs": ["evidence:artificial-analysis-models"],
                    "tags": ["routing", "quality"],
                }
            ],
            decision_history=[],
            fact_sources=[],
            operating_agents=OPERATING_AGENTS,
            operating_assets=[],
        )
    }

    benchmark = json.loads(tools["retrieve_benchmark_evidence"].invoke({"query": "intelligence", "tags": ["routing"]}))

    assert benchmark["found"] is True
    assert benchmark["refs"] == ["evidence:artificial-analysis-models"]
    assert "baseline_unavailable" not in benchmark["warnings"]


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
    factory_kwargs = []

    def factory(**kwargs):
        factory_kwargs.append(kwargs)
        return fake_agent

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
            ragContextBlocks=[
                {
                    "collection": "official_docs",
                    "text": "Cached input tokens receive a discount.",
                    "refs": ["source:google-pricing"],
                    "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",
                    "score": 0.82,
                    "mayOverrideFacts": False,
                    "metadata": {"sourceId": "google-pricing", "sectionType": "pricing"},
                }
            ],
        ),
        model=object(),
        agent_factory=factory,
    )

    assert fake_agent.invocations
    assert factory_kwargs
    assert all(item["context_schema"] is LangChainRuntimeContext for item in factory_kwargs)
    assert all(item["middleware"] for item in factory_kwargs)
    assert fake_agent.invoke_kwargs
    contexts = [item["context"] for item in fake_agent.invoke_kwargs]
    assert any(context.runtimeRole == "supervisor" for context in contexts)
    operating_context = next(context for context in contexts if context.runtimeRole == "operating_agent")
    assert operating_context.agentId == "cost_modeling"
    assert operating_context.calledAgentTool == "call_cost_modeling_agent"
    assert operating_context.snapshotVersion == "snapshot:test"
    assert set(operating_context.allowedToolNames) == AGENT_TOOL_PERMISSION_MATRIX["cost_modeling"]
    assert set(operating_context.allowedToolNames).isdisjoint(FORBIDDEN_AGENT_TOOL_NAMES)
    agent_message = json.loads(fake_agent.invocations[0]["messages"][0]["content"])
    assert agent_message["ragContextBlocks"][0]["refs"] == ["source:google-pricing"]
    assert agent_message["ragContextBlocks"][0]["mayOverrideFacts"] is False
    assert result.llmMode == "provider-llm"
    assert result.runtime.status == "provider_llm"
    assert result.runtime.providerRunId.startswith("agent-service:")
    assert result.runtime.agentInvocationProof == ["call_cost_modeling_agent"]
    assert result.primaryAgentId == "cost_modeling"
    assert result.reviewerAgentIds == []
    assert result.calledAgentIds == ["cost_modeling"]
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


def test_supervisor_provider_path_calls_operating_agent_tools():
    factory = SupervisorToolCallingFactory()

    result = run_agentic_runtime(
        AgentRunInput(
            mode="ask",
            activeStage="cost",
            question="What is breaking margin?",
            executionMode="stage_committee",
            snapshotVersion="snapshot:supervisor",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
            benchmarkCards=[{"id": "bench-cost", "evidenceId": "benchmark-cost", "tags": ["cost"]}],
            decisionHistory=[{"id": "decision-cost", "what": "Held routing change until QA"}],
            officialSourceSnippets=[
                {"snippetId": "source:openai-pricing#cost", "text": "Official pricing source", "refs": ["source:openai-pricing"]},
            ],
        ),
        model=object(),
        agent_factory=factory,
    )

    assert "call_cost_modeling_agent" in factory.supervisor_tool_names
    assert factory.factory_kwargs
    assert all(item["context_schema"] is LangChainRuntimeContext for item in factory.factory_kwargs)
    assert all(item["middleware"] for item in factory.factory_kwargs)
    supervisor_context = factory.invoke_kwargs[0]["context"]
    assert supervisor_context.runtimeRole == "supervisor"
    assert all(tool_name.startswith("call_") for tool_name in supervisor_context.allowedToolNames)
    child_context = next(item["context"] for item in factory.invoke_kwargs if item["context"].runtimeRole == "operating_agent")
    assert child_context.agentId == "cost_modeling"
    assert set(child_context.allowedToolNames) == AGENT_TOOL_PERMISSION_MATRIX["cost_modeling"]
    assert set(child_context.allowedToolNames).isdisjoint(FORBIDDEN_AGENT_TOOL_NAMES)
    assert result.runtime.status == "provider_llm"
    assert result.runtime.providerRunId.startswith("agent-service:")
    assert result.runtime.agentInvocationProof == ["call_cost_modeling_agent"]
    assert factory.agent_tool_names
    assert result.calledAgentIds == ["cost_modeling"]
    assert result.events[0].agentId == "cost_modeling"
    assert result.events[0].calledAgentTool == "call_cost_modeling_agent"
    assert result.events[0].stance == "support"
    assert result.evidenceCoverage["officialDocs"]["found"] is True
    assert result.evidenceCoverage["benchmarkEvidence"]["found"] is True
    assert result.evidenceCoverage["decisionHistory"]["found"] is True
    assert result.decisionReadiness == "ready"


def test_runtime_context_does_not_allow_requested_agent_to_escape_permission_matrix():
    fake_agent = FakeAgent()

    def factory(**_):
        return fake_agent

    result = run_agentic_runtime(
        AgentRunInput(
            mode="ask",
            activeStage="cost",
            requestedAgentId="trust_security_compliance",
            executionMode="single_agent",
            snapshotVersion="snapshot:trust-agent",
            question="Check trust state.",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
        ),
        model=object(),
        agent_factory=factory,
    )

    operating_context = next(context["context"] for context in fake_agent.invoke_kwargs if context["context"].runtimeRole == "operating_agent")
    assert operating_context.agentId == "trust_security_compliance"
    assert set(operating_context.allowedToolNames) == AGENT_TOOL_PERMISSION_MATRIX["trust_security_compliance"]
    assert "lookup_snapshot_value" not in set(operating_context.allowedToolNames)
    assert result.primaryAgentId == "trust_security_compliance"


def test_provider_all_hands_forces_all_11_agent_calls_even_if_supervisor_calls_one():
    factory = SupervisorToolCallingFactory()

    result = run_agentic_runtime(
        AgentRunInput(
            mode="report",
            activeStage="cost",
            question="Run all-hands review",
            executionMode="all_hands",
            snapshotVersion="snapshot:all-hands-provider",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
        ),
        model=object(),
        agent_factory=factory,
    )

    assert len(result.calledAgentIds) == 11
    assert len(result.events) == 11
    assert result.runtime.status == "provider_llm"
    assert len(result.runtime.agentInvocationProof) == 11
    assert "call_cost_modeling_agent" in factory.supervisor_tool_names


def test_missing_benchmark_keeps_baseline_unavailable_and_needs_review():
    result = run_agentic_runtime(
        AgentRunInput(
            mode="ask",
            activeStage="optimize",
            question="Can we compare this optimization to a peer baseline?",
            executionMode="stage_committee",
            snapshotVersion="snapshot:no-benchmark",
            toolResults={"monthlyAiCogs": 4820},
            operatingAgents=OPERATING_AGENTS,
            officialSourceSnippets=[
                {"snippetId": "source:zai-pricing#glm-5", "text": "Official pricing source", "refs": ["source:zai-pricing"]},
            ],
            decisionHistory=[{"id": "decision-routing", "what": "Hold routing until QA"}],
        )
    )

    assert result.evidenceCoverage["benchmarkEvidence"]["found"] is False
    assert "baseline_unavailable" in result.evidenceCoverage["benchmarkEvidence"]["warnings"]
    assert "baseline_unavailable" in result.warnings
    assert result.decisionReadiness == "needs_review"
    assert any("baseline" in question.lower() for question in result.nextQuestions)


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
    assert result.runtime.status == "unavailable"
    assert result.runtime.fallbackReason == "provider_unavailable"
    assert result.primaryAgentId is None
    assert result.reviewerAgentIds == []
    assert result.calledAgentIds == []
    assert len(result.events) == 1
    assert result.events[0].type == "runtime_unavailable"
    assert result.events[0].agentId is None
    assert result.events[0].calledAgentTool is None
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
    assert result.runtime.status == "unavailable"
    assert result.calledAgentIds == []
    assert len(result.events) == 1
    assert result.events[0].type == "runtime_unavailable"
    assert result.events[0].calledAgentTool is None
    assert result.supervisorSummary


def test_agentic_runtime_falls_back_when_numeric_claim_has_no_tool_ref():
    class BadAgent:
        def invoke(self, payload, **kwargs):
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
    assert result.runtime.status == "unavailable"
    assert "uncited numeric claim" in " ".join(result.warnings)
    assert "tool:monthlyAiCogs" in result.toolResultRefs


def test_agentic_runtime_secret_guard_blocks_provider_invocation():
    class RaisingFactory:
        def __call__(self, **kwargs):
            raise AssertionError("provider should not be invoked for unsafe payload")

    result = run_agentic_runtime(
        AgentRunInput(
            mode="ask",
            activeStage="cost",
            question="Analyze sk-live-secret-1234567890 before writing the report.",
            toolResults={"monthlyAiCogs": 4820},
        ),
        model=object(),
        agent_factory=RaisingFactory(),
    )

    assert result.llmMode == "deterministic-fallback"
    assert result.runtime.status == "unavailable"
    assert result.runtime.fallbackReason == "guardrail_rejected"
    assert "secret_like_text" in result.warnings
