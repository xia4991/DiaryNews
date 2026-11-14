"""Site visit analytics: raw event log + admin aggregates.

Events are written by `POST /api/track` (page views, tab switches, outbound clicks)
and by `POST /api/news/view` (article opens). Aggregation happens in Python over
the requested window: the site's volume is small, day buckets must follow Lisbon
local time (DST), and it keeps the SQL trivial.
"""

import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

from backend.storage.base import _ensure_db
from backend.storage.database import get_db

log = logging.getLogger("diarynews.storage.analytics")

ANALYTICS_EVENT_TYPES = ("pageview", "tab", "article_open", "outbound")
# Events that mean "a page of the site was seen".
PAGE_EVENT_TYPES = ("pageview", "tab")

try:
    from zoneinfo import ZoneInfo
    SITE_TZ = ZoneInfo("Europe/Lisbon")
except Exception:  # pragma: no cover - missing tzdata
    SITE_TZ = timezone.utc

_FIELD_LIMITS = {
    "page": 64,
    "target": 1000,
    "title": 300,
    "referrer": 1000,
    "ip": 64,
    "country": 2,
    "visitor_id": 64,
    "device": 16,
    "user_agent": 400,
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _clip(value, limit: int) -> str:
    return str(value or "").strip()[:limit]


def record_site_event(
    event_type: str,
    *,
    page: str = "",
    target: str = "",
    title: str = "",
    referrer: str = "",
    ip: str = "",
    country: str = "",
    visitor_id: str = "",
    user_id: Optional[int] = None,
    is_admin: bool = False,
    is_bot: bool = False,
    device: str = "",
    user_agent: str = "",
) -> None:
    if event_type not in ANALYTICS_EVENT_TYPES:
        raise ValueError(f"Unknown event_type: {event_type}")
    values = {
        name: _clip(value, _FIELD_LIMITS[name])
        for name, value in {
            "page": page, "target": target, "title": title, "referrer": referrer,
            "ip": ip, "country": country, "visitor_id": visitor_id,
            "device": device, "user_agent": user_agent,
        }.items()
    }
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO site_events (created_at, event_type, page, target, title, referrer, ip,"
            " country, visitor_id, user_id, is_admin, is_bot, device, user_agent)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                _now_utc().isoformat(), event_type, values["page"], values["target"],
                values["title"], values["referrer"], values["ip"], values["country"],
                values["visitor_id"], user_id, int(bool(is_admin)), int(bool(is_bot)),
                values["device"], values["user_agent"],
            ),
        )


def prune_site_events(retention_days: int) -> int:
    """Delete events older than `retention_days`. Returns the number of rows removed."""
    if retention_days <= 0:
        return 0
    cutoff = (_now_utc() - timedelta(days=retention_days)).isoformat()
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute("DELETE FROM site_events WHERE created_at < ?", (cutoff,))
        return cur.rowcount or 0


def _filters(include_admin: bool, include_bots: bool) -> str:
    clauses = []
    if not include_admin:
        clauses.append("is_admin = 0")
    if not include_bots:
        clauses.append("is_bot = 0")
    return "".join(f" AND {c}" for c in clauses)


def _local_midnight(days_back: int = 0) -> datetime:
    today = datetime.now(SITE_TZ).date() - timedelta(days=days_back)
    return datetime(today.year, today.month, today.day, tzinfo=SITE_TZ)


def _local_date(created_at: str) -> str:
    try:
        return datetime.fromisoformat(created_at).astimezone(SITE_TZ).date().isoformat()
    except ValueError:
        return created_at[:10]


def _visitor_key(row) -> str:
    return row["visitor_id"] or f"ip:{row['ip']}"


def _referrer_host(referrer: str) -> str:
    if not referrer:
        return ""
    host = urlparse(referrer).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def _totals(rows: list) -> dict:
    page_rows = [r for r in rows if r["event_type"] in PAGE_EVENT_TYPES]
    return {
        "page_views": len(page_rows),
        "visits": sum(1 for r in rows if r["event_type"] == "pageview"),
        "unique_ips": len({r["ip"] for r in rows if r["ip"]}),
        "unique_visitors": len({_visitor_key(r) for r in rows}),
        "article_opens": sum(1 for r in rows if r["event_type"] == "article_open"),
        "outbound_clicks": sum(1 for r in rows if r["event_type"] == "outbound"),
        "logged_in_users": len({r["user_id"] for r in rows if r["user_id"]}),
    }


