---
layout: home

hero:
  name: "taro-bluetooth-print"
  text: "高性能蓝牙打印库"
  tagline: "热敏票据 · 标签打印 · 多平台适配 · 离线缓存 · 断点续传"
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/getting-started
    - theme: alt
      text: 查看功能特性
      link: /guide/features

features:
  - icon: 🔗
    title: 多平台适配
    details: 一套 API，微信/支付宝/百度/字节跳动小程序、H5 WebBluetooth、鸿蒙、React Native 全覆盖。零平台迁移成本。
  - icon: 🖨️
    title: 多协议驱动
    details: 内置 ESC/POS、TSPL、ZPL、CPCL、StarPrinter 五大协议驱动，兼容佳博、芯烨、TSC、Zebra 等主流打印机。
  - icon: ⚡
    title: 高性能传输
    details: 智能分片传输 + 断点续传 + 弱网自适应重试机制，确保不稳定网络下也能稳定完成打印任务。
  - icon: 📋
    title: 模板引擎
    details: 支持 loop 循环、condition 条件、border 边框、table 表格等高级模板语法，小票标签轻松渲染。
  - icon: 💾
    title: 离线缓存
    details: 网络断开时自动缓存打印任务，恢复连接后自动同步，不丢失任何打印任务。
  - icon: 📊
    title: 批量管理
    details: 内置 PrintStatistics 统计、ScheduledRetryManager 定时重试、BatchPrintManager 批量打印管理，开箱即用。

---

## npm 安装

```bash
pnpm add taro-bluetooth-print
```

## 快速使用

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

async function main() {
  // 1. 扫描发现打印机
  const deviceManager = new DeviceManager();
  deviceManager.on('device-found', (device) => {
    console.log('发现设备:', device.name);
  });
  await deviceManager.startScan({ timeout: 10000 });

  // 2. 连接打印机
  const printer = new BluetoothPrinter();
  const devices = deviceManager.getDiscoveredDevices();
  await printer.connect(devices[0].deviceId);

  // 3. 链式调用构建打印内容
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

  await printer.disconnect();
}
```

## 支持的驱动

| 驱动 | 协议 | 典型品牌 |
|------|------|---------|
| **EscPos** | ESC/POS | 佳博、芯烨、商米、汉印 |
| **TsplDriver** | TSPL | TSC ME240、TA210、TTP-244 |
| **ZplDriver** | ZPL | Zebra ZD420、GT800、ZM400 |
| **CpclDriver** | CPCL | HP IR3222、霍尼韦尔移动机 |
| **StarPrinter** | STAR | STAR TSP100、TSP700、TSP800 |
| **GPrinterDriver** | 自定义 | 佳博 GP-5890X 系列 |
| **XprinterDriver** | ESC/POS | 芯烨 XP-58 系列 |
| **SprtDriver** | ESC/POS | 思普瑞特系列 |

## 项目信息

[![npm version](https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&logo=npm)](https://www.npmjs.com/package/taro-bluetooth-print)
[![npm downloads](https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&logo=npm)](https://www.npmjs.com/package/taro-bluetooth-print)
[![license](https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&logo=open-source-initiative)](https://github.com/agions/taro-bluetooth-print/blob/main/LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/agions/taro-bluetooth-print/ci.yml?branch=main&style=flat-square&logo=github-actions)](https://github.com/agions/taro-bluetooth-print/actions)
[![stars](https://img.shields.io/github/stars/taro-bluetooth-print?style=flat-square&logo=github)](https://github.com/agions/taro-bluetooth-print/stargazers)
[![forks](https://img.shields.io/github/forks/taro-bluetooth-print?style=flat-square&logo=github)](https://github.com/agions/taro-bluetooth-print/forks)

::: tip 为什么选择 taro-bluetooth-print？

- **轻量级**：gzip 后仅 ~15KB，无任何外部依赖
- **高性能**：智能分片 + 断点续传，弱网也能稳定打印
- **多平台**：一套 API，微信/支付宝/百度/字节/H5/鸿蒙/RN 全覆盖
- **工业级驱动**：ESC/POS、TSPL、ZPL、CPCL、StarPrinter 五大协议
- **离线容灾**：断网自动缓存，来网自动同步，零打印任务丢失

:::
