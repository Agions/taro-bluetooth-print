---
page: true
title: 批量打印示例
description: 使用队列与并发控制进行批量打印的完整示例与最佳实践
---

# 批量打印

批量打印在点餐、仓储出库、票据批量生成等场景非常常见。合理的队列与并发控制可以避免蓝牙缓冲溢出、降低故障率，并提升整体吞吐。

本页将示范如何在多平台（微信小程序、H5、RN、Harmony）使用批量打印，包含任务模型、进度与取消、错误重试、断点恢复等能力。

相关配置与侧边栏见 [docs/.vitepress/config.ts](docs/.vitepress/config.ts)。

## 任务模型设计

使用统一的任务模型封装不同打印类型（文本、图片、收据、模板），并通过队列顺序执行。核心调用 API 参考：

- 文本打印: [TypeScript.printText()](docs/API.md:593)
- 图片打印: [TypeScript.printImage()](docs/API.md:678)
- 条形码: [TypeScript.printBarcode()](docs/API.md:724)
- 二维码: [TypeScript.printQRCode()](docs/API.md:782)
- 收据打印: [TypeScript.printReceipt()](docs/API.md:825)
- 模板打印: [TypeScript.printWithTemplate()](docs/API.md:926)
- 发送命令: [TypeScript.sendCommands()](docs/API.md:565)
- 走纸与切纸: [TypeScript.feed()](docs/API.md:519) / [TypeScript.cut()](docs/API.md:491)

```typescript
// 任务类型定义
type BatchTaskType =
  | "text"
  | "image"
  | "barcode"
  | "qrcode"
  | "receipt"
  | "template"

interface BatchTaskBase {
  id: string
  type: BatchTaskType
  retry?: number // 最大重试次数，默认 2
  priority?: number // 优先级（可选）
}

interface TextTask extends BatchTaskBase {
  type: "text"
  payload: { text: string | (string | TextOptions)[]; options?: TextOptions }
}

interface ImageTask extends BatchTaskBase {
  type: "image"
  payload: { image: string; options?: ImageOptions }
}

interface BarcodeTask extends BatchTaskBase {
  type: "barcode"
  payload: { data: string; options?: BarcodeOptions }
}

interface QRCodeTask extends BatchTaskBase {
  type: "qrcode"
  payload: { data: string; options?: QRCodeOptions }
}

interface ReceiptTask extends BatchTaskBase {
  type: "receipt"
  payload: ReceiptOptions
}

interface TemplateTask extends BatchTaskBase {
  type: "template"
  payload: { templateName: string; data: any }
}

type BatchTask =
  | TextTask
  | ImageTask
  | BarcodeTask
  | QRCodeTask
  | ReceiptTask
  | TemplateTask

interface BatchPrintOptions {
  concurrency?: number // 并发度，热敏打印建议 1
  onProgress?: (progress: ProgressEvent) => void
  onError?: (err: Error, task: BatchTask) => void
  onDone?: (stats: { total: number; success: number; failed: number }) => void
  cutAfterEach?: boolean // 每个任务后切纸
  feedLinesBetween?: number // 任务间走纸行数
}

interface ProgressEvent {
  current: number
  total: number
  task: BatchTask
  status: "pending" | "printing" | "success" | "failed" | "retrying"
}
```

## 队列服务实现

