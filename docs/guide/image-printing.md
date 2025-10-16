# 图片打印指南

本指南详细介绍如何使用 Taro Bluetooth Print 库打印图片、二维码、条形码等图形内容。

## 图片打印基础

### 支持的图片格式

本库支持以下图片格式：

- **PNG**: 推荐使用，支持透明背景
- **JPEG**: 适合照片类图片
- **BMP**: 无损格式，但文件较大
- **Base64**: 编码后的图片数据

### 图片处理流程

1. **加载图片**: 从本地、网络或 Base64 加载
2. **预处理**: 调整尺寸、转换格式
3. **二值化**: 转换为黑白图像
4. **抖动**: 优化黑白图像质量
5. **编码**: 转换为打印机命令
6. **发送**: 发送到打印机

## 基本图片打印

### 简单图片打印

```typescript
import TaroBluePrint from "taro-bluetooth-print"

const printer = new TaroBluePrint()

// 打印网络图片
async function printNetworkImage() {
  try {
    await printer.printer.printImage("https://example.com/logo.png", {
      maxWidth: 384, // 最大宽度 (像素)
      align: "center", // 对齐方式
      dithering: true, // 启用抖动算法
    })
    console.log("图片打印成功")
  } catch (error) {
    console.error("图片打印失败:", error.message)
  }
}

// 打印本地图片
async function printLocalImage() {
  try {
    await printer.printer.printImage("/path/to/local/image.png", {
      maxWidth: 384,
      align: "center",
    })
  } catch (error) {
    console.error("本地图片打印失败:", error.message)
  }
}

// 打印 Base64 图片
async function printBase64Image() {
  const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."

  try {
    await printer.printer.printImage(base64Data, {
      maxWidth: 300,
      align: "center",
      dithering: true,
    })
  } catch (error) {
    console.error("Base64 图片打印失败:", error.message)
  }
}
```

### 图片打印选项

```typescript
// 完整的图片打印选项
interface ImageOptions {
  maxWidth?: number // 最大宽度 (像素)
  maxHeight?: number // 最大高度 (像素)
  align?: "left" | "center" | "right" // 对齐方式
  dithering?: boolean // 是否启用抖动算法
  threshold?: number // 二值化阈值 (0-255)
  contrast?: number // 对比度调整 (-100 到 100)
  brightness?: number // 亮度调整 (-100 到 100)
  invert?: boolean // 是否反转颜色
  compress?: boolean // 是否压缩图片数据
}

// 使用示例
await printer.printer.printImage(imagePath, {
  maxWidth: 384,
  maxHeight: 200,
  align: "center",
  dithering: true,
  threshold: 128,
  contrast: 10,
  brightness: 5,
  invert: false,
  compress: true,
})
```

## 图片预处理

### 尺寸调整

```typescript
// 根据纸张宽度调整图片尺寸
function resizeImageForPaper(originalWidth, originalHeight, paperWidth) {
  const maxWidth = paperWidth === 58 ? 384 : 576 // 58mm 或 80mm 纸张

  let newWidth = originalWidth
  let newHeight = originalHeight

  // 如果图片宽度超过最大宽度，按比例缩放
  if (originalWidth > maxWidth) {
    const ratio = maxWidth / originalWidth
    newWidth = maxWidth
    newHeight = Math.round(originalHeight * ratio)
  }

  return { width: newWidth, height: newHeight }
}

// 使用示例
const originalSize = { width: 800, height: 600 }
const paperWidth = 58 // 58mm 纸张
const newSize = resizeImageForPaper(
  originalSize.width,
  originalSize.height,
  paperWidth
)

console.log(`调整后尺寸: ${newSize.width} x ${newSize.height}`)
```

### 图片格式转换

