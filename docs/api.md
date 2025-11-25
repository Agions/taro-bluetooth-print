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

##### `connect(deviceId: string): Promise<this>`

连接到指定的蓝牙设备。

- **`deviceId`**: 蓝牙设备 ID
- **返回**: `Promise<this>` - 当前实例，支持链式调用
- **抛出**: `BluetoothPrintError` - 连接失败时抛出

**示例**:
```typescript
await printer.connect('device-123');
```

##### `disconnect(): Promise<void>`

断开与当前设备的连接。

- **返回**: `Promise<void>`
- **抛出**: `BluetoothPrintError` - 断开连接失败时抛出

**示例**:
```typescript
await printer.disconnect();
```

##### `setOptions(options: IAdapterOptions): this`

设置适配器配置选项，用于控制蓝牙数据传输。

- **`options`**:
  - `chunkSize`: 数据分片大小（默认：20 字节）
  - `delay`: 分片之间的延迟，单位毫秒（默认：20ms）
  - `retries`: 写入失败时的重试次数（默认：3）
- **返回**: `this` - 当前实例，支持链式调用

**示例**:
```typescript
printer.setOptions({
  chunkSize: 30,
  delay: 15,
  retries: 5
});
```

##### `text(content: string, encoding?: string): this`

添加文本到打印队列。

- **`content`**: 要打印的文本内容
- **`encoding`**: 文本编码（默认：'GBK'）
- **返回**: `this` - 当前实例，支持链式调用

**示例**:
```typescript
printer.text('Hello World!').text('你好世界', 'GBK');
```

##### `feed(lines?: number): this`

添加换行指令。

- **`lines`**: 换行数（默认：1）
- **返回**: `this` - 当前实例，支持链式调用

**示例**:
```typescript
printer.feed(2); // 换行 2 行
```

##### `cut(): this`

添加切纸指令。

- **返回**: `this` - 当前实例，支持链式调用

**示例**:
```typescript
printer.cut();
```

##### `image(data: Uint8Array, width: number, height: number): this`

打印图片，支持 RGBA 格式的像素数据。

- **`data`**: RGBA 格式的像素数据
- **`width`**: 图片宽度（像素）
- **`height`**: 图片高度（像素）
- **返回**: `this` - 当前实例，支持链式调用

**示例**:
```typescript
const imageData = new Uint8Array(width * height * 4); // RGBA 数据
printer.image(imageData, width, height);
```

##### `qr(content: string, options?: IQrOptions): this`

打印二维码。

- **`content`**: 二维码内容
- **`options`**:
  - `model`: 模型 1 或 2（默认：2）
  - `size`: 模块大小 1-16（默认：6）
  - `errorCorrection`: 纠错级别 'L', 'M', 'Q', 'H'（默认：'M'）
- **返回**: `this` - 当前实例，支持链式调用

**示例**:
```typescript
printer.qr('https://example.com', {
  size: 8,
  errorCorrection: 'H'
});
```

##### `print(): Promise<void>`

将所有排队的指令发送到打印机。

- **返回**: `Promise<void>`
- **抛出**: `BluetoothPrintError` - 打印失败时抛出

**示例**:
```typescript
await printer.print();
```

##### `pause(): void`

暂停当前打印任务。

- **返回**: `void`

**示例**:
```typescript
printer.pause();
```

##### `resume(): Promise<void>`

恢复已暂停的打印任务。

- **返回**: `Promise<void>`
- **抛出**: `BluetoothPrintError` - 恢复失败时抛出

**示例**:
```typescript
await printer.resume();
```

##### `cancel(): void`

取消当前打印任务并清空队列。

- **返回**: `void`

**示例**:
```typescript
printer.cancel();
```

##### `remaining(): number`

返回当前任务或队列中剩余的字节数。

- **返回**: `number` - 剩余字节数

**示例**:
```typescript
console.log('Remaining bytes:', printer.remaining());
```

##### `on<K extends keyof PrinterEvents>(event: K, handler: (data: PrinterEvents[K]) => void): () => void`

监听事件。

- **`event`**: 事件名称
- **`handler`**: 事件处理函数
- **返回**: `() => void` - 取消监听的函数

**事件类型**:
| 事件名 | 数据类型 | 说明 |
|--------|---------|------|
| `state-change` | `PrinterState` | 连接状态变化 |
| `progress` | `{ sent: number; total: number }` | 打印进度 |
| `error` | `BluetoothPrintError` | 错误事件 |
| `connected` | `string` | 设备已连接，返回设备 ID |
| `disconnected` | `string` | 设备已断开，返回设备 ID |
| `print-complete` | `void` | 打印完成 |

**示例**:
```typescript
const unsubscribe = printer.on('progress', ({ sent, total }) => {
  console.log(`Progress: ${sent}/${total}`);
});

// 取消监听
unsubscribe();
```

