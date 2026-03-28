# API 参考

完整 API 文档，涵盖所有核心类、驱动、适配器、服务和工具函数。

---

## BluetoothPrinter {#bluetoothprinter}

主入口类，提供蓝牙连接和打印的完整 API。

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter(adapter?, driver?);
```

### 构造函数

```typescript
new BluetoothPrinter(adapter?: IPrinterAdapter, driver?: IPrinterDriver)
```

### 连接管理

| 方法 | 返回 | 说明 |
|------|------|------|
| `connect(deviceId)` | `Promise<this>` | 连接蓝牙设备 |
| `disconnect()` | `Promise<void>` | 断开连接 |
| `getState()` | `PrinterState` | 获取当前状态 |

```typescript
await printer.connect('device-id-xxx');
console.log(printer.state); // PrinterState.CONNECTED
```

### 打印指令（链式调用）

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `text(content, encoding?)` | 文本, 编码 | `this` | 添加文本（默认 GBK） |
| `feed(lines?)` | 行数 | `this` | 进纸 n 行 |
| `feedLines(dots)` | 点数 | `this` | 按点数进纸 |
| `qr(content, options?)` | 内容, 选项 | `this` | 添加二维码 |
| `barcode(content, format, options?)` | 内容, 格式, 选项 | `this` | 添加条码 |
| `image(data, width, height)` | RGBA数据, 宽, 高 | `this` | 添加图片 |
| `cut()` | — | `this` | 全切 |
| `partialCut()` | — | `this` | 半切 |
| `align(direction)` | `'left'\|'center'\|'right'` | `this` | 设置对齐 |
| `setSize(width, height)` | 宽高倍数 | `this` | 字体大小 (1-8) |
| `setBold(enabled)` | boolean | `this` | 加粗 |
| `setUnderline(enabled)` | boolean | `this` | 下划线 |
| `resetStyle()` | — | `this` | 重置所有样式 |
| `openCashDrawer()` | — | `this` | 开钱箱（驱动支持时） |
| `print(buffer?)` | 数据? | `Promise<void>` | 执行打印 |

### 打印控制

| 方法 | 返回 | 说明 |
|------|------|------|
| `pause()` | `void` | 暂停打印 |
| `resume()` | `Promise<void>` | 恢复打印 |
| `cancel()` | `void` | 取消打印 |
| `remaining()` | `number` | 获取剩余字节数 |

### 配置

| 方法 | 返回 | 说明 |
|------|------|------|
| `setOptions(options)` | `this` | 设置适配器参数 |
| `getOptions()` | `IAdapterOptions` | 获取当前配置 |
| `getCommands()` | `Uint8Array[]` | 获取当前指令缓冲区 |
| `getDriver()` | `IPrinterDriver` | 获取当前驱动实例 |

### 事件

| 事件 | 数据类型 | 说明 |
|------|---------|------|
| `progress` | `{ sent: number; total: number }` | 打印进度 |
| `error` | `BluetoothPrintError` | 错误事件 |
| `print-complete` | `void` | 打印完成 |
| `state-change` | `PrinterState` | 状态变化 |
| `connected` | `string` (deviceId) | 已连接 |
| `disconnected` | `string` (deviceId) | 已断开 |

---

## DeviceManager {#devicemanager}

独立的设备扫描和管理工具。

```typescript
import { DeviceManager } from 'taro-bluetooth-print';

const manager = new DeviceManager();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `startScan(options?)` | `Promise<void>` | 开始扫描（默认 10s 超时） |
| `stopScan()` | `void` | 停止扫描 |
| `getDiscoveredDevices()` | `BluetoothDevice[]` | 获取已发现设备列表 |
| `getDevice(deviceId)` | `BluetoothDevice \| undefined` | 获取指定设备 |
| `getConnectedDevice()` | `BluetoothDevice \| undefined` | 获取已连接设备 |

### 选项

```typescript
interface ScanOptions {
  timeout?: number;          // 扫描超时 ms (默认 10000)
  services?: string[];      // 按服务 UUID 过滤
  allowDuplicates?: boolean; // 允许重复上报
}
```

### 事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `device-found` | `BluetoothDevice` | 发现新设备 |
| `device-updated` | `BluetoothDevice` | 设备信息更新 |
| `device-lost` | `BluetoothDevice` | 设备丢失 |
| `scan-started` | `void` | 扫描开始 |
| `scan-stopped` | `void` | 扫描结束 |

---

## MultiPrinterManager {#multiprintermanager}

