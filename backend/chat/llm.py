import logging
import os
import re

import requests

from backend.chat.config import MINIMAX_API_URL, MINIMAX_MODEL

log = logging.getLogger("diarynews.chat.llm")

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def call_minimax(messages: list, max_tokens: int = 900, fallback: str = "") -> str:
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        return fallback
    try:
        response = requests.post(
            MINIMAX_API_URL,
            headers={"Authorization": "Bearer {0}".format(api_key), "Content-Type": "application/json"},
            json={"model": MINIMAX_MODEL, "max_tokens": max_tokens, "messages": messages},
            timeout=60,
        )
        if response.status_code != 200:
            log.warning("chat minimax HTTP %s: %s", response.status_code, response.text[:500])
            response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return _THINK_RE.sub("", content).strip()
    except Exception as exc:
        log.warning("chat minimax failed: %s", exc)
        return fallback
