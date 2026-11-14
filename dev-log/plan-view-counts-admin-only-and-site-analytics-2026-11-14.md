# 浏览数仅 admin 可见 + 管理后台访问统计

日期：2026-11-14 · 分支：`dev/2026-11-14`

## 需求

1. 新闻上的"N 次阅读"浏览数先对普通用户隐藏，只有 admin 能看到；以后再改成公开。
2. 管理后台增加访问数据：访问量、点击、访客 IP 等。

## 现状

- `articles.view_count` 由 `POST /api/news/view` 递增，同一客户端对同一篇一小时内只计一次（进程内去重）。
- 前端在 6 处显示浏览数：`ArticleCard`、`ArticleCardFeatured`、`ArticleModal`、`NewsFeedRow`、`HomePage`（热榜）、`NewsTab`（多处 + "按浏览"排序）。
- **已有 bug**：线上链路是 cloudflared → Caddy(:8080) → uvicorn(:8000)，后端看到的
  `request.client.host` 永远是 `127.0.0.1`。浏览去重因此把所有访客当成同一个人，
  每篇文章每小时最多 +1，浏览数严重偏低。访问统计要记真实 IP，必须先解决这个问题。

## 设计决定

### 任务一：浏览数可见性

- 用已有的 `metadata` 键值表存站点设置，新增 `storage/site_settings.py`（带默认值、类型化），
  第一个设置项为 `view_counts_public`，默认 `false`。
- `GET /api/site-settings`（公开）、`PUT /api/admin/site-settings`（admin）。
- 前端新增 `SiteSettingsProvider` + `useShowViewCounts()`：`user.is_admin || settings.view_counts_public`。
  所有显示浏览数的地方统一走这个 hook；非 admin 时"按浏览"排序选项也隐藏。
- 管理后台放一个开关，以后改公开时直接点开关，不用改代码重新部署。
- 只隐藏显示，不从 `/api/news` 里删 `view_count`：热度排序仍依赖它，而且浏览数不是敏感数据。

### 任务二：访问统计

- 公共工具 `client_ip(request)`：只有当直连对端是本机（Caddy/Vite 代理）时才信任
  `CF-Connecting-IP` → `X-Forwarded-For` 首项，否则用直连 IP（防伪造）。浏览去重也改用它，修复上面的 bug。
- 新表 `site_events`：`created_at, event_type(pageview|tab|article_open|outbound), path/tab, target, title,
  ip, user_id, visitor_id, user_agent, referrer, is_bot`。
- `POST /api/track`：前端在进站、切换 tab、打开文章、点"阅读原文"时上报；后端补 IP、登录用户、UA。
  字段限长，按 IP 简单限流。
- `visitor_id`：sessionStorage 里的随机 ID（关掉浏览器就失效），用来区分同一 IP 后的不同访客，不做跨会话追踪。
- `GET /api/admin/analytics/summary?days=` + `GET /api/admin/analytics/events`：
  今日/区间 PV、独立 IP、独立访客、每日趋势、热门 tab、热门文章、来源、最近访问明细（含 IP）。admin 自己的访问默认排除。
- 数据保留 `ANALYTICS_RETENTION_DAYS`（默认 90 天），后台循环清理。
- GDPR：隐私政策补上"访问日志（含 IP），保留 90 天"的说明；注销账号时删除该用户的访问记录。

## 任务拆分

- [x] T1 浏览数仅 admin 可见（后端设置 + 前端 hook + 后台开关）
  - 设置用 `StrictBool` 校验（宽松模式会把 `"yes"` 转成 true）；每次修改写一条 `site_settings` 系统日志。
  - 顺带：`vite.config.js` 的代理目标可用 `VITE_API_PROXY_TARGET` 覆盖，方便另起一套后端做隔离预览。
- [x] T2 真实 IP 解析 + 修复浏览去重
  - `backend/request_meta.py`：`client_ip` / `client_country`（`CF-IPCountry`）/ `device_type` / `is_bot`。
  - Caddy 默认会把 `X-Forwarded-For` 改写成 cloudflared 的地址（127.0.0.1），所以优先用 `CF-Connecting-IP`。
- [x] T3 访问事件采集（表、`/api/track`、前端上报、保留期清理、隐私政策）
  - 文章打开在 `/api/news/view` 里顺便记录，不另发请求，浏览计数和访问日志始终一致。
  - 外链点击包括"阅读原文"和首页公告/推广卡片的链接（推广效果可以直接看）。
  - `/api/track` 被限流时也返回 204，客户端不需要处理失败。
  - 隐私政策更新到 2026-11-14：写明访问日志的内容、正当利益依据、90 天保留期、sessionStorage 会话标识和反对权。
- [x] T4 管理后台"访问统计"面板（`components/admin/AnalyticsSection.jsx`）
  - 时间范围 今天/7/30/90 天；默认排除管理员和爬虫，可勾选包含。
  - 指标卡、每日访问量柱状图（悬停看明细，附按天表格）、热门栏目/文章/来源/外链/设备/地区、访问最多的 IP、可按 IP 和类型筛选的访问明细。

## 验证中发现并修复的问题

- 新增的 `storage.list_events` 和社区活动的 `list_events` 重名，`storage/__init__` 后导入的覆盖了前者，导致
  `/api/community/events` 500。分析相关函数统一改成 `*_site_events`，并在 backend 规则里记下命名约定。
- 每日柱状图在 7 天范围下柱子过宽，加了最大宽度；手机宽度下宽表格撑开页面，外层 grid 改为 `minmax(0,1fr)` 列。
- `PUT /api/admin/site-settings` 原先会把 `"yes"` 当成 true，改用 `StrictBool`。

## 上线注意

- 需要重启后端（新建 `site_events` 表是自动的）并重新构建前端。
- 上线后的头几天浏览数会比以前涨得快：之前所有访客都被当成 127.0.0.1 去重，现在按真实 IP 计数。
