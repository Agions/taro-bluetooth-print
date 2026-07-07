# 示例项目

`taro-bluetooth-print` 官方示例集合，覆盖**微信小程序 / H5 / 鸿蒙 HarmonyOS / React Native** 四大平台完整打印场景。

## 目录结构

```
examples/
├── README.md           # 本文件 — 示例总览
├── weapp/              # 微信小程序（Taro 3.x）
│   ├── printer-page.tsx
│   └── README.md
├── h5/                 # H5 Web Bluetooth（纯前端）
│   ├── index.html
│   └── README.md
├── harmonyos/          # 鸿蒙 HarmonyOS（ArkTS）
│   ├── harmony-print-service.ts
│   └── README.md
└── react-native/       # React Native（iOS + Android）
    ├── PrinterScreen.tsx
    └── README.md
```

## 平台一览

| 平台 | 适配器 | 示例文件 | 文档 |
|:---|:---|:---|:---|
| 微信小程序 | `TaroAdapter` | `printer-page.tsx` | [README](./weapp/README.md) |
| H5 | `WebBluetoothAdapter` | `index.html` | [README](./h5/README.md) |
| 鸿蒙 HarmonyOS | `HarmonyAdapter` | `harmony-print-service.ts` | [README](./harmonyos/README.md) |
| React Native | `ReactNativeAdapter` | `PrinterScreen.tsx` | [README](./react-native/README.md) |

## 快速开始

### 方式 1: 克隆完整项目

```bash
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print
pnpm install
```

### 方式 2: 仅安装核心库

```bash
pnpm add taro-bluetooth-print
```

## 示例场景

### 🧾 打印小票（ESC/POS）

适用于佳博 / 芯烨 / 商米 / 汉印 / 思普瑞特等热敏打印机。

```typescript
await printer
  .text('=== 欢迎光临 ===', { align: 'center', bold: true })
  .feed()
  .text('商品A     x1    ¥10.00')
  .text('商品B     x2    ¥20.00')
  .feed()
  .text('------------------------')
  .text('合计：            ¥30.00', { bold: true })
  .feed(2)
  .qr('https://example.com', { size: 6 })
  .feed(2)
  .cut()
  .print();
```

**适用平台：** 全部 4 个平台

---

### 🏷️ 打印标签（TSPL / ZPL / CPCL）

适用于 TSC / Zebra / HP / 霍尼韦尔等标签打印机。

```typescript
const driver = new TsplDriver();
driver
  .size(60, 40)      // 60x40mm 标签
  .gap(3)            // 3mm 间隙
  .clear()
  .text('商品名称', { x: 20, y: 20, font: 3 })
  .text('¥99.00', { x: 20, y: 60, font: 4 })
  .barcode('6901234567890', { x: 20, y: 100, type: 'EAN13' })
  .qrcode('https://example.com', { x: 250, y: 20 })
  .print(1);
```

**适用平台：** 全部 4 个平台（需打印机支持对应协议）

---

### 📋 打印队列（批量任务）

适用于批量打印、订单打印等场景。

```typescript
const queue = new PrintQueue({ maxSize: 100 });

// 添加高优先级任务
queue.add(printData1, { priority: 'HIGH' });

// 添加普通任务
queue.add(printData2, { priority: 'NORMAL' });

// 监听完成事件
queue.on('job-completed', (job) => {
  console.log('任务完成:', job.id);
});

queue.on('job-failed', (job, error) => {
  console.error('任务失败:', job.id, error);
});
```

**适用平台：** 全部 4 个平台

---

### 🔄 断点续传（大文件打印）

适用于打印大量内容（如 100 条订单）的场景。

```typescript
const printPromise = printer.print();

// 5 秒后暂停
setTimeout(() => {
  printer.pause();
  console.log('已暂停，剩余:', printer.remaining());
}, 5000);

// 10 秒后恢复
setTimeout(async () => {
  await printer.resume();
}, 10000);

await printPromise;
```

**适用平台：** 全部 4 个平台

---

## 平台差异

| 功能 | 微信小程序 | H5 | 鸿蒙 | React Native |
|:---|:---:|:---:|:---:|:---:|
| 蓝牙扫描 | ✅ | ✅ | ✅ | ✅ |
| BLE 连接 | ✅ | ✅ | ✅ | ✅ |
| 打印收据 | ✅ | ✅ | ✅ | ✅ |
| 打印标签 | ✅ | ✅ | ✅ | ✅ |
| 断点续传 | ✅ | ✅ | ✅ | ✅ |
| 打印队列 | ✅ | ✅ | ✅ | ✅ |
| 离线缓存 | ✅ | ✅ | ✅ | ✅ |

## 常见问题

**Q: 无法扫描设备？**  
A: 检查蓝牙权限、设备是否开启 BLE 广播、手机与打印机距离。

**Q: 连接成功但打印失败？**  
A: 查看错误日志，可能是 MTU 过小、分片大小不合适、打印机忙。

**Q: 打印乱码？**  
A: 确认编码设置正确（GBK/UTF-8），检查打印机是否支持所选编码。

**Q: 真机调试时扫描不到设备？**  
A: 微信小程序蓝牙 API 不支持开发者工具模拟器，需真机预览。

更多问题请查看 [完整文档](https://agions.github.io/taro-bluetooth-print/guide/faq)。

## 相关链接

- [完整文档](https://agions.github.io/taro-bluetooth-print/)
- [快速开始](https://agions.github.io/taro-bluetooth-print/guide/getting-started)
- [功能详解](https://agions.github.io/taro-bluetooth-print/guide/features)
- [驱动支持](https://agions.github.io/taro-bluetooth-print/guide/drivers)
- [API 参考](https://agions.github.io/taro-bluetooth-print/api/)
- [GitHub Issues](https://github.com/Agions/taro-bluetooth-print/issues)

## 贡献示例

欢迎提交更多平台的示例！请遵循以下规范：

1. 每个示例包含完整可运行代码
2. 添加详细的 README.md（前置条件 / 快速开始 / API 说明 / 常见问题）
3. 确保代码通过 lint 和 type-check
4. 提交 PR 时附带测试截图或录屏

## 许可证

MIT · Copyright © 2024-present [Agions](https://github.com/Agions)
