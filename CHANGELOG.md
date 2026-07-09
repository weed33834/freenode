# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **打包缺失模块**：`pyproject.toml` 的 `[tool.setuptools]` 漏列 `dedup` 模块与 `adapters` 包，导致 `pip install freenode` 后 `freenode-update` 因 `ModuleNotFoundError: dedup` 启动失败。补全 `py-modules` 与 `packages`，CLI 入口恢复正常。
- **流水线默认值不一致**：`scripts/update.py` 的 `MAX_NODES`/`MAX_PROXIES` 默认 500/200，与 `backend/app/config.py`（800/300）及所有文档不符。统一为 800/300，消除「同一项目两套默认值」的困惑。

### Changed
- **backend 性能**：`pipeline_service._upsert_nodes` 与 `run_verify_pipeline` 的逐条 `SELECT/UPDATE`（N+1）改为单次 `IN` 批量预取 + 内存改写 + 批量提交，后台流水线 round-trip 由 O(N) 降到 O(1)。
- **scripts 去重**：`formatter._extract_host_from_link` 不再维护第二份按协议选 parser 的分发表，统一复用 `node_to_clash_config`，移除 7 个因此变成未使用的 parser import。
- **backend 清理**：`database.py` 去掉 SQLAlchemy 2.x 已废弃的 `future=True`；`rate_limit.TokenBucket._touch` 移除不可达分支；`subscriptions.subscription_plain` 复用 `_fetch_nodes` 消除重复查询；`jobs._cleanup_job` 懒加载 import 上移；alembic 失败日志改用 `logger.exception` 保留 traceback。
- **web 清理**：移除 `lib/admin-api.ts` 中未被引用的 `setAdminKey`/`isAuthed`/`getSourceLogs` 死代码；`components/subscribe-card.tsx` 移除多余的 `use client` 指令回归服务端组件。
- **scripts 微优化**：`utils.decode_bytes` 去掉不可达的 latin-1 兜底分支；`discover_sources._pick_primary_file` 由 `sorted(...)[0]` 改为 `min(...)`（O(n)）。

### Documentation
- 修正 `README.md` / `README.zh-CN.md` / `docs-site/architecture.md` 协议清单：补齐 `hysteria://`、`hysteria2://`、`tuic://`，并说明 `ssr://` 仅识别不输出。
- 修正 `README.zh-CN.md` / `docs-site/automation.md` / `docs-site/project-overview.md` 的环境变量默认值（`verify_nodes`/`max_nodes`/`max_proxies`）与代码对齐。
- `docs-site/development.md`：Python 版本要求 3.10+ → 3.12+（与 `pyproject.toml` 一致）。
- `docs-site/maintenance.md`：失效的数据源页面链接 `/sources` → `/docs/data-sources.html`。
- `docs-site/security-audit.md`：验证步骤路径 `/workspace/proxiehub` → `/workspace/freenode`。
- `docs-site/data-sources.md`：修正 `mahdibland-shadowsocks-eternity` 名称拼写，移除已不存在的 `gfpcom` 系列残留说明。
- `landing/index.html`：页脚许可证 MIT → CNCL（与 LICENSE 一致）。
- `.env.example`：默认值与代码对齐（800/300/true）。

## [1.4.0] - 2026-07-05

