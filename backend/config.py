"""Infrastructure constants — database, API endpoints, feature flags."""

import os

from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.environ.get("DB_PATH", "data/diarynews.db")
# How many recent articles GET /api/news serves in one (un-paginated) response.
# This only bounds the feed payload; article storage itself is uncapped.
NEWS_FEED_LIMIT = int(os.environ.get("NEWS_FEED_LIMIT", "3000"))
# Hard cap on stored article rows. 0 = unlimited (never delete old articles).
# When > 0, the oldest rows past the cap are trimmed on each save.
MAX_STORED_ARTICLES = int(os.environ.get("MAX_STORED_ARTICLES", "0"))
MAX_VIDEOS = 1000

MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions"
MINIMAX_MODEL = "MiniMax-M2.5"
# Pacing for batch MiniMax callers. Was hard-coded inside call_minimax; now the
# enrichment loop sleeps between iterations and one-off callers (brief gen) skip it.
MINIMAX_RATE_LIMIT_SLEEP_SEC = int(os.environ.get("MINIMAX_RATE_LIMIT_SLEEP_SEC", "3"))
MINIMAX_TIMEOUT_SEC = int(os.environ.get("MINIMAX_TIMEOUT_SEC", "60"))
MINIMAX_MAX_RETRIES = int(os.environ.get("MINIMAX_MAX_RETRIES", "2"))


ENABLE_WHISPER_API   = os.environ.get("ENABLE_WHISPER_API", "false").lower() == "true"
ENABLE_WHISPER_LOCAL = os.environ.get("ENABLE_WHISPER_LOCAL", "false").lower() == "true"
WHISPER_MODEL        = os.environ.get("WHISPER_MODEL", "base")

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_EXPIRE_DAYS = int(os.environ.get("JWT_EXPIRE_DAYS", "7"))
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
ADMIN_EMAILS = [e.strip() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

# ── Media storage ────────────────────────────────────────────────────────────
# ── News fetch ───────────────────────────────────────────────────────────────
NEWS_FETCH_INTERVAL = int(os.environ.get("NEWS_FETCH_INTERVAL", "3600"))  # 0 to disable
NEWS_AUTO_COLLECT_MAX_NEW = int(os.environ.get("NEWS_AUTO_COLLECT_MAX_NEW", "60"))
NEWS_AUTO_COLLECT_MAX_AGE_HOURS = int(os.environ.get("NEWS_AUTO_COLLECT_MAX_AGE_HOURS", "12"))
NEWS_AUTO_BATCH_LLM_INTERVAL = int(os.environ.get("NEWS_AUTO_BATCH_LLM_INTERVAL", "900"))  # 0 to disable
NEWS_AUTO_BATCH_LLM_LIMIT = int(os.environ.get("NEWS_AUTO_BATCH_LLM_LIMIT", "20"))
MAX_ENRICHMENT_ATTEMPTS = int(os.environ.get("MAX_ENRICHMENT_ATTEMPTS", "3"))
# Stage A drops articles whose RSS summary has fewer than this many whitespace-split tokens.
# Set to 0 to disable the filter.
MIN_SUMMARY_WORDS = int(os.environ.get("MIN_SUMMARY_WORDS", "0"))
# When a feed ships the full article body in <content:encoded>, Stage A cleans it and
# stores it as scraped_content if it has at least this many words — so Stage B reuses
# it instead of scraping the page. Guards against teaser-in-content feeds. 0 disables.
RSS_FULLTEXT_MIN_WORDS = int(os.environ.get("RSS_FULLTEXT_MIN_WORDS", "250"))
# Stage B scrape attempts before falling back to the RSS summary. While a scrape comes back
# truncated and attempts < this, the per-article loop skips the LLM call and leaves the row
# pending so the next cycle re-scrapes. 1 = no deferral (old behaviour).
SCRAPE_MAX_ATTEMPTS = int(os.environ.get("SCRAPE_MAX_ATTEMPTS", "2"))

# ── Media storage ────────────────────────────────────────────────────────────
MEDIA_BACKEND    = os.environ.get("MEDIA_BACKEND", "local")      # local | s3
MEDIA_LOCAL_ROOT = os.environ.get("MEDIA_LOCAL_ROOT", "data/uploads")
MEDIA_PUBLIC_URL = os.environ.get("MEDIA_PUBLIC_URL", "/uploads")

# ── Site ─────────────────────────────────────────────────────────────────────
SITE_URL = os.environ.get("SITE_URL", "https://huarenpt.com")
