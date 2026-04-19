import re
from typing import Dict, List

from backend.chat.config import CHUNK_OVERLAP, CHUNK_SIZE

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
IGNORED_SECTIONS = {"Related Topics", "Source Notes"}


def extract_title(markdown_text: str, fallback_title: str) -> str:
    for line in markdown_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return fallback_title


def split_markdown_sections(markdown_text: str, fallback_title: str) -> List[Dict[str, str]]:
    title = extract_title(markdown_text, fallback_title)
    sections: List[Dict[str, str]] = []
    current_heading = "Introduction"
    current_lines: List[str] = []

    for raw_line in markdown_text.splitlines():
        line = raw_line.rstrip()
        match = HEADING_RE.match(line.strip())
        if match:
            if current_lines:
                content = "\n".join(current_lines).strip()
                if content:
                    sections.append(
                        {
                            "title": title,
                            "section": current_heading,
                            "content": content,
                        }
                    )
                current_lines = []
            current_heading = match.group(2).strip()
            continue
        current_lines.append(line)

    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            sections.append(
                {
                    "title": title,
                    "section": current_heading,
                    "content": content,
                }
            )

    if not sections:
        return [{"title": title, "section": "Body", "content": markdown_text.strip()}]
    return sections


def split_text_with_overlap(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        window = text[start:end]
        if end < len(text):
            split_at = max(window.rfind("\n\n"), window.rfind("。"), window.rfind(". "), window.rfind("\n"))
            if split_at > chunk_size // 3:
                end = start + split_at + 1
                window = text[start:end]
        chunks.append(window.strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def chunk_markdown(markdown_text: str, fallback_title: str) -> List[Dict[str, str]]:
    chunks: List[Dict[str, str]] = []
    for section in split_markdown_sections(markdown_text, fallback_title):
        section_name = section["section"]
        title = section["title"]
        if section_name in IGNORED_SECTIONS:
            continue
        for content_part in split_text_with_overlap(section["content"]):
            chunks.append(
                {
                    "title": title,
                    "section": section_name,
                    "content": content_part,
                }
            )
    return chunks
