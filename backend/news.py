"""Article scraping helpers for news enrichment.

`classify()` is also re-exported here so legacy callers still work.
"""

import logging

import requests as _requests

from backend.crawler.parsing import classify, deduplicate, parse_date  # noqa: F401 (legacy import path)

log = logging.getLogger("diarynews.news")

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Sent on the consent-cookie retry to skip common EU cookie/consent walls that
# otherwise serve an interstitial shell instead of the article. Values are
# best-effort and may need occasional per-source tuning.
_CONSENT_COOKIES = {
    "CookieConsent": "{stamp:'-1',necessary:true,preferences:true,statistics:true,marketing:true}",  # Cookiebot
    "OptanonAlertBoxClosed": "2024-01-01T00:00:00.000Z",  # OneTrust (presence suppresses the banner)
    "euconsent-v2": "CPcqBgAPcqBgAAHABBENCZCgAAAAAAAAAAAAAAAAAAAA",  # IAB TCF / Didomi
}

# Truncation-detection thresholds (tunable). A scrape shorter than the RSS teaser,
# or under the word floor, is treated as a failed/partial extraction.
TRUNCATION_MIN_WORDS = 120
# Paywall/consent marker phrases only count as a truncation signal when the body is
# also short, so a real article merely mentioning these words is not nuked.
_MARKER_MAX_WORDS = 250
_PAYWALL_MARKERS = (
    "aceitar cookies",
    "aceitar todos os cookies",
    "ao continuar a navegar",
    "continuar a ler",
    "já é assinante",
    "torne-se assinante",
    "assine já",
)


def extract_rss_fulltext(html: str) -> str:
    """Clean a feed's <content:encoded> HTML fragment into plain article text.

    Returns '' when extraction yields nothing usable. The caller is responsible
    for length-gating (a feed may stuff a short teaser into content:encoded).
    """
    if not html:
        return ""
    try:
        import trafilatura
        text = trafilatura.extract(html, include_comments=False, include_tables=False)
        return text or ""
    except Exception as exc:
        log.warning("extract_rss_fulltext failed: %s", exc)
        return ""


def scrape_article(url: str, *, with_consent: bool = False) -> str:
    """Fetch and extract the article body via trafilatura.

    `favor_recall=True` plus the (default-on) readability+jusText fallback chain
    maximizes body recovery; passing `url=` improves trafilatura's heuristics.
    `with_consent` sends common EU consent cookies to bypass cookie-wall shells.
    """
    try:
        import trafilatura
        resp = _requests.get(
            url,
            timeout=15,
            headers={"User-Agent": _UA},
            cookies=_CONSENT_COOKIES if with_consent else None,
        )
        resp.raise_for_status()
        text = trafilatura.extract(
            resp.text,
            url=url,
            favor_recall=True,
            include_comments=False,
            include_tables=False,
        )
        return text or ""
    except Exception as exc:
        log.warning(
            "scrape_article failed for %s%s: %s",
            url, " (consent)" if with_consent else "", exc,
        )
        return ""


def is_truncated(text: str, summary: str = "") -> bool:
    """Heuristic: did extraction fail or return only a partial/teaser body?

    Trips when the text is empty, shorter than the RSS teaser (extractor lost to
    the summary), under the word floor, or a short body carrying a paywall/consent
    marker. The 'shorter than summary' check is the strongest single signal.
    """
    if not text:
        return True
    n = len(text.split())
    summary_words = len((summary or "").split())
    if summary_words and n < summary_words:
        return True
    if n < TRUNCATION_MIN_WORDS:
        return True
    if n < _MARKER_MAX_WORDS:
        low = text.lower()
        if any(marker in low for marker in _PAYWALL_MARKERS):
            return True
    return False


def reset_scrape_caches() -> None:
    """Reset trafilatura's internal LRU caches to bound memory in long enrich loops."""
    try:
        from trafilatura.meta import reset_caches
        reset_caches()
    except Exception:  # noqa: BLE001 — best-effort, never fatal
        pass


def ensure_scraped_content(article: dict) -> tuple[str, str, bool]:
    """Return (text_for_llm, scraped_content_to_persist, scrape_ok).

    Reuse stored scraped_content if present. Otherwise scrape on demand through a
    self-healing chain: plain scrape -> (on truncation) consent-cookie retry. A
    body that passes the truncation gate is persisted. If everything stays
    truncated, feed the LLM whichever of body/summary is richer, persist '' and
    return scrape_ok=False so the caller can defer and re-scrape later
    (see SCRAPE_MAX_ATTEMPTS) instead of locking in a summary-only translation.
    """
    stored = article.get("scraped_content") or ""
    if stored:
        return stored[:3000], stored, True

    summary = article.get("summary", "") or ""
    link = article["link"]

    best = scrape_article(link)
    if best and not is_truncated(best, summary):
        return best[:3000], best, True

    # Escalation 1 — retry with EU consent cookies (cheap, no browser).
    alt = scrape_article(link, with_consent=True)
    if len(alt.split()) > len(best.split()):
        best = alt
    if best and not is_truncated(best, summary):
        return best[:3000], best, True

    # Still truncated/empty: don't lock in a bad body; use the richer text for the LLM.
    llm_text = best if len(best.split()) > len(summary.split()) else summary
    return (llm_text[:3000] if llm_text else ""), "", False
