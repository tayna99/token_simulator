"""Pydantic models that mirror the TypeScript agent runtime contracts.

The TypeScript app owns all deterministic cost and margin calculations. This
service receives those snapshots and returns interpretation events only.
"""

from datetime import UTC, datetime
from typing import Any, Literal, TypeAlias

from pydantic import BaseModel, Field

ToolValue: TypeAlias = int | float | str | bool | list[str]

EventType = Literal[
    "tool_snapshot",
    "analysis",
    "pricing_strategy",
    "risk_audit",
    "report_draft",
]

TeamCostEventType = Literal[
    "tool_snapshot",
    "cost_analysis",
    "benchmark_analysis",
    "optimization_candidate",
    "risk_audit",
    "approval_required",
    "decision_draft",
    "report_draft",
    "calibration",
]

LlmMode = Literal["deterministic-fallback", "provider-llm"]
RuntimeCapabilityStatus = Literal[
    "provider_llm",
    "deterministic_preview",
    "unavailable",
    "connector_not_configured",
    "interrupt_requested",
    "resumed",
]
AgentRunMode = Literal["report", "ask", "decision_support"]
AgentStage = Literal["design", "cost", "bottleneck", "optimize", "decision-log"]
AgentExecutionMode = Literal["stage_committee", "all_hands", "single_agent"]


class RunInput(BaseModel):
    """Frontend AgentRuntimeInput mirror for POST /api/agent."""

    apiKey: str | None = None
    toolResults: dict[str, int | float | str] = Field(default_factory=dict)
    riskCardIds: list[str] = Field(default_factory=list)


class AgentEvent(BaseModel):
    """Frontend AgentEvent mirror."""

    type: EventType
    message: str
    toolResultRefs: list[str]
    riskCardIds: list[str]


class RunOutput(BaseModel):
    events: list[AgentEvent]


class TeamCostGraphEvent(BaseModel):
    """Frontend TeamCostGraphEvent mirror."""

    type: TeamCostEventType
    message: str
    toolResultRefs: list[str]
    riskCardIds: list[str]
    recommendationIds: list[str] = Field(default_factory=list)


class TeamCostRunInput(BaseModel):
    """Python service input for POST /api/team-cost-agent.

    The frontend first runs the deterministic TypeScript team-cost graph, then
    posts those events here for interpretation. Extra fields from the original
    TeamCostRuntimeInput are intentionally ignored by Pydantic.
    """

    apiKey: str | None = None
    workflowMode: str = "optimize"
    companyProfile: dict[str, ToolValue | None] = Field(default_factory=dict)
    deterministicEvents: list[TeamCostGraphEvent] = Field(default_factory=list)
    toolResults: dict[str, ToolValue] = Field(default_factory=dict)
    riskCardIds: list[str] = Field(default_factory=list)


class TeamCostRunOutput(BaseModel):
    events: list[TeamCostGraphEvent]
    llmMode: LlmMode = "deterministic-fallback"


class AgenticEvent(BaseModel):
    type: str
    message: str
    agentId: str | None = None
    calledAgentTool: str | None = None
    stance: str = "support"
    toolResultRefs: list[str] = Field(default_factory=list)
    riskCardIds: list[str] = Field(default_factory=list)
    usedTools: list[str] = Field(default_factory=list)
    usedCapabilityTools: list[str] = Field(default_factory=list)
    reviewerAgentIds: list[str] = Field(default_factory=list)
    evidenceRefs: list[str] = Field(default_factory=list)
    evidenceWarnings: list[str] = Field(default_factory=list)
    nextQuestion: str = ""
    basisRefs: list[str] = Field(default_factory=list)
    assetRefs: list[str] = Field(default_factory=list)


