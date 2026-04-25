---
layout: home

hero:
  name: "taro-bluetooth-print"
  text: "Taro 蓝牙打印方案"
  tagline: "零依赖 · 多平台 · 多协议 · TypeScript 严格模式 · 开箱即用"
  actions:
    - theme: brand
      text: 🚀 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 📖 API 文档
      link: /guide/features
    - theme: alt
      text: GitHub
      link: https://github.com/agions/taro-bluetooth-print

features:
  - icon: 🌐
    title: 多平台适配
    details: 一套代码，七大平台全覆盖。微信 / 支付宝 / 百度 / 字节跳动 / QQ 小程序、H5 WebBluetooth、React Native。零迁移成本，一处编写到处打印。
  - icon: 🖨️
    title: 多协议驱动
    details: 内置 ESC/POS、TSPL、ZPL、CPCL、STAR、GPrinter、Xprinter、SPRT 八大驱动，覆盖佳博、芯烨、TSC、Zebra、STAR 等主流品牌打印机。
  - icon: ⛓️
    title: 链式 API
    details: 优雅的链式调用构建打印内容，支持 .text()、.qrcode()、.barcode()、.image()、.cut() 等丰富的指令方法。TypeScript 严格模式提供完整的类型提示。
  - icon: 📝
    title: 模板引擎
    details: 灵活的模板语法支持 loop 循环、condition 条件、border 边框、table 表格等高级特性，复杂小票和标签布局也能轻松渲染。
  - icon: 💾
    title: 离线缓存
    details: 网络中断时自动缓存打印任务，恢复连接后智能同步重试，配合断点续传机制，确保不丢失任何一笔打印任务。
  - icon: 📦
    title: 批量管理
    details: 内置 PrintStatistics 统计面板、ScheduledRetryManager 定时重试、BatchPrintManager 批量打印等企业级工具，满足高并发打印场景。

---

<div class="badges-row" style="text-align:center; margin-top:2rem; margin-bottom:1rem;">
  <a href="https://www.npmjs.com/package/taro-bluetooth-print" target="_blank">
    <img src="https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&logo=npm&label=npm&color=blue" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/taro-bluetooth-print" target="_blank">
    <img src="https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&logo=npm&label=downloads&color=green" alt="downloads" />
  </a>
  <a href="https://github.com/agions/taro-bluetooth-print/blob/main/LICENSE" target="_blank">
    <img src="https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&logo=open-source-initiative&color=orange" alt="license" />
  </a>
  <a href="https://github.com/agions/taro-bluetooth-print/actions" target="_blank">
    <img src="https://img.shields.io/github/actions/workflow/status/agions/taro-bluetooth-print/ci.yml?branch=main&style=flat-square&logo=github-actions&label=CI" alt="build status" />
  </a>
  <a href="https://github.com/agions/taro-bluetooth-print/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square&logo=github&color=yellow" alt="stars" />
  </a>
  <a href="https://github.com/agions/taro-bluetooth-print" target="_blank">
    <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  </a>
  <a href="https://github.com/agions/taro-bluetooth-print" target="_blank">
    <img src="https://img.shields.io/badge/zero-dependency-yes-brightgreen?style=flat-square" alt="zero dependency" />
  </a>
</div>

## ⚡ 快速开始

安装依赖：

```bash
# 使用 pnpm（推荐）
pnpm add taro-bluetooth-print

# 或使用 npm
npm install taro-bluetooth-print
```

仅需几行代码即可完成蓝牙打印：

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

async function printReceipt() {
  // 1️⃣ 扫描并发现打印机
  const deviceManager = new DeviceManager();
  deviceManager.on('device-found', (device) => {
    console.log('发现设备:', device.name);
  });
  await deviceManager.startScan({ timeout: 10000 });

  // 2️⃣ 连接目标打印机
  const printer = new BluetoothPrinter();
  const devices = deviceManager.getDiscoveredDevices();
  await printer.connect(devices[0].deviceId);

  // 3️⃣ 链式调用构建并打印内容
  await printer
    .text('=== 欢迎光临 ===', 'GBK')
    .feed()
    .text('商品A     x1    ¥10.00', 'GBK')
    .text('商品B     x2    ¥20.00', 'GBK')
    .feed()
    .text('------------------------', 'GBK')
    .text('合计：            ¥30.00', 'GBK')
    .feed(2)
    .qr('https://example.com', { size: 6 })
    .feed(2)
    .cut()
    .print();

  // 4️⃣ 断开连接
  await printer.disconnect();
}
```

## 📋 支持的驱动

| 驱动 | 协议 | 适用场景 | 典型品牌 / 型号 |
|------|------|---------|----------------|
| **EscPosDriver** | ESC/POS | 热敏小票 | 佳博、芯烨、商米、汉印 |
| **TsplDriver** | TSPL | 条码标签 | TSC ME240、TA210、TTP-244 |
| **ZplDriver** | ZPL | 工业标签 | Zebra ZD420、GT800、ZM400 |
| **CpclDriver** | CPCL | 便携标签 | HP IR3222、霍尼韦尔移动打印机 |
| **StarPrinterDriver** | STAR | 餐饮收银 | STAR TSP100、TSP700、TSP800 |
| **GPrinterDriver** | 佳博自定义 | 热敏小票 | 佳博 GP-5890X 系列 |
| **XprinterDriver** | ESC/POS | 热敏小票 | 芯烨 XP-58 系列 |
| **SprtDriver** | ESC/POS | 热敏小票 | 思普瑞特 SP 系列 |

## 🌐 平台支持

| 平台 | 适配层 | 状态 |
|------|--------|------|
| 微信小程序 | `wx.writeBLECharacteristicValue` | ✅ 已适配 |
| 支付宝小程序 | `my.writeBLECharacteristicValue` | ✅ 已适配 |
| 百度小程序 | `swan.writeBLECharacteristicValue` | ✅ 已适配 |
| 字节跳动小程序 | `tt.writeBLECharacteristicValue` | ✅ 已适配 |
| QQ 小程序 | `qq.writeBLECharacteristicValue` | ✅ 已适配 |
| H5 | WebBluetooth API | ✅ 已适配 |
| React Native | `@react-native-ble-plx` | ✅ 已适配 |

::: tip 💡 为什么选择 taro-bluetooth-print？

- **极致轻量** — gzip 后仅 ~15KB，零外部依赖，不增加包体积负担
- **生产可靠** — TypeScript 严格模式 + 100% 类型覆盖，编译期消灭潜在错误
- **多端统一** — 一套 API 适配 7 大平台，无需关心底层蓝牙差异
- **工业级驱动** — 8 大打印机驱动覆盖市面主流品牌，即插即用
- **离线容灾** — 断网自动缓存、来网智能同步，确保零打印任务丢失
- **GBK 编码** — 内置 GBK 编码支持，完美显示中文内容
- **企业级管理** — 打印统计、定时重试、批量队列，满足复杂业务场景

:::

<div style="text-align:center; margin-top:2rem; padding:1rem 0; color:#888; font-size:0.85rem;">
  MIT License · Made with ❤️ by <a href="https://github.com/agions" target="_blank">agions</a>
</div>
