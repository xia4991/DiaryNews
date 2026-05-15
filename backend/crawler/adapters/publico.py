"""Público — Feedburner sometimes emits non-standard RFC822 dates with locale quirks."""

from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

from backend.crawler.base import BaseAdapter


class PublicoAdapter(BaseAdapter):
    name = "Público"
    url = "https://feeds.feedburner.com/PublicoRSS"

    def extract_date(self, entry) -> str:
        if entry.get("published_parsed"):
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        raw = entry.get("published") or entry.get("updated") or ""
        if raw:
            try:
                dt = parsedate_to_datetime(raw)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except Exception:
                pass
        return datetime.now(timezone.utc).isoformat()
