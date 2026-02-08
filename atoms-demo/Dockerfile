# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG AUTH_SECRET

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV AUTH_SECRET=$AUTH_SECRET

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 先创建 docker 组 (GID 1001,与宿主机 docker socket 匹配)
RUN addgroup -g 1001 docker

# 创建 nextjs 用户并加入 docker 组
RUN adduser --system --uid 1001 nextjs
RUN adduser nextjs docker

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:docker /app/.next/standalone ./
COPY --from=builder --chown=nextjs:docker /app/.next/static ./.next/static

# 创建必要的目录并设置权限
RUN mkdir -p /app/workspaces && chown nextjs:docker /app/workspaces

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
