"""LLM prompt templates — single source of truth for all prompts.

Prompt version identifiers are persisted to `articles.enrichment_prompt_version`
so re-enrichment can be triggered by future contract changes without overwriting
rows produced by an earlier prompt.
"""

ARTICLE_ENRICHMENT_PROMPT_VERSION = "article_enrichment_v2"
BATCH_ARTICLE_ENRICHMENT_PROMPT_VERSION = "article_batch_enrichment_v2"


def article_chinese_prompt(title: str, content: str) -> str:
    """Article enrichment v2 — strict JSON output contract.

    See `_parse_chinese_response_json` in backend/llm/article_enrichment.py for
    the parser. The legacy line-prefix format is kept as a fallback parser to
    avoid clobbering rows during rollout if a single response falls back to the
    old format.
    """
    return (
        f"Título: {title}\n\nConteúdo:\n{content}\n\n"
        "请将以上葡萄牙语新闻翻译成中文，并判断是否与在葡华人相关。\n\n"
        "严格输出一个 JSON 对象（不要任何 Markdown 代码围栏或解释文字）：\n"
        "{\n"
        '  "title_zh": "中文标题",\n'
        '  "summary_zh": "2-3 句中文摘要，用于卡片预览，必须简洁",\n'
        '  "content_zh": "更完整但精炼的中文正文，保留所有关键事实、人名、地名",\n'
        '  "tags_zh": ["标签1", "标签2"],\n'
        '  "category": "分类名",\n'
        '  "relevance_reason": "为什么与在葡华人有关；如不相关则为空字符串"\n'
        "}\n\n"
        "约束：\n"
        "- summary_zh 必须简短，用于卡片，不超过 120 字；content_zh 可较长。\n"
        "- tags_zh 仅可使用以下标签（若与在葡华人无关，必须为 []）：\n"
        "  移民签证, 房产租房, 法律法规, 工作就业, 教育留学, 税务财务, 华人社区, 安全治安, 医疗社保, 中葡关系\n"
        "- category 仅可使用以下之一：\n"
        "  Política, Desporto, Economia, Saúde, Tecnologia, Internacional, Cultura, Ambiente, Crime/Justiça, Sociedade, Geral\n"
        "- 不要编造原文未出现的事实；人名地名保留原文写法。\n"
        "- 输出必须是合法 JSON，使用双引号，无尾随逗号，无注释。"
    )


def batch_article_chinese_prompt(articles: list[dict]) -> str:
    """Batch article enrichment — compact fixed-order JSON array output."""
    import json

    payload = [
        {
            "title": str(article.get("title", "")),
            "summary": str(article.get("summary", "")),
            "content": str(article.get("scraped_content", "") or article.get("content", "")),
        }
        for article in articles
    ]
    return (
        "请将以下葡萄牙语新闻批量翻译成中文，并判断是否与在葡华人相关。\n\n"
        "输入是 JSON 数组，每个对象包含：\n"
        "- title: 原文标题\n"
        "- summary: RSS 摘要\n"
        "- content: 已抓取正文；可能为空\n\n"
        f"新闻列表:\n{json.dumps(payload, ensure_ascii=False)}\n\n"
        "严格输出一个 JSON 数组，不要任何 Markdown 代码围栏或解释文字。\n"
        "每条新闻输出一个数组，固定顺序如下：\n"
        "[title_zh, summary_zh, content_zh, tags_zh, category]\n\n"
        "示例：\n"
        "[\n"
        '  ["中文标题", "中文摘要", "中文正文", ["标签1"], "Sociedade"]\n'
        "]\n\n"
        "约束：\n"
        "- 输出数组的条数和顺序必须与输入新闻列表完全一致，第 1 行对应第 1 条输入新闻。\n"
        "- summary_zh 必须简短，用于卡片，不超过 120 字。\n"
        "- content_zh 是更完整但精炼的中文正文，基于 title、summary 和 content；不要编造原文未出现的事实。\n"
        "- tags_zh 必须是数组，且仅可使用以下标签；若与在葡华人无关，必须为 []：\n"
        "  移民签证, 房产租房, 法律法规, 工作就业, 教育留学, 税务财务, 华人社区, 安全治安, 医疗社保, 中葡关系\n"
        "- category 仅可使用以下之一：\n"
        "  Política, Desporto, Economia, Saúde, Tecnologia, Internacional, Cultura, Ambiente, Crime/Justiça, Sociedade, Geral\n"
        "- 输出必须是合法 JSON，使用双引号，无尾随逗号，无注释。"
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


def daily_news_brief_prompt(brief_date: str, brief_type: str, article_digest: str) -> str:
    audience = "在葡华人更相关的新闻" if brief_type == "china" else "葡萄牙新闻"
    return (
        f"日期: {brief_date}\n"
        f"简报类型: {brief_type}\n"
        f"内容范围: {audience}\n\n"
        f"候选新闻:\n{article_digest}\n\n"
        "请根据以上内容，生成一份中文“每日回顾”。要求：\n"
        "1. 可以逐条复述新闻，但要保持清晰、紧凑，适合回顾某一天的新闻\n"
        "2. 输出一个适合作为卡片标题的中文标题\n"
        "3. 输出一段 2 到 4 句的中文总结\n"
        "4. 输出 bullet 列表，每条对应一条值得回看的新闻，可多于 5 条\n"
        "5. 标题和总结里不要使用“昨天”“今天”“明天”这类相对时间词，尽量用中性措辞\n"
        "6. 如果新闻不足以支持完整回顾，就尽量保守总结，不要编造\n\n"
        "严格使用以下格式输出：\n"
        "TITLE: <中文标题>\n"
        "SUMMARY: <中文总结>\n"
        "BULLETS:\n"
        "- 要点1\n"
        "- 要点2\n"
        "- 要点3"
    )
