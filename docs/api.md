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
