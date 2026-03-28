# 高级用法

本文档涵盖自定义驱动开发、自定义适配器开发、插件编写指南和性能优化建议。

## 自定义驱动开发

如果需要支持非标准打印机或新的指令集，可以通过实现 `IPrinterDriver` 接口来创建自定义驱动。

### 驱动接口定义

```typescript
import { IPrinterDriver, IQrOptions } from 'taro-bluetooth-print';

interface IPrinterDriver {
  init(): Uint8Array[];
  text(content: string, encoding?: string): Uint8Array[];
  image(data: Uint8Array, width: number, height: number): Uint8Array[];
  qr(content: string, options?: IQrOptions): Uint8Array[];
  cut(): Uint8Array[];
  feed(lines?: number): Uint8Array[];
  // 可选方法
  barcode?(content: string, format: string, options?: object): Uint8Array[];
  getBuffer?(): Uint8Array;
  reset?(): void;
}
```

### 实现示例：自定义 EPL 驱动

EPL（Eltron Programming Language）常见于老式桌面标签打印机：

```typescript
import { IPrinterDriver } from 'taro-bluetooth-print';

class EplDriver implements IPrinterDriver {
  private buffer: Uint8Array[] = [];
  private width = 608;   // 默认 4" @ 152 DPI
  private height = 304;  // 默认 2"

  init(): Uint8Array[] {
    this.buffer = [];
    this.buffer.push(new Uint8Array([0x1B, 0x40])); // ESC @ — 初始化
    return this.buffer;
  }

  text(content: string, encoding = 'UTF-8'): Uint8Array[] {
    const encoded = new TextEncoder().encode(content);
    // EPL 文本命令: "A 10 0 0 1 1 0 N ..." 格式
    const cmd = `A 10 0 0 1 1 0 N "${content}"\n`;
    this.buffer.push(new TextEncoder().encode(cmd));
    return this.buffer;
  }

  image(data: Uint8Array, width: number, height: number): Uint8Array[] {
    const monoData = this.toMonoBitmap(data, width, height);
    const gwCmd = `GW 0,0,${width},${height}\n`;
    this.buffer.push(new TextEncoder().encode(gwCmd));
    this.buffer.push(monoData);
    return this.buffer;
  }

  qr(content: string): Uint8Array[] {
    return this.buffer;
  }

  feed(lines = 1): Uint8Array[] {
    const cmd = `P${lines}\n`;
    this.buffer.push(new TextEncoder().encode(cmd));
    return this.buffer;
  }

  cut(): Uint8Array[] {
    this.buffer.push(new TextEncoder().encode('G\n')); // G = cut
    return this.buffer;
  }

  getBuffer(): Uint8Array {
    const totalLen = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const arr of this.buffer) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  private toMonoBitmap(data: Uint8Array, width: number, height: number): Uint8Array {
    const bitPerLine = Math.ceil(width / 8);
    const linePadding = (8 - (bitPerLine % 8)) % 8;
    const bytesPerLine = bitPerLine + linePadding;
    const result = new Uint8Array(bytesPerLine * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x) * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        const gray = (r * 0.299 + g * 0.587 + b * 0.114);
        const bit = gray < 128 ? 1 : 0;
        const byteIdx = y * bytesPerLine + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        result[byteIdx] |= (bit << bitIdx);
      }
    }
    return result;
  }
}

// 使用自定义驱动
const printer = new BluetoothPrinter(undefined, new EplDriver());
await printer.connect(deviceId);
await printer.print();
```

### 扩展现有驱动

更常见的做法是扩展现有的 `EscPos` 类来添加特殊指令：

```typescript
import { EscPos } from 'taro-bluetooth-print';

class ExtendedEscPos extends EscPos {
  // 添加开钱箱指令
  openCashDrawer(): this {
    const cmd = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    this.addCommand(cmd);
    return this;
  }

  // 添加自定义浓度设置
  setDensity(level: number): this {
    const n1 = Math.min(Math.max(level, 0), 15);
    const cmd = new Uint8Array([0x1B, 0x37, n1, 0, 0]);
    this.addCommand(cmd);
    return this;
  }

  // 添加鸣叫指令
  beep(count = 1, duration = 100): this {
    const cmd = new Uint8Array([0x1B, 0x42, count, duration]);
    this.addCommand(cmd);
    return this;
  }
}
```

---

## 自定义适配器开发

适配器负责与平台蓝牙 API 交互。以下是实现一个自定义 BLE 适配器的基本模式：

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

### 实现示例：Flutter 蓝牙适配器（伪代码）

```typescript
class FlutterBleAdapter implements IPrinterAdapter {
  private deviceId: string | null = null;

  async connect(deviceId: string): Promise<void> {
    const result = await FlutterChannel.invokeMethod('BLE.connect', { deviceId });
    if (!result.success) {
      throw new Error(`连接失败: ${result.error}`);
    }
    this.deviceId = deviceId;
  }

  async disconnect(deviceId: string): Promise<void> {
    await FlutterChannel.invokeMethod('BLE.disconnect', { deviceId });
    this.deviceId = null;
  }

  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    const chunkSize = options?.chunkSize ?? 20;
    const delay = options?.delay ?? 20;

    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      await FlutterChannel.invokeMethod('BLE.write', { deviceId, data: Array.from(chunk) });
      if (i + chunkSize < bytes.length) {
        await sleep(delay);
      }
    }
  }
}
```

