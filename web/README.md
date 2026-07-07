# FreeNode Web

Next.js 16 + React 19 + Tailwind 4 前端，对接 FreeNode 后端 API，提供节点浏览、订阅生成、管理后台与运行状态面板。

## 开发

```bash
# 装依赖
npm install

# 启动开发服务器（默认 3000，自动反代 /api 到后端 8000）
npm run dev
```

打开 http://localhost:3000 。后端需另起（项目根 `make run-backend`）。

## 环境变量

| 变量 | 说明 |
|---|---|
| `API_BASE_URL` | 服务端 fetch 后端地址，默认 `http://localhost:8000` |
| `NEXT_PUBLIC_API_BASE_URL` | 浏览器端地址，留空走 `/api` 反代 |

开发环境通过 `next.config.mjs` 的 `rewrites` 把 `/api/*` 反代到后端；生产由 Caddy 反代。

## 类型同步

后端 schema 改动后，重新生成前端类型：

```bash
# 项目根
make type-sync
# 或在 web/ 下
npm run type-sync   # 需后端先跑在 8000
```

产物：`lib/api-types.ts`，由 `lib/api.ts` re-export 给各页面用。

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建（standalone 输出到 `dist/`） |
| `npm run start` | 启动构建产物 |
| `npm run lint` | ESLint（max-warnings 0） |
| `npm run type-sync` | 从后端 openapi 生成类型 |

## 部署

生产用 Docker（见 `Dockerfile`，三阶段构建：deps → builder → runner，standalone 输出，非 root 运行）。完整编排见 `backend/docker-compose.yml`。

## 目录

- `app/` — 页面与路由（App Router）
- `components/` — 复用组件
- `lib/` — API 客户端与类型（`api.ts`、`admin-api.ts`、`api-types.ts`）
- `next.config.mjs` — Next 配置（standalone + rewrites）
- `eslint.config.mjs` — flat config ESLint
