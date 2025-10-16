# 图片打印示例

本示例演示如何使用 Taro Bluetooth Print 库打印各种类型的图片，包括网络图片、本地图片、Base64 图片等。

## 基础图片打印

### 打印网络图片

```typescript
import TaroBluePrint from "taro-bluetooth-print"

async function printNetworkImage() {
  const printer = new TaroBluePrint({
    debug: true,
    paperWidth: 58,
  })

  try {
    // 1. 搜索并连接设备
    await printer.bluetooth.startDiscovery({ timeout: 10000 })
    const devices = await printer.bluetooth.getDiscoveredDevices()

    if (devices.length === 0) {
      throw new Error("未找到可用设备")
    }

    await printer.bluetooth.connect(devices[0].deviceId)
    console.log("设备连接成功")

    // 2. 打印网络图片
    const imageUrl = "https://example.com/logo.png"
    console.log("开始打印网络图片:", imageUrl)

    await printer.printer.printImage(imageUrl, {
      maxWidth: 384,
      align: "center",
      dithering: true,
    })

    console.log("网络图片打印成功")

    // 3. 走纸和切纸
    await printer.printer.feed(2)
    await printer.printer.cut()
  } catch (error) {
    console.error("网络图片打印失败:", error.message)
  } finally {
    // 4. 断开连接
    await printer.bluetooth.disconnect()
  }
}

// 执行示例
printNetworkImage()
```

### 打印本地图片

```typescript
async function printLocalImage() {
  const printer = new TaroBluePrint({
    debug: true,
    paperWidth: 58,
  })

  try {
    // 连接设备（省略连接代码，参考上面的示例）

    // 2. 打印本地图片
    const localImagePath = "/images/store-logo.png"
    console.log("开始打印本地图片:", localImagePath)

    await printer.printer.printImage(localImagePath, {
      maxWidth: 300,
      align: "center",
      dithering: false,
    })

    console.log("本地图片打印成功")
  } catch (error) {
    console.error("本地图片打印失败:", error.message)
  }
}
```

### 打印 Base64 图片

```typescript
async function printBase64Image() {
  const printer = new TaroBluePrint({
    debug: true,
    paperWidth: 58,
  })

  try {
    // 连接设备（省略连接代码）

    // 2. 打印 Base64 图片
    const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    console.log("开始打印 Base64 图片")

    await printer.printer.printImage(base64Image, {
      maxWidth: 256,
      align: "center",
      dithering: true,
    })

    console.log("Base64 图片打印成功")
  } catch (error) {
    console.error("Base64 图片打印失败:", error.message)
  }
}
```

## 高级图片处理

### 图片预处理和优化

```typescript
// 图片预处理函数
async function preprocessImage(imagePath: string) {
  console.log("开始预处理图片:", imagePath)

  try {
    // 1. 加载图片
    const response = await fetch(imagePath)
    const imageBlob = await response.blob()
    const imageUrl = URL.createObjectURL(imageBlob)

    // 2. 创建图片元素
    const img = new Image()
    img.src = imageUrl

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    // 3. 创建 Canvas 进行处理
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!

    // 4. 计算合适的尺寸
    const maxWidth = 384
    const maxHeight = 300
    let { width, height } = img

    if (width > maxWidth) {
      const ratio = maxWidth / width
      width = maxWidth
      height = Math.round(height * ratio)
    }

    if (height > maxHeight) {
      const ratio = maxHeight / height
      height = maxHeight
      width = Math.round(width * ratio)
    }

    canvas.width = width
    canvas.height = height

    // 5. 绘制图片
    ctx.drawImage(img, 0, 0, width, height)

    // 6. 转换为黑白图像
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      // 计算灰度值
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114

      // 应用阈值
      const threshold = 120
      const value = gray > threshold ? 255 : 0

      data[i] = value // R
      data[i + 1] = value // G
      data[i + 2] = value // B
      // Alpha 通道保持不变
    }

    ctx.putImageData(imageData, 0, 0)

    // 7. 转换为 Base64
    const processedImage = canvas.toDataURL("image/png")

    // 8. 清理资源
    URL.revokeObjectURL(imageUrl)

    console.log("图片预处理完成，新尺寸:", `${width}x${height}`)
    return processedImage
  } catch (error) {
    console.error("图片预处理失败:", error.message)
    throw error
  }
}

// 使用预处理的图片打印
async function printPreprocessedImage() {
  const printer = new TaroBluePrint({ debug: true })

  try {
    // 连接设备（省略连接代码）

    // 预处理图片
    const originalImage = "https://example.com/large-image.jpg"
    const processedImage = await preprocessImage(originalImage)

    // 打印处理后的图片
    await printer.printer.printImage(processedImage, {
      maxWidth: 384,
      align: "center",
      dithering: false, // 已经预处理过，不需要抖动
    })

    console.log("预处理图片打印成功")
  } catch (error) {
    console.error("预处理图片打印失败:", error.message)
  }
}
```

