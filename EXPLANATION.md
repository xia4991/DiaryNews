# How DiaryNews Works

DiaryNews has two independent features: a **news reader** that aggregates Portuguese RSS feeds with AI summaries, and a **YouTube reader** that tracks channels and extracts video captions.

---

## News

### Overview

```
User clicks "Fetch News"
        |
        v
POST /api/news/fetch -> services.fetch_and_save_news()
        |
        v
feedparser fetches all 6 RSS feeds in sequence
        |
        v
Each new article -> scrape full text -> AI summary -> classify by category
(runs in parallel, up to 8 articles at a time)
        |
        v
Save to SQLite (deduplicate by URL, cap at 200)
        |
        v
Return new article count to frontend
```

### Step by step

**1. RSS fetching**

Six Portuguese outlets are configured in `backend/sources.py`:

| Source | Feed |
|--------|------|
| RTP | rtp.pt/noticias/rss |
| Observador | observador.pt/feed |
| SIC Noticias | sicnoticias.pt/feed |
| TVI24 | tvi24.iol.pt/rss/ultimas |
| Jornal de Noticias | jn.pt/rss |
| Publico | feedburner.com/PublicoRSS |

`feedparser` parses each feed and extracts title, summary, link, and publish date. Articles already in storage are skipped before any scraping or AI calls happen.

**2. Scraping**

For each new article, `trafilatura` fetches the full page and extracts the main body text, stripping ads, navigation, and boilerplate. If scraping fails, the RSS summary is used as fallback.

**3. AI summary**

The scraped content (up to 3000 characters) is sent to the MiniMax API with a prompt (defined in `backend/prompts.py`) asking for a 2-3 sentence factual summary in Portuguese. If `MINIMAX_API_KEY` is not set, the original RSS summary is used instead.

**4. Classification**

The article title and summary are lowercased and checked against a priority-ordered list of categories and their keywords (defined in `backend/sources.py`):

```
Politica      -> ["governo", "ministro", "eleicoes", ...]
Desporto      -> ["futebol", "benfica", "golo", ...]
Economia      -> ["empresa", "bolsa", "inflacao", ...]
...
Geral         -> fallback (no keyword matched)
```

The first category whose keyword appears in the text wins. Order matters — a sports article mentioning "lei do futebol" is correctly filed under Desporto, not Politica.

**5. Storage**

Articles are saved to the `articles` table in SQLite (`data/diarynews.db`). The list is capped at 200 articles sorted newest-first.

**6. UI**

Articles are displayed in a card grid grouped by category. Clicking an article opens a modal with the AI summary and the full scraped text in an expandable section.

---

## YouTube

### Overview

```
User adds a channel handle (e.g. @mkbhd)
        |
        v
POST /api/youtube/channels -> services.add_youtube_channel()
        |
        v
YouTube Data API resolves handle -> channel ID (saved permanently)
        |
        v
User clicks "Fetch Videos"
        |
        v
POST /api/youtube/fetch -> services.fetch_and_save_videos()
        |
        v
Public Atom feed fetched per channel (no API quota)
        |
        v
New videos saved to SQLite
        |
        v
User clicks caption button on a video
        |
        v
GET /api/youtube/videos/{id}/caption -> services.get_or_fetch_caption()
        |
        v
Caption fetched via 3-tier fallback -> AI summary generated -> saved to DB
```

### Step by step

**1. Adding a channel**

The user pastes a handle (`@mkbhd`) or full URL (`youtube.com/@mkbhd`). The app normalises it to a `@handle` format and calls the YouTube Data API v3 to resolve it to a permanent channel ID. This ID is saved in the `channels` table — the API is only called once per channel.

**2. Fetching videos**

Videos are fetched from YouTube's public Atom feeds:

```
https://www.youtube.com/feeds/videos.xml?channel_id=UC...
```

This requires no API key and has no quota cost. The 10 most recent videos per channel are retrieved. Videos already in storage are skipped.

**3. Caption extraction (3-tier fallback)**

When the user clicks the caption button on a video, the app tries three methods in order:

| Tier | Method | Requirement |
|------|--------|-------------|
| 1 | `youtube-transcript-api` — fetches YouTube's own subtitles | Always active |
| 2 | OpenAI Whisper API — downloads audio via `yt-dlp`, transcribes via API | `ENABLE_WHISPER_API=true` + `OPENAI_API_KEY` |
| 3 | Local Whisper — downloads audio via `yt-dlp`, transcribes on your machine | `ENABLE_WHISPER_LOCAL=true` + `pip install openai-whisper` |

Language priority for Tier 1: Portuguese -> English -> Chinese -> first available.

If all tiers fail, the result is stored as `null` so the app does not re-attempt on the next visit. The "Re-fetch" button clears this and tries again.

**4. AI caption summary**

The raw transcript is sent to MiniMax with a prompt (defined in `backend/prompts.py`) requesting a structured Chinese summary with three sections: topic, key points, conclusion. If `MINIMAX_API_KEY` is not set, the raw transcript is still shown without a summary.

**5. Storage**

Caption data is stored in the `captions` table in SQLite, linked to the video by `video_id`.

**6. UI**

Videos are available in two views:

- **Grid** — thumbnail, title, channel name, caption button
- **Feed** — 2-column list grouped by channel category, with the AI summary displayed inline if available. A "Generate summary" button fetches the caption on demand directly from the feed.
