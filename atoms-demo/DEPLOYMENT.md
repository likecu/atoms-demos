# Atoms Demo 部署架构文档

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              远程服务器 (YOUR_SERVER_IP)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │    Atoms Demo App       │    │         Supabase 基础设施                 │ │
│  │    (端口: 3000)          │───▶│         (端口: 36666)                    │ │
│  │                         │    │                                         │ │
│  │  ┌───────────────────┐  │    │  ┌─────────────┐  ┌─────────────────┐   │ │
│  │  │ atoms-demo-app-1  │  │◀───│──│ supabase-db │  │ supabase-kong   │   │ │
│  │  │ (Next.js)         │  │    │  │ (PostgreSQL)│  │ (API Gateway)   │   │ │
│  │  └───────────────────┘  │    │  └─────────────┘  └─────────────────┘   │ │
│  │           │             │    │                                         │ │
│  │           ▼             │    │  + 其他 10 个 Supabase 服务容器           │ │
│  │  ┌───────────────────┐  │    │                                         │ │
│  │  │ Docker Socket     │  │    └─────────────────────────────────────────┘ │
│  │  │ (/var/run/docker) │  │                                               │
│  │  └───────────────────┘  │                                               │
│  │           │             │                                               │
│  │           ▼ 动态创建     │                                               │
│  │  ┌───────────────────┐  │                                               │
│  │  │ Sandbox 容器       │  │                                               │
│  │  │ (最多 5 个)        │  │                                               │
│  │  │ atoms-sandbox     │  │                                               │
│  │  └───────────────────┘  │                                               │
│  └─────────────────────────┘                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 端口配置

### 必需端口 (对外暴露)

| 端口 | 服务 | 协议 | 说明 |
|------|------|------|------|
| **3000** | Atoms Demo App | HTTP | Next.js 主应用入口 |
| **36666** | Supabase API Gateway | HTTP | Supabase REST/Auth API 入口 |

### 可选端口 (内部使用或调试)

| 端口 | 服务 | 说明 |
|------|------|------|
| 5432 | PostgreSQL (Pooler) | 数据库直连 (Transaction 模式) |
| 6543 | Supabase Pooler | Session 模式连接 |
| 4000 | Supabase Analytics | 日志分析服务 |
| 8443 | Supabase Kong HTTPS | HTTPS API 入口 (可选) |

---

## Docker 容器清单

### 1. 应用层容器

#### 主应用容器 (固定 1 个)

| 容器名 | 镜像 | 端口 | 说明 |
|--------|------|------|------|
| `atoms-demo-app-1` | `atoms-demo-app` | 3000:3000 | Next.js 主应用 |

**配置文件**: `docker-compose.yml`

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # 用于创建沙箱
      - ./workspaces:/app/workspaces              # 用户工作区
    environment:
      - NODE_ENV=production
      - SANDBOX_HOST_DIR=${REMOTE_DIR}/workspaces
      - WORKSPACE_ROOT=/app/workspaces
