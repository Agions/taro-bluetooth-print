# 部署指南

本文档详细介绍了 Taro Bluetooth Print v2.0 在不同平台和环境下的部署方法、配置要求和最佳实践。

## 📋 目录

- [环境要求](#环境要求)
- [项目配置](#项目配置)
- [平台部署](#平台部署)
- [环境配置](#环境配置)
- [构建优化](#构建优化)
- [CI/CD 集成](#cicd-集成)
- [监控和日志](#监控和日志)
- [故障排除](#故障排除)

## 🚀 快速开始

### 一键部署脚本

```bash
# 克隆项目
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# 安装依赖
npm install

# 运行快速部署
npm run deploy:quick
```

## 🔧 环境要求

### 开发环境要求

| 依赖       | 版本要求  | 用途              |
| ---------- | --------- | ----------------- |
| Node.js    | >= 16.0.0 | JavaScript 运行时 |
| npm        | >= 8.0.0  | 包管理器          |
| TypeScript | >= 4.5.0  | 类型检查          |
| Taro CLI   | >= 3.6.0  | 跨平台开发框架    |

### 平台特定要求

#### 微信小程序

- 微信开发者工具：>= 1.06.0
- 小程序基础库：>= 2.19.0
- 企业认证（蓝牙功能需要）

#### H5 平台

- 现代浏览器：Chrome >= 70, Safari >= 12, Firefox >= 65
- HTTPS 协议（Web Bluetooth API 要求）
- 蓝牙权限支持

#### React Native

- React Native CLI: >= 0.70.0
- iOS: Xcode >= 13.0, iOS >= 12.0
- Android: Android Studio >= 4.2, API Level >= 23

## ⚙️ 项目配置

### 1. 环境变量配置

创建环境配置文件：

```bash
# .env.development
NODE_ENV=development
TARO_ENV=weapp
API_BASE_URL=http://localhost:3000/api
LOG_LEVEL=debug
ENABLE_MOCK=true

# .env.staging
NODE_ENV=staging
TARO_ENV=weapp
API_BASE_URL=https://staging-api.example.com/api
LOG_LEVEL=info
ENABLE_MOCK=false

# .env.production
NODE_ENV=production
TARO_ENV=weapp
API_BASE_URL=https://api.example.com/api
LOG_LEVEL=error
ENABLE_MOCK=false
```

### 2. Taro 配置文件

```typescript
// config/index.ts
import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  projectName: 'taro-bluetooth-print',
  date: '2024-10-27',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-html'],
  defineConstants: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.TARO_ENV': JSON.stringify(process.env.TARO_ENV)
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src')
  },
  mini: {
    // 微信小程序配置
    webpackChain(chain) {
      chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'));
    }
  },
  h5: {
    // H5 配置
    publicPath: '/',
    staticDirectory: 'static',
    esnextModules: ['taro-ui'],
    webpackChain(chain) {
      chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'));
    }
  }
});
```

### 3. 权限配置

#### 微信小程序权限 (project.config.json)

```json
{
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": false,
    "coverView": true,
    "nodeModules": false,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "uglifyFileName": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": false,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true
  },
  "appid": "your-app-id",
  "projectname": "taro-bluetooth-print",
  "libVersion": "2.19.0",
  "simulatorType": "wechat",
  "simulatorPluginLibVersion": {},
  "condition": {},
  "srcMiniprogramRoot": "dist/",
  "packOptions": {
    "ignoreUploadUnusedFiles": true
  },
  "setting": {
    "bundle": false,
    "userConfirmedBundleSwitch": false,
    "packNpmManually": false,
    "packNpmRelationList": [],
    "minifyWXSS": true
  },
  "permission": {
    "scope.userLocation": {
      "desc": "您的位置信息将用于蓝牙设备扫描"
    },
    "scope.bluetooth": {
      "desc": "您的蓝牙权限将用于连接打印设备"
    }
  }
}
```

#### Android 权限配置

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
    <!-- 蓝牙权限 -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- 位置权限（蓝牙扫描需要） -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- 存储权限 -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
</manifest>
```

#### iOS 权限配置

```xml
<!-- ios/Project/Info.plist -->
<dict>
    <!-- 蓝牙权限 -->
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>此应用需要使用蓝牙来连接打印设备</string>
    <key>NSBluetoothPeripheralUsageDescription</key>
    <string>此应用需要使用蓝牙来连接打印设备</string>

    <!-- 位置权限 -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>此应用需要位置权限来扫描蓝牙设备</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>此应用需要位置权限来扫描蓝牙设备</string>
</dict>
```

## 📱 平台部署

### 微信小程序部署

#### 1. 开发环境部署

```bash
# 安装 Taro CLI
npm install -g @tarojs/cli

# 克隆项目
git clone <repository-url>
cd taro-bluetooth-print

# 安装依赖
npm install

# 开发模式运行
npm run dev:weapp

# 使用微信开发者工具打开 dist 目录
```

#### 2. 生产环境部署

```bash
# 构建生产版本
npm run build:weapp

# 使用微信开发者工具上传代码
# 1. 打开微信开发者工具
# 2. 导入项目，选择 dist 目录
# 3. 点击右上角"上传"按钮
# 4. 填写版本号和项目备注
# 5. 提交审核
```

#### 3. 预发布版本

```bash
# 构建预发布版本
npm run build:weapp -- --env staging

# 上传到体验版
# 在微信开发者工具中：
# 1. 点击"预览"生成二维码
# 2. 分享二维码给测试人员
```

### H5 平台部署

#### 1. 开发环境

```bash
# 启动开发服务器
npm run dev:h5

# 访问 http://localhost:10086
```

#### 2. 生产环境部署

```bash
# 构建生产版本
npm run build:h5

# 部署到静态服务器
# dist 目录包含所有静态文件
```

#### 3. Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # HTTPS 重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 根目录
    root /var/www/taro-bluetooth-print/dist;
    index index.html;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

#### 4. CDN 配置

```javascript
// cdn.config.js
module.exports = {
  // 静态资源 CDN 配置
  publicPath:
    process.env.NODE_ENV === 'production'
      ? 'https://cdn.your-domain.com/taro-bluetooth-print/'
      : '/',

  // 资源文件名哈希
  filenameHashing: true,

  // Gzip 压缩
  productionGzip: true,
  productionGzipExtensions: ['js', 'css']
};
```

### React Native 部署

#### 1. iOS 部署

```bash
# 安装依赖
cd ios && pod install && cd ..

# 开发模式运行
npm run dev:rn

# 构建发布版本
# iOS
cd ios
xcodebuild -workspace TaroBluetoothPrint.xcworkspace \
           -scheme TaroBluetoothPrint \
           -configuration Release \
           -destination generic/platform=iOS \
           -archivePath TaroBluetoothPrint.xcarchive \
           archive

# 导出 IPA
xcodebuild -exportArchive \
           -archivePath TaroBluetoothPrint.xcarchive \
           -exportOptionsPlist ExportOptions.plist \
           -exportPath ./build
```

#### 2. Android 部署

```bash
# 生成签名密钥
keytool -genkey -v -keystore my-release-key.keystore \
        -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 构建 APK
cd android
./gradlew assembleRelease

# 构建 AAB（推荐用于 Google Play）
./gradlew bundleRelease
```

#### 3. 应用商店发布

```json
// package.json 配置
{
  "name": "taro-bluetooth-print",
  "version": "2.0.0",
  "scripts": {
    "build:ios": "cd ios && xcodebuild -workspace TaroBluetoothPrint.xcworkspace -scheme TaroBluetoothPrint -configuration Release archive",
    "build:android": "cd android && ./gradlew assembleRelease"
  }
}
```

## 🌍 环境配置

### 1. 开发环境

```bash
# .env.development
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
API_URL=http://localhost:3000
BLUETOOTH_SCAN_TIMEOUT=5000
CONNECTION_TIMEOUT=3000
```

### 2. 测试环境

```bash
# .env.test
NODE_ENV=test
DEBUG=false
LOG_LEVEL=info
API_URL=https://test-api.example.com
BLUETOOTH_SCAN_TIMEOUT=10000
CONNECTION_TIMEOUT=8000
```

### 3. 生产环境

```bash
# .env.production
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
API_URL=https://api.example.com
BLUETOOTH_SCAN_TIMEOUT=15000
CONNECTION_TIMEOUT=10000
```

### 4. 环境配置加载

```typescript
// src/config/environment.ts
export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: any;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private loadConfig(): void {
    const env = process.env.NODE_ENV || 'development';

    // 加载基础配置
    const baseConfig = require('./base.config').default;

    // 加载环境特定配置
    const envConfig = require(`./${env}.config`).default;

    // 合并配置
    this.config = {
      ...baseConfig,
      ...envConfig,
      env
    };
  }

  get(key: string): any {
    return this.config[key];
  }

  isDevelopment(): boolean {
    return this.config.env === 'development';
  }

  isProduction(): boolean {
    return this.config.env === 'production';
  }
}
```

## 🏗️ 构建优化

### 1. 代码分割

```javascript
// webpack 配置
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  }
};
```

### 2. Tree Shaking

```javascript
// package.json
{
  "sideEffects": [
    "*.scss",
    "*.css",
    "./src/components/index.ts"
  ]
}
```

### 3. 资源优化

```javascript
// 图片压缩配置
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

module.exports = {
  plugins: [
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.sharpMinify,
        options: {
          encodeOptions: {
            jpeg: { quality: 80 },
            png: { quality: 80 },
            webp: { quality: 80 }
          }
        }
      }
    })
  ]
};
```

### 4. Bundle 分析

```bash
# 安装分析工具
npm install --save-dev webpack-bundle-analyzer

# 分析构建结果
npm run analyze

# package.json scripts
{
  "scripts": {
    "analyze": "npx webpack-bundle-analyzer dist/static/js/*.js"
  }
}
```

## 🚀 CI/CD 集成

### 1. GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linting
        run: npm run lint

      - name: Build project
        run: npm run build

  deploy-weapp:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for WeChat
        run: npm run build:weapp

      - name: Upload to WeChat
        uses: ./.github/actions/upload-wechat
        with:
          app-id: ${{ secrets.WECHAT_APP_ID }}
          private-key: ${{ secrets.WECHAT_PRIVATE_KEY }}

  deploy-h5:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for H5
        run: npm run build:h5

      - name: Deploy to CDN
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 2. Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build:h5

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '80:80'
    environment:
      - NODE_ENV=production
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped
```

### 3. 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# 环境检查
if [ -z "$NODE_ENV" ]; then
  echo "❌ NODE_ENV is not set"
  exit 1
fi

# 依赖安装
echo "📦 Installing dependencies..."
npm ci

# 代码检查
echo "🔍 Running linting..."
npm run lint

# 测试运行
echo "🧪 Running tests..."
npm test

# 构建项目
echo "🏗️ Building project..."
npm run build

# 部署到目标环境
case "$NODE_ENV" in
  "production")
    echo "🌍 Deploying to production..."
    npm run deploy:prod
    ;;
  "staging")
    echo "🧪 Deploying to staging..."
    npm run deploy:staging
    ;;
  *)
    echo "❌ Unknown environment: $NODE_ENV"
    exit 1
    ;;
