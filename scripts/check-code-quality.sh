#!/bin/bash

# 代码质量检查脚本

set -e

echo "🔍 开始代码质量检查..."

# 检查TypeScript代码
echo "📝 检查TypeScript代码..."
npx eslint "src/**/*.{ts,tsx}" --ext .ts,.tsx --max-warnings=0

# 检查配置文件
echo "⚙️ 检查配置文件..."
npx eslint "*.js" "*.json" "*.yml" "*.yaml" --max-warnings=0

# 检查文档中的代码示例
echo "📚 检查文档中的代码示例..."
npx eslint "docs/**/*.md" --ext .md --parser markdown --plugin markdown --plugin @typescript-eslint/parser --max-warnings=0

# 运行Prettier检查
echo "🎨 检查代码格式..."
npx prettier --check .
if [ $? -ne 0 ]; then
  echo "❌ 代码格式不正确，请运行 'npm run format' 来自动修复"
  exit 1
fi

# 类型检查
echo "🔍 TypeScript类型检查..."
npx tsc --noEmit

echo "✅ 代码质量检查完成"