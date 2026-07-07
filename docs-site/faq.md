# 常见问题

## 为什么所有节点都失效了？

免费公开节点生命周期很短，几小时内可能全部或大部分离线属于正常现象。等待下一次每日更新，或在 Issues 中报告失效的数据源。

## 这个项目合法吗？

本项目仅聚合公开可访问的资源，用于教育和研究目的。用户需自行遵守所在国家或地区的法律法规。

## 可以使用这些节点进行敏感操作吗？

不可以。不要在免费公开节点下登录银行、支付或社交等敏感账户。节点运营者可能查看、记录或篡改你的流量。

## 节点多久更新一次？

GitHub Actions 每天 UTC 02:00 运行一次更新流程。你也可以在 Actions 标签页中手动触发。

## 如何添加新的数据源？

参见 [CONTRIBUTING.md](https://github.com/MS33834/freenode/blob/main/CONTRIBUTING.md)。提交一个编辑 `config/sources.json` 的 Pull Request 即可。

## 我的客户端里 GitCode 链接无法使用

GitCode 原始文件 URL 需要使用 API 端点。请使用 README 中提供的、指向 `api.gitcode.com` 的链接。

## Clash 和 V2Ray 格式有什么区别？

- **Clash** 格式是一个 YAML 文件，适用于 Clash 系客户端（Clash Verge Rev、Clash Meta、Clash for Windows、Stash、Surge 等）。
- **V2Ray** 格式是一个 Base64 编码的订阅链接列表，适用于 v2rayN、v2rayNG、Shadowrocket、NekoBox、Quantumult X 等基于 V2Ray/Xray 内核的客户端。
- **HTTP(S)/SOCKS4/SOCKS5** 格式是明文代理列表，适用于浏览器扩展、爬虫、curl 等工具。

## 为什么更新流程默认跳过验证？

连通性验证需要对每个节点发起出站 TCP 连接，耗时较长，也可能对公开源造成压力。你可以在本地通过 `FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify` 开启。

## 可以自己部署 Web UI 吗？

可以。`web/` 目录是一个 Next.js 静态站点。运行 `cd web && npm install && npm run build` 即可在 `web/dist` 中生成静态文件，可部署到任何静态托管服务。

## 如何报告安全问题？

请参见 [SECURITY.md](https://github.com/MS33834/freenode/blob/main/SECURITY.md) 中的负责任披露指南。

## v2rayN 更新订阅时提示 "404" 怎么办？

通常是订阅 URL 拼写错误，或 GitHub Raw 地址发生了变化。请检查是否使用的是 `{{github_url}}/nodes/v2ray.txt`，并确认网络可以访问 GitHub Raw。也可以尝试在浏览器中直接打开该链接验证。

## Clash Verge Rev 导入订阅后为什么没有节点？

请确认导入的是 Clash 格式订阅 `{{github_url}}/nodes/clash.yaml`，而不是 V2Ray / Base64 格式。如果 URL 正确但无节点，可能是配置文件为空或当日节点全部失效，等待次日更新后再试。

## Shadowrocket 订阅更新一直转圈怎么办？

iOS 设备在某些网络环境下访问 GitHub Raw 较慢。可尝试：切换到 4G/5G、更换 DNS（如 1.1.1.1）、或在 Wi-Fi 路由器上配置可访问 GitHub 的代理。

## v2rayNG 提示 "解析订阅失败" 是什么原因？

常见原因包括：订阅内容不是标准 V2Ray URL / Base64 格式、URL 返回了 HTML 页面而非纯文本、或剪贴板内容包含额外字符。请使用 `{{github_url}}/nodes/v2ray.txt` 并确保页面内容是 Base64 字符串。

## 我应该选择 Clash 还是 V2Ray 格式？

- 使用 **Clash / Clash Verge Rev / Clash Meta / Stash**：选择 Clash 格式 `clash.yaml`。
- 使用 **v2rayN、v2rayNG、Shadowrocket、NekoBox、Quantumult X**：选择 V2Ray / Base64 格式 `v2ray.txt`。
- 用于 **爬虫、脚本、命令行工具**：选择 HTTP代理 / JSON / TXT 格式。

## 节点延迟很低但无法打开网页？

可能是节点被 QoS、DNS 污染，或客户端路由规则排除了目标域名。尝试：切换全局模式、更换 DNS、测试其他节点，或检查客户端日志中的连接错误。

## 为什么不同客户端显示的节点数量不一样？

不同客户端对协议、加密方式、传输层的支持不同。例如 Clash 可能不支持某些特殊 VMess 配置，v2rayN 可能不支持某些 Clash 特有字段。这属于正常现象，选择支持你客户端的格式即可。

## 免费节点可以用来打游戏或看视频吗？

不建议。免费节点带宽、延迟和稳定性都无法保证，且运营者可能记录你的流量。观看视频或下载大文件也可能触发节点限速或被封禁。

## 如何保护自己的隐私？

- 不要在免费节点下登录敏感账户。
- 使用支持分应用代理的客户端，仅让必要应用走代理。
- 优先选择 HTTPS 网站，避免明文 HTTP 流量被截获。
- 定期更换订阅链接和节点。

## FreeNode 的 `{{github_url}}` 占位符代表什么？

`{{github_url}}` 代表 FreeNode 仓库的 Raw 内容基地址，通常对应 `https://raw.githubusercontent.com/MS33834/freenode/main`。完整订阅链接示例：

- V2Ray / Base64：`{{github_url}}/nodes/v2ray.txt`
- Clash：`{{github_url}}/nodes/clash.yaml`
- HTTP代理：`{{github_url}}/nodes/http.txt`
