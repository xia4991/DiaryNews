import sqlite3
from contextlib import contextmanager

from backend.config import DB_PATH


def _migrate(conn) -> None:
    article_cols = [
        "title_zh TEXT",
        "content_zh TEXT",
        "tags_zh TEXT",
        "view_count INTEGER NOT NULL DEFAULT 0",
        "author TEXT DEFAULT ''",
        "image_url TEXT DEFAULT ''",
        "language TEXT DEFAULT 'pt'",
        "guid TEXT DEFAULT ''",
        "rss_category TEXT DEFAULT ''",
        "fetched_at TEXT DEFAULT ''",
        "enrichment_status TEXT DEFAULT 'pending'",
        "enrichment_attempts INTEGER NOT NULL DEFAULT 0",
        "enrichment_error TEXT DEFAULT ''",
        "enriched_at TEXT DEFAULT ''",
        "enrichment_model TEXT DEFAULT ''",
        "enrichment_prompt_version TEXT DEFAULT ''",
        "enrichment_input_hash TEXT DEFAULT ''",
        "summary_zh TEXT DEFAULT ''",
        "relevance_reason TEXT DEFAULT ''",
    ]
    for col in article_cols:
        try:
            conn.execute(f"ALTER TABLE articles ADD COLUMN {col}")
        except sqlite3.OperationalError:
            pass
    for col in ["phone TEXT", "updated_at TEXT", "google_name TEXT"]:
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
                link                 TEXT PRIMARY KEY,
                title                TEXT NOT NULL,
                summary              TEXT,
                source               TEXT,
                category             TEXT,
                published            TEXT,
                scraped_content      TEXT,
                ai_summary           TEXT,
                title_zh             TEXT,
                content_zh           TEXT,
                tags_zh              TEXT,
                view_count           INTEGER NOT NULL DEFAULT 0,
                author               TEXT    DEFAULT '',
                image_url            TEXT    DEFAULT '',
                language             TEXT    DEFAULT 'pt',
                guid                 TEXT    DEFAULT '',
                rss_category         TEXT    DEFAULT '',
                fetched_at           TEXT    DEFAULT '',
                enrichment_status    TEXT    DEFAULT 'pending',
                enrichment_attempts  INTEGER NOT NULL DEFAULT 0,
                enrichment_error     TEXT    DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS source_health (
                source                TEXT PRIMARY KEY,
                last_fetched_at       TEXT,
                last_status           TEXT,
                last_error            TEXT,
                last_duration_ms      INTEGER,
                entries_count         INTEGER,
                articles_count        INTEGER,
                consecutive_failures  INTEGER NOT NULL DEFAULT 0,
                total_fetches         INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS daily_news_briefs (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                brief_date         TEXT    NOT NULL,
                brief_type         TEXT    NOT NULL CHECK (brief_type IN ('china','portugal')),
                title              TEXT    NOT NULL,
                summary_zh         TEXT    NOT NULL,
                bullets_json       TEXT    NOT NULL,
                article_links_json TEXT    NOT NULL,
                article_count      INTEGER NOT NULL DEFAULT 0,
                generated_at       TEXT    NOT NULL,
                updated_at         TEXT    NOT NULL
            );

            DROP TABLE IF EXISTS captions;
            DROP TABLE IF EXISTS videos;
            DROP TABLE IF EXISTS channels;

            CREATE TABLE IF NOT EXISTS community_events (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id          INTEGER NOT NULL REFERENCES users(id),
                title             TEXT    NOT NULL,
                category          TEXT    NOT NULL,
                description       TEXT    NOT NULL DEFAULT '',
                city              TEXT,
                venue             TEXT,
                start_at          TEXT    NOT NULL,
                end_at            TEXT,
                is_free           INTEGER NOT NULL DEFAULT 1,
                fee_text          TEXT,
                contact_phone     TEXT,
                contact_whatsapp  TEXT,
                contact_email     TEXT,
                signup_url        TEXT,
                status            TEXT    NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','hidden','removed')),
                created_at        TEXT    NOT NULL,
                updated_at        TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS community_posts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id    INTEGER NOT NULL REFERENCES users(id),
                title       TEXT    NOT NULL,
                category    TEXT    NOT NULL,
                content     TEXT    NOT NULL DEFAULT '',
                city        TEXT,
                status      TEXT    NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','hidden','removed')),
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS community_post_replies (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id      INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
                owner_id     INTEGER NOT NULL REFERENCES users(id),
                content      TEXT    NOT NULL,
                status       TEXT    NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','hidden','removed')),
                created_at   TEXT    NOT NULL,
                updated_at   TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published DESC);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_news_briefs_type_date
                ON daily_news_briefs (brief_type, brief_date DESC);
            CREATE TABLE IF NOT EXISTS users (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id  TEXT    UNIQUE NOT NULL,
                email      TEXT    UNIQUE NOT NULL,
                name       TEXT,
                google_name TEXT,
                avatar     TEXT,
                phone      TEXT,
                is_admin   BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT    NOT NULL,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS platform_announcements (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                content     TEXT    NOT NULL,
                status      TEXT    NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','hidden','removed')),
                is_pinned   INTEGER NOT NULL DEFAULT 0,
                created_by  INTEGER NOT NULL REFERENCES users(id),
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_platform_announcements_status_pinned
                ON platform_announcements (status, is_pinned DESC, updated_at DESC, created_at DESC);

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

            CREATE TABLE IF NOT EXISTS listing_secondhand (
                listing_id   INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
                category     TEXT    NOT NULL CHECK (category IN
                               ('Electronics','Furniture','Clothing','Vehicle',
                                'Baby','Sports','Books','Other')),
                condition    TEXT    NOT NULL CHECK (condition IN
                               ('new','like_new','good','fair')),
                price_cents  INTEGER NOT NULL
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

            CREATE INDEX IF NOT EXISTS idx_community_events_start       ON community_events (status, start_at ASC);
            CREATE INDEX IF NOT EXISTS idx_community_events_owner       ON community_events (owner_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_community_posts_created      ON community_posts (status, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_community_posts_owner        ON community_posts (owner_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_community_replies_post       ON community_post_replies (post_id, created_at ASC);
            CREATE INDEX IF NOT EXISTS idx_community_replies_owner      ON community_post_replies (owner_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_listings_kind_status_created ON listings (kind, status, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_listings_owner               ON listings (owner_id);
            CREATE INDEX IF NOT EXISTS idx_listing_images_listing       ON listing_images (listing_id, position);
            CREATE INDEX IF NOT EXISTS idx_reports_listing              ON listing_reports (listing_id);
            CREATE INDEX IF NOT EXISTS idx_reports_unresolved           ON listing_reports (created_at DESC)
                WHERE resolved_at IS NULL;

            CREATE TABLE IF NOT EXISTS admin_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type  TEXT    NOT NULL,
                message     TEXT    NOT NULL,
                details     TEXT,
                created_at  TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_admin_logs_type    ON admin_logs (event_type, created_at DESC);
        """)
        _migrate(conn)
        # Indexes that depend on migrated columns must run after _migrate
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_articles_enrichment "
            "ON articles (enrichment_status, published DESC)"
        )


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
