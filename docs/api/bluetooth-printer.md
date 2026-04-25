# BluetoothPrinter API

蓝牙打印机主类，提供**链式调用 API** 构建和发送打印命令。所有链式方法均返回 `this`，支持无限级联。

::: info 版本说明
本文档基于 `taro-bluetooth-print` v2.9.4 编写。API 包含 v2.2+ 新增的格式控制方法和 v2.8+ 新增的任务控制方法。
:::

---

## 导入

```typescript
import { BluetoothPrinter, createBluetoothPrinter } from 'taro-bluetooth-print';
```

---

## 创建实例

### 推荐方式：工厂函数

工厂函数自动组装所有内部依赖（ConnectionManager、PrintJobManager、CommandBuilder）：

```typescript
import { createBluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({
  adapter: new TaroAdapter(),
});
```

### 直接实例化

```typescript
import { BluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter(new TaroAdapter());
```

### 依赖注入（高级）

手动传入自定义服务实例，完全控制内部依赖：

```typescript
import {
  BluetoothPrinter,
  ConnectionManager,
  PrintJobManager,
  CommandBuilder,
} from 'taro-bluetooth-print';

const cm = new ConnectionManager(myAdapter);
const pm = new PrintJobManager(cm);
const cb = new CommandBuilder();

const printer = new BluetoothPrinter(cm, pm, cb);
```

::: tip 如何选择？
- 日常使用：`createBluetoothPrinter()`
- 需要自定义某个内部服务：直接实例化 + 依赖注入
:::

---

## 连接管理

### `connect(deviceId: string): Promise<this>`

连接到指定蓝牙设备。

```typescript
await printer.connect('device-id');
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `deviceId` | `string` | 设备唯一标识（通过 DeviceManager 扫描获取） |

**返回值：** `Promise<this>` — 返回当前实例，支持链式调用。

**事件：** 连接成功后触发 `connected` 事件；失败触发 `error` 事件。

**错误码：** `CONNECTION_FAILED`

::: warning 注意
`deviceId` 格式因平台而异：
- 微信小程序：`XX:XX:XX:XX:XX:XX`
- 支付宝小程序：`XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
- H5：由浏览器自动分配
:::

---

### `disconnect(): Promise<void>`

断开当前连接并取消进行中的打印任务。

```typescript
await printer.disconnect();
```

**事件：** 触发 `disconnected` 事件。

---

### `isConnected(): boolean`

检查是否已连接到设备。

```typescript
if (printer.isConnected()) {
  console.log('已连接');
}
```

---

### `destroy(): void`

销毁打印机实例，释放所有资源：

1. 取消进行中的打印任务
2. 清空指令缓冲区
3. 断开蓝牙连接
4. 清理 ConnectionManager 资源
5. 移除所有事件监听器

```typescript
printer.destroy();
```

::: danger 重要
调用 `destroy()` 后，实例不可复用，需要重新创建 `BluetoothPrinter`。
:::

---

## 打印命令（链式调用）

以下所有方法均返回 `this`，支持链式级联。

### `text(content: string, encoding?: string): this`

添加文本内容到打印缓冲区。

```typescript
printer.text('Hello World', 'GBK');
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string` | — | 要打印的文本内容 |
| `encoding` | `string` | `'GBK'` | 文本编码，推荐 `GBK` |

