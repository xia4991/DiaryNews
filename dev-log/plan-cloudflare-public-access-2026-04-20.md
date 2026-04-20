# Cloudflare Public Access Plan

Date: 2026-04-20

## Objective

让项目继续在本地机器运行，但通过 Cloudflare Tunnel 使用公网域名访问。

## Recommended Shape

- 后端继续跑在 `localhost:8000`
- 前端先 build 成静态文件
- 用本地 Caddy 在 `localhost:8080` 提供前端静态文件，并反向代理：
  - `/api/*` -> `localhost:8000`
  - `/uploads/*` -> `localhost:8000`
- 用 `cloudflared` 将公网域名映射到 `http://localhost:8080`

## Why this is the preferred setup

- 单域名部署，前端仍然可以继续用相对路径 `/api`
- 不需要单独暴露后端域名
- Google 登录和 CORS 配置更简单
- 不需要开本地路由器端口

## Tasks

## `T-CF-01`

新增本地反向代理模板：

- `deploy/cloudflare/Caddyfile`

## `T-CF-02`

新增 Cloudflare Tunnel 配置模板：

- `deploy/cloudflare/cloudflared-config.yml.example`

## `T-CF-03`

新增部署说明文档：

- `docs/cloudflare-public-access.md`

## Status

- completed
