# 数据源说明

FreeNode 不生产、不运营任何代理节点，所有内容均来自互联网公开渠道。数据源配置完全公开，任何人都可以审计、替换或贡献新的公开源。

## 配置文件

所有数据源都登记在仓库根目录的 [`config/sources.json`](https://github.com/MS33834/freenode/blob/main/config/sources.json) 中。该文件分为两大类：

- `free_node_sources`：V2Ray/Clash 系免费节点订阅源。
- `free_proxy_apis`：HTTP(S)/SOCKS4/SOCKS5 公开代理列表 API。

## 节点源（free_node_sources）

下面列出部分代表性节点源，完整清单（含启用/禁用状态）请查看仓库中的 [`config/sources.json`](https://github.com/MS33834/freenode/blob/main/config/sources.json)。

| 名称 | 类型 | 更新频率 | 协议 | 说明 |
|---|---|---|---|---|
| `pawdroid-free-servers` | GitHub Raw | daily | vmess, vless, ss, trojan | 每日更新的混合协议订阅（Base64） |
| `mfuu-v2ray` | GitHub Raw | daily | vmess, vless | 每日更新的 v2ray 节点池（Base64） |
| `ebrasha-free-v2ray` | GitHub Raw | 30min | vless, vmess | 每 30 分钟更新，明文 vless/vmess 链接 |
| `caijh-free-proxies-scraper` | GitHub Raw | daily | vmess, vless, ss | 每日更新的筛选节点（Base64） |
| `awesome-vpn-all` | GitHub Raw | daily | vmess, vless, ss, trojan | 社区高星项目，混合协议 Base64 订阅 |
| `mahdibland-shadowsocks-eternity` | GitHub Raw | daily | vmess, vless, ss, trojan | 每日自动合并的公开节点集合（Base64） |
| `ripaojiedian-freenode-sub` | GitHub Raw | daily | vmess, vless, ss, trojan | 每日更新的混合协议订阅（Base64） |
| `snakem982-proxypool-v2ray` | GitHub Raw | daily | vmess, vless | 免费代理池，v2ray 订阅（Base64） |
| `Ruk1ng001-freeSub-v2ray` | GitHub Raw | daily | vmess, vless, ss | 持续更新的免费 clash/v2ray 订阅（Base64） |
| `qjlxg-aggregator-v2ray` | GitHub Raw | daily | vmess, vless | 聚合公开节点，v2ray 格式（Base64） |
| `qjlxg-aggregator-nodes` | GitHub Raw | daily | vmess, vless, ss, trojan | 聚合公开节点，明文链接 |
| `nirevil-sstime` | GitHub Raw | daily | ss | NiREvil 收集的 Shadowsocks 节点 |
| `epodonios-v2ray-sub11` | GitHub Raw | daily | vless | Epodonios v2ray-configs 的 VLESS 订阅 Sub11 |
| `epodonios-v2ray-sub20` | GitHub Raw | daily | vless | Epodonios v2ray-configs 的 VLESS 订阅 Sub20 |

## 代理源（free_proxy_apis）

| 名称 | 类型 | 更新频率 | 协议 | 说明 |
|---|---|---|---|---|
| `proxifly-free-proxy-list` | GitHub Raw | 5min | http, https, socks4, socks5 | 公开 HTTP(S)/SOCKS4/SOCKS5 代理列表，每 5 分钟验证一次 |
| `TheSpeedX-http` | GitHub Raw | daily | http | TheSpeedX/PROXY-List 的 HTTP 代理列表 |
| `TheSpeedX-socks4` | GitHub Raw | daily | socks4 | TheSpeedX/PROXY-List 的 SOCKS4 代理列表 |
| `TheSpeedX-socks5` | GitHub Raw | daily | socks5 | TheSpeedX/PROXY-List 的 SOCKS5 代理列表 |
| `ErcinDedeoglu-http` | GitHub Raw | hourly | http | 每小时验证的 HTTP 代理列表 |
| `ErcinDedeoglu-https` | GitHub Raw | hourly | https | 每小时验证的 HTTPS 代理列表 |
| `ErcinDedeoglu-socks4` | GitHub Raw | hourly | socks4 | 每小时验证的 SOCKS4 代理列表 |
| `ErcinDedeoglu-socks5` | GitHub Raw | hourly | socks5 | 每小时验证的 SOCKS5 代理列表 |
| `jetkai-http` | GitHub Raw | hourly | http | 每小时在线测试的 HTTP 代理 |
| `jetkai-socks4` | GitHub Raw | hourly | socks4 | 每小时在线测试的 SOCKS4 代理 |
| `jetkai-socks5` | GitHub Raw | hourly | socks5 | 每小时在线测试的 SOCKS5 代理 |

## 字段说明

每个数据源对象包含以下字段：

| 字段 | 含义 |
|---|---|
| `name` | 数据源唯一标识 |
| `type` | 来源类型，目前多为 `github_raw` 或 `web_url` |
| `url` | 数据源的公开 URL |
| `enabled` | 是否启用该源 |
| `decode_base64` | 原始内容是否为 Base64 编码 |
| `update_interval` | 数据源的官方更新频率（仅供参考） |
| `protocols` | 该源可能包含的协议列表 |
| `max_size` | 可选，最大允许下载大小（字节） |
| `note` | 人工备注，说明源的特点与注意事项 |

## 贡献新数据源

如果你发现新的公开节点/代理源，欢迎提交 Pull Request：

1. Fork 本仓库。
2. 在 `config/sources.json` 中按现有格式添加新源，建议默认 `enabled: false`，由维护者审核后再开启。
3. 运行 `make test` 确保格式正确。
4. 提交 PR 并说明数据源的来源、更新频率与协议类型。

> ⚠️ 请勿提交私有/付费节点或破解软件链接。
