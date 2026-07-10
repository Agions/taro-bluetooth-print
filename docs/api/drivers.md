# 驱动层（Drivers）

`taro-bluetooth-print/drivers` 子模块 — 各类打印协议的低级 driver。每个 driver 接收高层命令并输出对应协议的字节流。

## 导入

```typescript
import {
  EscPos,        // ESC/POS（默认，最常用）
  TsplDriver,    // TSPL（标签 / 条码打印机）
  ZplDriver,     // ZPL（Zebra 标签）
  StarPrinter,   // StarPRNT（Star Micronics）
  CpclDriver,    // CPCL（Comtec / 一些工业打印机）
  GPrinterDriver,
  XprinterDriver,
  SprtDriver,
} from 'taro-bluetooth-print/drivers';
```

## ESC/POS Driver

用于大多数热敏小票打印机（佳博 / 芯烨 / Epson / Star 等）。

```typescript
import { EscPos, CommandBuilder } from 'taro-bluetooth-print';

const driver = new EscPos();
const cb = new CommandBuilder(driver);

cb.text('Hello World')
  .feed(2)
  .qr('https://example.com')
  .cut();

const buffer = cb.getBuffer();
```

实现 `IPrinterDriver` 接口（`init` / `text` / `image` / `qr` / `cut` / `feed`），可直接传入 `new CommandBuilder(driver)`。

## TSPL Driver（标签机）

TSC / Zebra 系列标签 / 条码打印机的 TSPL 协议。**不实现** `IPrinterDriver`（无 init/cut/feed 标准命令），而是 fluent builder：

```typescript
import { TsplDriver } from 'taro-bluetooth-print/drivers';

const tspl = new TsplDriver()
  .size(60, 40)        // 标签尺寸 60×40 mm
  .gap(3)              // 间距 3 mm
  .clear()             // 清空图像缓冲区
  .text('商品名称', { x: 20, y: 20, font: 3, rotation: 0 })
  .text('¥99.00', { x: 20, y: 80, font: 4 })
  .barcode('6901234567890', {
    x: 20, y: 160, type: 'EAN13', height: 60, showText: true
  })
  .qrcode('https://example.com/p/12345', { x: 20, y: 240, cellWidth: 6 })
  .print(1, 1);        // 1 份 × 1 套

const bytes = tspl.getBuffer();  // ASCII 字节流
```

### 端到端打印

v2.15.3+ 通过 `BluetoothPrinter.writeRaw()` 走同一条连接：

```typescript
await printer.writeRaw(tspl.getBuffer());
```

### 类型导出

```typescript
import type {
  LabelSize,
  TextOptions,
  BarcodeOptions,
  QRCodeOptions,
  BoxOptions,
  LineOptions,
} from 'taro-bluetooth-print/drivers';
```

## ZPL / CPCL / StarPRNT

```typescript
// ZPL（Zebra）
import { ZplDriver } from 'taro-bluetooth-print/drivers';
const zpl = new ZplDriver()
  .start()
  .field('PRODUCT', '蓝喵马克杯')
  .barcode('CODE128', '1234567890')
  .end();
await printer.writeRaw(zpl.getBuffer());

// CPCL
import { CpclDriver } from 'taro-bluetooth-print/drivers';
const cpcl = new CpclDriver()
  .text(...)
  .barcode(...)
  .form();
await printer.writeRaw(cpcl.getBuffer());

// StarPRNT（Star Micronics）
import { StarPrinter } from 'taro-bluetooth-print/drivers';
const star = new StarPrinter();
await printer.writeRaw(star.text('Hello').getBuffer());
```

## 自定义 Driver

实现 `IPrinterDriver` 接口（6 个方法）：

```typescript
import type { IPrinterDriver, IQrOptions } from 'taro-bluetooth-print/types';

class MyDriver implements IPrinterDriver {
  init(): Uint8Array[] { return [new Uint8Array([0x1B, 0x40])]; }
  text(content: string, encoding?: string): Uint8Array[] { /* ... */ }
  image(data: Uint8Array, w: number, h: number): Uint8Array[] { /* ... */ }
  qr(content: string, options?: IQrOptions): Uint8Array[] { /* ... */ }
  cut(): Uint8Array[] { return [new Uint8Array([0x1D, 0x56, 0x00])]; }
  feed(lines?: number): Uint8Array[] { return [new Uint8Array([0x0A])]; }
}

const cb = new CommandBuilder(new MyDriver());
```

或者直接构造自己的字节流后用 `writeRaw()` 发送。

## 选择建议

| 协议 | 用途 | Driver 风格 |
|---|---|---|
| ESC/POS | 小票（餐饮 / 零售 / 物流） | `IPrinterDriver`（6 方法） |
| TSPL | 标签 / 条码 | fluent builder（链式） |
| ZPL | Zebra 标签 | fluent builder |
| CPCL | 工业便携 | fluent builder |
| StarPRNT | Star Micronics | fluent builder |

## 相关

- [BluetoothPrinter](./bluetooth-printer.md#原始字节透传v2153) — writeRaw() 用法
- [CommandBuilder](./command-builder.md) — ESC/POS 命令构造器
- [Types](./types.md#iprinterdriver) — `IPrinterDriver` 接口定义