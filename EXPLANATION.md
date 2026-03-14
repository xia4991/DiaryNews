# How DiaryNews Works

## What it does

DiaryNews is a Portuguese news aggregator. It fetches RSS feeds from 6 major Portuguese news outlets, classifies each article by topic using keyword matching, and displays them on a webpage grouped by category.

No AI/LLM calls are made — everything is free to run.

---

## Data flow

```
User clicks "Fetch"
       │
       ▼
feedparser fetches each RSS URL
       │
       ▼
Each article: strip HTML → classify by keywords
       │
       ▼
Merge with existing articles (dedup by URL)
       │
       ▼
Sort by date, cap at 200 → save to data/news.json
       │
       ▼
Streamlit re-renders the page from the saved file
```

---

## The pieces

### 1. RSS sources (`RSS_SOURCES`)

A dict of 6 outlets and their feed URLs: RTP, Observador, SIC Notícias, TVI24, Jornal de Notícias, Público. `feedparser` fetches and parses each feed into a list of entries.

### 2. HTML stripping (`strip_html`)

RSS summaries often contain raw HTML tags. `_MLStripper` walks the HTML using Python's built-in `HTMLParser` and extracts only the visible text. Excess whitespace is then collapsed with a regex.

### 3. Classification (`classify`)

Concatenates the article's title and summary, lowercases the result, then checks it against a priority-ordered list of categories and their keywords:

```
Política → ["governo", "ministro", "eleições", ...]
Desporto → ["futebol", "benfica", "golo", ...]
...
Geral    → (fallback if nothing matches)
```

**Order matters** — the first category whose keyword appears in the text wins. This prevents e.g. a sports article mentioning "lei do futebol" from being filed under Política.

### 4. Persistence (`data/news.json`)

Articles are stored locally as JSON with this shape:

```json
{
  "last_updated": "2026-03-12T08:00:00+00:00",
  "articles": [
    {
      "title": "...",
      "summary": "...",
      "link": "https://...",
      "source": "Observador",
      "category": "Política",
      "published": "2026-03-12T07:45:00+00:00"
    }
  ]
}
```

On startup, Streamlit loads this file. Articles persist across page refreshes without fetching again.

### 5. Deduplication (`merge_articles`)

Uses a set of URLs (`seen_urls`) to avoid storing the same article twice. Safe to click Fetch repeatedly — duplicates are silently dropped. The final list is sorted newest-first and capped at 200 articles.

### 6. The UI (Streamlit)

- **Sidebar** — fetch button, per-source checkboxes, category dropdown filter
- **Main area** — articles grouped under category headers, rendered as HTML cards in a 3-column grid
- Filtering is done in-memory on every render: no re-fetch needed to change the view

---

## File structure

```
app.py            # All logic and UI in one file
requirements.txt  # feedparser, streamlit, python-dotenv
data/news.json    # Auto-created on first fetch (gitignored)
.venv/            # Python virtual environment (gitignored)
```

---

## Running it

```bash
cd /Users/xab/Projects/DiaryNews
source .venv/bin/activate
streamlit run app.py
```

Open the browser, click **"🔄 Fetch latest news"**, done.
