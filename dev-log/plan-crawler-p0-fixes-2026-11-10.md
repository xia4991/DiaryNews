# 新闻抓取 P0 修复 — 2026-11-10

来源：对 crawler / enrich / dedup 链路的代码审查。三项都是确定的逻辑缺陷。

> 提交说明：分支 `fix/crawler-p0` 只含第 2、3 项。第 1 项改在尚未提交的 `backend/dedup.py`（Track B）里，随 Track B 一起提交。

## 1. 跨源分组 SimHash 层不可达（`backend/dedup.py`）

`_confirm_pair` 里 `if ha and hb: return ha == hb` —— 两篇都有正文就都有 `content_hash`，
不同媒体 hash 几乎不可能相等，于是直接返回 False，SimHash 比对永远走不到。

**修法**：hash 相等 → 直接确认；不相等 → 继续走 SimHash；两边都算不出 SimHash 才退化为严格标题匹配。

## 2. 每轮上限按源优先级截断（`backend/crawler/runner.py`）

`deduplicate()` 按 `SOURCE_PRIORITY` 排序后，runner 直接 `new_dicts[:max_articles]`，
新文章多时被丢弃的总是低优先级源（SAPO24 / SIC / ECO），而不是最旧的文章。

**修法**：截断前按 `published` 倒序排序，丢的是最旧的文章。

## 3. 正文抓取失败后永不重抓（`backend/news.py` + `services.py` + storage）

`ensure_scraped_content` 抓不全时用 RSS 摘要喂 LLM 并存空 `scraped_content`，
LLM 成功即 `done`，之后再也不会重抓 → 部分 `content_zh` 只有摘要长度，且不可观测。

**修法**：
- 新增列 `scrape_status`（`'' | ok | truncated`）、`scrape_attempts`（int）。
- `ensure_scraped_content` 额外返回 `scrape_ok`。
- `enrich_pending_news`（单篇主路径）：抓取不完整且 `scrape_attempts < SCRAPE_MAX_ATTEMPTS`
  （env，默认 2）时**不调 LLM**，只记 `scrape_attempts+1`、`scrape_status='truncated'`，
  保持 pending，下一轮（15 分钟后）重抓；达到上限才用摘要兜底并记 `truncated`。
  省掉一次"摘要级"LLM 调用，换来最多一轮的延迟。
- 批量路径（手动管理员按钮）不延后，只记录 `scrape_status`。
- 已存在的历史 `done` 行不回填（需要的话另起脚本）。
- `list_recent_articles` 带出 `scrape_status / scrape_attempts` 供后台排查。

## 验证

一次性验证脚本（会话 scratchpad，临时 DB，不入库）：分组用两篇正文相近但不完全相同的样本；
runner 截断用构造数据；抓取延后用 monkeypatch 的 `scrape_article` + `enrich_news_article`。
