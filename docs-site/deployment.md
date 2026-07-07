# 部署说明

FreeNode 的部署分为三部分：自托管的全栈前端站点（Docker）、文档站点（GitHub Pages）以及自动化的节点更新工作流。本文档介绍相关配置与排错方法。

## 前端站点自托管（Docker）

`web/` 与 `backend/` 组成的全栈站点通过 Docker 自托管，核心配置在 `backend/docker-compose.yml`：

```bash
cd backend && docker compose up -d
```

涉及的主要文件：

- `backend/docker-compose.yml`：编排 FastAPI 后端、Next.js 前端与 Caddy 反向代理。
- `backend/Dockerfile`：构建后端镜像（Python 3.12-slim + gunicorn + uvicorn workers）。
- `backend/Caddyfile`：Caddy 反向代理配置，自动签发 HTTPS 证书，统一对外入口；前端请求由 Next.js 处理，`/api/*` 转发到 FastAPI 后端。
- `backend/.env`：环境变量文件，可从 `backend/.env.example` 复制后按需修改。

### 完整部署流程（云服务器）

#### 1. 准备服务器

- 一台 1 核 2G 以上的 Linux 服务器（推荐 Ubuntu 22.04 / Debian 12）。
- 安装 Docker 与 Docker Compose 插件：
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- 开放 80 与 443 端口（云厂商安全组 + 服务器防火墙都要开）。
- 准备一个域名，A 记录指向服务器 IP。

#### 2. 拉代码

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
```

#### 3. 配置 `.env`

```bash
cd backend
cp .env.example .env
```

编辑 `.env`，**必须**设置以下两项（生产环境强制要求，否则节点密钥明文存储、管理接口无鉴权）：

```bash
# 生成：python3 -c "import secrets; print(secrets.token_urlsafe(32))"
FREENODE_ADMIN_API_KEY=<填入上面命令的输出>

# 生成：python3 -c "import secrets; print(secrets.token_hex(32))"
FREENODE_SECRET_KEY_HEX=<填入上面命令的输出>
```

其余字段按需调整：

| 变量 | 默认 | 说明 |
|---|---|---|
| `FREENODE_DEBUG` | false | 生产必须 false，否则调度器不启动 |
| `FREENODE_CORS_ORIGINS` | 空 | 反代同源时留空；如需跨域填逗号分隔的完整 origin |
| `FREENODE_DATABASE_URL` | sqlite:///data/freenode.db | 节点多于 ~5k 建议换 `postgresql+asyncpg://...` |
| `FREENODE_MAX_NODES` | 800 | 输出文件最大节点数 |
| `FREENODE_VERIFY_NODES` | true | 是否做 TCP 连通性验证 |
| `FREENODE_SCHEDULE_FULL_REFRESH` | `0 3 * * *` | 全量抓取（UTC） |
| `FREENODE_SCHEDULE_VERIFY_ALIVE` | `*/30 * * * *` | 存活节点复验（UTC） |

#### 4. 配置 Caddyfile 域名

编辑 `backend/Caddyfile`，把 `freenode.example.com` 改成你的真实域名：

```caddy
your-domain.com {
    # ... 其余保持不变
}
```

Caddy 会自动向 Let's Encrypt 申请并续期证书，无需手动操作。前提是 80/443 端口可从公网访问。

#### 5. 启动

```bash
docker compose up -d --build
```

首次构建约 5-10 分钟（前端 Next.js 构建最久）。启动后检查：

```bash
docker compose ps                       # 三个容器都应是 Up
curl http://localhost:8000/api/health   # 后端健康检查
curl https://your-domain.com/           # 前端首页
```

后端启动时会自动跑 `alembic upgrade head` 建表；调度器会按 `.env` 里的 cron 跑全量刷新与存活复验。

#### 6. 反向查看日志

```bash
docker compose logs -f backend   # 后端 + 调度器日志
docker compose logs -f caddy     # 反代 + 访问日志
docker compose logs -f web       # 前端日志
```

### 架构说明

