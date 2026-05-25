"""Index official-doc chunks into the Chroma official_docs collection."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from rag.chroma_store import ChromaOfficialDocsStore, load_official_doc_chunks_jsonl


DEFAULT_CHUNKS_PATH = Path("artifacts/research/official-watch/official-docs-chunks.jsonl")


def index_official_docs(
    chunks_path: str | Path = DEFAULT_CHUNKS_PATH,
    *,
    store: Any | None = None,
) -> dict[str, Any]:
    chunks = load_official_doc_chunks_jsonl(chunks_path)
    vector_store = store or ChromaOfficialDocsStore()
    indexed = vector_store.upsert_chunks(chunks)
    return {
        "indexed": indexed,
        "stats": vector_store.stats(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Index official API docs into Chroma.")
    parser.add_argument(
        "--chunks",
        default=str(DEFAULT_CHUNKS_PATH),
        help="Path to official-docs-chunks.jsonl from research:official-watch.",
    )
    args = parser.parse_args()
    print(json.dumps(index_official_docs(args.chunks), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
