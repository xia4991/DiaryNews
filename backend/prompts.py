"""LLM prompt templates — single source of truth for all prompts."""


def article_summary_prompt(title: str, content: str) -> str:
    return (
        f"Título: {title}\n\nConteúdo:\n{content}\n\n"
        "Escreve um resumo claro e objetivo em português com 2 a 3 frases. "
        "Vai direto aos factos, sem introduções como 'Este artigo fala de'."
    )


def caption_summary_prompt(title: str, raw_text: str) -> str:
    return (
        f"Título do vídeo: {title}\n\n"
        f"Transcrição (texto bruto, sem pontuação):\n{raw_text}\n\n"
        "请根据以上转录内容，用中文写一份结构化摘要。"
        "严格使用以下格式：\n\n"
        "**主题**\n"
        "一句话描述视频的核心主题。\n\n"
        "**要点**\n"
        "- 要点1\n"
        "- 要点2\n"
        "- 要点3\n"
        "（3到6个要点，每点1-2句话）\n\n"
        "**结论**\n"
        "一句话总结视频的核心观点或收获。\n\n"
        "直接给出内容，不要使用「这个视频讲了」之类的开场白。"
    )
