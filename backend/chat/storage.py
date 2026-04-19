import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.chat.database import get_db, init_db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _loads_sources(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return []


def _loads_metadata(value: Optional[str]) -> dict:
    if not value:
        return {}
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return {}


def _row_to_source(row) -> dict:
    item = dict(row)
    item["metadata"] = _loads_metadata(item.pop("metadata_json", None))
    return item


def _row_to_message(row) -> dict:
    item = dict(row)
    item["sources"] = _loads_sources(item.get("sources"))
    return item


def create_ingestion_run(source_group: str = "wiki", status: str = "running", notes: Optional[str] = None) -> dict:
    init_db()
    run_id = str(uuid.uuid4())
    started_at = _now_iso()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO ingestion_runs (id, source_group, status, started_at, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (run_id, source_group, status, started_at, notes),
        )
        row = conn.execute("SELECT * FROM ingestion_runs WHERE id = ?", (run_id,)).fetchone()
    return dict(row)


def finish_ingestion_run(run_id: str, status: str = "completed", notes: Optional[str] = None) -> dict:
    init_db()
    finished_at = _now_iso()
    with get_db() as conn:
        conn.execute(
            """
            UPDATE ingestion_runs
            SET status = ?, finished_at = ?, notes = COALESCE(?, notes)
            WHERE id = ?
            """,
            (status, finished_at, notes, run_id),
        )
        row = conn.execute("SELECT * FROM ingestion_runs WHERE id = ?", (run_id,)).fetchone()
    if row is None:
        raise KeyError(run_id)
    return dict(row)


def upsert_kb_source(
    source_id: str,
    title: str,
    path_or_ref: str,
    topic: Optional[str] = None,
    language: Optional[str] = "zh",
    status: str = "ready",
    updated_at: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    source_type: str = "wiki",
) -> dict:
    init_db()
    ingested_at = _now_iso()
    metadata_json = json.dumps(metadata or {}, ensure_ascii=False)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO kb_sources (
                id, source_type, title, path_or_ref, topic, language, status,
                updated_at, ingested_at, metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                source_type = excluded.source_type,
                title = excluded.title,
                path_or_ref = excluded.path_or_ref,
                topic = excluded.topic,
                language = excluded.language,
                status = excluded.status,
                updated_at = excluded.updated_at,
                ingested_at = excluded.ingested_at,
                metadata_json = excluded.metadata_json
            """,
            (
                source_id,
                source_type,
                title,
                path_or_ref,
                topic,
                language,
                status,
                updated_at,
                ingested_at,
                metadata_json,
            ),
        )
        row = conn.execute("SELECT * FROM kb_sources WHERE id = ?", (source_id,)).fetchone()
    return _row_to_source(row)


def list_kb_sources(topic: Optional[str] = None, status: Optional[str] = None) -> List[dict]:
    init_db()
    query = "SELECT * FROM kb_sources WHERE 1 = 1"
    params: List[str] = []
    if topic:
        query += " AND topic = ?"
        params.append(topic)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY COALESCE(updated_at, ingested_at) DESC, title ASC"
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_source(row) for row in rows]


def get_kb_source(source_id: str) -> dict:
    init_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM kb_sources WHERE id = ?", (source_id,)).fetchone()
    if row is None:
        raise KeyError(source_id)
    return _row_to_source(row)


def delete_kb_source(source_id: str) -> None:
    init_db()
    with get_db() as conn:
        conn.execute("DELETE FROM kb_sources WHERE id = ?", (source_id,))


def replace_source_chunks(source_id: str, chunks: List[dict]) -> List[dict]:
    init_db()
    created_at = _now_iso()
    inserted: List[dict] = []
    with get_db() as conn:
        conn.execute("DELETE FROM kb_chunks WHERE source_id = ?", (source_id,))
        for index, chunk in enumerate(chunks):
            chunk_id = chunk.get("id") or f"{source_id}:{index}"
            section = chunk.get("section")
            content = chunk["content"].strip()
            vector_id = chunk.get("vector_id")
            conn.execute(
                """
                INSERT INTO kb_chunks (id, source_id, chunk_index, section, content, vector_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (chunk_id, source_id, index, section, content, vector_id, created_at),
            )
            row = conn.execute("SELECT * FROM kb_chunks WHERE id = ?", (chunk_id,)).fetchone()
            inserted.append(dict(row))
    return inserted


def list_source_chunks(source_id: str) -> List[dict]:
    init_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM kb_chunks WHERE source_id = ? ORDER BY chunk_index ASC",
            (source_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def create_conversation(title: str, topic_hint: Optional[str] = None) -> dict:
    init_db()
    conversation_id = str(uuid.uuid4())
    now = _now_iso()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO conversations (id, title, topic_hint, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (conversation_id, title, topic_hint, now, now),
        )
        row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
    return dict(row)


def list_conversations(limit: int = 50) -> List[dict]:
    init_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_conversation(conversation_id: str) -> dict:
    init_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
    if row is None:
        raise KeyError(conversation_id)
    return dict(row)


def delete_conversation(conversation_id: str) -> None:
    init_db()
    with get_db() as conn:
        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))


def list_messages(conversation_id: str, limit: Optional[int] = None) -> List[dict]:
    init_db()
    query = "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC"
    params: List[object] = [conversation_id]
    if limit is not None:
        query += " LIMIT ?"
        params.append(limit)
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_message(row) for row in rows]


def add_message(conversation_id: str, role: str, content: str, sources: Optional[List] = None) -> dict:
    init_db()
    now = _now_iso()
    sources_json = json.dumps(sources or [], ensure_ascii=False)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO messages (conversation_id, role, content, sources, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (conversation_id, role, content, sources_json, now),
        )
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now, conversation_id),
        )
        row = conn.execute(
            """
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
    return _row_to_message(row)