```typescript
// 将图片转换为黑白图像
async function convertToBlackWhite(imageData, threshold = 128) {
  // 创建 Canvas 进行图像处理
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  // 加载图片
  const img = new Image()
  img.src = imageData

  await new Promise((resolve) => {
    img.onload = resolve
  })

  // 设置 Canvas 尺寸
  canvas.width = img.width
  canvas.height = img.height

  // 绘制图片
  ctx.drawImage(img, 0, 0)

  // 获取图像数据
  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageDataObj.data

  // 转换为黑白
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    const value = gray > threshold ? 255 : 0

    data[i] = value // R
    data[i + 1] = value // G
    data[i + 2] = value // B
    // Alpha 通道保持不变
  }

  // 更新 Canvas
  ctx.putImageData(imageDataObj, 0, 0)

  // 返回处理后的图片
  return canvas.toDataURL("image/png")
}

// 使用示例
const blackWhiteImage = await convertToBlackWhite(originalImage, 128)
await printer.printer.printImage(blackWhiteImage)
```

### 抖动算法

```typescript
// Floyd-Steinberg 抖动算法
function applyDithering(imageData) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      // 获取当前像素的灰度值
      const oldGray =
        data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
      const newGray = oldGray > 128 ? 255 : 0
      const error = oldGray - newGray

      // 设置新像素值
      data[idx] = newGray // R
      data[idx + 1] = newGray // G
      data[idx + 2] = newGray // B

      // 分散误差到邻近像素
      if (x + 1 < width) {
        const rightIdx = (y * width + x + 1) * 4
        data[rightIdx] += (error * 7) / 16
        data[rightIdx + 1] += (error * 7) / 16
        data[rightIdx + 2] += (error * 7) / 16
      }

      if (y + 1 < height) {
        if (x > 0) {
          const bottomLeftIdx = ((y + 1) * width + x - 1) * 4
          data[bottomLeftIdx] += (error * 3) / 16
          data[bottomLeftIdx + 1] += (error * 3) / 16
          data[bottomLeftIdx + 2] += (error * 3) / 16
        }

        const bottomIdx = ((y + 1) * width + x) * 4
        data[bottomIdx] += (error * 5) / 16
        data[bottomIdx + 1] += (error * 5) / 16
        data[bottomIdx + 2] += (error * 5) / 16

        if (x + 1 < width) {
          const bottomRightIdx = ((y + 1) * width + x + 1) * 4
          data[bottomRightIdx] += (error * 1) / 16
          data[bottomRightIdx + 1] += (error * 1) / 16
          data[bottomRightIdx + 2] += (error * 1) / 16
        }
      }
    }
  }

  return imageData
}

// 使用抖动算法
async function printWithDithering(imagePath) {
  // 加载图片
  const imageData = await loadImage(imagePath)

  // 应用抖动算法
  const ditheredData = applyDithering(imageData)

  // 打印处理后的图片
  await printer.printer.printImageData(ditheredData, {
    maxWidth: 384,
    align: "center",
  })
}
```

## 二维码打印

### 基本二维码打印

```typescript
// 打印简单二维码
async function printSimpleQRCode() {
  try {
    await printer.printer.printQRCode("https://example.com", {
      size: 8, // 二维码尺寸 (1-16)
      errorCorrection: "M", // 纠错级别: L, M, Q, H
      align: "center", // 对齐方式
    })
    console.log("二维码打印成功")
  } catch (error) {
    console.error("二维码打印失败:", error.message)
  }
}

// 打印带文本的二维码
async function printQRCodeWithText() {
  const qrData = "https://example.com/product/12345"
  const labelText = "扫码查看产品详情"

  try {
    // 打印标题
    await printer.printer.printText("产品信息", {
      align: "center",
      bold: true,
      fontSize: 2,
    })

    await printer.printer.newLine()

    // 打印二维码
    await printer.printer.printQRCode(qrData, {
      size: 10,
      errorCorrection: "H",
      align: "center",
    })

    await printer.printer.newLine()

    // 打印说明文本
    await printer.printer.printText(labelText, {
      align: "center",
      fontSize: 1,
    })
  } catch (error) {
    console.error("带文本二维码打印失败:", error.message)
  }
}
```

### 二维码高级配置

```typescript
// 二维码打印选项
interface QRCodeOptions {
  size?: number // 尺寸因子 (1-16)
  errorCorrection?: "L" | "M" | "Q" | "H" // 纠错级别
  align?: "left" | "center" | "right" // 对齐方式
  margin?: number // 边距 (像素)
  text?: string // 二维码下方文本
  textStyle?: TextOptions // 文本样式
}

// 高级二维码打印
async function printAdvancedQRCode() {
  const options = {
    size: 12,
    errorCorrection: "H", // 高纠错级别
    align: "center",
    margin: 4,
    text: "扫码关注",
    textStyle: {
      fontSize: 1,
      align: "center",
      bold: false,
    },
  }

  try {
    await printer.printer.printQRCode("https://weixin.qq.com/qr-code", options)
  } catch (error) {
    console.error("高级二维码打印失败:", error.message)
  }
}
```