```
公网 ─▶ Caddy :443 ─┬─ /api/*  ─▶ backend:8000 (FastAPI + gunicorn)
                   ├─ /nodes/* ─▶ /srv/nodes (静态订阅文件)
                   └─ /*       ─▶ web:3000 (Next.js standalone)

卷：
  backend_data  → /app/backend/data   (SQLite 数据库)
  nodes_output  → /app/nodes          (订阅产物 + quality.json + sources-report.json)
                  /srv/nodes          (Caddy 只读挂载，对外静态服务)
  caddy_data    → Caddy 证书与状态
```

- 后端容器跑 FastAPI 应用 + APScheduler 调度器，按 `.env` 的 cron 定时跑 pipeline。
- 前端容器跑 Next.js standalone 产物（非 root 用户）。
- Caddy 反代 + 自动 HTTPS + 静态订阅文件直出（`/nodes/*` 不经过后端，吞吐高）。
- 订阅产物同时写仓库（GitHub Actions 每日提交）与本地卷（自托管实时生成）。

### 生产建议

- **数据库（PostgreSQL 切换）**：节点超过 5k 或并发验证 worker > 50 时，SQLite 写锁会成为瓶颈，建议切到 PostgreSQL。`backend/docker-compose.yml` 已经内置了 `postgres:16-alpine` 服务（带 healthcheck + 持久化 volume），切换步骤：
  1. 编辑 `backend/.env`，把 `FREENODE_DATABASE_URL=sqlite:///data/freenode.db` 这行注释掉，取消下面那行的注释：
     ```bash
     FREENODE_DATABASE_URL=postgresql+asyncpg://freenode:change_me@postgres:5432/freenode
     ```
     同时把 `POSTGRES_PASSWORD` 改成强密码（与连接串里的一致）。
  2. `docker compose up -d --build`：backend 会等 postgres 健康检查通过再启动，启动时 alembic 会自动用 psycopg2 同步驱动建表。
  3. 想从老 SQLite 迁移数据：`docker compose exec backend sqlite3 /app/backend/data/freenode.db .dump > backup.sql`，再用 `psql` 导入到 PostgreSQL（注意 SQLAlchemy 的 `BigInteger().with_variant(Integer, "sqlite")` 在 PG 上会建 `BIGINT`，类型兼容）。
- **资源限制**：小服务器（1G 内存）建议把 `FREENODE_VERIFY_WORKERS` 降到 20，`FREENODE_MAX_NODES` 降到 300。
- **备份**：`backend_data` 卷里是 SQLite 数据库，定期 `docker compose exec backend sqlite3 /app/backend/data/freenode.db .dump > backup.sql` 备份。切到 PostgreSQL 后改用 `docker compose exec postgres pg_dump -U freenode freenode > backup.sql`。
- **监控**：Caddy 访问日志走 JSON 格式输出到 `/data/access.log`，可接 Loki / ELK。

### 去中心化分发（多镜像订阅）

订阅文件默认只挂在 GitHub / GitCode 两个仓库，单点故障风险高。`scripts/publish_mirrors.py` 可以把 `nodes/` 目录的订阅文件同步发布到多个镜像，生成 `nodes/mirrors.json` 清单，客户端可以拉这个清单做 fallback。

支持的镜像类型（互不依赖，按需启用）：

| 镜像类型 | 环境变量 | 说明 |
|---|---|---|
| IPFS (Pinata) | `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` | 调 Pinata pinning API 上传，拿到目录 CID，客户端能通过任意 IPFS 网关访问 |
| Cloudflare R2 | `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET` | S3 兼容存储，需要 `pip install boto3`；公开访问需绑定 `r2.dev` 子域或自定义域 |
| 本地文件镜像 | `FREENODE_LOCAL_MIRROR_DIR` | 直接复制 `nodes/` 到指定目录，适合挂另一台机器做静态镜像备份 |

GitHub Raw 和 GitCode Raw 地址是固定的，始终写入 `mirrors.json`。

#### 配置步骤

1. 在 GitHub Actions secrets（或本地 `.env`）里填上要启用的镜像凭据，例如：
   ```bash
   PINATA_API_KEY=...
   PINATA_SECRET_API_KEY=...
   FREENODE_LOCAL_MIRROR_DIR=/var/lib/freenode/mirror
   ```
2. 跑发布脚本（在 `update.py` 之后跑，确保 `nodes/` 是最新的）：
   ```bash
   python3 scripts/publish_mirrors.py --nodes-dir nodes --output nodes/mirrors.json
   ```
