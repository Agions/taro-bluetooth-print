# 打印机配置指南

本指南详细介绍如何配置不同类型的蓝牙打印机，包括纸张设置、字符编码、打印参数等。

## 打印机类型

### 热敏打印机

热敏打印机是最常见的蓝牙打印机类型，适用于收据、标签等打印场景。

**常见型号**:

- EPSON TM-T88 系列
- Citizen CT-S310
- Bixolon SRP-350
- Goodcom GT58
- Xprinter XP58

**特点**:

- 无需墨水，使用热敏纸
- 打印速度快
- 成本低
- 适合文字和简单图形

### 标签打印机

标签打印机专门用于打印标签、条码等。

**常见型号**:

- Zebra ZD410
- Dymo LabelWriter
- Brother QL 系列
- Rollo Printer

**特点**:

- 支持多种标签尺寸
- 高精度打印
- 适合条码和标签

### 便携式打印机

便携式打印机适合移动办公场景。

**常见型号**:

- HP OfficeJet 200
- Canon Pixma iP110
- Epson WorkForce WF-100

**特点**:

- 体积小，重量轻
- 电池供电
- 支持彩色打印

## 基本配置

### 创建打印机实例

```typescript
import TaroBluePrint from "taro-bluetooth-print"

// 基本配置
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

### 纸张配置

#### 纸张宽度设置

```typescript
// 58mm 纸张 (常见热敏纸)
const printer58 = new TaroBluePrint({
  paperWidth: 58,
  maxCharsPerLine: 32, // 每行最大字符数
  maxPixelsPerLine: 384, // 每行最大像素数
})

// 80mm 纸张 (宽幅热敏纸)
const printer80 = new TaroBluePrint({
  paperWidth: 80,
  maxCharsPerLine: 48, // 每行最大字符数
  maxPixelsPerLine: 576, // 每行最大像素数
})
```

#### 纸张类型配置

```typescript
// 热敏纸配置
const thermalPaperConfig = {
  paperWidth: 58,
  paperType: "thermal", // 热敏纸
  printDensity: 8, // 打印密度 (1-15)
  printSpeed: 100, // 打印速度 (mm/s)
  heatTime: 80, // 加热时间
  heatInterval: 2, // 加热间隔
}

// 标签纸配置
const labelPaperConfig = {
  paperWidth: 80,
  paperType: "label", // 标签纸
  labelHeight: 40, // 标签高度 (mm)
  labelGap: 2, // 标签间隔 (mm)
  printDensity: 12, // 高密度打印
  printSpeed: 50, // 较慢速度保证质量
}
```

### 字符编码配置

#### 常见编码设置

```typescript
// 中文编码配置
const chineseConfig = new TaroBluePrint({
  encoding: "GBK", // 或 'GB2312'
  characterSet: "CHINA", // 中文字符集
  codePage: 936, // GBK 代码页
})

// 国际化编码配置
const internationalConfig = new TaroBluePrint({
  encoding: "UTF-8", // UTF-8 编码
  characterSet: "PC437", // ASCII 字符集
  codePage: 437, // PC437 代码页
})

// 日文编码配置
const japaneseConfig = new TaroBluePrint({
  encoding: "SHIFT_JIS", // Shift JIS 编码
  characterSet: "JAPAN", // 日文字符集
  codePage: 932, // Shift JIS 代码页
})
```

#### 动态切换编码

```typescript
// 切换字符编码
async function switchEncoding(printer, encoding, characterSet) {
  try {
    await printer.printer.setEncoding(encoding)
    await printer.printer.setCharacterSet(characterSet)
    console.log(`编码已切换到: ${encoding} (${characterSet})`)
  } catch (error) {
    console.error("编码切换失败:", error.message)
  }
}

// 使用示例
await switchEncoding(printer, "UTF-8", "USA")
await printer.printer.printText("Hello, World!")
await switchEncoding(printer, "GBK", "CHINA")
await printer.printer.printText("你好，世界！")
```

## 打印参数配置

### 字体设置

```typescript
// 字体配置
const fontConfig = {
  fontType: "A", // 字体类型: A, B, C
  fontSize: 1, // 字体大小: 1-8
  bold: false, // 加粗
  underline: false, // 下划线
  doubleHeight: false, // 倍高
  doubleWidth: false, // 倍宽
}

// 应用字体设置
async function applyFontSettings(printer, config) {
  await printer.printer.setFontType(config.fontType)
  await printer.printer.setFontSize(config.fontSize)

  if (config.bold) {
    await printer.printer.setBold(true)
  }

  if (config.underline) {
    await printer.printer.setUnderline(true)
  }

  if (config.doubleHeight) {
    await printer.printer.setDoubleHeight(true)
  }

  if (config.doubleWidth) {
    await printer.printer.setDoubleWidth(true)
  }
}

