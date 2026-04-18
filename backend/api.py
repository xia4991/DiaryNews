import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

log = logging.getLogger("diarynews.api")

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend import services, storage
from backend.auth import (
    verify_google_token,
    create_jwt,
    get_current_user,
    require_admin,
)
from backend.config import (
    ADMIN_EMAILS, CORS_ORIGINS,
    MEDIA_BACKEND, MEDIA_LOCAL_ROOT, MEDIA_PUBLIC_URL,
)
from backend.sources import RSS_SOURCES

JOB_EXPIRY_SWEEP_INTERVAL_SECONDS = 24 * 60 * 60


async def _job_expiry_loop():
    """Background task: sweep expired jobs once at boot, then every 24h."""
    while True:
        try:
            count = await asyncio.to_thread(storage.expire_stale_jobs)
            if count:
                log.info("Expired %d stale job listings", count)
        except Exception:
            log.exception("Job expiry sweep failed")
        await asyncio.sleep(JOB_EXPIRY_SWEEP_INTERVAL_SECONDS)


app = FastAPI(title="葡萄牙华人信息中心 API", version="2.0.0")


@app.on_event("startup")
async def _start_background_tasks():
    asyncio.create_task(_job_expiry_loop())


if MEDIA_BACKEND == "local":
    import os
    os.makedirs(MEDIA_LOCAL_ROOT, exist_ok=True)
    app.mount(MEDIA_PUBLIC_URL, StaticFiles(directory=MEDIA_LOCAL_ROOT), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ─────────────────────────────────────────────────────────────────────

class GoogleLoginRequest(BaseModel):
    credential: str


@app.post("/api/auth/google")
def google_login(req: GoogleLoginRequest):
    try:
        info = verify_google_token(req.credential)
    except Exception as exc:
        log.warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid Google token")
    is_admin = info["email"] in ADMIN_EMAILS
    user = storage.get_or_create_user(
        google_id=info["google_id"],
        email=info["email"],
        name=info["name"],
        avatar=info["picture"],
        is_admin=is_admin,
    )
    token = create_jwt(user["id"], user["email"], bool(user["is_admin"]))
    return {"token": token, "user": _user_public(user)}


def _user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "avatar": u["avatar"],
        "phone": u["phone"] if "phone" in u.keys() else None,
        "is_admin": bool(u["is_admin"]),
    }


@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    db_user = storage.get_user_by_id(int(user["sub"]))
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    return _user_public(db_user)


class UpdateMeRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


@app.put("/api/auth/me")
def update_me(req: UpdateMeRequest, user: dict = Depends(get_current_user)):
    name = req.name.strip() if req.name is not None else None
    phone = req.phone.strip() if req.phone is not None else None
    if name is not None and not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if phone is not None and len(phone) > 40:
        raise HTTPException(status_code=400, detail="Phone too long")
    updated = storage.update_user_profile(int(user["sub"]), name=name, phone=phone)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_public(updated)


# ── Status ────────────────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    return {
        "sources": list(RSS_SOURCES.keys()),
    }


# ── News (public) ────────────────────────────────────────────────────────────

@app.get("/api/news")
def get_news():
    return storage.load_news()


@app.post("/api/news/fetch")
async def fetch_news(_admin: dict = Depends(require_admin)):
    return await asyncio.to_thread(services.fetch_and_save_news)


# ── Media upload ─────────────────────────────────────────────────────────────

