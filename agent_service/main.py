"""FastAPI entrypoint for the Python LangChain interpretation service."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from agentic_runtime import run_agentic_runtime
from interpreter import Interpreter
from pipeline import run_pipeline, run_team_cost_pipeline
from rag.chroma_store import (
    ChromaOfficialDocsStore,
    ChromaUnavailableError,
    rag_evidence_from_chroma_results,
)
from schemas import (
    AgentRunInput,
    AgentRunResponse,
    P1RagEvidenceRequest,
    RunInput,
    RunOutput,
    TeamCostRunInput,
    TeamCostRunOutput,
)

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


def _chroma_store() -> ChromaOfficialDocsStore:
    return ChromaOfficialDocsStore(
        path=os.getenv("CHROMA_PATH", "agent_service/.chroma"),
        dimensions=int(os.getenv("RAG_EMBEDDING_DIMENSIONS", "64")),
    )


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


@app.post("/api/rag/p1-evidence")
def p1_rag_evidence(payload: P1RagEvidenceRequest):
    try:
        store = _chroma_store()
    except ChromaUnavailableError as error:
        return JSONResponse(
            status_code=503,
            content={
                "persistence": "not_configured",
                "evidence": {
                    "mayOverrideFacts": False,
                    "results": {
                        "official_docs": {
                            "kind": "official_docs",
                            "found": False,
                            "refs": [],
                            "mayOverrideFacts": False,
                            "records": [],
                            "scores": [],
                            "warnings": ["rag_index_unavailable"],
                        },
                        "benchmark_evidence": {
                            "kind": "benchmark",
                            "found": False,
                            "refs": [],
                            "mayOverrideFacts": False,
                            "records": [],
                            "scores": [],
                            "warnings": ["baseline_unavailable"],
                        },
                        "decision_history": {
                            "kind": "decision_history",
                            "found": False,
                            "refs": [],
                            "mayOverrideFacts": False,
                            "records": [],
                            "scores": [],
                            "warnings": ["decision_history_unavailable"],
                        },
                    },
                    "warnings": ["rag_index_unavailable"],
                },
                "contextBlocks": [],
                "metadata": {
                    "workspaceId": payload.workspaceId,
                    "query": payload.query,
                    "retrieval": "chroma",
                },
                "error": str(error),
            },
        )

    if payload.officialDocChunks:
        store.upsert_chunks(payload.officialDocChunks)
    results = store.search(
        payload.query,
        top_k=payload.topK,
        where=payload.filters or None,
    )
    response = rag_evidence_from_chroma_results(
        query=payload.query,
        results=results,
        structured_fact_refs=payload.structuredFactRefs,
    )
    response["metadata"]["workspaceId"] = payload.workspaceId
    return response


@app.post("/api/team-cost-agent", response_model=TeamCostRunOutput)
def run_team_cost_agent(payload: TeamCostRunInput) -> TeamCostRunOutput:
    api_key = _api_key(payload.apiKey)
    interpreter = Interpreter(api_key=api_key, model_name=_model_name())
    return TeamCostRunOutput(
        events=run_team_cost_pipeline(payload, interpreter),
        llmMode="provider-llm" if api_key else "deterministic-fallback",
    )
