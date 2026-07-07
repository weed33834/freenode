# 数据源贡献指南

FreeNode 不生产节点，只聚合互联网上公开可访问的节点与代理源。本指南说明我们收录数据源的标准、格式要求与提交方式。

## 收录标准

1. **公开可访问**：URL 无需登录、付费或特殊授权即可获取。
2. **持续更新**：最好有自动化更新机制（如 GitHub Actions）和明确的更新频率。
3. **格式兼容**：支持 v2ray Base64 订阅、纯文本节点链接、HTTP(S)/SOCKS4/SOCKS5 `ip:port` 列表。
4. **合法合规**：不得包含恶意软件、钓鱼或侵犯隐私的内容。

## 支持的格式

### 节点订阅

- **Base64 v2ray**：文件内容为 Base64 编码，解码后是 `vmess://`、`vless://`、`ss://`、`trojan://` 等链接。
- **纯文本链接**：每行一个节点链接，支持上述协议。

### 代理列表

- **带 scheme**：每行一个 `http://ip:port`、`socks4://ip:port` 或 `socks5://ip:port`。
- **纯 ip:port**：每行一个 `ip:port`，需要通过 `proxy_scheme` 字段指定默认协议。

## 配置示例

```json
{
  "name": "example-free-v2ray",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/owner/repo/main/subscription.txt",
  "enabled": true,
  "decode_base64": true,
  "update_interval": "daily",
  "protocols": ["vmess", "vless", "ss", "trojan"],
  "note": "Daily updated mixed-protocol subscription (Base64)."
}
```

代理列表示例：

```json
{
  "name": "example-proxy-list",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/owner/repo/main/http.txt",
  "enabled": true,
  "update_interval": "daily",
  "protocols": ["http"],
  "proxy_scheme": "http",
  "note": "Plain ip:port HTTP proxy list."
}
```

## 提交方式

1. Fork 仓库并创建特性分支。
2. 编辑 `config/sources.json`，在对应分类中添加条目。
3. 本地运行 `python3 scripts/update.py` 验证抓取与解析是否正常。
4. 提交 Pull Request，描述数据源来源、更新频率和测试结果。

如果不熟悉代码，也可以使用 [数据源报告 Issue 模板](https://github.com/MS33834/freenode/issues/new?template=source_report.md) 提交建议。

## 审核与维护

- 维护者会检查源的可访问性、内容格式和更新频率。
- 过大或过慢的源可能被默认禁用，需用户手动开启。
- 失效或长期不更新的源会被标记为 `enabled: false` 并从启用列表中移除。