##### `listenerCount<K extends keyof PrinterEvents>(event: K): number`

获取指定事件的监听器数量。

- **`event`**: 事件名称
- **返回**: `number` - 监听器数量

**示例**:
```typescript
console.log('Progress listeners:', printer.listenerCount('progress'));
```

## 适配器

### TaroAdapter

实现了 `IPrinterAdapter` 接口，负责处理与 Taro 框架的蓝牙 API 交互。

#### 方法

##### `connect(deviceId: string): Promise<void>`

连接到指定的蓝牙设备。

##### `disconnect(deviceId: string): Promise<void>`

断开与指定设备的连接。

##### `write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void>`

向设备写入数据。

##### `onStateChange(callback: (state: PrinterState) => void): void`

注册状态变化回调。

## 驱动

### EscPos

实现了 `IPrinterDriver` 接口，负责将高级打印命令转换为 ESC/POS 指令集。

#### 方法

##### `init(): Uint8Array[]`

初始化打印机。

##### `text(content: string, encoding?: string): Uint8Array[]`

生成文本打印命令。

##### `image(data: Uint8Array, width: number, height: number): Uint8Array[]`

生成图像打印命令。

##### `qr(content: string, options?: IQrOptions): Uint8Array[]`

生成二维码打印命令。

##### `cut(): Uint8Array[]`

生成切纸命令。

##### `feed(lines: number): Uint8Array[]`

生成换行命令。

## 工具类

### Encoding

提供文本编码转换功能。

#### 静态方法

##### `encode(text: string, encoding?: string): Uint8Array`

将字符串编码为字节数组。

- **`text`**: 要编码的文本
- **`encoding`**: 目标编码（默认：'GBK'）
- **返回**: `Uint8Array` - 编码后的字节数组

##### `isSupported(encoding: string): boolean`

检查指定编码是否支持。

- **`encoding`**: 要检查的编码
- **返回**: `boolean` - 是否支持

### ImageProcessing

提供图像处理功能。

#### 静态方法

##### `toBitmap(data: Uint8Array, width: number, height: number): Uint8Array`

将 RGBA 图像转换为单色位图。

- **`data`**: RGBA 像素数据
- **`width`**: 图像宽度
- **`height`**: 图像高度
- **返回**: `Uint8Array` - 位图数据

### Logger

提供日志记录功能。

#### 静态方法

##### `setLevel(level: LogLevel): void`

设置日志级别。

##### `scope(name: string): Logger`

创建一个带作用域的日志记录器。

#### 实例方法

##### `debug(...args: any[]): void`

记录调试日志。

##### `info(...args: any[]): void`

记录信息日志。

##### `warn(...args: any[]): void`

记录警告日志。

##### `error(...args: any[]): void`

记录错误日志。

## 错误处理

### BluetoothPrintError

自定义错误类，用于封装蓝牙打印操作中的错误。

#### 属性

- **`code`**: `ErrorCode` - 错误代码
- **`message`**: `string` - 错误消息
- **`originalError`**: `Error | undefined` - 原始错误（可选）

### ErrorCode

错误代码枚举，定义了所有可能的错误类型。

#### 枚举值

| 错误代码 | 说明 |
|----------|------|
| `CONNECTION_FAILED` | 连接失败 |
| `CONNECTION_TIMEOUT` | 连接超时 |
| `DEVICE_NOT_FOUND` | 设备未找到 |
| `DEVICE_DISCONNECTED` | 设备已断开 |
| `SERVICE_NOT_FOUND` | 服务未找到 |
| `CHARACTERISTIC_NOT_FOUND` | 特征未找到 |
| `SERVICE_DISCOVERY_FAILED` | 服务发现失败 |
| `WRITE_FAILED` | 写入失败 |
| `WRITE_TIMEOUT` | 写入超时 |
| `PRINT_JOB_IN_PROGRESS` | 打印任务进行中 |
| `PRINT_JOB_CANCELLED` | 打印任务已取消 |
| `PRINT_JOB_FAILED` | 打印任务失败 |
| `INVALID_CONFIGURATION` | 无效配置 |
| `ENCODING_NOT_SUPPORTED` | 编码不支持 |
| `INVALID_IMAGE_DATA` | 无效图像数据 |
| `INVALID_QR_DATA` | 无效二维码数据 |

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

### PrintProgress

打印进度信息。

```typescript
interface PrintProgress {
  sent: number; // 已发送字节数
  total: number; // 总字节数
}

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

## 配置

### DEFAULT_CONFIG

默认配置对象。

### mergeConfig(config1: PrinterConfig, config2: Partial<PrinterConfig>): PrinterConfig

合并两个配置对象。

- **`config1`**: 基础配置
- **`config2`**: 要合并的配置
- **返回**: `PrinterConfig` - 合并后的配置

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