### Added
- **插件式适配器 API**：新建 `scripts/adapters/` 目录，定义 `SourceAdapter` 协议，按 `sources.json` 的 `type` 字段分发。内置 5 个 adapter：`github_raw`、`web_url`（从 crawler 抽出）、`html`（HTML 页面爬虫，支持 CSS-like selector，默认提取 `<pre>`/`<code>`）、`git_repo`（git clone --depth 1 + glob 匹配多文件）、`rss`（RSS/Atom feed 解析）。crawler.py 优先走 adapter，找不到退回旧逻辑，向后兼容。
- **Telegram 频道抓取**：新建 `scripts/telegram_source.py`，用 Telethon 抓取频道历史消息提取节点链接。支持文本消息 + 附件文件、速率限制（1 msg/s）、session 路径配置、CLI 入口。Telethon 为可选依赖，未安装时模块可 import、调用才报错。
- **协议级握手验证**：`scripts/verifier.py` 新增 `verify_node_protocol()` 二段验证。`verify_nodes` 加 `verify_level` 参数（`tcp`/`protocol`，环境变量 `FREENODE_VERIFY_LEVEL` 可控）。trojan 做 TLS 握手，ss 发探测字节检测立即 RST，vmess/vless/hysteria/tuic 走 TCP 层。
- **延迟排序 + 分协议输出**：`scripts/formatter.py` 输出按 latency_ms 升序排序（None 排最后，稳定排序）。新增 `to_clash_yaml_by_protocol()` 按协议分组生成独立 Clash 文件（`nodes/clash-vmess.yaml` 等），仅在 `verify_level=protocol` 时写。
- **PostgreSQL 支持**：`backend/docker-compose.yml` 加 `postgres:16-alpine` 服务（带 healthcheck + 持久化 volume），backend depends_on postgres。`.env` 通过 `FREENODE_DATABASE_URL` 切换 SQLite/PG。`backend/alembic/env.py` 修复 PG 同步驱动转换（asyncpg → psycopg2）。
- **去中心化分发**：新建 `scripts/publish_mirrors.py`，把 `nodes/` 发布到多镜像（IPFS Pinata / Cloudflare R2 / 本地目录），生成 `nodes/mirrors.json` 清单。GitHub Raw + GitCode Raw 固定写入，其他镜像按环境变量按需启用。某个镜像失败不影响其他。
- **安全审计报告**：新建 `docs-site/security-audit.md`，审计 SSRF / 内存爆炸 / 资源泄漏 / 密钥 / 注入 5 个维度，发现 15 项问题（2 High / 4 Medium / 5 Low / 4 Info）。

### Changed
- `scripts/crawler.py` `_fetch_source_safe` 优先走 adapter 注册表，找不到退回旧 `fetch_source`。
- `scripts/update.py` main() 读 `FREENODE_VERIFY_LEVEL` 传给 verify_nodes，日志记录级别，protocol 模式下写分协议文件。
- `scripts/verifier.py` `verify_nodes` 在 TCP connect 前先做 IP 私有地址预检，防 DNS rebinding SSRF。
- `scripts/utils.py` `safe_b64decode` 加 256KB 输入长度上限防内存爆炸。`validate_url` 在白名单前先做 `is_private_host` 检查。`is_private_host` 加 IPv6-mapped IPv4 检测 + CGNAT/TEST-NET 兜底。
- `scripts/parser.py` vmess 链接长度上限 512KB。`scripts/formatter.py` YAML 输出加控制字符清洗 + 引号转义防注入。
- `backend/app/config.py` Scheduler 段注释说明 PostgreSQL 切换方法。
- `docs-site/deployment.md` 补充 PostgreSQL 切换三步法 + 去中心化分发配置。
- `requirements.txt` 加 telethon 可选依赖。

### Security
- HIGH-1: `safe_b64decode` 加输入长度上限，防超大 base64 内存爆炸 DoS。
- HIGH-2: verifier 在 connect 前预检私有 IP，防 DNS rebinding SSRF。
- MEDIUM-1: `validate_url` 白名单前先做私有 IP 检查，运维误配也拦截。
- MEDIUM-2: `is_private_host` 显式处理 IPv6-mapped IPv4 + CGNAT/TEST-NET。
- LOW-4: formatter YAML 输出清洗控制字符 + 转义，防节点 name 注入。

## [1.3.0] - 2026-07-04

