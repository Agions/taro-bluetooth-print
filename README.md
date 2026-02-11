# Taro Bluetooth Print

<p align="center">
  <img src="https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="npm version">
  <img src="https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="downloads">
  <img src="https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome">
</p>

<p align="center">
  <strong>轻量级、高性能的 Taro 蓝牙打印库</strong><br>
  支持图片、二维码、断点续传与弱网适配
</p>

---

## ✨ 特性

- 🚀 **高性能** - 直接字节缓冲区操作，服务缓存优化
- 📱 **跨平台** - 基于 Taro 4.x 蓝牙 API，支持微信小程序、H5、React Native 等
- 🎨 **简洁 API** - 链式调用，易于使用
- 🖼️ **图片打印** - 内置 Floyd-Steinberg 抖动算法，高质量图片转换
- 📲 **二维码支持** - 原生 ESC/POS 二维码指令
- 📊 **条码支持** - 支持 Code128、Code39、EAN-13、EAN-8、UPC-A 格式
- 🔄 **断点续传** - 支持打印任务暂停/恢复/取消
- 📶 **弱网适配** - 智能分片与重试机制，自适应传输参数
- 📊 **进度追踪** - 实时打印进度事件
- 💾 **离线缓存** - 断网时自动缓存，重连后自动同步
- 📋 **打印队列** - 优先级排序，失败自动重试
- 📝 **模板引擎** - 内置收据和标签模板
- 🔍 **打印预览** - ESC/POS 命令渲染为图像预览
- 🌐 **Web Bluetooth** - 支持 H5 环境的 Web Bluetooth API
- 💓 **连接稳定** - 心跳检测和自动重连机制
- 🏷️ **标签打印** - TSPL 协议支持，适用于 TSC 等标签打印机 (v2.3+)
- 🔌 **插件系统** - 可扩展架构，支持自定义钩子 (v2.3+)
- 🛠️ **TypeScript** - 完整的类型定义和 JSDoc 文档
- 🧪 **高测试覆盖** - Vitest 驱动，69+ 测试用例

## 📦 安装

```bash
npm install taro-bluetooth-print
# 或
yarn add taro-bluetooth-print
# 或
pnpm add taro-bluetooth-print
```

## 🚀 快速开始

### 基础示例

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter();

async function printReceipt(deviceId: string) {
  try {
    // 连接设备
    await printer.connect(deviceId);

    // 构建打印内容
    await printer
      .text('=== 欢迎光临 ===', 'GBK')
      .feed()
      .text('商品A     x1    ¥10.00')
      .text('商品B     x2    ¥20.00')
      .feed()
      .text('------------------------')
      .text('合计：            ¥30.00')
      .feed(2)
      .qr('https://example.com', { size: 8 })
      .feed(2)
      .cut()
      .print(); // 发送到打印机

    console.log('打印成功！');
  } catch (error) {
    console.error('打印失败:', error);
  } finally {
    await printer.disconnect();
  }
}
```

### 监听打印进度

```typescript
import { BluetoothPrinter, LogLevel, Logger } from 'taro-bluetooth-print';

// 启用调试日志（可选）
Logger.setLevel(LogLevel.DEBUG);

const printer = new BluetoothPrinter();

// 监听进度
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  console.log(`打印进度: ${percent}%`);
});

// 监听错误
printer.on('error', error => {
  console.error('打印错误:', error.code, error.message);
});

// 监听完成
printer.on('print-complete', () => {
  console.log('打印完成！');
});

await printer.connect(deviceId);
await printer.text('Hello').feed().print();
```

### 断点续传示例

```typescript
const printer = new BluetoothPrinter();

await printer.connect(deviceId);

// 构建大量打印内容
printer.text('第1页内容...').feed(10).text('第2页内容...').feed(10).text('第3页内容...');

// 开始打印（异步）
const printPromise = printer.print();

// 5秒后暂停
setTimeout(() => {
  printer.pause();
  console.log('已暂停，剩余:', printer.remaining(), '字节');
}, 5000);

// 再过5秒恢复
setTimeout(async () => {
  await printer.resume();
  console.log('已恢复打印');
}, 10000);

await printPromise;
```

### 图片打印

```typescript
import Taro from '@tarojs/taro';

// 从 Canvas 获取图片数据
const canvas = Taro.createCanvasContext('myCanvas');
// ... 绘制内容 ...

Taro.canvasGetImageData({
  canvasId: 'myCanvas',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  success: res => {
    const imageData = new Uint8Array(res.data);

    printer.image(imageData, res.width, res.height).feed(2).print();
  },
});
```

### 弱网适配

```typescript
// 配置重试和分片参数
printer.setOptions({
  chunkSize: 20, // 每次发送20字节
  delay: 30, // 分片间延迟30ms
  retries: 5, // 失败重试5次
});

await printer.text('测试内容').print();
```

### 文本格式化 (v2.2+)

```typescript
await printer
  .align('center')
  .setSize(2, 2)
  .setBold(true)
  .text('大标题')
  .resetStyle()
  .feed()
  .align('left')
  .text('正常文本')
  .print();
