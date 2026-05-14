# DiaryNews

葡萄牙华人信息中心 — a news aggregator and community hub for the Chinese community in Portugal. Fetches RSS feeds, scrapes article content, and generates AI summaries with Chinese translations.

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
  database.py           <- SQLite schema init and connection management
  utils.py              <- Shared utilities (strip_html)
  storage/
    __init__.py          <- Re-exports all public functions
    base.py              <- DB initialization, metadata helpers
    news.py              <- News article CRUD
    ideas.py             <- Ideas CRUD
    listings.py          <- Jobs and listings CRUD
    users.py             <- User accounts CRUD
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

**Backend + frontend together**:
```bash
./run-project.sh
```

Stop the local development stack from another terminal:
```bash
./stop-project.sh --dev
```

If dependencies need to be installed or refreshed:
```bash
./run-project.sh --install
```

**Public website stack** (`https://app.huarenpt.com` via Caddy + Cloudflare Tunnel):
```bash
./run-public.sh
```

Stop every process started by either runner:
```bash
./stop-project.sh
```

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
| `MINIMAX_API_KEY` | No | AI summaries and Chinese translations for articles |
