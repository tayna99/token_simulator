from schemas import Analysis
from interpreter import Interpreter


class FakeStructuredModel:
    def __init__(self, output):
        self.output = output

    def with_structured_output(self, schema):
        return self

    def invoke(self, messages):
        return self.output


def test_interpreter_uses_fallback_without_key_or_model():
    interpreter = Interpreter(api_key=None, model=None)

    result = interpreter.analyze_margin({"monthlyAiCogs": "4820"}, ["tool:monthlyAiCogs"])

    assert result.headline
    assert "tool:monthlyAiCogs" in result.explanation


def test_interpreter_rejects_uncited_numeric_llm_claims():
    interpreter = Interpreter(
        api_key="test-key",
        model=FakeStructuredModel(Analysis(headline="Switch now", explanation="This saves 38 percent.")),
    )

    result = interpreter.analyze_margin({"monthlyAiCogs": "4820"}, ["tool:monthlyAiCogs"])

    assert "38 percent" not in result.explanation
    assert "tool:monthlyAiCogs" in result.explanation


def test_interpreter_keeps_numeric_claims_when_tool_ref_is_cited():
    interpreter = Interpreter(
        api_key="test-key",
        model=FakeStructuredModel(
            Analysis(headline="Switch now", explanation="This saves 38 percent according to tool:monthlyAiCogs.")
        ),
    )

    result = interpreter.analyze_margin({"monthlyAiCogs": "4820"}, ["tool:monthlyAiCogs"])

    assert "38 percent" in result.explanation
    assert "tool:monthlyAiCogs" in result.explanation
