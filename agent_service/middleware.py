"""LangChain 1.0 runtime guardrails for AgentPayroll operating agents.

The middleware layer only constrains provider/tool execution. It never computes
cost, margin, savings, or budget deltas.
"""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import ToolMessage

FORBIDDEN_AGENT_TOOL_NAMES = frozenset({
    "calculate_cost",
    "calculate_margin",
    "estimate_savings",
    "calculate_budget_delta",
    "create_decision",
    "adopt_recommendation",
    "send_email",
    "charge_billing",
})

SECRET_VALUE_PATTERNS = (
    re.compile(r"\bsk-[A-Za-z0-9][A-Za-z0-9_-]{10,}\b"),
    re.compile(r"\b(?:api[_-]?key|secret|password|authorization|bearer)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{8,}", re.I),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----", re.I),
)
PII_VALUE_PATTERNS = (
    re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
)
SENSITIVE_FIELD_NAMES = {
    "api_key",
    "apikey",
    "authorization",
    "password",
    "raw_prompt",
    "rawprompt",
    "secret",
}


class ToolCallBlocked(RuntimeError):
    """Raised when a LangChain tool call violates runtime permissions."""


class PayloadSecretBlocked(RuntimeError):
    """Raised when provider input contains secrets, PII, or raw prompt data."""


@dataclass(frozen=True)
class LangChainRuntimeContext:
    agentId: str = ""
    calledAgentTool: str = ""
    snapshotVersion: str = ""
    allowedToolNames: tuple[str, ...] = ()
    toolResultRefs: tuple[str, ...] = ()
    executionMode: str = ""
    runtimeRole: str = "operating_agent"


@dataclass(frozen=True)
class RuntimeGuardDecision:
    allowed: bool
    warnings: tuple[str, ...] = ()
    fallbackReason: str | None = None
    blockedFields: tuple[str, ...] = ()


@dataclass
class ToolCallLogEntry:
    agentId: str
    toolName: str
    argKeys: tuple[str, ...]
    refs: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()
    allowed: bool = True
    durationMs: float = 0


def _tool_name(tool: Any) -> str:
    return str(getattr(tool, "name", ""))


def _as_context(context: Any) -> LangChainRuntimeContext | None:
    if context is None:
        return None
    if isinstance(context, LangChainRuntimeContext):
        return context
    if isinstance(context, Mapping):
        return LangChainRuntimeContext(
            agentId=str(context.get("agentId") or ""),
            calledAgentTool=str(context.get("calledAgentTool") or ""),
            snapshotVersion=str(context.get("snapshotVersion") or ""),
            allowedToolNames=tuple(str(item) for item in context.get("allowedToolNames", ())),
            toolResultRefs=tuple(str(item) for item in context.get("toolResultRefs", ())),
            executionMode=str(context.get("executionMode") or ""),
            runtimeRole=str(context.get("runtimeRole") or "operating_agent"),
        )
    return LangChainRuntimeContext(
        agentId=str(getattr(context, "agentId", "")),
        calledAgentTool=str(getattr(context, "calledAgentTool", "")),
        snapshotVersion=str(getattr(context, "snapshotVersion", "")),
        allowedToolNames=tuple(str(item) for item in getattr(context, "allowedToolNames", ())),
        toolResultRefs=tuple(str(item) for item in getattr(context, "toolResultRefs", ())),
        executionMode=str(getattr(context, "executionMode", "")),
        runtimeRole=str(getattr(context, "runtimeRole", "operating_agent")),
    )


def filter_tools_for_runtime_context(
    tools: Sequence[Any],
    context: LangChainRuntimeContext | Mapping[str, Any] | None,
) -> list[Any]:
    runtime_context = _as_context(context)
    if runtime_context is None:
        return []
    allowed = set(runtime_context.allowedToolNames).difference(FORBIDDEN_AGENT_TOOL_NAMES)
    if not allowed:
        return []
    return [tool for tool in tools if _tool_name(tool) in allowed]


