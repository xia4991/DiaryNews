"""Base adapter contract for per-source RSS crawlers."""

import logging
import time
from abc import ABC
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

import feedparser
import requests

from backend.crawler.parsing import (
    classify,
    extract_image_default,
    extract_rss_category,
    parse_date,
)
from backend.utils import strip_html

log = logging.getLogger("diarynews.crawler")

DEFAULT_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


@dataclass
class RawArticle:
    link: str
    title: str
    summary: str
    source: str
    category: str
    published: str
    author: str = ""
    image_url: str = ""
    language: str = "pt"
    guid: str = ""
    rss_category: str = ""
    fetched_at: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FetchResult:
    source: str
    articles: list = field(default_factory=list)
    entries_count: int = 0
    error: Optional[str] = None
    status: str = "ok"            # ok | http_error | parse_error | empty
    duration_ms: int = 0


class BaseAdapter(ABC):
    """Subclass and set `name` + `url`. Override per-source methods as needed."""

    name: str = ""
    url: str = ""
    timeout: int = 15
    max_retries: int = 2
    backoff_seconds: tuple = (1.0, 3.0)
    user_agent: str = DEFAULT_UA
    language: str = "pt"

    def http_get(self) -> bytes:
        resp = requests.get(
            self.url,
            timeout=self.timeout,
            headers={"User-Agent": self.user_agent, "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"},
        )
        resp.raise_for_status()
        return resp.content

    def extract_image(self, entry) -> str:
        return extract_image_default(entry)

    def extract_date(self, entry) -> str:
        return parse_date(entry)

    def extract_author(self, entry) -> str:
        author = entry.get("author", "") or ""
        if not author:
            authors = entry.get("authors") or []
            if authors and isinstance(authors, list):
                author = authors[0].get("name", "") if isinstance(authors[0], dict) else ""
        return author.strip()

    def extract_rss_category(self, entry) -> str:
        return extract_rss_category(entry)

    def parse_entry(self, entry) -> Optional[RawArticle]:
        title = strip_html(entry.get("title", ""))
        link = entry.get("link", "")
        if not title or not link:
            return None
        summary = strip_html(entry.get("summary", entry.get("description", "")))[:500]
        return RawArticle(
            link=link,
            title=title,
            summary=summary,
            source=self.name,
            category=classify(title, summary),
            published=self.extract_date(entry),
            author=self.extract_author(entry),
            image_url=self.extract_image(entry),
            language=self.language,
            guid=entry.get("id", "") or entry.get("guid", ""),
            rss_category=self.extract_rss_category(entry),
        )

    def fetch(self) -> FetchResult:
        start = time.monotonic()
        now_iso = datetime.now(timezone.utc).isoformat()
        last_err: Optional[str] = None
        last_status = "parse_error"

        for attempt in range(self.max_retries + 1):
            try:
                content = self.http_get()
                feed = feedparser.parse(content)
                entries = feed.entries or []

                articles: list = []
                for entry in entries:
                    try:
                        art = self.parse_entry(entry)
                    except Exception as exc:
                        log.debug("parse_entry failed for source=%s: %s", self.name, exc)
                        continue
                    if art:
                        art.fetched_at = now_iso
                        articles.append(art)

                duration_ms = int((time.monotonic() - start) * 1000)
                status = "empty" if not entries else "ok"
                return FetchResult(
                    source=self.name,
                    articles=articles,
                    entries_count=len(entries),
                    error=None,
                    status=status,
                    duration_ms=duration_ms,
                )
            except requests.HTTPError as exc:
                last_err = f"HTTP {exc.response.status_code if exc.response else '?'}: {exc}"
                last_status = "http_error"
            except requests.RequestException as exc:
                last_err = f"{type(exc).__name__}: {exc}"
                last_status = "http_error"
            except Exception as exc:
                last_err = f"{type(exc).__name__}: {exc}"
                last_status = "parse_error"

            if attempt < self.max_retries:
                time.sleep(self.backoff_seconds[min(attempt, len(self.backoff_seconds) - 1)])

        duration_ms = int((time.monotonic() - start) * 1000)
        log.warning("Adapter '%s' failed after retries: %s", self.name, last_err)
        return FetchResult(
            source=self.name,
            articles=[],
            entries_count=0,
            error=last_err,
            status=last_status,
            duration_ms=duration_ms,
        )
