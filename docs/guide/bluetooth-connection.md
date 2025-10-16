# 蓝牙连接指南

本指南详细介绍如何使用 Taro Bluetooth Print 库进行蓝牙设备连接，包括设备搜索、连接管理、状态监控等。

## 蓝牙基础概念

### 蓝牙协议版本

本库支持以下蓝牙协议：

- **Bluetooth Classic (SPP)**: 传统蓝牙，适用于大多数热敏打印机
- **Bluetooth Low Energy (BLE)**: 低功耗蓝牙，适用于新型打印机
- **混合模式**: 同时支持 Classic 和 BLE

### 服务和特征值

蓝牙打印机通常提供以下服务：

- **Serial Port Profile (SPP)**: 串口服务，UUID 为 `00001101-0000-1000-8000-00805F9B34FB`
- **Generic Access Profile (GAP)**: 通用访问服务
- **Generic Attribute Profile (GATT)**: 通用属性服务

### 打印机常见服务 UUID

- `1812`: HID 服务 (人机接口设备)
- `180F`: 电池服务
- `180A`: 设备信息服务

## 初始化蓝牙适配器

### 基本初始化

```typescript
import TaroBluePrint from "taro-bluetooth-print"

const printer = new TaroBluePrint({
  debug: true,
})

// 初始化蓝牙适配器
const initialized = await printer.bluetooth.init()
if (initialized) {
  console.log("蓝牙适配器初始化成功")
} else {
  console.error("蓝牙适配器初始化失败")
}
```

### 检查蓝牙状态

```typescript
// 检查蓝牙是否可用
const available = await printer.bluetooth.isAvailable()
if (!available) {
  console.error("设备蓝牙不可用")
  return
}

// 检查蓝牙是否已开启
const enabled = await printer.bluetooth.isEnabled()
if (!enabled) {
  console.error("请开启设备蓝牙功能")
  // 可以引导用户开启蓝牙
  await printer.bluetooth.enable()
}
```

## 搜索蓝牙设备

### 基本搜索

```typescript
// 开始搜索设备
const discoveryStarted = await printer.bluetooth.startDiscovery({
  timeout: 10000, // 搜索超时时间 (毫秒)
  services: ["1812"], // 指定服务 UUID
  allowDuplicatesKey: false, // 是否允许重复上报设备
})

if (discoveryStarted) {
  console.log("开始搜索蓝牙设备...")

  // 监听设备发现事件
  printer.bluetooth.onDeviceFound((device) => {
    console.log("发现设备:", {
      name: device.name,
      id: device.deviceId,
      rssi: device.RSSI,
    })
  })
}
```

### 高级搜索配置

```typescript
// 自定义搜索配置
const searchOptions = {
  timeout: 15000, // 搜索 15 秒
  services: [], // 搜索所有服务
  allowDuplicatesKey: true, // 允许重复上报
  interval: 100, // 搜索间隔 (毫秒)
  window: 50, // 搜索窗口 (毫秒)
}

await printer.bluetooth.startDiscovery(searchOptions)
```

### 过滤特定设备

```typescript
// 监听设备发现并过滤
printer.bluetooth.onDeviceFound((device) => {
  // 过滤打印机设备
  const isPrinter =
    device.name &&
    (device.name.includes("Printer") ||
      device.name.includes("Print") ||
      device.name.includes("POS") ||
      device.name.includes("Thermal"))

  if (isPrinter) {
    console.log("发现打印机设备:", device.name)

    // 检查信号强度
    if (device.RSSI && device.RSSI > -70) {
      console.log("信号强度良好:", device.RSSI)
    }
  }
})
```

### 停止搜索

```typescript
// 手动停止搜索
const stopped = await printer.bluetooth.stopDiscovery()
if (stopped) {
  console.log("已停止搜索设备")
}

// 获取已发现的设备列表
const devices = await printer.bluetooth.getDiscoveredDevices()
console.log(`共发现 ${devices.length} 个设备`)
```

## 连接蓝牙设备

### 基本连接

