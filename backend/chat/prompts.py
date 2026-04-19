from typing import Dict, List


def build_context_block(retrieved_chunks: List[Dict]) -> str:
    blocks = []
    for index, chunk in enumerate(retrieved_chunks, start=1):
        metadata = chunk.get("metadata", {})
        blocks.append(
            "\n".join(
                [
                    "[Source {0}]".format(index),
                    "Title: {0}".format(metadata.get("title", "")),
                    "Section: {0}".format(metadata.get("section", "")),
                    "Path: {0}".format(metadata.get("path_or_ref", "")),
                    "Content:",
                    chunk.get("document", ""),
                ]
            )
        )
    return "\n\n".join(blocks)


def build_history_block(messages: List[Dict]) -> str:
    lines = []
    for message in messages:
        role = "User" if message.get("role") == "user" else "Assistant"
        lines.append("{0}: {1}".format(role, message.get("content", "")))
    return "\n".join(lines)


def assistant_system_prompt() -> str:
    return (
        "你是葡萄牙华人信息中心的 AI 助手。"
        "你只能根据提供的 markdown wiki 内容回答。"
        "如果资料不足，请明确说明 wiki 目前没有足够支持。"
        "不要把回答写成确定性的法律意见。"
        "回答语言使用中文，语气清晰、克制、实用。"
        "如果使用了资料，请在结尾用简短格式列出来源标题。"
    )


def build_answer_prompt(user_message: str, history: List[Dict], retrieved_chunks: List[Dict]) -> str:
    return "\n\n".join(
        [
            assistant_system_prompt(),
            "## Conversation History",
            build_history_block(history) or "(empty)",
            "## Retrieved Wiki Context",
            build_context_block(retrieved_chunks) or "(no context)",
            "## User Question",
            user_message,
            "## Answer Requirements",
            (
                "1. 先直接回答用户问题。\n"
                "2. 再给出简短解释。\n"
                "3. 如果资料不完整，要明确指出不确定部分。\n"
                "4. 结尾列出“来源：标题1；标题2”。"
            ),
        ]
    )


def build_insufficient_context_answer(user_message: str) -> str:
    return (
        "目前 wiki 里还没有足够内容可以可靠回答这个问题。"
        "你可以先补充相关 markdown 页面，再来提问。\n\n"
        "我能确认的是：这个问题和葡萄牙生活信息有关，但当前知识库支持不足。"
    )
