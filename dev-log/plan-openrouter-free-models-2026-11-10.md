# 接入 OpenRouter 免费模型 — 2026-11-10

背景：MiniMax 余额不足（HTTP 402），新闻翻译全停。改用 OpenRouter 上的免费模型。

## 约束（实测）

- 这个 key 是免费档：**免费模型每天 50 次请求**（`GET /api/v1/key` → `free_model_daily_requests.limit=50`）。
- 免费模型可用性波动大：`google/gemma-4-31b-it:free` 测试时上游 429；`openrouter/free` 随机路由到 2.6B 小模型，
  JSON 输出解析失败；`nvidia/nemotron-3.5-super-vl:free` 输出不是 JSON。
- `nvidia/nemotron-3-ultra-550b-a55b:free` 5 篇一批成功，返回合法 JSON、中文质量可用，但慢（5 篇约 3 分钟，约 15 token/s）。

## 设计

1. `LLM_PROVIDER`（`minimax` | `openrouter`，默认 `minimax`）—— 一个开关切换，MiniMax 代码不删。
2. `backend/llm/openrouter.py`：OpenAI 兼容接口，`OPENROUTER_MODELS` 逗号列表，多于一个时用 OpenRouter 的
   `models` 参数做自动降级。错误映射到现有的 `MiniMax*Error` 类型，`services.py` 的处理逻辑不用改。
3. `backend/llm/client.py`：`call_llm()` 按 provider 分发，并返回实际使用的模型名，写入 `enrichment_model`。
4. 每天 50 次 → 自动循环在 openrouter 下改走**批量模式**（一次请求翻译多篇，`NEWS_AUTO_ENRICH_BATCH_SIZE` 默认 8），
   可用 `NEWS_AUTO_ENRICH_MODE=single` 切回逐篇。批量的 `max_tokens` 按篇数放大。
5. 429（限流 / 当日额度用完）和 401/402/403 一样视为服务方问题：中止本轮，不扣文章的重试次数。
6. AI 助手（`backend/chat/`）是独立模块，暂不切换（共用每天 50 次额度会挤占新闻翻译）。

## 验证

- 临时 DB + monkeypatch：分发、错误映射、批量模式、429 中止不扣次数。
- 真实调用一次（消耗 1 次额度），然后重启线上服务。