// 使用示例
await applyFontSettings(printer, {
  fontType: "A",
  fontSize: 2,
  bold: true,
  doubleWidth: true,
})
```

### 对齐方式

```typescript
// 对齐方式配置
enum Alignment {
  LEFT = "left",
  CENTER = "center",
  RIGHT = "right",
}

// 设置对齐方式
async function setAlignment(printer, alignment) {
  await printer.printer.setAlignment(alignment)
}

// 使用示例
await setAlignment(printer, Alignment.CENTER)
await printer.printer.printText("居中文本")
await setAlignment(printer, Alignment.LEFT)
await printer.printer.printText("左对齐文本")
await setAlignment(printer, Alignment.RIGHT)
await printer.printer.printText("右对齐文本")
```

### 行间距和字符间距

```typescript
// 间距配置
const spacingConfig = {
  lineSpacing: 30, // 行间距 (1-255)
  charSpacing: 0, // 字符间距 (0-255)
  rightSpacing: 0, // 右边距 (0-255)
}

// 应用间距设置
async function applySpacing(printer, config) {
  await printer.printer.setLineSpacing(config.lineSpacing)
  await printer.printer.setCharSpacing(config.charSpacing)
  await printer.printer.setRightSpacing(config.rightSpacing)
}

// 使用示例
await applySpacing(printer, {
  lineSpacing: 40,
  charSpacing: 1,
})
```

## 品牌特定配置

### EPSON 打印机

```typescript
// EPSON 打印机配置
const epsonConfig = {
  vendor: "EPSON",
  model: "TM-T88V",
  commandSet: "ESCPOS", // ESC/POS 命令集
  initialization: [
    0x1b,
    0x40, // ESC @ 初始化命令
  ],
  cutCommand: [
    0x1d,
    0x56,
    0x00, // GS V 0 完全切纸
  ],
  partialCutCommand: [
    0x1d,
    0x56,
    0x01, // GS V 1 部分切纸
  ],
}

// EPSON 特定功能
async function setupEpsonPrinter(printer) {
  // 初始化打印机
  await printer.printer.sendCommands(epsonConfig.initialization)

  // 设置字符集
  await printer.printer.setCharacterSet("CHINA")

  // 设置打印密度
  await printer.printer.setPrintDensity(8)

  // 设置打印速度
  await printer.printer.setPrintSpeed(100)
}
```

### Citizen 打印机

```typescript
// Citizen 打印机配置
const citizenConfig = {
  vendor: "Citizen",
  model: "CT-S310",
  commandSet: "ESCPOS",
  features: {
    autoCut: true,
    blackMark: false, // 黑标检测
    peelMode: false, // 剥离模式
  },
}

// Citizen 特定功能
async function setupCitizenPrinter(printer) {
  // 初始化
  await printer.printer.init()

  // 设置纸张传感器
  await printer.printer.setPaperSensor("gap") // gap 或 black

  // 设置切纸模式
  await printer.printer.setCutMode("full") // full 或 partial

  // 设置退纸模式
  await printer.printer.setPaperRetract(false)
}
```

### Zebra 打印机

```typescript
// Zebra 打印机配置 (ZPL 或 EPL)
const zebraConfig = {
  vendor: "Zebra",
  model: "ZD410",
  commandSet: "ZPL", // ZPL 命令集
  labelWidth: 800, // 标签宽度 (点)
  labelHeight: 400, // 标签高度 (点)
  darkness: 10, // 打印浓度 (0-30)
  printSpeed: 4, // 打印速度 (1-10)
}

// Zebra ZPL 命令示例
async function printZebraLabel(printer, data) {
  const zplCommand = `^XA
^FO50,50^ADN,36,20^FD${data.text}^FS
^FO50,100^BQN,2,5^FDQA,${data.qrCode}^FS
^XZ`

  await printer.printer.sendRawCommand(zplCommand)
}
```

## 高级配置

### 打印密度调整

```typescript
// 打印密度配置
const densityConfig = {
  density: 8, // 密度值 (1-15)
  heatTime: 80, // 加热时间 (μs)
  heatInterval: 2, // 加热间隔 (μs)
  dwellTime: 15, // 停留时间 (μs)
}

// 应用密度设置
async function applyDensitySettings(printer, config) {
  await printer.printer.setPrintDensity(config.density)
  await printer.printer.setHeatTime(config.heatTime)
  await printer.printer.setHeatInterval(config.heatInterval)
  await printer.printer.setDwellTime(config.dwellTime)
}

