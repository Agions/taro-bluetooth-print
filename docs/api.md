# API 参考

## BluetoothPrinter (主类)

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter(adapter?, driver?);
```

### 构造函数

```typescript
new BluetoothPrinter(adapter?: IPrinterAdapter, driver?: IPrinterDriver)
```

### 方法

#### 连接管理

| 方法 | 返回 | 说明 |
|------|------|------|
| `connect(deviceId)` | `Promise<void>` | 连接蓝牙设备 |
| `disconnect()` | `Promise<void>` | 断开连接 |
| `getState()` | `PrinterState` | 获取连接状态 |

#### 打印指令

| 方法 | 返回 | 说明 |
|------|------|------|
| `text(content, encoding?)` | `this` | 添加文本 |
| `feed(lines?)` | `this` | 进纸 |
| `qr(content, options?)` | `this` | 二维码 |
| `barcode(content, format, options?)` | `this` | 条码 |
| `image(data, width, height)` | `this` | 图片 |
| `cut()` | `this` | 切纸 |
| `align(alignment)` | `this` | 对齐方式 |
| `setSize(width, height)` | `this` | 字体大小 |
| `setBold(enabled)` | `this` | 加粗 |
| `setUnderline(enabled)` | `this` | 下划线 |
| `resetStyle()` | `this` | 重置样式 |
| `print()` | `Promise<void>` | 执行打印 |

#### 打印控制

| 方法 | 返回 | 说明 |
|------|------|------|
| `pause()` | `void` | 暂停打印 |
| `resume()` | `Promise<void>` | 恢复打印 |
| `cancel()` | `void` | 取消打印 |
| `remaining()` | `number` | 剩余字节数 |

#### 配置

| 方法 | 返回 | 说明 |
|------|------|------|
| `setOptions(options)` | `this` | 设置适配器参数 |
| `getOptions()` | `IAdapterOptions` | 获取当前配置 |

#### 事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `progress` | `{ sent, total }` | 打印进度 |
| `error` | `BluetoothPrintError` | 错误事件 |
| `print-complete` | `void` | 打印完成 |
| `state-change` | `PrinterState` | 状态变化 |
| `connected` | `string` (deviceId) | 已连接 |
| `disconnected` | `string` (deviceId) | 已断开 |

---

## EscPos (驱动)

```typescript
import { EscPos } from 'taro-bluetooth-print';

const driver = new EscPos(options?);
```

### 构造函数选项

```typescript
interface EscPosOptions {
  useEncodingService?: boolean;     // 使用编码服务 (默认 true)
  showEncodingWarnings?: boolean;    // 显示编码警告 (默认 true)
  fallbackChar?: string;             // 替代字符 (默认 '?')
}
```

### 方法

| 方法 | 说明 |
|------|------|
| `init()` | 初始化打印机 |
| `text(content, encoding?)` | 文本指令 |
| `feed(lines?)` | 进纸指令 |
| `cut()` | 切纸指令 |
| `image(data, width, height)` | 图片指令 |
| `qr(content, options?)` | 二维码指令 |

---

## TsplDriver (驱动)

```typescript
const driver = new TsplDriver();
```

### 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `size(width, height)` | mm | 设置标签尺寸 |
| `gap(gap, offset?)` | mm | 设置间隙 |
| `speed(speed)` | 1-10 | 打印速度 |
| `density(density)` | 0-15 | 打印浓度 |
| `direction(dir)` | 0/1 | 打印方向 |
| `clear()` | - | 清除缓冲区 |
| `text(content, options)` | - | 添加文本 |
| `barcode(content, options)` | - | 添加条码 |
| `qrcode(content, options)` | - | 添加二维码 |
| `box(options)` | - | 绘制矩形 |
| `line(options)` | - | 绘制线条 |
| `print(copies?, sets?)` | - | 执行打印 |
| `cut()` | - | 切纸 |
| `getBuffer()` | - | 获取指令 |

### 类型

```typescript
interface TextOptions {
  x: number;
  y: number;
  font?: number;        // 1-8
  rotation?: 0|90|180|270;
  xMultiplier?: number; // 1-10
  yMultiplier?: number; // 1-10
}

