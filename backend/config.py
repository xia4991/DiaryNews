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

# ── LLM provider ─────────────────────────────────────────────────────────────
# minimax | openrouter. All news enrichment + daily briefs go through llm/client.py.
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "minimax").strip().lower()
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Comma-separated, tried in order (OpenRouter `models` fallback). Free models end in ':free'.
OPENROUTER_MODELS = [m.strip() for m in os.environ.get(
    "OPENROUTER_MODELS",
    "nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free",
).split(",") if m.strip()]
# Free models are slow (~15 tokens/s observed) — a multi-article batch needs minutes.
OPENROUTER_TIMEOUT_SEC = int(os.environ.get("OPENROUTER_TIMEOUT_SEC", "600"))
OPENROUTER_MAX_RETRIES = int(os.environ.get("OPENROUTER_MAX_RETRIES", "1"))


ENABLE_WHISPER_API   = os.environ.get("ENABLE_WHISPER_API", "false").lower() == "true"
ENABLE_WHISPER_LOCAL = os.environ.get("ENABLE_WHISPER_LOCAL", "false").lower() == "true"
WHISPER_MODEL        = os.environ.get("WHISPER_MODEL", "base")

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_EXPIRE_DAYS = int(os.environ.get("JWT_EXPIRE_DAYS", "7"))
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
ADMIN_EMAILS = [e.strip() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]

# ── Client identity / analytics ──────────────────────────────────────────────
# Socket peers allowed to set CF-Connecting-IP / X-Forwarded-For (the local Caddy).
TRUSTED_PROXY_IPS = {
    ip.strip() for ip in os.environ.get("TRUSTED_PROXY_IPS", "127.0.0.1,::1").split(",") if ip.strip()
}
# Site visit events (IP, page, clicks) older than this are deleted. Stated in the privacy policy.
ANALYTICS_RETENTION_DAYS = int(os.environ.get("ANALYTICS_RETENTION_DAYS", "90"))
# Per-IP cap on /api/track events per minute; extra events are dropped silently.
ANALYTICS_MAX_EVENTS_PER_MINUTE = int(os.environ.get("ANALYTICS_MAX_EVENTS_PER_MINUTE", "60"))

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

# ── News fetch ───────────────────────────────────────────────────────────────
NEWS_FETCH_INTERVAL = int(os.environ.get("NEWS_FETCH_INTERVAL", "3600"))  # 0 to disable
NEWS_AUTO_COLLECT_MAX_NEW = int(os.environ.get("NEWS_AUTO_COLLECT_MAX_NEW", "60"))
NEWS_AUTO_COLLECT_MAX_AGE_HOURS = int(os.environ.get("NEWS_AUTO_COLLECT_MAX_AGE_HOURS", "12"))
NEWS_AUTO_BATCH_LLM_INTERVAL = int(os.environ.get("NEWS_AUTO_BATCH_LLM_INTERVAL", "900"))  # 0 to disable
NEWS_AUTO_BATCH_LLM_LIMIT = int(os.environ.get("NEWS_AUTO_BATCH_LLM_LIMIT", "20"))
# Auto Stage B loop mode: 'single' (one LLM call per article, richer content) or 'batch'
# (one call for NEWS_AUTO_ENRICH_BATCH_SIZE articles). Default: batch on OpenRouter, whose
# free tier allows only ~50 requests/day; single on MiniMax.
NEWS_AUTO_ENRICH_MODE = os.environ.get(
    "NEWS_AUTO_ENRICH_MODE", "batch" if LLM_PROVIDER == "openrouter" else "single"
).strip().lower()
NEWS_AUTO_ENRICH_BATCH_SIZE = int(os.environ.get("NEWS_AUTO_ENRICH_BATCH_SIZE", "8"))
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
