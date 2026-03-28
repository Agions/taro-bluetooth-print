# 驱动支持

`taro-bluetooth-print` 内置多种打印机协议驱动，覆盖主流热敏票据打印机和标签打印机。

## 驱动概览

| 驱动 | 协议 | 适用场景 | 典型品牌/型号 |
|------|------|---------|-------------|
| **EscPos** | ESC/POS | 热敏票据打印 | 佳博 GP-58 系列、芯烨 XP-58、商米、汉印 |
| **TsplDriver** | TSPL | 标签打印 | TSC ME240、TA210、TX200 |
| **ZplDriver** | ZPL | 工业标签打印 | Zebra ZD420、GT800、ZM400 |
| **CpclDriver** | CPCL | 移动票据打印 | HP IR3222、霍尼韦尔 |
| **StarPrinter** | STAR | STAR TSP 系列票据机 | STAR TSP100、TSP700、TSP800 |
| **GPrinterDriver** | ESC/POS 变种 | 佳博 GP 系列专用 | 佳博 GP-5890X、GP-3120 |

---

## EscPos 驱动（默认）

最广泛使用的热敏打印机指令集，兼容绝大多数热敏票据打印机。

```typescript
import { EscPos } from 'taro-bluetooth-print';

const driver = new EscPos();

// 初始化打印机
driver.init();

// 文本打印
driver.text('Hello World!', 'GBK');

// 换行
driver.feed(3);

// 二维码
driver.qr('https://example.com', { size: 6 });

// 切纸
driver.cut();

// 获取完整指令缓冲区
const buffer = driver.getBuffer();
```

### EscPos 选项

```typescript
interface EscPosOptions {
  useEncodingService?: boolean;   // 使用编码服务 (默认 true)
  showEncodingWarnings?: boolean;  // 显示编码警告 (默认 true)
  fallbackChar?: string;           // 替代字符 (默认 '?')
}
```

### 支持的功能

- ✅ 文本打印（GBK / GB2312 / UTF-8 / Big5）
- ✅ 二维码（支持 L/M/Q/H 纠错级别）
- ✅ 一维条码（CODE128、CODE39、EAN13、EAN8、UPCA）
- ✅ 图片打印（Floyd-Steinberg 抖动算法）
- ✅ 纸张控制（进纸、切纸、开钱箱）
- ✅ 文本格式化（加粗、下划线、对齐、字体大小）

---

## TsplDriver（TSC 标签机）

TSC 系列标签打印机专用语言，适合打印商品标签、物流标签等。

```typescript
import { TsplDriver } from 'taro-bluetooth-print';

const driver = new TsplDriver();

// 标签尺寸 60mm × 40mm，间隙 3mm
driver
  .size(60, 40)
  .gap(3)
  .direction(0)
  .density(10)             // 打印浓度 0-15
  .speed(4)                // 打印速度 1-10
  .clear()                 // 清空缓冲区

  // 文本
  .text('商品名称', { x: 50, y: 30, font: 3 })
  .text('¥99.00', {
    x: 50,
    y: 80,
    font: 4,
    xMultiplier: 2,
    yMultiplier: 2,
  })

  // 条码
  .barcode('6901234567890', {
    x: 50,
    y: 120,
    type: 'EAN13',
    height: 60,
    narrow: 2,
    wide: 4,
  })

  // 二维码
  .qrcode('https://shop.example.com', {
    x: 300,
    y: 30,
    cellWidth: 4,
  })

  // 矩形边框
  .box({ x: 5, y: 5, width: 380, height: 230, borderThickness: 2 })

  .print(1)                // 打印 1 份
  .getBuffer();
```

### TsplDriver 方法速查

