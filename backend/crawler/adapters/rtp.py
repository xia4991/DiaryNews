"""RTP — Portuguese public broadcaster.

Aggregates 5 section RSS sub-feeds (ultimas + país + mundo + economia + cultura),
extracts the cover image from each entry's description HTML, and prefers RTP's
own <category> tag as the canonical category when it maps to our internal taxonomy.

This adapter overrides BaseAdapter.fetch() because RTP needs to hit multiple URLs
per cycle; the override stays self-contained so the rest of the crawler stays
single-URL.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import feedparser
import requests
from bs4 import BeautifulSoup

from backend.crawler.base import BaseAdapter, FetchResult, RawArticle
from backend.crawler.parsing import classify, parse_date
from backend.utils import strip_html

log = logging.getLogger("diarynews.crawler.rtp")

SUB_FEEDS = {
    "ultimas":  "https://www.rtp.pt/noticias/rss",
    "pais":     "https://www.rtp.pt/noticias/rss/pais",
    "mundo":    "https://www.rtp.pt/noticias/rss/mundo",
    "economia": "https://www.rtp.pt/noticias/rss/economia",
    "cultura":  "https://www.rtp.pt/noticias/rss/cultura",
}

# RTP <category> term → our internal category. Misses fall back to classify().
CATEGORY_MAP = {
    "País":     "Sociedade",
    "Mundo":    "Internacional",
    "Europa":   "Internacional",
    "Cultura":  "Cultura",
    "Economia": "Economia",
    "Política": "Política",
    "Desporto": "Desporto",
    "Futebol Internacional": "Desporto",
    "Futebol Nacional":      "Desporto",
    "Mais Modalidades":      "Desporto",
}

INTER_SUB_FEED_SLEEP_SECONDS = 0.5


class RTPAdapter(BaseAdapter):
    name = "RTP"
    # Nominal URL used for health/log identifiers; the real fetch hits SUB_FEEDS.
    url = SUB_FEEDS["ultimas"]

    def _http_get(self, url: str) -> bytes:
        resp = requests.get(
            url,
            timeout=self.timeout,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            },
        )
        resp.raise_for_status()
        return resp.content

    def _fetch_sub_feed(self, url: str) -> tuple[list, Optional[str]]:
        """One sub-feed with retries. Returns (entries, error)."""
        last_err: Optional[str] = None
        for attempt in range(self.max_retries + 1):
            try:
                content = self._http_get(url)
                feed = feedparser.parse(content)
                return feed.entries or [], None
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response else "?"
                last_err = f"HTTP {status}: {exc}"
            except requests.RequestException as exc:
                last_err = f"{type(exc).__name__}: {exc}"
            except Exception as exc:
                last_err = f"{type(exc).__name__}: {exc}"
            if attempt < self.max_retries:
                time.sleep(self.backoff_seconds[min(attempt, len(self.backoff_seconds) - 1)])
        return [], last_err

    def parse_entry(self, entry) -> Optional[RawArticle]:
        title = strip_html(entry.get("title", ""))
        link = entry.get("link", "")
        if not title or not link:
            return None

        # Description holds both the cover <img> and the summary text.
        raw_html = entry.get("description", "") or entry.get("summary", "") or ""
        soup = BeautifulSoup(raw_html, "html.parser")
        img_tag = soup.find("img")
        image_url = (img_tag.get("src") or "").strip() if img_tag else ""
        if img_tag:
            img_tag.extract()  # drop so it doesn't pollute the text
        summary = soup.get_text(" ", strip=True)[:500]

        rss_cat = ""
        tags = entry.get("tags") or []
        if tags and isinstance(tags, list):
            first = tags[0]
            rss_cat = first.get("term", "") if isinstance(first, dict) else ""

        category = CATEGORY_MAP.get(rss_cat) or classify(title, summary)

        return RawArticle(
            link=link,
            title=title,
            summary=summary,
            source=self.name,
            category=category,
            published=parse_date(entry),
            author="",  # RTP RSS does not expose author
            image_url=image_url,
            language=self.language,
            guid=entry.get("id", "") or entry.get("guid", "") or link,
            rss_category=rss_cat,
        )

    def fetch(self) -> FetchResult:
        start = time.monotonic()
        now_iso = datetime.now(timezone.utc).isoformat()

        total_entries = 0
        sub_errors: dict[str, str] = {}
        sub_ok = 0
        seen_keys: set = set()
        articles: list[RawArticle] = []

        sub_items = list(SUB_FEEDS.items())
        for idx, (sub_name, sub_url) in enumerate(sub_items):
            entries, err = self._fetch_sub_feed(sub_url)
            if err:
                sub_errors[sub_name] = err
                log.warning("RTP sub-feed '%s' failed: %s", sub_name, err)
            else:
                sub_ok += 1
                total_entries += len(entries)
                for entry in entries:
                    key = entry.get("id") or entry.get("guid") or entry.get("link")
                    if not key or key in seen_keys:
                        continue
                    seen_keys.add(key)
                    try:
                        art = self.parse_entry(entry)
                    except Exception as exc:
                        log.debug("RTP parse_entry failed for sub-feed=%s: %s", sub_name, exc)
                        continue
                    if art:
                        art.fetched_at = now_iso
                        articles.append(art)

            if idx < len(sub_items) - 1:
                time.sleep(INTER_SUB_FEED_SLEEP_SECONDS)

        duration_ms = int((time.monotonic() - start) * 1000)

        # Status rollup:
        #   - every sub-feed failed                   → http_error
        #   - all succeeded but produced zero entries → empty
        #   - at least one failed, at least one ok    → partial_ok
        #   - all succeeded with entries              → ok
        if sub_ok == 0:
            status = "http_error"
            error = "; ".join(f"{k}: {v}" for k, v in sub_errors.items()) or "all sub-feeds failed"
        elif total_entries == 0:
            status = "empty"
            error = None
        elif sub_errors:
            status = "partial_ok"
            error = (f"{len(sub_errors)}/{len(sub_items)} sub-feeds failed: "
                     + "; ".join(f"{k}: {v}" for k, v in sub_errors.items()))
        else:
            status = "ok"
            error = None

        log.info(
            "RTP: %d sub-feeds ok, %d failed, %d raw entries → %d unique articles in %dms",
            sub_ok, len(sub_errors), total_entries, len(articles), duration_ms,
        )

        return FetchResult(
            source=self.name,
            articles=articles,
            entries_count=total_entries,
            error=error,
            status=status,
            duration_ms=duration_ms,
        )