### 批量图片打印

```typescript
async function printMultipleImages() {
  const printer = new TaroBluePrint({ debug: true })

  try {
    // 连接设备（省略连接代码）

    // 图片列表
    const images = [
      { url: "https://example.com/logo.png", name: "Logo" },
      { url: "https://example.com/qr-code.png", name: "二维码" },
      { url: "https://example.com/promo.png", name: "促销图片" },
    ]

    console.log(`开始批量打印 ${images.length} 张图片`)

    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      console.log(`打印第 ${i + 1} 张图片: ${image.name}`)

      // 打印图片标题
      await printer.printer.printText(image.name, {
        align: "center",
        bold: true,
      })

      await printer.printer.newLine()

      // 打印图片
      await printer.printer.printImage(image.url, {
        maxWidth: 300,
        align: "center",
        dithering: true,
      })

      await printer.printer.newLine(2)

      // 如果不是最后一张图片，添加分隔线
      if (i < images.length - 1) {
        await printer.printer.printLine("-", 32)
        await printer.printer.newLine()
      }
    }

    // 走纸和切纸
    await printer.printer.feed(3)
    await printer.printer.cut()

    console.log("批量图片打印完成")
  } catch (error) {
    console.error("批量图片打印失败:", error.message)
  }
}
```

## 图文混合打印

### 打印带标题和说明的图片

```typescript
async function printImageWithText() {
  const printer = new TaroBluePrint({ debug: true })

  try {
    // 连接设备（省略连接代码）

    // 1. 打印标题
    await printer.printer.printText("产品展示", {
      align: "center",
      bold: true,
      fontSize: 2,
    })

    await printer.printer.newLine()

    // 2. 打印图片
    const imageUrl = "https://example.com/product-image.jpg"
    await printer.printer.printImage(imageUrl, {
      maxWidth: 350,
      align: "center",
      dithering: true,
    })

    await printer.printer.newLine()

    // 3. 打印产品描述
    await printer.printer.printText("产品名称：智能蓝牙打印机", {
      align: "left",
    })

    await printer.printer.printText("产品特点：", {
      align: "left",
      bold: true,
    })

    const features = [
      "• 支持蓝牙连接",
      "• 高速打印",
      "• 体积小巧",
      "• 操作简单",
    ]

    for (const feature of features) {
      await printer.printer.printText(feature, {
        align: "left",
        fontSize: 1,
      })
    }

    await printer.printer.newLine()

    // 4. 打印二维码
    await printer.printer.printText("扫码了解更多", {
      align: "center",
    })

    await printer.printer.printQRCode("https://example.com/product-info", {
      size: 8,
      align: "center",
      errorCorrection: "M",
    })

    await printer.printer.newLine()

    // 5. 打印价格
    await printer.printer.printText("价格：¥299.00", {
      align: "center",
      bold: true,
      fontSize: 2,
    })

    await printer.printer.feed(3)
    await printer.printer.cut()

    console.log("图文混合打印完成")
  } catch (error) {
    console.error("图文混合打印失败:", error.message)
  }
}
```

### 打印证件照

