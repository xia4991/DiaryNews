import os

# ── Paths ────────────────────────────────────────────────────────────────────
MODULE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(MODULE_DIR, "..", ".."))
DATA_DIR = os.environ.get("CHAT_DATA_DIR", "data")
CHAT_DB_PATH = os.path.join(DATA_DIR, "chat.db")
CHROMA_PATH = os.path.join(DATA_DIR, "chroma")
WIKI_ROOT = os.environ.get("CHAT_WIKI_ROOT", os.path.join(PROJECT_ROOT, "wiki"))

# ── MiniMax LLM ──────────────────────────────────────────────────────────────
MINIMAX_API_URL = os.environ.get(
    "MINIMAX_API_URL",
    "https://api.minimaxi.chat/v1/text/chatcompletion_v2",
)
MINIMAX_MODEL = os.environ.get("MINIMAX_MODEL", "MiniMax-Text-01")

# ── Chunking ─────────────────────────────────────────────────────────────────
CHUNK_SIZE = 800       # characters (~200 tokens)
CHUNK_OVERLAP = 200    # characters

# ── RAG ──────────────────────────────────────────────────────────────────────
RAG_TOP_K = 5          # number of chunks to retrieve
MAX_HISTORY = 10       # messages (5 turns) of conversation history in prompt
