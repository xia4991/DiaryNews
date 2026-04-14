# DiaryNews

Personal news and YouTube reader focused on Portuguese media. Fetches RSS feeds, scrapes article content, and generates AI summaries. Also tracks YouTube channels and extracts video captions with structured summaries.

## Project Structure

```
main.py                 <- Entry point: starts FastAPI server via uvicorn
backend/
  api.py                <- Thin FastAPI REST endpoints
  services.py           <- Orchestration layer (fetch -> process -> save)
  config.py             <- Infrastructure constants (DB path, API URLs, feature flags)
  sources.py            <- Domain data (RSS feeds, category keywords)
  prompts.py            <- LLM prompt templates
  llm.py                <- MiniMax API wrapper
  news.py               <- RSS fetching, article scraping, classification
  youtube.py            <- Channel resolution, video fetching, caption extraction
  database.py           <- SQLite schema init and connection management
  utils.py              <- Shared utilities (strip_html)
  storage/
    __init__.py          <- Re-exports all public functions
    base.py              <- DB initialization, metadata helpers
    news.py              <- News article CRUD
    youtube.py           <- Videos, channels, captions CRUD
    ideas.py             <- Ideas CRUD
    migration.py         <- JSON-to-SQLite migration (startup-only)
react-frontend/          <- React SPA (Vite + Tailwind)
data/
  diarynews.db           <- SQLite database (auto-created)
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # then fill in your API keys
```

### Run

**Backend** (terminal 1):
```bash
python main.py
```

**Frontend** (terminal 2):
```bash
cd react-frontend
npm install   # first time only
npm run dev -- --host
```

## Environment Variables

Create a `.env` file in the project root:

| Variable | Required | Purpose |
|---|---|---|
| `MINIMAX_API_KEY` | No | AI summaries for articles and YouTube captions |
| `YOUTUBE_API_KEY` | Yes* | Resolve YouTube channel handles via Data API v3 |
| `ENABLE_WHISPER_API` | No | `true` to enable Tier 2 caption transcription |
| `OPENAI_API_KEY` | No | Required when `ENABLE_WHISPER_API=true` |
| `ENABLE_WHISPER_LOCAL` | No | `true` to enable Tier 3 local Whisper transcription |
| `WHISPER_MODEL` | No | Local Whisper model name (default: `base`) |

\* Required only to add new YouTube channels. Video fetching and captions work without it.

## Caption Tiers

Video captions are fetched with a 3-tier fallback:

1. **YouTube captions** (`youtube-transcript-api`) — always attempted, no cost
2. **Whisper API** (`openai`) — requires `ENABLE_WHISPER_API=true` and `OPENAI_API_KEY`
3. **Local Whisper** (`openai-whisper`) — requires `ENABLE_WHISPER_LOCAL=true` and `pip install openai-whisper`