多打印机同时管理。

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
| `getPrinter(printerId)` | `BluetoothPrinter \| undefined` | 获取打印机实例 |
| `getAllPrinters()` | `PrinterConnection[]` | 获取所有已连接打印机 |
| `isConnected(printerId)` | `boolean` | 检查连接状态 |
| `broadcast(data, options?)` | `Promise<{ success, failed }>` | 广播打印 |
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

## PrintQueue {#printqueue}

打印任务队列，支持优先级调度。

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue(config?);
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `add(data, options?)` | `string` | 添加任务，返回 jobId |
| `addJobs(jobs[])` | `string[]` | 批量添加 |
| `pause()` | `void` | 暂停队列 |
| `resume()` | `void` | 恢复队列 |
| `cancel()` | `void` | 取消队列 |
| `clear()` | `void` | 清空队列 |
| `getJobs()` | `PrintJob[]` | 获取所有任务 |
| `getPendingCount()` | `number` | 待处理任务数 |
| `getStats()` | `QueueStats` | 获取队列统计 |

### 选项

```typescript
interface QueueConfig {
  maxSize?: number;        // 最大队列长度 (默认 100)
  retryDelay?: number;     // 重试延迟 ms (默认 1000)
  maxRetries?: number;     // 最大重试次数 (默认 3)
}
```

### 事件

| 事件 | 数据 |
|------|------|
| `job-added` | `PrintJob` |
| `job-started` | `PrintJob` |
| `job-completed` | `PrintJob` |
| `job-failed` | `{ job, error }` |
| `job-cancelled` | `PrintJob` |
| `queue-empty` | `void` |

---

## OfflineCache {#offlinecache}

离线缓存，网络断开时自动缓存任务。

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache(config?);
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `save(job)` | `Promise<string>` | 保存任务到缓存 |
| `get(id)` | `CachedJob \| undefined` | 获取缓存任务 |
| `remove(id)` | `boolean` | 删除缓存任务 |
| `sync()` | `Promise<SyncResult>` | 同步缓存任务 |
| `clear()` | `void` | 清空缓存 |
| `getStats()` | `CacheStats` | 获取缓存统计 |

### 配置

```typescript
interface CacheConfig {
  storage?: 'localStorage' | 'sessionStorage' | 'AsyncStorage';
  maxSize?: number;                 // 最大缓存数 (默认 50)
  maxAge?: number;                  // 过期时间 ms (默认 7 天)
  autoSync?: boolean;               // 自动同步 (默认 true)
  syncInterval?: number;            // 同步检查间隔 ms
}
```

---

## PrintStatistics {#printstatistics}

打印统计分析服务。

```typescript
import { PrintStatistics } from 'taro-bluetooth-print';

const stats = new PrintStatistics();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `trackJobStart(id, meta?)` | `void` | 记录任务开始 |
| `trackJobComplete(id, bytes, duration)` | `void` | 记录任务完成 |
| `trackJobFailed(id, error)` | `void` | 记录任务失败 |
| `trackJobCancelled(id)` | `void` | 记录任务取消 |
| `getStatistics()` | `PrintStatisticsData` | 获取统计报告 |
| `getByDate(date)` | `DailyStats` | 按日期获取统计 |
| `getByDriver(driver)` | `DriverStats` | 按驱动获取统计 |
| `exportToJSON()` | `string` | 导出 JSON |
| `reset()` | `void` | 重置统计数据 |

### 统计数据结构

```typescript
interface PrintStatisticsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalBytes: number;
  averagePrintTime: number;
  successRate: number;
  byDate: Record<string, { completed: number; failed: number }>;
  byDriver: Record<string, { completed: number; failed: number }>;
}
```

---

## ScheduledRetryManager {#scheduledretrymanager}

定时重试管理器，支持指数退避。

```typescript
import { ScheduledRetryManager } from 'taro-bluetooth-print';

const manager = new ScheduledRetryManager();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `scheduleRetry(jobId, runAt, options?)` | `string` | 调度重试 |
| `cancelRetry(jobId)` | `boolean` | 取消重试 |
| `cancelAll()` | `void` | 取消所有 |
| `getScheduledRetries()` | `ScheduledRetry[]` | 获取所有调度 |
| `getRetryInfo(jobId)` | `ScheduledRetry \| undefined` | 获取重试信息 |
| `isScheduled(jobId)` | `boolean` | 检查是否已调度 |
| `restore()` | `Promise<number>` | 从持久化恢复 |
| `destroy()` | `void` | 销毁并清理 |

### 选项

