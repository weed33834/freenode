# FreeNode backend Docker image
FROM python:3.12-slim AS base

LABEL org.opencontainers.image.title="FreeNode Backend"
LABEL org.opencontainers.image.source="https://github.com/MS33834/freenode"

# Install curl (needed by the crawler fallback) and clean up.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户跑应用，限制容器内权限。
RUN addgroup --system --gid 1001 app \
    && adduser --system --uid 1001 --gid 1001 --no-create-home app

WORKDIR /app

# Copy backend requirements and install.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the project root (scripts/, config/, backend/).
# The pipeline imports from scripts/ so we need the full tree.
COPY . /app

# 让 data/ 目录可写（SQLite 文件默认落在这里）
RUN mkdir -p /app/backend/data && chown -R app:app /app

WORKDIR /app/backend

# 切到非 root 用户
USER app

# Expose the FastAPI port.
EXPOSE 8000

# 用 --preload 让 lifespan（含 alembic 迁移）只在 master 跑一次，
# 避免 N 个 worker 并发跑迁移竞争 alembic_version 表锁。
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", \
     "--preload", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120"]
