"""Home-page focus topics: long-running subjects (state budget, AIMA…) that an admin
maintains by hand — status line, key points, key dates — plus related news matched
automatically from stored articles by keyword."""
import json
import re
from datetime import datetime, timezone
from typing import Optional

from backend.storage.database import get_db
from backend.storage.base import _ensure_db


FOCUS_TOPIC_STATUSES = ("active", "hidden", "removed")
_JSON_FIELDS = ("points", "dates", "keywords")
_NEWS_SCAN_WINDOW = 800   # most recent articles checked for keyword matches
_WORD_CHARS = "0-9A-Za-zÀ-ÖØ-öø-ÿ"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_status(status: str) -> None:
    if status not in FOCUS_TOPIC_STATUSES:
        raise ValueError(f"Invalid status: {status!r}. Must be one of {FOCUS_TOPIC_STATUSES}")


def _row_to_topic(row) -> Optional[dict]:
    if not row:
        return None
    data = dict(row)
    for key in _JSON_FIELDS:
        try:
            value = json.loads(data.get(key) or "[]")
        except (TypeError, ValueError):
            value = []
        data[key] = value if isinstance(value, list) else []
    return data


def _keyword_pattern(keywords: list) -> Optional[re.Pattern]:
    """One regex for all keywords. Latin keywords match whole words only, so a short
    one like "OE" does not hit "poeta"; CJK keywords match as plain substrings."""
    parts = []
    for kw in keywords:
        kw = (kw or "").strip()
        if not kw:
            continue
        escaped = re.escape(kw)
        if re.fullmatch(rf"[{_WORD_CHARS}\s\-./]+", kw):
            parts.append(rf"(?<![{_WORD_CHARS}]){escaped}(?![{_WORD_CHARS}])")
        else:
            parts.append(escaped)
    if not parts:
        return None
    return re.compile("|".join(parts), re.IGNORECASE)


def _attach_related_news(topics: list, per_topic: int) -> None:
    patterns = {t["id"]: _keyword_pattern(t["keywords"]) for t in topics}
    for t in topics:
        t["news"] = []
    if per_topic <= 0 or not any(patterns.values()):
        return

    with get_db() as conn:
        heads = conn.execute(
            """SELECT link, title, title_zh, story_group_id FROM articles
               ORDER BY published DESC LIMIT ?""",
            (_NEWS_SCAN_WINDOW,),
        ).fetchall()

        picked: dict[int, list] = {t["id"]: [] for t in topics}
        seen_groups: dict[int, set] = {t["id"]: set() for t in topics}
        for head in heads:
            text = f"{head['title'] or ''}\n{head['title_zh'] or ''}"
            group = head["story_group_id"] or ""
            for topic_id, pattern in patterns.items():
                if not pattern or len(picked[topic_id]) >= per_topic:
                    continue
                if group and group in seen_groups[topic_id]:
                    continue  # same story from another source
                if pattern.search(text):
                    picked[topic_id].append(head["link"])
                    if group:
                        seen_groups[topic_id].add(group)

        links = sorted({link for group_links in picked.values() for link in group_links})
        rows = {}
        if links:
            marks = ",".join("?" for _ in links)
            for row in conn.execute(f"SELECT * FROM articles WHERE link IN ({marks})", links):
                article = dict(row)
                article.pop("scraped_content", None)  # original-language body; the UI never shows it
                rows[article["link"]] = article

    for t in topics:
        t["news"] = [rows[link] for link in picked[t["id"]] if link in rows]


def list_focus_topics(status: str = "public", news_per_topic: int = 3) -> dict:
    _ensure_db()
    clauses, params = [], []
    if status == "public":
        clauses.append("status = 'active'")
    elif status == "all":
        clauses.append("status != 'removed'")
    else:
        _validate_status(status)
        clauses.append("status = ?")
        params.append(status)
    where = f"WHERE {' AND '.join(clauses)}"

    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM focus_topics {where} ORDER BY sort_order ASC, id ASC",
            params,
        ).fetchall()
    topics = [_row_to_topic(row) for row in rows]
    _attach_related_news(topics, news_per_topic)
    return {"items": topics, "total": len(topics)}


def get_focus_topic(topic_id: int) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM focus_topics WHERE id = ?", (topic_id,)).fetchone()
    return _row_to_topic(row)


def create_focus_topic(
    created_by: int,
    title: str,
    status_text: str = "",
    points: Optional[list] = None,
    dates: Optional[list] = None,
    keywords: Optional[list] = None,
    link_url: Optional[str] = None,
    link_label: Optional[str] = None,
    sort_order: int = 0,
    status: str = "active",
) -> dict:
    _ensure_db()
    _validate_status(status)
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO focus_topics
               (title, status_text, points, dates, keywords, link_url, link_label,
                sort_order, status, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                title, status_text or "",
                json.dumps(points or [], ensure_ascii=False),
                json.dumps(dates or [], ensure_ascii=False),
                json.dumps(keywords or [], ensure_ascii=False),
                link_url or None, link_label or None,
                int(sort_order), status, created_by, now, now,
            ),
        )
    return get_focus_topic(cur.lastrowid)


def update_focus_topic(topic_id: int, patch: dict) -> dict:
    _ensure_db()
    allowed = {
        "title", "status_text", "points", "dates", "keywords",
        "link_url", "link_label", "sort_order", "status",
    }
    clean = {key: value for key, value in patch.items() if key in allowed}
    if "status" in clean:
        _validate_status(clean["status"])
    for key in _JSON_FIELDS:
        if key in clean:
            clean[key] = json.dumps(clean[key] or [], ensure_ascii=False)
    for key in ("link_url", "link_label"):
        if key in clean:
            clean[key] = clean[key] or None  # empty string clears the field
    if "status_text" in clean:
        clean["status_text"] = clean["status_text"] or ""
    if "sort_order" in clean:
        clean["sort_order"] = int(clean["sort_order"] or 0)

    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM focus_topics WHERE id = ? AND status != 'removed'", (topic_id,)
        ).fetchone()
        if not row:
            raise KeyError(topic_id)
        if clean:
            # sort_order alone is a reorder, not a content change — keep "更新于" honest.
            if set(clean) - {"sort_order"}:
                clean["updated_at"] = _now()
            set_clause = ", ".join(f"{key} = ?" for key in clean)
            conn.execute(
                f"UPDATE focus_topics SET {set_clause} WHERE id = ?",
                list(clean.values()) + [topic_id],
            )
    return get_focus_topic(topic_id)


def delete_focus_topic(topic_id: int) -> None:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM focus_topics WHERE id = ? AND status != 'removed'", (topic_id,)
        ).fetchone()
        if not row:
            raise KeyError(topic_id)
        conn.execute(
            "UPDATE focus_topics SET status = 'removed', updated_at = ? WHERE id = ?",
            (_now(), topic_id),
        )