```typescript
interface RetryOptions {
  baseDelay?: number;    // 初始延迟 ms (默认 1000)
  maxDelay?: number;    // 最大延迟 ms (默认 60000)
  maxAttempts?: number;  // 最大次数 (默认 5)
}
```

### 事件

| 事件 | 数据 |
|------|------|
| `retry-due` | `{ entry: ScheduledRetry }` |
| `retry-executed` | `{ entry, success }` |
| `retry-cancelled` | `{ jobId }` |
| `retry-exhausted` | `{ jobId }` |

---

## BatchPrintManager {#batchprintmanager}

批量打印管理器。

```typescript
import { BatchPrintManager } from 'taro-bluetooth-print';

const batch = new BatchPrintManager(config?);
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `addJob(data, priority?, metadata?)` | `string` | 添加任务 |
| `addJobs(jobs[])` | `string[]` | 批量添加 |
| `cancelJob(id)` | `boolean` | 取消任务 |
| `cancelAll()` | `void` | 取消所有 |
| `processBatch(processor)` | `Promise<number>` | 处理当前批次 |
| `getPendingJobs()` | `BatchJob[]` | 待处理任务 |
| `getStats()` | `BatchStats` | 获取统计 |
| `resetStats()` | `void` | 重置统计 |
| `destroy()` | `void` | 销毁 |

### 配置

```typescript
interface BatchConfig {
  maxBatchSize?: number;        // 最大批次 (默认 50KB)
  maxWaitTime?: number;         // 最大等待 ms (默认 1000)
  minBatchSize?: number;         // 最小批次 (默认 1)
  enableMerging?: boolean;        // 启用合并 (默认 true)
  autoProcessInterval?: number;  // 自动处理间隔 ms (默认 500)
}
```

---

## PrintHistory {#printhistory}

打印历史记录。

```typescript
import { PrintHistory } from 'taro-bluetooth-print';

const history = new PrintHistory(maxEntries?); // 默认 1000
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `addJob(params)` | `string` | 添加记录 |
| `updateJob(id, updates)` | `void` | 更新记录 |
| `getEntry(id)` | `PrintHistoryEntry \| undefined` | 获取记录 |
| `getRecent(count?)` | `PrintHistoryEntry[]` | 获取最近记录 |
| `query(options?)` | `PrintHistoryEntry[]` | 查询记录 |
| `getStats(options?)` | `PrintHistoryStats` | 获取统计 |
| `export()` | `string` | 导出 JSON |
| `import(json)` | `number` | 导入 JSON，返回条数 |
| `clear()` | `void` | 清除历史 |

---

## PrinterStatus {#printerstatus}

查询打印机状态。

