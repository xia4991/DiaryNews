# 首页平台公告栏计划

日期：2026-04-20
分支：`codex/china-news-sort-options`

## 目标

在首页右侧 `今日概览` 上方新增一个 `平台公告栏`，用于展示管理员发布的站内公告，例如：

- 平台功能更新
- 系统维护提醒
- 使用说明
- 征集反馈

## 推荐实现

### 展示位置

- 放在 [HomePage.jsx](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/react-frontend/src/pages/HomePage.jsx) 右侧栏
- 位于 `今日概览` 上方
- 风格上更像一块“站内公告卡”，而不是新闻卡

### 数据模型

新增一张独立表，例如：

- `platform_announcements`

建议字段：

- `id`
- `title`
- `content`
- `status`：`active / hidden / removed`
- `is_pinned`
- `created_by`
- `created_at`
- `updated_at`

### 后端接口

公共读取：

- `GET /api/announcements`

管理员管理：

- `POST /api/admin/announcements`
- `PUT /api/admin/announcements/{id}`
- `DELETE /api/admin/announcements/{id}`

### 前端管理入口

推荐放进 [AdminModerationTab.jsx](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/react-frontend/src/pages/AdminModerationTab.jsx)：

- 新增一个 `公告` 子页签
- 管理员可以：
  - 发布公告
  - 编辑公告
  - 隐藏 / 删除公告

### 首页展示规则

MVP 推荐：

- 首页显示最多 `2` 条启用中的公告
- `置顶公告` 优先
- 无公告时：
  - 普通用户不显示该模块
  - 管理员可以看到一个空状态提示，方便知道这里可以发布公告

## 任务拆分

### T1
规划公告栏位置、数据模型与管理入口。

### T2
后端基础：

- 建表
- storage
- 公共读取接口
- 管理员 CRUD 接口

状态：已完成

### T3
前端管理：

- 在 `管理` 页面新增 `公告` 子页签
- 新增公告列表与发布/编辑表单

状态：已完成

补充：

- 已支持创建、编辑、删除
- 已支持置顶 / 取消置顶
- 已支持发布 / 隐藏切换

### T4
首页接入：

- 在 `今日概览` 上方显示平台公告栏
- 做空状态与管理员视角处理

状态：已完成

补充：

- 首页右侧已改成 `平台公告栏 + 今日概览` 上下堆叠
- 公告最多读取 `2` 条公开公告
- 普通用户无公告时隐藏该模块
- 管理员无公告时显示空状态，便于继续发布

### T5
验证：

- 管理员可发布
- 普通用户可见公告
- 首页显示顺序正确

状态：已完成

验证结果：

- 前端 `npm run build` 通过
- 后端 smoke test 通过：
  - 置顶公告优先于普通公告
  - 隐藏公告不会出现在公共列表
  - 公共列表在隐藏后会立即收缩
- 首页已按公共接口读取公告，且最多展示 `2` 条

## 当前结论

这次最适合的第一步不是直接改首页，而是先把 `公告` 做成一套正式数据流。  
这样后面无论首页、社区还是其他页面需要引用公告，都能直接复用。
