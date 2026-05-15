import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import logging

from backend.llm import MiniMaxConfigError, MiniMaxError, call_minimax
from backend.prompts import daily_news_brief_prompt
from backend.storage.news import load_news
from backend.storage.news_briefs import upsert_daily_news_brief

log = logging.getLogger("diarynews.news_briefs")

PORTUGAL_TZ = ZoneInfo("Europe/Lisbon")
MAX_PORTUGAL_BRIEF_ARTICLES = 20
MIN_BRIEF_ARTICLES = 3

_TITLE_RE = re.compile(r"^TITLE:\s*(.*)$", re.MULTILINE)
_SUMMARY_RE = re.compile(r"^SUMMARY:\s*(.*?)(?:\nBULLETS:|\Z)", re.MULTILINE | re.DOTALL)


def _parse_iso_to_portugal_day(value: str) -> Optional[str]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PORTUGAL_TZ).date().isoformat()


def _filter_articles_for_day(articles: list, brief_type: str, brief_date: str) -> list:
    selected = []
    for article in articles:
        article_day = _parse_iso_to_portugal_day(article.get("published", ""))
        if article_day != brief_date:
            continue
        if brief_type == "china" and not (article.get("tags_zh") or "").strip():
            continue
        selected.append(article)
    selected.sort(key=lambda article: article.get("published") or "", reverse=True)
    if brief_type == "china":
        return selected
    return selected[:MAX_PORTUGAL_BRIEF_ARTICLES]


def _article_digest(article: dict) -> str:
    title = article.get("title_zh") or article.get("title") or ""
    summary = article.get("content_zh") or article.get("ai_summary") or article.get("summary") or ""
    summary = summary.strip().replace("\n", " ")
    if len(summary) > 220:
        summary = summary[:220].rstrip() + "..."
    source = article.get("source") or ""
    category = article.get("category") or ""
    tags = article.get("tags_zh") or ""
    parts = [title]
    meta = " / ".join([value for value in [source, category, tags] if value])
    if meta:
        parts.append("META: " + meta)
    if summary:
        parts.append("SUMMARY: " + summary)
    return "\n".join(parts)


def _build_digest(articles: list) -> str:
    return "\n\n".join(
        "[Article {0}]\n{1}".format(index + 1, _article_digest(article))
        for index, article in enumerate(articles)
    )


def _parse_brief_response(text: str) -> Optional[dict]:
    if not text.strip():
        return None
    title_match = _TITLE_RE.search(text)
    summary_match = _SUMMARY_RE.search(text)
    bullets = []
    in_bullets = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == "BULLETS:":
            in_bullets = True
            continue
        if in_bullets and stripped.startswith("- "):
            bullets.append(stripped[2:].strip())
    title = title_match.group(1).strip() if title_match else ""
    summary = summary_match.group(1).strip() if summary_match else ""
    bullets = [item for item in bullets if item]
    if not title or not summary or not bullets:
        return None
    return {"title": title, "summary_zh": summary, "bullets": bullets[:5]}


def _fallback_brief(brief_date: str, brief_type: str, articles: list) -> dict:
    primary = articles[:8] if brief_type == "china" else articles[:6]
    lead_tags = []
    if brief_type == "china":
        seen = set()
        for article in primary:
            for tag in (article.get("tags_zh") or "").split(","):
                tag = tag.strip()
                if tag and tag not in seen:
                    seen.add(tag)
                    lead_tags.append(tag)
        title = "重点回顾：" + "、".join(lead_tags[:3]) if lead_tags else "重点回顾"
    else:
        title = "葡萄牙新闻回顾"

    bullets = []
    for article in primary:
        title_zh = article.get("title_zh") or article.get("title") or ""
        summary = article.get("content_zh") or article.get("ai_summary") or article.get("summary") or ""
        summary = summary.strip().replace("\n", " ")
        if len(summary) > 80:
            summary = summary[:80].rstrip() + "..."
        if summary:
            bullets.append("{0}：{1}".format(title_zh, summary))
        else:
            bullets.append(title_zh)

    summary_prefix = "当日与在葡华人更相关的新闻回顾如下：" if brief_type == "china" else "当日葡萄牙新闻回顾如下："
    summary_tail = "；".join((article.get("title_zh") or article.get("title") or "") for article in primary[:3])
    summary_zh = summary_prefix + summary_tail if summary_tail else summary_prefix + "若干重要变化。"
    return {"title": title, "summary_zh": summary_zh, "bullets": bullets}


def build_daily_news_brief(brief_type: str, brief_date: str) -> Optional[dict]:
    articles = load_news().get("articles", [])
    selected = _filter_articles_for_day(articles, brief_type, brief_date)
    if len(selected) < MIN_BRIEF_ARTICLES:
        return None

    prompt = daily_news_brief_prompt(brief_date, brief_type, _build_digest(selected))
    raw = ""
    try:
        raw = call_minimax(prompt, max_tokens=900, prompt_version="daily_brief_v1")
    except MiniMaxConfigError:
        # Bubble config errors so admins see them; they're operator-fixable.
        raise
    except MiniMaxError as exc:
        log.warning(
            "Brief LLM failed (%s) for %s %s — using rule-based fallback: %s",
            type(exc).__name__, brief_type, brief_date, exc,
        )
    parsed = _parse_brief_response(raw) or _fallback_brief(brief_date, brief_type, selected)
    return {
        "brief_date": brief_date,
        "brief_type": brief_type,
        "title": parsed["title"],
        "summary_zh": parsed["summary_zh"],
        "bullets": parsed["bullets"],
        "article_links": [article["link"] for article in selected],
        "article_count": len(selected),
    }


def generate_and_store_daily_news_brief(brief_type: str, brief_date: str) -> Optional[dict]:
    brief = build_daily_news_brief(brief_type, brief_date)
    if not brief:
        return None
    return upsert_daily_news_brief(
        brief_type=brief["brief_type"],
        brief_date=brief["brief_date"],
        title=brief["title"],
        summary_zh=brief["summary_zh"],
        bullets=brief["bullets"],
        article_links=brief["article_links"],
    )


def generate_yesterday_briefs(reference_dt: Optional[datetime] = None) -> list:
    current = reference_dt or datetime.now(PORTUGAL_TZ)
    yesterday = (current.date() - timedelta(days=1)).isoformat()
    generated = []
    for brief_type in ("china", "portugal"):
        item = generate_and_store_daily_news_brief(brief_type, yesterday)
        if item:
            generated.append(item)
    return generated


def generate_recent_briefs(days: int = 7, reference_date: Optional[date] = None) -> list:
    base_date = reference_date or datetime.now(PORTUGAL_TZ).date()
    generated = []
    for offset in range(1, days + 1):
        brief_date = (base_date - timedelta(days=offset)).isoformat()
        for brief_type in ("china", "portugal"):
            item = generate_and_store_daily_news_brief(brief_type, brief_date)
            if item:
                generated.append(item)
    return generated
