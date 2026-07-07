# 项目状态

本页面说明如何查看 FreeNode 的当前状态，解释 `nodes/` 目录下各输出文件含义，并说明 GitHub Actions 的运行频率与同步策略。

## 如何查看项目状态

### 1. 查看 GitHub Actions 运行状态

仓库主页的 README 顶部展示了三个关键工作流的徽章：

| 徽章 | 工作流 | 说明 |
|---|---|---|
| CI | `ci.yml` | 每次 push / PR 时执行 Python 检查、测试与 Web 构建 |
| Update Nodes | `update-nodes.yml` | 每日自动更新节点 |
| Deploy Docs | `deploy-docs.yml` | 构建 VitePress 文档站并部署到 GitHub Pages |

点击徽章即可进入对应工作流页面，查看最近一次运行是否成功、耗时与日志。

### 2. 查看节点文件更新时间

`nodes/` 目录下的文件由自动化流程每日更新。你可以通过 GitHub 文件列表中的“Last committed”时间判断最近一次更新何时发生。

### 3. 本地查看统计

运行以下命令可在本地生成并查看节点统计：

```bash
python3 scripts/update.py
```

如果开启了验证，还会输出存活率与平均延迟：

```bash
FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify
```

### 4. 主站实时看板

自托管部署后的 Next.js 前端会通过 FastAPI 后端从 `nodes/clash.yaml` 与 `config/sources.json` 读取统计信息，展示：

- 最近一次更新时间
- 当前节点总数
- 各协议数量分布
- 启用/全部数据源数量

访问路径：前端站点自托管部署，无固定公开地址；自行部署后由 Caddy 提供域名。文档站点则位于 `https://ms33834.github.io/freenode/`。

## `nodes/` 目录输出文件说明

`nodes/` 目录是 FreeNode 的核心产物目录，所有订阅链接都从这里获取。

| 文件 | 格式 | 用途 | 推荐客户端 |
|---|---|---|---|
| `clash.yaml` | YAML | Clash 配置文件，包含 `proxies` 与 `proxy-groups` | Clash Verge Rev、Clash Meta、Clash for Windows、Stash、Surge |
| `v2ray.txt` | Base64 文本 | 经 Base64 编码的节点链接列表 | v2rayN、v2rayNG、Shadowrocket、NekoBox、Quantumult X |
| `proxies.txt` | 明文 | 每行一个 `ip:port`，适用于 HTTP(S)/SOCKS4/SOCKS5 代理场景 | SwitchyOmega、FoxyProxy、curl、Python requests |
| `regions.json` | JSON | 可选的地域分布统计 | 主站展示、数据分析 |

### 文件内容示例

`clash.yaml` 前几行通常类似：

```yaml
proxies:
  - name: "Node_001"
    type: vless
    server: example.com
    port: 443
    uuid: ...
```

`v2ray.txt` 是 Base64 编码，解码后类似：

```text
vless://uuid@example.com:443?security=tls#Node_001
vmess://uuid@example.com:443?...#Node_002
```

`proxies.txt` 明文示例：

```text
192.0.2.1:8080
203.0.113.5:1080
```

## GitHub Actions 运行频率

### 每日自动更新

- **工作流**：`.github/workflows/update-nodes.yml`
- **触发条件**：
  - 定时：每天 UTC 02:00（北京时间 10:00）
  - 手动：仓库管理员可在 Actions 页面点击“Run workflow”
- **执行内容**：
  1. 安装 Python 依赖。
  2. 运行 `python3 scripts/update.py --verify`（开启节点验证）。
  3. 运行 `make test`。
  4. 若 `nodes/` 有变化，提交 `chore: daily node update`。
  5. 若配置了 `GITCODE_TOKEN`，同步推送到 GitCode 镜像仓库。

### CI 检查

- **工作流**：`.github/workflows/ci.yml`
- **触发条件**：
  - `main` 分支的 push
  - 针对 `main` 分支的 Pull Request
  - 手动触发
- **执行内容**：
  - Python 任务：`make lint`、`make test`、无验证的完整更新流程。
  - Web 任务：Next.js 依赖安装、ESLint 检查、构建检查。

### 站点部署

- **工作流**：`.github/workflows/deploy-docs.yml`
- **触发条件**：
  - `docs-site/` 目录变更
  - 手动触发
- **执行内容**：
  1. 构建 VitePress 文档站到 `docs-site/.vitepress/dist`。
  2. 上传并部署到 GitHub Pages（`https://ms33834.github.io/freenode/`）。

> 前端站点（`web/` + `backend/`）通过 Docker 自托管，不在此工作流范围内，详见 [部署说明](/deployment)。

## 同步策略

### GitHub 与 GitCode 双端镜像

订阅地址同时提供 GitHub Raw 与 GitCode Raw 两个入口，方便不同网络环境的用户访问：

| 格式 | GitHub Raw | GitCode Raw |
|---|---|---|
| Clash | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml` | `https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes/clash.yaml?ref=main` |
| V2Ray | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt` | `https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes/v2ray.txt?ref=main` |
| HTTP(S)/SOCKS4/SOCKS5 | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt` | `https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes/proxies.txt?ref=main` |

### 自动同步条件

- 需要在仓库 `Settings → Secrets and variables → Actions` 中配置名为 `GITCODE_TOKEN` 的 Secret。
- 配置后，`update-nodes.yml` 在每日提交 GitHub 后会自动推送到 GitCode。
- 若未配置，则只更新 GitHub 仓库，GitCode 镜像保持原状。

### 手动同步

如果你拥有 GitCode 写入权限，也可以在本地手动同步：

```bash
git remote add github https://github.com/MS33834/freenode.git
git remote add gitcode https://gitcode.com/badhope/freenode.git

git pull github main
git push github main
git push gitcode main
```

> 请勿将 token 写入远程 URL，建议使用 credential helper 或交互式输入。

## 状态异常处理

| 现象 | 可能原因 | 建议操作 |
|---|---|---|
| Update Nodes 徽章变红 | 网络超时、数据源大规模失效、GitCode 同步失败 | 查看工作流日志，定位失败步骤 |
| nodes/ 文件未更新 | 当日抓取结果与上一次相同，无需提交 | 属于正常情况；或手动触发一次更新 |
| 主站显示节点数为 0 | `clash.yaml` 解析异常或文件为空 | 检查 `nodes/clash.yaml` 内容，确认流水线是否成功 |
| GitCode 链接 404 | 镜像未同步或 token 失效 | 检查 `GITCODE_TOKEN` 与同步日志 |

## 相关页面

- [架构说明](/architecture)：了解节点从抓起到发布的完整流程。
- [自动化工作流](/automation)：查看各工作流的详细说明。
- [数据源说明](/data-sources)：查看所有数据源与更新频率。
