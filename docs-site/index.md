---
layout: home

hero:
  name: FreeNode
  text: 文档中心
  tagline: 免费公开代理 / VPN 节点聚合项目的使用指南、数据源说明与自动化工作流。
  image:
    src: /logo.svg
    alt: FreeNode
  actions:
    - theme: brand
      text: 新手指南
      link: /beginner-guide
    - theme: alt
      text: 查看数据源
      link: /data-sources
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/MS33834/freenode
    - theme: alt
      text: 返回展示页
      link: https://ms33834.github.io/freenode/

features:
  - icon: 📡
    title: 多格式订阅
    details: 同时提供 Clash、V2Ray 与 HTTP(S)/SOCKS4/SOCKS5 三种格式，覆盖主流客户端与使用场景。
  - icon: 🔄
    title: 每日自动更新
    details: GitHub Actions 每天 UTC 02:00 自动抓取、解析、校验并发布最新节点。
  - icon: 🔍
    title: 数据源透明
    details: 所有公开数据源与更新频率均可在 config/sources.json 中审计与贡献。
  - icon: 🛡️
    title: 安全提示
    details: 明确的使用边界与免责声明，帮助用户安全、合法地使用公开节点。
  - icon: 🏗️
    title: 架构清晰
    details: 配置、抓取、解析、校验、格式化、部署六个步骤流水线化，便于理解与扩展。
  - icon: 🤝
    title: 社区共建
    details: 完善的新手文档、贡献指南与客户端对比，欢迎提交数据源、代码与文档改进。
---

## 快速开始

1. **选择客户端**：根据设备平台查看 [客户端配置](/client-setup/clash)。
2. **复制订阅链接**：在 [README](https://github.com/MS33834/freenode#quick-start) 中选择 Clash、V2Ray 或 HTTP(S)/SOCKS4/SOCKS5 订阅地址。
3. **导入并更新**：将订阅链接粘贴到客户端中，点击更新即可获取当日节点。
4. **连接使用**：选择一个节点连接。免费节点稳定性有限，可等待次日自动更新。

> ⚠️ **免责声明**：本项目所有节点均来自互联网公开渠道，仅供学习网络协议、安全测试和隐私技术研究使用。使用时请遵守当地法律法规，不要在免费代理/节点环境下登录敏感账户。

## 文档导航

### 开始使用

刚接触 FreeNode？从这里起步。

- [新手指南](/beginner-guide) — 从零理解代理/节点概念，3 步完成首次配置。
- [常见问题 FAQ](/faq) — 节点失效、订阅更新、格式选择等高频问题解答。
- [客户端对比](/advanced/client-comparison) — 各平台客户端功能与适用场景对比。

### 客户端配置

按平台查看图文配置教程。

- [Clash Verge Rev](/client-setup/clash-verge-rev) — Windows / macOS / Linux
- [v2rayN](/client-setup/v2rayn) — Windows
- [v2rayNG](/client-setup/v2rayng) — Android
- [Shadowrocket](/client-setup/shadowrocket) — iOS
- [Clash / Clash Verge（旧版）](/client-setup/clash) — 兼容旧版 Clash 客户端

### 项目参考

了解 FreeNode 的工作原理、数据来源与安全合规事项。

- [项目架构](/architecture) — 配置、抓取、解析、校验、格式化、部署流水线说明。
- [安全与合规](/security) — 节点安全风险、安全使用建议与合规声明。
- [数据源说明](/data-sources) — 当前聚合的所有公开数据源清单。
- [数据源贡献指南](/data-source-guide) — 如何提交新的数据源。
- [自动化工作流](/automation) — GitHub Actions 定时更新机制。
- [项目状态](/status) — 当前运行状态与历史记录。

### 开发与运维

面向贡献者与自部署用户。

- [开发指南](/development) — 本地环境搭建与代码规范。
- [部署说明](/deployment) — 自部署 Web 站点与订阅服务。
- [维护手册](/maintenance) — 日常维护与故障排查。

### 参与贡献

- [参与贡献](/contributing) — 贡献代码、数据源与文档的方式。
- [项目概览](/project-overview) — 项目定位、功能与使用教程。
- [未来方向](/future-directions) — 可探索的扩展方向，非承诺。
- [更新日志](/changelog) — 版本变更记录。
