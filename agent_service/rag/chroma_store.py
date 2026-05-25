"""Chroma-backed official-docs vector retrieval.

The deterministic TypeScript cost engine remains the authority for numeric
facts. This module only stores and retrieves official-document context blocks.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Mapping, Sequence


CHROMA_COLLECTION = "official_docs"


class ChromaUnavailableError(RuntimeError):
    """Raised when the real chromadb dependency is unavailable."""


def _stable_hash(value: str) -> int:
    result = 2166136261
    for char in value:
        result ^= ord(char)
        result = (result * 16777619) & 0xFFFFFFFF
    return result


def _terms(text: str) -> list[str]:
    normalized = []
    current = []
    for char in text.lower():
        if char.isalnum() or char in "._:/{}-":
            current.append(char)
        elif current:
            term = "".join(current)
            normalized.append(term[:-1] if term.endswith("s") else term)
            current = []
    if current:
        term = "".join(current)
        normalized.append(term[:-1] if term.endswith("s") else term)
    return [term for term in normalized if len(term) > 1]


def build_hash_embedding(text: str, *, dimensions: int = 64) -> list[float]:
    vector = [0.0 for _ in range(dimensions)]
    for term in _terms(text):
        hashed = _stable_hash(term)
        vector[hashed % dimensions] += 1.0 if hashed % 2 == 0 else -1.0
    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0:
        return vector
    return [round(value / magnitude, 8) for value in vector]


def _json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError:
            return []
        return decoded if isinstance(decoded, list) else []
    return []


def _encode_metadata(chunk: Mapping[str, Any]) -> dict[str, str | int | float | bool]:
    metadata = dict(chunk.get("metadata") or {})
    return {
        "collection": str(chunk.get("collection", CHROMA_COLLECTION)),
        "sourceUrl": str(chunk.get("sourceUrl", "")),
        "refs": json.dumps(chunk.get("refs") or [], ensure_ascii=False),
        "sourceId": str(metadata.get("sourceId", "")),
        "provider": str(metadata.get("provider", "")),
        "servingProvider": str(metadata.get("servingProvider", "")),
        "modelFamilies": json.dumps(metadata.get("modelFamilies") or [], ensure_ascii=False),
        "sourceKind": str(metadata.get("sourceKind", "")),
        "sourceLanguage": str(metadata.get("sourceLanguage", "")),
        "pricingRegion": str(metadata.get("pricingRegion", "")),
        "officialSourceTrust": str(metadata.get("officialSourceTrust", "")),
        "capturedAt": str(metadata.get("capturedAt", "")),
        "headingPath": json.dumps(metadata.get("headingPath") or [], ensure_ascii=False),
        "sectionType": str(metadata.get("sectionType", "")),
        "endpointMethod": str(metadata.get("endpointMethod", "")),
        "endpointPath": str(metadata.get("endpointPath", "")),
        "contentHash": str(metadata.get("contentHash", "")),
    }


def _decode_metadata(metadata: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "sourceId": metadata.get("sourceId", ""),
        "provider": metadata.get("provider", ""),
        "servingProvider": metadata.get("servingProvider", ""),
        "modelFamilies": _json_list(metadata.get("modelFamilies")),
        "sourceKind": metadata.get("sourceKind", ""),
        "sourceLanguage": metadata.get("sourceLanguage", ""),
        "pricingRegion": metadata.get("pricingRegion", ""),
        "officialSourceTrust": metadata.get("officialSourceTrust", ""),
        "capturedAt": metadata.get("capturedAt", ""),
        "headingPath": _json_list(metadata.get("headingPath")),
        "sectionType": metadata.get("sectionType", ""),
        "endpointMethod": metadata.get("endpointMethod", "") or None,
        "endpointPath": metadata.get("endpointPath", "") or None,
        "contentHash": metadata.get("contentHash", ""),
    }


def _create_default_client(path: str | Path):
    try:
        import chromadb
    except ImportError as error:
        raise ChromaUnavailableError(
            "chromadb is not installed; run uv sync in agent_service before enabling Chroma retrieval"
        ) from error
    return chromadb.PersistentClient(path=str(path))


class ChromaOfficialDocsStore:
    def __init__(
        self,
        *,
        client: Any | None = None,
        path: str | Path = "agent_service/.chroma",
        collection_name: str = CHROMA_COLLECTION,
        dimensions: int = 64,
    ) -> None:
        self.dimensions = dimensions
        self.collection_name = collection_name
        self.client = client or _create_default_client(path)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(self, chunks: Sequence[Mapping[str, Any]]) -> int:
        official_chunks = [chunk for chunk in chunks if chunk.get("collection") == CHROMA_COLLECTION]
        if not official_chunks:
            return 0
        ids = [str(chunk["id"]) for chunk in official_chunks]
        documents = [str(chunk.get("text", "")) for chunk in official_chunks]
        embeddings = [
            build_hash_embedding(
                f"{' '.join((chunk.get('metadata') or {}).get('headingPath') or [])}\n{chunk.get('text', '')}",
                dimensions=self.dimensions,
            )
            for chunk in official_chunks
        ]
        metadatas = [_encode_metadata(chunk) for chunk in official_chunks]
        self.collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
        return len(ids)

    def search(
        self,
        query: str,
        *,
        top_k: int = 5,
        where: Mapping[str, str | int | float | bool] | None = None,
    ) -> list[dict[str, Any]]:
        query_args: dict[str, Any] = {
            "query_embeddings": [build_hash_embedding(query, dimensions=self.dimensions)],
            "n_results": top_k,
        }
        if where:
            query_args["where"] = dict(where)
        raw = self.collection.query(**query_args)
        ids = (raw.get("ids") or [[]])[0]
        documents = (raw.get("documents") or [[]])[0]
        metadatas = (raw.get("metadatas") or [[]])[0]
        distances = (raw.get("distances") or [[]])[0]
        results = []
        for index, item_id in enumerate(ids):
            metadata = metadatas[index] if index < len(metadatas) else {}
            distance = distances[index] if index < len(distances) else 1
            refs = _json_list(metadata.get("refs"))
            results.append({
                "id": item_id,
                "collection": CHROMA_COLLECTION,
                "text": documents[index] if index < len(documents) else "",
                "sourceUrl": metadata.get("sourceUrl", ""),
                "refs": refs,
                "score": round(1 - float(distance), 6),
                "mayOverrideFacts": False,
                "metadata": _decode_metadata(metadata),
            })
        return results

    def stats(self) -> dict[str, Any]:
        if hasattr(self.collection, "count"):
            item_count = self.collection.count()
        else:
            item_count = len(getattr(self.collection, "items", {}))
        return {
            "collection": self.collection_name,
            "dimensions": self.dimensions,
            "itemCount": item_count,
        }


def load_official_doc_chunks_jsonl(path: str | Path) -> list[dict[str, Any]]:
    chunks = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if record.get("collection") == CHROMA_COLLECTION:
            chunks.append(record)
    return chunks


def rag_evidence_from_chroma_results(
    *,
    query: str,
    results: Sequence[Mapping[str, Any]],
    structured_fact_refs: Sequence[str] = (),
) -> dict[str, Any]:
    official_refs: list[str] = []
    for result in results:
        official_refs.extend(str(ref) for ref in result.get("refs", []) if ref)
    refs = list(dict.fromkeys([*official_refs, *structured_fact_refs]))
    records = [
        {
            "id": result.get("id", ""),
            "text": result.get("text", ""),
            "sourceUrl": result.get("sourceUrl", ""),
        }
        for result in results
    ]
    official_docs = {
        "kind": "official_docs",
        "found": bool(results),
        "refs": refs,
        "mayOverrideFacts": False,
        "records": records,
        "scores": [result.get("score", 0) for result in results],
        "warnings": [] if results else ["official_docs_unavailable"],
    }
    empty_benchmark = {
        "kind": "benchmark",
        "found": False,
        "refs": [],
        "mayOverrideFacts": False,
        "records": [],
        "scores": [],
        "warnings": ["baseline_unavailable"],
    }
    empty_decision = {
        "kind": "decision_history",
        "found": False,
        "refs": [],
        "mayOverrideFacts": False,
        "records": [],
        "scores": [],
        "warnings": ["decision_history_unavailable"],
    }
    warnings = [
        *official_docs["warnings"],
        *empty_benchmark["warnings"],
        *empty_decision["warnings"],
    ]
    return {
        "persistence": "chroma",
        "evidence": {
            "mayOverrideFacts": False,
            "results": {
                "official_docs": official_docs,
                "benchmark_evidence": empty_benchmark,
                "decision_history": empty_decision,
            },
            "warnings": warnings,
        },
        "contextBlocks": [
            {
                "collection": CHROMA_COLLECTION,
                "text": result.get("text", ""),
                "refs": list(result.get("refs", [])),
                "sourceUrl": result.get("sourceUrl", ""),
                "score": result.get("score", 0),
                "mayOverrideFacts": False,
                "metadata": dict(result.get("metadata") or {}),
            }
            for result in results
        ],
        "metadata": {
            "workspaceId": "",
            "query": query,
            "retrieval": "chroma",
        },
    }
