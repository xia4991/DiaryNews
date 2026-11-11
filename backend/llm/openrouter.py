"""OpenRouter API wrapper (OpenAI-compatible chat completions).

Used for OpenRouter's free models. Failures are raised as the same `MiniMax*Error`
types the MiniMax wrapper uses, so callers (services, briefs) keep one error policy
regardless of provider.
"""

import logging
import os
import re
import time

import requests

from backend.config import (
    OPENROUTER_API_URL,
    OPENROUTER_MAX_RETRIES,
    OPENROUTER_MODELS,
    OPENROUTER_TIMEOUT_SEC,
    SITE_URL,
)
from backend.llm.minimax import (
    MiniMaxConfigError,
    MiniMaxError,
    MiniMaxHTTPError,
    MiniMaxRateLimitError,
    MiniMaxResponseError,
    MiniMaxTimeoutError,
)

log = logging.getLogger("diarynews.llm.openrouter")

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)
_BACKOFF_SECONDS = (2, 5, 15)


def call_openrouter(
    prompt: str,
    *,
    max_tokens: int,
    models: list[str] = None,
    timeout: int = OPENROUTER_TIMEOUT_SEC,
    max_retries: int = OPENROUTER_MAX_RETRIES,
    prompt_version: str = "",
) -> tuple[str, str]:
    """Call OpenRouter. Returns (content, model_actually_used).

    With more than one model, OpenRouter's `models` parameter falls back to the next
    model when the first is rate-limited or down upstream.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise MiniMaxConfigError("OPENROUTER_API_KEY is not set")
    models = models or OPENROUTER_MODELS
    if not models:
        raise MiniMaxConfigError("OPENROUTER_MODELS is empty")

    payload = {
        "model": models[0],
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if len(models) > 1:
        payload["models"] = models
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": SITE_URL or "https://huarenpt.com",
        "X-Title": "DiaryNews",
    }

    last_error: MiniMaxError = MiniMaxHTTPError("no attempt completed")
    for attempt in range(max_retries + 1):
        try:
            resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=timeout)
        except requests.Timeout as exc:
            last_error = MiniMaxTimeoutError(f"timeout after {timeout}s: {exc}")
        except requests.RequestException as exc:
            last_error = MiniMaxHTTPError(f"network: {type(exc).__name__}: {exc}")
        else:
            status = resp.status_code
            body_preview = resp.text[:300] if resp.text else ""
            if status == 200:
                return _parse_success(resp, models[0])
            if status == 429:
                last_error = MiniMaxRateLimitError(f"HTTP 429: {body_preview}")
            elif 500 <= status < 600:
                last_error = MiniMaxHTTPError(f"HTTP {status}: {body_preview}", status_code=status)
            else:
                log.warning("OpenRouter HTTP %d non-retryable body=%s", status, body_preview)
                raise MiniMaxHTTPError(f"HTTP {status}: {body_preview}", status_code=status)

        log.warning(
            "OpenRouter %s (models=%s prompt_version=%s attempt=%d/%d)",
            last_error, ",".join(models), prompt_version or "-", attempt + 1, max_retries + 1,
        )
        if attempt < max_retries:
            time.sleep(_BACKOFF_SECONDS[min(attempt, len(_BACKOFF_SECONDS) - 1)])
    raise last_error


def _parse_success(resp: requests.Response, default_model: str) -> tuple[str, str]:
    try:
        data = resp.json()
    except ValueError as exc:
        raise MiniMaxResponseError(f"bad JSON body: {str(exc)[:200]}")
    # OpenRouter can return 200 with an error object (e.g. upstream provider failure).
    if isinstance(data, dict) and data.get("error"):
        err = data["error"]
        code = err.get("code") if isinstance(err, dict) else None
        message = str(err)[:300]
        if code == 429:
            raise MiniMaxRateLimitError(f"HTTP 429: {message}")
        raise MiniMaxHTTPError(f"upstream error: {message}", status_code=code if isinstance(code, int) else 0)
    try:
        content = data["choices"][0]["message"].get("content") or ""
    except (KeyError, IndexError, TypeError, AttributeError) as exc:
        raise MiniMaxResponseError(f"bad response shape ({type(exc).__name__}): {str(exc)[:200]}")
    cleaned = _THINK_RE.sub("", content).strip()
    if not cleaned:
        raise MiniMaxResponseError("model returned empty content")
    return cleaned, data.get("model") or default_model
