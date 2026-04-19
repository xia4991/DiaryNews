from typing import Dict, List

from backend.chat.config import MAX_HISTORY, RAG_TOP_K
from backend.chat.llm import call_minimax
from backend.chat.prompts import (
    build_answer_prompt,
    build_insufficient_context_answer,
)
from backend.chat.query_router import route_query
from backend.chat.storage import add_message, list_messages
from backend.chat.vectorstore import get_vectorstore


def _build_citations(retrieved_chunks: List[Dict]) -> List[Dict]:
    citations: List[Dict] = []
    seen = set()
    for chunk in retrieved_chunks:
        metadata = chunk.get("metadata", {})
        key = (metadata.get("source_id"), metadata.get("section"))
        if key in seen:
            continue
        seen.add(key)
        citations.append(
            {
                "source_id": metadata.get("source_id"),
                "title": metadata.get("title"),
                "section": metadata.get("section"),
                "path_or_ref": metadata.get("path_or_ref"),
                "snippet": chunk.get("document", "")[:200],
            }
        )
    return citations


def _build_local_grounded_answer(retrieved_chunks: List[Dict], citations: List[Dict]) -> str:
    top_chunks = retrieved_chunks[:2]
    lines = ["根据当前 wiki 内容，可以先参考这些要点：", ""]
    for chunk in top_chunks:
        metadata = chunk.get("metadata", {})
        title = metadata.get("title") or "未命名页面"
        section = metadata.get("section") or "内容"
        content = chunk.get("document", "").strip().replace("\n", " ")
        lines.append("【{0} / {1}】{2}".format(title, section, content))
    if citations:
        lines.extend(["", "来源：" + "；".join(citation["title"] for citation in citations[:3] if citation.get("title"))])
    lines.extend(["", "提示：这是一版基于当前 markdown wiki 的本地整理，不应替代正式法律或移民意见。"])
    return "\n".join(lines)


def answer_question(conversation_id: str, user_message: str) -> Dict:
    user_row = add_message(conversation_id, "user", user_message, sources=[])
    history = list_messages(conversation_id, limit=MAX_HISTORY)
    topic = route_query(user_message)
    vectorstore = get_vectorstore()
    retrieved_chunks = vectorstore.query(
        user_message,
        topic=None if topic == "general" else topic,
        top_k=RAG_TOP_K,
    )
    citations = _build_citations(retrieved_chunks)

    if not retrieved_chunks:
        answer = build_insufficient_context_answer(user_message)
        assistant_row = add_message(conversation_id, "assistant", answer, sources=[])
        return {
            "topic": topic,
            "user_message": user_row,
            "assistant_message": assistant_row,
            "citations": [],
            "used_wiki": False,
        }

    prompt = build_answer_prompt(user_message, history[:-1], retrieved_chunks)
    fallback = _build_local_grounded_answer(retrieved_chunks, citations)
    answer = call_minimax(
        messages=[
            {"role": "system", "content": "You answer only from provided wiki context."},
            {"role": "user", "content": prompt},
        ],
        fallback=fallback,
    )
    assistant_row = add_message(conversation_id, "assistant", answer, sources=citations)
    return {
        "topic": topic,
        "user_message": user_row,
        "assistant_message": assistant_row,
        "citations": citations,
        "used_wiki": True,
    }
