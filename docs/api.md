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
