# 错误处理指南

本指南详细介绍如何处理使用 Taro Bluetooth Print 库时可能遇到的各种错误情况，包括错误类型、处理策略和最佳实践。

## 错误类型

### 蓝牙相关错误

| 错误代码                      | 错误类型   | 描述                           | 常见原因               |
| ----------------------------- | ---------- | ------------------------------ | ---------------------- |
| `BLUETOOTH_NOT_AVAILABLE`     | 蓝牙不可用 | 设备不支持蓝牙或蓝牙功能被禁用 | 设备硬件问题、系统设置 |
| `BLUETOOTH_NOT_ENABLED`       | 蓝牙未开启 | 蓝牙功能未开启                 | 用户未开启蓝牙         |
| `BLUETOOTH_PERMISSION_DENIED` | 权限被拒绝 | 应用没有蓝牙使用权限           | 用户拒绝权限申请       |
| `DEVICE_NOT_FOUND`            | 设备未找到 | 搜索不到目标设备               | 设备未开启、距离过远   |
| `CONNECTION_FAILED`           | 连接失败   | 无法连接到设备                 | 设备忙碌、信号干扰     |
| `CONNECTION_TIMEOUT`          | 连接超时   | 连接请求超时                   | 设备响应慢、网络问题   |
| `CONNECTION_LOST`             | 连接丢失   | 已建立的连接意外断开           | 设备关机、信号中断     |

### 打印相关错误

| 错误代码            | 错误类型     | 描述                     | 常见原因                   |
| ------------------- | ------------ | ------------------------ | -------------------------- |
| `PRINTER_NOT_READY` | 打印机未就绪 | 打印机处于错误状态或缺纸 | 缺纸、卡纸、打印机故障     |
| `PRINTER_OFFLINE`   | 打印机离线   | 打印机无法响应           | 设备断开连接、关机         |
| `PRINT_FAILED`      | 打印失败     | 打印命令执行失败         | 数据格式错误、打印机不支持 |
| `PAPER_JAM`         | 卡纸         | 打印机卡纸               | 纸张质量问题、设备故障     |
| `OUT_OF_PAPER`      | 缺纸         | 打印机缺纸               | 纸张用完                   |
| `OVERHEAT`          | 过热         | 打印机过热保护           | 连续打印时间过长           |
| `LOW_BATTERY`       | 电量低       | 打印机电量不足           | 电池电量不足               |

### 数据相关错误

| 错误代码             | 错误类型     | 描述                   | 常见原因                 |
| -------------------- | ------------ | ---------------------- | ------------------------ |
| `INVALID_DATA`       | 数据无效     | 发送的数据格式不正确   | 编码错误、数据损坏       |
| `DATA_TOO_LARGE`     | 数据过大     | 单次发送的数据超过限制 | 图片分辨率过高、文本过长 |
| `ENCODING_ERROR`     | 编码错误     | 字符编码转换失败       | 编码不匹配、字符不支持   |
| `IMAGE_FORMAT_ERROR` | 图片格式错误 | 图片格式不支持         | 格式不兼容、文件损坏     |
| `BUFFER_OVERFLOW`    | 缓冲区溢出   | 数据缓冲区溢出         | 发送速度过快             |

## 基本错误处理

### try-catch 结构

```typescript
import TaroBluePrint from "taro-bluetooth-print"

const printer = new TaroBluePrint({
  debug: true,
})

async function safePrintOperation() {
  try {
    // 蓝牙操作
    await printer.bluetooth.init()
    await printer.bluetooth.startDiscovery()

    const devices = await printer.bluetooth.getDiscoveredDevices()
    if (devices.length === 0) {
      throw new Error("未找到可用设备")
    }

    // 连接设备
    const connected = await printer.bluetooth.connect(devices[0].deviceId)
    if (!connected) {
      throw new Error("设备连接失败")
    }

    // 打印操作
    await printer.printer.printText("Hello, World!")
    await printer.printer.cut()

    console.log("打印操作成功完成")
  } catch (error) {
    console.error("打印操作失败:", error.message)
    await handlePrintError(error)
  } finally {
    // 清理资源
    try {
      await printer.bluetooth.disconnect()
    } catch (error) {
      console.error("断开连接失败:", error.message)
    }
  }
}
```

