import sqlite3
from contextlib import contextmanager

from backend.config import DB_PATH


def init_db() -> None:
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS metadata (
                key   TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS articles (
                link             TEXT PRIMARY KEY,
                title            TEXT NOT NULL,
                summary          TEXT,
                source           TEXT,
                category         TEXT,
                published        TEXT,
                scraped_content  TEXT,
                ai_summary       TEXT
            );

            CREATE TABLE IF NOT EXISTS channels (
                handle      TEXT PRIMARY KEY,
                name        TEXT,
                channel_id  TEXT,
                category    TEXT
            );

            CREATE TABLE IF NOT EXISTS videos (
                video_id      TEXT PRIMARY KEY,
                title         TEXT,
                channel_name  TEXT,
                channel_id    TEXT,
                published     TEXT,
                thumbnail     TEXT,
                link          TEXT
            );

            CREATE TABLE IF NOT EXISTS captions (
                video_id    TEXT PRIMARY KEY,
                text        TEXT,
                language    TEXT,
                tier        INTEGER,
                fetched_at  TEXT,
                summary     TEXT
            );

            CREATE TABLE IF NOT EXISTS ideas (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT    NOT NULL,
                category   TEXT    NOT NULL DEFAULT 'General',
                content    TEXT    NOT NULL DEFAULT '',
                created_at TEXT    NOT NULL,
                updated_at TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published DESC);
            CREATE INDEX IF NOT EXISTS idx_videos_published   ON videos (published DESC);
            CREATE INDEX IF NOT EXISTS idx_videos_channel     ON videos (channel_id);
            CREATE INDEX IF NOT EXISTS idx_ideas_created      ON ideas (created_at DESC);
        """)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
