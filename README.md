# DiaryNews

Personal news and YouTube reader focused on Portuguese media. Fetches RSS feeds, scrapes article content, and generates AI summaries. Also tracks YouTube channels and extracts video captions with structured summaries.

## Project Structure

```
app.py                  ← Entry point: Streamlit page config, sidebar, tab routing
backend/
  config.py             ← Constants, env vars, RSS sources, category definitions
  llm.py                ← MiniMax API wrapper (used by news and youtube)
  news.py               ← RSS fetching, article scraping, classification, summarization
  youtube.py            ← Channel resolution, video fetching, caption extraction
  storage.py            ← Atomic JSON persistence + data mutation helpers
  utils.py              ← Shared utilities (strip_html)
frontend/
  news.py               ← News tab UI: filters, article grid, article detail dialog
  youtube.py            ← YouTube tab UI: channel management, video grid, feed, caption dialog
data/
  news.json             ← Persisted articles (auto-created)
  youtube.json          ← Persisted channels and videos (auto-created)
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # then fill in your API keys
streamlit run app.py
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
