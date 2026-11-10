"""Cross-source same-story grouping (Track B).

Pipeline per recent window:
  1. title pre-filter — rapidfuzz token_set_ratio over normalized titles (same day)
  2. body confirmation — exact content_hash match, else trafilatura SimHash similarity;
     degrade to a stricter title match when a body is missing/too short
  3. union-find over confirmed pairs -> connected components
  4. assign a stable story_group_id; representative = earliest published

Duplicates are GROUPED, never deleted, so the feed can collapse a group to one
representative card plus an "N sources" badge. Thresholds are conservative — prefer
leaving two stories ungrouped over a wrong merge.
"""

import hashlib
import logging

from rapidfuzz import fuzz

from backend.crawler.parsing import normalize_title

log = logging.getLogger("diarynews.dedup")

# token_set_ratio over normalized titles: only proposes CANDIDATES, never decides alone.
TITLE_CANDIDATE_THRESHOLD = 85
# trafilatura SimHash similarity to confirm two bodies are the same story.
BODY_SIMILARITY_THRESHOLD = 0.80
# When a body is missing/too short to SimHash, fall back to a stricter title gate.
TITLE_ONLY_CONFIRM_THRESHOLD = 92
# SimHash needs enough tokens to be stable.
_SIMHASH_MIN_WORDS = 40


def _simhash(text: str):
    """Return a trafilatura Simhash for a sufficiently long body, else None."""
    if not text or len(text.split()) < _SIMHASH_MIN_WORDS:
        return None
    try:
        from trafilatura.deduplication import Simhash
        return Simhash(text)
    except Exception as exc:  # noqa: BLE001 — never fatal
        log.debug("Simhash failed: %s", exc)
        return None


def _confirm_pair(a: dict, b: dict) -> bool:
    """Confirm a title-candidate pair is the same story, using the body when available."""
    # Layer 0 — exact normalized-body hash. Only a MATCH is decisive: different outlets
    # almost never share a byte-identical body, so a mismatch must fall through to the
    # SimHash layer instead of rejecting the pair outright.
    ha, hb = a.get("content_hash") or "", b.get("content_hash") or ""
    if ha and hb and ha == hb:
        return True
    # Layer 2 — body SimHash similarity.
    sa, sb = a.get("_simhash"), b.get("_simhash")
    if sa is not None and sb is not None:
        return sa.similarity(sb) >= BODY_SIMILARITY_THRESHOLD
    # Degrade — no usable body on one/both: require a stricter title match.
    return fuzz.token_set_ratio(a["_norm"], b["_norm"]) >= TITLE_ONLY_CONFIRM_THRESHOLD


def _mint_group_id(link: str) -> str:
    return "sg_" + hashlib.sha256(link.encode("utf-8")).hexdigest()[:12]


def group_articles(articles: list[dict]) -> list[dict]:
    """Group same-story articles and return per-link assignments.

    Each assignment is {link, story_group_id, story_group_size, is_group_primary}.
    Only multi-article groups are returned (singletons get no group).
    """
    if not articles:
        return []

    # Annotate with normalized title + SimHash (temporary keys, removed before return).
    for a in articles:
        a["_norm"] = normalize_title(a.get("title") or "", a.get("source") or "")
        a["_simhash"] = _simhash(a.get("scraped_content") or "")

    # Bucket by publication day to bound pairwise comparisons (matches existing dedup
    # semantics; a 2-day window keeps this cheap).
    buckets: dict[str, list] = {}
    for a in articles:
        buckets.setdefault((a.get("published") or "")[:10], []).append(a)

    parent = {a["link"]: a["link"] for a in articles}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: str, y: str) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for items in buckets.values():
        for i in range(len(items)):
            a = items[i]
            if not a["_norm"]:
                continue
            for j in range(i + 1, len(items)):
                b = items[j]
                if not b["_norm"]:
                    continue
                if fuzz.token_set_ratio(a["_norm"], b["_norm"]) < TITLE_CANDIDATE_THRESHOLD:
                    continue
                if _confirm_pair(a, b):
                    union(a["link"], b["link"])

    components: dict[str, list] = {}
    for a in articles:
        components.setdefault(find(a["link"]), []).append(a)

    assignments: list[dict] = []
    for members in components.values():
        if len(members) < 2:
            continue
        # Representative = earliest published.
        rep = min(members, key=lambda m: (m.get("published") or ""))
        # Reuse an existing group id if any member already has one (stable across runs).
        existing = sorted(m["story_group_id"] for m in members if m.get("story_group_id"))
        gid = existing[0] if existing else _mint_group_id(rep["link"])
        size = len(members)
        for m in members:
            assignments.append({
                "link": m["link"],
                "story_group_id": gid,
                "story_group_size": size,
                "is_group_primary": 1 if m["link"] == rep["link"] else 0,
            })

    for a in articles:
        a.pop("_norm", None)
        a.pop("_simhash", None)

    return assignments
