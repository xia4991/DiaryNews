import os
import sqlite3
from contextlib import contextmanager

from backend.chat.config import CHAT_DB_PATH

_SCHEMA = """\
CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    file_size   INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    uploaded_at TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'processing'
);

CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);
"""


def init_db() -> None:
    os.makedirs(os.path.dirname(CHAT_DB_PATH) or ".", exist_ok=True)
    with sqlite3.connect(CHAT_DB_PATH) as conn:
        conn.executescript(_SCHEMA)


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
