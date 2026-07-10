# 新手指南

欢迎使用 FreeNode！本指南面向完全没有接触过代理/VPN 节点的初学者，帮助你从零开始理解概念并完成首次配置。

## 什么是代理 / VPN 节点？

打个比方：你平时上网，就像直接从家里寄信给对方，邮递员（运营商）能看到你寄给谁、写了什么。而**代理（Proxy）**或 **VPN** 就像在中间多加了一个「中转站」——你的信先寄给中转站，由中转站帮你转交给对方，对方也只能看到中转站的地址，看不到你的真实地址。

这里的「中转站」就是一台位于世界某地的服务器，我们通常把它叫做一个**节点（Node）**。每个节点包含：

- **服务器地址**：中转站在哪里（IP 或域名 + 端口）。
- **协议**：用什么方式通信（如 VMess、VLESS、Trojan、Shadowsocks 等）。
- **加密方式**：如何把内容加密，防止被偷看。

通过把多个节点打包成一个**订阅链接（Subscription）**，客户端可以一次性导入并自动更新，无需逐个手动添加。

::: tip 代理和 VPN 有什么区别？
两者原理相似，都通过中转服务器转发流量。VPN 通常在系统底层接管**所有**网络流量，而代理可以按规则只代理部分应用或网站。FreeNode 提供的节点既可用于代理客户端，也可用于支持 VPN/TUN 模式的客户端。
:::

## FreeNode 能做什么？

FreeNode 是一个**免费公开代理 / VPN 节点聚合项目**。它每天自动从互联网公开渠道抓取、解析、校验节点，并以 Clash、V2Ray、HTTP(S)/SOCKS4/SOCKS5 三种格式发布订阅链接。你只需复制链接导入客户端即可使用，无需自己四处搜集节点。

## 三步快速开始

### 第 1 步：选择客户端

根据你的设备平台，从下表选择一个客户端并从官方渠道下载安装。

