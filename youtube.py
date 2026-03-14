import logging
import os
import re
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import feedparser
import requests as _requests

from config import ENABLE_WHISPER_API, ENABLE_WHISPER_LOCAL, MAX_VIDEOS, MINIMAX_API_URL, MINIMAX_MODEL, WHISPER_MODEL
from utils import strip_html

log = logging.getLogger("diarynews.youtube")


def _normalise_handle(raw: str) -> tuple:
    raw = raw.strip().rstrip("/")
    raw = re.sub(r"^https?://", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"^(?:www\.)?youtube\.com/", "", raw, flags=re.IGNORECASE)
    if not raw:
        raise ValueError("Introduza um handle válido (ex: @mkbhd).")
    handle = raw if raw.startswith("@") else f"@{raw}"
    if not re.match(r"^@[\w.\-]{1,100}$", handle):
        raise ValueError(f"Handle inválido: {handle!r}")
    return handle, f"https://www.youtube.com/{handle}"


def resolve_youtube_channel(handle: str) -> dict:
    handle, _ = _normalise_handle(handle)
    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        raise ValueError("YOUTUBE_API_KEY não configurada.")
    try:
        resp = _requests.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "snippet", "forHandle": handle.lstrip("@"), "key": api_key},
            timeout=10,
        )
        resp.raise_for_status()
    except _requests.RequestException as exc:
        raise ValueError(f"Erro ao contactar YouTube API: {exc}") from exc
    items = resp.json().get("items", [])
    if not items:
        raise ValueError(f"Canal não encontrado: {handle}")
    return {
        "handle": handle,
        "channel_id": items[0]["id"],
        "name": items[0]["snippet"]["title"],
    }


def _video_id_from_url(url: str) -> str:
    m = re.search(r"[?&]v=([\w-]{11})", url)
    return m.group(1) if m else ""


def fetch_channel_videos(channel: dict, existing_ids: set) -> list:
    feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel['channel_id']}"
    feed = feedparser.parse(feed_url)
    if feed.get("bozo") and not feed.entries:
        log.warning("fetch_channel_videos: bad feed for %s: %s", channel["handle"], feed.get("bozo_exception"))
        return []
    if getattr(feed, "status", 200) not in (200, 301, 302):
        log.warning("fetch_channel_videos: HTTP %s for %s", feed.get("status"), channel["handle"])
        return []
    videos = []
    for entry in feed.entries[:10]:
        link = entry.get("link", "")
        video_id = _video_id_from_url(link)
        if not video_id or video_id in existing_ids:
            continue
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
            thumbnail = entry.media_thumbnail[0].get("url", thumbnail)
        published = (
            datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
            if entry.get("published_parsed")
            else datetime.now(timezone.utc).isoformat()
        )
        videos.append({
            "video_id":    video_id,
            "title":       strip_html(entry.get("title", "")),
            "channel_name": channel["name"],
            "channel_id":  channel["channel_id"],
            "published":   published,
            "thumbnail":   thumbnail,
            "link":        link,
        })
    return videos


def fetch_all_channels(channels: list, existing_ids: set) -> list:
    all_new = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(fetch_channel_videos, ch, existing_ids): ch for ch in channels}
        for future in as_completed(futures):
            ch = futures[future]
            try:
                all_new.extend(future.result())
            except Exception as exc:
                log.warning("fetch_all_channels: %s raised: %s", ch["handle"], exc)
    return all_new


def merge_videos(existing: list, new_videos: list) -> list:
    seen_ids = {v["video_id"] for v in existing}
    merged = list(existing)
    for v in new_videos:
        if v["video_id"] not in seen_ids:
            merged.append(v)
            seen_ids.add(v["video_id"])
    merged.sort(key=lambda v: v["published"], reverse=True)
    return merged[:MAX_VIDEOS]


CAPTION_LANG_PRIORITY = ["pt", "en", "zh-Hans", "zh-Hant", "zh"]


def summarize_caption(title: str, raw_text: str) -> str:
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        return ""
    prompt = (
        f"Título do vídeo: {title}\n\n"
        f"Transcrição (texto bruto, sem pontuação):\n{raw_text[:4000]}\n\n"
        "请根据以上转录内容，用中文写一份结构化摘要。"
        "严格使用以下格式：\n\n"
        "**主题**\n"
        "一句话描述视频的核心主题。\n\n"
        "**要点**\n"
        "- 要点1\n"
        "- 要点2\n"
        "- 要点3\n"
        "（3到6个要点，每点1-2句话）\n\n"
        "**结论**\n"
        "一句话总结视频的核心观点或收获。\n\n"
        "直接给出内容，不要使用"这个视频讲了"之类的开场白。"
    )
    try:
        resp = _requests.post(
            MINIMAX_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": MINIMAX_MODEL, "max_tokens": 600, "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        log.warning("summarize_caption failed for '%s': %s", title, exc)
        return ""


def fetch_caption(video_id: str) -> dict:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

    # --- Tier 1: youtube-transcript-api ---
    try:
        api = YouTubeTranscriptApi()
        # Try preferred languages first, fall back to any available
        transcript = None
        for lang in CAPTION_LANG_PRIORITY:
            try:
                transcript = api.fetch(video_id, languages=[lang])
                break
            except Exception:
                continue
        if transcript is None:
            # Fall back to first available language
            transcript_list = api.list(video_id)
            first = next(iter(transcript_list))
            transcript = api.fetch(video_id, languages=[first.language_code])
        text = " ".join(seg.text.strip() for seg in transcript if seg.text)
        return {
            "text": text,
            "language": transcript.language_code,
            "tier": 1,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
    except (TranscriptsDisabled, NoTranscriptFound):
        pass
    except Exception as exc:
        log.warning("Tier 1 failed for %s: %s", video_id, exc)

    # --- Tier 2: yt-dlp + Whisper API ---
    if ENABLE_WHISPER_API:
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("Tier 2 activo mas OPENAI_API_KEY não configurada.")
        audio_path = _download_audio(video_id)
        try:
            import openai
            client = openai.OpenAI(api_key=api_key)
            with open(audio_path, "rb") as f:
                result = client.audio.transcriptions.create(model="whisper-1", file=f)
            return {
                "text": result.text,
                "language": "auto",
                "tier": 2,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            log.warning("Tier 2 failed for %s: %s", video_id, exc)
        finally:
            _cleanup(audio_path)

    # --- Tier 3: yt-dlp + local Whisper ---
    if ENABLE_WHISPER_LOCAL:
        audio_path = _download_audio(video_id)
        try:
            import whisper
            model = whisper.load_model(WHISPER_MODEL)
            result = model.transcribe(audio_path)
            return {
                "text": result["text"],
                "language": result.get("language", "auto"),
                "tier": 3,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        except ImportError:
            raise ValueError(
                "Tier 3 activo mas 'openai-whisper' não está instalado. Execute: pip install openai-whisper"
            )
        except Exception as exc:
            log.warning("Tier 3 failed for %s: %s", video_id, exc)
        finally:
            _cleanup(audio_path)

    raise ValueError("Não foi possível obter legendas (todos os tiers falharam ou estão desactivados).")


def _download_audio(video_id: str) -> str:
    import yt_dlp
    tmp = tempfile.mktemp(suffix=".mp3")
    opts = {
        "format": "bestaudio/best",
        "outtmpl": tmp.replace(".mp3", ""),
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "64"}],
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
    return tmp


def _cleanup(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
