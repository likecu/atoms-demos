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

# 2. 更新代码 (使用 Git)
echo "步骤 2: 更新项目代码..."

ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << ENDSSH
  set -e
  
  # 检查是否已经是 Git 仓库
  if [ ! -d "$REMOTE_DIR/.git" ]; then
    echo "远程目录不是 Git 仓库，准备迁移..."
    
    # 备份现有目录 (如果有)
    if [ -d "$REMOTE_DIR" ]; then
      echo "备份现有目录到 ${REMOTE_DIR}.bak_$(date +%Y%m%d%H%M%S)..."
      mv "$REMOTE_DIR" "${REMOTE_DIR}.bak_$(date +%Y%m%d%H%M%S)"
    fi
    
    # 克隆仓库
    echo "正在克隆仓库..."
    git clone https://github.com/likecu/atoms-demos.git "$REMOTE_DIR"
    
    # 恢复 workspaces (从最近的备份)
    LATEST_BACKUP=\$(ls -dt ${REMOTE_DIR}.bak_* | head -1)
    if [ -n "\$LATEST_BACKUP" ] && [ -d "\$LATEST_BACKUP/workspaces" ]; then
      echo "从 \$LATEST_BACKUP 恢复 workspaces..."
      mv "\$LATEST_BACKUP/workspaces" "$REMOTE_DIR/workspaces"
    else
      echo "未找到旧的 workspaces，创建新目录..."
      mkdir -p "$REMOTE_DIR/workspaces"
    fi
    
  else
    echo "远程目录已是 Git 仓库，执行更新..."
    cd "$REMOTE_DIR"
    git fetch --all
    git reset --hard origin/main
    git pull origin main
  fi
ENDSSH

# 3. 上传生产环境配置
echo "步骤 3: 上传环境配置文件..."
scp -i $SSH_KEY $LOCAL_DIR/.env.production $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env

# 4. 准备 Sandbox Dockerfile
echo "步骤 4: 准备 Sandbox Dockerfile..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST "cp $REMOTE_DIR/src/lib/sandbox/Dockerfile $REMOTE_DIR/sandbox.Dockerfile"

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

