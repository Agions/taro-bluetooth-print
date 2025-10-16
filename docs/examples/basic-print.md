# 基础打印示例

本示例演示如何进行基础的文本打印操作。

## 示例代码

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print'

async function basicPrintExample() {
  // 创建打印机实例
  const printer = new BluetoothPrinter({
    debug: true // 开启调试日志
  })

  try {
    // 1. 获取可用设备
    console.log('正在搜索蓝牙设备...')
    const devices = await printer.getDevices()

    if (devices.length === 0) {
      console.error('未找到可用的蓝牙设备')
      return
    }

    console.log(`找到 ${devices.length} 个设备:`)
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name} (${device.deviceId})`)
    })

    // 2. 连接到第一个设备
    const targetDevice = devices[0]
    console.log(`正在连接到设备: ${targetDevice.name}`)
    await printer.connect(targetDevice.deviceId)
    console.log('✅ 设备连接成功')

    // 3. 执行基础打印操作

    // 打印标题
    await printer.printText('=== 测试单据 ===', {
      fontSize: 24,
      bold: true,
      align: 'center'
    })

    // 换行
    await printer.newLine()

    // 打印商品信息
    await printer.printText('商品名称    数量    单价    金额')
    await printer.printText('------------------------------')

    await printer.printText('商品A        2      10.00   20.00')
    await printer.printText('商品B        1      25.00   25.00')
    await printer.printText('商品C        3      8.50    25.50')

    await printer.printText('------------------------------')

    // 打印汇总
    await printer.printText('总计:        6              70.50', {
      bold: true
    })

    await printer.newLine()

    // 打印时间
    const now = new Date()
    await printer.printText(`打印时间: ${now.toLocaleString()}`, {
      fontSize: 12,
      align: 'center'
    })

    // 4. 走纸和切纸
    await printer.feedPaper(3) // 走纸3行
    await printer.cutPaper()     // 切纸

    console.log('✅ 打印完成')

  } catch (error) {
    console.error('❌ 打印失败:', error.message)
  } finally {
    // 5. 断开连接
    try {
      await printer.disconnect()
      console.log('✅ 设备已断开连接')
    } catch (error) {
      console.error('❌ 断开连接失败:', error.message)
    }
  }
}

// 执行示例
basicPrintExample()
```

## 运行示例

```bash
# 将上述代码保存为 basic-print-example.ts
# 然后在你的 Taro 项目中运行

# 如果使用 Vite
npm run dev

# 如果使用 webpack
npm run build
```

## 预期输出

打印机会输出如下格式的单据：

```
         === 测试单据 ===

商品名称    数量    单价    金额
------------------------------
商品A        2      10.00   20.00
商品B        1      25.00   25.00
商品C        3      8.50    25.50
------------------------------
总计:        6              70.50

        打印时间: 2025-01-16 14:30:25
```

## 关键点说明

1. **设备连接**: 使用 `getDevices()` 获取可用设备列表，然后使用 `connect()` 连接指定设备

2. **文本格式**: `printText()` 方法支持多种格式选项：
   - `fontSize`: 字体大小
   - `bold`: 是否加粗
   - `align`: 对齐方式 (left, center, right)

3. **换行操作**: 使用 `newLine()` 进行换行

4. **纸张控制**:
   - `feedPaper()`: 走纸指定行数
   - `cutPaper()`: 切纸操作

5. **错误处理**: 始终使用 try-catch 包裹蓝牙操作，并在 finally 中断开连接

## 扩展功能

查看其他示例了解更多功能：

- [图片打印示例](/examples/image-print) - 打印图片和二维码
- [收据打印示例](/examples/receipt-print) - 完整的收据打印流程
- [批量打印示例](/examples/batch-print) - 批量处理打印任务