```typescript
async function printIDPhoto() {
  const printer = new TaroBluePrint({ debug: true })

  try {
    // 连接设备（省略连接代码）

    // 1. 打印证件照标题
    await printer.printer.printText("证件照", {
      align: "center",
      bold: true,
      fontSize: 2,
    })

    await printer.printer.newLine()

    // 2. 打印照片（证件照通常是正方形）
    const photoUrl = "https://example.com/id-photo.jpg"

    // 预处理为正方形并优化
    const processedPhoto = await preprocessIDPhoto(photoUrl)

    await printer.printer.printImage(processedPhoto, {
      maxWidth: 256, // 证件照尺寸适中
      align: "center",
      dithering: true,
    })

    await printer.printer.newLine()

    // 3. 打印个人信息
    await printer.printer.printText("姓名：张三", {
      align: "center",
    })

    await printer.printer.printText("性别：男", {
      align: "center",
    })

    await printer.printer.printText("出生日期：1990年01月01日", {
      align: "center",
    })

    await printer.printer.printText("地址：北京市朝阳区", {
      align: "center",
    })

    await printer.printer.newLine()

    // 4. 打印编号和日期
    await printer.printer.printText("编号：20230001", {
      align: "left",
      fontSize: 1,
    })

    await printer.printer.printText("发证日期：2023年09月28日", {
      align: "right",
      fontSize: 1,
    })

    await printer.printer.feed(3)
    await printer.printer.cut()

    console.log("证件照打印完成")
  } catch (error) {
    console.error("证件照打印失败:", error.message)
  }
}

// 证件照预处理函数
async function preprocessIDPhoto(imagePath: string) {
  // 类似于前面的 preprocessImage 函数，但针对证件照优化
  // 1. 裁剪为正方形
  // 2. 调整为标准证件照尺寸
  // 3. 优化对比度和亮度
  // 4. 转换为黑白图像

  // 这里简化实现
  return await preprocessImage(imagePath)
}
```

## 特殊效果打印

### 打印带边框的图片

```typescript
async function printImageWithBorder() {
  const printer = new TaroBluePrint({ debug: true })

  try {
    // 连接设备（省略连接代码）

    // 1. 打印上边框
    await printer.printer.printText("+------------------------------------+", {
      align: "center",
    })

    // 2. 打印图片
    const imageUrl = "https://example.com/bordered-image.png"
    await printer.printer.printImage(imageUrl, {
      maxWidth: 320,
      align: "center",
      dithering: true,
    })

    // 3. 打印下边框
    await printer.printer.printText("+------------------------------------+", {
      align: "center",
    })

    await printer.printer.feed(2)
    await printer.printer.cut()

    console.log("带边框图片打印完成")
  } catch (error) {
    console.error("带边框图片打印失败:", error.message)
  }
}
```

### 打印水印图片

```typescript
async function printWatermarkedImage() {
  const printer = new TaroBluePrint({ debug: true })

  try {
    // 连接设备（省略连接代码）

    // 1. 打印主图片
    const mainImageUrl = "https://example.com/main-image.jpg"
    await printer.printer.printImage(mainImageUrl, {
      maxWidth: 350,
      align: "center",
      dithering: true,
    })

    await printer.printer.newLine()

    // 2. 打印水印文字
    await printer.printer.printText("© 2023 示例公司 版权所有", {
      align: "center",
      fontSize: 1,
    })

    // 3. 打印水印二维码
    await printer.printer.printQRCode("https://example.com/watermark", {
      size: 4,
      align: "center",
    })

    await printer.printer.feed(2)
    await printer.printer.cut()

    console.log("水印图片打印完成")
  } catch (error) {
    console.error("水印图片打印失败:", error.message)
  }
}
```

## 错误处理和重试

### 带重试机制的图片打印

