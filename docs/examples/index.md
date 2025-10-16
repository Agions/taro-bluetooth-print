---
page: true
title: 示例
description: 常用打印示例的导航与概览
---

# 示例

本页汇总所有示例，点击进入详细教程与代码说明。顶部导航“示例”指向本页（/examples/）。

## 示例目录

- [基础打印](/examples/basic-print) — 文本、行距、切纸等基础操作
- [图片打印](/examples/image-print) — 网络/本地/Base64 图片打印与质量优化
- [收据打印](/examples/receipt-print) — 标准零售小票布局与模板打印
- [批量打印](/examples/batch-print) — 队列与重试、进度与取消的批量策略

## 快速演示

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"

// 创建打印机实例
const printer = new BluetoothPrinter()

// 初始化与搜索设备
await printer.bluetooth.init()
await printer.bluetooth.startDiscovery()

// ...在业务中选择设备ID后连接
// await printer.bluetooth.connect(deviceId)

// 打印文本
await printer.printer.printText("Hello, World!", {
  align: "center",
  bold: true,
})

// 走纸与切纸
await printer.printer.feed(2)
await printer.printer.cut("partial")
```

## 常见问题

- 示例页为空白：

  - 顶部“示例”导航指向 /examples/，该路由需要本页存在
  - 已添加本页文件，若仍空白，请执行构建预览命令：
    - 本地开发：`npm run docs:dev`
    - 构建站点：`npm run docs:build`，然后 `npm run docs:preview`

- 路由无法打开：
  - 确认链接是否与侧边栏一致：/examples/basic-print、/examples/image-print、/examples/receipt-print、/examples/batch-print
  - 若在自定义部署路径下，请确保 VitePress base 与部署路径一致（当前为 `/taro-bluetooth-print/`）
