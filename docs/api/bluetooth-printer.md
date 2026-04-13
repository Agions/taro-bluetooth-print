# BluetoothPrinter API

蓝牙打印机主类，提供链式调用 API 构建和发送打印命令。

## 导入

```typescript
import { BluetoothPrinter, createBluetoothPrinter } from 'taro-bluetooth-print';
```

## 创建实例

### 推荐方式：使用工厂函数

```typescript
import { createBluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({
  adapter: new WebBluetoothAdapter()
});
```

### 直接实例化

```typescript
const printer = new BluetoothPrinter(adapter);
```

## 方法

### 连接管理

#### `connect(deviceId: string): Promise<void>`

连接到指定设备。

```typescript
await printer.connect('device-id');
```

#### `disconnect(): Promise<void>`

断开当前连接。

```typescript
await printer.disconnect();
```

#### `isConnected(): boolean`

检查是否已连接。

```typescript
if (printer.isConnected()) {
  // 已连接
}
```

### 打印命令（链式调用）

#### `text(content: string, encoding?: string): this`

添加文本内容。

```typescript
printer.text('Hello World', 'GBK');
```

#### `feed(lines?: number): this`

走纸换行，默认 1 行。

```typescript
printer.feed(2);
```

#### `cut(mode?: 'full' | 'partial'): this`

切纸。

```typescript
printer.cut();        // 全切
printer.cut('partial'); // 半切
```

#### `qr(data: string, options?: IQrOptions): this`

打印二维码。

```typescript
printer.qr('https://example.com', { size: 6 });
```

#### `barcode(data: string, type: BarcodeType, options?: IBarcodeOptions): this`

打印条码。

```typescript
printer.barcode('12345678', 'CODE128', { width: 2, height: 50 });
```

#### `image(data: Uint8Array, width: number, height: number): this`

打印图片。

```typescript
printer.image(imageData, 200, 100);
```

#### `align(alignment: 'left' | 'center' | 'right'): this`

设置对齐方式。

```typescript
printer.align('center').text('居中文本');
```

#### `bold(enabled?: boolean): this`

设置加粗。

```typescript
printer.bold(true).text('加粗文本');
```

#### `fontSize(size: 1 | 2 | 3 | 4): this`

设置字体大小。

```typescript
printer.fontSize(2).text('大字');
```

### 执行打印

#### `print(): Promise<void>`

执行打印命令。

```typescript
await printer.text('Hello').feed().cut().print();
```

### 任务控制

#### `pause(): void`

暂停打印任务。

#### `resume(): void`

恢复打印任务。

#### `cancel(): void`

取消打印任务。

### 配置

#### `setOptions(options: IAdapterOptions): void`

设置传输参数。

```typescript
printer.setOptions({
  chunkSize: 20,   // 分片大小
  delay: 20,       // 分片间隔 ms
  retries: 3       // 重试次数
});
```

## 事件

```typescript
printer.on('state-change', (state) => {
  console.log('状态变化:', state);
});

printer.on('progress', ({ sent, total }) => {
  console.log(`进度: ${sent}/${total}`);
});

printer.on('error', (error) => {
  console.error('错误:', error.code, error.message);
});

printer.on('connected', (deviceId) => {
  console.log('已连接:', deviceId);
});

printer.on('disconnected', (deviceId) => {
  console.log('已断开:', deviceId);
});

printer.on('print-complete', () => {
  console.log('打印完成');
});
```

## 完整示例

```typescript
import { createBluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

async function printReceipt() {
  const printer = createBluetoothPrinter({
    adapter: new WebBluetoothAdapter()
  });

  // 监听进度
  printer.on('progress', ({ sent, total }) => {
    console.log(`打印进度: ${(sent / total * 100).toFixed(1)}%`);
  });

  try {
    await printer.connect('device-id');
    
    await printer
      .align('center')
      .text('=== 欢迎光临 ===', 'GBK')
      .feed()
      .align('left')
      .text('商品A     x1    ¥10.00', 'GBK')
      .text('商品B     x2    ¥20.00', 'GBK')
      .feed()
      .text('------------------------')
      .text('合计：            ¥30.00', 'GBK')
      .feed(2)
      .qr('https://example.com', { size: 6 })
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