// 根据纸张类型调整密度
async function optimizeForPaperType(printer, paperType) {
  switch (paperType) {
    case "thermal_standard":
      await applyDensitySettings(printer, { density: 8, heatTime: 80 })
      break
    case "thermal_high":
      await applyDensitySettings(printer, { density: 12, heatTime: 100 })
      break
    case "label":
      await applyDensitySettings(printer, { density: 10, heatTime: 90 })
      break
  }
}
```

### 传感器配置

```typescript
// 传感器配置
const sensorConfig = {
  paperSensor: "gap", // 纸张传感器: gap, black, none
  ribbonSensor: false, // 色带传感器
  headSensor: true, // 打印头传感器
  autoRetract: false, // 自动退纸
}

// 配置传感器
async function setupSensors(printer, config) {
  await printer.printer.setPaperSensor(config.paperSensor)
  await printer.printer.setRibbonSensor(config.ribbonSensor)
  await printer.printer.setHeadSensor(config.headSensor)
  await printer.printer.setAutoRetract(config.autoRetract)
}
```

### 电源管理

```typescript
// 电源管理配置
const powerConfig = {
  sleepMode: 300, // 休眠时间 (秒)
  autoPowerOff: 3600, // 自动关机时间 (秒)
  lowPowerMode: true, // 低功耗模式
  batteryLevel: true, // 电池电量检测
}

// 配置电源管理
async function setupPowerManagement(printer, config) {
  await printer.printer.setSleepMode(config.sleepMode)
  await printer.printer.setAutoPowerOff(config.autoPowerOff)
  await printer.printer.setLowPowerMode(config.lowPowerMode)

  if (config.batteryLevel) {
    const level = await printer.printer.getBatteryLevel()
    console.log(`电池电量: ${level}%`)
  }
}
```

## 配置文件管理

### 保存和加载配置

```typescript
// 配置文件结构
interface PrinterConfig {
  name: string
  vendor: string
  model: string
  paperWidth: number
  encoding: string
  characterSet: string
  fontSettings: {
    fontType: string
    fontSize: number
    bold: boolean
    underline: boolean
  }
  densitySettings: {
    density: number
    heatTime: number
    heatInterval: number
  }
  customCommands: number[][]
}

// 保存配置
function saveConfig(config: PrinterConfig, filename: string) {
  const configJson = JSON.stringify(config, null, 2)
  // 保存到本地存储或文件
  localStorage.setItem(`printer_config_${filename}`, configJson)
}

// 加载配置
function loadConfig(filename: string): PrinterConfig | null {
  const configJson = localStorage.getItem(`printer_config_${filename}`)
  if (configJson) {
    return JSON.parse(configJson)
  }
  return null
}

// 应用配置
async function applyConfig(printer, config: PrinterConfig) {
  // 基本设置
  await printer.printer.setEncoding(config.encoding)
  await printer.printer.setCharacterSet(config.characterSet)

  // 字体设置
  await printer.printer.setFontType(config.fontSettings.fontType)
  await printer.printer.setFontSize(config.fontSettings.fontSize)
  await printer.printer.setBold(config.fontSettings.bold)
  await printer.printer.setUnderline(config.fontSettings.underline)

  // 密度设置
  await printer.printer.setPrintDensity(config.densitySettings.density)
  await printer.printer.setHeatTime(config.densitySettings.heatTime)
  await printer.printer.setHeatInterval(config.densitySettings.heatInterval)

  // 自定义命令
  for (const command of config.customCommands) {
    await printer.printer.sendCommands(command)
  }
}
```

### 预设配置

```typescript
// 预设配置库
const presetConfigs = {
  // 58mm 热敏收据打印机
  receipt58mm: {
    name: "58mm 热敏收据打印机",
    paperWidth: 58,
    encoding: "GBK",
    characterSet: "CHINA",
    fontSettings: {
      fontType: "A",
      fontSize: 1,
      bold: false,
      underline: false,
    },
    densitySettings: {
      density: 8,
      heatTime: 80,
      heatInterval: 2,
    },
  },

  // 80mm 标签打印机
  label80mm: {
    name: "80mm 标签打印机",
    paperWidth: 80,
    encoding: "UTF-8",
    characterSet: "PC437",
    fontSettings: {
      fontType: "B",
      fontSize: 2,
      bold: true,
      underline: false,
    },
    densitySettings: {
      density: 12,
      heatTime: 100,
      heatInterval: 2,
    },
  },

  // 便携式打印机
  portable: {
    name: "便携式打印机",
    paperWidth: 58,
    encoding: "GBK",
    characterSet: "CHINA",
    fontSettings: {
      fontType: "A",
      fontSize: 1,
      bold: false,
      underline: false,
    },
    densitySettings: {
      density: 6, // 较低密度节省电量
      heatTime: 60,
      heatInterval: 3,
    },
  },
}