esac

echo "✅ Deployment completed successfully!"
```

## 📊 监控和日志

### 1. 错误监控

```typescript
// src/monitoring/error-monitor.ts
export class ErrorMonitor {
  private static instance: ErrorMonitor;

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  init(): void {
    // 全局错误捕获
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
  }

  private handleError(event: ErrorEvent): void {
    this.reportError({
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  }

  private handlePromiseRejection(event: PromiseRejectionEvent): void {
    this.reportError({
      type: 'promise',
      message: 'Unhandled Promise Rejection',
      reason: event.reason,
      stack: event.reason?.stack
    });
  }

  private reportError(error: any): void {
    // 发送错误到监控服务
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(console.error);
  }
}
```

### 2. 性能监控

```typescript
// src/monitoring/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTiming(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric(name, duration);
    };
  }

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // 保持最近100个记录
    if (values.length > 100) {
      values.shift();
    }

    // 发送到监控服务
    this.sendMetric(name, value);
  }

  private sendMetric(name: string, value: number): void {
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        value,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  }

  getAverageTime(name: string): number {
    const values = this.metrics.get(name) ?? [];
    if (values.length === 0) return 0;

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}
```

### 3. 日志配置

```typescript
// src/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data);
      this.sendLog('debug', message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, data);
      this.sendLog('info', message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, data);
      this.sendLog('warn', message, data);
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error);
      this.sendLog('error', message, error);
    }
  }

  private sendLog(level: string, message: string, data?: any): void {
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          data,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    }
  }
}
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 微信小程序部署问题

