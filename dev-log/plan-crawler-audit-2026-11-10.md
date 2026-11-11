# 新闻抓取链路全面审查 — 2026-11-10

范围：`backend/crawler/`、`backend/news.py`、`backend/dedup.py`、`backend/services.py`（新闻部分）、
`backend/storage/news.py` / `health.py`、`backend/llm/`、`scripts/`、相关文档。
原则：确定的问题直接修；涉及删除代码、改变行为或动线上数据的，只列出来等确认。

## 直接修（确定）

1. **MiniMax 账户级错误烧光重试次数**（`services.py`）
   线上现状：MiniMax 返回 `HTTP 402 insufficient_balance`，每篇文章照样 +1 次尝试，3 轮后永久 `failed`。
   feed 窗口 3000 篇里 2307 篇 failed、693 篇 pending、0 篇 done。
   修法：401/402/403 视为账户级错误 —— 立即中止本轮、不计入该文章的尝试次数（单篇路径 + 批量路径）。
2. **LLM 失败时丢弃已抓到的正文**（`services.py`）—— 下一轮重复抓取同一页面。修法：LLM 调用失败时先把正文落库。
3. **HTTP 错误码永远显示 `?`**（`crawler/base.py`、`adapters/rtp.py`）
   `exc.response if exc.response` —— 4xx/5xx 的 `Response` 布尔值为 False。改为 `is not None`。
4. **去重用的已存在链接集合**（`services.collect_news`）—— 每次 `SELECT *` 取 3000 行整行（含正文）只为拿 link，
   且漏掉窗口外的旧文章。改为 `SELECT link FROM articles`。
5. `collect_news` 里重复的 `save_raw_articles` 分支；过期注释 / docstring；`config.py` 重复的段标题。
6. 过期文档：`CLAUDE.md`、`.claude/rules/backend.md`（9 个适配器、`/api/news/fetch`、`fetch_and_save_news` 等已不存在）。

## 只列出、等确认

死代码（未注册适配器、未调用函数、一次性脚本、无用配置）、行为变更类（`parse_date` 兜底、`MIN_SUMMARY_WORDS` 默认值、
逐篇落库、公共 feed 瘦身）、线上数据类（把 failed 行重置为 pending、Impresa 站点 403）。详见会话总结。

## 验证

会话 scratchpad 里的一次性脚本 + 临时 DB：monkeypatch LLM 抛 402，确认中止且不加次数、正文已落库；
构造 4xx `HTTPError` 确认状态码可见；`collect_news` 用假适配器确认已存在链接被跳过。