class AgentRunInput(BaseModel):
    """Canonical P0 agentic runtime input for POST /api/agent/run."""

    apiKey: str | None = None
    mode: AgentRunMode = "report"
    activeStage: AgentStage = "design"
    question: str = "Draft the current AI team cost decision report."
    requestedAgentId: str | None = None
    executionMode: AgentExecutionMode = "stage_committee"
    snapshotVersion: str = ""
    toolResults: dict[str, ToolValue] = Field(default_factory=dict)
    deterministicEvents: list[dict[str, Any]] = Field(default_factory=list)
    thresholdPolicy: dict[str, Any] = Field(default_factory=dict)
    metricFlags: list[dict[str, Any]] = Field(default_factory=list)
    riskCards: list[dict[str, Any]] = Field(default_factory=list)
    benchmarkCards: list[dict[str, Any]] = Field(default_factory=list)
    decisionHistory: list[dict[str, Any]] = Field(default_factory=list)
    factSources: list[dict[str, Any]] = Field(default_factory=list)
    operatingAgents: list[dict[str, Any]] = Field(default_factory=list)
    operatingAssets: list[dict[str, Any]] = Field(default_factory=list)
    providerRegistry: list[dict[str, Any]] = Field(default_factory=list)
    modelPerfMatrix: list[dict[str, Any]] = Field(default_factory=list)
    operatingLedger: list[dict[str, Any]] = Field(default_factory=list)
    officialSourceRegistry: list[dict[str, Any]] = Field(default_factory=list)
    officialSourceSnippets: list[dict[str, Any]] = Field(default_factory=list)
    modelReleaseCandidates: list[dict[str, Any]] = Field(default_factory=list)
    pricingFactCandidates: list[dict[str, Any]] = Field(default_factory=list)
    fxRateSnapshots: list[dict[str, Any]] = Field(default_factory=list)
    ragCollections: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)
    ragContextBlocks: list[dict[str, Any]] = Field(default_factory=list)
    trustInspection: dict[str, Any] | None = None
    formulaVersion: str = ""
    providerRegistryVersion: str = ""
    dataLimitations: list[str] = Field(default_factory=list)
    frontOperatingSystem: dict[str, Any] = Field(default_factory=dict)
    hitlCheckpoint: bool = False
    checkpointThreadId: str = ""
    checkpointNamespace: str = "agent_service"
    resumeCheckpoint: bool = False
    resumePayload: dict[str, Any] = Field(default_factory=dict)


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class AgentRunCheckpoint(BaseModel):
    persistence: str = "not_configured"
    threadId: str = ""
    checkpointNamespace: str = "agent_service"
    checkpointId: str = ""
    interruptId: str | None = None
    status: str = "not_required"
    reason: str = ""
    resumePayload: dict[str, Any] = Field(default_factory=dict)


class AgentRunRuntimeProof(BaseModel):
    status: RuntimeCapabilityStatus = "unavailable"
    providerRunId: str | None = None
    agentInvocationProof: list[str] = Field(default_factory=list)
    fallbackReason: str | None = None
    startedAt: str = Field(default_factory=_utc_now)
    completedAt: str = Field(default_factory=_utc_now)
    checkpoint: AgentRunCheckpoint | None = None


class AgentRunResponse(BaseModel):
    events: list[AgenticEvent] = Field(default_factory=list)
    answer: str = ""
    report: str = ""
    llmMode: LlmMode = "deterministic-fallback"
    runtime: AgentRunRuntimeProof = Field(default_factory=AgentRunRuntimeProof)
    supervisorSummary: str = ""
    disagreements: list[str] = Field(default_factory=list)
    decisionReadiness: str = "needs_review"
    nextQuestions: list[str] = Field(default_factory=list)
    calledAgentIds: list[str] = Field(default_factory=list)
    primaryAgentId: str | None = None
    reviewerAgentIds: list[str] = Field(default_factory=list)
    agentRoute: dict[str, Any] = Field(default_factory=dict)
    snapshotVersion: str = ""
    usedTools: list[str] = Field(default_factory=list)
    toolResultRefs: list[str] = Field(default_factory=list)
    riskCardIds: list[str] = Field(default_factory=list)
    decisionIds: list[str] = Field(default_factory=list)
    evidenceRefs: list[str] = Field(default_factory=list)
    evidenceCoverage: dict[str, Any] = Field(default_factory=dict)
    assetRefs: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class P1RagEvidenceRequest(BaseModel):
    workspaceId: str = ""
    query: str
    topK: int = 5
    structuredFactRefs: list[str] = Field(default_factory=list)
    officialDocChunks: list[dict[str, Any]] = Field(default_factory=list)
    filters: dict[str, str | int | float | bool] = Field(default_factory=dict)


class Analysis(BaseModel):
    """Structured LLM output. It deliberately has no numeric fields."""

    headline: str = Field(description="One-line interpretation. Do not invent numbers.")
    explanation: str = Field(description="Short explanation grounded in provided tool refs.")