// 使用预设配置
async function usePresetConfig(printer, presetName: string) {
  const config = presetConfigs[presetName]
  if (config) {
    await applyConfig(printer, config)
    console.log(`已应用预设配置: ${config.name}`)
  } else {
    console.error(`未找到预设配置: ${presetName}`)
  }
}
```

## 配置验证

### 配置测试

```typescript
// 配置验证工具
class ConfigValidator {
  async validateConfig(printer, config: PrinterConfig) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
    }

    // 测试基本连接
    try {
      const connected = printer.bluetooth.isConnected()
      if (!connected) {
        results.errors.push("打印机未连接")
        results.valid = false
      }
    } catch (error) {
      results.errors.push(`连接测试失败: ${error.message}`)
      results.valid = false
    }

    // 测试字符编码
    try {
      await printer.printer.printText("测试文本")
    } catch (error) {
      results.errors.push(`字符编码测试失败: ${error.message}`)
      results.valid = false
    }

    // 测试字体设置
    try {
      await printer.printer.setFontType(config.fontSettings.fontType)
      await printer.printer.setFontSize(config.fontSettings.fontSize)
    } catch (error) {
      results.warnings.push(`字体设置可能不受支持: ${error.message}`)
    }

    // 测试切纸功能
    if (config.autoCut) {
      try {
        await printer.printer.cut("partial")
      } catch (error) {
        results.warnings.push(`切纸功能可能不受支持: ${error.message}`)
      }
    }

    return results
  }

  async runFullTest(printer) {
    console.log("🔍 开始配置验证测试...")

    // 打印测试页
    await printer.printer.printTestPage()

    // 检查打印质量
    const quality = await this.assessPrintQuality()
    console.log(`打印质量评估: ${quality.score}/100`)

    if (quality.score < 70) {
      console.log("建议调整打印密度设置")
    }

    return quality
  }

  async assessPrintQuality() {
    // 简化的质量评估逻辑
    return {
      score: 85,
      recommendations: [],
    }
  }
}

// 使用验证工具
const validator = new ConfigValidator()
const validationResults = await validator.validateConfig(printer, config)

if (validationResults.valid) {
  console.log("✅ 配置验证通过")
} else {
  console.error("❌ 配置验证失败:")
  validationResults.errors.forEach((error) => console.error(`- ${error}`))
}
```

## 最佳实践

### 1. 配置管理

```typescript
// 配置版本管理
class ConfigManager {
  constructor() {
    this.currentVersion = "1.0.0"
    this.configHistory = []
  }

  saveConfigVersion(config: PrinterConfig, version: string) {
    const versionedConfig = {
      ...config,
      version,
      timestamp: Date.now(),
    }

    this.configHistory.push(versionedConfig)

    // 保存到持久化存储
    localStorage.setItem(
      "printer_config_history",
      JSON.stringify(this.configHistory)
    )
  }

  rollbackToVersion(version: string) {
    const config = this.configHistory.find((c) => c.version === version)
    if (config) {
      return config
    }
    throw new Error(`未找到版本 ${version} 的配置`)
  }
}
```

### 2. 环境适配

```typescript
// 根据环境自动调整配置
async function adaptToEnvironment(printer) {
  const platform = getPlatform() // 获取当前平台

  switch (platform) {
    case "wechat":
      // 小程序环境配置
      await printer.printer.setEncoding("GBK")
      await printer.printer.setPrintDensity(6) // 降低密度提高速度
      break

    case "h5":
      // H5 环境配置
      await printer.printer.setEncoding("UTF-8")
      await printer.printer.setPrintDensity(8)
      break

    case "rn":
      // React Native 环境配置
      await printer.printer.setEncoding("GBK")
      await printer.printer.setPrintDensity(10)
      break
  }
}
```

### 3. 性能优化

```typescript
// 配置优化建议
function getOptimizationSuggestions(config: PrinterConfig) {
  const suggestions = []

  if (config.densitySettings.density > 12) {
    suggestions.push("打印密度过高，可能影响打印速度和纸张寿命")
  }

  if (config.fontSettings.fontSize > 4) {
    suggestions.push("字体过大，可能影响打印布局")
  }

  if (config.paperWidth === 58 && config.fontSettings.fontSize > 2) {
    suggestions.push("58mm 纸张建议使用较小字体以避免内容截断")
  }

  return suggestions
}
```

## 下一步

学习了打印机配置后，您可以继续探索：

- [图片打印](/guide/image-printing) - 学习如何打印图片和二维码
- [错误处理](/guide/error-handling) - 处理各种错误情况
- [性能优化](/guide/performance) - 优化打印性能
- [API 文档](/api/printer-manager) - 查看打印机管理器 API
