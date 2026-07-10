# 自动化工作流说明

> **2026-07 更新**：自动调度类机器人（每日定时更新、自动部署、Stale、Dependabot、auto-merge）已停用，节点更新与部署改为人工触发——在 GitHub Actions 页面手动 Run workflow，或本地跑 `scripts/update.py`。CI 质量检查（lint/test/build）与 CodeQL 安全扫描仍保留，在 push / PR 时自动运行。

保留的工作流如下：

| 工作流文件 | 触发条件 | 主要职责 |
|---|---|---|
| `ci.yml` | push / PR / 手动触发 | Python 代码检查与测试、Next.js 构建检查 |
| `codeql.yml` | push / PR / 每周 / 手动触发 | 代码安全扫描（Python + JS/TS） |
| `labeler.yml` | PR | 按改动路径自动打标签 |
| `update-nodes.yml` | 仅手动触发 | 运行 Python 流水线更新节点并提交 |
| `deploy-docs.yml` | 仅手动触发 | 构建 VitePress 文档站并部署到 GitHub Pages |
| `source-check.yml` | 仅手动触发 | 检查连续失败的数据源并开/关 issue |

## 节点更新流程（update-nodes.yml）

1. **检出仓库**：拉取完整历史，便于后续提交。
2. **安装 Python 依赖**：`pip3 install -r requirements.txt`。
3. **运行更新脚本**：
   ```bash
   FREENODE_VERIFY_NODES=true \
   FREENODE_MAX_NODES=800 \
   FREENODE_MAX_PROXIES=300 \
   python3 scripts/update.py --verify
   ```
4. **运行测试**：`make test`。
5. **提交变更**：如果 `nodes/` 目录有变化，自动提交并推送 `chore: daily node update`。
6. **同步 GitCode**：如果配置了 `GITCODE_TOKEN` 密钥，则同时推送到 GitCode 镜像仓库。

## Python 流水线（scripts/）

`scripts/update.py` 按以下顺序调用各模块：

1. **`crawler.py`**：并发拉取 `config/sources.json` 中所有启用源。
2. **`parser.py`**：从原始内容中提取 `ss://`、`vmess://`、`vless://`、`trojan://` 等链接。
3. **`verifier.py`**：可选地对节点进行 TCP 连通性与延迟检测。
4. **`formatter.py`**：生成 `nodes/clash.yaml`、`nodes/v2ray.txt` 与 `nodes/proxies.txt`。

## 文档站部署流程（deploy-docs.yml）

手动触发后，部署工作流会：

1. 检出代码。
2. 安装 Node.js 24 并缓存 `docs-site/package-lock.json`。
3. 在 `docs-site/` 目录执行 `npm ci`。
4. 执行 `npm run docs:build` 生成 `docs-site/.vitepress/dist`。
5. 通过 `actions/upload-pages-artifact` 上传 `docs-site/.vitepress/dist`。
6. 由 `deploy-pages` 任务将产物部署到 GitHub Pages。

最终访问路径：文档站 `https://<owner>.github.io/freenode/`。

## CI 检查（ci.yml）

每次 push 或 PR 时，CI 会并行执行：

- **Python 任务**：运行 `make lint`、`make test`，并在不启用验证的情况下执行一次完整更新流程。
- **Web 任务**：安装依赖、执行 ESLint 检查并构建 Next.js 站点，确保前端改动不会破坏构建。

## 本地模拟自动化

如果你想在本地复现完整流程：

```bash
# 1. 安装 Python 依赖
pip3 install -r requirements.txt

# 2. 运行完整更新（不验证，速度较快）
python3 scripts/update.py

# 3. 或开启连通性验证（较慢，但节点质量更高）
FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify

# 4. 运行测试
make test

# 5. 构建前端与文档站
# 开发模式下前端依赖后端 API，请先在另一个终端启动：
#   cd backend && uvicorn app.main:app --reload
cd web && npm install && npm run build
cd ../docs-site && npm install && npm run docs:build
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `FREENODE_VERIFY_NODES` | `true` | 更新时是否启用 TCP 连通性校验 |
| `FREENODE_MAX_NODES` | `800` | 输出节点链接最大数量 |
| `FREENODE_MAX_PROXIES` | `300` | 输出 HTTP(S)/SOCKS4/SOCKS5 代理最大数量 |
| `FREENODE_ALLOWED_HOSTS` | `raw.githubusercontent.com,gitcode.com,api.gitcode.com` | 爬虫额外允许的域名 |
| `FREENODE_CRAWL_WORKERS` | `min(16, enabled_sources)` | 并发抓取源数量 |
| `FREENODE_GEO_ENABLED` | `false` | 是否启用 GeoIP 地区分组 |
| `FREENODE_GITHUB_OWNER` | `MS33834` | 前端链接使用的 GitHub owner |
| `FREENODE_REPO_NAME` | `freenode` | 前端链接使用的仓库名 |
| `FREENODE_GITCODE_OWNER` | `badhope` | 前端链接使用的 GitCode owner |
| `GITCODE_TOKEN` | 无 | GitCode 同步所需的个人访问令牌 |
