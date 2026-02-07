# Atoms Demo 部署配置

## 快速开始

### 1. 环境配置

复制环境变量示例文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下配置：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
AUTH_SECRET=your-auth-secret-key-min-32-chars
```

### 2. 本地开发

使用 Docker Compose 启动：

```bash
docker-compose up -d
```

### 3. 构建生产镜像

```bash
docker build -t atoms-demo .
```

### 4. 运行生产容器

```bash
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -e AUTH_SECRET=your-auth-secret \
  --name atoms-demo-prod \
  atoms-demo
```

## 远程服务器部署

### 1. 构建并推送镜像

```bash
# 构建镜像
docker build -t atoms-demo:latest .

# 标记镜像（如果你使用镜像仓库）
docker tag atoms-demo:latest your-registry/atoms-demo:latest

# 推送镜像
docker push your-registry/atoms-demo:latest
```

### 2. 在远程服务器部署
```bash
# SSH 连接
ssh your-server

# 创建部署目录
mkdir -p /path/to/atoms-demo
cd /path/to/atoms-demo

# 拉取代码或镜像
git pull origin main  # 或从镜像仓库拉取

# 创建 .env 文件
cat > .env << EOF
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
AUTH_SECRET=your-auth-secret
EOF

# 启动服务
docker-compose up -d

# 或使用 Docker run
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
  -e AUTH_SECRET=${AUTH_SECRET} \
  --restart unless-stopped \
  --name atoms-demo \
  atoms-demo:latest
```

### 3. 查看日志

```bash
docker logs -f atoms-demo
```

### 4. 重启服务

```bash
docker restart atoms-demo
```

## Supabase 本地开发

如果需要在本地运行 Supabase：

```bash
docker-compose up supabase -d
```

然后访问：
- Supabase Studio: http://localhost:54323
- PostgREST API: http://localhost:54321
- PostgreSQL: localhost:54322

## 目录结构

```
atoms-demo/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .env
├── supabase/
│   └── schema.sql      # 数据库 Schema
└── src/
    └── app/
        └── api/
            └── auth/   # 认证 API