### 错误分类处理

```typescript
// 错误处理函数
async function handlePrintError(error) {
  const errorCode = error.code || "UNKNOWN_ERROR"

  switch (errorCode) {
    case "BLUETOOTH_NOT_AVAILABLE":
      await handleBluetoothNotAvailable()
      break

    case "BLUETOOTH_NOT_ENABLED":
      await handleBluetoothNotEnabled()
      break

    case "DEVICE_NOT_FOUND":
      await handleDeviceNotFound()
      break

    case "CONNECTION_FAILED":
      await handleConnectionFailed()
      break

    case "PRINTER_NOT_READY":
      await handlePrinterNotReady()
      break

    case "PRINT_FAILED":
      await handlePrintFailed()
      break

    case "OUT_OF_PAPER":
      await handleOutOfPaper()
      break

    default:
      await handleUnknownError(error)
  }
}

// 处理蓝牙不可用
async function handleBluetoothNotAvailable() {
  console.log("蓝牙不可用，请检查设备蓝牙功能")

  // 显示用户友好的提示
  if (typeof Taro !== "undefined") {
    Taro.showModal({
      title: "蓝牙错误",
      content: "设备不支持蓝牙功能，请使用其他设备或检查蓝牙设置",
      showCancel: false,
    })
  }
}

// 处理蓝牙未开启
async function handleBluetoothNotEnabled() {
  console.log("蓝牙未开启，尝试引导用户开启")

  if (typeof Taro !== "undefined") {
    Taro.showModal({
      title: "蓝牙未开启",
      content: "请开启设备蓝牙功能后重试",
      confirmText: "去设置",
      success: (res) => {
        if (res.confirm) {
          // 引导用户到设置页面
          Taro.openBluetoothAdapter()
        }
      },
    })
  }
}

// 处理设备未找到
async function handleDeviceNotFound() {
  console.log("未找到打印设备，尝试重新搜索")

  try {
    // 重新搜索设备
    await printer.bluetooth.startDiscovery({
      timeout: 15000,
      services: [],
    })

    // 等待搜索完成
    await new Promise((resolve) => setTimeout(resolve, 15000))

    const devices = await printer.bluetooth.getDiscoveredDevices()
    if (devices.length > 0) {
      console.log("重新搜索成功，找到设备:", devices.length)
      return true
    } else {
      throw new Error("仍然未找到设备")
    }
  } catch (error) {
    console.error("重新搜索失败:", error.message)
    return false
  }
}
```

## 重试机制

### 基本重试策略

```typescript
// 重试配置
interface RetryConfig {
  maxRetries: number // 最大重试次数
  retryDelay: number // 重试延迟 (毫秒)
  backoffFactor: number // 退避因子
  retryCondition: (error: Error) => boolean // 重试条件
}

// 默认重试配置
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // 可重试的错误类型
    const retryableErrors = [
      "CONNECTION_FAILED",
      "CONNECTION_TIMEOUT",
      "PRINT_FAILED",
      "DEVICE_NOT_FOUND",
    ]
    return retryableErrors.includes(error.code)
  },
}

// 带重试的操作执行器
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config }
  let lastError: Error

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // 检查是否应该重试
      if (
        attempt === finalConfig.maxRetries ||
        !finalConfig.retryCondition(error)
      ) {
        throw error
      }

      // 计算延迟时间
      const delay =
        finalConfig.retryDelay * Math.pow(finalConfig.backoffFactor, attempt)

      console.warn(
        `操作失败，${delay}ms 后进行第 ${attempt + 1} 次重试:`,
        error.message
      )

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// 使用示例
async function connectWithRetry(deviceId: string) {
  return await executeWithRetry(() => printer.bluetooth.connect(deviceId), {
    maxRetries: 5,
    retryDelay: 2000,
    backoffFactor: 1.5,
    retryCondition: (error) =>
      ["CONNECTION_FAILED", "CONNECTION_TIMEOUT"].includes(error.code),
  })
}
```