```typescript
async function printImageWithRetry(imageUrl: string, maxRetries = 3) {
  const printer = new TaroBluePrint({ debug: true })

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`第 ${attempt} 次尝试打印图片`)

      // 连接设备
      await printer.bluetooth.startDiscovery({ timeout: 5000 })
      const devices = await printer.bluetooth.getDiscoveredDevices()

      if (devices.length === 0) {
        throw new Error("未找到可用设备")
      }

      await printer.bluetooth.connect(devices[0].deviceId)

      // 打印图片
      await printer.printer.printImage(imageUrl, {
        maxWidth: 384,
        align: "center",
        dithering: true,
      })

      await printer.printer.feed(2)
      await printer.printer.cut()

      console.log("图片打印成功")
      return // 成功则返回
    } catch (error) {
      console.error(`第 ${attempt} 次尝试失败:`, error.message)

      if (attempt === maxRetries) {
        console.error("所有重试都失败了")
        throw error
      }

      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
    } finally {
      // 确保断开连接
      try {
        await printer.bluetooth.disconnect()
      } catch (error) {
        console.error("断开连接失败:", error.message)
      }
    }
  }
}

// 使用示例
printImageWithRetry("https://example.com/retry-image.png", 3)
  .then(() => console.log("打印完成"))
  .catch((error) => console.error("打印最终失败:", error.message))
```

## 性能优化

### 图片缓存和批量处理

```typescript
class ImagePrintCache {
  private cache = new Map<string, string>()
  private maxCacheSize = 10

  async getProcessed(imageUrl: string): Promise<string> {
    // 检查缓存
    if (this.cache.has(imageUrl)) {
      console.log("从缓存获取图片:", imageUrl)
      return this.cache.get(imageUrl)!
    }

    // 处理图片
    console.log("处理新图片:", imageUrl)
    const processed = await preprocessImage(imageUrl)

    // 添加到缓存
    if (this.cache.size >= this.maxCacheSize) {
      // 删除最旧的缓存项
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(imageUrl, processed)
    return processed
  }

  clear() {
    this.cache.clear()
    console.log("图片缓存已清空")
  }
}

// 使用缓存的批量打印
async function printBatchWithCache(imageUrls: string[]) {
  const printer = new TaroBluePrint({ debug: true })
  const imageCache = new ImagePrintCache()

  try {
    // 连接设备（省略连接代码）

    console.log(`开始批量打印 ${imageUrls.length} 张图片（使用缓存）`)

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]

      console.log(`处理第 ${i + 1} 张图片`)

      // 从缓存获取或处理图片
      const processedImage = await imageCache.getProcessed(imageUrl)

      // 打印图片
      await printer.printer.printImage(processedImage, {
        maxWidth: 350,
        align: "center",
        dithering: false, // 已预处理过
      })

      await printer.printer.newLine()

      // 添加分隔
      if (i < imageUrls.length - 1) {
        await printer.printer.printLine("-", 32)
        await printer.printer.newLine()
      }
    }

    await printer.printer.feed(3)
    await printer.printer.cut()

    console.log("批量打印完成")
  } catch (error) {
    console.error("批量打印失败:", error.message)
  } finally {
    imageCache.clear()
  }
}

// 使用示例
const imageUrls = [
  "https://example.com/image1.jpg",
  "https://example.com/image2.jpg",
  "https://example.com/image3.jpg",
]

printBatchWithCache(imageUrls)
```

## 完整示例

### 完整的图片打印应用

