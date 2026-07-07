.PHONY: install test test-backend update verify clean lint lint-web build-web run-backend deploy check secrets install-hooks migrate migrate-up type-sync test-fast cov
	mkdir -p backend/data

# 一把跑完所有推送前必过的检查（lint + test + 前端类型/lint）
check: lint test test-backend lint-web
	@cd web && npx tsc --noEmit
	@echo "全部检查通过。"

# 生成新的 alembic 迁移（改完模型后跑）
migrate:
	@cd backend && alembic revision --autogenerate -m "$(MSG)"

# 应用迁移到最新
migrate-up:
	@cd backend && alembic upgrade head

# 从后端 openapi 重新生成前端类型（改完后端 schema 后跑）
type-sync:
	@cd backend && FREENODE_DATABASE_URL=sqlite:///data/freenode.db FREENODE_ADMIN_API_KEY=dev-key \
		python3 -m uvicorn app.main:app --port 8099 & SERVER_PID=$$!; \
		sleep 4; \
		cd ../web && npx openapi-typescript http://localhost:8099/openapi.json -o lib/api-types.ts; \
		kill $$SERVER_PID 2>/dev/null || true; \
		echo "前端类型已同步到 web/lib/api-types.ts"

# 扫描仓库里有没有泄露的密钥
secrets:
	@bash scripts/check_secrets.sh

# 启用 git pre-push 钩子（每个开发者做一次就行）
install-hooks:
	@git config core.hooksPath .githooks
	@echo "已启用 .githooks/pre-push（推送前自动跑 make check + 密钥扫描）。"

install:
	pip3 install -r requirements.txt
	pip3 install -r backend/requirements.txt

test:
	python3 -m pytest tests/ -v

test-backend:
	cd backend && python3 -m pytest tests/ -v

# 跑全部测试（根 + backend）一把过，配 pyproject.toml 的 testpaths
test-fast:
	python3 -m pytest -v

# 跑测试并生成覆盖率报告（终端 + htmlcov/）
cov:
	python3 -m pytest --cov --cov-report=term-missing --cov-report=html
	@echo "HTML 报告已生成到 htmlcov/index.html"

update:
	python3 scripts/update.py

verify:
	FREENODE_VERIFY_NODES=true python3 scripts/update.py --verify

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

lint:
	python3 -m py_compile scripts/*.py tests/*.py
	python3 -m ruff check scripts tests backend/app backend/tests

lint-web:
	cd web && npm run lint

build-web:
	cd web && npm run build

run-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

deploy:
	cd backend && docker compose up -d --build

