import math
import re
from collections import Counter
from typing import Dict, List, Optional

from backend.chat.config import CHROMA_PATH, RAG_TOP_K
from backend.chat.database import get_db

try:
    import chromadb
except Exception:  # pragma: no cover - optional dependency fallback
    chromadb = None


TOKEN_RE = re.compile(r"[\u4e00-\u9fff]+|[A-Za-z0-9_]+")


def _tokenize(text: str) -> List[str]:
    tokens: List[str] = []
    for token in TOKEN_RE.findall(text):
        if re.fullmatch(r"[\u4e00-\u9fff]+", token):
            tokens.extend(list(token))
            if len(token) > 1:
                tokens.extend(token[index : index + 2] for index in range(len(token) - 1))
        else:
            tokens.append(token.lower())
    return tokens


class LocalKeywordVectorStore:
    def upsert(self, items: List[Dict]) -> None:
        return None

    def delete(self, ids: Optional[List[str]] = None) -> None:
        return None

    def query(self, query_text: str, topic: Optional[str] = None, top_k: int = RAG_TOP_K) -> List[Dict]:
        query_tokens = Counter(_tokenize(query_text))
        if not query_tokens:
            return []

        results: List[Dict] = []
        query = """
            SELECT
                c.id,
                c.content,
                c.section,
                s.id AS source_id,
                s.title,
                s.topic,
                s.path_or_ref
            FROM kb_chunks c
            JOIN kb_sources s ON s.id = c.source_id
            WHERE s.status = 'ready'
        """
        params: List[object] = []
        if topic:
            query += " AND s.topic = ?"
            params.append(topic)
        with get_db() as conn:
            rows = conn.execute(query, params).fetchall()

        query_norm = math.sqrt(sum(value * value for value in query_tokens.values()))
        for row in rows:
            document = row["content"]
            search_text = "{0} {1} {2}".format(row["title"] or "", row["section"] or "", document)
            doc_tokens = Counter(_tokenize(search_text))
            numerator = sum(query_tokens[token] * doc_tokens.get(token, 0) for token in query_tokens)
            if numerator <= 0:
                continue
            doc_norm = math.sqrt(sum(value * value for value in doc_tokens.values()))
            score = numerator / max(query_norm * doc_norm, 1.0)
            metadata = {
                "source_id": row["source_id"],
                "title": row["title"],
                "section": row["section"],
                "topic": row["topic"],
                "path_or_ref": row["path_or_ref"],
            }
            results.append({"id": row["id"], "score": score, "document": document, "metadata": metadata})
        results.sort(key=lambda row: row["score"], reverse=True)
        return results[:top_k]


class ChromaVectorStore:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(path=CHROMA_PATH)
        self.collection = self.client.get_or_create_collection(name="wiki_chunks")

    def upsert(self, items: List[Dict]) -> None:
        if not items:
            return
        self.collection.upsert(
            ids=[item["id"] for item in items],
            documents=[item["document"] for item in items],
            metadatas=[item.get("metadata", {}) for item in items],
        )

    def delete(self, ids: Optional[List[str]] = None) -> None:
        if ids is None:
            try:
                self.client.delete_collection("wiki_chunks")
            except Exception:
                pass
            self.collection = self.client.get_or_create_collection(name="wiki_chunks")
            return
        if ids:
            self.collection.delete(ids=ids)

    def query(self, query_text: str, topic: Optional[str] = None, top_k: int = RAG_TOP_K) -> List[Dict]:
        where = {"topic": topic} if topic else None
        result = self.collection.query(query_texts=[query_text], n_results=top_k, where=where)
        ids = result.get("ids", [[]])[0]
        docs = result.get("documents", [[]])[0]
        metas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]
        rows: List[Dict] = []
        for item_id, doc, meta, distance in zip(ids, docs, metas, distances):
            rows.append(
                {
                    "id": item_id,
                    "document": doc,
                    "metadata": meta or {},
                    "score": 1 - distance if distance is not None else 0.0,
                }
            )
        return rows


def get_vectorstore():
    if chromadb is not None:
        return ChromaVectorStore()
    return LocalKeywordVectorStore()