### 自定义二维码样式

```typescript
// 生成自定义样式的二维码
async function printCustomQRCode() {
  // 使用第三方库生成二维码
  const QRCode = require("qrcode")

  try {
    // 生成二维码数据 URL
    const qrDataUrl = await QRCode.toDataURL("https://example.com", {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })

    // 在二维码中心添加 Logo
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    // 绘制二维码
    const qrImage = new Image()
    qrImage.src = qrDataUrl

    await new Promise((resolve) => {
      qrImage.onload = resolve
    })

    canvas.width = qrImage.width
    canvas.height = qrImage.height
    ctx.drawImage(qrImage, 0, 0)

    // 绘制 Logo
    const logo = new Image()
    logo.src = "/path/to/logo.png"

    await new Promise((resolve) => {
      logo.onload = resolve
    })

    const logoSize = qrImage.width * 0.2
    const logoX = (qrImage.width - logoSize) / 2
    const logoY = (qrImage.height - logoSize) / 2

    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)

    // 打印自定义二维码
    await printer.printer.printImage(canvas.toDataURL(), {
      maxWidth: 384,
      align: "center",
      dithering: true,
    })
  } catch (error) {
    console.error("自定义二维码打印失败:", error.message)
  }
}
```

## 条形码打印

### 基本条形码打印

```typescript
// 打印条形码
async function printBarcode() {
  try {
    await printer.printer.printBarcode("1234567890128", {
      type: "EAN13", // 条形码类型
      height: 80, // 高度
      width: 2, // 条宽
      position: "below", // 文本位置: above, below, both, none
      align: "center", // 对齐方式
    })
    console.log("条形码打印成功")
  } catch (error) {
    console.error("条形码打印失败:", error.message)
  }
}

// 支持的条形码类型
const barcodeTypes = {
  "UPC-A": 12, // 12 位数字
  "UPC-E": 8, // 8 位数字
  EAN13: 13, // 13 位数字
  EAN8: 8, // 8 位数字
  CODE39: "可变长度", // 支持数字、字母、特殊字符
  CODE128: "可变长度", // 支持所有 ASCII 字符
  ITF: "偶数位数字", // 仅数字，必须为偶数位
  CODABAR: "可变长度", // 支持数字、特定字符
  CODE93: "可变长度", // 高密度条形码
}
```

### 条形码高级配置

```typescript
// 条形码打印选项
interface BarcodeOptions {
  type?: BarcodeType // 条形码类型
  height?: number // 高度 (像素)
  width?: number // 条宽 (像素)
  position?: "none" | "above" | "below" | "both" // 文本位置
  align?: "left" | "center" | "right" // 对齐方式
  text?: string // 自定义文本
  fontSize?: number // 文本字体大小
  includeChecksum?: boolean // 是否包含校验码
}

// 打印自定义条形码
async function printCustomBarcode() {
  const options = {
    type: "CODE128",
    height: 100,
    width: 3,
    position: "both",
    align: "center",
    text: "SKU-001",
    fontSize: 2,
    includeChecksum: true,
  }

  try {
    await printer.printer.printBarcode("SKU-001-2023", options)
  } catch (error) {
    console.error("自定义条形码打印失败:", error.message)
  }
}
```

### 批量条形码打印

```typescript
// 批量打印条形码
async function printBatchBarcodes(products) {
  try {
    for (const product of products) {
      // 打印产品名称
      await printer.printer.printText(product.name, {
        align: "center",
        bold: true,
      })

      // 打印条形码
      await printer.printer.printBarcode(product.code, {
        type: "CODE128",
        height: 80,
        position: "below",
        align: "center",
      })

      // 打印价格
      await printer.printer.printText(`¥${product.price}`, {
        align: "center",
        fontSize: 2,
      })

      // 分隔线
      if (products.indexOf(product) < products.length - 1) {
        await printer.printer.printLine("-", 32)
        await printer.printer.newLine()
      }
    }

    console.log("批量条形码打印完成")
  } catch (error) {
    console.error("批量条形码打印失败:", error.message)
  }
}

// 使用示例
const products = [
  { name: "商品A", code: "A001", price: 10.5 },
  { name: "商品B", code: "B002", price: 25.0 },
  { name: "商品C", code: "C003", price: 8.75 },
]

await printBatchBarcodes(products)
```