### Added
- **跨源指纹去重**：新建 `scripts/dedup.py`，按 (protocol, server, port, auth_secret) 内容指纹在 verify 之前去重。同一节点被多个源镜像转发的情况很常见，字符串去重会漏，指纹去重能砍掉一批重复候选。`update.py` main() 和 `backend/pipeline_service.run_full_pipeline` 都已接入。
- **协议扩展**：`scripts/parser.py` 新增 `parse_hysteria_link` / `parse_hysteria2_link` / `parse_tuic_link`，`node_to_clash_config` 支持输出这三种协议的 mihomo 配置。`scripts/formatter.py` 的 host/protocol 提取同步支持。`hysteria` / `hysteria2` / `tuic` 从 SKIPPED_SCHEMES 移到 OUTPUT_SCHEMES，`tuic://` 加入 LINK_PATTERNS。新增 13 个测试。
- **GitHub Search 数据源发现**：新建 `scripts/discover_sources.py`，用 GitHub Search API 搜索 free node 相关仓库，过滤 stars/fork/license，提取疑似订阅文件，输出到 `nodes/discovered-sources.json`（enabled=false 等人工审核）。支持 `--query` / `--min-stars` / `--max-results` / `--output` CLI 参数，读 `GITHUB_TOKEN` 环境变量做认证。新增 19 个测试。
- **调度拆分**：`backend/pipeline_service.py` 新增 `run_verify_pipeline(only_dead)`，只验证 DB 已有节点不重新 crawl。`backend/scheduler/jobs.py` 的 verify_alive job 改调 `run_verify_pipeline(only_dead=False)`（每30分钟复验存活节点），新增 verify_dead job 调 `run_verify_pipeline(only_dead=True)`（每6小时给死节点复活机会）。full_refresh 仍每天跑全量 crawl+verify。
- **自动禁用低分源**：`scripts/crawler.py` 新增 `FREENODE_RELIABILITY_FLOOR` 环境变量，reliability 低于阈值的源自动跳过（除非 sources.json 标了 `force_enabled: true`）。默认 0 不启用，避免误伤。

### Changed
- `scripts/update.py` main() 在字符串去重后、verify 前插入指纹去重，并打日志记录去掉了多少重复。
- `backend/app/config.py` Scheduler 段注释改成中文口语化，说明三个调度任务的区别。
- `backend/.env.example` 补充三个调度的中文说明。

## [1.2.6] - 2026-07-04

### Changed
- `docs-site/roadmap.md` 改造：已完成的计划移出，文件重写为 `docs-site/project-overview.md`（项目定位 / 功能 / 使用教程），未完成项拆到 `docs-site/future-directions.md` 作为"可探索的扩展方向，非承诺"。
- `docs-site/.vitepress/config.ts` 侧边栏"路线图"替换为"项目概览" + "未来方向"两项。
- `docs-site/index.md` 首页链接同步更新。
- `docs-site/deployment.md` 补充云服务器完整部署流程：准备服务器 / 配 .env（ADMIN_API_KEY + SECRET_KEY_HEX）/ 改 Caddyfile 域名 / 启动验证 / 架构图 / 生产建议（PostgreSQL / 资源限制 / 备份）/ 常见问题（Caddy 证书失败 / 调度器不跑 / 节点全死）。

### Added
- `docs-site/future-directions.md`：列出 15 个可探索方向，分三组——更智能的采集（GitHub Search API 发现、HTML 爬虫、Telegram 频道、Git 仓库克隆、RSS、跨源去重、协议扩展、插件式适配器、自动禁用低分源）、更智能的验证（协议级握手、延迟排序与分区域订阅）、运维加固（拆分 crawl/verify 调度、PostgreSQL、去中心化分发、安全审计）。每个方向写明动机与工作轮廓，标注"非承诺"。

## [1.2.5] - 2026-07-04

