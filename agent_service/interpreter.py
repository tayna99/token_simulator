"""LangChain 1.0 interpretation layer for deterministic TypeScript snapshots."""

from __future__ import annotations

import json
import re
from typing import Protocol

from schemas import Analysis

SYSTEM = (
    "You are a CFO analyst for an AI SaaS cost workspace. "
    "All numbers are already computed by a deterministic TypeScript engine. "
    "Never invent or recompute numbers. If you mention a number, cite one of "
    "the provided tool refs next to that claim. Keep the answer concise."
)


class SupportsInterpret(Protocol):
    def analyze_margin(self, facts: dict[str, str], refs: list[str]) -> Analysis: ...
    def pricing_comment(self, facts: dict[str, str], refs: list[str]) -> Analysis: ...
    def team_cost_report(self, facts: dict[str, str], refs: list[str], messages: list[str]) -> Analysis: ...


def _contains_numeric_claim(text: str) -> bool:
    return bool(re.search(r"\b\d+(?:\.\d+)?\s*(?:%|percent|usd|dollars?|tokens?|requests?|calls?)?\b", text, re.I))


def _text_cites_ref(text: str, refs: list[str]) -> bool:
    return any(ref in text for ref in refs)


def has_uncited_numeric_claim(text: str, refs: list[str]) -> bool:
    return _contains_numeric_claim(text) and not _text_cites_ref(text, refs)


def _fallback(headline: str, refs: list[str]) -> Analysis:
    cited = ", ".join(refs[:4]) if refs else "deterministic snapshot"
    return Analysis(
        headline=headline,
        explanation=f"Interpretation is grounded in {cited}. No new numbers were generated.",
    )


class Interpreter:
    """Provider-backed interpreter with deterministic fallback.

    The model is optional so tests and no-key local runs never need network
    access. When a model is present, structured output is still guarded so
    uncited numeric claims fall back to deterministic prose.
    """

    def __init__(self, api_key: str | None = None, model_name: str = "gpt-5-mini", model=None) -> None:
        self.model = model
        self.uses_model = model is not None
        if self.model is None and api_key:
            from langchain.chat_models import init_chat_model

            self.model = init_chat_model(model_name, api_key=api_key)
            self.uses_model = True

    def _guard(self, analysis: Analysis, refs: list[str], fallback_headline: str) -> Analysis:
        text = f"{analysis.headline} {analysis.explanation}"
        if has_uncited_numeric_claim(text, refs):
            return _fallback(fallback_headline, refs)
        return analysis

    def _interpret(
        self,
        task: str,
        system: str,
        facts: dict[str, str],
        refs: list[str],
        fallback_headline: str,
    ) -> Analysis:
        if self.model is None:
            return _fallback(fallback_headline, refs)

        structured = self.model.with_structured_output(Analysis)
        raw = structured.invoke(
            [
                ("system", system),
                (
                    "user",
                    json.dumps(
                        {
                            "task": task,
                            "facts": facts,
                            "toolRefs": refs,
                        },
                        ensure_ascii=False,
                        indent=2,
                    ),
                ),
            ]
        )
        analysis = raw if isinstance(raw, Analysis) else Analysis.model_validate(raw)
        return self._guard(analysis, refs, fallback_headline)

    def analyze_margin(self, facts: dict[str, str], refs: list[str]) -> Analysis:
        return self._interpret(
            "margin_analysis",
            SYSTEM,
            facts,
            refs,
            "Margin analysis is using deterministic cost refs.",
        )

    def pricing_comment(self, facts: dict[str, str], refs: list[str]) -> Analysis:
        return self._interpret(
            "pricing_strategy",
            f"{SYSTEM} Interpret this from a pricing-policy perspective.",
            facts,
            refs,
            "Pricing strategy is using deterministic scenario refs.",
        )

    def team_cost_report(self, facts: dict[str, str], refs: list[str], messages: list[str]) -> Analysis:
        return self._interpret(
            "team_cost_report",
            f"{SYSTEM} Interpret the AI team operating-cost graph for the right-side assistant panel.",
            {**facts, "deterministicMessages": " | ".join(messages[-6:])},
            refs,
            "Team cost report is using deterministic AgentSpec refs.",
        )