| 平台 | 推荐客户端 | 教程 |
|---|---|---|
| Windows | v2rayN、Clash Verge Rev、FlClash | [v2rayN 教程](/client-setup/v2rayn) / [Clash 教程](/client-setup/clash) |
| macOS | Clash Verge Rev、FlClash、Surge | [Clash 教程](/client-setup/clash) |
| Android | v2rayNG、NekoBox、FlClash | [v2rayNG 教程](/client-setup/v2rayng) |
| iOS | Shadowrocket、Stash、Quantumult X | [Shadowrocket 教程](/client-setup/shadowrocket) |
| 浏览器 | SwitchyOmega、FoxyProxy、SmartProxy | [浏览器扩展](https://github.com/MS33834/freenode/blob/main/tools/browser-extensions.md) |

> 新手首选：Windows 用 **Clash Verge Rev** 或 **v2rayN**，Android 用 **v2rayNG**，iOS 用 **Shadowrocket**。

### 第 2 步：复制订阅链接

前往 [README 快速开始](https://github.com/MS33834/freenode#quick-start)，根据你的客户端选择对应格式的订阅地址并复制：

| 客户端类型 | 推荐格式 |
|---|---|
| Clash Verge Rev、Clash Meta、Clash for Windows、Stash | Clash |
| v2rayN、v2rayNG、Shadowrocket、NekoBox、Quantumult X、Hiddify | V2Ray |
| Surge、Sing-box | Clash / V2Ray（取决于导入方式） |
| SwitchyOmega、FoxyProxy、SmartProxy、curl、Python requests | HTTP(S)/SOCKS4/SOCKS5 |

::: warning 注意
请只从 FreeNode 官方仓库复制订阅链接，不要使用来路不明的第三方链接。
:::

### 第 3 步：导入并使用

将订阅链接粘贴到客户端中，点击「更新订阅」即可获取当日节点，然后从节点列表中选择一个并连接。具体操作见下方分步示例。

---

## 分步示例：Windows 上的 v2rayN

1. 从 [2dust/v2rayN](https://github.com/2dust/v2rayN/releases) 下载 v2rayN。
2. 解压并运行程序。
3. 从 README 复制 V2Ray 订阅链接。
4. 在 v2rayN 中，进入 **订阅** → **从剪贴板导入订阅**。
5. 点击 **订阅** → **更新订阅**。
6. 从列表中选择一个节点并按 **回车键** 激活。

## 分步示例：Clash Verge Rev

1. 从 [官方发布页](https://github.com/clash-verge-rev/clash-verge-rev/releases) 下载 Clash Verge Rev。
2. 安装并运行程序。
3. 从 README 复制 Clash 订阅链接。
4. 在 Clash Verge Rev 中，进入 **配置文件** 并粘贴链接。
5. 下载配置文件并选中它。
6. 在 **代理** 标签页中选择一个节点，并启用 **系统代理**。

## 常见问题

### 1. 订阅无法更新，提示网络错误怎么办？

通常是网络环境屏蔽了 GitHub Raw 地址。可尝试使用 README 中提供的 GitCode Raw 镜像链接，或更换网络环境后重试。

### 2. 所有节点都连不上 / 全部超时怎么办？

免费公开节点生命周期很短，几小时内大部分离线属于正常现象。请等待下一次每日自动更新（UTC 02:00），或在客户端中手动刷新订阅。

### 3. 客户端提示「配置无效」或「解析失败」怎么办？

多半是订阅格式与客户端不匹配。请确认你复制的是正确格式：Clash 系客户端用 Clash 链接，V2Ray 系客户端用 V2Ray 链接。参见上方「第 2 步」的格式对照表。

### 4. Clash 和 V2Ray 格式有什么区别？

- **Clash** 是一个 YAML 配置文件，适用于 Clash 系客户端。
- **V2Ray** 是 Base64 编码的节点链接列表，适用于 v2rayN、v2rayNG、Shadowrocket 等基于 V2Ray/Xray 内核的客户端。
- **HTTP(S)/SOCKS4/SOCKS5** 是明文代理列表，适用于浏览器扩展、爬虫、curl 等工具。

### 5. 连接速度很慢怎么办？

免费节点质量参差不齐。建议在客户端中尝试多个不同节点，优先选择延迟较低的地区；也可在本地运行 `FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify` 开启连通性验证，自动过滤掉失效节点。

### 6. 节点多久更新一次？

节点更新现已改为按需运行：在仓库的 Actions 标签页手动触发 `Update Nodes` 工作流，或本地运行 `python3 scripts/update.py`；部署后端后由后端调度自动更新。

### 7. 可以用这些节点登录银行或支付账户吗？

**不可以。** 免费公开节点的运营者可能查看、记录或篡改你的流量。请勿在免费节点下登录银行、支付、邮箱或社交等敏感账户。

## 安全注意事项

- **不要在免费公开节点下登录敏感账户**：银行、支付、邮箱、社交账户等一律避免，节点运营者可能查看或篡改你的流量。
- **只从官方渠道下载客户端**：避免使用来路不明的破解版或修改版，它们可能植入后门。FreeNode 推荐的客户端均来自官方开源仓库或应用商店。
- **优先选择开源客户端**：开源客户端的代码可被公开审计，安全性更有保障。
- **保持客户端和订阅链接为最新**：及时更新客户端版本，并使用最新的订阅链接以获取可用节点。
- **警惕索要个人信息的节点**：如果某个节点或服务要求你提供个人信息、注册账号或付费，请立即停止使用。
- **遵守当地法律法规**：本项目仅供学习网络协议、安全测试和隐私技术研究使用，使用时请遵守你所在国家或地区的法律法规。

## 故障排查速查表

| 问题 | 可能原因 | 解决方案 |
|---|---|---|
| 订阅无法更新 | 网络屏蔽了 GitHub Raw | 尝试 GitCode Raw 镜像 |
| 所有节点都超时 | 节点已过期 | 等待下一次每日更新或换用其他数据源 |
| 客户端提示「配置无效」 | 格式不匹配 | 确保导入了正确格式（Clash 或 V2Ray） |
| 连接速度很慢 | 节点质量不一 | 尝试多个节点，或在本地启用验证 |
| 节点能连但打不开网页 | DNS 或规则问题 | 检查客户端规则配置，或更换节点 |

---

> 想了解更多？请继续阅读 [常见问题 FAQ](/faq) 或 [客户端配置教程](/client-setup/clash)。
