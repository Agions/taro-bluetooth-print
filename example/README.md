# Taro蓝牙打印示例

这是基于Taro.js的跨平台蓝牙打印库演示应用，支持以下平台：
- 微信小程序
- H5
- React Native
- 鸿蒙OS

## 安装与运行

### 安装依赖

```bash
npm install
```

### 运行不同平台版本

```bash
# 微信小程序
npm run dev:weapp

# H5
npm run dev:h5

# React Native
npm run dev:rn
```

或使用提供的脚本：

```bash
./start.sh       # 默认启动微信小程序版本
./start.sh h5    # 启动H5版本
./start.sh rn    # 启动React Native版本
```

## 平台注意事项

### 微信小程序
- 需要在[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)中打开编译后的项目
- 真机调试需要开启蓝牙功能

### H5
- 需要在HTTPS环境下使用
- 仅支持Chrome、Edge等基于Chromium的浏览器
- 打开控制台确认Web Bluetooth API是否可用

### React Native
- 需要完整安装React Native开发环境
- 安卓设备需要授予位置权限和蓝牙权限
- API 31及以上版本需要BLUETOOTH_SCAN和BLUETOOTH_CONNECT权限

### 鸿蒙OS
- 需要安装鸿蒙开发环境
- 需要授予应用蓝牙相关权限 