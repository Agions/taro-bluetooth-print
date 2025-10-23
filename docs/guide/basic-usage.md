# 基础用法

本指南将介绍 Taro Bluetooth Print 库的基础用法，包括创建实例、连接设备、打印内容等核心功能。

## 基本概念

### 主要组件

Taro Bluetooth Print 库包含以下主要组件：

- **BluetoothPrinter**: 主要的打印机类，提供完整的打印功能
- **BluetoothAdapter**: 蓝牙适配器，负责设备连接和管理
- **PrinterManager**: 打印机管理器，处理打印任务和队列

### 工作流程

1. **初始化**: 创建打印机实例
2. **连接**: 搜索并连接蓝牙设备
3. **配置**: 设置打印参数
4. **打印**: 发送打印内容
5. **清理**: 断开连接并释放资源

## 创建打印机实例

### 基本创建方式

```typescript
import TaroBluePrint from "taro-bluetooth-print"

// 使用默认配置
const printer = new TaroBluePrint()
```

### 自定义配置

```typescript
import TaroBluePrint from "taro-bluetooth-print"

const printer = new TaroBluePrint({
  debug: true, // 开启调试模式
  encoding: "GBK", // 字符编码
  characterSet: "CHINA", // 字符集
  paperWidth: 58, // 纸张宽度 (mm)
  autoCut: true, // 自动切纸
  beep: false, // 蜂鸣提示
  timeout: 30000, // 连接超时 (ms)
})
```

### 配置选项说明

| 选项         | 类型    | 默认值  | 说明                             |
| ------------ | ------- | ------- | -------------------------------- |
| debug        | boolean | false   | 是否开启调试模式                 |
| encoding     | string  | 'GBK'   | 字符编码，支持 'GBK'、'UTF-8' 等 |
| characterSet | string  | 'CHINA' | 字符集，如 'CHINA'、'USA' 等     |
| paperWidth   | number  | 58      | 纸张宽度，支持 58/80mm           |
| autoCut      | boolean | true    | 打印完成是否自动切纸             |
| beep         | boolean | false   | 打印完成是否蜂鸣提示             |
| timeout      | number  | 30000   | 连接超时时间（毫秒）             |

## 蓝牙设备管理

### 搜索设备

```typescript
// 开始搜索设备
const discoveryStarted = await printer.bluetooth.startDiscovery({
  timeout: 10000, // 搜索超时时间
  services: ["1812"], // 指定服务 UUID
  allowDuplicatesKey: false, // 是否允许重复上报
})

if (discoveryStarted) {
  console.log("开始搜索蓝牙设备...")
}
```

### 获取设备列表

```typescript
// 获取已发现的设备
const devices = await printer.bluetooth.getDiscoveredDevices()

console.log("发现设备列表:")
devices.forEach((device, index) => {
  console.log(`${index + 1}. ${device.name || "未知设备"}`)
  console.log(`   ID: ${device.deviceId}`)
  console.log(`   信号强度: ${device.RSSI || "未知"}`)
})
```

### 连接设备

```typescript
// 连接到指定设备
const deviceId = devices[0].deviceId // 选择第一个设备
const connected = await printer.bluetooth.connect(deviceId)

if (connected) {
  console.log("设备连接成功!")
} else {
  console.error("设备连接失败")
}
```

### 监听连接状态

```typescript
// 监听连接状态变化
printer.bluetooth.onConnectionStateChange((connected) => {
  if (connected) {
    console.log("设备已连接")
  } else {
    console.log("设备已断开连接")
    // 可以在这里实现自动重连逻辑
  }
})

// 监听设备发现
printer.bluetooth.onDeviceFound((device) => {
  console.log("发现新设备:", device.name)
})
```

## 基础打印功能

### 文本打印

```typescript
// 打印简单文本
await printer.printer.printText("Hello, World!")

// 打印带格式的文本
await printer.printer.printText("标题文本", {
  align: "center", // 居中对齐
  bold: true, // 加粗
  fontSize: 24, // 字体大小
  underline: true, // 下划线
})

// 打印多行文本
await printer.printer.printText([
  "第一行文本",
  { text: "第二行加粗", bold: true },
  { text: "第三行右对齐", align: "right" },
])
```

### 文本格式选项

| 选项         | 类型                          | 默认值 | 说明           |
| ------------ | ----------------------------- | ------ | -------------- |
| align        | 'left' \| 'center' \| 'right' | 'left' | 对齐方式       |
| bold         | boolean                       | false  | 是否加粗       |
| doubleHeight | boolean                       | false  | 是否倍高       |
| doubleWidth  | boolean                       | false  | 是否倍宽       |
| underline    | boolean                       | false  | 是否添加下划线 |
| fontType     | 'A' \| 'B' \| 'C'             | 'A'    | 字体类型       |

### 换行和分页

```typescript
// 换行
await printer.printer.newLine()

// 走纸指定行数
await printer.printer.feed(3) // 走纸3行

// 打印分隔线
await printer.printer.printLine("-", 32) // 打印32个字符的横线
```

### 打印控制

```typescript
// 初始化打印机
await printer.printer.init()

// 切纸
await printer.printer.cut("full") // 完全切纸
await printer.printer.cut("partial") // 部分切纸

// 取消所有打印任务
await printer.printer.cancel()
```

