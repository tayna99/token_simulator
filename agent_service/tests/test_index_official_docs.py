import json
from pathlib import Path

from scripts.index_official_docs import index_official_docs


class FakeStore:
    def __init__(self):
        self.chunks = []

    def upsert_chunks(self, chunks):
        self.chunks.extend(chunks)
        return len(chunks)

    def stats(self):
        return {"collection": "official_docs", "dimensions": 64, "itemCount": len(self.chunks)}


def test_index_official_docs_loads_jsonl_and_returns_stats(tmp_path: Path):
    chunks_file = tmp_path / "official-docs-chunks.jsonl"
    chunks_file.write_text(
        json.dumps({
            "id": "source:google-pricing#pricing",
            "collection": "official_docs",
            "text": "Cached input tokens receive a discount.",
            "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",
            "refs": ["source:google-pricing"],
            "metadata": {"sourceId": "google-pricing", "sectionType": "pricing"},
        }),
        encoding="utf-8",
    )
    store = FakeStore()

    result = index_official_docs(chunks_file, store=store)

    assert result == {
        "indexed": 1,
        "stats": {"collection": "official_docs", "dimensions": 64, "itemCount": 1},
    }
    assert store.chunks[0]["id"] == "source:google-pricing#pricing"