```

#### 沙箱容器 (动态 0-5 个)

| 容器名模式 | 镜像 | 说明 |
|------------|------|------|
| `sandbox-{userId}` | `atoms-sandbox:latest` | 用户独立开发环境 |

**配置文件**: `src/lib/sandbox/Dockerfile`

- **最大数量**: 5 个（超出时 LRU 淘汰）
- **自动清理**: 空闲 2 小时后自动停止
- **资源限制**: 内存 512MB, CPU 共享

### 2. Supabase 基础设施 (共 12-13 个容器)

| 容器名 | 镜像 | 用途 |
|--------|------|------|
| `supabase-db` | `supabase/postgres:15.8.1.085` | PostgreSQL 数据库 |
| `supabase-kong` | `kong:2.8.1` | API Gateway (端口 36666) |
| `supabase-auth` | `supabase/gotrue:v2.185.0` | 用户认证服务 |
| `supabase-rest` | `postgrest/postgrest:v14.3` | REST API 自动生成 |
| `supabase-pooler` | `supabase/supavisor:2.7.4` | 连接池管理 |
| `supabase-studio` | `supabase/studio:*` | 管理后台 UI |
| `supabase-storage` | `supabase/storage-api:v1.37.1` | 文件存储服务 |
| `supabase-imgproxy` | `darthsim/imgproxy:v3.30.1` | 图片处理 |
| `supabase-meta` | `supabase/postgres-meta:v0.95.2` | 数据库元数据 |
| `supabase-realtime` | `supabase/realtime:v2.72.0` | 实时订阅 |
| `supabase-edge-functions` | `supabase/edge-runtime:v1.70.0` | Edge Functions |
| `supabase-analytics` | `supabase/logflare:1.30.3` | 日志分析 |
| `supabase-vector` | `timberio/vector:0.28.1-alpine` | 日志收集 |

---

## 快速部署

### 自动部署脚本

```bash
# 一键部署
./deploy.sh
```

部署脚本会执行以下操作：
1. 通过 Git 更新远程代码
2. 上传 `.env.production` 配置
3. 构建沙箱镜像 (首次)
4. 配置 workspaces 目录权限
5. 重新构建并启动应用

### 手动部署步骤

#### 1. 环境配置

```bash
cp .env.example .env.production
# 编辑配置文件
```

必需的环境变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=http://YOUR_SERVER_IP:36666
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证密钥 (至少 32 字符)
AUTH_SECRET=your-auth-secret-key-min-32-chars

# 应用配置
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000

# AI 模型配置
GEMINI_MODEL_ID=your-model-id
OPENROUTER_API_KEY=your-openrouter-key

# 沙箱配置
SANDBOX_HOST_DIR=/path/to/atoms-demo/workspaces
WORKSPACE_ROOT=/app/workspaces
```

#### 2. 构建沙箱镜像

```bash
# 在远程服务器执行
docker build -f src/lib/sandbox/Dockerfile -t atoms-sandbox:latest .
```

#### 3. 启动服务

```bash
docker-compose up -d
```

---

## 资源占用概览

| 资源类型 | 数量/大小 | 说明 |
|----------|-----------|------|
| **Docker 容器** | 13-18 个 | 1 主应用 + 0-5 沙箱 + 12 Supabase |
| **端口** | 2 个必需 | 3000 (应用), 36666 (Supabase) |
| **磁盘空间** | ~5GB | 包括镜像和数据 |
| **内存** | ~4GB | Supabase 占用较多 |

---

## 目录结构

```
atoms-demo/
├── Dockerfile              # 主应用 Dockerfile
├── docker-compose.yml      # Docker Compose 配置
├── deploy.sh               # 自动部署脚本
├── .env.production         # 生产环境配置
├── .env.local              # 本地开发配置
├── src/
│   ├── app/
│   │   └── api/            # API 路由
│   └── lib/
│       └── sandbox/
│           ├── Dockerfile  # 沙箱镜像 Dockerfile
│           ├── manager.ts  # 沙箱管理器
│           └── config.ts   # 沙箱配置
├── workspaces/             # 用户工作区 (持久化)
│   └── {userId}/           # 每个用户的独立工作区
└── supabase/
    └── schema.sql          # 数据库 Schema
```

---

## 常用运维命令

### 查看运行状态

```bash
# SSH 连接
ssh -i ~/.ssh/your-key user@YOUR_SERVER_IP

# 查看所有容器
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# 查看应用日志
docker logs -f atoms-demo-app-1

# 查看沙箱容器
docker ps -a | grep sandbox-
```

### 重启服务

```bash
cd /path/to/atoms-demo
docker-compose restart

# 或完全重建
docker-compose down
docker-compose up -d --build
```

### 清理资源

```bash
# 清理所有沙箱容器
docker ps -a | grep sandbox- | awk '{print $1}' | xargs docker rm -f

# 清理未使用镜像
docker image prune -f

# 清理所有未使用资源
docker system prune -f
```

---

## 故障排查

### 应用无法访问

1. 检查容器状态: `docker ps`
2. 查看应用日志: `docker logs atoms-demo-app-1`
3. 检查端口占用: `netstat -tlnp | grep 3000`

### 沙箱创建失败

1. 检查 Docker Socket 权限
2. 确认 `atoms-sandbox:latest` 镜像存在
3. 查看 workspaces 目录权限: `ls -la workspaces/`

### 数据库连接失败

1. 确认 Supabase 容器运行: `docker ps | grep supabase`
2. 检查环境变量配置
3. 测试连接: `curl http://YOUR_SERVER_IP:36666/rest/v1/`
