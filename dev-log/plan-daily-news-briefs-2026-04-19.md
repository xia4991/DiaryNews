# Daily News Briefs Plan

Date: 2026-04-19

## Objective

在 `华人关注` 和 `葡萄牙新闻` 页面新增一个 **过去每日总结区域**，让用户可以快速回看：

- 昨天的重要新闻总结
- 最近几天的简报归档
- 每天最值得回看的 3-5 条重点

这个功能的目标不是替代新闻列表，而是补一层：

- `今天看实时 feed`
- `昨天/前几天看精炼回顾`

## Product Direction

推荐做成一个统一概念：

- 中文名称：`每日回顾`
- 副文案：`快速回看最近几天的重要新闻`

但在两个页面中分别生成两套内容：

1. `china`
   - 用于 `华人关注`
   - 只基于 `tags_zh` 非空、且属于华人关注范围的文章

2. `portugal`
   - 用于 `葡萄牙新闻`
   - 基于普通葡萄牙新闻文章

这样用户会感觉它们是同一套产品语言，但内容来源清楚分开。

## Recommended UX

## 1. Placement

不建议把它塞进顶部 hero 里，会让首屏太杂。

推荐位置：

- 放在 hero 区下面
- 正式新闻 feed 上面

页面顺序变成：

1. 顶部 hero / featured
2. `每日回顾`
3. 实时新闻 feed

这样逻辑最清晰。

## 2. Module shape

推荐做成一块横向/卡片式区域：

- 左侧主卡：`昨天总结`
- 右侧或下方：`最近 7 天`

每个日期卡显示：

- 日期
- 一句标题
- 2-4 行摘要
- 关联文章数量
- “查看当天重点”

点击后打开一个 detail modal 或 inline expand，显示：

- 当天总览
- 3-5 条 bullet 总结
- 关联文章列表

## 3. Scope of history

V1 推荐：

- 默认展示最近 `7` 天
- 如果某天没有足够文章，不生成总结

这样既够用，也不会把页面拉得太长。

## Data Model

推荐新增一张表：

### `daily_news_briefs`

- `id INTEGER PRIMARY KEY`
- `brief_date TEXT NOT NULL`
  - 例如 `2026-04-18`
- `brief_type TEXT NOT NULL`
  - `china`
  - `portugal`
- `title TEXT NOT NULL`
  - 例如 `重点回顾：居留续期、租房与税务`
- `summary_zh TEXT NOT NULL`
  - 一段中文摘要
- `bullets_json TEXT NOT NULL`
  - JSON array，存 3-5 条重点 bullet
- `article_links_json TEXT NOT NULL`
  - JSON array，存关联文章 link
