# Clash Verge Rev 配置教程

Clash Verge Rev 是 Clash 系客户端在 Windows、macOS 与 Linux 上的主流图形化分支，支持 Clash / Clash Meta 内核，适合使用 FreeNode 的 Clash 订阅。

## 适用平台

- Windows 10 / 11
- macOS（Intel / Apple Silicon）
- Linux（AppImage / deb / rpm）

## 准备工作

1. 访问 [Clash Verge Rev 官方 Releases](https://github.com/clash-verge-rev/clash-verge-rev/releases) 下载对应系统的安装包。
2. 安装并启动 Clash Verge Rev。
3. 首次启动时允许应用安装系统服务 / TUN 组件（Windows 可能需要管理员权限）。

## 配置步骤

1. 打开 Clash Verge Rev，进入 **订阅**（Profiles）标签页。
2. 点击 **导入** 或 **新建** 按钮。
3. 在 URL 输入框中粘贴 FreeNode 的 Clash 订阅地址：
   ```
   {{github_url}}/nodes/clash.yaml
   ```
4. 点击 **下载** 或 **导入**，等待客户端拉取配置文件。
5. 配置下载成功后，在 **代理**（Proxies）页选择一个延迟较低的节点。
6. 回到 **首页**，打开 **系统代理** 开关。
7. 如需全局代理，可在 **设置** → **系统代理设置** 中选择 **全局模式**。

## 更新订阅

- 在 **订阅** 页右键点击配置文件，选择 **更新**。
- 或在设置中开启 **启动时自动更新订阅**。

FreeNode 节点按需更新（手动触发流水线，或部署后端后由后端调度），建议定期在客户端手动更新订阅。

## 常见错误排查

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 订阅下载失败，提示 timeout | GitHub Raw 被 DNS 污染或网络不通 | 尝试更换 DNS、开启系统代理后再更新，或使用镜像加速地址 |
| 导入后没有节点 | 配置文件格式不兼容 | 确认订阅是 `clash.yaml` 格式，而非 V2Ray / Base64 |
| 所有节点延迟显示 timeout | 节点已失效或本地防火墙拦截 | 切换不同节点测试，或等待次日自动更新 |
| 提示 "内核启动失败" | 系统服务未正确安装 | 以管理员身份重启 Clash Verge Rev，重新安装服务 |
| 浏览器无法访问外网 | 系统代理未开启或规则模式排除该域名 | 切换到全局模式测试，确认代理开关已打开 |

## 安全提示

> ⚠️ 公开节点由第三方维护，运营者可能查看、记录或篡改你的流量。请仅用于学习网络协议与隐私研究，不要在免费代理/节点环境下登录银行、支付、社交等敏感账户。

- 敏感操作请使用可信商业 VPN 或自建节点。
- 定期检查 Clash Verge Rev 的日志，观察是否有异常 DNS 解析或流量转发。
- 不要在公共网络或不信任的设备上长期保留订阅配置。
