---
layout: home

hero:
  name: "taro-bluetooth-print"
  text: "高性能蓝牙打印库"
  tagline: "热敏票据 · 标签打印 · 多平台适配 · 离线缓存 · 断点续传"
  image:
    src: /hero-illustration.svg
    alt: 蓝牙打印示意
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/getting-started
    - theme: alt
      text: 查看功能特性
      link: /guide/features

features:
  - icon: /icons/platform.svg
    title: 多平台适配
    details: 一套代码，支持微信/支付宝/百度/字节跳动小程序，H5 Web Bluetooth，鸿蒙，React Native 等平台。
  - icon: /icons/driver.svg
    title: 多协议驱动
    details: 内置 ESC/POS、TSPL、ZPL、CPCL、StarPrinter 等驱动，兼容佳博、芯烨、TSC、Zebra 等主流打印机。
  - icon: /icons/speed.svg
    title: 高性能传输
    details: 智能分片传输 + 断点续传 + 弱网自适应重试机制，确保不稳定网络下也能稳定完成打印。
  - icon: /icons/template.svg
    title: 模板引擎
    details: 支持 loop 循环、condition 条件、border 边框、table 表格等高级模板语法，轻松渲染小票和标签。
  - icon: /icons/offline.svg
    title: 离线缓存
    details: 网络断开时自动缓存打印任务，恢复连接后自动同步，不丢失任何打印任务。
  - icon: /icons/batch.svg
    title: 批量管理
    details: 内置 PrintStatistics 统计、ScheduledRetryManager 定时重试、BatchPrintManager 批量打印管理。
---

<div class="badges-grid">

[![npm version](https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&logo=npm)](https://www.npmjs.com/package/taro-bluetooth-print)
[![license](https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&logo=open-source-initiative)](https://github.com/agions/taro-bluetooth-print/blob/main/LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/agions/taro-bluetooth-print/ci.yml?branch=main&style=flat-square&logo=github-actions)](https://github.com/agions/taro-bluetooth-print/actions)
[![minzipped](https://img.badgesize.io/https:/unpkg.com/taro-bluetooth-print/dist/index.umd.js?compression=gzip&label=build%20size&style=flat-square)](https://unpkg.com/taro-bluetooth-print/dist/)
[![stars](https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square&logo=github)](https://github.com/agions/taro-bluetooth-print/stargazers)

</div>

::: tip 为什么选择 taro-bluetooth-print？
轻量级：gzip 后仅 ~15KB，无任何外部依赖
高性能：智能分片 + 断点续传，弱网也能稳定打印
多平台：一套 API，微信/支付宝/百度/字节/H5/鸿蒙/RN 全覆盖
工业级驱动：ESC/POS、TSPL、ZPL、CPCL、StarPrinter 五大协议
离线容灾：断网自动缓存，来网自动同步，零打印任务丢失
:::

## 快速开始

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

  // 3. 构建打印内容 (链式调用)
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

  // 4. 断开连接
  await printer.disconnect();
}
```

## 支持的打印机驱动

<div class="driver-table">

| 驱动 | 协议 | 适用打印机 | 典型品牌 |
|------|------|-----------|---------|
| **EscPos** | ESC/POS | 热敏票据打印机 | 佳博、芯烨、商米、汉印 |
| **TsplDriver** | TSPL | TSC 标签打印机 | TSC ME240、TA210 |
| **ZplDriver** | ZPL | Zebra 工业标签机 | Zebra ZD420、GT800 |
| **CpclDriver** | CPCL | HP/霍尼韦尔移动机 | HP IR3222、霍尼韦尔 |
| **StarPrinter** | STAR | STAR TSP 系列票据机 | STAR TSP100/700/800 |

</div>

## 赞助与社区

欢迎 Star · 欢迎贡献代码 · 欢迎提交 Issue 和 PR

<style>
/* ============================================
   首页自定义样式
   ============================================ */

/* 隐藏默认 hero image */
.VPHero .image-container {
  display: none !important;
}

/* Hero 区域底部 padding */
.VPHome {
  padding-bottom: 0 !important;
}

/* 驱动表格容器 */
.driver-table {
  border-radius: 16px !important;
  overflow: hidden !important;
  border: 1px solid var(--vp-c-border) !important;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.10) !important;
  margin: 24px 0 !important;
}

/* 驱动表头渐变 */
.driver-table th {
  background: linear-gradient(135deg, #0d9488, #14b8a6) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
}

/* 驱动表格行悬浮 */
.driver-table tr:hover td {
  background: #f0fdfa !important;
}

.dark .driver-table tr:hover td {
  background: rgba(13, 148, 136, 0.08) !important;
}

/* Badges 网格布局 */
.badges-grid {
  display: flex !important;
  gap: 12px !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
  margin: 24px 0 !important;
  align-items: center !important;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .badges-grid {
    gap: 8px !important;
  }
}
</style>