**问题：小程序上传失败**

```bash
# 解决方案：检查 appid 配置
# 1. 确保 project.config.json 中的 appid 正确
# 2. 检查小程序账号是否有上传权限
# 3. 确认版本号格式正确
```

**问题：蓝牙权限被拒绝**

```typescript
// 解决方案：引导用户开启权限
const requestBluetoothPermission = async () => {
  try {
    await Taro.openSetting();
    // 引导用户手动开启蓝牙权限
  } catch (error) {
    console.error('Failed to open settings:', error);
  }
};
```

#### 2. H5 部署问题

**问题：Web Bluetooth API 不可用**

```javascript
// 解决方案：检查浏览器兼容性
const checkWebBluetoothSupport = () => {
  if (!('bluetooth' in navigator)) {
    console.error('Web Bluetooth API is not supported');
    // 显示降级提示或使用其他方案
    return false;
  }
  return true;
};
```

**问题：HTTPS 证书问题**

```bash
# 解决方案：配置有效的 SSL 证书
# 1. 使用 Let's Encrypt 获取免费证书
# 2. 配置 Nginx SSL 设置
# 3. 设置自动续期
```

#### 3. React Native 部署问题

**问题：iOS 构建失败**

```bash
# 解决方案：清理和重新安装依赖
cd ios
rm -rf Pods/ Podfile.lock
pod install
cd ..
npx react-native run-ios
```

