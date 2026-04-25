<div align="center">

# 🖨️ Taro Bluetooth Print

**轻量级、高性能的 Taro 跨端蓝牙打印库 — 覆盖 7 大平台、8 种打印协议，开箱即用**

[![npm version](https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&color=4338ca)](https://www.npmjs.com/package/taro-bluetooth-print)
[![downloads](https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&color=4338ca)](https://www.npmjs.com/package/taro-bluetooth-print)
[![license](https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&color=4338ca)](https://github.com/agions/taro-bluetooth-print/blob/main/LICENSE)
[![stars](https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square)](https://github.com/agions/taro-bluetooth-print)
[![forks](https://img.shields.io/github/forks/agions/taro-bluetooth-print?style=flat-square)](https://github.com/agions/taro-bluetooth-print)
[![bundle size](https://img.shields.io/bundlephobia/minzip/taro-bluetooth-print?style=flat-square)](https://bundlephobia.com/package/taro-bluetooth-print)

</div>

---

## ✨ 特性总览

### 📡 基础能力

| 能力 | 说明 |
|:-----|:-----|
| 多平台适配 | 微信 / 支付宝 / 百度 / 字节跳动 / QQ 小程序，H5 WebBluetooth，React Native |
| 多协议驱动 | ESC/POS（热敏）、TSPL / ZPL / CPCL（标签）、STAR / 佳博 / 芯烨 / 思普瑞特 |
| 链式调用 API | `printer.text(...).feed().qr(...).cut().print()` — IDE 全自动补全 |
| TypeScript 严格模式 | 完整类型定义，零 `any` 暴露，无外部运行时依赖 |
| 多编码支持 | GBK / GB2312 / Big5 / UTF-8 / EUC-KR / Shift-JIS / ISO-2022-JP |
| 零运行时依赖 | 生产包无第三方运行时依赖，体积可控 |

### 🖨️ 高级打印

| 能力 | 说明 |
|:-----|:-----|
| 图片打印 | Floyd-Steinberg 抖动算法，6 种抖动模式，RGBA → 黑白位图自适应转换 |
| 二维码 / 条码 | 原生指令支持 Code128 / EAN / UPC / QR / PDF417 等 10+ 格式 |
| 模板引擎 | 支持 `loop` 循环 / `condition` 条件 / `border` 边框 / `table` 表格，小票标签一键渲染 |
| 任务生命周期 | 完整的打印任务暂停 / 恢复 / 取消控制 |
| 打印预览 | ESC/POS 命令实时渲染为 Canvas 图像，调试所见即所得 |

### ⚙️ 运维管理

| 能力 | 说明 |
|:-----|:-----|
| 离线缓存 | 断网自动缓存，恢复网络自动同步，零任务丢失 |
| 打印队列 | 优先级排序、失败自动重试、死链自动剔除 |
| 多打印机管理 | `MultiPrinterManager` 多设备并发，支持负载均衡 |
| 打印历史 | `PrintHistory` 完整记录，含耗时 / 字节数 / 成功率统计 |
| 定时重试 | `ScheduledRetryManager` 指数退避策略，进程重启后自动恢复调度 |
| 定时调度 | `PrintScheduler` 支持 cron 表达式 / 一次性 / 间隔重复任务 |
| 设备发现 | `DiscoveryService` 增强型过滤、排序、RSSI 信号缓存 |
| 插件系统 | DI 容器 + EventBus 事件总线，可扩展架构 |

---

## 📦 安装

```bash
# npm
npm install taro-bluetooth-print

# pnpm（推荐）
pnpm add taro-bluetooth-print

# yarn
yarn add taro-bluetooth-print
```

> **前置依赖**：项目需安装 `@tarojs/taro ^3.6.22` 及以上版本。

---

## 🚀 快速开始

```typescript
import {
  createBluetoothPrinter,
  DeviceManager,
  WebBluetoothAdapter
} from 'taro-bluetooth-print';

async function printReceipt() {
  // ① 扫描蓝牙设备
  const manager = new DeviceManager();
  await manager.startScan({ timeout: 10000 });
  const devices = manager.getDiscoveredDevices();

  if (devices.length === 0) {
    console.warn('未发现蓝牙设备');
    return;
  }

  // ② 创建打印机实例并连接
  const printer = createBluetoothPrinter({
    adapter: new WebBluetoothAdapter()
  });

  await printer.connect(devices[0].deviceId);

  // ③ 链式调用 — 构建并打印小票
  await printer
    .text('=== 欢迎光临 ===', 'GBK')
    .feed()
    .text('商品A     x1    ¥10.00', 'GBK')
    .text('商品B     x2    ¥20.00', 'GBK')
    .feed()
    .text('------------------------')
    .text('合计：            ¥30.00', 'GBK')
    .feed(2)
    .qr('https://example.com', { size: 6 })
    .feed(2)
    .cut()
    .print();

  // ④ 断开连接
  await printer.disconnect();
}
```

---

## 📱 平台支持

| 平台 | 适配器类 | 状态 |
|:-----|:---------|:----:|
| 微信小程序 | `TaroAdapter` | ✅ |
| 支付宝小程序 | `AlipayAdapter` | ✅ |
| 百度小程序 | `BaiduAdapter` | ✅ |
| 字节跳动小程序 | `ByteDanceAdapter` | ✅ |
| QQ 小程序 | `QQAdapter` | ✅ |
| H5 (Web Bluetooth) | `WebBluetoothAdapter` | ✅ |
| React Native | `ReactNativeAdapter` | ✅ |

> 💡 **提示**：鸿蒙 HarmonyOS 可通过 `TaroAdapter` 适配使用。

## 🖨️ 打印机驱动

| 驱动 | 协议 | 典型品牌 / 型号 |
|:-----|:-----|:---------------|
| `EscPos` | ESC/POS | 佳博、芯烨、商米、汉印 |
| `TsplDriver` | TSPL | TSC ME240、TA210、TTP-244 |
| `ZplDriver` | ZPL | Zebra ZD420、GT800、ZM400 |
| `CpclDriver` | CPCL | HP IR3222、霍尼韦尔移动打印机 |
| `StarPrinter` | STAR | STAR TSP100、TSP700、TSP800 |
| `GPrinterDriver` | 佳博自定义 | 佳博 GP-5890X 系列 |
| `XprinterDriver` | ESC/POS | 芯烨 XP-58 系列 |
| `SprtDriver` | ESC/POS | 思普瑞特系列 |

---

## ⚙️ 配置与事件

### 传输参数配置

```typescript
const printer = createBluetoothPrinter();

// 调整蓝牙传输参数（适配不同打印机的吞吐能力）
printer.setOptions({
  chunkSize: 20,   // 单次写入分片大小（byte），默认 20
  delay: 20,       // 分片写入间隔（ms），默认 20
  retries: 3,      // 写入失败重试次数，默认 3
});
```

### 事件监听

```typescript
// 打印进度
printer.on('progress', ({ sent, total }) => {
  console.log(`打印进度: ${(sent / total * 100).toFixed(1)}%`);
});

// 错误事件
printer.on('error', (error) => {
  console.error('打印错误:', error.code, error.message);
});

// 打印完成
printer.on('print-complete', () => {
  console.log('✅ 打印任务完成');
});
```

---

## 🛡️ 错误处理

库提供完整的类型化错误层次结构，支持精确的错误捕获与处理：

```typescript
import {
  BluetoothPrintError,
  ConnectionError,
  PrintJobError,
  CommandBuildError,
  ErrorCode
} from 'taro-bluetooth-print';

// 方式一：统一错误基类捕获
try {
  await printer.print();
} catch (err) {
  if (err instanceof BluetoothPrintError) {
    console.error(`[${err.code}] ${err.message}`);
  }
}

// 方式二：按错误类型精确处理（推荐）
try {
  await printer.connect(deviceId);
} catch (err) {
  if (ConnectionError.isConnectionError(err)) {
    // 连接失败 — 可提示用户重试
    console.warn('连接错误:', err.message);
  }
}

try {
  // ... 打印操作
} catch (err) {
  if (PrintJobError.isPrintJobError(err)) {
    // 打印任务失败 — 可重新加入队列
    console.warn('任务错误:', err.message);
  }
}

try {
  printer.text('测试', 'UNSUPPORTED_ENCODING');
} catch (err) {
  if (CommandBuildError.isCommandBuildError(err)) {
    // 指令构建失败 — 参数校验问题
    console.warn('指令错误:', err.message);
  }
}
```

---

## 🏗️ 架构概览

```
 ┌──────────────────────────────────────────────────┐
 │              PrinterFactory (工厂层)                │
 │   createBluetoothPrinter · createWebBluetooth     │
 └─────────────────────┬────────────────────────────┘
                       │
                       ▼
 ┌──────────────────────────────────────────────────┐
 │            BluetoothPrinter (核心层)              │
 │   text() · feed() · qr() · cut() · image()       │
 │   print() · setOptions() · on() / off()          │
 └──────────┬───────────────────────┬───────────────┘
            │                       │
   ┌────────▼────────┐     ┌───────▼────────┐
   │   Drivers (驱动) │     │  Adapters (适配) │
   │                 │     │                 │
   │  EscPos        │     │  TaroAdapter    │
   │  TsplDriver    │     │  WebBluetooth   │
   │  ZplDriver     │     │  ReactNative    │
   │  CpclDriver    │     │  AlipayAdapter  │
   │  StarPrinter   │     │  BaiduAdapter   │
   │  GPrinter      │     │  ByteDance      │
   │  Xprinter      │     │  QQAdapter      │
   │  SprtDriver    │     │                 │
   └────────┬────────┘     └───────┬────────┘
            │                       │
            └───────────┬───────────┘
                        ▼
 ┌──────────────────────────────────────────────────┐
 │              Services (服务层)                     │
 │                                                   │
 │  PrintJob · Cache · Queue · History              │
 │  Statistics · Scheduler · Batch                  │
 │  EventBus · DIContainer · PluginSystem           │
 └──────────────────────────────────────────────────┘
```

---

## 📊 性能指标

| 指标 | 值 |
|:-----|:---|
| 包体积（gzip） | **~226 KB**（含全部驱动，无外部依赖） |
| Tree-shaking | ✅ 支持，按需引入 |
| 编码懒加载 | ✅ 未用到的字符集不进入产物 |
| 测试用例 | ✅ 648 个用例，覆盖阈值 70%+ |
| 构建工具 | Vite + Vitest |

---

## 📂 示例项目

| 示例 | 路径 |
|:-----|:-----|
| 微信小程序 | [examples/weapp](./examples/weapp) |
| H5 | [examples/h5](./examples/h5) |
| 鸿蒙 HarmonyOS | [examples/harmonyos](./examples/harmonyos) |
| React Native | [examples/react-native](./examples/react-native) |

---

## 📖 文档

| 文档 | 说明 |
|:-----|:-----|
| [快速开始](https://agions.github.io/taro-bluetooth-print/guide/getting-started) | 5 分钟入门教程 |
| [功能特性](https://agions.github.io/taro-bluetooth-print/guide/features) | 全部功能详解 |
| [驱动支持](https://agions.github.io/taro-bluetooth-print/guide/drivers) | ESC/POS、TSPL、ZPL 驱动说明 |
| [核心概念](https://agions.github.io/taro-bluetooth-print/guide/core-concepts) | 架构设计与核心概念 |
| [API 参考](https://agions.github.io/taro-bluetooth-print/api) | 完整 API 文档 |
| [常见问题](https://agions.github.io/taro-bluetooth-print/guide/faq) | FAQ |

---

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 代码检查
pnpm lint

# TypeScript 类型检查
pnpm type-check

# 构建产物
pnpm build

# 本地文档开发
pnpm docs:dev
```

---

## 📄 许可证

[MIT](./LICENSE) · Copyright © 2024-present [Agions](https://github.com/Agions)
