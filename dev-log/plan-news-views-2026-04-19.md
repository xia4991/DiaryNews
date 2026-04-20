# News Views Plan

Date: 2026-04-19

## Objective

为新闻增加阅读量统计，并在前端显示。基于阅读量，把新闻页右侧原来的“快速浏览”区域升级成“热门新闻 / 热门关注”。

## Scope

1. 后端为 `articles` 增加 `view_count`
2. 打开新闻详情时累计阅读量
3. 前端显示阅读量
4. `华人关注` 与 `葡萄牙新闻` 的右侧辅助区改为热门新闻排序

## Implementation

## `T-VIEW-01`

数据库与 storage：

- `articles` 表新增 `view_count INTEGER NOT NULL DEFAULT 0`
- 新闻抓取 upsert 时保留已有阅读量，不因重新抓取而清零
- 新增 `increment_article_view(link)`

Status:

- completed

## `T-VIEW-02`

API：

- 新增 `POST /api/news/view`
- 根据 `link` 递增阅读量并返回最新值

Status:

- completed

## `T-VIEW-03`

前端阅读量接入：

- 打开文章时调用 view API
- 本地列表做乐观更新
- 文章卡片、精选卡片、详情弹窗显示阅读量

Status:

- completed

## `T-VIEW-04`

新闻页热门模块：

- `华人关注`：把“快速浏览”改成“热门关注”
- `葡萄牙新闻`：把“快讯头条”改成“热门新闻”
- 按阅读量优先、发布时间次级排序

Status:

- completed

## `T-VIEW-05`

热门算法与首页入口优化：

- 热门排序改为“阅读量 + 近 3 天时间权重”
- 抽成前端共享热度工具，首页与新闻页共用
- 首页新增更明确的 `热门新闻` 模块

Status:

- completed

## `T-VIEW-06`

热门时间范围切换：

- 首页与新闻页统一支持 `今日 / 本周 / 全部`
- 热门模块共用同一套前端热度算法和空状态

Status:

- completed

## `T-VIEW-07`

首页热门模块可读性增强：

- 首页 `热门新闻` 与 `华人关注` 预览支持直接打开文章
- 首页热门列表补充更直观的热度提示

Status:

- completed

## Validation

- 前端 `npm run lint`
- 前端 `npm run build`
- 后端导入检查
