# 开发指南

本文档面向希望参与 FreeNode 代码开发的贡献者，介绍如何搭建本地开发环境、运行测试、理解项目结构以及提交代码。

## 环境要求

- Python 3.10+
- Node.js 20+（前端开发）
- Git

## 克隆仓库

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
```

## Python 流水线开发

### 安装依赖

```bash
pip3 install -r requirements.txt
```

### 运行单元测试

```bash
make test
# 或
pytest tests/ -v
```

### 运行完整更新流程

```bash
python3 scripts/update.py
```

启用节点验证（更严格但耗时）：

```bash
FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify
```

启用 GeoIP 地区分组：

```bash
FREENODE_GEO_ENABLED=true python3 scripts/update.py
```

### 代码风格

- Python 代码遵循 PEP 8。
- 函数与类需附带清晰的 docstring 或注释。
- 新增功能必须配套单元测试。

## 前端开发

### 安装依赖

```bash
cd web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建静态站点

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

## 文档站开发

```bash
cd docs-site
npm install
npm run docs:dev
```

## 提交代码

1. Fork 仓库并创建特性分支：`git checkout -b feat/your-feature`。
2. 遵循 [CONTRIBUTING.md](https://github.com/MS33834/freenode/blob/main/CONTRIBUTING.md) 中的规范。
3. 确保 `make test` 与 `make lint` 通过。
4. 提交清晰的 commit message。
5. 发起 Pull Request，描述改动动机与测试结果。

## 调试技巧

- 直接运行 `python3 scripts/crawler.py` 可测试数据源抓取，输出节点源与代理源数量。
- 查看 `nodes/` 目录下的输出文件，确认格式是否符合预期。
- 前端页面使用 `npm run dev` 实时预览，静态导出结果位于 `web/dist/`。
