import sqlite3
from contextlib import contextmanager

from backend.config import DB_PATH


def _migrate(conn) -> None:
    for col in ["title_zh TEXT", "content_zh TEXT", "tags_zh TEXT"]:
        try:
            conn.execute(f"ALTER TABLE articles ADD COLUMN {col}")
        except sqlite3.OperationalError:
            pass
    for col in ["phone TEXT", "updated_at TEXT"]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col}")
        except sqlite3.OperationalError:
            pass


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
                ai_summary       TEXT,
                title_zh         TEXT,
                content_zh       TEXT,
                tags_zh          TEXT
            );

            DROP TABLE IF EXISTS captions;
            DROP TABLE IF EXISTS videos;
            DROP TABLE IF EXISTS channels;

            CREATE TABLE IF NOT EXISTS ideas (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT    NOT NULL,
                category   TEXT    NOT NULL DEFAULT 'General',
                content    TEXT    NOT NULL DEFAULT '',
                created_at TEXT    NOT NULL,
                updated_at TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published DESC);
            CREATE TABLE IF NOT EXISTS users (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id  TEXT    UNIQUE NOT NULL,
                email      TEXT    UNIQUE NOT NULL,
                name       TEXT,
                avatar     TEXT,
                phone      TEXT,
                is_admin   BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT    NOT NULL,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS listings (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                kind              TEXT    NOT NULL CHECK (kind IN ('job','realestate','secondhand')),
                owner_id          INTEGER NOT NULL REFERENCES users(id),
                title             TEXT    NOT NULL,
                description       TEXT,
                location          TEXT,
                status            TEXT    NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','hidden','removed','expired')),
                contact_phone     TEXT,
                contact_whatsapp  TEXT,
                contact_email     TEXT,
                source_url        TEXT,
                created_at        TEXT    NOT NULL,
                updated_at        TEXT    NOT NULL,
                expires_at        TEXT
            );

            CREATE TABLE IF NOT EXISTS listing_images (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id         INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                position           INTEGER NOT NULL,
                storage_key        TEXT    NOT NULL,
                thumb_key          TEXT    NOT NULL,
                original_filename  TEXT,
                bytes              INTEGER,
                width              INTEGER,
                height             INTEGER,
                created_at         TEXT
            );

            CREATE TABLE IF NOT EXISTS listing_jobs (
                listing_id   INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
                industry     TEXT    NOT NULL CHECK (industry IN
                               ('Restaurant','ShoppingStore','Driving','Other')),
                salary_range TEXT
            );

            CREATE TABLE IF NOT EXISTS listing_realestate (
                listing_id   INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
                deal_type    TEXT    NOT NULL CHECK (deal_type IN ('sale','rent')),
                price_cents  INTEGER NOT NULL,
                rooms        INTEGER,
                bathrooms    INTEGER,
                area_m2      INTEGER,
                furnished    INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS listing_reports (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id   INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                reporter_id  INTEGER NOT NULL REFERENCES users(id),
                reason       TEXT    NOT NULL,
                created_at   TEXT    NOT NULL,
                resolved_at  TEXT,
                resolution   TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_ideas_created                ON ideas (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_listings_kind_status_created ON listings (kind, status, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_listings_owner               ON listings (owner_id);
            CREATE INDEX IF NOT EXISTS idx_listing_images_listing       ON listing_images (listing_id, position);
            CREATE INDEX IF NOT EXISTS idx_reports_listing              ON listing_reports (listing_id);
            CREATE INDEX IF NOT EXISTS idx_reports_unresolved           ON listing_reports (created_at DESC)
                WHERE resolved_at IS NULL;
        """)
        _migrate(conn)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
