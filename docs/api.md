# API 参考

## BluetoothPrinter

用于与蓝牙打印机交互的核心类。

### 构造函数

```typescript
new BluetoothPrinter(adapter?: IPrinterAdapter, driver?: IPrinterDriver)
```

- `adapter`: 打印机适配器（默认：`TaroAdapter`）
- `driver`: 打印机驱动（默认：`EscPos`）

### 方法

#### `connect(deviceId: string): Promise<this>`

连接到指定的蓝牙设备。

- `deviceId`: 蓝牙设备 ID

#### `disconnect(): Promise<void>`

断开与当前设备的连接。

#### `setOptions(options: IAdapterOptions): this`

设置适配器配置选项。

- `chunkSize`: 数据分片大小（默认：20 字节）
- `delay`: 分片之间的延迟，单位毫秒（默认：20ms）
- `retries`: 写入失败时的重试次数（默认：3）

#### `text(content: string, encoding?: string): this`

添加文本到打印队列。

- `content`: 要打印的文本内容
- `encoding`: 文本编码（默认：'GBK'）

#### `feed(lines?: number): this`

添加换行指令。

- `lines`: 换行数（默认：1）

#### `cut(): this`

添加切纸指令。

#### `image(data: Uint8Array, width: number, height: number): this`

打印图片。

- `data`: RGBA 格式的像素数据
- `width`: 图片宽度
- `height`: 图片高度

#### `qr(content: string, options?: IQrOptions): this`

打印二维码。

- `content`: 二维码内容
- `options`:
  - `model`: 模型 1 或 2（默认：2）
  - `size`: 模块大小 1-16（默认：6）
  - `errorCorrection`: 纠错级别 'L', 'M', 'Q', 'H'（默认：'M'）

#### `print(): Promise<void>`

将所有排队的指令发送到打印机。

#### `pause(): void`

暂停当前打印任务。

#### `resume(): Promise<void>`

恢复已暂停的打印任务。

#### `cancel(): void`

取消当前打印任务并清空队列。

#### `remaining(): number`

返回当前任务或队列中剩余的字节数。

#### `on(event: string, handler: Function): Function`

监听事件。

- `event`: 事件名称 ('state-change', 'progress', 'error', 'connected', 'disconnected', 'print-complete')
- `handler`: 事件处理函数
- 返回: 取消监听的函数
