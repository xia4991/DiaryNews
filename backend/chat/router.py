from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.chat.ingestion.wiki import ingest_wiki
from backend.chat.rag import answer_question
from backend.chat.storage import (
    create_conversation,
    delete_conversation,
    get_conversation,
    list_conversations,
    list_messages,
)

router = APIRouter()


class ConversationCreatePayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    topic_hint: Optional[str] = None


class MessageCreatePayload(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ConversationDetail(BaseModel):
    conversation: dict
    messages: List[dict]


@router.get("/health")
def chat_health() -> dict:
    return {"ok": True, "module": "chat"}


@router.post("/admin/reindex-wiki")
def reindex_wiki() -> dict:
    return ingest_wiki()


@router.post("/conversations")
def create_chat_conversation(payload: ConversationCreatePayload) -> dict:
    return create_conversation(payload.title, topic_hint=payload.topic_hint)


@router.get("/conversations")
def list_chat_conversations() -> List[dict]:
    return list_conversations()


@router.get("/conversations/{conversation_id}")
def get_chat_conversation(conversation_id: str) -> ConversationDetail:
    try:
        conversation = get_conversation(conversation_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationDetail(conversation=conversation, messages=list_messages(conversation_id))


@router.delete("/conversations/{conversation_id}")
def delete_chat_conversation(conversation_id: str) -> dict:
    delete_conversation(conversation_id)
    return {"ok": True}


@router.post("/conversations/{conversation_id}/messages")
def create_chat_message(conversation_id: str, payload: MessageCreatePayload) -> dict:
    try:
        get_conversation(conversation_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return answer_question(conversation_id, payload.content)
