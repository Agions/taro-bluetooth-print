# 驱动支持

`taro-bluetooth-print` 支持多种打印机协议，方便在不同类型的打印机上使用。

## ESC/POS 驱动 (默认)

最常用的热敏打印机指令集，支持大多数票据打印机。

```typescript
import { EscPos } from 'taro-bluetooth-print';

const driver = new EscPos();

// 初始化
driver.init();

// 打印文本
driver.text('Hello World!', 'GBK');

// 打印二维码
driver.qr('https://example.com', { size: 6 });

// 切纸
driver.cut();

// 获取指令
const buffer = driver.getBuffer();
```

### 支持的功能

- 文本打印（GBK/GB2312/UTF-8/Big5）
- 二维码打印（支持多种纠错级别）
- 条码打印（Code128, Code39, EAN13 等）
- 图片打印（抖动算法）
- 纸张控制（进纸、切纸）

---

## TSPL 驱动

TSC 标签打印机专用语言，适用于标签打印机。

```typescript
import { TsplDriver } from 'taro-bluetooth-print';

const tspl = new TsplDriver();

const buffer = tspl
  .size(60, 40)           // 标签尺寸 60x40mm
  .gap(3)                 // 标签间隙 3mm
  .clear()                // 清除缓冲区
  .text('商品名称', { x: 50, y: 30, font: 3 })
  .text('¥99.00', { x: 50, y: 80, font: 4 })
  .barcode('6901234567890', { 
    x: 50, 
    y: 120, 
    type: 'EAN13',
    height: 60 
  })
  .qrcode('https://example.com', { 
    x: 300, 
    y: 30, 
    cellWidth: 4 
  })
  .print(1)               // 打印1份
  .getBuffer();
```

### TSPL 方法

| 方法 | 说明 |
|------|------|
| `size(width, height)` | 设置标签尺寸 |
| `gap(gap, offset?)` | 设置标签间隙 |
| `speed(speed)` | 设置打印速度 (1-10) |
| `density(density)` | 设置打印浓度 (0-15) |
| `text(content, options)` | 添加文本 |
| `barcode(content, options)` | 添加条码 |
| `qrcode(content, options)` | 添加二维码 |
| `box(options)` | 绘制矩形框 |
| `line(options)` | 绘制线条 |
| `print(copies?)` | 执行打印 |
| `getBuffer()` | 获取指令数据 |

---

## ZPL 驱动

斑马 (Zebra) 打印机专用语言，适用于工业标签打印机。

```typescript
import { ZplDriver } from 'taro-bluetooth-print';

const zpl = new ZplDriver();

const buffer = zpl
  .startFormat()
  .labelHome(10, 10)
  .text('Product Name', { x: 50, y: 50 })
  .barcode('1234567890', { x: 50, y: 150, type: '128', height: 60 })
  .qrcode('https://example.com', { x: 300, y: 50, magnification: 4 })
  .box({ x: 0, y: 0, width: 400, height: 300, borderThickness: 2 })
  .quantity(1)
  .print()
  .getBuffer();
```

### ZPL 方法

| 方法 | 说明 |
|------|------|
| `startFormat()` / `endFormat()` | 开始/结束标签格式 |
| `labelHome(x, y)` | 设置标签起始位置 |
| `text(content, options)` | 添加文本 |
| `font(content, x, y, height, width)` | 使用内置字体 |
| `barcode(content, options)` | 添加条码 |
| `qrcode(content, options)` | 添加二维码 |
| `box(options)` | 绘制矩形框 |
| `line(x1, y1, x2, y2, width)` | 绘制线条 |
| `circle(x, y, diameter, thickness)` | 绘制圆形 |
| `setDarkness(value)` | 设置打印浓度 (0-30) |
| `setSpeed(speed)` | 设置打印速度 |
| `print(quantity)` | 执行打印 |
| `getBuffer()` | 获取指令数据 |

---

## CPCL 驱动

Compact Printer Language，惠普/霍尼韦尔移动打印机常用。

```typescript
import { CpclDriver } from 'taro-bluetooth-print';

const cpcl = new CpclDriver(576); // 4" 宽度 @ 144 DPI

const buffer = cpcl
  .pageStart()
  .usePageSize('4X6')    // 使用标准标签尺寸
  .textAt('Hello World!', { x: 50, y: 50, font: 3 })
  .code128('1234567890', 50, 150, 50)
  .qrcode('https://example.com', { x: 300, y: 50 })
  .pageEnd()
  .getBuffer();
```

### CPCL 方法

| 方法 | 说明 |
|------|------|
| `pageStart()` / `pageEnd()` | 开始/结束页面 |
| `usePageSize(size)` | 使用标准尺寸 |
| `setPageSize(width, height)` | 自定义页面尺寸 |
| `setFont(font, xMulti, yMulti, rotation)` | 设置字体 |
| `text(content)` | 添加文本 |
| `textAt(content, options)` | 带位置的文本 |
| `barcode(content, options)` | 添加条码 |
| `qrcode(content, options)` | 添加二维码 |
| `twoDBarcode(content, type, x, y, height)` | 添加二维条码 |
| `line(options)` | 绘制线条 |
| `box(options)` | 绘制矩形框 |
| `cut()` / `partialCut()` | 切纸 |
| `beep(count, duration)` | 蜂鸣器 |
| `getBuffer()` | 获取指令数据 |

---

## 平台适配器

### 支持的平台

| 平台 | 适配器 | 说明 |
|------|--------|------|
| 微信小程序 | `TaroAdapter` | 完整支持 |
| H5 (Web Bluetooth) | `WebBluetoothAdapter` | 需要浏览器支持 |
| 支付宝小程序 | `AlipayAdapter` | 完整支持 |
| 百度小程序 | `BaiduAdapter` | 完整支持 |
| 字节跳动小程序 | `ByteDanceAdapter` | 完整支持 |
| 鸿蒙 HarmonyOS | `HarmonyOSAdapter` | 原生支持 |

### 使用特定适配器

```typescript
import { BluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

// 使用 Web Bluetooth
const printer = new BluetoothPrinter({
  adapter: new WebBluetoothAdapter()
});

// 使用鸿蒙
import { HarmonyOSAdapter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter({
  adapter: new HarmonyOSAdapter({ debug: true })
});
```

### 鸿蒙适配器特性

- 原生 HarmonyOS BLE API 支持
- 自动设备发现
- GATT 连接管理
- 通知/订阅支持
- 信号强度检测 (RSSI)
- 调试日志选项