::: warning 编码提示
大多数国产热敏机默认编码为 GBK，使用 `UTF-8` 可能导致中文乱码。详见 [FAQ - 打印中文乱码](../guide/faq.md#打印中文乱码)。
:::

---

### `feed(lines?: number): this`

走纸换行。

```typescript
printer.feed();   // 走纸 1 行
printer.feed(3);  // 走纸 3 行
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lines` | `number` | `1` | 走纸行数 |

---

### `cut(): this`

切纸。

```typescript
printer.cut();
```

::: info 说明
切纸命令在 `print()` 执行时才会发送到打印机。部分打印机可能不支持半切模式。
:::

---

### `qr(content: string, options?: IQrOptions): this`

打印二维码。

```typescript
printer.qr('https://example.com', { size: 6 });
printer.qr('https://example.com', {
  size: 8,
  errorCorrection: 'H',   // 高纠错
});
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string` | — | 二维码内容（URL、文本等） |
| `options.size` | `number` | `6` | 二维码尺寸（1-16） |
| `options.errorCorrection` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` | 纠错级别 |
| `options.model` | `number` | `2` | QR 型号（1=MQR, 2=QR） |

**纠错级别说明：**

| 级别 | 纠错能力 | 适用场景 |
|------|---------|---------|
| `L` | 7% | 内容较短、空间有限 |
| `M` | 15% | 通用场景（默认） |
| `Q` | 25% | 内容较长 |
| `H` | 30% | 高可靠性场景 |

---

### `barcode(content: string, format: BarcodeFormat, options?: IBarcodeOptions): this`

打印条形码。

```typescript
printer.barcode('1234567890128', 'EAN13', { height: 80, width: 2 });
printer.barcode('ABC-12345', 'CODE128', { height: 50, showText: true });
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `content` | `string` | 条码内容 |
| `format` | `BarcodeFormat` | 条码格式 |
| `options.height` | `number` | 条码高度（像素） |
| `options.width` | `number` | 条码宽度（1-6） |
| `options.showText` | `boolean` | 是否在条码下方显示文本 |

**支持的条码格式：**

| 格式 | 内容要求 | 说明 |
|------|---------|------|
| `CODE128` | ASCII 可打印字符 | 通用条码 |
| `CODE39` | 字母数字 + 部分特殊字符 | 工业标准 |
| `EAN13` | 12-13 位数字 | 国际商品码 |
| `EAN8` | 7-8 位数字 | 小型商品码 |
| `UPCA` | 11-12 位数字 | 北美通用码 |

---

### `image(data: Uint8Array, width: number, height: number): this`

打印图片。

```typescript
// RGBA 格式像素数据
const imageData = new Uint8Array(width * height * 4);
printer.image(imageData, 200, 100);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | `Uint8Array` | RGBA 像素数据（4 字节/像素） |
| `width` | `number` | 图片宽度（像素） |
| `height` | `number` | 图片高度（像素） |

::: warning 图片要求
- 数据格式必须为 **RGBA**（4 字节/像素）
- 图片宽度建议 ≤ 384 像素（58mm 纸宽）或 ≤ 576 像素（80mm 纸宽）
- 内部使用 Floyd-Steinberg 抖动算法进行灰度转换
:::

---

### `align(alignment: 'left' | 'center' | 'right'): this`

设置文本对齐方式（影响后续所有内容）。

```typescript
printer
  .align('center')
  .text('居中标题')
  .align('left')
  .text('左对齐正文');
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `alignment` | `'left' \| 'center' \| 'right'` | 对齐方式 |

---

### `setBold(enabled: boolean): this`

设置加粗模式。

```typescript
printer
  .setBold(true)
  .text('加粗标题')
  .setBold(false)
  .text('正常文本');
```

---

### `setUnderline(enabled: boolean): this`

设置下划线模式。

```typescript
printer
  .setUnderline(true)
  .text('带下划线文本')
  .setUnderline(false)
  .text('正常文本');
```

---

### `setSize(width: number, height: number): this`

设置字体大小（宽高倍数，范围 1-8）。

```typescript
printer
  .setSize(2, 2)
  .text('大字标题')
  .setSize(1, 1)
  .text('正常文本');
```

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| `width` | `number` | 1-8 | 宽度倍数 |
| `height` | `number` | 1-8 | 高度倍数 |

---

### `resetStyle(): this`

重置所有文本格式为默认值（对齐、加粗、下划线、大小）。

```typescript
printer
  .setBold(true)
  .setSize(2, 2)
  .text('样式化文本')
  .resetStyle()
  .text('恢复正常样式');
```

---

### `setOptions(options: IAdapterOptions): this`

设置蓝牙传输参数。

```typescript
printer.setOptions({
  chunkSize: 20,   // 每次写入的字节数
  delay: 20,       // 每次写入的间隔（ms）
  retries: 3,      // 写入失败重试次数
});
```

**参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `chunkSize` | `number` | `20` | 分片大小（字节） |
| `delay` | `number` | `20` | 分片间隔（毫秒） |
| `retries` | `number` | `3` | 单片写入失败重试次数 |

::: tip 性能调优
- **打印速度慢**：增大 `chunkSize`（如 100-200），减小 `delay`（如 5-10）
- **写入失败多**：减小 `chunkSize`（如 10-20），增大 `delay`（如 30-50），增大 `retries`
:::

---

## 执行打印

### `print(): Promise<void>`

将缓冲区中的所有指令发送到打印机并执行打印。

```typescript
await printer
  .text('Hello World')
  .feed(2)
  .qr('https://example.com')
  .cut()
  .print();
```

**行为说明：**

1. 检查连接状态，未连接则抛出 `CONNECTION_FAILED` 错误
2. 获取指令缓冲区并清空（`print()` 后缓冲区为空）
3. 通过 `PrintJobManager` 分片发送数据
4. 每发送一片触发 `progress` 事件
5. 全部发送完成触发 `print-complete` 事件

**错误码：** `CONNECTION_FAILED`、`WRITE_FAILED`、`PRINT_JOB_FAILED`

---

## 任务控制

### `pause(): void`

暂停当前打印任务。已发送的数据不会回退，但后续数据暂停发送。

```typescript
printer.pause();
```

---

### `resume(): Promise<void>`

恢复暂停的打印任务，继续发送剩余数据。

```typescript
await printer.resume();
```

---

### `cancel(): void`

取消当前打印任务并清空指令缓冲区。

```typescript
printer.cancel();
```

::: warning 注意
`cancel()` 同时清空指令缓冲区，调用后需要重新构建打印内容。
:::

---

### `remaining(): number`

获取当前打印任务剩余未发送的字节数。

```typescript
const bytes = printer.remaining();
console.log(`剩余 ${bytes} 字节`);
```

---

## 工具方法

### `getConnectionManager(): IConnectionManager`

获取内部连接管理器实例，用于高级连接管理。

```typescript
const cm = printer.getConnectionManager();
```

### `getCommandBuilder(): ICommandBuilder`

获取内部指令构建器实例，用于高级指令构建。

```typescript
const cb = printer.getCommandBuilder();
```

---

## 事件

`BluetoothPrinter` 继承自 `EventEmitter<PrinterEvents>`，提供类型安全的事件系统。

### 事件列表

| 事件名 | 参数类型 | 触发时机 |
|--------|---------|---------|
| `state-change` | `PrinterState` | 打印机状态变化 |
| `progress` | `{ sent: number; total: number }` | 打印进度更新 |
| `error` | `BluetoothPrintError` | 发生错误 |
| `connected` | `string`（deviceId） | 成功连接 |
| `disconnected` | `string`（deviceId） | 断开连接 |
| `print-complete` | `void` | 打印完成 |

### 事件监听

```typescript
// 打印进度
printer.on('progress', ({ sent, total }) => {
  const pct = ((sent / total) * 100).toFixed(1);
  console.log(`进度: ${pct}%`);
});

// 连接状态变化
printer.on('state-change', (state) => {
  console.log('状态:', state);
});

// 成功连接
printer.on('connected', (deviceId) => {
  console.log('已连接:', deviceId);
});

// 断开连接
printer.on('disconnected', (deviceId) => {
  console.log('已断开:', deviceId);
});

// 打印完成
printer.on('print-complete', () => {
  console.log('打印完成');
});

// 错误
printer.on('error', (error) => {
  console.error('错误:', error.code, error.message);
});
```

### 移除监听

```typescript
const handler = (data) => console.log(data);
printer.on('progress', handler);

// 移除指定监听
printer.off('progress', handler);

// 只监听一次
printer.once('print-complete', () => {
  console.log('首次打印完成');
});
```

---

## 错误处理

### BluetoothPrintError

所有错误均以 `BluetoothPrintError` 类型抛出，包含错误码和详细信息：

```typescript
try {
  await printer.connect('device-id');
  await printer.text('Hello').print();
} catch (error) {
  if (error instanceof BluetoothPrintError) {
    console.error('错误码:', error.code);
    console.error('错误信息:', error.message);
    console.error('原始错误:', error.cause);
  }
}
```

### 错误码参考

| 错误码 | 说明 | 常见原因 |
|--------|------|---------|
| `CONNECTION_FAILED` | 连接失败 | 设备 ID 错误、蓝牙未开启、权限未授权 |
| `WRITE_FAILED` | 数据写入失败 | 距离过远、chunkSize 过大、设备断开 |
| `SERVICE_NOT_FOUND` | 服务未发现 | 设备不是 BLE 打印机 |
| `CHARACTERISTIC_NOT_FOUND` | 特征值未发现 | 打印机型号不兼容 |
| `PRINT_JOB_FAILED` | 打印任务失败 | 内部错误 |
| `DEVICE_DISCONNECTED` | 设备已断开 | 蓝牙连接中断 |
| `PRINT_JOB_IN_PROGRESS` | 已有任务在执行 | 未等待上次打印完成 |

---

## 完整示例

### 收银小票

```typescript
import { createBluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

async function printReceipt() {
  const printer = createBluetoothPrinter({
    adapter: new TaroAdapter(),
  });

  // 监听打印进度
  printer.on('progress', ({ sent, total }) => {
    console.log(`打印进度: ${((sent / total) * 100).toFixed(1)}%`);
  });

  try {
    await printer.connect('device-id');

    await printer
      .align('center')
      .setBold(true)
      .text('=== 欢迎光临 ===', 'GBK')
      .setBold(false)
      .feed()
      .align('left')
      .text('商品A     x1    ¥10.00', 'GBK')
      .text('商品B     x2    ¥20.00', 'GBK')
      .feed()
      .text('------------------------')
      .setBold(true)
      .text('合计：          ¥30.00', 'GBK')
      .setBold(false)
      .feed(2)
      .align('center')
      .qr('https://example.com/order/123', { size: 6, errorCorrection: 'H' })
      .feed(2)
      .cut()
      .print();

    console.log('打印成功');
  } catch (error) {
    console.error('打印失败:', error);
  } finally {
    await printer.disconnect();
  }
}
```

### 带条码的快递单

```typescript
async function printShippingLabel() {
  const printer = createBluetoothPrinter({
    adapter: new TaroAdapter(),
  });

  await printer.connect('device-id');

  await printer
    .align('center')
    .setSize(2, 2)
    .text('快递面单', 'GBK')
    .setSize(1, 1)
    .feed()
    .barcode('SF1234567890', 'CODE128', { height: 80, showText: true })
    .feed()
    .align('left')
    .text('收件人：张三', 'GBK')
    .text('电  话：138****1234', 'GBK')
    .text('地  址：北京市朝阳区...', 'GBK')
    .feed(2)
    .cut()
    .print();

  await printer.disconnect();
}
```