## 完整示例

### 基础打印流程

```typescript
import TaroBluePrint from "taro-bluetooth-print"

async function basicPrintExample() {
  // 1. 创建打印机实例
  const printer = new TaroBluePrint({
    debug: true,
    paperWidth: 58,
  })

  try {
    // 2. 搜索设备
    console.log("正在搜索蓝牙设备...")
    const discoveryStarted = await printer.bluetooth.startDiscovery()

    if (!discoveryStarted) {
      throw new Error("无法启动设备搜索")
    }

    // 等待搜索完成
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 3. 获取设备列表
    const devices = await printer.bluetooth.getDiscoveredDevices()

    if (devices.length === 0) {
      throw new Error("未找到可用的蓝牙设备")
    }

    console.log(`找到 ${devices.length} 个设备`)

    // 4. 连接设备
    const targetDevice = devices[0]
    console.log(`正在连接到: ${targetDevice.name}`)

    const connected = await printer.bluetooth.connect(targetDevice.deviceId)
    if (!connected) {
      throw new Error("设备连接失败")
    }

    console.log("✅ 设备连接成功")

    // 5. 打印内容
    await printer.printer.init()

    // 打印标题
    await printer.printer.printText("=== 测试单据 ===", {
      align: "center",
      bold: true,
      fontSize: 24,
    })

    await printer.printer.newLine()

    // 打印商品列表
    await printer.printer.printText("商品名称    数量    单价    金额")
    await printer.printer.printLine("-", 32)

    const items = [
      { name: "商品A", quantity: 2, price: 10.0 },
      { name: "商品B", quantity: 1, price: 25.0 },
      { name: "商品C", quantity: 3, price: 8.5 },
    ]

    let total = 0
    for (const item of items) {
      const amount = item.quantity * item.price
      total += amount

      const line = `${item.name.padEnd(12)}${item.quantity
        .toString()
        .padEnd(8)}${item.price.toFixed(2).padEnd(8)}${amount.toFixed(2)}`
      await printer.printer.printText(line)
    }

    await printer.printer.printLine("-", 32)
    await printer.printer.printText(`总计: ${total.toFixed(2)}`, { bold: true })

    await printer.printer.newLine()

    // 打印时间
    const now = new Date()
    await printer.printer.printText(`打印时间: ${now.toLocaleString()}`, {
      align: "center",
      fontSize: 12,
    })

    // 6. 走纸和切纸
    await printer.printer.feed(3)
    await printer.printer.cut()

    console.log("✅ 打印完成")
  } catch (error) {
    console.error("❌ 打印失败:", error.message)
  } finally {
    // 7. 断开连接
    try {
      await printer.bluetooth.disconnect()
      console.log("✅ 设备已断开连接")
    } catch (error) {
      console.error("❌ 断开连接失败:", error.message)
    }
  }
}

// 执行示例
basicPrintExample()
```

## 错误处理

### 基本错误处理

```typescript
try {
  await printer.bluetooth.connect(deviceId)
  console.log("连接成功")
} catch (error) {
  console.error("连接失败:", error.message)

  // 根据错误类型处理
  switch (error.code) {
    case "BLUETOOTH_NOT_AVAILABLE":
      console.error("蓝牙不可用")
      break
    case "DEVICE_NOT_FOUND":
      console.error("设备未找到")
      break
    case "CONNECTION_FAILED":
      console.error("连接失败，请重试")
      break
    default:
      console.error("未知错误:", error)
  }
}
```

### 连接重试机制

```typescript
async function connectWithRetry(deviceId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const connected = await printer.bluetooth.connect(deviceId)
      if (connected) {
        console.log(`✅ 第 ${i + 1} 次尝试连接成功`)
        return true
      }
    } catch (error) {
      console.error(`❌ 第 ${i + 1} 次连接失败:`, error.message)
    }

    // 等待一段时间后重试
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return false
}
```

## 最佳实践

### 1. 资源管理

```typescript
// 使用完毕后确保断开连接
async function safePrint() {
  const printer = new TaroBluePrint()

  try {
    // 打印操作
    await printContent(printer)
  } finally {
    // 确保断开连接
    await printer.bluetooth.disconnect()
  }
}
```

### 2. 状态检查

```typescript
// 检查连接状态
if (!printer.bluetooth.isConnected()) {
  console.log("设备未连接，正在尝试连接...")
  await connectDevice()
}

// 检查打印机状态
const status = await printer.printer.getStatus()
if (status !== "ready") {
  console.log("打印机未就绪:", status)
}
```

### 3. 性能优化

```typescript
// 批量操作减少通信次数
await printer.printer.printText(["第一行", "第二行", "第三行"])

// 预处理数据
const processedData = preprocessData(data)
await printer.printer.printData(processedData)
```

## 下一步

学习了基础用法后，您可以继续探索：

- [蓝牙连接详解](/guide/bluetooth-connection) - 深入了解蓝牙连接机制
- [打印机配置](/guide/printer-configuration) - 配置不同类型的打印机
- [图片打印](/guide/image-printing) - 学习如何打印图片和二维码
- [错误处理](/guide/error-handling) - 处理各种错误情况
- [API 文档](/api/) - 查看完整的 API 参考
