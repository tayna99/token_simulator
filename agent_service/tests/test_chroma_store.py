import json
from pathlib import Path

import pytest

from rag.chroma_store import (
    ChromaOfficialDocsStore,
    build_hash_embedding,
    load_official_doc_chunks_jsonl,
    rag_evidence_from_chroma_results,
)


class FakeCollection:
    def __init__(self):
        self.items = {}

    def upsert(self, *, ids, documents, embeddings, metadatas):
        for index, item_id in enumerate(ids):
            self.items[item_id] = {
                "document": documents[index],
                "embedding": embeddings[index],
                "metadata": metadatas[index],
            }

    def query(self, *, query_embeddings, n_results, where=None):
        query = query_embeddings[0]
        rows = []
        for item_id, item in self.items.items():
            metadata = item["metadata"]
            if where and any(metadata.get(key) != value for key, value in where.items()):
                continue
            score = sum(left * right for left, right in zip(query, item["embedding"]))
            rows.append((score, item_id, item))
        rows.sort(reverse=True)
        rows = rows[:n_results]
        return {
            "ids": [[item_id for _, item_id, _ in rows]],
            "documents": [[item["document"] for _, _, item in rows]],
            "metadatas": [[item["metadata"] for _, _, item in rows]],
            "distances": [[1 - score for score, _, _ in rows]],
        }


class FakeClient:
    def __init__(self):
        self.collection = FakeCollection()

    def get_or_create_collection(self, name, metadata=None):
        self.name = name
        self.metadata = metadata
        return self.collection


def chunk(section, text):
    return {
        "id": f"source:google-pricing#{section}",
        "collection": "official_docs",
        "text": text,
        "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",
        "refs": ["source:google-pricing", f"source:google-pricing#{section}"],
        "metadata": {
            "sourceId": "google-pricing",
            "provider": "google",
            "servingProvider": "first_party",
            "modelFamilies": ["gemini"],
            "sourceKind": "pricing",
            "sourceLanguage": "en",
            "pricingRegion": "global",
            "officialSourceTrust": "official_pricing",
            "capturedAt": "2026-05-24T00:00:00.000Z",
            "headingPath": ["Gemini API", section],
            "sectionType": section.lower(),
            "contentHash": section,
        },
    }


def test_chroma_store_upserts_chunks_and_searches_with_metadata_refs():
    store = ChromaOfficialDocsStore(client=FakeClient(), dimensions=32)
    chunks = [
        chunk("Authentication", "Use OAuth bearer tokens."),
        chunk("Pricing", "Cached input tokens receive a discount for repeated context."),
    ]

    store.upsert_chunks(chunks)
    results = store.search("cached token pricing discount", top_k=1, where={"sourceKind": "pricing"})

    assert store.stats() == {"collection": "official_docs", "dimensions": 32, "itemCount": 2}
    assert results[0]["id"] == "source:google-pricing#Pricing"
    assert results[0]["refs"] == ["source:google-pricing", "source:google-pricing#Pricing"]
    assert results[0]["metadata"]["headingPath"] == ["Gemini API", "Pricing"]
    assert results[0]["mayOverrideFacts"] is False


def test_load_official_doc_chunks_jsonl_rejects_non_official_docs(tmp_path: Path):
    file = tmp_path / "chunks.jsonl"
    file.write_text(
        "\n".join([
            json.dumps(chunk("Pricing", "Cached input tokens receive a discount.")),
            json.dumps({"id": "bench-1", "collection": "benchmark_evidence", "text": "no"}),
        ]),
        encoding="utf-8",
    )

    chunks = load_official_doc_chunks_jsonl(file)

    assert [item["id"] for item in chunks] == ["source:google-pricing#Pricing"]


def test_rag_evidence_from_chroma_results_preserves_fact_authority():
    result = {
        "id": "source:google-pricing#Pricing",
        "text": "Cached input tokens receive a discount.",
        "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",
        "refs": ["source:google-pricing"],
        "score": 0.92,
        "metadata": {"sourceId": "google-pricing", "headingPath": ["Gemini API", "Pricing"]},
        "mayOverrideFacts": False,
    }

    evidence = rag_evidence_from_chroma_results(
        query="cached token pricing",
        results=[result],
        structured_fact_refs=["fact:gemini-3-5-flash"],
    )

    assert evidence["evidence"]["mayOverrideFacts"] is False
    assert evidence["evidence"]["results"]["official_docs"]["refs"] == [
        "source:google-pricing",
        "fact:gemini-3-5-flash",
    ]
    assert evidence["contextBlocks"][0]["mayOverrideFacts"] is False
    assert evidence["metadata"]["retrieval"] == "chroma"


def test_hash_embedding_is_stable_and_normalized():
    first = build_hash_embedding("cached token pricing", dimensions=16)
    second = build_hash_embedding("cached token pricing", dimensions=16)

    assert first == second
    assert len(first) == 16
    assert pytest.approx(sum(value * value for value in first), rel=1e-6) == 1.0
