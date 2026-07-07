# FreeNode 前端镜像（Next.js standalone）
FROM node:20-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
# 构建时注入后端地址（构建期用占位，运行期靠环境变量或 Caddy 反代）
ENV NEXT_PUBLIC_API_BASE_URL=""
ENV API_BASE_URL="http://backend:8000"
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=""
ENV API_BASE_URL="http://backend:8000"
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 用户跑
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# 复制 standalone 产物（distDir 是 dist，所以产物在 dist/standalone）
COPY --from=builder --chown=nextjs:nodejs /app/dist/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/dist/static ./dist/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
