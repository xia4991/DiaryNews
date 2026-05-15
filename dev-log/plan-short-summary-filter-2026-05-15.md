# Stage A 短摘要过滤 — 2026-05-15

## 背景

部分 RSS 源（DN、SIC 等）只在 feed 里给 title + 一句话 teaser，summary 实际只有几个词甚至空字符串。这些"只有 title"的文章：

1. 占用 `MAX_ARTICLES=2000` DB 配额；
2. 浪费 Stage B 的 MiniMax 翻译开销（每条 3s sleep + token）；
3. 在前端列表里对用户没价值。

## grill-me 决策点

- **过滤信号**：RSS summary 词数。接受偶发"短摘要 + 长正文"被误杀的风险。
- **旧数据**：一次性 SQL 清理（认可"顶多丢三个词的数据，不严重"）。

## 改动

| 文件 | 改动 |
|------|------|
| `backend/config.py` | `MIN_SUMMARY_WORDS = int(os.environ.get(..., "30"))`，0 禁用 |
| `backend/crawler/runner.py` | import + `run()` / `run_all()` 加 `min_summary_words` 参数；age 过滤后、cap 前插入词数过滤；stats 加 `short_skipped` 键；日志同步 |
| `scripts/purge_short_articles.py` | 新文件，`--dry-run` / 交互式 `DELETE` 确认 / `--min-words` 覆盖 |
| `.claude/rules/backend.md` | 同步 Stage A 流程描述与 stats 字段表 |

## 验证

- 单元：fake adapter 产 3 条（7 词 / 1 词 / 空），阈值 5，期望 `short_skipped=2`、`returned_count=1`
- E2E：触发 `/api/news/collect`，看 `stats.short_skipped > 0`
- 禁用：`MIN_SUMMARY_WORDS=0`，`short_skipped` 恒 0
- 清理：`python scripts/purge_short_articles.py --dry-run` → 预览；`python scripts/purge_short_articles.py` → 输入 `DELETE` 确认