### Added
- 新增 `GOVERNANCE.md`：社区治理模型文档，定义 maintainer / contributor / source submitter 三种角色、决策流程、`main` 落库标准、数据源策略、安全与行为准则引用。
- 新增 `.github/workflows/source-check.yml`：在 `update-nodes` 跑完后自动读取 `nodes/sources-report.json`，对连续失败 ≥3 天的源开/更新带 `auto-source-health` 标签的 Issue，源恢复后自动关 Issue。
- `scripts/update.py` 新增 `_write_source_report()`：基于 `config/sources.json` 的 enabled 列表与 `crawl()` 返回结果，维护 14 天滚动的 `nodes/sources-report.json`，含每源 reliability_score 与每日 history。
- `scripts/formatter.py` 新增 `to_quality_report()` 及辅助函数 `_extract_protocol_from_link` / `_compute_protocol_stats` / `_compute_failure_reasons`：`write_outputs` 写出每日 `nodes/quality.json`，含总览、按协议分组、失败原因分布、地区分布。
- `pyproject.toml` 加 `[project.scripts] freenode-update = "update:main"` 与 `[tool.setuptools]` 配置，`pipx install freenode` 后可直接用 `freenode-update` 跑流水线。

### Changed
- `scripts/update.py` 在 `write_outputs()` 之后调用 `_write_source_report(raw)`，正式启用数据源可靠性评分。
- `.github/workflows/update-nodes.yml` 加 `timeout-minutes: 30`、`cache: pip`、`FREENODE_FETCH_TIMEOUT=25`、`FREENODE_FETCH_RETRIES=2` 环境变量，修掉单源慢拖垮整个 CI 的偶发超时。
- `docs-site/roadmap.md` 重写为英文，移出已完成项（VitePress 文档站、统一风格、双语 README、实时状态页、GitCode 镜像），保留未完成的短期/中期/长期项。

## [1.2.4] - 2026-07-04

### Changed
- 仓库文档全面英文化：README 改为英文为主，顶部加 `English | 简体中文` 切换链接到新建的 `README.zh-CN.md`。
- CONTRIBUTING / SECURITY / SUPPORT / AUTHORS / CODE_OF_CONDUCT / DEVELOPMENT 全部重写为英文，语气务实直接，去掉空泛形容词。
- `.github/ISSUE_TEMPLATE/bug_report.yml`、`feature_request.yml`、`config.yml`、`PULL_REQUEST_TEMPLATE.md` 全部英文化。
- GitHub 仓库 description 改为纯英文：`Community-curated aggregator of public proxy and node lists...`。
- GitCode 仓库 description 同步为英文（避开审核敏感词）。

### Added
- 新增 `README.zh-CN.md`：完整中文版 README，与英文版内容对齐，顶部 `English | 简体中文` 双向切换。

## [1.2.3] - 2026-07-04

### Added
- 新增 `backend/tests/test_crypto.py`（7 个测试）：覆盖 AES-GCM 加解密的明文透传、配 key 往返、nonce 随机性、错 key 解密失败、单例缓存。
- 新增 `backend/tests/test_security.py`（5 个测试）：覆盖 `require_admin` 的未配 key 503、key 不匹配 401、key 匹配通过、常量时间比较。
- 新增 `backend/tests/test_rate_limit.py`（11 个测试）：覆盖 `TokenBucket` 的初始突发、容量耗尽、时间补充、容量上限、key 隔离，以及 `_client_ip` 的 XFF 解析、`limit_public`/`limit_subscription` 放行。
- 新增 `backend/tests/test_cache.py`（6 个测试）：覆盖三个 TTL 缓存的配置、读写、`invalidate_all` 联动与幂等。
- 新增 `backend/tests/test_models.py`（14 个测试）：覆盖 `Node.compute_fingerprint` 的稳定性、协议/server/port/secret 变化、大小写不敏感、SHA256 实现验证，以及 `encrypt_secret`/`decrypt_secret` 透传、往返、解密失败兜底。
- 新增 `tests/test_update.py`（13 个测试）：覆盖 `_get_int_env` 的默认值/空值/合法值/非法值/零值，`_extract_node_links_safe`/`_extract_proxies_safe` 的正常解析/空文本/缺键错误。
- 新增 `tests/conftest.py` 与 `backend/tests/conftest.py`：共享 fixture（`tmp_sources_file`、`sample_vmess_link`、`clean_env`、`temp_db`、`reset_crypto_singleton`），消除跨测试污染。