interface BarcodeOptions {
  x: number;
  y: number;
  type: '128'|'39'|'EAN13'|'EAN8'|'UPCA'|'QRCODE';
  height?: number;
  narrow?: number;
  wide?: number;
  showText?: boolean;
  rotation?: 0|90|180|270;
}
```

---

## ZplDriver (驱动)

```typescript
const driver = new ZplDriver();
```

### 方法

| 方法 | 说明 |
|------|------|
| `startFormat()` / `endFormat()` | 格式开始/结束 |
| `labelHome(x, y)` | 标签位置 |
| `text(content, options)` | 文本 |
| `font(content, x, y, h, w)` | 内置字体 |
| `barcode(content, options)` | 条码 |
| `qrcode(content, options)` | 二维码 |
| `box(options)` | 矩形 |
| `line(x1, y1, x2, y2, w)` | 线条 |
| `circle(x, y, d, t)` | 圆形 |
| `setDarkness(n)` | 浓度 |
| `setSpeed(n)` | 速度 |
| `print(qty)` | 打印 |
| `getBuffer()` | 获取指令 |

---

## CpclDriver (驱动)

```typescript
const driver = new CpclDriver(width?, height?);
```

### 方法

| 方法 | 说明 |
|------|------|
| `pageStart()` / `pageEnd()` | 页面 |
| `usePageSize(size)` | 标准尺寸 |
| `setPageSize(w, h)` | 自定义尺寸 |
| `setFont(f, xm, ym, r)` | 字体 |
| `text(content)` | 文本 |
| `textAt(content, options)` | 带位置文本 |
| `barcode(content, options)` | 条码 |
| `qrcode(content, options)` | 二维码 |
| `line(options)` | 线条 |
| `box(options)` | 矩形 |
| `cut()` / `partialCut()` | 切纸 |
| `beep(n, d)` | 蜂鸣 |
| `getBuffer()` | 获取指令 |

---

## DeviceManager (设备管理)

```typescript
import { DeviceManager } from 'taro-bluetooth-print';

const manager = new DeviceManager();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `startScan(options?)` | `Promise<void>` | 开始扫描 |
| `stopScan()` | `void` | 停止扫描 |
| `getDiscoveredDevices()` | `BluetoothDevice[]` | 获取设备列表 |
| `getDevice(deviceId)` | `BluetoothDevice?` | 获取指定设备 |

### 事件

| 事件 | 数据 |
|------|------|
| `device-found` | `BluetoothDevice` |
| `device-updated` | `BluetoothDevice` |
| `device-lost` | `BluetoothDevice` |
| `scan-started` | `void` |
| `scan-stopped` | `void` |

---

## PrintQueue (打印队列)

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue(config?);
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `add(data, options?)` | `string` | 添加任务 |
| `pause()` | `void` | 暂停队列 |
| `resume()` | `void` | 恢复队列 |
| `clear()` | `void` | 清空队列 |
| `getJobs()` | `PrintJob[]` | 获取任务列表 |
| `getPendingCount()` | `number` | 等待数量 |

---

## 类型定义

### PrinterState

```typescript
enum PrinterState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  PRINTING = 'printing',
  PAUSED = 'paused'
}
```

### IAdapterOptions

```typescript
interface IAdapterOptions {
  chunkSize?: number;  // 默认 20
  delay?: number;      // 默认 20ms
  retries?: number;    // 默认 3
}
```

### IQrOptions

```typescript
interface IQrOptions {
  model?: 1 | 2;                      // 默认 2
  size?: number;                       // 1-16, 默认 6
  errorCorrection?: 'L'|'M'|'Q'|'H';  // 默认 'M'
}
```

---

## MultiPrinterManager (多打印机管理)

```typescript
import { MultiPrinterManager } from 'taro-bluetooth-print';

const manager = new MultiPrinterManager();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `connect(printerId, deviceId, name?)` | `Promise<string>` | 连接打印机 |
| `disconnect(printerId)` | `Promise<void>` | 断开打印机 |
| `disconnectAll()` | `Promise<void>` | 断开所有 |
| `getPrinter(printerId)` | `BluetoothPrinter?` | 获取打印机实例 |
| `getAllPrinters()` | `PrinterConnection[]` | 获取所有连接 |
| `isConnected(printerId)` | `boolean` | 是否已连接 |
| `broadcast(data, options?)` | `Promise<{ success, failed }>` | 广播到所有 |
| `getIdlePrinters()` | `PrinterConnection[]` | 获取空闲打印机 |
| `cleanupInactive(maxIdleMs?)` | `Promise<number>` | 清理空闲打印机 |
| `destroy()` | `Promise<void>` | 销毁管理器 |

### 事件

| 事件 | 数据 |
|------|------|
| `printer-connected` | `PrinterConnection` |
| `printer-disconnected` | `{ printerId, deviceId }` |
| `printer-error` | `{ printerId, error }` |
| `broadcast-complete` | `{ success, failed }` |

---

## PrinterConfigManager (配置管理)

```typescript
import { PrinterConfigManager } from 'taro-bluetooth-print';