```typescript
// 连接到指定设备
async function connectToDevice(deviceId) {
  try {
    console.log("正在连接设备:", deviceId)

    const connected = await printer.bluetooth.connect(deviceId)

    if (connected) {
      console.log("✅ 设备连接成功")
      return true
    } else {
      console.error("❌ 设备连接失败")
      return false
    }
  } catch (error) {
    console.error("连接过程中发生错误:", error.message)
    return false
  }
}

// 使用示例
const devices = await printer.bluetooth.getDiscoveredDevices()
if (devices.length > 0) {
  await connectToDevice(devices[0].deviceId)
}
```

### 连接配置选项

```typescript
// 带配置的连接
const connectOptions = {
  timeout: 15000, // 连接超时时间
  autoReconnect: true, // 自动重连
  maxRetries: 3, // 最大重试次数
  retryDelay: 1000, // 重试延迟 (毫秒)
}

await printer.bluetooth.connect(deviceId, connectOptions)
```

### 获取服务和特征值

```typescript
// 获取设备服务
async function getDeviceServices(deviceId) {
  try {
    const services = await printer.bluetooth.getServices(deviceId)
    console.log("设备服务列表:")

    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.uuid}`)
      console.log(`   类型: ${service.isPrimary ? "主服务" : "次服务"}`)
    })

    return services
  } catch (error) {
    console.error("获取服务失败:", error.message)
    return []
  }
}

// 获取特征值
async function getCharacteristics(deviceId, serviceId) {
  try {
    const characteristics = await printer.bluetooth.getCharacteristics(
      deviceId,
      serviceId
    )
    console.log("特征值列表:")

    characteristics.forEach((char, index) => {
      console.log(`${index + 1}. ${char.uuid}`)
      console.log(`   属性: ${char.properties}`)
    })

    return characteristics
  } catch (error) {
    console.error("获取特征值失败:", error.message)
    return []
  }
}
```

## 连接状态管理

### 监听连接状态

```typescript
// 监听连接状态变化
printer.bluetooth.onConnectionStateChange((connected) => {
  if (connected) {
    console.log("🔗 设备已连接")
    // 可以开始打印操作
  } else {
    console.log("❌ 设备已断开连接")
    // 实现重连逻辑
    handleDisconnection()
  }
})

// 处理断开连接
async function handleDisconnection() {
  console.log("检测到设备断开，尝试重连...")

  // 等待一段时间后重连
  setTimeout(async () => {
    const devices = await printer.bluetooth.getDiscoveredDevices()
    if (devices.length > 0) {
      await printer.bluetooth.connect(devices[0].deviceId)
    }
  }, 2000)
}
```

### 检查连接状态

```typescript
// 检查当前连接状态
function checkConnectionStatus() {
  const isConnected = printer.bluetooth.isConnected()

  if (isConnected) {
    console.log("✅ 设备当前已连接")

    // 获取连接信息
    const connectionInfo = printer.bluetooth.getConnectionInfo()
    console.log("连接信息:", connectionInfo)
  } else {
    console.log("❌ 设备当前未连接")
  }

  return isConnected
}
```

### 自动重连机制

```typescript
class BluetoothManager {
  constructor(printer) {
    this.printer = printer
    this.isReconnecting = false
    this.maxRetries = 5
    this.retryCount = 0
    this.retryDelay = 2000

    this.setupEventListeners()
  }

  setupEventListeners() {
    this.printer.bluetooth.onConnectionStateChange((connected) => {
      if (!connected && !this.isReconnecting) {
        this.startReconnection()
      }
    })
  }

  async startReconnection() {
    if (this.isReconnecting || this.retryCount >= this.maxRetries) {
      console.log("重连次数已达上限或正在重连中")
      return
    }

    this.isReconnecting = true
    this.retryCount++

    console.log(`开始第 ${this.retryCount} 次重连尝试...`)

    try {
      // 重新搜索设备
      await this.printer.bluetooth.startDiscovery({ timeout: 5000 })

      const devices = await this.printer.bluetooth.getDiscoveredDevices()
      if (devices.length > 0) {
        const connected = await this.printer.bluetooth.connect(
          devices[0].deviceId
        )

        if (connected) {
          console.log("✅ 重连成功")
          this.retryCount = 0
          this.isReconnecting = false
          return
        }
      }
    } catch (error) {
      console.error("重连失败:", error.message)
    }

    this.isReconnecting = false

    // 延迟后继续重连
    if (this.retryCount < this.maxRetries) {
      setTimeout(() => this.startReconnection(), this.retryDelay)
    } else {
      console.error("❌ 重连失败，已达最大重试次数")
    }
  }
}