### Changed
- `pyproject.toml` 加 `asyncio_mode = "auto"`（pytest-asyncio）、`[tool.coverage]` 配置（branch 覆盖、omit 测试/迁移文件、exclude `__main__`/`NotImplementedError`）。
- `requirements.txt` 补 `pytest-asyncio>=0.24.0`、`pytest-cov>=5.0.0`。
- `Makefile` 新增 `cov` target：跑测试并生成终端 + htmlcov/ 覆盖率报告。
- 测试总数从 80 提升到 136（+56），关键纯逻辑模块（crypto/security/models/cache/config）覆盖率 100%，总覆盖率 65%。

## [1.2.2] - 2026-07-04

### Added
- 新增 `pyproject.toml`：统一配置 ruff（line-length/target-version/select 规则）、pytest（testpaths/pythonpath）、mypy，作为现代 Python 项目标配。
- 新增 `tests/test_crawler.py`：15 个单元测试覆盖 `maybe_decode_base64` / `fetch_source` / `_fetch_source_safe` / `crawl` 的纯逻辑路径，不发起真实网络请求。
- 新增 `backend/tests/test_config.py`：4 个测试覆盖 `Settings` 默认值、环境变量覆盖、`get_settings` 缓存、路径解析。
- 新增根级 `.env.example`：补齐 `scripts/` 流水线用的环境变量示例（与 `backend/.env.example` 互补，后者管 API 服务）。

### Changed
- `Makefile` 的 `test` / `test-backend` 改用 `pytest` 统一跑，新增 `test-fast` 一把跑全部测试；配合 `pyproject.toml` 的 `testpaths` 配置。
- `backend/tests/test_api.py` 加 `test_api_endpoints` pytest 入口，保留 `__main__` 脚本式跑法，两种方式都能用。
- 根 `requirements.txt` 补 `pytest>=8.0.0`（CI 跑 `make test` 需要）。
- ruff 启用 `E/F/I/UP/SIM/B` 规则集，自动修复 36 处 import 排序与风格问题，对原有代码的模式（assert False、if-else 等）按 ignore 放行避免破坏。

## [1.2.1] - 2026-07-04

### Added
- 新增 CI 工作流：CodeQL 代码安全扫描（Python + JS/TS，每周一跑）、Stale bot（自动关停无活动 Issue/PR）、Labeler（PR 按路径自动打标）。
- 新增根级版本锁定：`.python-version`（3.12）、`.nvmrc`（20）。
- 新增根级 `.dockerignore` 与 `backend/.dockerignore`，避免把 `.git/`、`node_modules/`、构建产物等拷进镜像。
- 新增 `.github/labeler.yml`，覆盖 backend/frontend/docs/ci-cd/scripts/config/nodes/dependencies 八类标签。
- 后端 `requirements.txt` 补 `gunicorn`（Dockerfile CMD 实际依赖）。
- 后端 `.env.example` 补 `FREENODE_APP_NAME` 与 `FREENODE_SCHEDULE_CLEANUP` 配置项。
- web `package.json` 加 `engines.node>=20` 与 `type-sync` 脚本。
- README 加 Star 呼吁段与 star-history 图。

### Changed
- 后端 `main.py` 版本号改为从根 `VERSION` 文件读取，不再硬编码 1.0.0。
- CI 的 Python job 启用 pip 缓存，并补装 backend 依赖（跑 `make lint` 需要）。
- PR 模板加破坏性变更勾选项，检查清单补 schema 同步与 Alembic 迁移两项。
- `web/README.md` 从 create-next-app 默认模板重写为 FreeNode 专属说明。
- `web/.dockerignore` 补全 `.next/`、`.vercel/`、`.eslintcache` 等。

### Removed
- 删除冗余的 `docs/` 目录（旧版 Markdown，已被 `docs-site/` VitePress 版完整取代）。
- 删除工作区残留的 `web/dist/` 构建产物与 `.ruff_cache/`。

