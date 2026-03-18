# Taro Bluetooth Print

<p align="center">
  <img src="https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="npm version">
  <img src="https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="downloads">
  <img src="https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="license">
  <img src="https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square" alt="stars">
  <img src="https://img.shields.io/github/forks/agions/taro-bluetooth-print?style=flat-square" alt="forks">
</p>

<p align="center">
  <strong>轻量级、高性能的 Taro 蓝牙打印库</strong><br>
  支持热敏打印机、标签打印机，多平台适配
</p>

---

## ✨ 特性

- 🚀 **高性能** - 直接字节缓冲区操作，服务缓存优化
- 📱 **多平台** - 微信小程序、H5、鸿蒙、支付宝、百度、字节跳动
- 🎨 **多驱动** - ESC/POS (热敏)、TSPL/ZPL/CPCL (标签)
- 🖼️ **图片打印** - 内置 Floyd-Steinberg 抖动算法
- 📲 **二维码/条码** - 原生指令支持，多种格式
- 🔄 **断点续传** - 暂停/恢复/取消打印任务
- 📶 **弱网适配** - 智能分片与重试机制
- 📊 **进度追踪** - 实时打印进度事件
- 💾 **离线缓存** - 断网自动缓存，联网自动同步
- 📋 **打印队列** - 优先级排序，失败自动重试
- 📝 **模板引擎** - 内置收据和标签模板
- 🔍 **打印预览** - ESC/POS 命令渲染为图像
- 🔌 **插件系统** - 可扩展架构，支持自定义钩子
- 🛠️ **TypeScript** - 完整的类型定义和 JSDoc

## 📦 安装

```bash
# npm
npm install taro-bluetooth-print

# yarn
yarn add taro-bluetooth-print

# pnpm
pnpm add taro-bluetooth-print
```

## 🚀 快速开始

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

async function print() {
  // 1. 扫描设备
  const manager = new DeviceManager();
  await manager.startScan({ timeout: 10000 });
  const devices = manager.getDiscoveredDevices();
  
  if (devices.length === 0) {
    console.log('未发现设备');
    return;
  }
  
  // 2. 连接打印机
  const printer = new BluetoothPrinter();
  await printer.connect(devices[0].deviceId);
  
  // 3. 打印
  await printer
    .text('=== 欢迎光临 ===', 'GBK')
    .feed()
    .text('商品A     x1    ¥10.00', 'GBK')
    .text('商品B     x2    ¥20.00', 'GBK')
    .feed()
    .text('------------------------')
    .text('合计：            ¥30.00', 'GBK')
    .feed(2)
    .qr('https://example.com')
    .feed(2)
    .cut()
    .print();
    
  // 4. 断开
  await printer.disconnect();
  
  console.log('打印完成！');
}
```

## 🖥️ 支持的平台

| 平台 | 适配器 | 状态 |
|------|--------|------|
| 微信小程序 | `TaroAdapter` | ✅ |
| H5 (Web Bluetooth) | `WebBluetoothAdapter` | ✅ |
| 支付宝小程序 | `AlipayAdapter` | ✅ |
| 百度小程序 | `BaiduAdapter` | ✅ |
| 字节跳动小程序 | `ByteDanceAdapter` | ✅ |
| 鸿蒙 HarmonyOS | `HarmonyOSAdapter` | ✅ |
| React Native | `TaroAdapter` | ✅ |

## 🖨️ 支持的驱动

| 驱动 | 协议 | 适用打印机 |
|------|------|-----------|
| `EscPos` | ESC/POS | 热敏票据打印机 (58/80mm) |
| `TsplDriver` | TSPL | TSC 标签打印机 |
| `ZplDriver` | ZPL | Zebra 斑马标签打印机 |
| `CpclDriver` | CPCL | HP/霍尼韦尔移动打印机 |

### 标签打印示例 (TSPL)

```typescript
import { BluetoothPrinter, TsplDriver } from 'taro-bluetooth-print';

const driver = new TsplDriver();
const printer = new BluetoothPrinter(undefined, driver);

driver
  .size(60, 40)           // 60x40mm 标签
  .gap(3)                 // 间隙 3mm
  .clear()
  .text('商品名称', { x: 20, y: 20, font: 3 })
  .text('¥99.00', { x: 20, y: 60, font: 4 })
  .barcode('6901234567890', { x: 20, y: 100, type: 'EAN13' })
  .qrcode('https://example.com', { x: 250, y: 20 })
  .print(1);

await printer.connect(deviceId);
await printer.print();
```

## 📚 示例项目

完整的示例项目，帮助快速上手：

- [微信小程序示例](examples/weapp/) - 完整的打印页面
- [H5 示例](examples/h5/) - Web Bluetooth 网页打印
- [鸿蒙示例](examples/harmonyos/) - HarmonyOS 原生打印服务
- [React Native 示例](examples/react-native/) - RN 打印组件

## 📖 文档

- [快速开始](https://agions.github.io/taro-bluetooth-print/guide/getting-started) - 5 分钟入门
- [功能特性](https://agions.github.io/taro-bluetooth-print/guide/features) - 全部功能介绍
- [驱动支持](https://agions.github.io/taro-bluetooth-print/guide/drivers) - ESC/POS, TSPL, ZPL, CPCL
- [核心概念](https://agions.github.io/taro-bluetooth-print/guide/core-concepts) - 架构设计与原理
- [API 参考](https://agions.github.io/taro-bluetooth-print/api) - 完整的 API 文档
- [故障排除](https://agions.github.io/taro-bluetooth-print/guide/troubleshooting) - 常见问题解决

## 🔧 配置

```typescript
const printer = new BluetoothPrinter();

// 适配器参数
printer.setOptions({
  chunkSize: 20,   // 分片大小 (默认 20)
  delay: 20,       // 分片间隔 ms (默认 20)
  retries: 3,      // 重试次数 (默认 3)
});

// 事件监听
printer.on('progress', ({ sent, total }) => {
  console.log(`进度: ${(sent / total * 100).toFixed(1)}%`);
});

printer.on('error', (error) => {
  console.error('错误:', error.code, error.message);
});

printer.on('print-complete', () => {
  console.log('打印完成');
});
```

## 🏗️ 架构

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
     │ HarmonyOS │     │ ZPL       │     │  (v2.3+)   │
     └────────────┘     │ CPCL      │     └────────────┘
                        └───────────┘
```

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)。

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

- [Taro](https://taro.jd.com/) - 跨平台开发框架
- [ESC/POS](https://www.epson-biz.com/) - 打印机指令集
- 所有贡献者和测试用户

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/agions">Agions</a>
</p>
