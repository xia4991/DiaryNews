"""Crawler orchestration: run all adapters in parallel, write source_health."""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.crawler.base import BaseAdapter, FetchResult, RawArticle
from backend.crawler.parsing import deduplicate
from backend.storage.health import upsert_source_health

log = logging.getLogger("diarynews.crawler.runner")


class CrawlerRunner:
    """Runs a set of adapters in parallel and writes per-source health."""

    def __init__(self, adapters: list[BaseAdapter], max_workers: int = 9):
        self.adapters = adapters
        self.max_workers = max_workers

    def run(
        self,
        existing_urls: Optional[set] = None,
        max_age_hours: int = 24,
        max_articles: int = 0,
    ) -> tuple[list[dict], list[FetchResult], dict]:
        """Fetch all sources, dedupe, filter by age.

        Returns (articles_as_dicts, per_source_results, stats). `stats` keys:
        raw_count, existing_skipped, dedupe_skipped, age_skipped, cap_skipped,
        returned_count — useful for diagnosing 'why fewer articles today?'.
        """
        existing_urls = existing_urls or set()
        results: list[FetchResult] = []

        start = time.monotonic()
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(a.fetch): a for a in self.adapters}
            for future in as_completed(futures):
                adapter = futures[future]
                try:
                    result = future.result()
                except Exception as exc:
                    log.warning("Adapter '%s' raised: %s", adapter.name, exc)
                    result = FetchResult(
                        source=adapter.name,
                        articles=[],
                        entries_count=0,
                        error=f"{type(exc).__name__}: {exc}",
                        status="parse_error",
                        duration_ms=0,
                    )
                results.append(result)

        elapsed = time.monotonic() - start
        log.info(
            "Crawler fetched %d sources in %.1fs (%d ok, %d empty, %d failed)",
            len(results), elapsed,
            sum(1 for r in results if r.status == "ok"),
            sum(1 for r in results if r.status == "empty"),
            sum(1 for r in results if r.status in ("http_error", "parse_error")),
        )

        all_articles: list[RawArticle] = []
        articles_count_by_source: dict[str, int] = {}
        for r in results:
            articles_count_by_source[r.source] = len(r.articles)
            all_articles.extend(r.articles)

        raw_count = len(all_articles)
        new_articles = [a for a in all_articles if a.link not in existing_urls]
        existing_skipped = raw_count - len(new_articles)

        new_dicts = [a.to_dict() for a in new_articles]
        before_dedupe = len(new_dicts)
        new_dicts = deduplicate(new_dicts)
        dedupe_skipped = before_dedupe - len(new_dicts)

        cutoff = (datetime.now(timezone.utc) - timedelta(hours=max_age_hours)).isoformat()
        before_age = len(new_dicts)
        new_dicts = [a for a in new_dicts if a.get("published", "") >= cutoff]
        age_skipped = before_age - len(new_dicts)
        if age_skipped > 0:
            log.info(
                "Age filter: %d → %d (skipped %d older than %dh)",
                before_age, len(new_dicts), age_skipped, max_age_hours,
            )

        cap_skipped = 0
        if max_articles and len(new_dicts) > max_articles:
            cap_skipped = len(new_dicts) - max_articles
            log.info("Capping %d new articles to %d for this cycle", len(new_dicts), max_articles)
            new_dicts = new_dicts[:max_articles]

        for r in results:
            upsert_source_health(
                source=r.source,
                status=r.status,
                last_fetched_at=datetime.now(timezone.utc).isoformat(),
                duration_ms=r.duration_ms,
                entries_count=r.entries_count,
                articles_count=articles_count_by_source.get(r.source, 0),
                error=r.error,
            )

        stats = {
            "raw_count": raw_count,
            "existing_skipped": existing_skipped,
            "dedupe_skipped": dedupe_skipped,
            "age_skipped": age_skipped,
            "cap_skipped": cap_skipped,
            "returned_count": len(new_dicts),
        }
        log.info(
            "Crawler stats: raw=%d existing_skipped=%d dedupe_skipped=%d "
            "age_skipped=%d cap_skipped=%d returned=%d",
            raw_count, existing_skipped, dedupe_skipped,
            age_skipped, cap_skipped, len(new_dicts),
        )
        return new_dicts, results, stats


def run_all(
    existing_urls: Optional[set] = None,
    max_age_hours: int = 24,
    max_articles: int = 0,
) -> tuple[list[dict], list[FetchResult], dict]:
    """Convenience entry point — instantiates the registered adapters and runs them."""
    from backend.crawler.adapters import load_all_adapters

    runner = CrawlerRunner(adapters=load_all_adapters())
    return runner.run(existing_urls=existing_urls, max_age_hours=max_age_hours, max_articles=max_articles)
