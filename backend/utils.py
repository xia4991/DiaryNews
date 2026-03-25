import re


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()
