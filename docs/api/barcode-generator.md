# BarcodeGenerator API

条码生成模块，负责生成 ESC/POS 打印命令，支持一维条码和二维条码。

## 导入

```typescript
import { BarcodeGenerator, barcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';
// 或直接导入
import { BarcodeGenerator } from 'taro-bluetooth-print/src/barcode';
```

## 创建实例

```typescript
const generator = new BarcodeGenerator();

// 或使用单例实例
import { barcodeGenerator } from 'taro-bluetooth-print';
```

## BarcodeFormat 条码格式枚举

支持的条码格式：

| 格式 | 说明 | 内容限制 |
|------|------|----------|
| `CODE128` | Code 128 - 可变长度，支持字母数字 | ASCII 0-127，1-255 字符 |
| `CODE39` | Code 39 - 可变长度，支持字母数字和特殊字符 | 0-9, A-Z, space, - . $ / + % |
| `EAN13` | EAN-13 - 13 位数字（12 位 + 校验位） | 12 或 13 位数字 |
| `EAN8` | EAN-8 - 8 位数字（7 位 + 校验位） | 7 或 8 位数字 |
| `UPCA` | UPC-A - 12 位数字（11 位 + 校验位） | 11 或 12 位数字 |
| `ITF` | ITF (交叉 25 码) - 偶数位数字 | 偶数个数字 |
| `CODABAR` | CODABAR - 数字和特殊字符 | 必须以 A/B/C/D 开头和结尾 |
| `QR_CODE` | QR 码 - 二维矩阵码 | 最多 7089 字节 |
| `PDF417` | PDF417 - 二维堆叠码 | 最多 1850 字节，ASCII |

## BarcodeOptions 条码配置选项

```typescript
interface BarcodeOptions {
  /** 条码格式 (必填) */
  format: BarcodeFormat;
  /** 条码高度，点为单位 (1-255，默认 80) */
  height?: number;
  /** 条码模块宽度 (2-6，默认 3) */
  width?: number;
  /** 是否显示可读文本 */
  showText?: boolean;
  /** 文本位置 */
  textPosition?: 'above' | 'below' | 'both' | 'none';
  /** QR 码纠错级别 (L/M/Q/H，默认 M) */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  /** QR 码模型 (1 或 2，默认 2) */
  qrModel?: 1 | 2;
  /** PDF417 压缩模式 (0-3，默认 2) */
  pdf417Compression?: 0 | 1 | 2 | 3;
  /** PDF417 安全级别 (0-8，默认 2) */
  pdf417Security?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** PDF417 列数 (1-30，默认 2) */
  pdf417Columns?: number;
}
```

## 方法

### `generate(content: string, options: BarcodeOptions): Uint8Array[]`

生成条码 ESC/POS 打印命令。

```typescript
const generator = new BarcodeGenerator();

// 生成 Code128 条码
const commands = generator.generate('ABC123', {
  format: BarcodeFormat.CODE128,
  height: 80,
  width: 3,
  showText: true,
  textPosition: 'below'
});

// 生成 QR 码
const qrCommands = generator.generate('https://example.com', {
  format: BarcodeFormat.QR_CODE,
  height: 6,           // QR 码模块大小
  errorCorrection: 'M',
  qrModel: 2
});

// 生成 PDF417
const pdfCommands = generator.generate('Some data here', {
  format: BarcodeFormat.PDF417,
  pdf417Columns: 2,
  pdf417Security: 2
});
```

### `validate(content: string, format: BarcodeFormat): ValidationResult`

验证条码内容是否合法。

```typescript
const result = generator.validate('1234567890128', BarcodeFormat.EAN13);

if (!result.valid) {
  result.errors.forEach(err => {
    console.log(`${err.field}: ${err.message} (${err.code})`);
  });
}
```

**ValidationResult 返回值：**

```typescript
interface ValidationResult {
  /** 验证是否通过 */
  valid: boolean;
  /** 验证错误列表 */
  errors: Array<{
    field: string;    // 错误字段
    message: string;  // 错误描述
    code: string;     // 错误代码
  }>;
}
```

