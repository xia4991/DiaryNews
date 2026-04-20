from datetime import datetime, timezone
from typing import Callable, Optional

from backend.database import get_db
from backend.storage.base import _ensure_db
from backend.storage_media import get_media_storage


_BASE_FIELDS = {
    "title", "description", "location", "contact_phone",
    "contact_whatsapp", "contact_email", "source_url", "expires_at",
}
_VALID_STATUSES = ("active", "hidden", "removed", "expired")

# Per-kind extension tables; keys are the `listings.kind` values.
_EXTENSION_TABLES = {"job": "listing_jobs", "realestate": "listing_realestate", "secondhand": "listing_secondhand"}

JOB_INDUSTRIES = ("Restaurant", "ShoppingStore", "Driving", "Other")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_images(conn, listing_id: int) -> list:
    rows = conn.execute(
        "SELECT id, position, storage_key, thumb_key, original_filename, "
        "bytes, width, height, created_at FROM listing_images "
        "WHERE listing_id = ? ORDER BY position ASC",
        (listing_id,),
    ).fetchall()
    media = get_media_storage()
    result = []
    for r in rows:
        d = dict(r)
        d["url"] = media.url(d["storage_key"])
        d["thumb_url"] = media.url(d["thumb_key"])
        result.append(d)
    return result


def _fetch_extension(conn, kind: str, listing_id: int) -> dict:
    table = _EXTENSION_TABLES.get(kind)
    if not table:
        return {}
    row = conn.execute(
        f"SELECT * FROM {table} WHERE listing_id = ?", (listing_id,)
    ).fetchone()
    if not row:
        return {}
    ext = dict(row)
    ext.pop("listing_id", None)
    return ext


def _fetch_listing(conn, listing_id: int) -> Optional[dict]:
    row = conn.execute(
        """SELECT l.*, u.name AS owner_name, u.is_admin AS owner_is_admin
           FROM listings l
           JOIN users u ON u.id = l.owner_id
           WHERE l.id = ?""",
        (listing_id,),
    ).fetchone()
    if not row:
        return None
    d = dict(row)
    d.update(_fetch_extension(conn, d["kind"], listing_id))
    d["images"] = _fetch_images(conn, listing_id)
    return d


# ── Listings CRUD ────────────────────────────────────────────────────────────

def create_listing(
    kind: str,
    owner_id: int,
    base_fields: dict,
    kind_writer: Optional[Callable] = None,
    images: Optional[list] = None,
) -> dict:
    """Insert a listing + optional per-kind row + optional images in one transaction.

    kind_writer is called as kind_writer(conn, listing_id) so per-kind modules
    (jobs, realestate, secondhand) can write their extension row atomically.
    """
    _ensure_db()
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO listings (kind, owner_id, title, description, location, "
            "status, contact_phone, contact_whatsapp, contact_email, source_url, "
            "created_at, updated_at, expires_at) "
            "VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)",
            (
                kind, owner_id,
                base_fields["title"],
                base_fields.get("description"),
                base_fields.get("location"),
                base_fields.get("contact_phone"),
                base_fields.get("contact_whatsapp"),
                base_fields.get("contact_email"),
                base_fields.get("source_url"),
                now, now,
                base_fields.get("expires_at"),
            ),
        )
        listing_id = cur.lastrowid

        if kind_writer is not None:
            kind_writer(conn, listing_id)

        for pos, img in enumerate(images or []):
            conn.execute(
                "INSERT INTO listing_images (listing_id, position, storage_key, "
                "thumb_key, original_filename, bytes, width, height, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    listing_id, pos,
                    img["storage_key"], img["thumb_key"],
                    img.get("original_filename"), img.get("bytes"),
                    img.get("width"), img.get("height"),
                    now,
                ),
            )

        return _fetch_listing(conn, listing_id)


def get_listing(listing_id: int) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        return _fetch_listing(conn, listing_id)


