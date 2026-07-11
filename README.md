# FreeNode

收集公开免费节点的仓库。流水线从 `config/sources.json` 里列出的公开源抓取节点订阅，解析、去重、可选做连通性验证，输出成三种能直接订阅的格式，提交回本仓库。

> **免责声明**：本项目仅供网络协议学习、安全测试与隐私技术研究。所有节点来自第三方公开渠道，不保证可用性与安全性，请勿用其登录任何银行账户、支付或社交等敏感账号。请遵守你所在地的法律法规。

## 直接用：订阅链接

把下面任一链接填进客户端的订阅地址（Clash / Clash Verge / Stash / v2rayN / v2rayNG / Shadowrocket / Karing 等），仓库每天自动更新：

| 格式 | 适用客户端 | 订阅链接 |
|---|---|---|
| Clash | Clash / Clash Verge / Stash | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml` |
| V2Ray | v2rayN / v2rayNG / Karing | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt` |
| 代理列表 | HTTP(S) / SOCKS4 / SOCKS5 客户端 | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt` |

公开节点有时效性，用订阅链接比复制文件内容更稳。

## 自己跑流水线

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
pip install -r requirements.txt

python scripts/update.py                              # 不验证，快
FREENODE_VERIFY_NODES=true python scripts/update.py --verify   # 验证连通性，过滤失效节点
```

结果写到 `nodes/`：

- `clash.yaml` / `v2ray.txt` / `proxies.txt` —— 三种订阅格式
- `regions.json` —— 按协议 / 地区统计
- `quality.json` —— 当天的质量快照（总数、存活率、平均延迟、失败原因）
- `sources-report.json` —— 每个源近 14 天的可靠性评分

## 配置

数据源在 `config/sources.json` 维护，是一个 JSON 数组，每项是一个公开源。支持的类型：`github_raw` / `web_url` / `html` / `git_repo` / `rss`；可配 Base64 解码、更新频率、协议过滤。

流水线行为用环境变量调，详见 `.env.example`：

| 变量 | 默认 | 说明 |
|---|---|---|
| `FREENODE_VERIFY_NODES` | `true` | 是否做 TCP 连通性校验 |
| `FREENODE_MAX_NODES` | `800` | 输出保留的最大节点数 |
| `FREENODE_MAX_PROXIES` | `300` | 输出保留的最大代理数 |
| `FREENODE_CRAWL_WORKERS` | `16` | 并发抓取数 |
| `FREENODE_VERIFY_TIMEOUT` | `5` | 单节点连接超时（秒） |
| `FREENODE_GEO_ENABLED` | `false` | 是否按地区分组（需 GeoIP 数据） |
| `FREENODE_ALLOWED_HOSTS` | 见 `.env.example` | crawler 域名白名单，防 SSRF |

## 自动发现新源

`scripts/discover_sources.py` 用 GitHub Search API 找潜在的免费节点仓库，把候选写到 `nodes/discovered-sources.json`（`enabled=false`，等你人工审核后再加进 `sources.json`）：

```bash
GITHUB_TOKEN=xxx python scripts/discover_sources.py --min-stars 50
```

## 每日自动更新

`.github/workflows/update-nodes.yml` 每天 UTC 02:00 自动跑一遍流水线，把 `nodes/` 的新结果提交回仓库。也可以到仓库的 Actions 页面手动触发。

如果 CI 环境对出站端口有限制导致验证全失败、输出为空，把工作流里的 `python scripts/update.py --verify` 改成 `python scripts/update.py --no-verify` 即可。

## 开发

```bash
make test    # 跑 tests/ 单元测试
make lint    # ruff 检查
make update  # 等价于 python scripts/update.py
```

## 许可证

节点与代理均来自公开渠道，本项目不拥有也不运营它们。许可证见 `LICENSE`。