```typescript
import TaroBluePrint from "taro-bluetooth-print"

class ImagePrintApp {
  private printer: TaroBluePrint
  private isConnected = false

  constructor() {
    this.printer = new TaroBluePrint({
      debug: true,
      paperWidth: 58,
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.printer.bluetooth.onConnectionStateChange((connected) => {
      this.isConnected = connected
      console.log(`连接状态变化: ${connected ? "已连接" : "已断开"}`)
    })
  }

  async connectPrinter() {
    try {
      console.log("开始连接打印机...")

      // 搜索设备
      await this.printer.bluetooth.startDiscovery({ timeout: 10000 })
      const devices = await this.printer.bluetooth.getDiscoveredDevices()

      if (devices.length === 0) {
        throw new Error("未找到可用设备")
      }

      // 选择信号最强的设备
      const bestDevice = devices.sort(
        (a, b) => (b.RSSI || 0) - (a.RSSI || 0)
      )[0]
      console.log("选择设备:", bestDevice.name)

      // 连接设备
      const connected = await this.printer.bluetooth.connect(
        bestDevice.deviceId
      )
      if (!connected) {
        throw new Error("设备连接失败")
      }

      console.log("打印机连接成功")
      return true
    } catch (error) {
      console.error("连接打印机失败:", error.message)
      return false
    }
  }

  async printImageWithOptions(imageUrl: string, options: any = {}) {
    if (!this.isConnected) {
      const connected = await this.connectPrinter()
      if (!connected) {
        throw new Error("无法连接打印机")
      }
    }

    try {
      console.log("开始打印图片:", imageUrl)

      const defaultOptions = {
        maxWidth: 384,
        align: "center",
        dithering: true,
        ...options,
      }

      await this.printer.printer.printImage(imageUrl, defaultOptions)

      console.log("图片打印成功")
      return true
    } catch (error) {
      console.error("图片打印失败:", error.message)
      return false
    }
  }

  async printImageReport(imageUrl: string, title: string, description: string) {
    if (!this.isConnected) {
      await this.connectPrinter()
    }

    try {
      // 1. 打印标题
      await this.printer.printer.printText(title, {
        align: "center",
        bold: true,
        fontSize: 2,
      })

      await this.printer.printer.newLine()

      // 2. 打印图片
      await this.printer.printer.printImage(imageUrl, {
        maxWidth: 350,
        align: "center",
        dithering: true,
      })

      await this.printer.printer.newLine()

      // 3. 打印描述
      await this.printer.printer.printText(description, {
        align: "left",
      })

      await this.printer.printer.newLine()

      // 4. 打印时间
      const now = new Date()
      await this.printer.printer.printText(
        `打印时间: ${now.toLocaleString()}`,
        {
          align: "center",
          fontSize: 1,
        }
      )

      // 5. 走纸和切纸
      await this.printer.printer.feed(3)
      await this.printer.printer.cut()

      console.log("图片报告打印完成")
    } catch (error) {
      console.error("图片报告打印失败:", error.message)
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.printer.bluetooth.disconnect()
      console.log("打印机已断开连接")
    }
  }
}

// 使用示例
async function demonstrateImagePrinting() {
  const app = new ImagePrintApp()

  try {
    // 连接打印机
    await app.connectPrinter()

    // 打印网络图片
    await app.printImageWithOptions("https://example.com/logo.png", {
      maxWidth: 300,
      dithering: false,
    })

    // 打印图片报告
    await app.printImageReport(
      "https://example.com/product.jpg",
      "产品展示",
      "这是一款高质量的蓝牙打印机，具有快速打印、高清晰度等特点。"
    )
  } catch (error) {
    console.error("演示失败:", error.message)
  } finally {
    // 断开连接
    await app.disconnect()
  }
}

// 运行演示
demonstrateImagePrinting()
```

## 运行示例

### 安装依赖

```bash
npm install taro-bluetooth-print
```

### 运行代码

将上述代码保存为 `image-print-example.ts`，然后在您的 Taro 项目中运行：

```bash
# 如果使用 Vite
npm run dev

# 如果使用 webpack
npm run build
```

### 预期输出

打印机会输出：

1. 网络图片或本地图片
2. 带标题和说明的图文内容
3. 证件照格式的内容
4. 带边框或水印的图片

## 关键点说明

1. **图片预处理**: 在打印前对图片进行尺寸调整和黑白转换，可以提高打印质量和速度
2. **抖动算法**: 启用抖动可以提高黑白图像的视觉效果
3. **尺寸控制**: 根据纸张宽度设置合适的图片最大宽度
4. **错误处理**: 使用 try-catch 和重试机制处理打印失败的情况
5. **缓存优化**: 对于重复打印的图片，使用缓存可以避免重复处理
6. **内存管理**: 及时释放不需要的图片资源，避免内存泄漏

## 扩展功能

查看其他示例了解更多功能：

- [基础打印示例](/examples/basic-print) - 基础文本打印
- [收据打印示例](/examples/receipt-print) - 完整的收据打印
- [批量打印示例](/examples/batch-print) - 批量处理打印任务

## 相关文档

- [图片打印指南](/guide/image-printing) - 详细的图片打印指南
- [打印机配置指南](/guide/printer-configuration) - 打印机配置说明
- [API 文档](/api/) - 完整的 API 参考
- [错误处理指南](/guide/error-handling) - 错误处理最佳实践