@app.post("/api/media/upload")
async def upload_media(
    image: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    data = await image.read()
    try:
        return services.process_and_store_image(data, image.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── Jobs ─────────────────────────────────────────────────────────────────────

Industry = Literal["Restaurant", "ShoppingStore", "Driving", "Other"]
JOB_DEFAULT_EXPIRY_DAYS = 30
_PUBLIC_JOB_STATUSES = {"active", "expired"}


class JobCreateRequest(BaseModel):
    title: str
    industry: Industry
    description: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[str] = None


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    industry: Optional[Industry] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[str] = None


def _require_job(listing_id: int, include_nonpublic: bool = False) -> dict:
    job = storage.get_listing(listing_id)
    if not job or job["kind"] != "job":
        raise HTTPException(status_code=404, detail=f"Job {listing_id} not found")
    if not include_nonpublic and job["status"] not in _PUBLIC_JOB_STATUSES:
        raise HTTPException(status_code=404, detail=f"Job {listing_id} not found")
    return job


@app.get("/api/jobs")
def list_jobs(
    industry: Optional[Industry] = None,
    location: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    filters = {}
    if industry:
        filters["industry"] = industry
    if location:
        filters["location"] = location
    return storage.list_jobs(filters, limit=limit, offset=offset)


@app.get("/api/jobs/{listing_id}")
def get_job(listing_id: int):
    return _require_job(listing_id)


@app.post("/api/jobs", status_code=201)
def create_job(req: JobCreateRequest, user: dict = Depends(get_current_user)):
    expires_at = req.expires_at or (
        datetime.now(timezone.utc) + timedelta(days=JOB_DEFAULT_EXPIRY_DAYS)
    ).isoformat()
    base_fields = {
        "title": req.title,
        "description": req.description,
        "location": req.location,
        "contact_phone": req.contact_phone,
        "contact_whatsapp": req.contact_whatsapp,
        "contact_email": req.contact_email,
        "source_url": req.source_url,
        "expires_at": expires_at,
    }
    return storage.create_job(
        owner_id=int(user["sub"]),
        base_fields=base_fields,
        industry=req.industry,
        salary_range=req.salary_range,
    )


@app.put("/api/jobs/{listing_id}")
def update_job(
    listing_id: int,
    req: JobUpdateRequest,
    user: dict = Depends(get_current_user),
):
    existing = storage.get_listing(listing_id)
    if not existing or existing["kind"] != "job":
        raise HTTPException(status_code=404, detail=f"Job {listing_id} not found")
    patch = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    try:
        return storage.update_job(
            listing_id,
            owner_id=int(user["sub"]),
            patch=patch,
            is_admin=bool(user.get("is_admin")),
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not the owner of this job")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/api/jobs/{listing_id}")
def delete_job(listing_id: int, user: dict = Depends(get_current_user)):
    existing = storage.get_listing(listing_id)
    if not existing or existing["kind"] != "job":
        raise HTTPException(status_code=404, detail=f"Job {listing_id} not found")
    try:
        storage.delete_listing(
            listing_id,
            owner_id=int(user["sub"]),
            is_admin=bool(user.get("is_admin")),
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not the owner of this job")
    return {"ok": True}


# ── Real Estate ─────────────────────────────────────────────────────────────

DealType = Literal["sale", "rent"]
RE_DEFAULT_EXPIRY_DAYS = 90
_PUBLIC_RE_STATUSES = {"active", "expired"}


class RECreateRequest(BaseModel):
    title: str
    deal_type: DealType
    price_cents: int
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_m2: Optional[int] = None
    furnished: bool = False
    description: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[str] = None
    image_keys: Optional[list] = None


class REUpdateRequest(BaseModel):
    title: Optional[str] = None
    deal_type: Optional[DealType] = None
    price_cents: Optional[int] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_m2: Optional[int] = None
    furnished: Optional[bool] = None
    description: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[str] = None


@app.get("/api/realestate")
def list_realestate(
    deal_type: Optional[DealType] = None,
    location: Optional[str] = None,
    min_price_cents: Optional[int] = None,
    max_price_cents: Optional[int] = None,
    min_rooms: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    filters = {}
    if deal_type:
        filters["deal_type"] = deal_type
    if location:
        filters["location"] = location
    if min_price_cents is not None:
        filters["min_price_cents"] = min_price_cents
    if max_price_cents is not None:
        filters["max_price_cents"] = max_price_cents
    if min_rooms is not None:
        filters["min_rooms"] = min_rooms
    return storage.list_realestate(filters, limit=limit, offset=offset)


@app.get("/api/realestate/{listing_id}")
def get_realestate(listing_id: int):
    listing = storage.get_listing(listing_id)
    if not listing or listing["kind"] != "realestate":
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    if listing["status"] not in _PUBLIC_RE_STATUSES:
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    return listing


@app.post("/api/realestate", status_code=201)
def create_realestate(req: RECreateRequest, user: dict = Depends(get_current_user)):
    expires_at = req.expires_at or (
        datetime.now(timezone.utc) + timedelta(days=RE_DEFAULT_EXPIRY_DAYS)
    ).isoformat()
    base_fields = {
        "title": req.title,
        "description": req.description,
        "location": req.location,
        "contact_phone": req.contact_phone,
        "contact_whatsapp": req.contact_whatsapp,
        "contact_email": req.contact_email,
        "source_url": req.source_url,
        "expires_at": expires_at,
    }
    return storage.create_realestate(
        owner_id=int(user["sub"]),
        base_fields=base_fields,
        deal_type=req.deal_type,
        price_cents=req.price_cents,
        rooms=req.rooms,
        bathrooms=req.bathrooms,
        area_m2=req.area_m2,
        furnished=req.furnished,
        images=req.image_keys,
    )


@app.put("/api/realestate/{listing_id}")
def update_realestate(
    listing_id: int,
    req: REUpdateRequest,
    user: dict = Depends(get_current_user),
):
    existing = storage.get_listing(listing_id)
    if not existing or existing["kind"] != "realestate":
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    patch = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    try:
        return storage.update_realestate(
            listing_id,
            owner_id=int(user["sub"]),
            patch=patch,
            is_admin=bool(user.get("is_admin")),
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not the owner of this listing")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/api/realestate/{listing_id}")
def delete_realestate(listing_id: int, user: dict = Depends(get_current_user)):
    existing = storage.get_listing(listing_id)
    if not existing or existing["kind"] != "realestate":
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    try:
        storage.delete_listing(
            listing_id,
            owner_id=int(user["sub"]),
            is_admin=bool(user.get("is_admin")),
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not the owner of this listing")
    return {"ok": True}


# ── Second-Hand ─────────────────────────────────────────────────────────────

SHCategory = Literal["Electronics", "Furniture", "Clothing", "Vehicle", "Baby", "Sports", "Books", "Other"]
SHCondition = Literal["new", "like_new", "good", "fair"]
SH_DEFAULT_EXPIRY_DAYS = 60
_PUBLIC_SH_STATUSES = {"active", "expired"}


class SHCreateRequest(BaseModel):
    title: str
    category: SHCategory
    condition: SHCondition
    price_cents: int
    description: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[str] = None
    image_keys: Optional[list] = None


class SHUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[SHCategory] = None
    condition: Optional[SHCondition] = None
    price_cents: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[str] = None


@app.get("/api/secondhand")
def list_secondhand(
    category: Optional[SHCategory] = None,
    condition: Optional[SHCondition] = None,
    location: Optional[str] = None,
    min_price_cents: Optional[int] = None,
    max_price_cents: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    filters = {}
    if category:
        filters["category"] = category
    if condition:
        filters["condition"] = condition
    if location:
        filters["location"] = location
    if min_price_cents is not None:
        filters["min_price_cents"] = min_price_cents
    if max_price_cents is not None:
        filters["max_price_cents"] = max_price_cents
    return storage.list_secondhand(filters, limit=limit, offset=offset)


@app.get("/api/secondhand/{listing_id}")
def get_secondhand(listing_id: int):
    listing = storage.get_listing(listing_id)
    if not listing or listing["kind"] != "secondhand":
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    if listing["status"] not in _PUBLIC_SH_STATUSES:
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    return listing


@app.post("/api/secondhand", status_code=201)
def create_secondhand(req: SHCreateRequest, user: dict = Depends(get_current_user)):
    expires_at = req.expires_at or (
        datetime.now(timezone.utc) + timedelta(days=SH_DEFAULT_EXPIRY_DAYS)
    ).isoformat()
    base_fields = {
        "title": req.title,
        "description": req.description,
        "location": req.location,
        "contact_phone": req.contact_phone,
        "contact_whatsapp": req.contact_whatsapp,
        "contact_email": req.contact_email,
        "source_url": req.source_url,
        "expires_at": expires_at,
    }
    return storage.create_secondhand(
        owner_id=int(user["sub"]),
        base_fields=base_fields,
        category=req.category,
        condition=req.condition,
        price_cents=req.price_cents,
        images=req.image_keys,
    )


@app.put("/api/secondhand/{listing_id}")
def update_secondhand(
    listing_id: int,
    req: SHUpdateRequest,
    user: dict = Depends(get_current_user),
):
    existing = storage.get_listing(listing_id)
    if not existing or existing["kind"] != "secondhand":
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    patch = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    try:
        return storage.update_secondhand(
            listing_id,
            owner_id=int(user["sub"]),
            patch=patch,
            is_admin=bool(user.get("is_admin")),
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not the owner of this listing")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/api/secondhand/{listing_id}")
def delete_secondhand(listing_id: int, user: dict = Depends(get_current_user)):
    existing = storage.get_listing(listing_id)
    if not existing or existing["kind"] != "secondhand":
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    try:
        storage.delete_listing(
            listing_id,
            owner_id=int(user["sub"]),
            is_admin=bool(user.get("is_admin")),
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not the owner of this listing")
    return {"ok": True}


# ── Listings moderation ──────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    reason: str


class AdminStatusRequest(BaseModel):
    status: str


@app.post("/api/listings/{listing_id}/report", status_code=201)
def report_listing(
    listing_id: int,
    req: ReportRequest,
    user: dict = Depends(get_current_user),
):
    reason = (req.reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="reason is required")
    try:
        return storage.create_report(listing_id, int(user["sub"]), reason)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")


@app.get("/api/admin/reports")
def admin_list_reports(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: dict = Depends(require_admin),
):
    return storage.list_unresolved_reports(limit=limit, offset=offset)


@app.get("/api/admin/listings/recent")
def admin_recent_listings(
    limit: int = Query(20, ge=1, le=100),
    _admin: dict = Depends(require_admin),
):
    return storage.list_all_recent(limit=limit)


@app.patch("/api/admin/listings/{listing_id}/status")
def admin_set_listing_status(
    listing_id: int,
    req: AdminStatusRequest,
    admin: dict = Depends(require_admin),
):
    try:
        return services.moderate_listing(listing_id, int(admin["sub"]), req.status)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── Ideas (login required) ──────────────────────────────────────────────────

class IdeaRequest(BaseModel):
    title: str
    category: str = "General"
    content: str = ""


@app.get("/api/ideas")
def get_ideas(_user: dict = Depends(get_current_user)):
    return storage.load_ideas()


@app.post("/api/ideas", status_code=201)
def create_idea(req: IdeaRequest, _user: dict = Depends(get_current_user)):
    return storage.save_idea(req.title, req.category, req.content)


@app.put("/api/ideas/{idea_id}")
def update_idea(idea_id: int, req: IdeaRequest, _user: dict = Depends(get_current_user)):
    try:
        return storage.update_idea(idea_id, req.title, req.category, req.content)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Idea {idea_id} not found.")


@app.delete("/api/ideas/{idea_id}")
def delete_idea(idea_id: int, _user: dict = Depends(get_current_user)):
    storage.delete_idea(idea_id)
    return {"ok": True}