def guard_tool_call(
    tool_name: str,
    context: LangChainRuntimeContext | Mapping[str, Any] | None,
) -> None:
    runtime_context = _as_context(context)
    if runtime_context is None:
        raise ToolCallBlocked("runtime context is required before calling a tool")
    if tool_name in FORBIDDEN_AGENT_TOOL_NAMES:
        raise ToolCallBlocked(f"{tool_name} is forbidden_agent_tool")
    if tool_name not in set(runtime_context.allowedToolNames):
        raise ToolCallBlocked(f"{tool_name} is not allowed for {runtime_context.agentId}")


def _arg_keys(payload: Any) -> tuple[str, ...]:
    if isinstance(payload, Mapping):
        return tuple(sorted(str(key) for key in payload))
    return ()


def _parse_tool_result_metadata(result: Any) -> tuple[tuple[str, ...], tuple[str, ...]]:
    if not isinstance(result, str):
        return (), ()
    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        return (), ()
    if not isinstance(parsed, Mapping):
        return (), ()
    refs = parsed.get("refs", [])
    warnings = parsed.get("warnings", [])
    return (
        tuple(str(ref) for ref in refs if isinstance(ref, str)),
        tuple(str(warning) for warning in warnings if isinstance(warning, str)),
    )


def invoke_tool_with_guardrails(
    tool: Any,
    payload: Mapping[str, Any],
    *,
    context: LangChainRuntimeContext | Mapping[str, Any] | None,
    logger: Callable[[ToolCallLogEntry], None] | None = None,
) -> Any:
    name = _tool_name(tool)
    started_at = time.perf_counter()
    try:
        guard_tool_call(name, context)
        result = tool.invoke(dict(payload))
    except ToolCallBlocked:
        if logger is not None:
            runtime_context = _as_context(context) or LangChainRuntimeContext()
            logger(ToolCallLogEntry(
                agentId=runtime_context.agentId,
                toolName=name,
                argKeys=_arg_keys(payload),
                allowed=False,
                durationMs=(time.perf_counter() - started_at) * 1000,
            ))
        raise
    if logger is not None:
        runtime_context = _as_context(context) or LangChainRuntimeContext()
        refs, warnings = _parse_tool_result_metadata(result)
        logger(ToolCallLogEntry(
            agentId=runtime_context.agentId,
            toolName=name,
            argKeys=_arg_keys(payload),
            refs=refs,
            warnings=warnings,
            durationMs=(time.perf_counter() - started_at) * 1000,
        ))
    return result


def build_tool_call_logger(entries: list[ToolCallLogEntry] | None = None) -> Callable[[ToolCallLogEntry], None]:
    sink = entries if entries is not None else []

    def log(entry: ToolCallLogEntry) -> None:
        sink.append(entry)

    return log


def _secret_warnings_for_string(value: str) -> list[str]:
    warnings: list[str] = []
    if any(pattern.search(value) for pattern in SECRET_VALUE_PATTERNS):
        warnings.append("secret_like_text")
    if any(pattern.search(value) for pattern in PII_VALUE_PATTERNS):
        warnings.append("pii_like_text")
    return warnings


def _walk_payload(value: Any, path: tuple[str, ...], warnings: set[str], blocked_fields: set[str]) -> None:
    if isinstance(value, Mapping):
        for key, child in value.items():
            key_str = str(key)
            normalized = key_str.replace("-", "_").lower()
            child_path = (*path, key_str)
            if child_path == ("apiKey",):
                continue
            if normalized in SENSITIVE_FIELD_NAMES and child not in (None, "", [], {}):
                warnings.add("sensitive_field")
                blocked_fields.add(".".join(child_path))
                continue
            _walk_payload(child, child_path, warnings, blocked_fields)
        return
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        for index, child in enumerate(value):
            _walk_payload(child, (*path, str(index)), warnings, blocked_fields)
        return
    if isinstance(value, str):
        for warning in _secret_warnings_for_string(value):
            warnings.add(warning)
            blocked_fields.add(".".join(path))


