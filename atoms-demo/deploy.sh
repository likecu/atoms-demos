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

echo "=========================================="
echo "✅ 代码上传完成!"
echo "=========================================="
echo ""
echo "下一步:"
echo "1. SSH 登录到远程服务器:"
echo "   ssh -i ~/.ssh/milk milk@34.72.125.220"
echo ""
echo "2. 进入项目目录:"
echo "   cd /home/milk/atoms-demo"
echo ""
echo "3. 构建并启动应用:"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
echo "4. 查看日志:"
echo "   docker-compose logs -f app"
echo "=========================================="
