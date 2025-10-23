# 快速开始

本指南将帮助您快速上手 Taro Bluetooth Print 库。

## 环境要求

- Node.js 14.0 或更高版本
- Taro 3.0 或更高版本
- 支持蓝牙的设备

## 安装

```bash
# 使用 npm
npm install taro-bluetooth-print

# 使用 yarn
yarn add taro-bluetooth-print

# 使用 pnpm
pnpm add taro-bluetooth-print
```

## 基础用法

### 1. 导入库

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"
```

### 2. 创建打印机实例

```typescript
const printer = new BluetoothPrinter({
  // 可选配置
  debug: true, // 开启调试模式
  timeout: 30000, // 连接超时时间（毫秒）
})
```

### 3. 连接蓝牙设备

```typescript
try {
  // 获取可用设备列表
  const devices = await printer.getDevices()
  console.log("可用设备:", devices)

  // 连接到指定设备
  await printer.connect(devices[0].deviceId)
  console.log("连接成功!")
} catch (error) {
  console.error("连接失败:", error)
}
```

### 4. 打印内容

```typescript
// 打印文本
await printer.printText("Hello, Taro Bluetooth Print!")

// 打印换行
await printer.newLine()

// 打印带样式的文本
await printer.printText("大号文本", {
  fontSize: 24,
  bold: true,
  align: "center",
})

// 打印图片
await printer.printImage("/path/to/image.png", {
  width: 200,
  height: 150,
})
```

### 5. 断开连接

```typescript
await printer.disconnect()
console.log("已断开连接")
```

## 完整示例

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"

async function printExample() {
  const printer = new BluetoothPrinter()

  try {
    // 获取设备列表
    const devices = await printer.getDevices()
    if (devices.length === 0) {
      console.log("未找到可用设备")
      return
    }

    // 连接设备
    await printer.connect(devices[0].deviceId)
    console.log("设备连接成功")

    // 打印内容
    await printer.printText("=== 测试打印 ===", {
      fontSize: 20,
      bold: true,
      align: "center",
    })

    await printer.newLine()
    await printer.printText("这是测试文本内容")
    await printer.newLine()

    // 打印当前时间
    const now = new Date()
    await printer.printText(`打印时间: ${now.toLocaleString()}`)

    await printer.feedPaper(3) // 走纸3行
    await printer.cutPaper() // 切纸

    console.log("打印完成")
  } catch (error) {
    console.error("打印失败:", error)
  } finally {
    // 断开连接
    await printer.disconnect()
  }
}

// 调用示例
printExample()
```

## 下一步

- [蓝牙连接详解](/guide/bluetooth-connection) - 了解蓝牙连接的详细流程
- [打印机配置](/guide/printer-configuration) - 配置不同类型的打印机
- [图片打印](/guide/image-printing) - 学习如何打印图片
- [错误处理](/guide/error-handling) - 处理常见的错误情况

## 常见问题

<details>
<summary>蓝牙连接失败怎么办？</summary>

1. 确保设备蓝牙已开启
2. 检查设备是否在蓝牙列表中
3. 确认设备支持所需的蓝牙协议
4. 检查应用是否有蓝牙使用权限

</details>

<details>
<summary>打印内容格式不对？</summary>

1. 检查打印机是否支持相应格式
2. 确认打印参数设置正确
3. 尝试使用不同的字体大小和对齐方式

</details>

## 获取帮助

如果遇到问题，可以：

- 查看 [API 文档](/api/)
- 浏览 [示例代码](/examples/)
- 提交 [GitHub Issue](https://github.com/Agions/taro-bluetooth-print/issues)