def inspect_payload_for_secrets(payload: Any) -> RuntimeGuardDecision:
    data = payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload
    warnings: set[str] = set()
    blocked_fields: set[str] = set()
    _walk_payload(data, (), warnings, blocked_fields)
    if warnings:
        return RuntimeGuardDecision(
            allowed=False,
            warnings=tuple(sorted(warnings)),
            fallbackReason="guardrail_rejected",
            blockedFields=tuple(sorted(blocked_fields)),
        )
    return RuntimeGuardDecision(allowed=True)


def raise_if_payload_blocked(payload: Any) -> None:
    decision = inspect_payload_for_secrets(payload)
    if not decision.allowed:
        raise PayloadSecretBlocked(", ".join(decision.warnings))


def _rejection_tool_message(request: Any, tool_name: str, error: ToolCallBlocked) -> ToolMessage:
    tool_call = getattr(request, "tool_call", {}) or {}
    tool_call_id = tool_call.get("id") if isinstance(tool_call, Mapping) else None
    content = json.dumps({
        "toolName": tool_name,
        "refs": [],
        "found": False,
        "data": {},
        "warnings": ["forbidden_agent_tool", str(error)],
    }, ensure_ascii=False, sort_keys=True)
    return ToolMessage(
        content=content,
        name=tool_name,
        tool_call_id=str(tool_call_id or f"blocked:{tool_name}"),
        status="error",
    )


class AgentPayrollRuntimeMiddleware(AgentMiddleware):
    """LangChain middleware that applies AgentPayroll runtime permissions."""

    def __init__(self, default_context: LangChainRuntimeContext):
        self.default_context = default_context
        self.toolCallLog: list[ToolCallLogEntry] = []

    def _context_from_runtime(self, runtime: Any) -> LangChainRuntimeContext:
        context = getattr(runtime, "context", None)
        return _as_context(context) or self.default_context

    def wrap_model_call(self, request: Any, handler: Callable[[Any], Any]) -> Any:
        context = self._context_from_runtime(getattr(request, "runtime", None))
        filtered_tools = filter_tools_for_runtime_context(getattr(request, "tools", []), context)
        if hasattr(request, "override"):
            return handler(request.override(tools=filtered_tools))
        request.tools = filtered_tools
        return handler(request)

    def wrap_tool_call(self, request: Any, handler: Callable[[Any], Any]) -> Any:
        context = self._context_from_runtime(getattr(request, "runtime", None))
        tool = getattr(request, "tool", None)
        tool_name = _tool_name(tool)
        if not tool_name:
            tool_call = getattr(request, "tool_call", {}) or {}
            tool_name = str(tool_call.get("name") if isinstance(tool_call, Mapping) else "")
        try:
            guard_tool_call(tool_name, context)
        except ToolCallBlocked as error:
            self.toolCallLog.append(ToolCallLogEntry(
                agentId=context.agentId,
                toolName=tool_name,
                argKeys=(),
                allowed=False,
            ))
            return _rejection_tool_message(request, tool_name, error)
        started_at = time.perf_counter()
        result = handler(request)
        refs, warnings = _parse_tool_result_metadata(getattr(result, "content", result))
        self.toolCallLog.append(ToolCallLogEntry(
            agentId=context.agentId,
            toolName=tool_name,
            argKeys=(),
            refs=refs,
            warnings=warnings,
            durationMs=(time.perf_counter() - started_at) * 1000,
        ))
        return result


def build_agent_middleware(context: LangChainRuntimeContext) -> list[AgentPayrollRuntimeMiddleware]:
    return [AgentPayrollRuntimeMiddleware(context)]


RuntimeContext = LangChainRuntimeContext
