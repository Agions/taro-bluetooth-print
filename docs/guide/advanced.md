# 高级用法

## 自定义驱动

如果您需要支持非标准打印机或不同的指令集（例如用于标签打印的 TSPL），可以通过实现 `IPrinterDriver` 接口来创建自定义驱动。

```typescript
import { IPrinterDriver } from 'taro-bluetooth-print';

class MyCustomDriver implements IPrinterDriver {
  init() {
    // 返回初始化指令
    return [/* init commands */];
  }
  
  text(content: string) {
    // 实现文本打印指令
    return [/* text commands */];
  }
  
  // ... 实现其他必要方法
}

// 使用自定义驱动初始化打印机
const printer = new BluetoothPrinter(undefined, new MyCustomDriver());
```

## 自定义适配器

如果您希望在非 Taro 环境（如纯 Web 项目）中使用本库，可以实现 `IPrinterAdapter` 接口。

```typescript
import { IPrinterAdapter, IAdapterOptions } from 'taro-bluetooth-print';

class WebBluetoothAdapter implements IPrinterAdapter {
  async connect(deviceId: string) {
    // 实现 Web Bluetooth 连接逻辑
  }
  
  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions) {
    // 实现写入逻辑
  }
  
  // ... 实现其他方法
}

const printer = new BluetoothPrinter(new WebBluetoothAdapter());
```

## 直接指令注入

虽然不推荐，但在某些特殊情况下，您可能需要发送库未封装的特殊指令。您可以通过扩展驱动类来实现这一点，或者直接操作底层的 buffer（不建议）。

推荐的方式是扩展现有的 `EscPos` 驱动：

```typescript
import { EscPos } from 'taro-bluetooth-print';

class ExtendedEscPos extends EscPos {
  openCashDrawer() {
    // 发送开钱箱指令: ESC p m t1 t2
    return [new Uint8Array([0x1B, 0x70, 0, 60, 120])];
  }
}

const printer = new BluetoothPrinter(undefined, new ExtendedEscPos());
// printer.driver.openCashDrawer() // 注意：需要类型断言或在类中封装
```
