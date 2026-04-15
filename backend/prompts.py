"""LLM prompt templates — single source of truth for all prompts."""


def article_summary_prompt(title: str, content: str) -> str:
    return (
        f"Título: {title}\n\nConteúdo:\n{content}\n\n"
        "Escreve um resumo claro e objetivo em português com 2 a 3 frases. "
        "Vai direto aos factos, sem introduções como 'Este artigo fala de'."
    )


def article_chinese_prompt(title: str, content: str) -> str:
    return (
        f"Título: {title}\n\nConteúdo:\n{content}\n\n"
        "请将以上葡萄牙语新闻翻译成中文，并判断是否与在葡华人相关。要求：\n"
        "1. 翻译标题为中文\n"
        "2. 判断此新闻是否与以下华人关注话题相关。如果相关，列出所有匹配的标签（可多选），"
        "用逗号分隔；如果都不相关，写\"无\"\n"
        "   可选标签：移民签证, 房产租房, 法律法规, 工作就业, 教育留学, 税务财务, "
        "华人社区, 安全治安, 医疗社保, 中葡关系\n"
        "3. 将正文内容翻译成中文，不是逐字翻译，而是精炼版本：去除重复和冗余内容，保留所有关键信息，"
        "用自然流畅的中文新闻风格书写\n\n"
        "严格使用以下格式输出：\n"
        "TITLE_ZH: <中文标题>\n"
        "TAGS_ZH: <匹配标签，逗号分隔，或 无>\n"
        "CONTENT_ZH: <中文精炼内容>"
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
