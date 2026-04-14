import asyncio
import logging
import os

log = logging.getLogger("diarynews.api")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend import services, storage
from backend.config import ENABLE_WHISPER_API, ENABLE_WHISPER_LOCAL, WHISPER_MODEL
from backend.sources import RSS_SOURCES

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
    return await asyncio.to_thread(services.fetch_and_save_news)


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
        return services.add_youtube_channel(req.handle, req.category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except services.DuplicateChannelError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.delete("/api/youtube/channels/{handle}")
def remove_channel(handle: str):
    services.remove_youtube_channel(handle)
    return {"ok": True}


@app.post("/api/youtube/channels/{handle}/resolve")
def resolve_channel(handle: str):
    try:
        return services.resolve_and_save_channel(handle)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── YouTube — videos ──────────────────────────────────────────────────────────

@app.post("/api/youtube/fetch")
async def fetch_videos():
    try:
        return await asyncio.to_thread(services.fetch_and_save_videos)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── YouTube — captions ────────────────────────────────────────────────────────

@app.get("/api/youtube/videos/{video_id}/caption")
async def get_caption(video_id: str):
    try:
        return await asyncio.to_thread(services.get_or_fetch_caption, video_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        log.exception("Caption fetch crashed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Caption fetch failed: {exc}")


@app.delete("/api/youtube/videos/{video_id}/caption")
def clear_caption(video_id: str):
    storage.clear_caption(video_id)
    return {"ok": True}


# ── Ideas ─────────────────────────────────────────────────────────────────────

class IdeaRequest(BaseModel):
    title: str
    category: str = "General"
    content: str = ""


@app.get("/api/ideas")
def get_ideas():
    return storage.load_ideas()


@app.post("/api/ideas", status_code=201)
def create_idea(req: IdeaRequest):
    return storage.save_idea(req.title, req.category, req.content)


@app.put("/api/ideas/{idea_id}")
def update_idea(idea_id: int, req: IdeaRequest):
    try:
        return storage.update_idea(idea_id, req.title, req.category, req.content)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Idea {idea_id} not found.")


@app.delete("/api/ideas/{idea_id}")
def delete_idea(idea_id: int):
    storage.delete_idea(idea_id)
    return {"ok": True}
