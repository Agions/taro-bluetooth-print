---
page: true
title: 示例
description: taro-bluetooth-print 使用示例集合
---

# 示例

这里汇总了 taro-bluetooth-print 的常用示例，覆盖从最基础的文本打印到图片/条码/二维码与完整小票的打印场景。每个示例都包含必要的代码片段与注意事项，便于快速参考与复制粘贴使用。

- 基础打印: 文本、分隔线、走纸、切纸等基础能力
- 图片打印: 网络图片、本地图片（小程序）、Base64 图片等
- 收据打印: 标题、商品列表、小计/折扣/税费、二维码/Logo 等
- 批量打印: 多任务顺序打印与失败重试、断点续打的基本实践

## 目录

- 基础打印
  - 进入: /examples/basic-print
- 图片打印
  - 进入: /examples/image-print
- 收据打印
  - 进入: /examples/receipt-print
- 批量打印
  - 进入: /examples/batch-print

提示:

- 在开始打印前，务必确保蓝牙已连接且打印机已准备就绪
- H5 场景请使用支持 Web Bluetooth 的浏览器（如 Chrome），并在安全上下文（https 或 localhost）中访问
- 微信小程序需在真机环境中测试蓝牙功能；模拟器不支持蓝牙

## 快速上手代码片段

以下代码展示了“连接 → 打印 → 断开”的最小闭环，帮助你验证环境与打印机是否正常。

```typescript
// 安装
// npm i taro-bluetooth-print

import { BluetoothPrinter } from "taro-bluetooth-print"

async function quickDemo() {
  const printer = new BluetoothPrinter({
    // 可选：按需开启
    // debug: true,
    // encoding: "UTF-8",
    // paperWidth: 58, // or 80
  })

  // 1) 初始化（可选，根据平台适配器自动完成）
  await printer.printer.init()

  // 2) 搜索并连接（示例仅展示 API，实际应配合 UI 选择）
  await printer.bluetooth.startDiscovery()
  const devices = await printer.bluetooth.getDiscoveredDevices()
  await printer.bluetooth.stopDiscovery()

  if (!devices.length) {
    console.warn("未发现可用蓝牙设备")
    return
  }

  // 选择第一个设备进行连接（生产中请让用户选择）
  const ok = await printer.bluetooth.connect(devices[0].deviceId)
  if (!ok) {
    console.warn("蓝牙连接失败")
    return
  }

  // 3) 打印文本
  await printer.printer.printText([
    { text: "Hello, World!", align: "center", bold: true },
    "这是第一行普通文本",
  ])

  // 4) 走纸与切纸（按需）
  await printer.printer.feed(2)
  await printer.printer.cut("partial")

  // 5) 断开连接
  await printer.bluetooth.disconnect()
}

quickDemo().catch(console.error)
```

## 常见注意事项

- 字符编码
  - 默认 'GBK'，如需 Emoji 或更广字符覆盖可改用 'UTF-8'
- 纸宽
  - 58/80mm 常见，建议与打印机实际宽度保持一致以确保布局效果
- 图片打印
  - 建议控制最大宽度（如 384px@58mm）并酌情开启抖动提升黑白效果
- 故障与重试
  - 若出现超时、链路中断，可结合批量打印示例中的重试逻辑与断点续打策略

## 进一步阅读

- 指南
  - /guide/getting-started
  - /guide/basic-usage
  - /guide/bluetooth-connection
  - /guide/printer-configuration
  - /guide/image-printing
- API
  - /api/
  - /api/bluetooth-adapter
  - /api/printer-manager
- 参考
  - /reference/changelog
  - /reference/faq
  - /reference/contributing
