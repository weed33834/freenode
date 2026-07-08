# 更新日志

本页面汇总 FreeNode 仓库的关键变更。完整原始日志请查看仓库根目录的 [`CHANGELOG.md`](https://github.com/MS33834/freenode/blob/main/CHANGELOG.md)。

## [未发布]

### 新增

- 扩展 VitePress 文档站，新增[架构](/architecture)、[参与贡献](/contributing)、[路线图](/future-directions)、[更新日志](/changelog)、[项目状态](/status)与[客户端对比](/advanced/client-comparison)页面。
- 文档站首页特性卡片由 4 个扩展为 6 个，突出内容丰富度。
- 文档站顶部导航新增“参与贡献”与“状态”入口。

### 变更

- 整理并规范化 `config/sources.json` 中公开数据源的启用状态与说明。
- 优化 CI/CD 工作流触发条件，使文档、节点与前端变更能够更精准地触发部署。

### 修复

- 修复文档站构建产物在 GitHub Pages 子路径下的资源引用问题。

---

## [2025.06.23]

### 新增

- 在 VitePress 文档站中新增客户端配置系列页面：Clash、v2rayN、v2rayNG、Shadowrocket。
- 新增 `tools/` 平台工具索引，覆盖 Windows、macOS、Android、iOS 与浏览器扩展。

### 变更

- 主站 Next.js 页面支持实时节点统计、数据源透明度展示与客户端推荐。
- 文档站描述与 SEO 信息更新为中文。

---

## [2025.06.20]

### 新增

- 引入基于 GitHub Actions 的每日自动更新工作流 `update-nodes.yml`。
- 引入 `scripts/` 流水线脚本：`crawler.py`、`parser.py`、`verifier.py`、`formatter.py`、`update.py`。
- 输出三种订阅格式：`nodes/clash.yaml`、`nodes/v2ray.txt`、`nodes/proxies.txt`。
- 引入节点连通性验证与可选的地域分布统计。

### 变更

- 将数据源配置迁移到 `config/sources.json`，支持节点源与代理源分类管理。

---

## [2025.06.15]

### 新增

- 初始化 FreeNode 仓库，包含 CNCL 许可证、行为准则、安全政策与贡献指南。
- 创建 `docs/` 传统文档目录，包含首页、新手指南、FAQ 与客户端配置。
- 创建 `web/` Next.js 14 静态站点，用于展示项目主页、订阅、数据源与免责声明。

### 变更

- 确定项目基础目录结构：`config/`、`scripts/`、`nodes/`、`tests/`、`tools/`、`web/`、`docs-site/`。

---

## 格式说明

- **新增**：新功能、新页面或新数据源。
- **变更**：对现有功能、配置或行为的调整。
- **修复**：Bug 修复或稳定性改进。
- **移除**：已废弃或删除的功能、文件或数据源。
