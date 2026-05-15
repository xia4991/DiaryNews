# Portugal News Crawler Refactor — 2026-05-14

## 背景

当前 9 个葡萄牙 RSS 源全部由 `backend/news.py:138` 的 `_parse_feed()` 一个函数统一处理。两个问题：

1. **源静默失败**：死掉的源和当天没新闻的源看起来一样（都返回 0 条），没有 per-source 健康记录，运维看不到 "Público 已经挂了 4 小时"。
2. **RSS 里已有但没采集的字段**：作者、封面图、原始 RSS 分类、GUID、语言。每个源还有自己的怪癖（RTP 图片在 `media:content`，Público 走 Feedburner，Expresso 摘要截断等），目前一刀切的解析忽略了这些。

目标：**per-source adapter 模式**，每个源一个适配器，统一接口；同时把慢的 LLM 翻译从爬虫主流程解耦出去，让两边能独立失败、独立重试。

## 范围

- **不增加源**，仍是这 9 个（`backend/sources.py:3-13`）：RTP, Observador, SIC Notícias, TVI24, Jornal de Notícias, Público, Diário de Notícias, Expresso, ECO。
- **保持 `/api/news/fetch` 对外行为不变**，前端 `葡萄牙新闻` / `华人关注` 标签零改动。
- **保留** `_enrich_article` / `re_enrich_article`（`backend/news.py:97`、`:118`），但从爬虫主流程拆出去作为 Stage B。

## 实施步骤（顺序执行，每步等用户确认）

### Step 1 — 数据库迁移

`backend/database.py`：
- `_migrate()` 里给 `articles` 加 8 列：`author`, `image_url`, `language`, `guid`, `rss_category`, `fetched_at`, `enrichment_status`, `enrichment_attempts`
- `init_db()` 里加新表 `source_health`（PK=source，记录最后状态/连续失败次数/抓取数等）

### Step 2 — 爬虫骨架 + 第一个适配器

新建 `backend/crawler/` 包：
- `base.py` — `BaseAdapter` ABC + `RawArticle` dataclass + `FetchResult` dataclass，含重试和计时
- `parsing.py` — 从 `news.py` 搬过来的 `classify`, `_deduplicate`, `_parse_date`, `extract_image`
- `runner.py` — `CrawlerRunner` 并行跑所有适配器，写 `source_health`
- `health.py` — `source_health` 表的读写
- `adapters/rtp.py` — RTP 适配器，重写 `extract_image` 读 `media:content`

### Step 3 — 移植其余 8 个适配器

每个一个文件，仅重写本源特有的方法：
- `observador.py`, `sic_noticias.py`, `tvi24.py`（日期）, `jornal_noticias.py`, `publico.py`（Feedburner 日期）, `diario_noticias.py`, `expresso.py`（截断摘要）, `eco.py`

### Step 4 — 改编排 + 新端点

- `backend/services.py:19 fetch_and_save_news()`：拆成 Stage A（跑爬虫，存 pending 文章）+ Stage B（跑 LLM 翻译）
- `backend/api.py` 新增：
  - `POST /api/news/enrich` — 只跑 Stage B，可挂 cron
  - `GET /api/admin/sources/health` — 看每个源的健康状态

### Step 5 — 清理 + 文档

- 删 `backend/news.py:138-160` 的 `_parse_feed`
- 把 `classify`, `_deduplicate`, `_parse_date` 在 `news.py` 改成从 `crawler/parsing.py` 导入
- 更新 `.claude/rules/backend.md`（旧版写的是 "6 RSS feeds"，要改）

## 验证清单（Step 4 之后）

1. `sqlite3 data/diarynews.db ".schema articles"` 看到新列
2. `sqlite3 data/diarynews.db ".schema source_health"` 表存在
3. `curl -X POST http://localhost:8000/api/news/fetch` → `new_count > 0`
4. 查库：`SELECT source, image_url, rss_category, enrichment_status FROM articles ORDER BY published DESC LIMIT 9;` 每源至少 1 条
5. `curl http://localhost:8000/api/admin/sources/health` → 9 条记录，`last_status='ok'`
6. 故意把 ObservadorAdapter URL 改坏 → `last_status='http_error'`，其他 8 个正常
7. 前端 `葡萄牙新闻` / `华人关注` 标签照常加载
