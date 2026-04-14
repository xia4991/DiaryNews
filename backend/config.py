"""Infrastructure constants — database, API endpoints, feature flags."""

import os

from dotenv import load_dotenv

load_dotenv()

DB_PATH = "data/diarynews.db"
MAX_ARTICLES = 200
MAX_VIDEOS = 100

MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions"
MINIMAX_MODEL = "minimax-m2.7"

ENABLE_WHISPER_API   = os.environ.get("ENABLE_WHISPER_API", "false").lower() == "true"
ENABLE_WHISPER_LOCAL = os.environ.get("ENABLE_WHISPER_LOCAL", "false").lower() == "true"
WHISPER_MODEL        = os.environ.get("WHISPER_MODEL", "base")