// 使用自动重连
const bluetoothManager = new BluetoothManager(printer)
```

## 平台特定配置

### 微信小程序

```typescript
// 小程序权限检查
async function checkMiniProgramPermissions() {
  try {
    // 检查蓝牙权限
    const authSetting = await Taro.getSetting()
    const bluetoothAuth = authSetting.authSetting["scope.bluetooth"]

    if (bluetoothAuth === false) {
      // 用户拒绝了权限，需要引导用户开启
      Taro.showModal({
        title: "权限申请",
        content: "应用需要蓝牙权限来连接打印机",
        success: (res) => {
          if (res.confirm) {
            Taro.openSetting()
          }
        },
      })
      return false
    }

    return true
  } catch (error) {
    console.error("权限检查失败:", error.message)
    return false
  }
}

// 小程序蓝牙初始化
async function initMiniProgramBluetooth() {
  // 检查权限
  const hasPermission = await checkMiniProgramPermissions()
  if (!hasPermission) return false

  // 初始化蓝牙适配器
  const initialized = await printer.bluetooth.init()
  if (!initialized) {
    console.error("小程序蓝牙初始化失败")
    return false
  }

  return true
}
```

### H5 平台

```typescript
// H5 平台蓝牙连接
async function connectWebBluetooth() {
  try {
    // 检查浏览器支持
    if (!navigator.bluetooth) {
      throw new Error("当前浏览器不支持 Web Bluetooth API")
    }

    // 请求蓝牙设备
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["battery_service", "device_information"],
    })

    console.log("已选择设备:", device.name)

    // 连接到 GATT 服务器
    const server = await device.gatt.connect()
    console.log("GATT 服务器已连接")

    return device
  } catch (error) {
    console.error("Web Bluetooth 连接失败:", error.message)
    throw error
  }
}

// H5 平台注意事项
// 1. 必须使用 HTTPS 协议
// 2. 需要用户手势触发
// 3. 浏览器兼容性限制
```

### React Native

```typescript
// React Native 平台配置
import { PermissionsAndroid, Platform } from "react-native"

// Android 权限申请
async function requestAndroidPermissions() {
  if (Platform.OS === "android") {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]

    const granted = await PermissionsAndroid.requestMultiple(permissions)

    const allGranted = Object.values(granted).every(
      (result) => result === PermissionsAndroid.RESULTS.GRANTED
    )

    if (!allGranted) {
      throw new Error("Android 蓝牙权限申请失败")
    }
  }
}

// React Native 蓝牙连接
async function connectRNBluetooth() {
  await requestAndroidPermissions()

  // 使用 React Native 蓝牙库
  // 具体实现依赖于使用的蓝牙库
}
```

## 错误处理

### 常见错误类型

```typescript
// 错误处理函数
function handleBluetoothError(error) {
  switch (error.code) {
    case "BLUETOOTH_NOT_AVAILABLE":
      console.error("蓝牙不可用，请检查设备蓝牙功能")
      break

    case "BLUETOOTH_NOT_ENABLED":
      console.error("蓝牙未开启，请开启蓝牙功能")
      break

    case "DEVICE_NOT_FOUND":
      console.error("未找到目标设备")
      break

    case "CONNECTION_FAILED":
      console.error("连接失败，请重试")
      break

    case "CONNECTION_TIMEOUT":
      console.error("连接超时，请检查设备状态")
      break

    case "SERVICE_NOT_FOUND":
      console.error("未找到所需服务")
      break

    case "CHARACTERISTIC_NOT_FOUND":
      console.error("未找到所需特征值")
      break

    case "OPERATION_NOT_SUPPORTED":
      console.error("操作不支持")
      break

    default:
      console.error("未知蓝牙错误:", error.message)
  }
}
```

### 连接诊断

```typescript
// 蓝牙连接诊断工具
class BluetoothDiagnostics {
  constructor(printer) {
    this.printer = printer
  }