### BaseAdapter 基础类

内置的 `BaseAdapter` 提供了蓝牙操作的通用逻辑骨架：

```typescript
import { BaseAdapter } from 'taro-bluetooth-print';

class MyCustomAdapter extends BaseAdapter {
  protected async discoverServicesImpl(deviceId: string): Promise<void> {
    // 覆盖服务发现逻辑
  }

  protected async discoverCharacteristicsImpl(
    deviceId: string,
    serviceId: string
  ): Promise<void> {
    // 覆盖特征发现逻辑
  }

  protected async writeImpl(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    data: ArrayBuffer
  ): Promise<void> {
    // 覆盖写入逻辑
  }
}
```

---

## 插件开发指南

### 完整插件示例

以下是一个完整的分析插件，统计打印数据并上报：

```typescript
import { Plugin, PluginHooks } from 'taro-bluetooth-print';

export interface AnalyticsPluginOptions {
  endpoint: string;
  sampleRate?: number;
}

export function createAnalyticsPlugin(options: AnalyticsPluginOptions): Plugin {
  let sessionId: string;

  return {
    name: 'analytics',

    onInit: () => {
      sessionId = crypto.randomUUID();
      console.log('[Analytics] Session started:', sessionId);
    },

    hooks: {
      beforePrint: (buffer, context) => {
        if (Math.random() > (options.sampleRate ?? 1)) {
          return buffer;
        }

        const payload = {
          sessionId,
          timestamp: Date.now(),
          bytes: buffer.byteLength,
          driver: context?.driver ?? 'unknown',
          deviceId: context?.deviceId ?? 'unknown',
        };

        fetch(options.endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {}); // 静默失败

        return buffer;
      },

      afterPrint: (result) => {
        console.log('[Analytics] Print complete:', {
          bytes: result.bytesSent,
          duration: result.duration,
          success: result.success,
        });
      },

      onError: (error) => {
        console.error('[Analytics] Print error:', {
          code: error.code,
          message: error.message,
        });
      },
    },

    onDestroy: () => {
      console.log('[Analytics] Session ended:', sessionId);
    },
  };
}
```

---

## 性能优化建议

### 1. 调整分片参数

```typescript
// 环境好时推荐配置（蓝牙 5.0+ 设备）
printer.setOptions({
  chunkSize: 200,    // 蓝牙 4.2+ 可用更大值
  delay: 5,
  retries: 2,
});

// 环境差时使用保守配置
printer.setOptions({
  chunkSize: 10,
  delay: 50,
  retries: 5,
});
```

### 2. 减少不必要的样式切换

```typescript
// ❌ 低效 — 频繁切换样式
printer.text('标题1', 'GBK').setBold(true).text('内容1').setBold(false)
  .text('标题2', 'GBK').setBold(true).text('内容2').setBold(false);

// ✅ 高效 — 批量相同样式
printer.setBold(true);
printer.text('标题1', 'GBK').text('标题2', 'GBK');
printer.setBold(false);
printer.text('内容1', 'GBK').text('内容2', 'GBK');
```

### 3. 合理使用打印队列

```typescript
// ❌ 低效 — 多次小数据打印
for (const item of items) {
  await printer.text(item).print(); // 每次打印都有连接开销
}

// ✅ 高效 — 批量构建，一次打印
const queue = new PrintQueue();
for (const item of items) {
  queue.add(buildPrintData(item));
}
await queue.processAll(printer);
```

### 4. 使用模板引擎缓存

```typescript
// ❌ 低效 — 每次渲染模板
for (const order of orders) {
  const commands = engine.renderReceipt(order);
  await printer.print(commands);
}

// ✅ 高效 — 预编译模板
const template = engine.compile('receipt');
for (const order of orders) {
  const commands = template(order);
  await printer.print(commands);
}
```

### 5. 及时断开连接

```typescript
try {
  await printer.connect(deviceId);
  await printer.print();
} finally {
  await printer.disconnect(); // 立即释放资源
}
```

### 6. 生产环境关闭调试日志

```typescript
import { Logger, LogLevel } from 'taro-bluetooth-print';

// 开发环境
Logger.setLevel(LogLevel.DEBUG);

// 生产环境
Logger.setLevel(LogLevel.ERROR);
```

---

## 错误处理最佳实践

```typescript
import { BluetoothPrintError, ErrorCode } from 'taro-bluetooth-print';

async function robustPrint(printer: BluetoothPrinter, data: Uint8Array) {
  try {
    await printer.print(data);
  } catch (error) {
    if (error instanceof BluetoothPrintError) {
      switch (error.code) {
        case ErrorCode.CONNECTION_FAILED:
          await printer.connect(deviceId);
          return robustPrint(printer, data);

        case ErrorCode.WRITE_FAILED:
          printer.setOptions({ retries: 5 });
          return robustPrint(printer, data);

        case ErrorCode.DEVICE_DISCONNECTED:
          await printer.connect(deviceId);
          return robustPrint(printer, data);

        default:
          throw error;
      }
    }
    throw error;
  }
}
```