def _user_labels(conn, user_ids) -> dict:
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}
    placeholders = ",".join("?" * len(ids))
    rows = conn.execute(
        f"SELECT id, name, email FROM users WHERE id IN ({placeholders})", ids
    ).fetchall()
    return {r["id"]: {"name": r["name"], "email": r["email"]} for r in rows}


def _article_titles(conn, links) -> dict:
    links = sorted({link for link in links if link})
    if not links:
        return {}
    out = {}
    # SQLite's default variable limit is 999; chunk to stay under it.
    for i in range(0, len(links), 500):
        chunk = links[i:i + 500]
        placeholders = ",".join("?" * len(chunk))
        rows = conn.execute(
            f"SELECT link, title, title_zh, source FROM articles WHERE link IN ({placeholders})",
            chunk,
        ).fetchall()
        for r in rows:
            out[r["link"]] = {"title": r["title_zh"] or r["title"], "source": r["source"]}
    return out


def analytics_summary(
    days: int = 7,
    *,
    include_admin: bool = False,
    include_bots: bool = False,
    own_hosts: tuple = (),
) -> dict:
    days = max(1, min(int(days), 366))
    start = _local_midnight(days - 1)
    today_start = _local_midnight(0)
    start_utc = start.astimezone(timezone.utc).isoformat()
    today_utc = today_start.astimezone(timezone.utc).isoformat()

    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT created_at, event_type, page, target, title, referrer, ip, country,"
            " visitor_id, user_id, device FROM site_events"
            f" WHERE created_at >= ?{_filters(include_admin, include_bots)}"
            " ORDER BY created_at",
            (start_utc,),
        ).fetchall()
        rows = [dict(r) for r in rows]

        # ── daily series (every day in the window, zero-filled) ──────────────
        by_day = defaultdict(list)
        for r in rows:
            by_day[_local_date(r["created_at"])].append(r)
        daily = []
        for offset in range(days - 1, -1, -1):
            day = (datetime.now(SITE_TZ).date() - timedelta(days=offset)).isoformat()
            t = _totals(by_day.get(day, []))
            daily.append({
                "date": day,
                "page_views": t["page_views"],
                "unique_ips": t["unique_ips"],
                "unique_visitors": t["unique_visitors"],
                "article_opens": t["article_opens"],
            })

        page_rows = [r for r in rows if r["event_type"] in PAGE_EVENT_TYPES]

        # ── pages (tabs) ─────────────────────────────────────────────────────
        page_views = Counter(r["page"] or "未知" for r in page_rows)
        page_ips = defaultdict(set)
        for r in page_rows:
            page_ips[r["page"] or "未知"].add(r["ip"])
        top_pages = [
            {"page": page, "views": count, "unique_ips": len(page_ips[page])}
            for page, count in page_views.most_common(15)
        ]

        # ── articles ─────────────────────────────────────────────────────────
        article_rows = [r for r in rows if r["event_type"] == "article_open" and r["target"]]
        article_counts = Counter(r["target"] for r in article_rows)
        article_ips = defaultdict(set)
        for r in article_rows:
            article_ips[r["target"]].add(r["ip"])
        top_links = [link for link, _ in article_counts.most_common(15)]
        titles = _article_titles(conn, top_links)
        top_articles = [
            {
                "link": link,
                "title": titles.get(link, {}).get("title") or link,
                "source": titles.get(link, {}).get("source") or "",
                "opens": article_counts[link],
                "unique_ips": len(article_ips[link]),
            }
            for link in top_links
        ]

        # ── outbound clicks ("阅读原文" etc.) ─────────────────────────────────
        outbound_rows = [r for r in rows if r["event_type"] == "outbound" and r["target"]]
        outbound_counts = Counter(r["target"] for r in outbound_rows)
        outbound_titles = {r["target"]: r["title"] for r in outbound_rows if r["title"]}
        top_outbound = [
            {"url": url, "title": outbound_titles.get(url, ""), "clicks": count}
            for url, count in outbound_counts.most_common(10)
        ]

        # ── referrers (site entries only, own domain excluded) ───────────────
        own = {h.lower() for h in own_hosts if h}
        referrers = Counter()
        for r in rows:
            if r["event_type"] != "pageview":
                continue
            host = _referrer_host(r["referrer"])
            if host in own:
                host = ""
            referrers[host or "直接访问"] += 1
        top_referrers = [{"source": s, "visits": c} for s, c in referrers.most_common(10)]

        # ── devices / countries (by distinct visitor) ────────────────────────
        visitor_device = {}
        visitor_country = {}
        for r in rows:
            key = _visitor_key(r)
            if r["device"]:
                visitor_device[key] = r["device"]
            if r["country"]:
                visitor_country[key] = r["country"]
        devices = [
            {"device": d, "visitors": c}
            for d, c in Counter(visitor_device.values()).most_common()
        ]
        countries = [
            {"country": c, "visitors": n}
            for c, n in Counter(visitor_country.values()).most_common(10)
        ]

        # ── top IPs ──────────────────────────────────────────────────────────
        ip_stats: dict = {}
        for r in rows:
            ip = r["ip"] or "unknown"
            s = ip_stats.setdefault(ip, {
                "ip": ip, "events": 0, "page_views": 0, "article_opens": 0,
                "first_seen": r["created_at"], "last_seen": r["created_at"],
                "country": "", "device": "", "user_ids": set(),
            })
            s["events"] += 1
            if r["event_type"] in PAGE_EVENT_TYPES:
                s["page_views"] += 1
            elif r["event_type"] == "article_open":
                s["article_opens"] += 1
            s["last_seen"] = r["created_at"]
            s["country"] = r["country"] or s["country"]
            s["device"] = r["device"] or s["device"]
            if r["user_id"]:
                s["user_ids"].add(r["user_id"])
        top_ip_rows = sorted(ip_stats.values(), key=lambda s: (-s["events"], s["ip"]))[:20]
        users = _user_labels(conn, [uid for s in top_ip_rows for uid in s["user_ids"]])
        top_ips = []
        for s in top_ip_rows:
            s = dict(s)
            s["users"] = [users[uid] for uid in sorted(s.pop("user_ids")) if uid in users]
            top_ips.append(s)

    return {
        "days": days,
        "timezone": str(SITE_TZ),
        "range_start": start.isoformat(),
        "include_admin": include_admin,
        "include_bots": include_bots,
        "totals": _totals(rows),
        "today": _totals([r for r in rows if r["created_at"] >= today_utc]),
        "daily": daily,
        "top_pages": top_pages,
        "top_articles": top_articles,
        "top_outbound": top_outbound,
        "top_referrers": top_referrers,
        "devices": devices,
        "countries": countries,
        "top_ips": top_ips,
    }


def list_site_events(
    *,
    limit: int = 50,
    offset: int = 0,
    ip: Optional[str] = None,
    event_type: Optional[str] = None,
    include_admin: bool = False,
    include_bots: bool = False,
) -> dict:
    where = "WHERE 1=1" + _filters(include_admin, include_bots)
    params: list = []
    if ip:
        where += " AND ip = ?"
        params.append(ip)
    if event_type:
        where += " AND event_type = ?"
        params.append(event_type)
    _ensure_db()
    with get_db() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM site_events {where}", params).fetchone()[0]
        rows = conn.execute(
            f"SELECT * FROM site_events {where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        items = [dict(r) for r in rows]
        users = _user_labels(conn, [r["user_id"] for r in items])
        titles = _article_titles(
            conn, [r["target"] for r in items if r["event_type"] == "article_open"]
        )
    for r in items:
        r["user"] = users.get(r["user_id"])
        if r["event_type"] == "article_open" and not r["title"]:
            r["title"] = titles.get(r["target"], {}).get("title", "")
    return {"items": items, "total": total}
