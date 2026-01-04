# API 参考

## 核心类

### BluetoothPrinter

用于与蓝牙打印机交互的核心类，提供了简洁易用的 API 用于连接设备、发送打印命令和管理打印任务。

#### 构造函数

```typescript
new BluetoothPrinter(adapter?: IPrinterAdapter, driver?: IPrinterDriver)
```

- **`adapter`**: 打印机适配器，负责处理蓝牙设备通信（默认：`TaroAdapter`）
- **`driver`**: 打印机驱动，负责生成设备特定的打印命令（默认：`EscPos`）

#### 方法

##### 连接管理

- `connect(deviceId: string): Promise<this>` - 连接到蓝牙设备
- `disconnect(): Promise<void>` - 断开连接

##### 打印内容

- `text(content: string, encoding?: string): this` - 添加文本
- `feed(lines?: number): this` - 走纸
- `cut(): this` - 切纸
- `image(data: Uint8Array, width: number, height: number): this` - 添加图片
- `qr(content: string, options?: IQrOptions): this` - 添加二维码
- `barcode(content: string, format: string, options?: object): this` - 添加条码 (v2.2+)

##### 文本格式化 (v2.2+)

- `align(alignment: 'left' | 'center' | 'right'): this` - 设置对齐方式
- `setSize(width: number, height: number): this` - 设置字体大小
- `setBold(enabled: boolean): this` - 设置粗体
- `setUnderline(enabled: boolean): this` - 设置下划线
- `resetStyle(): this` - 重置样式

##### 打印控制

- `print(): Promise<void>` - 执行打印
- `pause(): void` - 暂停打印
- `resume(): Promise<void>` - 恢复打印
- `cancel(): void` - 取消打印
- `remaining(): number` - 获取剩余字节数

---

## 新增模块 (v2.2+)

### DeviceManager

设备管理器，提供蓝牙设备扫描和管理功能。

```typescript
import { DeviceManager } from 'taro-bluetooth-print';

const deviceManager = new DeviceManager();

// 监听设备发现
deviceManager.on('device-found', device => {
  console.log('发现设备:', device.name);
});

// 开始扫描
await deviceManager.startScan({ timeout: 10000 });

// 获取已发现的设备
const devices = deviceManager.getDiscoveredDevices();

// 停止扫描
await deviceManager.stopScan();
```

#### 配置选项

```typescript
interface ScanOptions {
  timeout?: number; // 扫描超时时间 (默认: 15000ms)
  serviceUUIDs?: string[]; // 服务 UUID 过滤
  nameFilter?: string | RegExp; // 设备名称过滤
  allowDuplicates?: boolean; // 是否允许重复设备
}
```

---

### PrintQueue

打印队列，支持优先级排序和失败重试。

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({
  maxSize: 100,
  defaultRetries: 3,
  retryDelay: 1000,
});

// 添加任务
const jobId = queue.add(printData, { priority: 'HIGH' });

// 监听事件
queue.on('job-completed', job => {
  console.log('任务完成:', job.id);
});

// 暂停/恢复队列
queue.pause();
queue.resume();
```

#### 任务优先级

```typescript
enum PrintJobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}
```

---

### OfflineCache

离线缓存，在断开连接时自动保存打印任务。

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache({
  maxJobs: 50,
  expiryTime: 24 * 60 * 60 * 1000, // 24小时
});

// 保存任务
await cache.save({ id: 'job-1', data: printData });

// 获取所有缓存任务
const jobs = await cache.getAll();

// 同步到打印队列
await cache.sync();

// 清理过期任务
await cache.cleanup();
```

---

### TemplateEngine

模板引擎，支持收据和标签模板渲染。

```typescript
import { TemplateEngine } from 'taro-bluetooth-print';

const engine = new TemplateEngine();

// 渲染收据
const receiptData = engine.renderReceipt({
  store: { name: '示例商店', address: '北京市朝阳区' },
  order: { id: 'ORD-001', date: '2024-01-01' },
  items: [
    { name: '商品A', quantity: 2, price: 29.9 },
    { name: '商品B', quantity: 1, price: 49.9 },
  ],
  payment: {
    subtotal: 109.7,
    total: 109.7,
    method: '微信支付',
  },
});

// 渲染标签
const labelData = engine.renderLabel({
  name: '商品名称',
  price: 99.9,
  barcode: '6901234567890',
  barcodeFormat: 'EAN13',
});
```

---

### BarcodeGenerator

条码生成器，支持多种条码格式。

```typescript
import { BarcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';

const generator = new BarcodeGenerator();

// 生成条码命令
const commands = generator.generate('1234567890128', {
  format: BarcodeFormat.EAN13,
  height: 80,
  showText: true,
});

// 验证条码内容
const result = generator.validate('1234567890128', BarcodeFormat.EAN13);
if (!result.valid) {
  console.error(result.errors);
}
```

#### 支持的格式

- `CODE128` - Code 128
- `CODE39` - Code 39
- `EAN13` - EAN-13
- `EAN8` - EAN-8
- `UPCA` - UPC-A

---

### TextFormatter

文本格式化器，生成 ESC/POS 格式化命令。

