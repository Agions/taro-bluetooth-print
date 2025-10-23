# 安装指南

本指南将帮助您在不同环境中安装和配置 Taro Bluetooth Print 库。

## 环境要求

在安装之前，请确保您的开发环境满足以下要求：

- **Node.js**: 14.0 或更高版本
- **Taro**: 3.0 或更高版本
- **TypeScript**: 4.0 或更高版本（推荐）
- **设备**: 支持蓝牙的设备

### 检查环境

```bash
# 检查 Node.js 版本
node --version

# 检查 Taro 版本
taro --version

# 检查 npm 版本
npm --version
```

## 安装方式

### 使用 npm 安装

```bash
npm install taro-bluetooth-print
```

### 使用 yarn 安装

```bash
yarn add taro-bluetooth-print
```

### 使用 pnpm 安装

```bash
pnpm add taro-bluetooth-print
```

## 项目配置

### Taro 项目配置

在 Taro 项目中使用时，需要进行一些配置：

#### 1. 配置小程序权限

在 `src/app.config.ts` 或 `project.config.json` 中添加蓝牙权限：

```typescript
// src/app.config.ts
export default {
  // ...其他配置
  permission: {
    "scope.bluetooth": {
      desc: "您的应用需要使用蓝牙功能连接打印机",
    },
  },
}
```

#### 2. 配置 H5 平台

对于 H5 平台，确保使用 HTTPS 协议：

```typescript
// config/index.js
export default {
  h5: {
    devServer: {
      https: true, // 开发环境启用 HTTPS
    },
  },
}
```

#### 3. 配置 TypeScript

确保 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node",
    "strict": true
  },
  "include": ["src", "node_modules/taro-bluetooth-print"]
}
```

### React Native 项目配置

对于 React Native 项目，需要额外的配置：

#### 1. 安装蓝牙依赖

```bash
npm install react-native-bluetooth-classic
# 或
npm install @react-native-community/bluetooth-manager
```

#### 2. 配置 Android 权限

在 `android/app/src/main/AndroidManifest.xml` 中添加权限：

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

#### 3. 配置 iOS 权限

在 `ios/YourApp/Info.plist` 中添加权限：

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>此应用需要使用蓝牙功能连接打印机</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>此应用需要使用蓝牙功能连接打印机</string>
```

## 验证安装

安装完成后，您可以通过以下方式验证安装是否成功：

### 1. 检查依赖

```bash
npm list taro-bluetooth-print
```

### 2. 创建测试文件

创建一个简单的测试文件 `test-printer.ts`：

```typescript
import TaroBluePrint from "taro-bluetooth-print"

// 创建实例
const printer = new TaroBluePrint({
  debug: true,
})

console.log("Taro Bluetooth Print 安装成功!")
console.log("版本信息:", printer.getVersion?.() || "未知")
```

### 3. 运行测试

```bash
# 如果使用 TypeScript
npx ts-node test-printer.ts

# 或者在项目中导入测试
```

## 平台特定说明

### 微信小程序

1. **权限申请**: 在小程序管理后台申请蓝牙权限
2. **用户授权**: 蓝牙功能需要用户主动授权
3. **基础库版本**: 确保小程序基础库版本 >= 2.10.0

### H5 平台

1. **HTTPS 要求**: Web Bluetooth API 要求使用 HTTPS 协议
2. **浏览器兼容性**:
   - Chrome 56+
   - Edge 79+
   - Opera 43+
   - Safari 不支持
3. **用户交互**: 蓝牙连接必须由用户手势触发

### React Native

1. **原生依赖**: 需要安装额外的蓝牙原生模块
2. **权限配置**: 需要在原生代码中配置蓝牙权限
3. **平台差异**: iOS 和 Android 的蓝牙 API 有差异

## 常见问题

### 安装失败

```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 类型错误

```bash
# 重新安装类型定义
npm install --save-dev @types/node

# 确保 tsconfig.json 配置正确
```

### 小程序蓝牙权限问题

1. 检查 `app.json` 中的权限配置
2. 确保在用户操作后调用蓝牙 API
3. 在开发者工具中测试蓝牙功能

## 下一步

安装完成后，您可以：

- 阅读 [快速开始指南](/guide/getting-started)
- 了解 [基础用法](/guide/basic-usage)
- 查看 [API 文档](/api/)
- 浏览 [示例代码](/examples/)

## 获取帮助

如果安装过程中遇到问题：

1. 查看 [常见问题](/reference/faq)
2. 提交 [GitHub Issue](https://github.com/your-repo/taro-bluetooth-print/issues)
3. 加入社区讨论群