3. 提交 `nodes/mirrors.json` 到仓库，前端 / 客户端就能拉到镜像清单。
4. 某个镜像失败不影响其他镜像，失败的不会写进 `mirrors.json`；下次跑成功了会自动补上。

#### `mirrors.json` 格式示例

```json
{
  "generated_at": "2026-07-04T12:00:00Z",
  "mirrors": [
    {"type": "github_raw", "name": "GitHub Raw", "base_url": "https://raw.githubusercontent.com/MS33834/freenode/main/nodes"},
    {"type": "gitcode_raw", "name": "GitCode Raw", "base_url": "https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes"},
    {"type": "ipfs", "name": "IPFS (Pinata)", "cid": "Qm...", "base_url": "https://gateway.pinata.cloud/ipfs/Qm..."},
    {"type": "r2", "name": "Cloudflare R2", "bucket": "freenode", "base_url": "https://pub-freenode.r2.dev/nodes"}
  ]
}
```

## 文档站点（GitHub Pages）

`docs-site/` 通过 `.github/workflows/deploy-docs.yml` 构建 VitePress 并部署到 GitHub Pages，触发条件为 `docs-site/**` 目录变更或手动运行。访问地址：`https://ms33834.github.io/freenode/`。

## 节点自动更新（update-nodes.yml）

每日 UTC 02:00 自动运行：

1. 检出代码
2. 安装 Python 依赖
3. 运行单元测试
4. 执行 `scripts/update.py --verify`
5. 校验产物非空
6. 提交节点文件变更到 GitHub
7. 可选同步到 GitCode

`timeout-minutes: 30` 防止个别慢源拖垮整个流水线；`FREENODE_FETCH_TIMEOUT=25` + `FREENODE_FETCH_RETRIES=2` 控制单源超时与重试。

## GitCode 同步配置

1. 进入仓库 **Settings → Secrets and variables → Actions**。
2. 新建名为 `GITCODE_TOKEN` 的 repository secret。
3. 值为 GitCode 个人访问令牌。
4. 保存后，定时更新会自动推送到 GitCode 镜像。

## 手动触发

在 GitHub 仓库页面进入 **Actions** 标签，选择对应工作流后点击 **Run workflow**。

## 站点访问地址

- 文档站点：`https://ms33834.github.io/freenode/`
- 前端站点：自托管部署，无固定公开地址，自行部署后由 Caddy 提供域名。

## 常见问题

### 工作流提示权限不足

确保 `GITHUB_TOKEN` 拥有 Contents 与 Pages 的写入权限，或在仓库 Settings → Actions → General → Workflow permissions 中选择 **Read and write permissions**。

### GitCode 同步失败

- 确认 `GITCODE_TOKEN` 已正确设置且未过期。
- 检查 GitCode 仓库地址是否与工作流中的远程 URL 一致。
- 若出现 non-fast-forward 错误，工作流会自动先拉取再推送。

### 前端页面数据为空

后端未启动或 `API_BASE_URL` 未配置。开发时后端跑在 8000 端口，前端 `next.config.mjs` 的 rewrites 会把 `/api/*` 代理到后端；生产环境下需确认 docker compose 中后端容器已正常运行。

### Caddy 申请证书失败

- 确认域名 A 记录已指向服务器公网 IP（不能用内网 IP）。
- 确认 80/443 端口对公网开放（Caddy 用 80 端口做 HTTP-01 验证）。
- 查日志：`docker compose logs caddy | grep acme`。
- 同一域名每小时有 5 次申请限额，反复失败别狂试，先排错。

### 后端调度器不跑

- `FREENODE_DEBUG=true` 时调度器不会启动，生产环境必须设 `false`。
- 查日志：`docker compose logs backend | grep scheduler`，启动时会打印 `scheduler started with N jobs`。
- cron 是 UTC 时区，确认换算到本地时间没看错。

### 节点数量很少或全是死的

- 看 `nodes/quality.json` 的 `survival_rate` 和 `failure_reasons`。
- 如果全是 `timeout`，可能是服务器出口被墙或 DNS 异常；`curl -v https://raw.githubusercontent.com/` 测一下。
- 如果某个源连续失败 3+ 天，`source-check` workflow 会自动开 Issue，去 Issues 看告警。
