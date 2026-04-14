import logging
import os
import re
import time

import requests

from backend.config import MINIMAX_API_URL, MINIMAX_MODEL

log = logging.getLogger("diarynews.llm")

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def call_minimax(prompt: str, max_tokens: int, fallback: str = "") -> str:
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        return fallback
    time.sleep(1)
    try:
        resp = requests.post(
            MINIMAX_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": MINIMAX_MODEL, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]},
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return _THINK_RE.sub("", content).strip()
    except Exception as exc:
        log.warning("call_minimax failed: %s", exc)
        return fallback
