import json
import os

from config import DATA_PATH, YOUTUBE_DATA_PATH


def load_news() -> dict:
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(DATA_PATH):
        return {"last_updated": None, "articles": []}
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, KeyError):
        return {"last_updated": None, "articles": []}


def save_news(data: dict) -> None:
    os.makedirs("data", exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_youtube() -> dict:
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(YOUTUBE_DATA_PATH):
        return {"channels": [], "videos": [], "last_updated": None}
    try:
        with open(YOUTUBE_DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, KeyError):
        return {"channels": [], "videos": [], "last_updated": None}


def save_youtube(data: dict) -> None:
    os.makedirs("data", exist_ok=True)
    with open(YOUTUBE_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