## 图文混合打印

### 标签模板打印

```typescript
// 打印产品标签
async function printProductLabel(product) {
  try {
    // 标签标题
    await printer.printer.printText("产品标签", {
      align: "center",
      bold: true,
      fontSize: 2,
    })

    await printer.printer.newLine()

    // 产品图片 (如果有)
    if (product.image) {
      await printer.printer.printImage(product.image, {
        maxWidth: 200,
        align: "center",
      })
      await printer.printer.newLine()
    }

    // 产品信息
    await printer.printer.printText(`名称: ${product.name}`)
    await printer.printer.printText(`规格: ${product.spec}`)
    await printer.printer.printText(`价格: ¥${product.price}`)

    await printer.printer.newLine()

    // 产品条形码
    await printer.printer.printBarcode(product.code, {
      type: "CODE128",
      height: 60,
      position: "below",
      align: "center",
    })

    await printer.printer.newLine()

    // 生产日期
    await printer.printer.printText(`生产日期: ${product.date}`, {
      align: "center",
      fontSize: 1,
    })

    console.log("产品标签打印完成")
  } catch (error) {
    console.error("产品标签打印失败:", error.message)
  }
}

// 使用示例
const product = {
  name: "有机苹果",
  spec: "500g/袋",
  price: "12.80",
  code: "APL0012023",
  date: "2023-10-16",
  image: "/path/to/apple.png",
}

await printProductLabel(product)
```

### 收据头部设计

```typescript
// 打印带 Logo 的收据头部
async function printReceiptHeader(merchant) {
  try {
    // 商户 Logo
    if (merchant.logo) {
      await printer.printer.printImage(merchant.logo, {
        maxWidth: 200,
        align: "center",
      })
      await printer.printer.newLine()
    }

    // 商户名称
    await printer.printer.printText(merchant.name, {
      align: "center",
      bold: true,
      fontSize: 2,
      doubleHeight: true,
    })

    await printer.printer.newLine()

    // 商户信息
    await printer.printer.printText(merchant.address, {
      align: "center",
      fontSize: 1,
    })

    await printer.printer.printText(merchant.phone, {
      align: "center",
      fontSize: 1,
    })

    // 分隔线
    await printer.printer.printLine("=", 32)

    console.log("收据头部打印完成")
  } catch (error) {
    console.error("收据头部打印失败:", error.message)
  }
}

// 使用示例
const merchant = {
  name: "水果店",
  address: "北京市朝阳区xx路xx号",
  phone: "010-12345678",
  logo: "/path/to/logo.png",
}

await printReceiptHeader(merchant)
```

## 图片优化技巧

### 图片压缩

```typescript
// 压缩图片以减少传输时间
function compressImage(imageData, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    const img = new Image()
    img.src = imageData

    img.onload = () => {
      // 计算压缩后的尺寸
      const maxSize = 384 // 最大宽度
      let { width, height } = img

      if (width > maxSize) {
        const ratio = maxSize / width
        width = maxSize
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height)

      // 导出压缩后的图片
      resolve(canvas.toDataURL("image/jpeg", quality))
    }
  })
}

// 使用压缩图片
async function printCompressedImage(imagePath) {
  try {
    // 压缩图片
    const compressedImage = await compressImage(imagePath, 0.7)

    // 打印压缩后的图片
    await printer.printer.printImage(compressedImage, {
      maxWidth: 384,
      align: "center",
      dithering: true,
    })

    console.log("压缩图片打印成功")
  } catch (error) {
    console.error("压缩图片打印失败:", error.message)
  }
}
```

### 缓存管理