**错误代码说明：**

| 代码 | 说明 |
|------|------|
| `REQUIRED` | 字段必填 |
| `INVALID_TYPE` | 类型错误 |
| `INVALID_LENGTH` | 长度不符合要求 |
| `INVALID_CHECK_DIGIT` | 校验位错误 |
| `INVALID_CHARACTERS` | 包含非法字符 |
| `INVALID_FORMAT` | 格式错误 |
| `CONTENT_TOO_LONG` | 内容超出最大长度 |
| `UNSUPPORTED_FORMAT` | 不支持的格式 |

### `getSupportedFormats(): BarcodeFormat[]`

获取所有支持的条码格式。

```typescript
const formats = generator.getSupportedFormats();
console.log(formats);
// [BarcodeFormat.CODE128, BarcodeFormat.CODE39, BarcodeFormat.EAN13, ...]
```

## 使用示例

### 基本一维条码

```typescript
import { BarcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';

const generator = new BarcodeGenerator();

// 验证并生成 Code128 条码
const content = 'HELLO-123';
const validation = generator.validate(content, BarcodeFormat.CODE128);

if (validation.valid) {
  const commands = generator.generate(content, {
    format: BarcodeFormat.CODE128,
    height: 100,
    width: 3,
    showText: true
  });
  // commands 可发送到打印机
}
```

### EAN-13 商品条码

```typescript
// EAN-13 需要 12 位数字（自动计算校验位）或 13 位数字（验证校验位）
const ean13Content = '690123456789'; // 12 位，自动计算校验位

const commands = generator.generate(ean13Content, {
  format: BarcodeFormat.EAN13,
  height: 80,
  width: 2,
  showText: true,
  textPosition: 'below'
});
```

### QR 码

```typescript
const commands = generator.generate('https://example.com', {
  format: BarcodeFormat.QR_CODE,
  height: 8,               // 模块大小 1-16
  errorCorrection: 'H',   // 最高纠错级别
  qrModel: 2              // QR Model 2
});
```

### PDF417 二维条码

```typescript
const commands = generator.generate('This is PDF417 data', {
  format: BarcodeFormat.PDF417,
  pdf417Columns: 3,        // 列数
  pdf417Security: 4,       // 安全级别
  pdf417Compression: 2    // 压缩模式
});
```

### 与打印机结合使用

```typescript
import { createBluetoothPrinter, WebBluetoothAdapter, BarcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';

async function printBarcode() {
  const printer = createBluetoothPrinter({
    adapter: new WebBluetoothAdapter()
  });

  const generator = new BarcodeGenerator();

  await printer.connect('device-id');

  // 生成条码命令
  const barcodeCommands = generator.generate('1234567890128', {
    format: BarcodeFormat.EAN13,
    height: 80,
    width: 3,
    showText: true
  });

  // 合并到打印任务
  await printer
    .align('center')
    .text('商品条码')
    .feed()
    // 手动发送条码命令（实际使用中通常通过 printer.barcode() 方法）
    .print();

  await printer.disconnect();
}
```

## 验证示例

### Code39 验证

```typescript
const result = generator.validate('ABC-123', BarcodeFormat.CODE39);
// Code39 支持: 0-9, A-Z, space, - . $ / + %
```

### ITF 验证

```typescript
const result = generator.validate('1234567890', BarcodeFormat.ITF);
// ITF 必须为偶数位数字
```

### CODABAR 验证

```typescript
const result = generator.validate('A1234567890B', BarcodeFormat.CODABAR);
// CODABAR 必须以 A/B/C/D 开头和结尾
```

## 注意事项

1. **校验位**：EAN-13、EAN-8、UPC-A 格式如果提供完整位数会自动验证校验位
2. **长度限制**：不同格式有不同长度限制，请参考 `ValidationResult` 中的错误信息
3. **QR 码大小**：模块大小 `height` 参数在 QR 码中表示模块尺寸，范围 1-16
4. **PDF417 压缩**：如包含中文字符，建议使用压缩模式
5. **编码**：所有文本默认使用 UTF-8 编码发送至打印机