  async runDiagnostics() {
    console.log("🔍 开始蓝牙诊断...")

    // 1. 检查蓝牙可用性
    const available = await this.printer.bluetooth.isAvailable()
    console.log(`蓝牙可用性: ${available ? "✅" : "❌"}`)

    if (!available) return false

    // 2. 检查蓝牙状态
    const enabled = await this.printer.bluetooth.isEnabled()
    console.log(`蓝牙开启状态: ${enabled ? "✅" : "❌"}`)

    if (!enabled) return false

    // 3. 检查权限
    const hasPermission = await this.checkPermissions()
    console.log(`蓝牙权限: ${hasPermission ? "✅" : "❌"}`)

    if (!hasPermission) return false

    // 4. 搜索设备
    const devices = await this.searchDevices()
    console.log(`发现设备数量: ${devices.length}`)

    if (devices.length === 0) return false

    // 5. 尝试连接
    const connected = await this.testConnection(devices[0].deviceId)
    console.log(`连接测试: ${connected ? "✅" : "❌"}`)

    return connected
  }

  async checkPermissions() {
    // 平台特定的权限检查
    return true // 简化示例
  }

  async searchDevices() {
    await this.printer.bluetooth.startDiscovery({ timeout: 5000 })
    return await this.printer.bluetooth.getDiscoveredDevices()
  }

  async testConnection(deviceId) {
    try {
      return await this.printer.bluetooth.connect(deviceId)
    } catch (error) {
      console.error("连接测试失败:", error.message)
      return false
    }
  }
}

// 使用诊断工具
const diagnostics = new BluetoothDiagnostics(printer)
diagnostics.runDiagnostics()
```

## 最佳实践

### 1. 连接管理

```typescript
// 连接管理最佳实践
class ConnectionManager {
  constructor() {
    this.currentConnection = null
    this.connectionQueue = []
  }

  async connect(deviceId) {
    // 如果已有连接，先断开
    if (this.currentConnection) {
      await this.disconnect()
    }

    // 尝试连接
    const connected = await printer.bluetooth.connect(deviceId)
    if (connected) {
      this.currentConnection = deviceId
    }

    return connected
  }

  async disconnect() {
    if (this.currentConnection) {
      await printer.bluetooth.disconnect()
      this.currentConnection = null
    }
  }

  isConnected() {
    return this.currentConnection !== null && printer.bluetooth.isConnected()
  }
}
```

### 2. 性能优化

```typescript
// 性能优化技巧
// 1. 减少搜索频率
let lastSearchTime = 0
const SEARCH_COOLDOWN = 30000 // 30秒冷却时间

async function smartSearch() {
  const now = Date.now()
  if (now - lastSearchTime < SEARCH_COOLDOWN) {
    console.log("搜索冷却中，使用缓存结果")
    return await printer.bluetooth.getDiscoveredDevices()
  }

  lastSearchTime = now
  await printer.bluetooth.startDiscovery({ timeout: 5000 })
  return await printer.bluetooth.getDiscoveredDevices()
}

// 2. 缓存设备信息
const deviceCache = new Map()

function cacheDevice(device) {
  deviceCache.set(device.deviceId, {
    ...device,
    lastSeen: Date.now(),
  })
}

function getCachedDevice(deviceId) {
  return deviceCache.get(deviceId)
}

// 3. 信号强度过滤
function filterBySignalStrength(devices, minRSSI = -70) {
  return devices.filter((device) => device.RSSI && device.RSSI >= minRSSI)
}
```

## 下一步

学习了蓝牙连接后，您可以继续探索：

- [打印机配置](/guide/printer-configuration) - 配置不同类型的打印机
- [图片打印](/guide/image-printing) - 学习如何打印图片和二维码
- [错误处理](/guide/error-handling) - 处理各种错误情况
- [API 文档](/api/bluetooth-adapter) - 查看蓝牙适配器 API