```typescript
import TaroBluePrint from "taro-bluetooth-print"

export class BatchPrintService {
  private queue: BatchTask[] = []
  private running = false
  private paused = false
  private success = 0
  private failed = 0

  constructor(
    private printer = new TaroBluePrint(),
    private opts: BatchPrintOptions = { concurrency: 1, feedLinesBetween: 1 }
  ) {}

  add(task: BatchTask) {
    task.retry = task.retry ?? 2
    this.queue.push(task)
  }

  addMany(tasks: BatchTask[]) {
    for (const t of tasks) this.add(t)
  }

  clear() {
    this.queue = []
    this.success = 0
    this.failed = 0
  }

  pause() {
    this.paused = true
  }
  resume() {
    this.paused = false
  }

  async ensureConnected() {
    if (!this.printer.bluetooth.isConnected()) {
      const ok = await this.printer.bluetooth.init()
      if (!ok) throw new Error("蓝牙初始化失败")
      await this.printer.bluetooth.startDiscovery()
      const devices = await this.printer.bluetooth.getDiscoveredDevices()
      const target = devices[0]
      if (!target) throw new Error("未发现设备")
      const conn = await this.printer.bluetooth.connect(target.deviceId)
      if (!conn) throw new Error("连接失败")
    }
    await this.printer.printer.init()
    await this.printer.printer.setCharacterSet("CHINA")
  }

  private emit(progress: ProgressEvent) {
    this.opts.onProgress?.(progress)
  }

  async run() {
    if (this.running) return
    this.running = true
    try {
      await this.ensureConnected()
      const total = this.queue.length
      let current = 0

      while (this.queue.length > 0) {
        if (this.paused) {
          await this.sleep(300)
          continue
        }

        const task = this.nextTask()
        current += 1
        this.emit({ current, total, task, status: "printing" })

        try {
          await this.executeTask(task)
          this.success += 1
          // 任务间走纸
          if ((this.opts.feedLinesBetween ?? 0) > 0) {
            await this.printer.printer.feed(this.opts.feedLinesBetween)
          }
          // 可选切纸
          if (this.opts.cutAfterEach) {
            await this.printer.printer.cut("partial")
          }
          this.emit({ current, total, task, status: "success" })
        } catch (err: any) {
          const retryLeft = task.retry ?? 0
          if (retryLeft > 0) {
            task.retry = retryLeft - 1
            this.emit({ current, total, task, status: "retrying" })
            // 退避等待后重试
            await this.sleep(this.backoffDelay(retryLeft))
            // 将任务放回队首（快速重试）
            this.queue.unshift(task)
            current -= 1 // 当前重试同一位置，不递增进度
          } else {
            this.failed += 1
            this.opts.onError?.(err, task)
            this.emit({ current, total, task, status: "failed" })
          }
        }
      }
    } finally {
      this.running = false
      this.opts.onDone?.({
        total: this.success + this.failed,
        success: this.success,
        failed: this.failed,
      })
    }
  }

  private nextTask(): BatchTask {
    // 如需优先级队列，可做排序：this.queue.sort((a,b)=> (b.priority ?? 0) - (a.priority ?? 0))
    return this.queue.shift()!
  }

  private async executeTask(task: BatchTask) {
    switch (task.type) {
      case "text":
        return this.printer.printer.printText(
          task.payload.text as any,
          (task.payload as any).options
        )
      case "image":
        return this.printer.printer.printImage(
          task.payload.image,
          task.payload.options
        )
      case "barcode":
        return this.printer.printer.printBarcode(
          task.payload.data,
          task.payload.options
        )
      case "qrcode":
        return this.printer.printer.printQRCode(
          task.payload.data,
          task.payload.options
        )
      case "receipt":
        return this.printer.printer.printReceipt(task.payload)
      case "template":
        return this.printer.printer.printWithTemplate(
          task.payload.templateName,
          task.payload.data
        )
      default:
        throw new Error(`未知任务类型: ${(task as any).type}`)
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  private backoffDelay(retryLeft: number) {
    // 简单指数退避：初始 600ms，递减剩余次数增大等待
    const attempt = retryLeft
    return 600 * Math.pow(1.8, 2 - attempt)
  }
}
```

## 使用示例

