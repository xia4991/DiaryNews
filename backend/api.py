import asyncio
import logging
import os
from datetime import datetime, timezone

log = logging.getLogger("diarynews.api")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend import storage
from backend.config import (
    ENABLE_WHISPER_API, ENABLE_WHISPER_LOCAL, RSS_SOURCES, WHISPER_MODEL,
)
from backend.news import fetch_all_feeds
from backend.youtube import (
    fetch_all_channels,
    fetch_and_summarize_caption,
    normalise_handle,
    resolve_youtube_channel,
)

app = FastAPI(title="DiaryNews API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Status ────────────────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    return {
        "minimax_configured": bool(os.environ.get("MINIMAX_API_KEY")),
        "youtube_configured": bool(os.environ.get("YOUTUBE_API_KEY")),
        "whisper_api_enabled": ENABLE_WHISPER_API,
        "whisper_local_enabled": ENABLE_WHISPER_LOCAL,
        "whisper_model": WHISPER_MODEL,
        "sources": list(RSS_SOURCES.keys()),
    }


# ── News ──────────────────────────────────────────────────────────────────────

@app.get("/api/news")
def get_news():
    return storage.load_news()


@app.post("/api/news/fetch")
async def fetch_news():
    data = storage.load_news()
    existing_urls = {a["link"] for a in data.get("articles", [])}
    new_articles = await asyncio.to_thread(fetch_all_feeds, existing_urls=existing_urls)
    now = datetime.now(timezone.utc).isoformat()
    storage.save_news({"last_updated": now, "articles": new_articles})
    return {"new_count": len(new_articles), "last_updated": now}


# ── YouTube — channels ────────────────────────────────────────────────────────

@app.get("/api/youtube")
def get_youtube():
    return storage.load_youtube()


class AddChannelRequest(BaseModel):
    handle: str
    category: str


@app.post("/api/youtube/channels", status_code=201)
def add_channel(req: AddChannelRequest):
    try:
        handle, _ = normalise_handle(req.handle)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    yt_data = storage.load_youtube()
    if handle in {ch["handle"] for ch in yt_data.get("channels", [])}:
        raise HTTPException(status_code=409, detail=f"{handle} already exists.")

    storage.add_channel(handle, handle.lstrip("@"), req.category)
    return {"handle": handle, "category": req.category}


@app.delete("/api/youtube/channels/{handle}")
def remove_channel(handle: str):
    if not handle.startswith("@"):
        handle = f"@{handle}"
    storage.remove_channel(handle)
    return {"ok": True}


@app.post("/api/youtube/channels/{handle}/resolve")
def resolve_channel(handle: str):
    if not handle.startswith("@"):
        handle = f"@{handle}"
    try:
        resolved = resolve_youtube_channel(handle)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    storage.update_channel_id(handle, resolved["channel_id"], resolved["name"])
    return resolved


# ── YouTube — videos ──────────────────────────────────────────────────────────

@app.post("/api/youtube/fetch")
async def fetch_videos():
    yt_data = storage.load_youtube()
    channels = yt_data.get("channels", [])

    errors = []
    for ch in channels:
        if not ch.get("channel_id"):
            try:
                resolved = await asyncio.to_thread(resolve_youtube_channel, ch["handle"])
                storage.update_channel_id(ch["handle"], resolved["channel_id"], resolved["name"])
            except Exception as exc:
                errors.append({"handle": ch["handle"], "error": str(exc)})

    yt_data = storage.load_youtube()
    fetchable = [ch for ch in yt_data["channels"] if ch.get("channel_id")]
    if not fetchable:
        raise HTTPException(status_code=400, detail="No resolvable channels.")

    existing_ids = {v["video_id"] for v in yt_data.get("videos", [])}
    new_videos = await asyncio.to_thread(fetch_all_channels, fetchable, existing_ids)

    now = datetime.now(timezone.utc).isoformat()
    if new_videos:
        storage.update_videos(new_videos, now)

    return {"new_count": len(new_videos), "resolve_errors": errors}


# ── YouTube — captions ────────────────────────────────────────────────────────

@app.get("/api/youtube/videos/{video_id}/caption")
async def get_caption(video_id: str):
    yt_data = storage.load_youtube()
    video = next((v for v in yt_data["videos"] if v["video_id"] == video_id), None)
    if not video:
        raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found in database.")

    if "caption" in video:
        return {"caption": video["caption"], "attempted": True}

    try:
        result = await asyncio.to_thread(fetch_and_summarize_caption, video_id, video["title"])
    except Exception as exc:
        log.exception("Caption fetch crashed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Caption fetch failed: {exc}")

    storage.save_caption(video_id, result)
    return {"caption": result, "attempted": True}


@app.delete("/api/youtube/videos/{video_id}/caption")
def clear_caption(video_id: str):
    storage.clear_caption(video_id)
    return {"ok": True}