| 方法 | 参数 | 说明 |
|------|------|------|
| `size(width, height)` | mm | 设置标签尺寸 |
| `gap(gap, offset?)` | mm | 设置标签间隙和偏移 |
| `speed(speed)` | 1-10 | 打印速度 |
| `density(density)` | 0-15 | 打印浓度 |
| `direction(dir)` | 0 / 1 | 打印方向 |
| `clear()` | — | 清空缓冲区 |
| `text(content, options)` | — | 添加文本 |
| `barcode(content, options)` | — | 添加条码 |
| `qrcode(content, options)` | — | 添加二维码 |
| `box(options)` | — | 绘制矩形边框 |
| `line(options)` | — | 绘制线条 |
| `print(copies?, sets?)` | — | 执行打印 |
| `cut()` | — | 切纸 |
| `getBuffer()` | — | 获取指令数据 |

### TSPL 文本选项

```typescript
interface TextOptions {
  x: number;                          // X 坐标 (点)
  y: number;                          // Y 坐标 (点)
  font?: number;                      // 字体: 1-8 (默认 3)
  rotation?: 0 | 90 | 180 | 270;      // 旋转角度
  xMultiplier?: number;               // X 方向倍数 1-10
  yMultiplier?: number;               // Y 方向倍数 1-10
}
```

### TSPL 条码类型

支持的条码类型：`'128'`、`'39'`、`'EAN13'`、`'EAN8'`、`'UPCA'`、`'QRCODE'`

---

## ZplDriver（Zebra 标签机）

Zebra 系列工业标签打印机专用语言，适合制造业、物流等行业。

```typescript
import { ZplDriver } from 'taro-bluetooth-print';

const driver = new ZplDriver();

// ZPL 使用点(dots)作为单位，默认 203 DPI
// 1mm ≈ 8 dots
driver
  .startFormat()
  .labelHome(10, 10)
  .setSpeed(4)                        // 打印速度
  .setDarkness(15)                    // 打印浓度 0-30

  // 文本
  .text('Product Name', { x: 50, y: 50 })
  .font('A', 30, 30, 50, 30)          // 内置字体

  // 条码
  .barcode('1234567890', {
    x: 50,
    y: 150,
    type: '128',
    height: 60,
  })

  // 二维码
  .qrcode('https://example.com', {
    x: 300,
    y: 50,
    magnification: 4,
  })

  // 边框
  .box({ x: 0, y: 0, width: 400, height: 300, borderThickness: 2 })

  // 圆圈
  .circle(350, 50, 15, 3)

  .quantity(1)
  .print()
  .getBuffer();
```

### ZplDriver 方法速查

| 方法 | 说明 |
|------|------|
| `startFormat()` / `endFormat()` | 格式块开始 / 结束 |
| `labelHome(x, y)` | 标签起始坐标（点） |
| `text(content, options)` | 添加文本 |
| `font(name, x, y, h, w)` | 内置字体 |
| `barcode(content, options)` | 添加条码 |
| `qrcode(content, options)` | 添加二维码 |
| `box(options)` | 矩形边框 |
| `line(x1, y1, x2, y2, w)` | 线条 |
| `circle(x, y, d, t)` | 圆圈 |
| `setDarkness(value)` | 浓度 (0-30) |
| `setSpeed(speed)` | 速度 |
| `quantity(n)` | 打印份数 |
| `print()` | 执行打印 |
| `getBuffer()` | 获取指令 |

::: tip ZPL 坐标参考
默认 203 DPI 下：`1mm ≈ 8 dots`，`1 inch = 203 dots`。
`labelHome(80, 80)` 约等于距左边缘 10mm、距顶部 10mm。
:::

---

## CpclDriver（HP/霍尼韦尔）

Compact Printer Language，适用于 HP 和霍尼韦尔移动打印机。