### 智能重试策略

```typescript
// 智能重试管理器
class SmartRetryManager {
  private retryHistory = new Map<string, number[]>()

  // 记录失败时间
  recordFailure(operationId: string) {
    if (!this.retryHistory.has(operationId)) {
      this.retryHistory.set(operationId, [])
    }

    const failures = this.retryHistory.get(operationId)
    failures.push(Date.now())

    // 只保留最近 10 次失败记录
    if (failures.length > 10) {
      failures.shift()
    }
  }

  // 计算重试延迟
  calculateDelay(operationId: string, baseDelay: number): number {
    const failures = this.retryHistory.get(operationId) || []

    if (failures.length === 0) {
      return baseDelay
    }

    // 如果最近失败频繁，增加延迟
    const recentFailures = failures.filter(
      (time) => Date.now() - time < 60000 // 最近 1 分钟内的失败
    )

    if (recentFailures.length >= 3) {
      return baseDelay * 3 // 失败频繁，延迟增加 3 倍
    } else if (recentFailures.length >= 2) {
      return baseDelay * 2 // 失败较多，延迟增加 2 倍
    }

    return baseDelay
  }

  // 清理失败记录
  clearHistory(operationId?: string) {
    if (operationId) {
      this.retryHistory.delete(operationId)
    } else {
      this.retryHistory.clear()
    }
  }
}

// 使用智能重试
const retryManager = new SmartRetryManager()

async function smartConnect(deviceId: string) {
  const operationId = `connect_${deviceId}`

  return await executeWithRetry(
    async () => {
      try {
        return await printer.bluetooth.connect(deviceId)
      } catch (error) {
        retryManager.recordFailure(operationId)
        throw error
      }
    },
    {
      maxRetries: 3,
      retryDelay: retryManager.calculateDelay(operationId, 1000),
    }
  )
}
```

## 状态监控

### 连接状态监控

```typescript
// 连接状态监控器
class ConnectionMonitor {
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor(private printer: any) {
    this.setupEventListeners()
  }

  // 设置事件监听器
  private setupEventListeners() {
    this.printer.bluetooth.onConnectionStateChange((connected) => {
      this.isConnected = connected

      if (connected) {
        console.log("✅ 设备已连接")
        this.reconnectAttempts = 0
        this.startMonitoring()
      } else {
        console.log("❌ 设备已断开连接")
        this.stopMonitoring()
        this.handleDisconnection()
      }
    })
  }

  // 开始监控
  private startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        // 检查连接状态
        const stillConnected = this.printer.bluetooth.isConnected()

        if (!stillConnected && this.isConnected) {
          console.log("检测到连接异常断开")
          this.isConnected = false
          this.handleDisconnection()
        }
      } catch (error) {
        console.error("连接状态检查失败:", error.message)
      }
    }, 5000) // 每 5 秒检查一次
  }

  // 停止监控
  private stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  // 处理断开连接
  private async handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++

      console.log(
        `尝试自动重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      )

      setTimeout(async () => {
        try {
          // 重新搜索设备
          await this.printer.bluetooth.startDiscovery({ timeout: 5000 })

          const devices = await this.printer.bluetooth.getDiscoveredDevices()
          if (devices.length > 0) {
            const connected = await this.printer.bluetooth.connect(
              devices[0].deviceId
            )

            if (connected) {
              console.log("✅ 自动重连成功")
              this.reconnectAttempts = 0
            }
          }
        } catch (error) {
          console.error("自动重连失败:", error.message)
        }
      }, this.reconnectDelay)
    } else {
      console.error("❌ 自动重连失败，已达最大重试次数")
      // 可以在这里通知用户手动重连
    }
  }

  // 销毁监控器
  destroy() {
    this.stopMonitoring()
    this.reconnectAttempts = 0
  }
}

// 使用连接监控
const connectionMonitor = new ConnectionMonitor(printer)
```

### 打印状态监控

```typescript
// 打印状态监控器
class PrintStatusMonitor {
  private printQueue: Array<{
    id: string
    data: any
    retries: number
    timestamp: number
  }> = []

