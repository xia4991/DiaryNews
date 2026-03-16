import json
import logging
import os
import shutil
import tempfile

from config import DATA_PATH, YOUTUBE_DATA_PATH

log = logging.getLogger("diarynews.storage")


def _load(path: str, default: dict) -> dict:
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        log.warning("Corrupt JSON at %s (%s) — returning empty state", path, exc)
        return default


def _save(path: str, data: dict) -> None:
    os.makedirs("data", exist_ok=True)
    dir_ = os.path.dirname(path) or "."
    with tempfile.NamedTemporaryFile("w", dir=dir_, delete=False, suffix=".tmp", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        tmp = f.name
    shutil.move(tmp, path)


def load_news() -> dict:
    return _load(DATA_PATH, {"last_updated": None, "articles": []})


def save_news(data: dict) -> None:
    _save(DATA_PATH, data)


def load_youtube() -> dict:
    return _load(YOUTUBE_DATA_PATH, {"channels": [], "videos": [], "last_updated": None})


def save_youtube(data: dict) -> None:
    _save(YOUTUBE_DATA_PATH, data)
