#!/bin/bash
# Atoms Demo 类型检查脚本

echo "🔍 开始类型检查..."

# 检查 TypeScript 编译
echo "📦 检查 TypeScript 编译..."
cd "$(dirname "$0")"

# 使用 npx 执行 tsc 检查
if command -v npx &> /dev/null; then
    npx tsc --noEmit --skipLibCheck
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript 检查通过"
    else
        echo "❌ TypeScript 检查失败"
        exit 1
    fi
else
    echo "⚠️  npx 不可用，跳过 TypeScript 检查"
fi

# 检查 ESLint
echo "🔍 检查代码规范..."
if [ -f "package.json" ] && grep -q "\"lint\"" "package.json"; then
    npm run lint
    if [ $? -eq 0 ]; then
        echo "✅ ESLint 检查通过"
    else
        echo "❌ ESLint 检查失败"
        exit 1
    fi
else
    echo "⚠️  未配置 ESLint，跳过检查"
fi

echo "✨ 所有检查通过！"
