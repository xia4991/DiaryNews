"""Provider-neutral LLM entry point.

`LLM_PROVIDER` (env) picks the backend: `minimax` (default) or `openrouter`.
Both raise the shared `MiniMax*Error` hierarchy, so callers handle failures the
same way whichever provider is active.
"""

from backend.config import LLM_PROVIDER, MINIMAX_MODEL, OPENROUTER_MODELS
from backend.llm.minimax import call_minimax
from backend.llm.openrouter import call_openrouter


def is_openrouter() -> bool:
    return LLM_PROVIDER == "openrouter"


def active_model() -> str:
    """Configured primary model name, for logs and diagnostics."""
    if is_openrouter():
        return OPENROUTER_MODELS[0] if OPENROUTER_MODELS else ""
    return MINIMAX_MODEL


def call_llm(prompt: str, *, max_tokens: int, prompt_version: str = "") -> tuple[str, str]:
    """Run one completion. Returns (content, model_used)."""
    if is_openrouter():
        return call_openrouter(prompt, max_tokens=max_tokens, prompt_version=prompt_version)
    content = call_minimax(prompt, max_tokens=max_tokens, prompt_version=prompt_version)
    return content, MINIMAX_MODEL
