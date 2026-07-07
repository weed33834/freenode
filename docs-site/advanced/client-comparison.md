# 客户端对比

FreeNode 提供 Clash、V2Ray、HTTP(S)/SOCKS4/SOCKS5 三种订阅格式，几乎覆盖所有主流代理客户端。本页对比各平台常用客户端，帮助你根据设备、协议需求与预算选择合适的工具。

## 快速选择建议

| 场景 | 推荐客户端 | 订阅格式 |
|---|---|---|
| Windows 桌面，免费开源 | v2rayN / Clash Verge Rev | V2Ray / Clash |
| macOS 桌面，免费开源 | Clash Verge Rev / V2RayU | Clash / V2Ray |
| Android，免费开源 | v2rayNG / NekoBox | V2Ray |
| iOS，预算充足 | Shadowrocket / Surge / Quantumult X | V2Ray |
| 浏览器分流 | SwitchyOmega / FoxyProxy | HTTP(S)/SOCKS4/SOCKS5 |
| 跨平台、协议最新 | Sing-box / Hiddify | Clash / V2Ray |

## 客户端详细对比

### Clash 系列

| 客户端 | 适用平台 | 支持协议 | 费用 | 开源 | 导入方式 |
|---|---|---|---|---|---|
| Clash Verge Rev | Windows / macOS / Linux | SS / VMess / VLESS / Trojan / Hysteria2 | 免费 | 是 | 下载 `clash.yaml` 或粘贴订阅 URL |
| Clash Meta（mihomo） | 多平台内核 | SS / VMess / VLESS / Trojan / Hysteria2 / TUIC | 免费 | 是 | 作为核心被其他 GUI 调用 |
| Clash for Windows | Windows / macOS / Linux | SS / VMess / VLESS / Trojan | 免费 | 是 | 粘贴 Clash 订阅 URL 或导入本地 YAML |
| Stash | iOS / macOS / tvOS | SS / VMess / VLESS / Trojan | 付费 | 否 | 粘贴 Clash 订阅 URL |

**特点**：Clash 系列配置统一为 YAML，规则分流能力强，适合需要细粒度流量控制的用户。Clash Verge Rev 是当前桌面端维护最活跃的 Clash GUI 之一。

### v2ray 系列

| 客户端 | 适用平台 | 支持协议 | 费用 | 开源 | 导入方式 |
|---|---|---|---|---|---|
| v2rayN | Windows | VMess / VLESS / Trojan / SS / Hysteria2 | 免费 | 是 | 粘贴 V2Ray 订阅 URL，或从剪贴板导入 |
| v2rayNG | Android | VMess / VLESS / Trojan / SS / Hysteria2 | 免费 | 是 | 从 URL 导入订阅，或扫描二维码 |
| V2RayU | macOS | VMess / VLESS / Trojan / SS | 免费 | 是 | 粘贴订阅 URL 或手动添加节点 |
| NekoBox / NekoRay | Android / Windows | VMess / VLESS / Trojan / SS / Hysteria2 / TUIC | 免费 | 是 | 粘贴 V2Ray 订阅 URL |

**特点**：v2ray 系列基于 V2Ray/Xray/sing-box 内核，更新及时、协议支持全面，是免费开源用户的首选。

### iOS 客户端

| 客户端 | 适用平台 | 支持协议 | 费用 | 开源 | 导入方式 |
|---|---|---|---|---|---|
| Shadowrocket | iOS / iPadOS / tvOS | VMess / VLESS / Trojan / SS / Hysteria2 等 | 付费 | 否 | 添加 Subscribe 类型节点，粘贴 V2Ray 订阅 URL |
| Quantumult X | iOS / iPadOS | VMess / VLESS / Trojan / SS | 付费 | 否 | 粘贴订阅或重写规则 |
| Surge | iOS / macOS / tvOS | VMess / VLESS / Trojan / SS / Hysteria2 | 付费 | 否 | 粘贴订阅 URL，支持高级规则与脚本 |

**特点**：iOS 平台由于系统限制，优质客户端多为付费应用。Shadowrocket 上手最简单；Surge 与 Quantumult X 提供更高级的分流与自动化能力。

### 其他跨平台客户端

| 客户端 | 适用平台 | 支持协议 | 费用 | 开源 | 导入方式 |
|---|---|---|---|---|---|
| Hiddify | Windows / macOS / Android / iOS / Linux | VMess / VLESS / Trojan / SS / Hysteria2 / TUIC / WireGuard | 免费 | 是 | 粘贴 V2Ray / Clash 订阅 URL，或扫描二维码 |
| Sing-box | Windows / macOS / Android / iOS / Linux / 路由器 | 几乎所有主流协议 | 免费 | 是 | 粘贴 JSON / Clash / V2Ray 订阅 |
| Nekoray | Windows / Linux | VMess / VLESS / Trojan / SS / Hysteria2 | 免费 | 是 | 粘贴 V2Ray 订阅 URL |

**特点**：

- **Hiddify**：界面现代、多平台支持好，适合新手与进阶用户。
- **Sing-box**：新一代通用代理平台，协议支持最全面，适合需要最新协议或自定义配置的用户。
- **Nekoray**：Windows/Linux 上轻量且功能齐全的 v2ray 客户端。

## 协议与订阅格式对应关系

| 协议 | 常见链接格式 | 推荐订阅 |
|---|---|---|
| Shadowsocks (SS) | `ss://...` | V2Ray |
| VMess | `vmess://...` | V2Ray |
| VLESS | `vless://...` | V2Ray |
| Trojan | `trojan://...` | V2Ray |
| Hysteria / Hysteria2 | `hysteria2://...` | V2Ray（部分客户端需手动配置） |
| HTTP / HTTPS / SOCKS4 / SOCKS5 | `ip:port` | `nodes/proxies.txt` |

## 导入方式速查

### Clash 订阅 URL

```
https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml
```

适用：Clash Verge Rev、Clash Meta、Clash for Windows、Stash、Surge、Hiddify、Sing-box 等。

### V2Ray 订阅 URL

```
https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt
```

适用：v2rayN、v2rayNG、Shadowrocket、NekoBox、NekoRay、Quantumult X、V2RayU、Hiddify、Sing-box 等。

### HTTP(S)/SOCKS4/SOCKS5 代理列表

```
https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt
```

适用：SwitchyOmega、FoxyProxy、curl、Python requests、浏览器扩展等。

## 注意事项

- **免费节点时效性短**：无论使用哪个客户端，都建议每天更新一次订阅。
- **iOS 客户端请从官方商店购买**：不要安装来源不明的“免费版”Shadowrocket 等应用。
- **客户端更新**：保持客户端为最新版本，以获得对新协议与安全的支持。
- **合法合规**：请遵守所在国家或地区的法律法规，仅在允许的场景下使用。

## 相关页面

- [客户端配置：Clash](/client-setup/clash)
- [客户端配置：v2rayN](/client-setup/v2rayn)
- [客户端配置：v2rayNG](/client-setup/v2rayng)
- [客户端配置：Shadowrocket](/client-setup/shadowrocket)
- [数据源说明](/data-sources)
