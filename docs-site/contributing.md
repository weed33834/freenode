# 参与贡献

感谢你对 FreeNode 感兴趣！无论你是想新增数据源、改进脚本、完善文档还是修复 Bug，本页都将帮助你快速上手。

## 贡献方式

### 1. 贡献数据源

这是最常见的贡献方式。只要数据源满足以下条件，就可以通过 Pull Request 加入：

- **公开可访问**：不需要登录、付费或特殊授权即可抓取。
- **允许自动化抓取**：尊重目标站的 `robots.txt` 和服务条款。
- **不含私有/付费/破解内容**：我们只聚合免费公开节点。

操作步骤：

1. Fork 本仓库。
2. 编辑 `config/sources.json`，在 `free_node_sources` 或 `free_proxy_apis` 中追加新源。
3. 建议新源默认设置为 `"enabled": false`，等待维护者审核后再决定是否开启。
4. 运行 `make test` 确保格式与测试通过。
5. 提交 PR，说明数据来源、更新频率与包含协议。

数据源最小示例：

```json
{
  "name": "my-public-source",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/user/repo/main/nodes.txt",
  "enabled": false,
  "decode_base64": true,
  "update_interval": "daily",
  "protocols": ["vmess", "vless", "ss"],
  "note": "Daily updated mixed subscription."
}
```

### 2. 贡献代码

如果你想改进 `scripts/` 中的抓取、解析、验证或格式化逻辑：

1. Fork 本仓库并创建功能分支，例如 `feat/verifier-timeout`。
2. 保持函数单一职责，尽量添加类型提示。
3. 为新逻辑编写或更新单元测试（位于 `tests/`）。
4. 运行 `make lint` 与 `make test`。
5. 提交 PR，清楚描述问题、改动与测试结果。

### 3. 贡献文档

文档站位于 `docs-site/`，使用 VitePress。你可以：

- 修正错别字或过时说明。
- 补充新的客户端配置教程。
- 改进架构、数据源或自动化说明。

修改后请在本地运行构建验证：

```bash
cd docs-site
npm install
npm run docs:build
```

### 4. 报告问题

- **数据源失效**：使用 Issues 中的 **Broken Source Report** 模板。
- **Bug**：使用 **Bug Report** 模板，附带复现步骤、环境信息与日志片段。
- **安全漏洞**：请遵循 [SECURITY.md](https://github.com/MS33834/freenode/blob/main/SECURITY.md) 中的负责任披露流程，不要公开提交。

## 开发环境搭建

### Python 依赖

```bash
# 克隆仓库
git clone https://github.com/MS33834/freenode.git
cd freenode

# 安装 Python 依赖（推荐 Python 3.11+）
pip3 install -r requirements.txt

# 运行一次完整更新（不验证，速度较快）
python3 scripts/update.py

# 或开启连通性验证（较慢，但节点质量更高）
FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify
```

### Node 依赖

主站使用 Next.js，文档站使用 VitePress，需要分别安装依赖。

```bash
# 主站
cd web
npm install
npm run dev      # 本地预览
npm run lint     # ESLint 检查
npm run build    # 静态导出

# 文档站
cd ../docs-site
npm install
npm run docs:dev    # 本地预览
npm run docs:build  # 构建静态站点
```

## 代码规范

为了保证代码风格一致并降低 Review 成本，请遵守以下规范：

- **Python 代码风格**：使用 [ruff](https://docs.astral.sh/ruff/) 进行静态检查与格式化。提交前请运行 `make lint`。
- **类型提示**：新增函数建议添加类型提示，尤其是 `scripts/` 中的公共函数。
- **单元测试**：`tests/` 目录包含各模块测试。新增逻辑必须补充或更新对应测试，确保 `make test` 通过。
- **命名与结构**：函数保持单一职责，变量名见名知意，避免一次性抽象。
- **提交信息**：推荐使用 `<type>(<scope>): <描述>` 格式，详见下方「提交规范」。

## 测试与 Lint 命令

项目根目录提供 `Makefile`，汇总了常用命令：

| 命令 | 说明 |
|---|---|
| `make install` | 安装 Python 依赖 |
| `make test` | 运行所有 Python 单元测试 |
| `make update` | 运行完整节点更新（不验证） |
| `make verify` | 运行完整节点更新（开启验证） |
| `make lint` | 语法检查所有 Python 脚本与测试 |
| `make lint-web` | 运行 Next.js 主站的 ESLint |
| `make build-web` | 构建 Next.js 主站 |
| `make clean` | 清理 `__pycache__` 与 `.pyc` 文件 |

在提交 PR 前，建议至少执行：

```bash
make lint
make test
python3 scripts/update.py
```

如果改动了主站或文档站，再额外运行对应的 `npm run lint` / `npm run build` 或 `npm run docs:build`。

## 提交规范

为了保持提交历史清晰，建议使用以下格式：

```
<type>(<scope>): <简短描述>

<可选的详细说明>

<可选的关联 Issue 或 PR>
```

常用 `type`：

| 类型 | 说明 |
|---|---|
| `feat` | 新功能或新数据源 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响逻辑） |
| `refactor` | 代码重构 |
| `test` | 测试相关 |
| `chore` | 构建、依赖、CI 等杂项 |

示例（代码/脚本提交可用英文，面向用户的文档也可用中文）：

```text
feat(sources): add new daily vless subscription
fix(verifier): handle missing port in trojan links
docs(architecture): add mermaid flowchart

feat(sources): 新增每日更新的 VLESS 订阅源
docs(faq): 补充 GitCode 镜像访问说明
```

每日自动更新由机器人提交，统一使用 `chore: daily node update`。

## 行为准则

- 保持友善与尊重。
- 不要提交 secrets、tokens 或个人节点列表。
- 对公开数据源保持克制，避免过高频率抓取。
- 所有贡献均遵循项目 [MIT 许可证](https://github.com/MS33834/freenode/blob/main/LICENSE)。

## 获取帮助

- 有疑问先查看 [FAQ](/faq) 和 [架构说明](/architecture)。
- 一般讨论请使用 GitHub Discussions。
- 需要实时协作可在相关 Issue 中 `@` 维护者。
