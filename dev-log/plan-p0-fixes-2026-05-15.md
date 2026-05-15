# P0 后端审查修复 — 2026-05-15

来源：senior-backend skill 审查（main 分支 / commit 230f2bd 之上）挑出的 3 个 P0 项。

## 任务清单

### 任务 1：`/api/news/view` 反刷量

**问题**：当前端点无 auth、无限流、无去重，任何客户端可无限调用，污染 `view_count` 并对 SQLite 写路径施压（WAL 单写者会串行化）。

**做法**：进程内 (IP, link) 去重，1 小时窗口。
- 端点改为接收 `Request` 以拿到客户端 IP。
- 模块级 `dict[(ip, link), monotonic_ts]` + `threading.Lock`，老条目机会式清理，避免无界增长。
- 命中去重：跳过 UPDATE，直接 `SELECT view_count` 返回，前端可继续根据响应收敛 optimistic 计数。
- 不命中：走原 `increment_article_view`。
- 不引入 slowapi 等新依赖（与项目"无新依赖优先"的风格一致）。

**影响文件**：
- `backend/api.py`：endpoint 改造 + dedup 函数
- `backend/storage/news.py`：`increment_article_view` 增加 `increment: bool=True` 旗，关掉则只 SELECT

**限制说明**：进程内字典在多 worker 下各自计数，单进程部署当前无影响；代理后 IP 暂用 `request.client.host`，不读 `X-Forwarded-For`（避免被伪造），等后续部署到反代后再加 `TRUST_PROXY_HEADERS` 开关。

---

### 任务 2：SPA 兜底路由

**问题**：`@app.get("/{path:path}")` 兜底会把 `/api/typo` 等错误 API 路径返回 200 + HTML，掩盖 404；同时 `".." not in path` 不能挡住 URL 编码的路径遍历。

**做法**：
- path 以 `api/` 开头 → 直接 404，不走 SPA。
- 用 `Path.resolve()` + `is_relative_to(_SPA_DIR.resolve())` 判断是否仍在静态目录内，杜绝逃逸。
- 其余维持原行为：命中文件返回文件，否则返回 `index.html`（SPA 路由）。

**影响文件**：
- `backend/api.py`：`_spa_fallback`

---

### 任务 3：`expire_stale` 漏 realestate / secondhand

**问题**：`storage.expire_stale_jobs()` SQL 写死 `kind='job'`，但 `listings` 表中 realestate (`RE_DEFAULT_EXPIRY_DAYS=90`) 和 secondhand (`SH_DEFAULT_EXPIRY_DAYS=60`) 都有 `expires_at`，到期后永远是 `active`，只能人工 moderate。

**做法**：
- 重命名 `expire_stale_jobs` → `expire_stale_listings`，SQL 改为 `kind IN ('job','realestate','secondhand')`。
- `storage/__init__.py` 更新 re-export。
- `api.py` 后台任务 `_job_expiry_loop` 调用新函数；日志文案保留 "job listings" 改为 "listings"。
- 保留旧名作为 alias 不必要（仅一个调用点，直接改）。

**影响文件**：
- `backend/storage/listings.py`：函数实现
- `backend/storage/__init__.py`：re-export
- `backend/api.py`：后台 loop 调用 + 日志文案

---

## 执行顺序

按任务编号依次执行，每完成一项停下来等用户确认再做下一项。
