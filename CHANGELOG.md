# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### Added
- 网站视觉重构：赛博朋克风 + 玻璃态 + 协议环形 SVG
- 站内搜索（fuzzy search + `/` 快捷键）
- 数据新鲜度指示器（fresh / stale / outdated）
- 二维码纯 JS 内联生成（无第三方 API 依赖）
- 数据快照归档（`nodes/archive/YYYY-MMDD/`，保留 30 天，便于回滚）
- 验证抖动重试（`FREENODE_VERIFY_RETRIES`，减少假阴性误杀）
- 验证前预截断（`FREENODE_VERIFY_CAP`，避免节点激增耗时爆炸）
- 可疑网段黑名单（`FREENODE_SUSPICIOUS_NETS`，蜜罐/Tor exit 防护）
- 订阅可达性检测（前端 HEAD 探活，失败自动展开镜像）
- SEO 基础（Open Graph / Twitter Card / sitemap.xml / robots.txt）
- Jekyll include 组件系统（section-title / stat-card / sub-card / meta-seo）

### Changed
- GitHub Actions 改为手动触发 + PR 模式（不再 schedule cron）
- Workflow 加 jekyll build 验证步骤（失败则不创建 PR）
- Workflow 加自动关闭旧 PR 步骤（避免 PR 堆积）
- 配色收敛：3 主霓虹 × 17 色 → 青为主 + 紫作辅助 + 语义色
- 字体加载改异步 + onerror fallback（避免 Google Fonts 被墙首屏白屏）
- 数据源目录改卡片网格（移动端友好）

### Fixed
- Crawler 加 429 + Retry-After 退避
- 文案与实际机制矛盾（"每日自动" → "手动触发 + PR"）
- 移动端 backdrop-filter 满屏导致卡顿
- prefers-reduced-motion JS 降级（CountUp/Tilt/Ripple）

## [1.0.0] - 2026-07-16

### Added
- 首次发布：节点采集流水线（crawler/parser/dedup/verifier/formatter）
- 6 协议解析（vmess/vless/ss/trojan/hysteria/hysteria2/tuic）
- TCP + 协议握手二段验证
- 84 个社区公开数据源
- Clash / V2Ray / 代理列表三种订阅格式输出
- 14 天滚动数据源可靠性报告
- 新源灰度准入机制（observing → active）
- GitHub Actions 自动化
- Jekyll 站点（首页 / 数据源目录 / 协议指南 / 关于）
- 完整测试套件（171 个测试）
