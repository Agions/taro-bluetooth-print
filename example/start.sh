#!/bin/bash

# 默认运行微信小程序版本，除非指定平台
PLATFORM=${1:-weapp}

echo "正在启动 $PLATFORM 平台的示例..."

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
  echo "正在安装依赖..."
  npm install
fi

# 根据平台启动不同版本
case $PLATFORM in
  weapp)
    npm run dev:weapp
    ;;
  h5)
    npm run dev:h5
    ;;
  rn)
    npm run dev:rn
    ;;
  *)
    echo "不支持的平台: $PLATFORM"
    echo "可用选项: weapp, h5, rn"
    exit 1
    ;;
esac 