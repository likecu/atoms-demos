#!/bin/bash

# Atoms Demo 远程部署脚本
# 目标服务器: 34.72.125.220
# 用户: milk

set -e

REMOTE_HOST="34.72.125.220"
REMOTE_USER="milk"
SSH_KEY="~/.ssh/milk"
REMOTE_DIR="/home/milk/atoms-demo"
LOCAL_DIR="/Users/aaa/Documents/study-demo/atoms-demo"

echo "=========================================="
echo "Atoms Demo 远程部署脚本"
echo "=========================================="

# 1. 创建远程目录
echo "步骤 1: 创建远程目录..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR"

# 2. 上传代码文件
echo "步骤 2: 上传项目代码..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude 'test_logs' \
  --exclude 'workspaces' \
  --exclude '.env.local' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude 'reproduce_*.ts' \
  --exclude 'debug_*.ts' \
  --exclude 'test_*.py' \
  --exclude 'verify_*.py' \
  --exclude 'list_models.py' \
  --exclude 'execute_migration_remote.py' \
  --exclude 'check_remote_db.exp' \
  --exclude 'add_agent_label_to_logs.sql' \
  -e "ssh -i $SSH_KEY" \
  $LOCAL_DIR/ \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# 3. 上传生产环境配置
echo "步骤 3: 上传环境配置文件..."
scp -i $SSH_KEY $LOCAL_DIR/.env.production $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env

# 4. 上传 Sandbox Dockerfile
echo "步骤 4: 上传 Sandbox Dockerfile..."
scp -i $SSH_KEY $LOCAL_DIR/src/lib/sandbox/Dockerfile $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/sandbox.Dockerfile

# 5. 远程执行构建和部署
echo "步骤 5: 远程执行构建和部署..."
echo "正在连接远程服务器..."

# 使用 heredoc 传递多行命令
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  set -e
  cd /home/milk/atoms-demo

  echo "------------------------------------------"
  echo "🔍 检查并构建 Sandbox 镜像 (atoms-sandbox:latest)..."
  # 检查镜像是否存在，不存在或强制更新时构建
  if [[ "$(docker images -q atoms-sandbox:latest 2> /dev/null)" == "" ]]; then
    echo "镜像不存在，开始构建..."
    docker build -f sandbox.Dockerfile -t atoms-sandbox:latest .
  else
    echo "镜像已存在，跳过构建 (如需更新请手动运行构建命令)"
  fi

  echo "------------------------------------------"
  echo "📂 配置 Workspaces 目录..."
  mkdir -p workspaces
  
  echo "设置 workspaces 权限 (UID 1001)..."
  # 尝试使用 sudo 设置权限，如果需要密码可能会在此处暂停或失败
  # 如果配置了 NOPASSWD 则会自动执行
  if sudo -n true 2>/dev/null; then
      sudo chown -R 1001:1001 workspaces
      sudo chmod -R 775 workspaces
  else
      echo "⚠️ 注意: 无免密 sudo 权限，尝试使用当前用户权限设置..."
      # 如果无法 sudo，尝试宽松权限
      chmod -R 777 workspaces || true
  fi

  echo "------------------------------------------"
  echo "🔧 检查和加载环境变量..."
  
  # 检查 .env 文件是否存在
  if [ ! -f .env ]; then
    echo "❌ 错误: .env 文件不存在"
    exit 1
  fi
  
  # 显示关键环境变量（隐藏敏感值）
  echo "验证环境变量配置:"
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env; then
    echo "✓ NEXT_PUBLIC_SUPABASE_URL: $(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2 | head -c 30)..."
  else
    echo "❌ NEXT_PUBLIC_SUPABASE_URL 未配置"
  fi
  
  if grep -q "OPENROUTER_API_KEY" .env; then
    echo "✓ OPENROUTER_API_KEY: $(grep OPENROUTER_API_KEY .env | cut -d'=' -f2 | head -c 20)..."
  else
    echo "❌ OPENROUTER_API_KEY 未配置"
  fi
  
  echo "------------------------------------------"
  echo "🚀 启动应用..."
  # 停止旧容器
  docker-compose down || true
  
  # 重新构建应用镜像（使用 .env 文件中的变量）
  docker-compose build --no-cache app
  
  # 启动容器
  docker-compose up -d --remove-orphans

  echo "------------------------------------------"
  echo "🧹 清理..."
  docker image prune -f

  echo "=========================================="
  echo "✅ 远程部署成功完成!"
  echo "=========================================="
  docker-compose ps
ENDSSH

echo ""
echo "部署脚本执行完毕。应用地址: http://$REMOTE_HOST:3000"

