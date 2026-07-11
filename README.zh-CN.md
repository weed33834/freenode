# FreeNode

收集**公开免费节点/代理源**的仓库。自动化流水线从社区源抓取节点列表，经过解析、去重、可选连通性验证、格式化后，输出客户端可直接加载的订阅文件。每天由 GitHub Actions 自动更新——不需要服务器，不需要数据库。

> **免责声明。** 本项目仅供网络协议学习、安全测试与隐私技术研究。所有节点来自第三方公开渠道，不保证可用性与安全性。请勿用于登录银行、支付或任何敏感账号。请遵守你所在地的法律法规。

## 目录

- [订阅链接](#订阅链接)
- [工作原理](#工作原理)
- [快速上手](#快速上手)
- [工具说明](#工具说明)
  - [update.py — 运行流水线](#updatepy--运行流水线)
  - [discover_sources.py — 发现新数据源](#discover_sourcespy--发现新数据源)
  - [telegram_source.py — 抓取 Telegram 频道](#telegram_sourcepy--抓取-telegram-频道)
  - [crawler.py — 并发抓取器](#crawlerpy--并发抓取器)
  - [parser.py — 链接解析器](#parserpy--链接解析器)
  - [verifier.py — 连通性检测器](#verifierpy--连通性检测器)
  - [dedup.py — 去重模块](#deduppy--去重模块)
  - [formatter.py — 输出格式化](#formatterpy--输出格式化)
  - [utils.py — 公共工具函数](#utilspy--公共工具函数)
- [配置说明](#配置说明)
  - [sources.json](#sourcesjson)
  - [环境变量](#环境变量)
- [输出文件](#输出文件)
- [每日自动更新](#每日自动更新)
- [开发](#开发)
- [许可证](#许可证)
- [其他语言](#其他语言)

## 订阅链接

把下面任意链接填入客户端的订阅地址即可（Clash / Clash Verge / Stash / v2rayN / v2rayNG / Shadowrocket / Karing 等均支持）。文件由每日定时任务自动刷新，订阅比手动下载更稳定。

| 格式 | 适用客户端 | 订阅链接 |
|---|---|---|
| Clash | Clash / Clash Verge / Stash | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml` |
| V2Ray | v2rayN / v2rayNG / Karing | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt` |
| 代理列表 | HTTP(S) / SOCKS4 / SOCKS5 客户端 | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt` |

公开节点有时效性，如果链接失效，等待下次每日运行即可，无需手动编辑文件。

## 工作原理

流水线是线性的：每个步骤读取上一步的输出，处理后传给下一步。

```
config/sources.json
        │
        ▼
   crawler        并发抓取所有启用的源
        │
        ▼
   parser         从原始文本提取节点/代理分享链接
        │
        ▼
   dedup          按内容指纹去除镜像重复
        │
        ▼
   verifier  (可选)  TCP 连通性检测 + 轻量协议握手
        │
        ▼
   formatter      写出 clash.yaml / v2ray.txt / proxies.txt + 质量报告
        │
        ▼
   nodes/   每日工作流自动提交到仓库
```

`update.py` 驱动整条链；其余模块由它导入使用。正常情况下你只需要调用 `update.py`（以及辅助工具 `discover_sources.py` / `telegram_source.py`）。

## 快速上手

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
pip install -r requirements.txt

# 快速运行，不验证连通性
python scripts/update.py --no-verify

# 完整运行：检测节点是否可达，过滤失效节点
python scripts/update.py --verify
```

结果输出到 `nodes/` 目录（详见[输出文件](#输出文件)）。

## 工具说明

所有脚本位于 `scripts/`。其中 3 个是命令行工具，其余是流水线内部库模块（被 `update.py` import）。

### update.py — 运行流水线

主入口。加载 `config/sources.json`，抓取每个启用的源，提取链接、去重、可选验证连通性，写出所有输出文件并更新 14 天源可靠性报告。

```bash
python scripts/update.py --verify      # 验证可达性，过滤死节点
python scripts/update.py --no-verify   # 跳过验证（最快）
```

| 参数 | 说明 |
|---|---|
| `--verify` / `--no-verify` | 覆盖 `FREENODE_VERIFY_NODES` 环境变量。在无外网的环境（如某些 CI 运行器）自动跳过验证。 |

退出码：`0` 成功 · `2` 配置错误 · `3` 抓取错误 · `4` 解析错误。

内部执行顺序：

1. `crawl()` — 并发抓取所有源。
2. `extract_node_links()` / `parse_proxy_api_response()` — 提取链接。
3. `dedup_by_fingerprint()` — 指纹去重。
4. `verify_nodes()` — 仅在 `--verify` 时执行。
5. `write_outputs()` — 写出三个订阅文件 + `quality.json`。
6. `_write_source_report()` — 滚动更新 14 天可靠性评分。

### discover_sources.py — 发现新数据源

通过 GitHub Search API 扫描潜在免费节点仓库，将候选写入 `nodes/discovered-sources.json`（`enabled: false`），等你人工审核后再移入 `sources.json`。

```bash
GITHUB_TOKEN=ghp_xxx python scripts/discover_sources.py --min-stars 50
```

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--query` | 内置关键词 | 覆盖 GitHub 搜索查询。 |
| `--min-stars` | `5` | 仓库最低 star 数。 |
| `--max-results` | `30` | 最大拉取仓库数。 |
| `--output` | `nodes/discovered-sources.json` | 候选写入路径。 |

设置 `GITHUB_TOKEN` 可提高 GitHub Search API 频率限制；不设置匿名额度很低。

### telegram_source.py — 抓取 Telegram 频道

独立工具（不接入主流水线）。读取频道最近消息，提取节点链接，输出为 JSON。需要 [Telethon](https://docs.telethon.dev/) 和一次登录获取 session。

```bash
# 先登录一次（创建 ~/.freenode/freenode.session）
python3 -m telethon_quickstart
# 再抓取
python scripts/telegram_source.py @some_channel --limit 200 --output nodes/telegram.json
```

| 参数 | 默认值 | 说明 |
|---|---|---|
| `channel`（位置参数） | — | 频道用户名（`@xxx`）、`t.me/...` 链接或频道 ID。 |
| `--limit` | `100` | 扫描最近消息数。 |
| `--session` | `freenode` | Telethon session 名（存于 `~/.freenode/`）。 |
| `--output` | 标准输出 | JSON 输出路径；省略则打印到终端。 |

### crawler.py — 并发抓取器

库模块。`crawl()` 使用 [httpx](https://www.python-httpx.org/) 并行请求所有启用的源，流式读取并限制 `max_bytes` 上限，网络错误自动重试。自动检测并解码全文件 Base64，且会根据 `sources-report.json` 的 14 天可靠性评分过滤掉低于 `FREENODE_RELIABILITY_FLOOR` 的源。不直接运行，由 `update.py` 导入。

主要函数：`crawl()`、`fetch_source()`、`fetch()`（重试包装）、`maybe_decode_base64()`、`_fetch_with_httpx()`（带上限的流式读取）。

### parser.py — 链接解析器

库模块。将原始文本和代理 API 响应转换为结构化节点链接。

- `extract_node_links()` — 从文本块中提取所有分享链接。
- `parse_ss_link()` / `parse_trojan_link()` / `parse_vless_link()` / `parse_hysteria_link()` / `parse_hysteria2_link()` / `parse_tuic_link()` / `decode_vmess()` — 各协议解析器。
- `parse_proxy_api_response()` — 处理代理 API/列表格式。
- `node_to_clash_config()` — 将链接转为 Clash 配置条目。

### verifier.py — 连通性检测器

库模块。判断哪些节点实际可用。

- `tcp_check()` — TCP 连接延迟（毫秒）。
- `verify_node_protocol()` — 两阶段检测：TCP 连接 + 轻量协议级握手。
- `verify_nodes()` — 批量执行上述检测。
- `stats_summary()` — 生存率、平均延迟、地区分布。
- `query_geo_api()` — 可选地区查询（免费 IP 地理 API，24 小时缓存）。
- `can_reach_public_internet()` — 用于 `update.py` 在离线 CI 中跳过验证。

### dedup.py — 去重模块

库模块。镜像源之间经常复制相同节点（不同备注/编码/顺序）。`dedup_by_fingerprint()` 按 `(protocol, server, port, auth_secret)` 计算内容指纹，保留首次出现，在进行网络验证前大幅缩减候选集。

### formatter.py — 输出格式化

库模块，也是唯一真正写文件的模块。

- `to_clash_yaml()` / `to_clash_yaml_by_protocol()` — Clash 订阅。
- `to_v2ray_subscription()` — V2Ray/通用订阅文本。
- `to_proxy_list()` — 纯文本 `host:port` 代理列表。
- `to_quality_report()` — `nodes/quality.json` 每日质量快照。
- `write_outputs()` — 原子写入上述所有内容 + 地区分组。

### utils.py — 公共工具函数

库模块，全流水线共用。

- 日志：`setup_logging()`、`get_logger()`。
- Base64：`safe_b64decode()`、`_pad_base64()`、`decode_bytes()`（UTF-8 → GBK → latin-1 回退）。
- **SSRF 防御**：`validate_url()` 拒绝非 HTTPS/非预期主机、`is_private_host()` 和 `allowed_hosts()` 屏蔽私有和保留 IP 段。
- `load_sources()` — 加载并最小验证 `sources.json`。
- `protocol_of()` — 检测链接协议（将 `hy2` 归一化为 `hysteria2`）。

## 配置说明

### sources.json

JSON 对象，内含 `free_node_sources` 数组，每一项是一个公开源：

```json
{
  "name": "example-source",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/owner/repo/main/sub",
  "enabled": true,
  "decode_base64": true,
  "update_interval": "daily",
  "protocols": ["vmess", "vless", "ss", "trojan"],
  "note": "该源的说明。"
}
```

`type` 支持：`github_raw` / `web_url` / `html` / `git_repo` / `rss`。
`decode_base64` 控制全文件 Base64 解码；`protocols` 过滤要保留的链接类型；`enabled: false` 保留条目但不抓取。

### 环境变量

所有行为可通过环境变量调整，无需改代码。详见 `.env.example`。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `FREENODE_LOG_LEVEL` | `INFO` | 日志详细程度。 |
| `FREENODE_VERIFY_NODES` | `true` | 是否验证节点可达性。 |
| `FREENODE_VERIFY_TIMEOUT` | `5` | 单节点连接超时（秒）。 |
| `FREENODE_VERIFY_WORKERS` | `50` | 并发验证数。 |
| `FREENODE_MAX_NODES` | `800` | 输出保留最大节点数。 |
| `FREENODE_MAX_PROXIES` | `300` | 输出保留最大代理数。 |
| `FREENODE_CRAWL_WORKERS` | _自动_ | 并发抓取数。 |
| `FREENODE_ALLOWED_HOSTS` | `raw.githubusercontent.com,gitcode.com,api.gitcode.com` | 抓取域名白名单（SSRF 防护）。 |
| `FREENODE_RELIABILITY_FLOOR` | _无_ | 低于此 14 天可靠性百分比的源将被过滤。 |
| `FREENODE_GEO_ENABLED` | `false` | 按地区分组节点（需连接 geo API）。 |

## 输出文件

全部写入 `nodes/` 目录。

| 文件 | 用途 |
|---|---|
| `clash.yaml` | Clash 订阅。 |
| `v2ray.txt` | V2Ray/通用订阅。 |
| `proxies.txt` | 纯文本 HTTP(S)/SOCKS 代理列表。 |
| `regions.json` | 按协议/地区分组的节点。 |
| `quality.json` | 当日质量快照（总数、存活率、平均延迟、失败原因）。 |
| `sources-report.json` | 每个源过去 14 天的可靠性评分。 |
| `discovered-sources.json` | `discover_sources.py` 发现的候选源（`enabled: false`）。 |

## 每日自动更新

`.github/workflows/update-nodes.yml` 每天 UTC 02:00 执行 `python scripts/update.py --verify`，自动提交更新后的 `nodes/`。也可以到仓库的 **Actions** 页面手动触发。

如果 CI 运行器限制出站端口导致验证全失败（输出为空），将工作流中的 `--verify` 改为 `--no-verify`。

## 开发

```bash
make test    # 运行 tests/ 测试套件
make lint    # ruff 代码检查
make update  # 等价于 `python scripts/update.py`
```

## 许可证

本项目采用 [MIT 许可证](LICENSE)。自由使用、修改和再分发，需保留版权声明。

## 其他语言

- English: [README.md](README.md)
- 日本語: [README.ja.md](README.ja.md)