```typescript
import { PrinterStatus } from 'taro-bluetooth-print';

const status = new PrinterStatus();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `getStatus(writeFn, readFn, options?)` | `Promise<PrinterStatusInfo>` | 查询完整状态 |
| `checkPaper(writeFn, readFn)` | `Promise<PaperStatus>` | 检查纸张 |
| `isReady(writeFn, readFn)` | `Promise<boolean>` | 检查就绪 |
| `static toString(status)` | `string` | 格式化状态 |

### 类型

```typescript
enum PaperStatus {
  OK = 'ok',
  LOW = 'low',
  OUT = 'out',
  UNKNOWN = 'unknown',
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

## TemplateEngine {#templateengine}

模板引擎，支持收据和标签的渲染。

```typescript
import { TemplateEngine } from 'taro-bluetooth-print';

const engine = new TemplateEngine();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `renderReceipt(data)` | `Uint8Array[]` | 渲染收据模板 |
| `renderLabel(data)` | `Uint8Array[]` | 渲染标签模板 |
| `render(elements, data)` | `Uint8Array[]` | 渲染自定义模板 |
| `compile(template)` | `function` | 预编译模板函数 |

### 数据类型

```typescript
interface ReceiptData {
  store: { name: string; address?: string; phone?: string };
  order?: { id: string; date: string; cashier?: string };
  items: Array<{ name: string; quantity: number; price: number; discount?: number }>;
  payment: { subtotal: number; discount?: number; total: number; method: string; received?: number; change?: number };
  qrCode?: string;
  footer?: string;
}

interface LabelData {
  name: string;
  price: number;
  barcode?: string;
  barcodeFormat?: BarcodeFormat;
  spec?: string;
  productionDate?: string;
  expiryDate?: string;
}
```

---

## BarcodeGenerator {#barcodegenerator}

条码生成器。

```typescript
import { BarcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';

const generator = new BarcodeGenerator();
```

### 支持格式

| 格式 | 说明 |
|------|------|
| `CODE128` | 可变长度，字母数字 |
| `CODE39` | 字母数字+特殊字符 |
| `EAN13` | 13 位数字（商品条码） |
| `EAN8` | 8 位数字（短条码） |
| `UPCA` | 12 位数字 |
| `ITF` | 交插 25 码 |
| `CODABAR` | 数字+起止字符 |
| `QR_CODE` | 二维码 |
| `PDF417` | 二维条码 |

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `generate(content, options)` | `Uint8Array[]` | 生成条码指令 |
| `validate(content, format)` | `ValidationResult` | 校验内容 |
| `getSupportedFormats()` | `BarcodeFormat[]` | 支持的格式列表 |

---

## PrinterConfigManager {#printerconfigmanager}

配置管理，支持配置的持久化和切换。

```typescript
import { PrinterConfigManager } from 'taro-bluetooth-print';

const configManager = new PrinterConfigManager();
```

### 方法

| 方法 | 返回 | 说明 |
|------|------|------|
| `savePrinter(printer)` | `string` | 保存打印机配置 |
| `getPrinter(id)` | `SavedPrinter \| undefined` | 获取配置 |
| `getSavedPrinters()` | `SavedPrinter[]` | 获取所有已保存 |
| `getDefaultPrinter()` | `SavedPrinter \| undefined` | 获取默认打印机 |
| `removePrinter(id)` | `boolean` | 删除配置 |
| `setDefaultPrinter(id)` | `void` | 设为默认 |
| `setLastUsed(id)` | `void` | 设为最后使用 |
| `loadPrinterConfig(id)` | `PrintConfig` | 加载打印配置 |
| `getGlobalConfig()` | `GlobalConfig` | 获取全局配置 |
| `updateGlobalConfig(updates)` | `void` | 更新全局配置 |
| `export()` | `string` | 导出 JSON |
| `import(json, merge?)` | `number` | 导入，返回条数 |
| `clear()` | `void` | 清除所有配置 |

---

## uuid 工具 {#uuid-tools}

UUID 生成和解析工具。

```typescript
import { generateUUID, parseUUID, isValidUUID } from 'taro-bluetooth-print';
```

### 函数

| 函数 | 返回 | 说明 |
|------|------|------|
| `generateUUID(version?, options?)` | `string` | 生成 UUID（默认 v4） |
| `parseUUID(uuid)` | `ParsedUUID` | 解析 UUID |
| `isValidUUID(uuid)` | `UUIDValidationResult` | 校验 UUID |
| `getUUIDTimestamp(uuid)` | `number \| null` | 获取时间戳（v1/v7） |
| `compareUUIDs(a, b)` | `number` | 比较 UUID 顺序 |
| `uuidToBytes(uuid)` | `Uint8Array` | 转为字节数组 |
| `bytesToUUID(bytes)` | `string` | 字节数组转 UUID |
| `generateShortId(length?)` | `string` | 生成短 ID |

### 版本

```typescript
enum UUIDVersion {
  V1 = 1,  // 时间戳
  V4 = 4,  // 随机（默认）
  V7 = 7,  // Unix 时间戳（推荐）
}
```

---

## validation 工具 {#validation-tools}

数据验证工具。

```typescript
import {
  validatePrinterData,
  validatePrintJob,
  isValidBuffer,
  isValidUUID,
  validateRange,
  check,
} from 'taro-bluetooth-print';
```

### 函数

| 函数 | 返回 | 说明 |
|------|------|------|
| `validatePrinterData(data, schema)` | `ValidationResult` | 验证打印机数据 |
| `validatePrintJob(data, schema)` | `ValidationResult` | 验证打印任务 |
| `isValidBuffer(buffer, options?)` | `ValidationResult` | 验证 ArrayBuffer |
| `isValidUUID(value, options?)` | `Result` | 验证 UUID |
| `validateRange(value, field, options?)` | `ValidationResult` | 验证数值范围 |
| `validateObject(data, rules)` | `ValidationResult` | 按规则验证对象 |
| `validateArray(items, validator, options?)` | `ValidationResult` | 验证数组 |
| `check(value, field)` | `ChainableValidator` | 链式验证 |

### 示例

```typescript
// 链式验证
const result = check(20, 'timeout')
  .required()
  .number()
  .integer()
  .range(0, 30000)
  .result();

// 验证缓冲区
const bufResult = isValidBuffer(data, {
  minSize: 1,
  maxSize: 1024 * 1024,
});
```

---

## 驱动 API {#drivers-api}

### EscPos

```typescript
import { EscPos } from 'taro-bluetooth-print';

const driver = new EscPos(options?);
```

| 方法 | 说明 |
|------|------|
| `init()` | 初始化打印机 |
| `text(content, encoding?)` | 文本指令 |
| `feed(lines?)` | 进纸 |
| `cut()` / `partialCut()` | 切纸 |
| `image(data, width, height)` | 图片 |
| `qr(content, options?)` | 二维码 |
| `barcode(content, format, options?)` | 条码 |
| `align(direction)` | 对齐 |
| `setBold(enabled)` | 加粗 |
| `setUnderline(enabled)` | 下划线 |
| `setSize(width, height)` | 字体大小 |
| `getBuffer()` | 获取指令 |
| `reset()` | 重置缓冲区 |

### TsplDriver

```typescript
import { TsplDriver } from 'taro-bluetooth-print';

const driver = new TsplDriver();
```

| 方法 | 说明 |
|------|------|
| `size(width, height)` | 标签尺寸 |
| `gap(gap, offset?)` | 间隙 |
| `speed(speed)` | 打印速度 |
| `density(density)` | 打印浓度 |
| `direction(dir)` | 打印方向 |
| `clear()` | 清空缓冲区 |
| `text(content, options)` | 文本 |
| `barcode(content, options)` | 条码 |
| `qrcode(content, options)` | 二维码 |
| `box(options)` | 矩形边框 |
| `line(options)` | 线条 |
| `print(copies?, sets?)` | 打印 |
| `getBuffer()` | 获取指令 |

### ZplDriver

```typescript
import { ZplDriver } from 'taro-bluetooth-print';

const driver = new ZplDriver();
```

| 方法 | 说明 |
|------|------|
| `startFormat()` / `endFormat()` | 格式块 |
| `labelHome(x, y)` | 起始坐标 |
| `text(content, options)` | 文本 |
| `font(name, x, y, h, w)` | 内置字体 |
| `barcode(content, options)` | 条码 |
| `qrcode(content, options)` | 二维码 |
| `box(options)` | 矩形 |
| `line(x1, y1, x2, y2, w)` | 线条 |
| `circle(x, y, d, t)` | 圆圈 |
| `setDarkness(n)` | 浓度 |
| `setSpeed(n)` | 速度 |
| `quantity(n)` | 份数 |
| `print()` | 打印 |
| `getBuffer()` | 获取指令 |

### CpclDriver

```typescript
import { CpclDriver } from 'taro-bluetooth-print';

const driver = new CpclDriver(width?, height?);
```

| 方法 | 说明 |
|------|------|
| `pageStart()` / `pageEnd()` | 页面块 |
| `usePageSize(size)` | 标准尺寸 |
| `setPageSize(w, h)` | 自定义尺寸 |
| `text(content)` | 文本 |
| `textAt(content, options)` | 带坐标文本 |
| `barcode(content, options)` | 条码 |
| `qrcode(content, options)` | 二维码 |
| `line(options)` | 线条 |
| `box(options)` | 矩形 |
| `cut()` / `partialCut()` | 切纸 |
| `beep(count, duration)` | 蜂鸣 |
| `getBuffer()` | 获取指令 |

### StarPrinter

```typescript
import { StarPrinter } from 'taro-bluetooth-print';

const driver = new StarPrinter(options?);
```

| 方法 | 说明 |
|------|------|
| `init()` | 初始化 |
| `text(content, encoding?)` | 文本 |
| `align(direction)` | 对齐 |
| `setBold(enabled)` | 加粗 |
| `setUnderline(enabled)` | 下划线 |
| `qr(content, options?)` | 二维码 |
| `barcode(content, type, options?)` | 条码 |
| `image(data, width, height)` | 图片 |
| `feed(lines?)` | 进纸 |
| `cut()` | 切纸 |
| `getBuffer()` | 获取指令 |

---

## PrinterState 枚举 {#printerstate-enum}

```typescript
enum PrinterState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  PRINTING = 'printing',
  PAUSED = 'paused',
}
```

---

## ErrorCode 枚举 {#errorcode-enum}

```typescript
enum ErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  WRITE_FAILED = 'WRITE_FAILED',
  READ_FAILED = 'READ_FAILED',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  CHARACTERISTIC_NOT_FOUND = 'CHARACTERISTIC_NOT_FOUND',
  PRINT_JOB_IN_PROGRESS = 'PRINT_JOB_IN_PROGRESS',
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  INVALID_BUFFER = 'INVALID_BUFFER',
  TIMEOUT = 'TIMEOUT',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
}
```
``
``

`

``


`

`