```

### 条码打印 (v2.2+)

```typescript
await printer.text('商品条码：').barcode('6901234567890', 'EAN13', { height: 80 }).feed(2).print();
```

### 设备管理 (v2.2+)

```typescript
import { DeviceManager } from 'taro-bluetooth-print';

const deviceManager = new DeviceManager();

// 监听设备发现
deviceManager.on('device-found', device => {
  console.log('发现设备:', device.name, device.deviceId);
});

// 开始扫描
await deviceManager.startScan({ timeout: 10000 });

// 获取已发现的设备
const devices = deviceManager.getDiscoveredDevices();
```

### 打印队列 (v2.2+)

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({ maxSize: 100 });

// 添加高优先级任务
queue.add(printData, { priority: 'HIGH' });

// 监听完成事件
queue.on('job-completed', job => {
  console.log('任务完成:', job.id);
});
```

### 离线缓存 (v2.2+)

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache();

// 断网时自动缓存
await cache.save({ id: 'job-1', data: printData });

// 重连后同步
await cache.sync();
```

### TSPL 标签打印 (v2.3+)

```typescript
import { TsplDriver } from 'taro-bluetooth-print';

const tspl = new TsplDriver();

// 生成标签打印指令
const buffer = tspl
  .size(60, 40)           // 标签尺寸 60x40mm
  .gap(3)                 // 标签间隙 3mm
  .clear()                // 清除缓冲区
  .text('商品名称', { x: 50, y: 30, font: 3 })
  .text('¥99.00', { x: 50, y: 80, font: 4, xMultiplier: 2 })
  .barcode('6901234567890', { 
    x: 50, 
    y: 120, 
    type: 'EAN13',
    height: 60 
  })
  .qrcode('https://example.com', { 
    x: 300, 
    y: 30, 
    cellWidth: 4 
  })
  .print(1)               // 打印1份
  .getBuffer();

// 发送到打印机
await printer.connect(deviceId);
await printer.setOptions({ chunkSize: 100 });
// 直接发送 TSPL 指令需要自定义适配器
```

### 插件系统 (v2.3+)

```typescript
import { 
  PluginManager, 
  createLoggingPlugin, 
  createRetryPlugin 
} from 'taro-bluetooth-print';

// 创建插件管理器
const plugins = new PluginManager();

// 注册日志插件
await plugins.register(createLoggingPlugin({
  logProgress: true,  // 记录进度
}));

// 注册重试插件
await plugins.register(createRetryPlugin({
  maxRetries: 5,
  initialDelay: 1000,
}));

// 自定义插件
const myPlugin = {
  name: 'my-plugin',
  hooks: {
    beforePrint: (buffer) => {
      console.log(`即将打印 ${buffer.length} 字节`);
      return buffer; // 可以修改数据
    },
    afterPrint: (bytesSent) => {
      console.log(`打印完成: ${bytesSent} 字节`);
    },
    onError: (error) => {
      // 上报错误
      reportError(error);
      return false; // false = 不抑制错误
    },
  },
};