  private isPrinting = false
  private maxRetries = 3

  constructor(private printer: any) {
    this.setupStatusCheck()
  }

  // 添加打印任务
  addPrintTask(data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const taskId = `print_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      this.printQueue.push({
        id: taskId,
        data,
        retries: 0,
        timestamp: Date.now(),
      })

      // 监听任务完成
      const checkStatus = setInterval(() => {
        const task = this.printQueue.find((t) => t.id === taskId)
        if (!task) {
          clearInterval(checkStatus)
          resolve(taskId)
        }
      }, 1000)

      // 设置超时
      setTimeout(() => {
        clearInterval(checkStatus)
        reject(new Error("打印任务超时"))
      }, 30000)

      this.processQueue()
    })
  }

  // 处理打印队列
  private async processQueue() {
    if (this.isPrinting || this.printQueue.length === 0) {
      return
    }

    this.isPrinting = true

    while (this.printQueue.length > 0) {
      const task = this.printQueue[0]

      try {
        await this.executePrintTask(task)

        // 任务成功，从队列中移除
        this.printQueue.shift()
        console.log(`打印任务 ${task.id} 完成`)
      } catch (error) {
        console.error(`打印任务 ${task.id} 失败:`, error.message)

        task.retries++

        if (task.retries < this.maxRetries) {
          console.log(
            `重试打印任务 ${task.id} (${task.retries}/${this.maxRetries})`
          )

          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } else {
          console.error(`打印任务 ${task.id} 最终失败`)

          // 任务失败，从队列中移除
          this.printQueue.shift()

          // 可以在这里通知用户
          this.notifyPrintFailure(task, error)
        }
      }
    }

    this.isPrinting = false
  }

  // 执行打印任务
  private async executePrintTask(task: any) {
    // 检查打印机状态
    const status = await this.printer.printer.getStatus()

    if (status !== "ready") {
      throw new Error(`打印机未就绪: ${status}`)
    }

    // 执行打印
    await this.printer.printer.printData(task.data)
  }

  // 设置状态检查
  private setupStatusCheck() {
    setInterval(async () => {
      try {
        const status = await this.printer.printer.getStatus()

        if (status === "error") {
          console.warn("打印机处于错误状态，尝试重置")
          await this.printer.printer.reset()
        }
      } catch (error) {
        console.error("状态检查失败:", error.message)
      }
    }, 10000) // 每 10 秒检查一次
  }

  // 通知打印失败
  private notifyPrintFailure(task: any, error: any) {
    if (typeof Taro !== "undefined") {
      Taro.showToast({
        title: "打印失败",
        icon: "none",
        duration: 3000,
      })
    }
  }
}

// 使用打印状态监控
const printMonitor = new PrintStatusMonitor(printer)
```

## 错误恢复

### 自动恢复机制

```typescript
// 错误恢复管理器
class ErrorRecoveryManager {
  private recoveryStrategies = new Map<string, () => Promise<boolean>>()

  constructor(private printer: any) {
    this.setupRecoveryStrategies()
  }

  // 设置恢复策略
  private setupRecoveryStrategies() {
    // 蓝牙连接恢复
    this.recoveryStrategies.set("CONNECTION_LOST", async () => {
      try {
        // 重新初始化蓝牙
        await this.printer.bluetooth.init()

        // 重新搜索设备
        await this.printer.bluetooth.startDiscovery({ timeout: 5000 })

        const devices = await this.printer.bluetooth.getDiscoveredDevices()
        if (devices.length > 0) {
          return await this.printer.bluetooth.connect(devices[0].deviceId)
        }

        return false
      } catch (error) {
        console.error("连接恢复失败:", error.message)
        return false
      }
    })

    // 打印机状态恢复
    this.recoveryStrategies.set("PRINTER_NOT_READY", async () => {
      try {
        // 重置打印机
        await this.printer.printer.reset()

        // 等待重置完成
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 检查状态
        const status = await this.printer.printer.getStatus()
        return status === "ready"
      } catch (error) {
        console.error("打印机状态恢复失败:", error.message)
        return false
      }
    })

    // 缺纸恢复
    this.recoveryStrategies.set("OUT_OF_PAPER", async () => {
      try {
        // 提示用户添加纸张
        if (typeof Taro !== "undefined") {
          const result = await Taro.showModal({
            title: "缺纸提示",
            content: "打印机缺纸，请添加纸张后点击确定",
            confirmText: "已添加纸张",
          })

          if (!result.confirm) {
            return false
          }
        }

        // 等待用户操作
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // 检查纸张状态
        const hasPaper = await this.printer.printer.hasPaper()
        return hasPaper
      } catch (error) {
        console.error("缺纸恢复失败:", error.message)
        return false
      }
    })
  }

  // 尝试错误恢复
  async attemptRecovery(error: Error): Promise<boolean> {
    const errorCode = error.code || "UNKNOWN_ERROR"
    const recoveryStrategy = this.recoveryStrategies.get(errorCode)

    if (recoveryStrategy) {
      console.log(`尝试恢复错误: ${errorCode}`)

      try {
        const recovered = await recoveryStrategy()

        if (recovered) {
          console.log(`错误恢复成功: ${errorCode}`)
          return true
        } else {
          console.log(`错误恢复失败: ${errorCode}`)
          return false
        }
      } catch (recoveryError) {
        console.error(`恢复过程中发生错误:`, recoveryError.message)
        return false
      }
    } else {
      console.log(`未找到错误 ${errorCode} 的恢复策略`)
      return false
    }
  }
}

// 使用错误恢复
const recoveryManager = new ErrorRecoveryManager(printer)

async function robustPrintOperation() {
  try {
    await printer.printer.printText("Hello, World!")
  } catch (error) {
    console.error("打印操作失败:", error.message)

    // 尝试自动恢复
    const recovered = await recoveryManager.attemptRecovery(error)

    if (recovered) {
      console.log("已恢复，重试打印操作")
      await printer.printer.printText("Hello, World!")
    } else {
      console.error("无法恢复，需要手动干预")
    }
  }
}
```

## 日志记录

### 错误日志系统

```typescript
// 错误日志记录器
class ErrorLogger {
  private logs: Array<{
    timestamp: number
    level: "error" | "warn" | "info"
    code?: string
    message: string
    context?: any
  }> = []

  private maxLogs = 1000

  // 记录错误
  error(error: Error, context?: any) {
    this.log("error", error.code, error.message, context)
  }

  // 记录警告
  warn(message: string, context?: any) {
    this.log("warn", undefined, message, context)
  }

  // 记录信息
  info(message: string, context?: any) {
    this.log("info", undefined, message, context)
  }

  // 记录日志
  private log(
    level: "error" | "warn" | "info",
    code: string | undefined,
    message: string,
    context?: any
  ) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      code,
      message,
      context,
    }

    this.logs.push(logEntry)

    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 输出到控制台
    const timestamp = new Date(logEntry.timestamp).toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    if (code) {
      console.log(`${prefix} [${code}] ${message}`, context || "")
    } else {
      console.log(`${prefix} ${message}`, context || "")
    }
  }

  // 获取错误统计
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      errorsByCode: {} as Record<string, number>,
      recentErrors: [] as any[],
    }

    this.logs.forEach((log) => {
      if (log.level === "error") {
        stats.totalErrors++

        if (log.code) {
          stats.errorsByCode[log.code] = (stats.errorsByCode[log.code] || 0) + 1
        }

        // 最近 24 小时的错误
        if (Date.now() - log.timestamp < 24 * 60 * 60 * 1000) {
          stats.recentErrors.push(log)
        }
      }
    })

    return stats
  }

  // 导出日志
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // 清空日志
  clearLogs() {
    this.logs = []
  }
}

// 使用错误日志
const errorLogger = new ErrorLogger()

// 包装打印机方法以自动记录错误
function wrapPrinterMethod(originalMethod: Function, methodName: string) {
  return async function (...args: any[]) {
    try {
      errorLogger.info(`调用方法: ${methodName}`, { args })
      const result = await originalMethod.apply(this, args)
      errorLogger.info(`方法成功: ${methodName}`, { result })
      return result
    } catch (error) {
      errorLogger.error(error, { method: methodName, args })
      throw error
    }
  }
}

// 应用日志包装
const originalConnect = printer.bluetooth.connect.bind(printer.bluetooth)
printer.bluetooth.connect = wrapPrinterMethod(
  originalConnect,
  "bluetooth.connect"
)

const originalPrintText = printer.printer.printText.bind(printer.printer)
printer.printer.printText = wrapPrinterMethod(
  originalPrintText,
  "printer.printText"
)
```

## 用户反馈

### 友好的错误提示

```typescript
// 用户友好的错误提示管理器
class UserErrorFeedback {
  private errorMessages = {
    BLUETOOTH_NOT_AVAILABLE: {
      title: "蓝牙不可用",
      content: "您的设备不支持蓝牙功能，请使用其他设备尝试。",
      actions: ["确定"],
    },
    BLUETOOTH_NOT_ENABLED: {
      title: "蓝牙未开启",
      content: "请在设备设置中开启蓝牙功能后重试。",
      actions: ["去设置", "取消"],
    },
    DEVICE_NOT_FOUND: {
      title: "未找到打印机",
      content: "请确保打印机已开启并在附近，然后重试。",
      actions: ["重新搜索", "取消"],
    },
    CONNECTION_FAILED: {
      title: "连接失败",
      content: "无法连接到打印机，请检查设备状态后重试。",
      actions: ["重试", "取消"],
    },
    OUT_OF_PAPER: {
      title: "打印机缺纸",
      content: "请为打印机添加纸张后点击继续。",
      actions: ["已添加纸张", "取消"],
    },
    PRINT_FAILED: {
      title: "打印失败",
      content: "打印过程中发生错误，请重试。",
      actions: ["重试", "取消"],
    },
  }

  // 显示错误提示
  async showError(error: Error): Promise<string> {
    const errorCode = error.code || "UNKNOWN_ERROR"
    const messageConfig = this.errorMessages[errorCode] || {
      title: "操作失败",
      content: error.message || "发生了未知错误，请重试。",
      actions: ["确定"],
    }

    if (typeof Taro !== "undefined") {
      const result = await Taro.showModal({
        title: messageConfig.title,
        content: messageConfig.content,
        showCancel: messageConfig.actions.length > 1,
        confirmText: messageConfig.actions[0],
        cancelText: messageConfig.actions[1] || "取消",
      })

      return result.confirm
        ? messageConfig.actions[0]
        : messageConfig.actions[1] || ""
    } else {
      // Web 环境下的提示
      const action = confirm(
        `${messageConfig.title}\n\n${messageConfig.content}`
      )
        ? messageConfig.actions[0]
        : messageConfig.actions[1] || ""

      return Promise.resolve(action)
    }
  }

  // 显示操作成功提示
  showSuccess(message: string) {
    if (typeof Taro !== "undefined") {
      Taro.showToast({
        title: message,
        icon: "success",
        duration: 2000,
      })
    } else {
      console.log(`✅ ${message}`)
    }
  }

  // 显示操作进度
  showLoading(message: string) {
    if (typeof Taro !== "undefined") {
      Taro.showLoading({
        title: message,
      })
    } else {
      console.log(`⏳ ${message}`)
    }
  }

  // 隐藏加载提示
  hideLoading() {
    if (typeof Taro !== "undefined") {
      Taro.hideLoading()
    }
  }
}

// 使用用户反馈
const userFeedback = new UserErrorFeedback()

async function userFriendlyPrint() {
  try {
    userFeedback.showLoading("正在连接打印机...")

    await printer.bluetooth.init()
    await printer.bluetooth.startDiscovery()

    const devices = await printer.bluetooth.getDiscoveredDevices()
    if (devices.length === 0) {
      throw new Error("DEVICE_NOT_FOUND")
    }

    userFeedback.showLoading("正在连接设备...")

    const connected = await printer.bluetooth.connect(devices[0].deviceId)
    if (!connected) {
      throw new Error("CONNECTION_FAILED")
    }

    userFeedback.showLoading("正在打印...")

    await printer.printer.printText("Hello, World!")

    userFeedback.hideLoading()
    userFeedback.showSuccess("打印成功")
  } catch (error) {
    userFeedback.hideLoading()

    const action = await userFeedback.showError(error)

    // 根据用户选择执行相应操作
    if (action === "重试" || action === "重新搜索") {
      await userFriendlyPrint()
    } else if (action === "去设置") {
      // 引导用户到设置页面
      console.log("引导用户到蓝牙设置")
    }
  }
}
```

## 最佳实践

### 1. 防御性编程

```typescript
// 防御性编程示例
async function defensivePrint(text: string) {
  // 参数验证
  if (!text || typeof text !== "string") {
    throw new Error("INVALID_PARAM: 打印文本不能为空")
  }

  if (text.length > 1000) {
    throw new Error("INVALID_PARAM: 打印文本过长")
  }

  // 状态检查
  if (!printer.bluetooth.isAvailable()) {
    throw new Error("BLUETOOTH_NOT_AVAILABLE")
  }

  if (!printer.bluetooth.isEnabled()) {
    throw new Error("BLUETOOTH_NOT_ENABLED")
  }

  if (!printer.bluetooth.isConnected()) {
    throw new Error("DEVICE_NOT_CONNECTED")
  }

  // 打印机状态检查
  const status = await printer.printer.getStatus()
  if (status !== "ready") {
    throw new Error(`PRINTER_NOT_READY: ${status}`)
  }

  // 执行打印
  await printer.printer.printText(text)
}
```

### 2. 资源清理

```typescript
// 资源清理管理器
class ResourceManager {
  private resources = new Set<() => Promise<void>>()

  // 注册清理资源
  register(cleanupFunction: () => Promise<void>) {
    this.resources.add(cleanupFunction)
  }

  // 清理所有资源
  async cleanup() {
    const cleanupPromises = Array.from(this.resources).map(async (cleanup) => {
      try {
        await cleanup()
      } catch (error) {
        console.error("资源清理失败:", error.message)
      }
    })

    await Promise.allSettled(cleanupPromises)
    this.resources.clear()
  }
}

// 使用资源管理
const resourceManager = new ResourceManager()

async function managedPrintOperation() {
  try {
    // 注册需要清理的资源
    resourceManager.register(async () => {
      await printer.bluetooth.disconnect()
    })

    // 执行操作
    await printer.bluetooth.connect(deviceId)
    await printer.printer.printText("Hello, World!")
  } catch (error) {
    console.error("操作失败:", error.message)
    throw error
  } finally {
    // 自动清理资源
    await resourceManager.cleanup()
  }
}
```

### 3. 错误报告

```typescript
// 错误报告系统
class ErrorReporter {
  private reportEndpoint = "https://api.example.com/error-reports"

  async reportError(error: Error, context: any = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        stack: error.stack,
      },
      context: {
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
        platform: getPlatform(),
        ...context,
      },
    }

    try {
      await fetch(this.reportEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(report),
      })

      console.log("错误报告已发送")
    } catch (reportError) {
      console.error("发送错误报告失败:", reportError.message)
    }
  }
}

// 使用错误报告
const errorReporter = new ErrorReporter()

async function operationWithErrorReporting() {
  try {
    await printer.printer.printText("Hello, World!")
  } catch (error) {
    // 记录错误
    errorLogger.error(error)

    // 发送错误报告
    await errorReporter.reportError(error, {
      operation: "printText",
      printerModel: "unknown",
    })

    // 处理错误
    await handlePrintError(error)
  }
}
```

## 下一步

学习了错误处理后，您可以继续探索：

- [性能优化](/guide/performance) - 优化打印性能
- [API 文档](/api/) - 查看完整的 API 参考
- [常见问题](/reference/faq) - 查看更多常见问题解答
- [贡献指南](/reference/contributing) - 了解如何贡献代码
