# 维护手册

本文档面向项目维护者，介绍日常维护任务、数据源管理、版本发布与故障排查。

## 日常维护清单

- [ ] 检查 GitHub Actions 最近一次运行是否全绿。
- [ ] 查看 `nodes/` 产物是否正常生成。
- [ ] 检查是否有数据源失效或返回空内容。
- [ ] 查看 Issues 与 PR，及时回复社区反馈。

## 数据源管理

### 添加新数据源

1. 编辑 `config/sources.json`。
2. 在 `free_node_sources` 或 `free_proxy_apis` 中新增条目。
3. 设置 `enabled: true` 前，先本地测试抓取是否成功。
4. 更新 [数据源页面](https://ms33834.github.io/freenode/docs/data-sources.html) 相关说明。
5. 提交 PR 并确保测试通过。

### 禁用失效数据源

若某个源连续多日抓取失败或返回空内容：

1. 将其 `enabled` 改为 `false`。
2. 在 `note` 字段说明禁用原因与日期。
3. 提交变更，并在 CHANGELOG.md 中记录。

### 大文件数据源

对于体积较大的源，建议：

- 设置 `max_size` 限制。
- 默认禁用，避免 CI 超时。
- 仅在本地或高性能 runner 上手动启用。

## 版本发布

1. 更新 `VERSION` 文件。
2. 更新 `CHANGELOG.md`，按 Keep a Changelog 格式记录变更。
3. 在 GitHub 创建 Release，标签名与 `VERSION` 一致。
4. GitHub Actions 会自动部署站点。

## 故障排查

### 节点数量骤降

- 检查是否有多个数据源同时失效。
- 查看 `crawler.py` 日志中的抓取失败原因。
- 确认网络连接与 SSL 配置正常。

### 前端构建失败

- 运行 `npm run lint` 检查代码错误。
- 确认 `next.config.mjs` 配置正确。
- 检查 TypeScript 类型错误。

### 双仓库不同步

- 检查 GitCode Token 是否有效。
- 手动拉取 GitCode 仓库，查看冲突。
- 必要时强制同步前备份重要分支。