```typescript
// 图片缓存管理
class ImageCache {
  constructor() {
    this.cache = new Map()
    this.maxSize = 10 // 最大缓存数量
  }

  // 获取缓存图片
  get(key) {
    if (this.cache.has(key)) {
      // 更新访问时间
      const item = this.cache.get(key)
      item.lastAccess = Date.now()
      return item.data
    }
    return null
  }

  // 设置缓存图片
  set(key, data) {
    // 如果缓存已满，删除最久未访问的项
    if (this.cache.size >= this.maxSize) {
      let oldestKey = null
      let oldestTime = Date.now()

      for (const [k, v] of this.cache) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess
          oldestKey = k
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      lastAccess: Date.now(),
    })
  }

  // 清空缓存
  clear() {
    this.cache.clear()
  }
}

// 使用图片缓存
const imageCache = new ImageCache()

async function printCachedImage(imagePath) {
  // 尝试从缓存获取
  let processedImage = imageCache.get(imagePath)

  if (!processedImage) {
    // 处理图片
    processedImage = await processImage(imagePath)

    // 缓存处理后的图片
    imageCache.set(imagePath, processedImage)
  }

  // 打印图片
  await printer.printer.printImage(processedImage, {
    maxWidth: 384,
    align: "center",
  })
}
```

## 错误处理

### 图片加载错误

```typescript
// 图片加载错误处理
async function safePrintImage(imagePath, fallbackText = "图片加载失败") {
  try {
    await printer.printer.printImage(imagePath, {
      maxWidth: 384,
      align: "center",
      dithering: true,
    })
  } catch (error) {
    console.error("图片打印失败:", error.message)

    // 打印替代文本
    await printer.printer.printText(fallbackText, {
      align: "center",
      fontSize: 1,
    })
  }
}

// 图片验证
async function validateImage(imagePath) {
  try {
    const img = new Image()
    img.src = imagePath

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    // 检查图片尺寸
    if (img.width > 2000 || img.height > 2000) {
      throw new Error("图片尺寸过大，建议压缩后使用")
    }

    return true
  } catch (error) {
    console.error("图片验证失败:", error.message)
    return false
  }
}
```

## 最佳实践

### 1. 图片尺寸优化

```typescript
// 根据纸张类型优化图片尺寸
function optimizeImageSize(originalWidth, originalHeight, paperWidth) {
  const maxWidth = paperWidth === 58 ? 384 : 576
  const maxHeight = 400 // 最大高度限制

  let newWidth = originalWidth
  let newHeight = originalHeight

  // 计算缩放比例
  const widthRatio = maxWidth / originalWidth
  const heightRatio = maxHeight / originalHeight
  const ratio = Math.min(widthRatio, heightRatio)

  if (ratio < 1) {
    newWidth = Math.round(originalWidth * ratio)
    newHeight = Math.round(originalHeight * ratio)
  }

  return { width: newWidth, height: newHeight }
}
```

### 2. 打印质量平衡

```typescript
// 平衡打印质量和速度
function getOptimalSettings(imageType, printerModel) {
  const settings = {
    maxWidth: 384,
    dithering: true,
    threshold: 128,
    compress: true,
  }

  // 根据图片类型调整
  switch (imageType) {
    case "logo":
      settings.dithering = false
      settings.threshold = 100
      break
    case "photo":
      settings.dithering = true
      settings.threshold = 128
      break
    case "barcode":
      settings.dithering = false
      settings.threshold = 64
      break
  }

  // 根据打印机型号调整
  if (printerModel.includes("high-speed")) {
    settings.compress = true
  }

  return settings
}
```

### 3. 内存管理

```typescript
// 内存优化：及时释放图片资源
async function printImageWithMemoryManagement(imagePath) {
  let img = null

  try {
    img = new Image()
    img.src = imagePath

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    // 处理和打印图片
    await processAndPrintImage(img)
  } finally {
    // 释放图片资源
    if (img) {
      img.src = ""
      img.onload = null
      img.onerror = null
    }
  }
}
```

## 下一步

学习了图片打印后，您可以继续探索：

- [错误处理](/guide/error-handling) - 处理各种错误情况
- [性能优化](/guide/performance) - 优化打印性能
- [收据打印示例](/examples/receipt-print) - 查看完整的收据打印示例
- [API 文档](/api/) - 查看完整的 API 参考
