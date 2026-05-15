"""Infrastructure constants — database, API endpoints, feature flags."""

import os

from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.environ.get("DB_PATH", "data/diarynews.db")
MAX_ARTICLES = 2000
MAX_VIDEOS = 1000

MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions"
MINIMAX_MODEL = "MiniMax-M2.5"

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
MAX_ENRICHMENT_ATTEMPTS = int(os.environ.get("MAX_ENRICHMENT_ATTEMPTS", "3"))
# Stage A drops articles whose RSS summary has fewer than this many whitespace-split tokens.
# Set to 0 to disable the filter.
MIN_SUMMARY_WORDS = int(os.environ.get("MIN_SUMMARY_WORDS", "30"))

# ── Media storage ────────────────────────────────────────────────────────────
MEDIA_BACKEND    = os.environ.get("MEDIA_BACKEND", "local")      # local | s3
MEDIA_LOCAL_ROOT = os.environ.get("MEDIA_LOCAL_ROOT", "data/uploads")
MEDIA_PUBLIC_URL = os.environ.get("MEDIA_PUBLIC_URL", "/uploads")

# ── Site ─────────────────────────────────────────────────────────────────────
SITE_URL = os.environ.get("SITE_URL", "https://app.huarenpt.com")
