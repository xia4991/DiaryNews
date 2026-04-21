import os
import sqlite3
from contextlib import contextmanager

from backend.chat.config import CHAT_DB_PATH

_SCHEMA = """\
CREATE TABLE IF NOT EXISTS kb_sources (
    id            TEXT PRIMARY KEY,
    source_type   TEXT NOT NULL,
    title         TEXT NOT NULL,
    path_or_ref   TEXT NOT NULL,
    topic         TEXT,
    language      TEXT,
    status        TEXT NOT NULL DEFAULT 'ready',
    updated_at    TEXT,
    ingested_at   TEXT NOT NULL,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS kb_chunks (
    id          TEXT PRIMARY KEY,
    source_id   TEXT NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section     TEXT,
    content     TEXT NOT NULL,
    vector_id   TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    owner_id    INTEGER,
    title       TEXT NOT NULL,
    topic_hint  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    sources         TEXT,
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id           TEXT PRIMARY KEY,
    source_group TEXT NOT NULL,
    status       TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    finished_at  TEXT,
    notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kb_sources_topic ON kb_sources(topic, status);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_source ON kb_chunks(source_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_group ON ingestion_runs(source_group, started_at);
"""


def _column_exists(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row[1] == column_name for row in rows)


def init_db() -> None:
    os.makedirs(os.path.dirname(CHAT_DB_PATH) or ".", exist_ok=True)
    with sqlite3.connect(CHAT_DB_PATH) as conn:
        conn.executescript(_SCHEMA)
        if not _column_exists(conn, "conversations", "owner_id"):
            conn.execute("ALTER TABLE conversations ADD COLUMN owner_id INTEGER")
        if not _column_exists(conn, "conversations", "topic_hint"):
            conn.execute("ALTER TABLE conversations ADD COLUMN topic_hint TEXT")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversations_owner_updated "
            "ON conversations(owner_id, updated_at)"
        )


@contextmanager
def get_db():
    conn = sqlite3.connect(CHAT_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