```typescript
import { TextFormatter, TextAlign } from 'taro-bluetooth-print';

const formatter = new TextFormatter();

// 设置样式
const commands = formatter.setStyle({
  align: TextAlign.CENTER,
  bold: true,
  widthScale: 2,
  heightScale: 2,
});

// 重置样式
const resetCommands = formatter.resetStyle();
```

---

### PreviewRenderer

预览渲染器，将 ESC/POS 命令渲染为图像预览。

```typescript
import { PreviewRenderer } from 'taro-bluetooth-print';

const renderer = new PreviewRenderer();

// 渲染预览
const preview = await renderer.render(escPosCommands, {
  paperWidth: 58,
  dpi: 203,
});

console.log(preview.base64); // Base64 图像
console.log(preview.width, preview.height); // 图像尺寸
```

---

### WebBluetoothAdapter

Web Bluetooth 适配器，支持 H5 环境。

```typescript
import { WebBluetoothAdapter } from 'taro-bluetooth-print';

// 检查浏览器支持
if (WebBluetoothAdapter.isSupported()) {
  const adapter = new WebBluetoothAdapter();

  // 请求设备（弹出浏览器选择框）
  const device = await adapter.requestDevice();

  // 连接
  await adapter.connect(device.id);

  // 写入数据
  await adapter.write(device.id, buffer);

  // 断开连接
  await adapter.disconnect(device.id);
}
```

---

### ConnectionManager

连接管理器，支持心跳检测和自动重连。

```typescript
import { ConnectionManager } from 'taro-bluetooth-print';

const manager = new ConnectionManager(adapter, {
  heartbeatEnabled: true,
  heartbeatInterval: 5000,
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectInterval: 2000,
});

// 监听事件
manager.on('reconnecting', ({ attempt, maxAttempts }) => {
  console.log(`重连中 ${attempt}/${maxAttempts}`);
});

manager.on('reconnected', deviceId => {
  console.log('重连成功:', deviceId);
});

manager.on('reconnect-failed', ({ error }) => {
  console.error('重连失败:', error);
});
```

---

## 类型定义

### PrinterState

打印机状态枚举。

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

### IAdapterOptions

适配器配置选项。

```typescript
interface IAdapterOptions {
  chunkSize?: number; // 数据分片大小（默认：20 字节）
  delay?: number; // 分片之间的延迟，单位毫秒（默认：20ms）
  retries?: number; // 写入失败时的重试次数（默认：3）
}
```

### IQrOptions

二维码配置选项。

```typescript
interface IQrOptions {
  model?: 1 | 2; // 二维码模型（默认：2）
  size?: number; // 模块大小 1-16（默认：6）
  errorCorrection?: 'L' | 'M' | 'Q' | 'H'; // 纠错级别（默认：'M'）
}
```

### BarcodeOptions

条码配置选项。

```typescript
interface BarcodeOptions {
  format: BarcodeFormat; // 条码格式
  height?: number; // 条码高度 1-255（默认：80）
  width?: number; // 条码宽度 2-6（默认：3）
  showText?: boolean; // 是否显示文字（默认：true）
  textPosition?: 'above' | 'below' | 'both' | 'none';
}
```

### PrintProgress

打印进度信息。

```typescript
interface PrintProgress {
  sent: number; // 已发送字节数
  total: number; // 总字节数
}
```

### DeviceInfo

设备信息。

```typescript
interface DeviceInfo {
  deviceId: string; // 设备 ID
  name: string; // 设备名称
  rssi?: number; // 信号强度
  advertisData?: ArrayBuffer; // 广播数据
}
```

---

## 配置

### PrinterConfig

打印机配置接口。

```typescript
interface PrinterConfig {
  adapter?: AdapterConfig;
  driver?: DriverConfig;
  logging?: LoggingConfig;
}

interface AdapterConfig {
  chunkSize?: number;
  delay?: number;
  retries?: number;
}

interface DriverConfig {
  encoding?: string;
}

interface LoggingConfig {
  level?: LogLevel;
}
```

### ConnectionManagerConfig

连接管理器配置。

```typescript
interface ConnectionManagerConfig {
  heartbeatEnabled?: boolean; // 启用心跳检测（默认：true）
  heartbeatInterval?: number; // 心跳间隔（默认：5000ms）
  autoReconnect?: boolean; // 启用自动重连（默认：true）
  maxReconnectAttempts?: number; // 最大重连次数（默认：3）
  reconnectInterval?: number; // 重连间隔（默认：2000ms）
  connectionTimeout?: number; // 连接超时（默认：10000ms）
}
```

### QueueConfig

打印队列配置。

```typescript
interface QueueConfig {
  maxSize?: number; // 最大队列长度（默认：100）
  defaultRetries?: number; // 默认重试次数（默认：3）
  retryDelay?: number; // 重试间隔（默认：1000ms）
  autoProcess?: boolean; // 自动处理队列（默认：true）
}
```

### CacheConfig

离线缓存配置。

```typescript
interface CacheConfig {
  maxJobs?: number; // 最大缓存任务数（默认：100）
  expiryTime?: number; // 任务过期时间（默认：24小时）
  storagePrefix?: string; // 存储键前缀
  autoSync?: boolean; // 自动同步（默认：true）
}
```
