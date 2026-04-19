import os
from typing import Dict, List, Tuple

from backend.chat.chunking import chunk_markdown, extract_title
from backend.chat.config import WIKI_ROOT
from backend.chat.storage import (
    create_ingestion_run,
    delete_kb_source,
    finish_ingestion_run,
    list_kb_sources,
    replace_source_chunks,
    upsert_kb_source,
)
from backend.chat.vectorstore import get_vectorstore


def _iter_markdown_files(wiki_root: str) -> List[str]:
    markdown_files: List[str] = []
    for root, _dirs, files in os.walk(wiki_root):
        for filename in files:
            if filename.lower().endswith(".md") and filename.lower() != "readme.md":
                markdown_files.append(os.path.join(root, filename))
    markdown_files.sort()
    return markdown_files


def _source_parts(file_path: str, wiki_root: str) -> Tuple[str, str, str]:
    relative_path = os.path.relpath(file_path, wiki_root).replace(os.sep, "/")
    parts = relative_path.split("/")
    topic = parts[0] if len(parts) > 1 else "general"
    slug = os.path.splitext(parts[-1])[0]
    source_id = "wiki:{0}:{1}".format(topic, slug)
    return source_id, relative_path, topic


def _load_markdown(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as handle:
        return handle.read()


def ingest_wiki(wiki_root: str = WIKI_ROOT) -> Dict:
    if not os.path.isdir(wiki_root):
        raise FileNotFoundError("Wiki root not found: {0}".format(wiki_root))

    run = create_ingestion_run(source_group="wiki", status="running", notes="wiki reindex")
    vectorstore = get_vectorstore()
    existing_sources = {
        source["id"]: source
        for source in list_kb_sources(status="ready")
        if source.get("source_type") == "wiki"
    }

    indexed_ids: List[str] = []
    total_chunks = 0

    try:
        for file_path in _iter_markdown_files(wiki_root):
            source_id, relative_path, topic = _source_parts(file_path, wiki_root)
            markdown_text = _load_markdown(file_path)
            title = extract_title(markdown_text, os.path.basename(file_path))
            source = upsert_kb_source(
                source_id=source_id,
                title=title,
                path_or_ref=relative_path,
                topic=topic,
                metadata={"relative_path": relative_path},
                updated_at=str(os.path.getmtime(file_path)),
            )

            chunk_defs = chunk_markdown(markdown_text, title)
            chunk_rows = replace_source_chunks(
                source_id,
                [
                    {
                        "id": "{0}:{1}".format(source_id, index),
                        "section": chunk["section"],
                        "content": chunk["content"],
                    }
                    for index, chunk in enumerate(chunk_defs)
                ],
            )

            upsert_kb_source(
                source_id=source_id,
                title=title,
                path_or_ref=relative_path,
                topic=topic,
                metadata={
                    "relative_path": relative_path,
                    "chunk_count": len(chunk_rows),
                },
                updated_at=str(os.path.getmtime(file_path)),
            )

            vectorstore.upsert(
                [
                    {
                        "id": row["id"],
                        "document": chunk_defs[index]["content"],
                        "metadata": {
                            "source_id": source["id"],
                            "title": source["title"],
                            "section": row["section"] or chunk_defs[index]["section"],
                            "topic": topic,
                            "path_or_ref": source["path_or_ref"],
                        },
                    }
                    for index, row in enumerate(chunk_rows)
                ]
            )

            indexed_ids.append(source_id)
            total_chunks += len(chunk_rows)

        stale_source_ids = [source_id for source_id in existing_sources if source_id not in indexed_ids]
        if stale_source_ids:
            stale_chunk_ids: List[str] = []
            for source_id in stale_source_ids:
                stale_source = existing_sources[source_id]
                chunk_count = int(stale_source.get("metadata", {}).get("chunk_count", 0) or 0)
                stale_chunk_ids.extend(["{0}:{1}".format(source_id, index) for index in range(chunk_count)])
            if stale_chunk_ids:
                vectorstore.delete(ids=stale_chunk_ids)
            for source_id in stale_source_ids:
                delete_kb_source(source_id)

        notes = "Indexed {0} wiki pages and {1} chunks".format(len(indexed_ids), total_chunks)
        finish_ingestion_run(run["id"], status="completed", notes=notes)
        return {
            "run_id": run["id"],
            "pages_indexed": len(indexed_ids),
            "chunks_indexed": total_chunks,
            "wiki_root": wiki_root,
        }
    except Exception as exc:
        finish_ingestion_run(run["id"], status="failed", notes=str(exc))
        raise
