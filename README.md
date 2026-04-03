# Taro Bluetooth Print

<p align="center">
  <a href="https://www.npmjs.com/package/taro-bluetooth-print" target="_blank"><img src="https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&color=4338ca" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/taro-bluetooth-print" target="_blank"><img src="https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&color=4338ca" alt="downloads"></a>
  <a href="https://github.com/agions/taro-bluetooth-print/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&color=4338ca" alt="license"></a>
  <a href="https://github.com/agions/taro-bluetooth-print" target="_blank"><img src="https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square" alt="stars"></a>
  <a href="https://github.com/agions/taro-bluetooth-print" target="_blank"><img src="https://img.shields.io/github/forks/agions/taro-bluetooth-print?style=flat-square" alt="forks"></a>
  <a href="https://bundlephobia.com/package/taro-bluetooth-print" target="_blank"><img src="https://img.shields.io/bundlephobia/minzip/taro-bluetooth-print?style=flat-square" alt="bundle size"></a>
</p>

<p align="center">
  轻量级、高性能的 Taro 蓝牙打印库 · 支持热敏票据、标签打印，覆盖 8+ 平台
</p>

---

## 特性亮点

### 基础能力

| 能力 | 说明 |
|------|------|
| 多平台适配 | 微信/支付宝/百度/字节跳动/QQ 小程序，H5 WebBluetooth，鸿蒙，React Native |
| 多协议驱动 | ESC/POS（热敏）、TSPL/ZPL/CPCL（标签）、STAR 系列 |
| 链式调用 | `printer.text(...).feed().qr(...).cut().print()`，IDE 自动补全 |
| TypeScript | 完整类型定义，无任何 `any` 暴露，无外部依赖 |
| 编码支持 | GBK / GB2312 / Big5 / UTF-8 / EUC-KR / Shift-JIS / ISO-2022-JP |

### 高级打印

| 能力 | 说明 |
|------|------|
| 图片打印 | Floyd-Steinberg 抖动算法，6 种抖动模式，RGBA → 黑白位图 |
| 二维码/条码 | 原生指令支持 Code128/EAN/UPC/QR/PDF417 等 10+ 格式 |
| 模板引擎 | loop 循环 / condition 条件 / border 边框 / table 表格，小票标签一键渲染 |
| 暂停/恢复/取消 | 完整的打印任务生命周期控制 |
| 打印预览 | ESC/POS 命令实时渲染为 Canvas 图像，调试所见即所得 |

### 运维管理

| 能力 | 说明 |
|------|------|
| 离线缓存 | 断网自动缓存，来网自动同步，零任务丢失 |
| 打印队列 | 优先级排序，失败自动重试，死链自动剔除 |
| 多打印机管理 | MultiPrinterManager 多设备并发，支持负载均衡 |
| 打印历史 | PrintHistory 完整记录，含耗时/字节数/成功率统计 |
| 定时重试 | ScheduledRetryManager 指数退避，进程重启后自动恢复调度 |
| 定时调度 | PrintScheduler 支持 cron 表达式/一次性/间隔重复任务 |
| 设备发现 | DiscoveryService 增强型过滤、排序、RSSI 缓存 |

---

## 性能指标

| 指标 | 值 |
|------|-----|
| 包体积（gzip） | **~226 KB**（含全部驱动，无外部依赖） |
| Tree-shaking | ✅ 支持，import { BluetoothPrinter } 即用 |
| 按需加载 | ✅ 编码表懒加载，未用到的字符集不进入产物 |
| 测试覆盖 | ✅ 648 个用例，CI 全链路通过 |

---

## 快速开始

```bash
pnpm add taro-bluetooth-print
```

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

  // 3. 链式调用打印
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

  await printer.disconnect();
}
```

---

## 平台与驱动

### 支持的平台

| 平台 | 适配器 | 状态 |
|------|--------|------|
| 微信小程序 | `TaroAdapter` | ✅ |
| H5 (Web Bluetooth) | `WebBluetoothAdapter` | ✅ |
| 支付宝小程序 | `AlipayAdapter` | ✅ |
| 百度小程序 | `BaiduAdapter` | ✅ |
| 字节跳动小程序 | `ByteDanceAdapter` | ✅ |
| QQ 小程序 | `QQAdapter` | ✅ |
| 鸿蒙 HarmonyOS | `TaroAdapter` | ✅ |
| React Native | `ReactNativeAdapter` | ✅ |

### 支持的驱动

| 驱动 | 协议 | 典型品牌 |
|------|------|---------|
| `EscPos` | ESC/POS | 佳博、芯烨、商米、汉印 |
| `TsplDriver` | TSPL | TSC ME240、TA210、TTP-244 |
| `ZplDriver` | ZPL | Zebra ZD420、GT800、ZM400 |
| `CpclDriver` | CPCL | HP IR3222、霍尼韦尔移动机 |
| `StarPrinter` | STAR | STAR TSP100、TSP700、TSP800 |
| `GPrinterDriver` | 自定义 | 佳博 GP-5890X 系列 |
| `XprinterDriver` | ESC/POS | 芯烨 XP-58 系列 |
| `SprtDriver` | ESC/POS | 思普瑞特系列 |

---

## 配置与事件

```typescript
const printer = new BluetoothPrinter();

// 传输参数
printer.setOptions({
  chunkSize: 20,  // 分片大小 byte（默认 20）
  delay: 20,       // 分片间隔 ms（默认 20）
  retries: 3,     // 写入失败重试次数（默认 3）
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
  ┌─────────────────────────────────────────┐
  │           BluetoothPrinter (Core)        │
  │  text() feed() qr() cut() image() print()│
  └──────────────┬──────────────────────────┘
                 │
       ┌─────────┼─────────┐
       ▼                     ▼
  ┌─────────┐          ┌──────────┐
  │ Drivers │          │ Adapters │
  │ EscPos  │          │ TaroAdapter│
  │ Tspl    │          │ WebBluetooth│
  │ Zpl     │          │ ReactNative │
  └────┬────┘          └─────┬────┘
       └──────────┬──────────┘
                  ▼
  ┌──────────────────────────────────────┐
  │              Services                  │
  │ PrintJob · Cache · Queue · History   │
  │ Statistics · Scheduler · Batch        │
  └──────────────────────────────────────┘
```

---

## 示例项目

| 示例 | 路径 |
|------|------|
| 微信小程序 | [examples/weapp](./examples/weapp) |
| H5 | [examples/h5](./examples/h5) |
| 鸿蒙 | [examples/harmonyos](./examples/harmonyos) |
| React Native | [examples/react-native](./examples/react-native) |

---

## 文档

- [快速开始](https://agions.github.io/taro-bluetooth-print/guide/getting-started) · 5 分钟入门
- [功能特性](https://agions.github.io/taro-bluetooth-print/guide/features) · 全部功能
- [驱动支持](https://agions.github.io/taro-bluetooth-print/guide/drivers) · ESC/POS、TSPL、ZPL
- [核心概念](https://agions.github.io/taro-bluetooth-print/guide/core-concepts) · 架构设计
- [API 参考](https://agions.github.io/taro-bluetooth-print/api) · 完整 API
- [常见问题](https://agions.github.io/taro-bluetooth-print/guide/faq) · FAQ

---

## 开发

```bash
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print
pnpm install

pnpm test       # 测试（648 用例）
pnpm lint       # ESLint + Prettier
pnpm type-check # TypeScript 检查
pnpm build      # 构建产物
pnpm docs:dev   # 本地文档
```

---

## 许可证

[MIT](./LICENSE) · Copyright © 2024-present Agions
