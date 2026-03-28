# Taro Bluetooth Print

<p align="center">
  <img src="https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="npm version">
  <img src="https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="downloads">
  <img src="https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="license">
  <img src="https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square" alt="stars">
  <img src="https://img.shields.io/github/forks/agions/taro-bluetooth-print?style=flat-square" alt="forks">
  <img src="https://img.shields.io/bundlephobia/minzip/taro-bluetooth-print?style=flat-square" alt="bundle size">
</p>

<p align="center">
  <strong>轻量级、高性能的 Taro 蓝牙打印库</strong><br>
  支持热敏票据打印机、标签打印机，覆盖 8+ 平台
</p>

---

## 特性

### 核心能力

| 特性 | 说明 |
|------|------|
| 高性能打印 | 直接操作字节缓冲区，服务端缓存优化 |
| 多平台适配 | 微信/支付宝/百度/字节跳动/QQ 小程序，H5 WebBluetooth，鸿蒙，React Native |
| 多协议驱动 | ESC/POS（热敏）、TSPL/ZPL/CPCL（标签）、STAR 系列 |
| TypeScript | 完整类型定义，IDE 智能提示 |

### 高级打印

| 特性 | 说明 |
|------|------|
| 图片打印 | Floyd-Steinberg 抖动算法，6 种抖动模式 |
| 二维码/条码 | 原生指令支持，多种格式，格式校验 |
| 暂停/恢复/取消 | 完整的打印任务控制 |
| 离线缓存 | 断网自动缓存，来网自动同步 |
| 打印队列 | 优先级排序，失败自动重试 |
| 模板引擎 | 支持循环、条件、边框、表格等语法 |
| 打印预览 | ESC/POS 命令渲染为图像预览 |
| 插件系统 | 可扩展架构，支持自定义钩子 |

### 运维管理

| 特性 | 说明 |
|------|------|
| 多打印机管理 | MultiPrinterManager 支持多设备并发 |
| 打印历史 | PrintHistory 追踪打印记录和统计 |
| 定时重试 | ScheduledRetryManager 指数退避，重启恢复 |
| 状态检测 | PrinterStatus 检测纸张/电量状态 |
| 批量优化 | BatchPrintManager 合并小任务减少开销 |

### 编码支持

GBK / GB2312 / Big5 / UTF-8 / EUC-KR（韩文）/ Shift-JIS / ISO-2022-JP（日文）

---

## 安装

```bash
# npm
npm install taro-bluetooth-print

# yarn
yarn add taro-bluetooth-print

# pnpm
pnpm add taro-bluetooth-print
```

---

## 性能指标

| 指标 | 值 |
|------|-----|
| 包体积 | **26 KB**（gzip） |
| Tree-shaking | 支持 |
| 按需加载 | 编码表懒加载 |

---

## 快速开始

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

---

## 支持的平台

| 平台 | 适配器 | 状态 |
|------|--------|------|
| 微信小程序 | `TaroAdapter` | [x] |
| H5 (Web Bluetooth) | `WebBluetoothAdapter` | [x] |
| 支付宝小程序 | `AlipayAdapter` | [x] |
| 百度小程序 | `BaiduAdapter` | [x] |
| 字节跳动小程序 | `ByteDanceAdapter` | [x] |
| QQ 小程序 | `QQAdapter` | [x] |
| 鸿蒙 HarmonyOS | `HarmonyOSAdapter` | [x] |
| React Native | `ReactNativeAdapter` | [x] |

---

## 支持的驱动

| 驱动 | 协议 | 适用打印机 |
|------|------|-----------|
| `EscPos` | ESC/POS | 热敏票据打印机（58/80mm） |
| `TsplDriver` | TSPL | TSC 标签打印机 |
| `ZplDriver` | ZPL | Zebra 斑马标签打印机 |
| `CpclDriver` | CPCL | HP/霍尼韦尔移动打印机 |
| `StarPrinter` | STAR | STAR TSP/SP700 系列票据打印机 |

---

## 配置

```typescript
const printer = new BluetoothPrinter();

// 适配器参数
printer.setOptions({
  chunkSize: 20,   // 分片大小（默认 20）
  delay: 20,       // 分片间隔 ms（默认 20）
  retries: 3,     // 重试次数（默认 3）
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

---

## 架构

```
  +----------------------+
  |  BluetoothPrinter     |
  |  (Core)              |
  +----------+-----------+
             |
       +-----+-----+
       |           |
  +----v---+   +---v----+
  | Driver |   | Adapter |
  | Layer  |   | Layer   |
  +---+----+   +----+----+
      |             |
      +------+------+
             |
       +-----v-----+
       | Services  |
       | (PrintJob, |
       |  Cache,    |
       |  Queue...) |
       +-----------+
```

---

## 示例项目

- [微信小程序示例](https://github.com/Agions/taro-bluetooth-print/tree/main/examples/weapp)
- [H5 示例](https://github.com/Agions/taro-bluetooth-print/tree/main/examples/h5)
- [鸿蒙示例](https://github.com/Agions/taro-bluetooth-print/tree/main/examples/harmonyos)
- [React Native 示例](https://github.com/Agions/taro-bluetooth-print/tree/main/examples/react-native)

---

## 文档

- [快速开始](https://agions.github.io/taro-bluetooth-print/guide/getting-started) - 5 分钟入门
- [功能特性](https://agions.github.io/taro-bluetooth-print/guide/features) - 全部功能介绍
- [驱动支持](https://agions.github.io/taro-bluetooth-print/guide/drivers) - ESC/POS、TSPL、ZPL、CPCL
- [核心概念](https://agions.github.io/taro-bluetooth-print/guide/core-concepts) - 架构设计与原理
- [API 参考](https://agions.github.io/taro-bluetooth-print/api) - 完整的 API 文档
- [常见问题](https://agions.github.io/taro-bluetooth-print/guide/faq) - FAQ

---

## 贡献

欢迎贡献代码！

```bash
# 克隆仓库
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 构建
pnpm build

# 本地文档
pnpm docs:dev
```

---

## 许可证

[MIT](./LICENSE) © Agions

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/agions">Agions</a>
</p>