- `article_count INTEGER NOT NULL DEFAULT 0`
- `generated_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

索引：

- `(brief_type, brief_date DESC)` 唯一索引

## Why store generated briefs

不建议每次打开页面实时生成，因为：

- 会慢
- 会浪费 LLM 调用
- 同一天内容应该稳定
- 归档内容更适合预先生成和缓存

所以推荐：

- 新闻抓取完成后生成
- 或管理员手动触发补生成

## Generation Strategy

## 1. Source selection

### `china`

从某一天的文章里选：

- `published` 属于该天
- `tags_zh` 非空
- 当天符合条件的文章全部参与总结

### `portugal`

从某一天的文章里选：

- `published` 属于该天
- 全部普通新闻
- 最多取前 `20` 条进入总结

## 2. Ranking

V1 用更直接的规则：

- 按发布时间倒序
- `china` 类型保留当天全部符合条件的文章
- `portugal` 类型限制最多 `20` 条

## 3. LLM output

基于当天文章的：

- 中文标题
- 中文内容摘要 `content_zh`
- 原分类 `category`
- 华人标签 `tags_zh`

生成：

- 当天标题
- 1 段总结
- 一组 bullet，可逐条回顾当天新闻

推荐提示方向：

- 语言：中文
- 风格：像“每日回顾简报”
- 允许逐条复述当天新闻
- 重点是让用户快速回看昨天发生了什么

## 4. Fallback

如果当天文章太少，或 LLM 失败：

- 不生成该天简报
- 前端直接隐藏该日期

## Backend Changes

## `T-BRIEF-01`

扩展数据库 schema：

- 新增 `daily_news_briefs`

Status:

- completed

## `T-BRIEF-02`

新增 storage：

- `list_daily_news_briefs(brief_type, limit)`
- `get_daily_news_brief(brief_type, brief_date)`
- `upsert_daily_news_brief(...)`

Status:

- completed

## `T-BRIEF-03`

新增 summarizer logic：

- 按天收集文章
- 组装 prompt
- 生成 brief
- 存表

建议位置：

- `backend/services.py` 或新建 `backend/news_briefs.py`

Status:

- completed

## `T-BRIEF-04`

新增 API：

- `GET /api/news/briefs?type=china&limit=7`
- `GET /api/news/briefs?type=portugal&limit=7`
- 管理员可选：
  - `POST /api/news/briefs/generate?date=2026-04-18&type=china`
  - `POST /api/news/briefs/regenerate-recent`

Updated rule:

- 日报生成动作只允许 admin 调用
- 前端新闻页只对 admin 显示“生成日报”入口
- 如果当天已有日报，则允许重新生成并覆盖旧内容

Status:

- completed

## `T-BRIEF-05`

把生成流程接入新闻抓取后处理：

- 新闻 fetch 完成后
- 尝试为“昨天”生成或更新 brief

推荐先只自动生成：

- `昨天`

避免第一次就全量补历史导致等待太久。

## Frontend Changes

## `T-BRIEF-06`

新增复用组件：

- `DailyBriefsSection.jsx`
- `DailyBriefDetailModal.jsx`

Status:

- completed

## `T-BRIEF-07`

在 [NewsTab.jsx](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/react-frontend/src/pages/NewsTab.jsx) 中接入：

- `layout === 'china'` 时请求 `china`
- `layout === 'portugal'` 时请求 `portugal`

Status:

- completed

## `T-BRIEF-08`

页面呈现方式：

- 第一张卡高亮昨天
- 后面 3-6 张卡为历史日期
- 点击展开当天 bullet 和关联文章

Status:

- completed

Follow-up:

- 已调整到新闻页右侧信息栏位置，不再单独占据主内容区
- 历史日期卡片与详情标题统一改为中性措辞，避免出现“昨日重点”误导
- 从每日回顾进入文章后，支持固定位置返回按钮，并恢复到刚才的日报滚动位置
- 当日回顾中的每条 bullet 支持点击进入对应新闻，便于继续阅读

## Recommended V1 Scope

我建议你批准后先做这个最小版本：

1. 只支持 `昨天 + 最近 7 天`
2. 只在新闻页显示，不上首页
3. 只做中文 brief
4. 先做详情 modal，不做复杂归档页
5. 自动生成只覆盖 `昨天`
6. 管理员保留手动重生成功能

这样成本可控，而且效果已经会很明显。

## Why this is the right first version

- 用户立刻能感受到“昨天发生了什么”
- 不会破坏现有新闻页结构
- 和你现在的 AI 翻译新闻数据很匹配
- 后续可以自然扩展成：
  - 本周回顾
  - 专题回顾
  - 华人关注周报

## Risks

## 1. Published date quality

如果 RSS 原始 `published` 不稳定，某些文章可能被归到错误日期。

应对：

- 先统一按现有 `published` 字段截断到日期
- 后续再修时间质量

## 2. LLM summary quality

如果 prompt 太松，简报会变成“新闻列表复述”。

应对：

- 明确要求生成“重点变化”和“实际信号”
- 限制 bullet 数量

## 3. Sparse days

有些天华人关注文章太少，不值得生成。

应对：

- 少于阈值就跳过

## Approval Recommendation

如果你批准，我建议按这个顺序做：

1. `T-BRIEF-01` 到 `T-BRIEF-04`
2. 先跑通一版最近 7 天数据
3. 再做 `T-BRIEF-06` 到 `T-BRIEF-08`

这样你很快就能看到真实内容效果，而不是先做一堆前端壳。
