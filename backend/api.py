import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

log = logging.getLogger("diarynews.api")

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend import services, storage
from backend.auth import (
    verify_google_token,
    create_jwt,
    get_current_user,
    require_admin,
)
from backend.config import ADMIN_EMAILS, CORS_ORIGINS
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


app = FastAPI(title="DiaryNews API", version="2.0.0")


@app.on_event("startup")
async def _start_background_tasks():
    asyncio.create_task(_job_expiry_loop())

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
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "avatar": user["avatar"],
            "is_admin": bool(user["is_admin"]),
        },
    }


@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    db_user = storage.get_user_by_id(int(user["sub"]))
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": db_user["id"],
        "email": db_user["email"],
        "name": db_user["name"],
        "avatar": db_user["avatar"],
        "is_admin": bool(db_user["is_admin"]),
    }


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


# ── YouTube (login required, admin for mutations) ───────────────────────────

@app.get("/api/youtube")
def get_youtube(_user: dict = Depends(get_current_user)):
    return storage.load_youtube()


class AddChannelRequest(BaseModel):
    handle: str
    category: str


@app.post("/api/youtube/channels", status_code=201)
def add_channel(req: AddChannelRequest, _admin: dict = Depends(require_admin)):
    try:
        return services.add_youtube_channel(req.handle, req.category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except services.DuplicateChannelError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.delete("/api/youtube/channels/{handle}")
def remove_channel(handle: str, _admin: dict = Depends(require_admin)):
    services.remove_youtube_channel(handle)
    return {"ok": True}


@app.post("/api/youtube/channels/{handle}/resolve")
def resolve_channel(handle: str, _admin: dict = Depends(require_admin)):
    try:
        return services.resolve_and_save_channel(handle)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/youtube/fetch")
async def fetch_videos(_admin: dict = Depends(require_admin)):
    try:
        return await asyncio.to_thread(services.fetch_and_save_videos)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/youtube/videos/{video_id}/caption")
async def get_caption(video_id: str, _user: dict = Depends(get_current_user)):
    try:
        return await asyncio.to_thread(services.get_or_fetch_caption, video_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        log.exception("Caption fetch crashed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Caption fetch failed: {exc}")


@app.delete("/api/youtube/videos/{video_id}/caption")
def clear_caption(video_id: str, _admin: dict = Depends(require_admin)):
    storage.clear_caption(video_id)
    return {"ok": True}


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
