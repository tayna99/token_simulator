"""FastAPI entrypoint for the Python LangChain interpretation service."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agentic_runtime import run_agentic_runtime
from interpreter import Interpreter
from pipeline import run_pipeline, run_team_cost_pipeline
from schemas import AgentRunInput, AgentRunResponse, RunInput, RunOutput, TeamCostRunInput, TeamCostRunOutput

load_dotenv()

app = FastAPI(title="AI SaaS Cost Agent Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _api_key(payload_key: str | None) -> str | None:
    return os.getenv("OPENAI_API_KEY") or payload_key


def _model_name() -> str:
    return os.getenv("AGENT_MODEL", "gpt-5-mini")


def _agent_model(api_key: str | None):
    if not api_key:
        return None
    from langchain.chat_models import init_chat_model

    return init_chat_model(_model_name(), api_key=api_key)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/agent", response_model=RunOutput)
def run_agent(payload: RunInput) -> RunOutput:
    interpreter = Interpreter(api_key=_api_key(payload.apiKey), model_name=_model_name())
    return RunOutput(events=run_pipeline(payload, interpreter))


@app.post("/api/agent/run", response_model=AgentRunResponse)
def run_agentic(payload: AgentRunInput) -> AgentRunResponse:
    api_key = _api_key(payload.apiKey)
    return run_agentic_runtime(payload, model=_agent_model(api_key))


@app.post("/api/team-cost-agent", response_model=TeamCostRunOutput)
def run_team_cost_agent(payload: TeamCostRunInput) -> TeamCostRunOutput:
    api_key = _api_key(payload.apiKey)
    interpreter = Interpreter(api_key=api_key, model_name=_model_name())
    return TeamCostRunOutput(
        events=run_team_cost_pipeline(payload, interpreter),
        llmMode="provider-llm" if api_key else "deterministic-fallback",
    )
