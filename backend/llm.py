"""MiniMax API wrapper.

Exposes `call_minimax()` which makes a chat completion request and either returns
the model's content or raises a structured `MiniMaxError`. Callers decide what to
do with each failure mode — config errors should usually stop a batch, while
rate-limit/timeout/HTTP-5xx have already been retried internally.
"""

import logging
import os
import re
import time

import requests

from backend.config import (
    MINIMAX_API_URL,
    MINIMAX_MAX_RETRIES,
    MINIMAX_MODEL,
    MINIMAX_TIMEOUT_SEC,
)

log = logging.getLogger("diarynews.llm")

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)
_BACKOFF_SECONDS = (1, 3, 10)


# ── Exception hierarchy ──────────────────────────────────────────────────────


class MiniMaxError(Exception):
    """Base class for all MiniMax failures."""


class MiniMaxConfigError(MiniMaxError):
    """MINIMAX_API_KEY missing or invalid configuration. Not retryable."""


class MiniMaxRateLimitError(MiniMaxError):
    """HTTP 429. Retryable, but already retried internally before reaching caller."""


class MiniMaxHTTPError(MiniMaxError):
    """Non-2xx HTTP response other than 429. 5xx is retried, 4xx is not."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


class MiniMaxTimeoutError(MiniMaxError):
    """Network timeout / read timeout. Retryable, already retried internally."""


class MiniMaxResponseError(MiniMaxError):
    """Response shape invalid (missing fields, bad JSON) or content is empty."""


# ── Public API ───────────────────────────────────────────────────────────────


def call_minimax(
    prompt: str,
    *,
    max_tokens: int,
    model: str = MINIMAX_MODEL,
    timeout: int = MINIMAX_TIMEOUT_SEC,
    max_retries: int = MINIMAX_MAX_RETRIES,
    prompt_version: str = "",
) -> str:
    """Call MiniMax. Returns the stripped content string on success.

    Raises:
        MiniMaxConfigError  — MINIMAX_API_KEY not set
        MiniMaxRateLimitError — HTTP 429 after retries exhausted
        MiniMaxHTTPError    — other non-2xx after retries (for 5xx) or immediately (for 4xx)
        MiniMaxTimeoutError — request timed out after retries exhausted
        MiniMaxResponseError — JSON decode failed, missing fields, or empty content

    Callers are responsible for pacing batch calls (rate-limit sleep is no longer
    performed inside this function).
    """
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        raise MiniMaxConfigError("MINIMAX_API_KEY is not set")

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_error: MiniMaxError = MiniMaxHTTPError("no attempt completed")
    for attempt in range(max_retries + 1):
        try:
            resp = requests.post(
                MINIMAX_API_URL,
                headers=headers,
                json=payload,
                timeout=timeout,
            )
        except requests.Timeout as exc:
            last_error = MiniMaxTimeoutError(f"timeout after {timeout}s: {exc}")
            log.warning(
                "MiniMax timeout (model=%s prompt_version=%s attempt=%d/%d)",
                model, prompt_version or "-", attempt + 1, max_retries + 1,
            )
            if _should_retry(attempt, max_retries):
                time.sleep(_backoff(attempt))
                continue
            raise last_error
        except requests.RequestException as exc:
            # Connection error, DNS, etc. Treat as transient HTTP error.
            last_error = MiniMaxHTTPError(f"network: {type(exc).__name__}: {exc}")
            log.warning(
                "MiniMax network error (model=%s prompt_version=%s): %s",
                model, prompt_version or "-", exc,
            )
            if _should_retry(attempt, max_retries):
                time.sleep(_backoff(attempt))
                continue
            raise last_error

        status = resp.status_code
        if status == 200:
            try:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
            except (ValueError, KeyError, IndexError, TypeError) as exc:
                raise MiniMaxResponseError(
                    f"bad response shape ({type(exc).__name__}): {str(exc)[:200]}"
                )
            cleaned = _THINK_RE.sub("", content or "").strip()
            if not cleaned:
                raise MiniMaxResponseError("model returned empty content")
            return cleaned

        body_preview = resp.text[:300] if resp.text else ""
        if status == 429:
            last_error = MiniMaxRateLimitError(f"HTTP 429: {body_preview}")
            log.warning(
                "MiniMax rate-limited 429 (model=%s prompt_version=%s attempt=%d/%d) body=%s",
                model, prompt_version or "-", attempt + 1, max_retries + 1, body_preview,
            )
            if _should_retry(attempt, max_retries):
                time.sleep(_backoff(attempt))
                continue
            raise last_error
        if 500 <= status < 600:
            last_error = MiniMaxHTTPError(f"HTTP {status}: {body_preview}", status_code=status)
            log.warning(
                "MiniMax HTTP %d (model=%s prompt_version=%s attempt=%d/%d) body=%s",
                status, model, prompt_version or "-", attempt + 1, max_retries + 1, body_preview,
            )
            if _should_retry(attempt, max_retries):
                time.sleep(_backoff(attempt))
                continue
            raise last_error
        # 4xx other than 429 — don't retry. Likely auth or bad payload.
        log.warning(
            "MiniMax HTTP %d non-retryable (model=%s) body=%s",
            status, model, body_preview,
        )
        raise MiniMaxHTTPError(f"HTTP {status}: {body_preview}", status_code=status)

    # Should not reach here, but be defensive.
    raise last_error


# ── Internals ────────────────────────────────────────────────────────────────


def _should_retry(attempt: int, max_retries: int) -> bool:
    return attempt < max_retries


def _backoff(attempt: int) -> float:
    return _BACKOFF_SECONDS[min(attempt, len(_BACKOFF_SECONDS) - 1)]
