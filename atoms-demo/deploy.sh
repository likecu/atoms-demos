#!/bin/bash

# Atoms Demo 远程部署脚本
# 目标服务器: 34.72.125.220
# 用户: milk

set -e

REMOTE_HOST="34.72.125.220"
REMOTE_USER="milk"
SSH_KEY="~/.ssh/milk"
# Git 仓库根目录
REMOTE_REPO_DIR="/home/milk/atoms-demo/atoms-demo"
# 实际项目部署目录 (Docker Compose 所在目录)
DEPLOY_DIR="/home/milk/atoms-demo/atoms-demo/atoms-demo"
LOCAL_DIR="/Users/aaa/Documents/study-demo/atoms-demo"

echo "=========================================="
echo "Atoms Demo 远程部署脚本"
echo "=========================================="

# 2. 更新代码 (使用 Git)
echo "步骤 2: 更新项目代码..."

ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << ENDSSH
  set -e
  
  # 检查是否已经是 Git 仓库
  if [ ! -d "$REMOTE_REPO_DIR/.git" ]; then
    echo "远程目录不是 Git 仓库，准备迁移..."
    
    # 备份现有目录 (如果有)
    if [ -d "$REMOTE_REPO_DIR" ]; then
      BACKUP_DIR="${REMOTE_REPO_DIR}.bak_\$(date +%Y%m%d%H%M%S)"
      echo "备份现有目录到 \$BACKUP_DIR..."
      mv "$REMOTE_REPO_DIR" "\$BACKUP_DIR"
    fi
    
    # 克隆仓库
    echo "正在克隆仓库..."
    git clone https://github.com/likecu/atoms-demos.git "$REMOTE_REPO_DIR"
    
    # 恢复 workspaces (从最近的备份)
    LATEST_BACKUP=\$(ls -dt ${REMOTE_REPO_DIR}.bak_* 2>/dev/null | head -1)
    if [ -n "\$LATEST_BACKUP" ] && [ -d "\$LATEST_BACKUP/atoms-demo/workspaces" ]; then
      echo "从 \$LATEST_BACKUP 恢复 workspaces..."
      mkdir -p "$DEPLOY_DIR"
      cp -r "\$LATEST_BACKUP/atoms-demo/workspaces" "$DEPLOY_DIR/"
    elif [ -n "\$LATEST_BACKUP" ] && [ -d "\$LATEST_BACKUP/workspaces" ]; then
       # 兼容旧结构
       echo "从旧结构 \$LATEST_BACKUP 恢复 workspaces..."
       mkdir -p "$DEPLOY_DIR"
       cp -r "\$LATEST_BACKUP/workspaces" "$DEPLOY_DIR/"
    else
      echo "未找到旧的 workspaces，创建新目录..."
      mkdir -p "$DEPLOY_DIR/workspaces"
    fi
    
  else
    echo "远程目录已是 Git 仓库，执行更新..."
    cd "$REMOTE_REPO_DIR"
    git fetch --all
    git reset --hard origin/main
    git pull origin main
  fi
ENDSSH

# 3. 上传生产环境配置
echo "步骤 3: 上传环境配置文件..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST "mkdir -p $DEPLOY_DIR"
scp -i $SSH_KEY $LOCAL_DIR/.env.production $REMOTE_USER@$REMOTE_HOST:$DEPLOY_DIR/.env

# 4. 准备 Sandbox Dockerfile
echo "步骤 4: 准备 Sandbox Dockerfile..."
scp -i $SSH_KEY $LOCAL_DIR/src/lib/sandbox/Dockerfile $REMOTE_USER@$REMOTE_HOST:$DEPLOY_DIR/sandbox.Dockerfile

# 5. 远程执行构建和部署
echo "步骤 5: 远程执行构建和部署..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << ENDSSH
  set -e
  cd $DEPLOY_DIR

  echo "🔍 检查并构建 Sandbox 镜像..."
  if [[ "\$(docker images -q atoms-sandbox:latest 2> /dev/null)" == "" ]]; then
    docker build -f sandbox.Dockerfile -t atoms-sandbox:latest .
  fi

  echo "📂 配置 Workspaces 目录..."
  # 确保路径与 .env 中的 SANDBOX_HOST_DIR 一致
  mkdir -p "$DEPLOY_DIR/workspaces"
  chmod -R 777 "$DEPLOY_DIR/workspaces" || true

  # 自动扫描并移植历史遗留文件 (从 /home/milk/atoms-demo/workspaces 迁移)
  LEGACY_WS="/home/milk/atoms-demo/workspaces"
  if [ -d "$LEGACY_WS" ]; then
    echo "🔍 扫描到历史工作区目录，执行全量移植以找回丢失文件..."
    # 使用 sudo cp -an 保持目录层级并合并新缺失的文件，不覆盖已有文件
    sudo cp -an "$LEGACY_WS"/. "$DEPLOY_DIR/workspaces/" 2>/dev/null || true
    echo "✅ 历史文件已同步。"
  fi

  echo "🚀 启动应用..."
  echo "🧹 清理可能存在的残留沙箱容器..."
  docker ps -a --filter name=sandbox- -q | xargs -r docker rm -f || true

  docker-compose down || true
  docker-compose build --no-cache app
  docker-compose up -d --remove-orphans
  
  echo "🧹 清理旧镜像..."
  docker image prune -f

  echo "=========================================="
  echo "✅ 远程部署成功完成!"
  docker-compose ps
ENDSSH

# 6. 自动化测试验证
echo "步骤 6: 运行自动化测试进行验证..."
/Users/aaa/python-sdk/python3.13.2/bin/python -m pytest $LOCAL_DIR/tests/test_flow.py -v --html=$LOCAL_DIR/report_deploy_check.html || {
    echo "⚠️ 自动化测试失败! 请检查部署状态。"
    exit 1
}

echo ""
echo "=========================================="
echo "🎉 部署与验证全部通过!"
echo "应用地址: http://$REMOTE_HOST:3000"
echo "测试报告: $LOCAL_DIR/report_deploy_check.html"
echo "=========================================="