await plugins.register(myPlugin);
```

## 📚 文档

完整文档请访问：**[https://agions.github.io/taro-bluetooth-print/](https://agions.github.io/taro-bluetooth-print/)**

- [安装指南](https://agions.github.io/taro-bluetooth-print/guide/getting-started)
- [功能特性](https://agions.github.io/taro-bluetooth-print/guide/features)
- [核心概念](https://agions.github.io/taro-bluetooth-print/guide/core-concepts)
- [高级用法](https://agions.github.io/taro-bluetooth-print/guide/advanced)
- [API 参考](https://agions.github.io/taro-bluetooth-print/api)
- [故障排除](https://agions.github.io/taro-bluetooth-print/guide/troubleshooting)

## 🎯 核心 API

### BluetoothPrinter

| 方法                                 | 说明                 | 返回值          |
| ------------------------------------ | -------------------- | --------------- |
| `connect(deviceId)`                  | 连接蓝牙设备         | `Promise<this>` |
| `disconnect()`                       | 断开连接             | `Promise<void>` |
| `text(content, encoding?)`           | 添加文本             | `this`          |
| `feed(lines?)`                       | 换行                 | `this`          |
| `image(data, width, height)`         | 打印图片             | `this`          |
| `qr(content, options?)`              | 打印二维码           | `this`          |
| `barcode(content, format, options?)` | 打印条码 (v2.2+)     | `this`          |
| `align(alignment)`                   | 设置对齐 (v2.2+)     | `this`          |
| `setSize(width, height)`             | 设置字体大小 (v2.2+) | `this`          |
| `setBold(enabled)`                   | 设置粗体 (v2.2+)     | `this`          |
| `setUnderline(enabled)`              | 设置下划线 (v2.2+)   | `this`          |
| `resetStyle()`                       | 重置样式 (v2.2+)     | `this`          |
| `cut()`                              | 切纸                 | `this`          |
| `setOptions(options)`                | 设置适配器参数       | `this`          |
| `print()`                            | 发送打印             | `Promise<void>` |
| `pause()`                            | 暂停打印             | `void`          |
| `resume()`                           | 恢复打印             | `Promise<void>` |
| `cancel()`                           | 取消打印             | `void`          |
| `remaining()`                        | 获取剩余字节数       | `number`        |

### TsplDriver (v2.3+)

| 方法                           | 说明               | 返回值       |
| ------------------------------ | ------------------ | ------------ |
| `size(width, height)`          | 设置标签尺寸(mm)   | `this`       |
| `gap(gap, offset?)`            | 设置标签间隙       | `this`       |
| `speed(speed)`                 | 设置打印速度(1-10) | `this`       |
| `density(density)`             | 设置打印浓度(0-15) | `this`       |
| `clear()`                      | 清除图像缓冲区     | `this`       |
| `text(content, options)`       | 添加文本           | `this`       |
| `barcode(content, options)`    | 添加条码           | `this`       |
| `qrcode(content, options)`     | 添加二维码         | `this`       |
| `box(options)`                 | 绘制矩形框         | `this`       |
| `line(options)`                | 绘制线条           | `this`       |
| `print(copies?, sets?)`        | 打印               | `this`       |
| `getBuffer()`                  | 获取指令缓冲区     | `Uint8Array` |
| `getCommands()`                | 获取指令字符串     | `string`     |

### PluginManager (v2.3+)

| 方法                        | 说明           | 返回值          |
| --------------------------- | -------------- | --------------- |
| `register(plugin, options)` | 注册插件       | `Promise<void>` |
| `unregister(name)`          | 注销插件       | `Promise<void>` |
| `get(name)`                 | 获取插件       | `Plugin`        |
| `has(name)`                 | 检查插件是否存在 | `boolean`     |
| `getNames()`                | 获取所有插件名 | `string[]`      |
| `clear()`                   | 清除所有插件   | `Promise<void>` |

### 事件

| 事件名           | 数据类型              | 说明         |
| ---------------- | --------------------- | ------------ |
| `state-change`   | `PrinterState`        | 连接状态变化 |
| `progress`       | `{ sent, total }`     | 打印进度     |
| `error`          | `BluetoothPrintError` | 错误事件     |
| `connected`      | `string` (deviceId)   | 已连接       |
| `disconnected`   | `string` (deviceId)   | 已断开       |
| `print-complete` | `void`                | 打印完成     |

## 🔧 配置选项

```typescript
interface IAdapterOptions {
  chunkSize?: number; // 分片大小（默认: 20字节）
  delay?: number; // 分片延迟（默认: 20ms）
  retries?: number; // 重试次数（默认: 3）
}

interface IQrOptions {
  model?: 1 | 2; // 二维码模型（默认: 2）
  size?: number; // 模块大小 1-16（默认: 6）
  errorCorrection?: 'L' | 'M' | 'Q' | 'H'; // 纠错级别（默认: 'M'）
}
```

## 🌐 平台支持

| 平台           | 支持情况 | 说明                         |
| -------------- | -------- | ---------------------------- |
| 微信小程序     | ✅       | 完全支持                     |
| H5             | ✅       | 需要浏览器支持 Web Bluetooth |
| React Native   | ✅       | 通过 Taro RN                 |
| 支付宝小程序   | ✅       | 完全支持                     |
| 百度小程序     | ✅       | 完全支持                     |
| 字节跳动小程序 | ✅       | 完全支持（抖音、头条等）     |

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────┐
│            BluetoothPrinter (Core)              │
│  - 连接管理  - 打印队列  - 事件系统  - 断点续传  │
└──────────┬──────────────────┬───────────────────┘
           │                  │
     ┌─────▼──────┐     ┌────▼──────┐
     │  Adapter   │     │  Driver   │
     │    层      │     │    层     │
     └────────────┘     └───────────┘
           │                  │
     ┌─────▼──────┐     ┌────▼──────┐     ┌────────────┐
     │ Taro       │     │ ESC/POS   │     │  Plugin    │
     │ Web BT     │     │ TSPL      │     │  System    │
     │ Alipay...  │     │ (ZPL...)  │     │  (v2.3+)   │
     └────────────┘     └───────────┘     └────────────┘
```
         │                │
    ┌────▼─────┐    ┌────▼──────┐
    │Taro      │    │ESC/POS    │
    │Adapter   │    │Driver     │
    └──────────┘    └───────────┘
```

- **Core 层**: 核心业务逻辑
- **Adapter 层**: 平台适配（Taro、Web Bluetooth 等）
- **Driver 层**: 打印机协议（ESC/POS、TSPL 等）

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)。

### 开发设置

```bash
# 克隆仓库
git clone https://github.com/agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 本地文档
npm run docs:dev
```

## 📄 许可证

[MIT](./LICENSE) © Agions

## 🙏 致谢

感谢所有贡献者的支持！

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/agions">Agions</a>
</p>
