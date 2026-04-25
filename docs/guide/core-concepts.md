# 核心概念

深入理解 `taro-bluetooth-print` 的核心设计理念与架构机制，帮助你更高效地使用和扩展本库。

::: tip 推荐阅读顺序
建议先阅读 [项目架构](./architecture.md) 了解整体分层设计，再深入本章节。
:::

---

## 适配器模式（Adapter Pattern）

### 设计动机

蓝牙 API 在不同平台之间存在巨大差异——微信小程序使用 `wx.writeBLECharacteristicValue`，支付宝使用 `my.writeBLECharacteristicValue`，H5 使用 Web Bluetooth API 的 `BluetoothRemoteGATTCharacteristic.writeValue()`，React Native 则依赖原生 BLE 模块。

`taro-bluetooth-print` 通过**适配器模式**将平台差异封装在 `IPrinterAdapter` 接口之后，使上层代码完全无需关心底层蓝牙操作。

### 架构示意

```
BluetoothPrinter
       │
       ▼
ConnectionManager
       │
       ▼
 IPrinterAdapter  ◄─── 统一接口
   ┌────┼────┬──────────┐
   │    │    │          │
Taro  Web  React    Alipay
Adapter BT   Native   Adapter
       Adapter Adapter
```

### 适配器接口

```typescript
interface IPrinterAdapter {
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void>;
  startDiscovery?(): Promise<void>;
  stopDiscovery?(): Promise<void>;
  onStateChange?(callback: (state: PrinterState) => void): void;
}
```