```typescript
import { CpclDriver } from 'taro-bluetooth-print';

const driver = new CpclDriver(576); // 4" 纸宽 @ 144 DPI

driver
  .pageStart()
  .usePageSize('4X6')                // 标准标签尺寸
  .setFont(3, 1, 1, 0)             // 字体: f, xm, ym, rotation

  .textAt('Hello CPCL!', { x: 50, y: 50 })
  .textAt('2024-01-15', { x: 50, y: 100 })

  // 条码
  .barcode('1234567890', {
    x: 50,
    y: 150,
    type: '128',
    height: 50,
  })

  // 二维码
  .qrcode('https://example.com', { x: 300, y: 50 })

  // 绘制
  .line({ x1: 10, y1: 10, x2: 500, y2: 10, width: 3 })
  .box({ x: 10, y: 10, width: 500, height: 300, borderThickness: 2 })

  // 蜂鸣
  .beep(2, 100)

  .pageEnd()
  .getBuffer();
```

### CpclDriver 方法速查

| 方法 | 说明 |
|------|------|
| `pageStart()` / `pageEnd()` | 页面块 |
| `usePageSize(size)` | 标准尺寸，如 `'4X6'`、`'3X2'` |
| `setPageSize(width, height)` | 自定义尺寸 |
| `setFont(font, xm, ym, rotation)` | 字体设置 |
| `text(content)` | 添加文本 |
| `textAt(content, options)` | 带坐标文本 |
| `barcode(content, options)` | 条码 |
| `qrcode(content, options)` | 二维码 |
| `line(options)` | 线条 |
| `box(options)` | 矩形 |
| `cut()` / `partialCut()` | 切纸 |
| `beep(count, duration)` | 蜂鸣器 |
| `getBuffer()` | 获取指令 |

---

## StarPrinter（v2.5.0 新增）

STAR TSP 系列热敏票据打印机专用驱动，支持 TSP100、TSP700、TSP800 等型号。

```typescript
import { StarPrinter } from 'taro-bluetooth-print';

const driver = new StarPrinter();

// 初始化
driver.init();

// 文本
driver.text('Hello STAR!', 'UTF-8');

// 对齐和样式
driver.align('center').setBold(true);
driver.text('大标题');
driver.setBold(false);

// 二维码
driver.qr('https://example.com', {
  model: 2,
  cellSize: 4,
  errorCorrection: 'M',
});

// 条码
driver.barcode('1234567890', 'CODE128', {
  height: 40,
  width: 2,
  hri: 'below',
});

// 图片
driver.image(imageData, width, height);

// 进纸切纸
driver.feed(3);
driver.cut();

const buffer = driver.getBuffer();
```

### StarPrinter 支持格式

**条码类型：** `CODE39` | `CODE128` | `EAN13`

**对齐方式：** `'left'` | `'center'` | `'right'`

**HRI 文本位置：** `'none'` | `'above'` | `'below'` | `'both'`

---

## GPrinterDriver（佳博专用）

佳博 GP 系列打印机的 ESC/POS 变种驱动，针对国产机型优化。

```typescript
import { GPrinterDriver } from 'taro-bluetooth-print';

const driver = new GPrinterDriver();

// 初始化
driver.init();

// 文本
driver.text('佳博打印机测试', 'GBK');

// 进纸切纸
driver.feed(3);
driver.cut();

const buffer = driver.getBuffer();
```

---

## 驱动选择建议

```
我的打印机是什么类型？
├── 热敏票据打印机（打印小票）
│   ├── 佳博、芯烨、商米、汉印 → EscPos 或 GPrinterDriver
│   └── STAR TSP 系列       → StarPrinter
│
├── 标签打印机（打印标签贴纸）
│   ├── TSC 系列            → TsplDriver
│   ├── Zebra 系列          → ZplDriver
│   └── HP/霍尼韦尔移动机    → CpclDriver
│
└── 不确定类型
    ├── 先试 EscPos（最通用）
    └── 查看打印机说明书确认指令集
```

::: tip 提示
大多数热敏票据打印机使用 **ESC/POS** 协议。如果你不确定打印机类型，先用 EscPos 驱动尝试，通常可以正常工作。
:::