const configManager = new PrinterConfigManager(storage?);
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `savePrinter(printer)` | `string` | 保存打印机配置 |
| `getPrinter(id)` | `SavedPrinter?` | 获取打印机配置 |
| `getSavedPrinters()` | `SavedPrinter[]` | 获取所有已保存 |
| `getDefaultPrinter()` | `SavedPrinter?` | 获取默认打印机 |
| `removePrinter(id)` | `boolean` | 删除打印机配置 |
| `setDefaultPrinter(id)` | `void` | 设置默认打印机 |
| `setLastUsed(id)` | `void` | 设置最后使用 |
| `loadPrinterConfig(id)` | `PrintConfig` | 加载打印配置 |
| `getGlobalConfig()` | `GlobalConfig` | 获取全局配置 |
| `updateGlobalConfig(updates)` | `void` | 更新全局配置 |
| `export()` | `string` | 导出配置 JSON |
| `import(json, merge?)` | `number` | 导入配置 JSON |
| `clear()` | `void` | 清除所有配置 |

---

## BatchPrintManager (批量打印)

```typescript
import { BatchPrintManager } from 'taro-bluetooth-print';

const batch = new BatchPrintManager(config?);
```

### 配置

```typescript
interface BatchConfig {
  maxBatchSize: number;        // 最大批次大小 (默认 50KB)
  maxWaitTime: number;         // 最大等待时间 ms (默认 1000)
  minBatchSize: number;         // 最小批次数量 (默认 1)
  enableMerging: boolean;       // 启用合并 (默认 true)
  autoProcessInterval: number;  // 自动处理间隔 ms (默认 500)
}
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `addJob(data, priority?, metadata?)` | `string` | 添加任务 |
| `addJobs(jobs[])` | `string[]` | 批量添加 |
| `cancelJob(id)` | `boolean` | 取消任务 |
| `cancelAll()` | `void` | 取消所有 |
| `processBatch(processor)` | `Promise<number>` | 处理批次 |
| `getPendingJobs()` | `BatchJob[]` | 获取待处理 |
| `getStats()` | `BatchStats` | 获取统计 |
| `resetStats()` | `void` | 重置统计 |
| `destroy()` | `void` | 销毁管理器 |

### 事件

| 事件 | 数据 |
|------|------|
| `batch-ready` | `BatchJob[]` |
| `batch-processed` | `{ jobCount, bytes }` |
| `job-added` | `BatchJob` |
| `job-rejected` | `{ reason }` |

---

## PrintHistory (打印历史)

```typescript
import { PrintHistory } from 'taro-bluetooth-print';

const history = new PrintHistory(maxEntries?);
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `addJob(params)` | `string` | 添加记录 |
| `updateJob(id, updates)` | `void` | 更新记录 |
| `getEntry(id)` | `PrintHistoryEntry?` | 获取记录 |
| `getRecent(count?)` | `PrintHistoryEntry[]` | 获取最近 |
| `query(options?)` | `PrintHistoryEntry[]` | 查询记录 |
| `getStats(options?)` | `PrintHistoryStats` | 获取统计 |
| `export()` | `string` | 导出 JSON |
| `import(json)` | `number` | 导入 JSON |
| `clear()` | `void` | 清除历史 |

---

## PrinterStatus (状态查询)

```typescript
import { PrinterStatus } from 'taro-bluetooth-print';

const status = new PrinterStatus();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `getStatus(writeFn, readFn, options?)` | `Promise<PrinterStatusInfo>` | 查询状态 |
| `checkPaper(writeFn, readFn)` | `Promise<PaperStatus>` | 检查纸张 |
| `isReady(writeFn, readFn)` | `Promise<boolean>` | 检查就绪 |
| `static toString(status)` | `string` | 格式化状态 |

### 类型

```typescript
enum PaperStatus {
  OK = 'ok',
  LOW = 'low',
  OUT = 'out',
  UNKNOWN = 'unknown'
}

interface PrinterStatusInfo {
  paper: PaperStatus;
  coverOpen?: boolean;
  cutterError?: boolean;
  motorError?: boolean;
  overTemp?: boolean;
  batteryLevel?: number;
  timestamp: number;
  rawStatus?: Uint8Array;
}
```

---

## BarcodeGenerator (条码生成器)

```typescript
import { BarcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';

const generator = new BarcodeGenerator();
```

### 支持格式

- `CODE128` - 可变长度，字母数字
- `CODE39` - 可变长度，字母数字+特殊字符
- `EAN13` - 13位数字
- `EAN8` - 8位数字
- `UPCA` - 12位数字
- `ITF` - 交插25码
- `CODABAR` - 数字+起止字符

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `generate(content, options)` | `Uint8Array[]` | 生成条码指令 |
| `validate(content, format)` | `ValidationResult` | 校验条码内容 |
| `getSupportedFormats()` | `BarcodeFormat[]` | 获取支持格式 |

### 校验

```typescript
interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}
```
