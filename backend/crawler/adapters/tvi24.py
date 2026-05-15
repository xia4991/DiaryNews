"""TVI24 — iol.pt occasionally emits naive timestamps; rely on parse_date fallback."""

from datetime import datetime, timezone

from backend.crawler.base import BaseAdapter


class TVI24Adapter(BaseAdapter):
    name = "TVI24"
    url = "https://tvi24.iol.pt/rss/ultimas"

    def extract_date(self, entry) -> str:
        # If feedparser couldn't parse the date, fall back to now() rather than empty
        if entry.get("published_parsed"):
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        if entry.get("updated_parsed"):
            dt = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        return datetime.now(timezone.utc).isoformat()
