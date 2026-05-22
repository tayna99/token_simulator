"""Pydantic models that mirror the TypeScript agent runtime contracts.

The TypeScript app owns all deterministic cost and margin calculations. This
service receives those snapshots and returns interpretation events only.
"""

from typing import Literal, TypeAlias

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


class Analysis(BaseModel):
    """Structured LLM output. It deliberately has no numeric fields."""

    headline: str = Field(description="One-line interpretation. Do not invent numbers.")
    explanation: str = Field(description="Short explanation grounded in provided tool refs.")