**问题：Android 构建失败**

```bash
# 解决方案：清理构建缓存
cd android
./gradlew clean
./gradlew build
```

### 4. 性能问题诊断

```typescript
// 性能监控工具
class PerformanceProfiler {
  static profileRender(componentName: string) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();

        console.log(`${componentName}.${propertyName} took ${end - start} ms`);
        return result;
      };

      return descriptor;
    };
  }
}

// 使用示例
class MyComponent {
  @PerformanceProfiler.profileRender('MyComponent')
  render() {
    // 渲染逻辑
  }
}
```

### 5. 调试工具

```typescript
// 开发工具集成
class DevTools {
  static init(): void {
    if (process.env.NODE_ENV === 'development') {
      // 暴露调试接口到全局
      (window as any).__TARO_BLUETOOTH_PRINT_DEVTOOLS__ = {
        logger: Logger.getInstance(),
        eventBus: container.get<IEventBus>('eventBus'),
        configManager: container.get<IConfigManager>('configManager')
      };
    }
  }
}

// 在控制台中使用
// window.__TARO_BLUETOOTH_PRINT_DEVTOOLS__.logger.info('Debug message');
```

## 📈 部署检查清单

### 部署前检查

- [ ] 代码已通过所有测试
- [ ] 代码质量检查通过
- [ ] 构建成功无错误
- [ ] 环境变量配置正确
- [ ] 依赖版本兼容性确认
- [ ] 安全漏洞扫描通过
- [ ] 性能测试达标

### 部署后验证

- [ ] 应用启动正常
- [ ] 蓝牙功能可用
- [ ] 打印功能正常
- [ ] 网络请求正常
- [ ] 日志记录正常
- [ ] 监控指标正常
- [ ] 用户体验良好

### 回滚准备

- [ ] 备份当前版本
- [ ] 准备回滚脚本
- [ ] 数据库备份
- [ ] 配置文件备份
- [ ] 紧急联系方式

## 📚 相关文档

- [API 文档](../api/README.md)
- [架构文档](../architecture/README.md)
- [最佳实践](../guide/best-practices.md)
- [故障排除](./troubleshooting.md)

---

_本文档随项目更新，最后更新时间: 2024年10月_
