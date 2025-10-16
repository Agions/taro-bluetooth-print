---
page: true
title: 收据打印示例
description: 使用 taro-bluetooth-print 打印标准零售收据的完整示例与最佳实践
---

# 收据打印

本示例展示如何使用库的收据能力，含两种方式：

- 直接调用收据 API
- 使用内置模板或自定义模板

适配 58mm/80mm 热敏机，兼容微信小程序、H5、RN 等平台。

## 准备工作

- 确保蓝牙已初始化并连接
- 建议预热打印机并设置字符集

```typescript
// 连接与初始化
await printer.bluetooth.init()
await printer.bluetooth.startDiscovery()
// ...选择设备后
await printer.bluetooth.connect("device-id")
await printer.printer.init()
await printer.printer.setCharacterSet("CHINA")
```

## 方式一：直接打印收据

使用 printReceipt，通过 ReceiptOptions 传入数据。

```typescript
const ok = await printer.printer.printReceipt({
  title: "消费小票",
  merchant: "示例商店",
  address: "北京市朝阳区XX路XX号",
  phone: "010-12345678",
  orderNo: "ORD-20250928-0001",
  items: [
    { name: "拿铁咖啡", price: 16.0, quantity: 2 },
    { name: "可颂面包", price: 12.5, quantity: 1 },
    { name: "芝士蛋糕（八折）", price: 28.0, quantity: 1, discount: 0.8 },
  ],
  subtotal: 72.5,
  discount: 5.6,
  tax: 3.2,
  total: 70.1,
  payment: { method: "微信支付", amount: 70.1 },
  date: "2025-09-28 15:30:45",
  operator: "收银员：张三",
  footer: "感谢惠顾，欢迎再次光临！",
  qrcode: "https://example.com/order/ORD-20250928-0001",
  logo: "https://example.com/logo.png",
})
```

### 字段说明

- items.discount 为 0-1 之间的小数，表示折扣系数
- subtotal/discount/tax/total 可由前端/后端计算，建议保留两位小数
- logo 支持网络图片、Base64、小程序本地路径；H5 需要同源或允许跨域

## 方式二：使用模板打印

内置模板 receipt 负责布局、表格对齐、金额格式化等。

```typescript
const ok = await printer.printer.printWithTemplate("receipt", {
  title: "消费小票",
  merchant: "示例商店",
  items: [
    { name: "商品1", price: 10.5, quantity: 2 },
    { name: "商品2", price: 5.0, quantity: 1 },
  ],
  total: 26.0,
  date: "2025-09-28 15:30:45",
  footer: "感谢您的惠顾",
})
```

### 自定义模板

如需完全控制布局，可继承 Template 自行构建命令。

```typescript
import { Template } from "taro-bluetooth-print/dist/printer/template"

class MyReceiptTemplate extends Template {
  async build(): Promise<number[]> {
    const cmds: number[] = []
    // 标题
    cmds.push(
      ...this.textCommand(this.data.title, { align: "center", bold: true })
    )
    // 商户信息
    cmds.push(...this.textCommand(this.data.merchant, { align: "center" }))
    cmds.push(...this.printLine("-"))
    // 商品表
    for (const item of this.data.items) {
      const line = `${item.name}  x${item.quantity}  ${fmtPrice(
        item.price * (item.discount ?? 1)
      )}`
      cmds.push(...this.textCommand(line))
    }
    // 合计
    cmds.push(...this.printLine("-"))
    cmds.push(
      ...this.textCommand(`合计：${fmtPrice(this.data.total)}`, {
        align: "right",
        bold: true,
      })
    )
    // 二维码（可选）
    if (this.data.qrcode) {
      cmds.push(
        ...this.qrcodeCommand(this.data.qrcode, { size: 8, align: "center" })
      )
    }
    // 结束走纸
    cmds.push(...this.feedCommand(3))
    return cmds
  }
}

function fmtPrice(n: number) {
  return `¥${n.toFixed(2)}`
}
```

## 表格与对齐

为 58mm/80mm 打印机设计建议：

- 58mm 最大宽度约 384px，80mm 约 576px
- 文本列建议使用固定宽度与截断，避免换行破坏表格
- 典型三列布局：名称 | 数量 | 金额

```typescript
function formatItemRow(name: string, qty: number, price: number, width = 32) {
  // 简单截断示例，确保一行内对齐
  const nm = name.length > 16 ? name.slice(0, 16) + "…" : name.padEnd(16, " ")
  const q = `x${qty}`.padStart(6, " ")
  const p = `¥${price.toFixed(2)}`.padStart(10, " ")
  return nm + q + p
}
```

## 金额与折扣计算

强烈建议由后端返回最终金额，前端仅校验与显示；如需前端计算：

```typescript
type Item = { name: string; price: number; quantity: number; discount?: number }

function calcTotals(items: Item[]) {
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
  const discount = items.reduce((s, it) => {
    const rate = it.discount ?? 1
    return s + it.price * it.quantity * (1 - rate)
  }, 0)
  const taxRate = 0.05
  const tax = (subtotal - discount) * taxRate
  const total = subtotal - discount + tax
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    total: round2(total),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
```

## 打印完整示例

封装一个打印收据的服务，包含连接校验、错误处理与重试。

```typescript
import TaroBluePrint from "taro-bluetooth-print"

export class ReceiptService {
  constructor(private printer = new TaroBluePrint({ paperWidth: 58 })) {}

  async ensureConnected() {
    if (!this.printer.bluetooth.isConnected()) {
      const ok = await this.printer.bluetooth.init()
      if (!ok) throw new Error("蓝牙初始化失败")
      await this.printer.bluetooth.startDiscovery({ timeout: 8000 })
      // TODO: 根据业务选择设备ID
      const devices = await this.printer.bluetooth.getDiscoveredDevices()
      const target = devices[0]
      if (!target) throw new Error("未发现可用设备")
      const conn = await this.printer.bluetooth.connect(target.deviceId)
      if (!conn) throw new Error("设备连接失败")
    }
    await this.printer.printer.init()
    await this.printer.printer.setCharacterSet("CHINA")
  }

  async print(data: {
    title: string
    merchant: string
    items: {
      name: string
      price: number
      quantity: number
      discount?: number
    }[]
    total: number
    date?: string
    footer?: string
    qrcode?: string
    logo?: string
  }) {
    await this.ensureConnected()
    const ok = await this.printer.printer.printWithTemplate("receipt", data)
    if (!ok) throw new Error("打印失败")
    return ok
  }
}
```

## 平台注意事项

- 微信小程序：logo 使用 wxfile:// 或网络地址，需配置域名白名单
- H5：Web Bluetooth 仅在支持的浏览器和 HTTPS 环境可用
- RN：需依赖平台蓝牙库，注意权限与初始化时机
- Harmony：使用对应适配器，注意服务/特征值差异

## 常见问题

- 行宽不足导致换行：缩短名称或使用截断策略
- 打印淡/虚：降低速度或提升热密度，分批输出
- 二维码过大：调整 size 至 6-10，确保居中
- 未响应：检查连接状态、重试写入并查看日志

## 相关链接

- 指南：打印机配置、图片打印
- API：PrinterManager、模板系统、ReceiptOptions