### Fixed
- `.github/ISSUE_TEMPLATE/config.yml` 文档入口从已删除的 `docs/` 改向 Pages 文档站。
- CONTRIBUTING.md、README.md、web/app/contribute/page.tsx 中 `docs/` 引用改为 `docs-site/`。
- `.gitignore` 补 `.ruff_cache/`、`.mypy_cache/`、`.pytest_cache/`、`coverage/`、`htmlcov/`、`*.egg`、`*.whl` 等常见漏项。

## [1.2.0] - 2026-06-23

### Added
- 新增网站页面：路线图、更新日志、参与贡献、架构说明、运行状态、关于、工具生态、社区。
- 数据源页面新增协议筛选、更新频率分布与数据源提交入口。
- 客户端教程扩展至 Clash Verge Rev、FlClash、v2rayN、v2rayNG、Shadowrocket、Surge、Nekoray、Hiddify、Sing-box 等。
- 运行状态面板，基于构建时读取节点文件生成实时统计。
- 数据源页面新增协议覆盖与更新频率分布概览。
- 新增仓库治理文件：CODEOWNERS、FUNDING.yml、release.yml、AUTHORS.md、SUPPORT.md、.gitattributes、VERSION。
- 新增开发运维文档：docs/development.md、docs/deployment.md、docs/maintenance.md。
- README 增加 Actions 状态徽章、社区支持入口与扩展页面说明。

### Improved
- 导航栏与页脚统一加入新增页面入口，并适配移动端菜单。
- 订阅页面补充各格式使用说明与客户端匹配建议。
- 首页新增架构流程 teaser、最新动态卡片与参与贡献 CTA。

### Fixed
- 统一全站协议表述为 HTTP(S)/SOCKS4/SOCKS5，修正页面与文档中的不一致。
- 客户端卡片统一使用外部锚点标签打开官方仓库，符合静态导出链接规范。
- 去除部分页面中的套话，使文案更直接、贴合 FreeNode 风格。
- 修复 formatter.py 存活率统计在全部节点失效时误报 100% 的逻辑错误。
- 修复 crawler.py 编码检测死代码（errors="ignore" 导致 gbk/latin-1 分支永不执行）。
- 修复 FREENODE_CRAWL_WORKERS=0 时 ThreadPoolExecutor 崩溃。
- 修复 parser.py 正则截断 IPv6 地址（排除 ] 导致 [2001:db8::1] 被切断）。
- 修复 vmess JSON 中 port/aid 为 null 时 int() 崩溃。
- 修复 verifier.py port=0 因 falsy 判断被误判为无端口。
- 修复 sources.json 数据源名称重复（ermaozi-get-subscribe-v2ray）。
- 移除 sources.json 中无效的 gfpcom wiki raw URL（GitHub Wiki 不可通过 raw 路径访问）。
- 修复 sources/page.tsx 免责声明链接未走 basePath 导致 GitHub Pages 404。
- 修复 formatter.py YAML 回退路径字符串未加引号可能生成无效 YAML。
- 修复 verifier.py geo 缓存读写未加锁的竞态条件。
- 修正 docs/development.md 中不存在的 --dry-run 参数说明。
- 修正 docs/deployment.md 工作流步骤顺序与实际不一致。
- Barabama-FreeNodes 数据源 URL 从 feature 分支改为 main 分支。

## [1.1.0] - 2026-06-15

### Added
- 支持三种输出格式：Clash YAML、V2Ray 订阅、HTTP/SOCKS5 代理列表。
- GitHub Actions 工作流：每日自动更新节点与自动部署网站。
- 双仓库同步：GitHub 主仓库与 GitCode 镜像同时更新。

### Improved
- 数据源配置迁移至 config/sources.json，支持单独启用/禁用。
- 新增基础 TCP 连通性校验，过滤明显不可用的节点。

### Fixed
- 修复多个数据源重叠导致的重复节点问题。

## [1.0.0] - 2026-06-01

### Added
- 搭建初始自动化流水线：爬虫、解析、格式化、校验。
- 使用 Next.js + Tailwind CSS 构建静态网站。
- 上线数据源透明度、免责声明与订阅说明页面。