::: tip 扩展新平台
只需实现 `IPrinterAdapter` 接口，即可接入任意蓝牙平台。参考 [平台适配器](./adapters.md#自定义适配器) 章节。
:::

---

## 驱动架构（Driver Architecture）

### 设计动机

不同品牌和型号的打印机使用不同的指令集协议。例如，热敏票据机使用 ESC/POS，标签机使用 TSPL 或 ZPL，移动打印机使用 CPCL。

驱动层将**打印语义**（文本、二维码、切纸等）翻译为**具体指令集的二进制数据**。

### 支持的驱动

| 驱动 | 协议 | 适用场景 | 典型品牌 |
|------|------|---------|---------|
| `EscPos` | ESC/POS | 热敏票据打印机 | 佳博、芯烨、商米、汉印 |
| `TsplDriver` | TSPL | 条码标签打印机 | TSC、博思得 |
| `ZplDriver` | ZPL | 工业标签打印机 | Zebra |
| `CpclDriver` | CPCL | 移动标签打印机 | HP、霍尼韦尔 |
| `StarPrinter` | Star Line Mode | STAR 系列打印机 | STAR TSP |
| `GPrinterDriver` | 佳博协议 | 佳博 GP 系列 | 佳博 |
| `XprinterDriver` | 芯烨协议 | 芯烨系列 | 芯烨 |
| `SprtDriver` | 斯普瑞特协议 | SPRT 系列 | 斯普瑞特 |

### 驱动接口

```typescript
interface IPrinterDriver {
  text(content: string, encoding?: string): Uint8Array;
  feed(lines: number): Uint8Array;
  cut(): Uint8Array;
  qr(content: string, options?: IQrOptions): Uint8Array;
  barcode(content: string, format: BarcodeFormat, options?: IBarcodeOptions): Uint8Array;
  image(data: Uint8Array, width: number, height: number): Uint8Array;
  init(): Uint8Array;
}
```

### 指令流转过程

```
printer.text('Hello')
    │
    ▼
CommandBuilder.text() ──► Driver.text() ──► Uint8Array 指令
    │                                              │
    │                                        缓存到 commands[]
    │                                              │
printer.print()                                  ▼
    │                                    合并为完整 buffer
    ▼
PrintJobManager.start(buffer)
    │
    ▼
分片写入 ──► ConnectionManager.write() ──► Adapter.write() ──► 蓝牙发送
```

---

## 链式 API 设计哲学

### 为什么使用链式 API？

打印任务本质上是一个**指令序列**——先设置对齐方式、再输出文本、最后切纸。链式 API（Fluent API）精确映射了这一顺序逻辑：

```typescript
await printer
  .align('center')
  .setBold(true)
  .text('欢迎光临', 'GBK')
  .setBold(false)
  .feed()
  .align('left')
  .text('商品A    ¥10.00', 'GBK')
  .feed(2)
  .qr('https://example.com')
  .cut()
  .print();
```

### 核心原则

| 原则 | 说明 |
|------|------|
| **每一步返回 `this`** | 所有链式方法（`text`、`feed`、`cut`、`qr` 等）均返回当前实例，支持无限级联 |
| **延迟执行** | 链式调用只是构建指令缓冲区，**不会立即发送数据**，直到调用 `print()` 才统一执行 |
| **不可变性** | 每次链式调用追加指令到内部缓冲区，不修改已构建的指令 |
| **可重置** | 调用 `resetStyle()` 可重置格式状态，调用 `cancel()` 可清空整个缓冲区 |

### 完整方法链

```
格式控制方法                    内容输出方法                  执行方法
┌─────────────┐           ┌──────────────┐           ┌──────────┐
│ align()     │           │ text()       │           │ print()  │
│ setBold()   │──────────►│ feed()       │──────────►│ pause()  │
│ setUnderline│           │ cut()        │           │ resume() │
│ setSize()   │           │ qr()         │           │ cancel() │
│ resetStyle()│           │ barcode()    │           │          │
│ setOptions()│           │ image()      │           │          │
└─────────────┘           └──────────────┘           └──────────┘
```

---

## 服务层（Service Layer）

`BluetoothPrinter` 内部协调三大核心服务，各司其职：

### ConnectionManager（连接管理器）

管理蓝牙连接生命周期，封装 BLE 连接、服务发现、特征值查找和写入操作。

```typescript
interface IConnectionManager {
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  write(buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void>;
  isConnected(): boolean;
  getState(): PrinterState;
  getDeviceId(): string | null;
  destroy(): void;
}
```

### PrintJobManager（打印任务管理器）

负责打印任务的执行、暂停、恢复和取消，以及分片传输和进度追踪。

```typescript
interface IPrintJobManager {
  start(buffer: Uint8Array): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  cancel(): void;
  isInProgress(): boolean;
  isPaused(): boolean;
  remaining(): number;
  setOptions(options: IAdapterOptions): void;
  setProgressCallback(cb: (sent: number, total: number) => void): void;
}
```

### CommandBuilder（指令构建器）

将链式 API 调用转换为底层驱动指令，维护指令缓冲区。

```typescript
interface ICommandBuilder {
  text(content: string, encoding?: string): void;
  feed(lines?: number): void;
  cut(): void;
  qr(content: string, options?: IQrOptions): void;
  barcode(content: string, options?: IBarcodeOptions): void;
  image(data: Uint8Array, width: number, height: number): void;
  align(alignment: TextAlign): void;
  setBold(enabled: boolean): void;
  setUnderline(enabled: boolean): void;
  setSize(width: number, height: number): void;
  resetStyle(): void;
  getBuffer(): Uint8Array;
  clear(): void;
}
```

### 服务协作流程

```
                    BluetoothPrinter
                          │
            ┌─────────────┼──────────────┐
            │             │              │
     CommandBuilder  ConnectionManager  PrintJobManager
            │             │              │
     1. 构建指令     2. 管理连接      3. 执行传输
            │             │              │
            └──── buffer ─┘── 写入蓝牙 ──┘
```

---

## 插件系统（Plugin System）

v2.3+ 引入的插件系统允许在打印流程的关键节点注入自定义逻辑，无需修改核心代码。

### 插件接口

```typescript
interface Plugin {
  name: string;
  version: string;
  hooks?: Partial<PluginHooks>;
  onInit?: () => void;
  onDestroy?: () => void;
}

interface PluginHooks {
  beforePrint: (buffer: ArrayBuffer, context: PrintContext) => ArrayBuffer;
  afterPrint: (result: PrintResult, context: PrintContext) => void;
  onError: (error: BluetoothPrintError, context: PrintContext) => void;
}
```

### 插件生命周期

```
插件注册 onInit()
       │
beforePrint ──► 执行打印 ──► afterPrint
                    │
               onError（出错时）
                    │
               onDestroy（卸载时）
```

### 内置插件

**日志插件** — 记录所有打印事件：

```typescript
import { createLoggingPlugin } from 'taro-bluetooth-print';

plugins.register(createLoggingPlugin({
  logProgress: true,   // 记录打印进度
  logErrors: true,     // 记录错误信息
  logLevel: 'debug',   // 日志级别：debug | info | warn | error
}));
```

**重试插件** — 自动重试失败的打印任务：

```typescript
import { createRetryPlugin } from 'taro-bluetooth-print';

plugins.register(createRetryPlugin({
  maxRetries: 5,              // 最大重试次数
  initialDelay: 1000,         // 初始延迟 ms
  backoff: 'exponential',     // 退避策略：linear | exponential
  maxDelay: 60000,            // 最大延迟 ms
}));
```

### 自定义插件

```typescript
const analyticsPlugin: Plugin = {
  name: 'analytics-plugin',
  version: '1.0.0',
  hooks: {
    beforePrint: (buffer, context) => {
      console.log('即将打印', buffer.byteLength, '字节');
      return buffer; // 可修改 buffer 后返回
    },
    afterPrint: (result, context) => {
      analytics.track('print_complete', result);
    },
    onError: (error, context) => {
      reportError(error);
    },
  },
};

plugins.register(analyticsPlugin);
```

::: warning 注意
`beforePrint` 钩子返回的 `buffer` 会作为实际打印数据。如果不需要修改，务必原样返回。
:::

---

## 依赖注入容器（DI Container）

### 设计动机

`BluetoothPrinter` 采用**构造函数注入**模式，支持两种实例化方式：

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| 工厂函数 | 日常使用 | `createBluetoothPrinter()` 自动组装所有依赖 |
| 直接实例化 | 高级定制 | 手动传入自定义的 ConnectionManager、PrintJobManager 等 |

### 工厂函数（推荐）

```typescript
import { createBluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({
  adapter: new TaroAdapter(),
});
```

### 直接实例化（高级）

```typescript
import {
  BluetoothPrinter,
  ConnectionManager,
  PrintJobManager,
  CommandBuilder,
} from 'taro-bluetooth-print';

// 完全控制所有依赖
const connectionManager = new ConnectionManager(myAdapter);
const printJobManager = new PrintJobManager(connectionManager);
const commandBuilder = new CommandBuilder();

const printer = new BluetoothPrinter(
  connectionManager,
  printJobManager,
  commandBuilder,
);
```

### Legacy API（向后兼容）

```typescript
// 传入 adapter，内部自动包装为 ConnectionManager
const printer = new BluetoothPrinter(myAdapter);
```

::: tip 提示
工厂函数 `createBluetoothPrinter` 是推荐的创建方式，它会处理所有依赖的自动装配。只有在需要替换某个内部服务实现时，才需要直接实例化。
:::

---

## EventBus 事件系统

`BluetoothPrinter` 继承自 `EventEmitter<PrinterEvents>`，提供类型安全的事件订阅机制。

### 支持的事件

| 事件名 | 参数类型 | 触发时机 |
|--------|---------|---------|
| `state-change` | `PrinterState` | 打印机状态变化时 |
| `progress` | `{ sent: number; total: number }` | 打印进度更新时 |
| `error` | `BluetoothPrintError` | 发生错误时 |
| `connected` | `string`（deviceId） | 成功连接设备时 |
| `disconnected` | `string`（deviceId） | 设备断开连接时 |
| `print-complete` | `void` | 打印任务完成时 |

### 事件订阅

```typescript
// 持续监听
printer.on('progress', ({ sent, total }) => {
  const pct = ((sent / total) * 100).toFixed(1);
  console.log(`打印进度: ${pct}%`);
});

// 监听一次
printer.once('print-complete', () => {
  console.log('首次打印完成');
});

// 移除监听
const handler = (state: PrinterState) => console.log('状态:', state);
printer.on('state-change', handler);
printer.off('state-change', handler);
```

### PrinterState 状态机

```
              connect()
DISCONNECTED ─────────► CONNECTED
     ▲                      │
     │                      │ print()
     │                      ▼
     │                  PRINTING ◄─── resume()
     │                      │
     │               pause()│
     │                      ▼
     │                   PAUSED
     │                      │
     │                disconnect()
     └──────────────────────┘
```

| 状态 | 值 | 说明 |
|------|---|------|
| `DISCONNECTED` | `'disconnected'` | 未连接 |
| `CONNECTED` | `'connected'` | 已连接，空闲 |
| `PRINTING` | `'printing'` | 正在打印 |
| `PAUSED` | `'paused'` | 打印已暂停 |

---

## 打印队列机制

`PrintQueue` 提供任务排队、优先级调度和自动重试能力。

### 工作流程

```
添加任务 → 按优先级排序 → 取出最高优先级 → 执行打印
    │                                              │
    │                    ← 失败 → 重新入队（延迟重试）←┘
    │
    → 成功 → 发出 job-completed 事件
```

### 优先级队列

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({
  maxSize: 100,
  retryDelay: 1000,
  maxRetries: 3,
});

queue.add(data1, { priority: 'HIGH' });    // 高优先级优先执行
queue.add(data2, { priority: 'NORMAL' });  // 普通优先级
queue.add(data3, { priority: 'LOW' });     // 低优先级
```

### 任务状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `in-progress` | 正在执行 |
| `completed` | 已完成 |
| `failed` | 失败（等待重试） |
| `cancelled` | 已取消 |

---

## 离线缓存策略

`OfflineCache` 在蓝牙断开或写入失败时自动缓存打印任务，恢复连接后自动同步。

### 缓存流程

```
连接正常 → 直接打印
    │
    ↓ 连接断开或写入失败
写入缓存 (localStorage / AsyncStorage)
    │
    ↓ 恢复连接
自动触发 sync() → 逐一取出任务 → 重新执行
```

### 使用方式

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache({
  storage: 'localStorage',          // 小程序用 'storage'，RN 用 'AsyncStorage'
  maxSize: 50,                      // 最大缓存条数
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天过期
  autoSync: true,                   // 自动同步（默认 true）
  syncInterval: 5000,               // 每 5 秒检查一次
});

cache.on('sync-start', () => console.log('开始同步'));
cache.on('sync-complete', ({ successCount, failedCount }) => {
  console.log(`同步完成: 成功 ${successCount}, 失败 ${failedCount}`);
});
```

---

## 配置层级

`taro-bluetooth-print` 的配置遵循优先级覆盖原则：

```
默认配置 (DEFAULT_CONFIG)
       │
       ├── PrinterConfigManager（持久化保存的配置）
       │        │
       │        └── 优先级：全局配置 > 打印机配置 > 默认值
       │
       └── 运行时 setOptions()（仅影响当前实例，最高优先级）
```

```typescript
// 运行时配置
printer.setOptions({
  chunkSize: 20,   // 分片大小（字节）
  delay: 20,       // 分片间隔（ms）
  retries: 3,      // 重试次数
});
```

---

## 更多资源

- [平台适配器详解](./adapters.md) — 各平台适配器的使用与配置
- [驱动详解](./drivers.md) — 各打印机驱动的指令映射
- [API 参考](/api/) — 完整的 API 文档
- [常见问题](./faq.md) — 故障排查与解决方案