```typescript
// 构建服务与事件钩子
const batch = new BatchPrintService(new TaroBluePrint({ paperWidth: 58 }), {
  concurrency: 1,
  feedLinesBetween: 1,
  cutAfterEach: false,
  onProgress: (p) => {
    console.log(`[${p.current}/${p.total}] ${p.task.id} -> ${p.status}`)
  },
  onError: (err, task) => {
    console.warn(`任务失败: ${task.id}`, err.message)
  },
  onDone: (stats) => {
    console.log(
      `完成: total=${stats.total}, success=${stats.success}, failed=${stats.failed}`
    )
  },
})

// 准备任务
batch.addMany([
  { id: "t1", type: "text", payload: { text: "欢迎光临" } },
  {
    id: "t2",
    type: "image",
    payload: {
      image: "https://example.com/logo.png",
      options: { maxWidth: 300, align: "center" },
    },
  },
  {
    id: "t3",
    type: "receipt",
    payload: {
      title: "消费小票",
      merchant: "示例商店",
      items: [
        { name: "商品A", price: 12.5, quantity: 2 },
        { name: "商品B", price: 8.0, quantity: 1 },
      ],
      total: 33.0,
      date: "2025-10-16 14:20:10",
      footer: "感谢惠顾",
    },
  },
  {
    id: "t4",
    type: "qrcode",
    payload: {
      data: "https://example.com/order/12345",
      options: { size: 8, align: "center" },
    },
  },
])

// 运行
await batch.run()
```

### 暂停与恢复

```typescript
// 在运行过程中
batch.pause()
// ... 执行其他操作
batch.resume()
```

### 取消与清理

如需“取消剩余任务”，可以在 UI 操作后调用 clear，并确保当前执行完成后不再继续。

```typescript
batch.clear()
```

## 进阶：分批与分块

- 任务间走纸与切纸：通过 [TypeScript.feed()](docs/API.md:519) 与 [TypeScript.cut()](docs/API.md:491) 控制票据分割
- 图片任务优化：参考 [docs/examples/image-print.md](docs/examples/image-print.md) 中的缓存与抖动建议
- 队列分批：将大量任务分为多个批次运行，批间做资源释放或降速
- 字符集切换：不同批次可调用 [TypeScript.setCharacterSet()](docs/API.md:1004) 切换编码

## 错误与重试策略

典型错误来源：

- 蓝牙连接断开或不可用
- 写入缓存溢出/速率过高
- 打印机过热、缺纸、盖子打开

建议：

- 对每个任务设置最多 1-2 次快速重试，退避等待
- 在批次之间适当走纸，降低热堆积
- 出现设备类错误时，尝试重新初始化连接

## 吞吐与并发

热敏机多数采用串行 ESC/POS 指令，过高并发会导致缓冲乱序与错误。建议并发为 1；如需图片预处理（非写入），可以在“打印队列外”并发执行图片转换与缓存，然后将打印任务串行发送。

## 与其他示例联动

- 基础示例: [docs/examples/basic-print.md](docs/examples/basic-print.md)
- 图片示例: [docs/examples/image-print.md](docs/examples/image-print.md)
- 收据示例: [docs/examples/receipt-print.md](docs/examples/receipt-print.md)

## 平台注意事项

- 微信小程序：确保域名白名单，图片使用 `wxfile://` 或在开发配置中启用网络资源；蓝牙权限需在 `app.json` 配置
- H5：Web Bluetooth 需 HTTPS 与支持的浏览器（Chrome 等），移动端支持有限
- RN：需对应蓝牙库与权限开启（Android 12+ 需额外权限）
- Harmony：服务与特征值可能差异，参考设备规约

## 常见问题

- 批量任务中偶发丢行：降低速率、增加任务间走纸行数
- 大图打印慢：降低 `maxWidth` 并开启 `dithering`；在队列外预处理图片
- 合并收据头尾：在批次任务中插入 `feed/cut` 控制边界
- 重试仍失败：检查连接状态并重新初始化；必要时重建打印实例

## 参考 API

- 文本打印: [TypeScript.printText()](docs/API.md:593)
- 图片打印: [TypeScript.printImage()](docs/API.md:678)
- 条形码: [TypeScript.printBarcode()](docs/API.md:724)
- 二维码: [TypeScript.printQRCode()](docs/API.md:782)
- 收据打印: [TypeScript.printReceipt()](docs/API.md:825)
- 模板打印: [TypeScript.printWithTemplate()](docs/API.md:926)
- 发送命令: [TypeScript.sendCommands()](docs/API.md:565)
- 走纸与切纸: [TypeScript.feed()](docs/API.md:519) / [TypeScript.cut()](docs/API.md:491)
- 取消任务: [TypeScript.cancel()](docs/API.md:1028)