def list_listings(
    kind: str,
    filters: Optional[dict] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List listings of a given kind. Default status filter hides removed/hidden;
    pass status='all' to include everything, or an explicit status string."""
    _ensure_db()
    filters = filters or {}
    clauses = ["kind = ?"]
    params = [kind]

    status = filters.get("status", "public")
    if status == "public":
        clauses.append("status IN ('active','expired')")
    elif status == "all":
        pass
    else:
        clauses.append("status = ?")
        params.append(status)

    if filters.get("owner_id") is not None:
        clauses.append("owner_id = ?")
        params.append(filters["owner_id"])

    if filters.get("location"):
        clauses.append("location LIKE ?")
        params.append(f"%{filters['location']}%")

    where = " AND ".join(clauses)
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM listings WHERE {where}", params
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT l.*, u.name AS owner_name, u.is_admin AS owner_is_admin
                FROM listings l
                JOIN users u ON u.id = l.owner_id
                WHERE {where} """
            "ORDER BY l.created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d.update(_fetch_extension(conn, d["kind"], d["id"]))
            d["images"] = _fetch_images(conn, d["id"])
            items.append(d)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def list_all_recent(limit: int = 20) -> dict:
    _ensure_db()
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0]
        rows = conn.execute(
            """SELECT l.*, u.name AS owner_name, u.is_admin AS owner_is_admin
               FROM listings l
               JOIN users u ON u.id = l.owner_id
               ORDER BY l.created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d.update(_fetch_extension(conn, d["kind"], d["id"]))
            items.append(d)
    return {"items": items, "total": total}


def update_listing(
    listing_id: int,
    owner_id: int,
    patch: dict,
    is_admin: bool = False,
) -> dict:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not row:
            raise KeyError(listing_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own listing {listing_id}")

        clean = {k: v for k, v in patch.items() if k in _BASE_FIELDS}
        if not clean:
            return _fetch_listing(conn, listing_id)

        clean["updated_at"] = _now()
        set_clause = ", ".join(f"{k} = ?" for k in clean)
        conn.execute(
            f"UPDATE listings SET {set_clause} WHERE id = ?",
            list(clean.values()) + [listing_id],
        )
        return _fetch_listing(conn, listing_id)


def delete_listing(listing_id: int, owner_id: int, is_admin: bool = False) -> None:
    """Soft delete: sets status='removed'. Owner or admin only."""
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not row:
            raise KeyError(listing_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own listing {listing_id}")
        conn.execute(
            "UPDATE listings SET status = 'removed', updated_at = ? WHERE id = ?",
            (_now(), listing_id),
        )


def set_listing_status(listing_id: int, status: str) -> dict:
    """Admin-only status transition (hide / unhide / remove / expire / reactivate)."""
    _ensure_db()
    if status not in _VALID_STATUSES:
        raise ValueError(f"Invalid status: {status}")
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not row:
            raise KeyError(listing_id)
        conn.execute(
            "UPDATE listings SET status = ?, updated_at = ? WHERE id = ?",
            (status, _now(), listing_id),
        )
        return _fetch_listing(conn, listing_id)


# ── Jobs (per-kind wrapper) ──────────────────────────────────────────────────

def _validate_industry(industry: str) -> None:
    if industry not in JOB_INDUSTRIES:
        raise ValueError(
            f"Invalid industry: {industry!r}. Must be one of {JOB_INDUSTRIES}"
        )


def create_job(
    owner_id: int,
    base_fields: dict,
    industry: str,
    salary_range: Optional[str] = None,
) -> dict:
    _validate_industry(industry)

    def _write_job(conn, listing_id):
        conn.execute(
            "INSERT INTO listing_jobs (listing_id, industry, salary_range) "
            "VALUES (?, ?, ?)",
            (listing_id, industry, salary_range),
        )

    return create_listing("job", owner_id, base_fields, kind_writer=_write_job)


def expire_stale_jobs() -> int:
    """Flip active jobs whose expires_at is in the past to status='expired'.
    Returns the number of rows updated."""
    _ensure_db()
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE listings SET status = 'expired', updated_at = ? "
            "WHERE kind = 'job' AND status = 'active' "
            "AND expires_at IS NOT NULL AND expires_at < ?",
            (now, now),
        )
        return cur.rowcount


def list_jobs(
    filters: Optional[dict] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List job listings with industry/location/status filters via a single JOIN."""
    _ensure_db()
    filters = filters or {}
    clauses = ["l.kind = 'job'"]
    params: list = []

    status = filters.get("status", "public")
    if status == "public":
        clauses.append("l.status IN ('active','expired')")
    elif status == "all":
        pass
    else:
        clauses.append("l.status = ?")
        params.append(status)

    if filters.get("owner_id") is not None:
        clauses.append("l.owner_id = ?")
        params.append(filters["owner_id"])

    if filters.get("location"):
        clauses.append("l.location LIKE ?")
        params.append(f"%{filters['location']}%")

    if filters.get("industry"):
        _validate_industry(filters["industry"])
        clauses.append("j.industry = ?")
        params.append(filters["industry"])

    where = " AND ".join(clauses)
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM listings l "
            f"JOIN listing_jobs j ON j.listing_id = l.id WHERE {where}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT l.*, u.name AS owner_name, u.is_admin AS owner_is_admin,
                       j.industry, j.salary_range
                FROM listings l
                JOIN users u ON u.id = l.owner_id
                JOIN listing_jobs j ON j.listing_id = l.id WHERE {where} """
            "ORDER BY l.created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d["images"] = _fetch_images(conn, d["id"])
            items.append(d)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def update_job(
    listing_id: int,
    owner_id: int,
    patch: dict,
    is_admin: bool = False,
) -> dict:
    """Update a job listing. Accepts base listing fields plus
    industry/salary_range in a single atomic transaction."""
    _ensure_db()
    job_patch = {k: patch[k] for k in ("industry", "salary_range") if k in patch}
    if "industry" in job_patch:
        _validate_industry(job_patch["industry"])
    base_patch = {k: v for k, v in patch.items() if k in _BASE_FIELDS}

    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id, kind FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not row:
            raise KeyError(listing_id)
        if row["kind"] != "job":
            raise ValueError(f"Listing {listing_id} is not a job")
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(
                f"User {owner_id} does not own listing {listing_id}"
            )

        now = _now()
        if base_patch:
            base_patch["updated_at"] = now
            set_clause = ", ".join(f"{k} = ?" for k in base_patch)
            conn.execute(
                f"UPDATE listings SET {set_clause} WHERE id = ?",
                list(base_patch.values()) + [listing_id],
            )

        if job_patch:
            set_clause = ", ".join(f"{k} = ?" for k in job_patch)
            conn.execute(
                f"UPDATE listing_jobs SET {set_clause} WHERE listing_id = ?",
                list(job_patch.values()) + [listing_id],
            )
            if not base_patch:
                conn.execute(
                    "UPDATE listings SET updated_at = ? WHERE id = ?",
                    (now, listing_id),
                )

        return _fetch_listing(conn, listing_id)


# ── Real Estate (per-kind wrapper) ───────────────────────────────────────────

RE_DEAL_TYPES = ("sale", "rent")
RE_DEFAULT_EXPIRY_DAYS = 90


def _validate_deal_type(deal_type: str) -> None:
    if deal_type not in RE_DEAL_TYPES:
        raise ValueError(
            f"Invalid deal_type: {deal_type!r}. Must be one of {RE_DEAL_TYPES}"
        )


def create_realestate(
    owner_id: int,
    base_fields: dict,
    deal_type: str,
    price_cents: int,
    rooms: Optional[int] = None,
    bathrooms: Optional[int] = None,
    area_m2: Optional[int] = None,
    furnished: bool = False,
    images: Optional[list] = None,
) -> dict:
    _validate_deal_type(deal_type)

    def _write_re(conn, listing_id):
        conn.execute(
            "INSERT INTO listing_realestate "
            "(listing_id, deal_type, price_cents, rooms, bathrooms, area_m2, furnished) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (listing_id, deal_type, price_cents, rooms, bathrooms, area_m2, int(furnished)),
        )

    return create_listing("realestate", owner_id, base_fields, kind_writer=_write_re, images=images)


def list_realestate(
    filters: Optional[dict] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    _ensure_db()
    filters = filters or {}
    clauses = ["l.kind = 'realestate'"]
    params: list = []

    status = filters.get("status", "public")
    if status == "public":
        clauses.append("l.status IN ('active','expired')")
    elif status == "all":
        pass
    else:
        clauses.append("l.status = ?")
        params.append(status)

    if filters.get("owner_id") is not None:
        clauses.append("l.owner_id = ?")
        params.append(filters["owner_id"])

    if filters.get("location"):
        clauses.append("l.location LIKE ?")
        params.append(f"%{filters['location']}%")

    if filters.get("deal_type"):
        _validate_deal_type(filters["deal_type"])
        clauses.append("r.deal_type = ?")
        params.append(filters["deal_type"])

    if filters.get("min_price_cents") is not None:
        clauses.append("r.price_cents >= ?")
        params.append(filters["min_price_cents"])

    if filters.get("max_price_cents") is not None:
        clauses.append("r.price_cents <= ?")
        params.append(filters["max_price_cents"])

    if filters.get("min_rooms") is not None:
        clauses.append("r.rooms >= ?")
        params.append(filters["min_rooms"])

    where = " AND ".join(clauses)
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM listings l "
            f"JOIN listing_realestate r ON r.listing_id = l.id WHERE {where}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT l.*, u.name AS owner_name, u.is_admin AS owner_is_admin,
                       r.deal_type, r.price_cents, r.rooms, r.bathrooms,
                       r.area_m2, r.furnished
                FROM listings l
                JOIN users u ON u.id = l.owner_id
                JOIN listing_realestate r ON r.listing_id = l.id WHERE {where} """
            "ORDER BY l.created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        items = []
        for row in rows:
            d = dict(row)
            d["images"] = _fetch_images(conn, d["id"])
            items.append(d)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def update_realestate(
    listing_id: int,
    owner_id: int,
    patch: dict,
    is_admin: bool = False,
) -> dict:
    _ensure_db()
    re_fields = ("deal_type", "price_cents", "rooms", "bathrooms", "area_m2", "furnished")
    re_patch = {k: patch[k] for k in re_fields if k in patch}
    if "deal_type" in re_patch:
        _validate_deal_type(re_patch["deal_type"])
    if "furnished" in re_patch:
        re_patch["furnished"] = int(re_patch["furnished"])
    base_patch = {k: v for k, v in patch.items() if k in _BASE_FIELDS}

    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id, kind FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not row:
            raise KeyError(listing_id)
        if row["kind"] != "realestate":
            raise ValueError(f"Listing {listing_id} is not a realestate listing")
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(
                f"User {owner_id} does not own listing {listing_id}"
            )

        now = _now()
        if base_patch:
            base_patch["updated_at"] = now
            set_clause = ", ".join(f"{k} = ?" for k in base_patch)
            conn.execute(
                f"UPDATE listings SET {set_clause} WHERE id = ?",
                list(base_patch.values()) + [listing_id],
            )

        if re_patch:
            set_clause = ", ".join(f"{k} = ?" for k in re_patch)
            conn.execute(
                f"UPDATE listing_realestate SET {set_clause} WHERE listing_id = ?",
                list(re_patch.values()) + [listing_id],
            )
            if not base_patch:
                conn.execute(
                    "UPDATE listings SET updated_at = ? WHERE id = ?",
                    (now, listing_id),
                )

        return _fetch_listing(conn, listing_id)


# ── Second-Hand (per-kind wrapper) ──────────────────────────────────────────

SH_CATEGORIES = ("Electronics", "Furniture", "Clothing", "Vehicle", "Baby", "Sports", "Books", "Other")
SH_CONDITIONS = ("new", "like_new", "good", "fair")
SH_DEFAULT_EXPIRY_DAYS = 60


def _validate_sh_category(category: str) -> None:
    if category not in SH_CATEGORIES:
        raise ValueError(f"Invalid category: {category!r}. Must be one of {SH_CATEGORIES}")


def _validate_sh_condition(condition: str) -> None:
    if condition not in SH_CONDITIONS:
        raise ValueError(f"Invalid condition: {condition!r}. Must be one of {SH_CONDITIONS}")


def create_secondhand(
    owner_id: int,
    base_fields: dict,
    category: str,
    condition: str,
    price_cents: int,
    images: Optional[list] = None,
) -> dict:
    _validate_sh_category(category)
    _validate_sh_condition(condition)

    def _write_sh(conn, listing_id):
        conn.execute(
            "INSERT INTO listing_secondhand "
            "(listing_id, category, condition, price_cents) "
            "VALUES (?, ?, ?, ?)",
            (listing_id, category, condition, price_cents),
        )

    return create_listing("secondhand", owner_id, base_fields, kind_writer=_write_sh, images=images)


def list_secondhand(
    filters: Optional[dict] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    _ensure_db()
    filters = filters or {}
    clauses = ["l.kind = 'secondhand'"]
    params: list = []

    status = filters.get("status", "public")
    if status == "public":
        clauses.append("l.status IN ('active','expired')")
    elif status == "all":
        pass
    else:
        clauses.append("l.status = ?")
        params.append(status)

    if filters.get("owner_id") is not None:
        clauses.append("l.owner_id = ?")
        params.append(filters["owner_id"])

    if filters.get("location"):
        clauses.append("l.location LIKE ?")
        params.append(f"%{filters['location']}%")

    if filters.get("category"):
        _validate_sh_category(filters["category"])
        clauses.append("s.category = ?")
        params.append(filters["category"])

    if filters.get("condition"):
        _validate_sh_condition(filters["condition"])
        clauses.append("s.condition = ?")
        params.append(filters["condition"])

    if filters.get("min_price_cents") is not None:
        clauses.append("s.price_cents >= ?")
        params.append(filters["min_price_cents"])

    if filters.get("max_price_cents") is not None:
        clauses.append("s.price_cents <= ?")
        params.append(filters["max_price_cents"])

    where = " AND ".join(clauses)
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM listings l "
            f"JOIN listing_secondhand s ON s.listing_id = l.id WHERE {where}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT l.*, u.name AS owner_name, u.is_admin AS owner_is_admin,
                       s.category, s.condition, s.price_cents
                FROM listings l
                JOIN users u ON u.id = l.owner_id
                JOIN listing_secondhand s ON s.listing_id = l.id WHERE {where} """
            "ORDER BY l.created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        items = []
        for row in rows:
            d = dict(row)
            d["images"] = _fetch_images(conn, d["id"])
            items.append(d)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def update_secondhand(
    listing_id: int,
    owner_id: int,
    patch: dict,
    is_admin: bool = False,
) -> dict:
    _ensure_db()
    sh_fields = ("category", "condition", "price_cents")
    sh_patch = {k: patch[k] for k in sh_fields if k in patch}
    if "category" in sh_patch:
        _validate_sh_category(sh_patch["category"])
    if "condition" in sh_patch:
        _validate_sh_condition(sh_patch["condition"])
    base_patch = {k: v for k, v in patch.items() if k in _BASE_FIELDS}

    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id, kind FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not row:
            raise KeyError(listing_id)
        if row["kind"] != "secondhand":
            raise ValueError(f"Listing {listing_id} is not a secondhand listing")
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(
                f"User {owner_id} does not own listing {listing_id}"
            )

        now = _now()
        if base_patch:
            base_patch["updated_at"] = now
            set_clause = ", ".join(f"{k} = ?" for k in base_patch)
            conn.execute(
                f"UPDATE listings SET {set_clause} WHERE id = ?",
                list(base_patch.values()) + [listing_id],
            )

        if sh_patch:
            set_clause = ", ".join(f"{k} = ?" for k in sh_patch)
            conn.execute(
                f"UPDATE listing_secondhand SET {set_clause} WHERE listing_id = ?",
                list(sh_patch.values()) + [listing_id],
            )
            if not base_patch:
                conn.execute(
                    "UPDATE listings SET updated_at = ? WHERE id = ?",
                    (now, listing_id),
                )

        return _fetch_listing(conn, listing_id)


# ── Reports ───────────────────────────────────────────────────────────────────

def create_report(listing_id: int, reporter_id: int, reason: str) -> dict:
    _ensure_db()
    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
        if not exists:
            raise KeyError(listing_id)
        cur = conn.execute(
            "INSERT INTO listing_reports (listing_id, reporter_id, reason, created_at) "
            "VALUES (?, ?, ?, ?)",
            (listing_id, reporter_id, reason, _now()),
        )
        row = conn.execute(
            "SELECT * FROM listing_reports WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return dict(row)


def list_unresolved_reports(limit: int = 50, offset: int = 0) -> dict:
    _ensure_db()
    with get_db() as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM listing_reports WHERE resolved_at IS NULL"
        ).fetchone()[0]
        rows = conn.execute(
            "SELECT r.*, l.kind AS listing_kind, l.title AS listing_title, "
            "l.status AS listing_status "
            "FROM listing_reports r JOIN listings l ON r.listing_id = l.id "
            "WHERE r.resolved_at IS NULL "
            "ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
    return {"items": [dict(r) for r in rows], "total": total}


def resolve_reports_for_listing(listing_id: int, resolution: str) -> int:
    """Mark all unresolved reports for a listing as resolved. Returns count."""
    _ensure_db()
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE listing_reports SET resolved_at = ?, resolution = ? "
            "WHERE listing_id = ? AND resolved_at IS NULL",
            (_now(), resolution, listing_id),
        )
        return cur.rowcount


def resolve_report(report_id: int, resolution: str) -> dict:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM listing_reports WHERE id = ?", (report_id,)
        ).fetchone()
        if not row:
            raise KeyError(report_id)
        conn.execute(
            "UPDATE listing_reports SET resolved_at = ?, resolution = ? WHERE id = ?",
            (_now(), resolution, report_id),
        )
        updated = conn.execute(
            "SELECT * FROM listing_reports WHERE id = ?", (report_id,)
        ).fetchone()
    return dict(updated)
