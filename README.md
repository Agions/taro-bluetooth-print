# Taro Bluetooth Print

<p align="center">
  <img src="https://img.shields.io/npm/v/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="npm version">
  <img src="https://img.shields.io/npm/dm/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="downloads">
  <img src="https://img.shields.io/npm/l/taro-bluetooth-print?style=flat-square&color=00d8ff" alt="license">
  <img src="https://img.shields.io/github/stars/agions/taro-bluetooth-print?style=flat-square" alt="stars">
  <img src="https://img.shields.io/github/forks/agions/taro-bluetooth-print?style=flat-square" alt="forks">
  <img src="https://img.shields.io/bundlephobia/minzip/taro-bluetooth-print?style=flat-square" alt="bundle size">
</p>

**High-performance Bluetooth printing library for Taro and cross-platform applications.**

Supports thermal receipt printers, label printers, and 8+ platforms.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Byte Buffer Optimization** | Direct byte buffer operations with service-side caching |
| **8 Platform Adapters** | WeChat, Alipay, Baidu, ByteDance, QQ, H5, HarmonyOS, React Native |
| **5 Driver Protocols** | ESC/POS, TSPL, ZPL, CPCL, STAR |

### Advanced Printing

| Feature | Description |
|---------|-------------|
| **Image Dithering** | 6 algorithms: Floyd-Steinberg, Atkinson, Ordered, Halftone, Sierra, Stucki |
| **Image Preprocessing** | Denoise, sharpen, gamma correction, color level compression |
| **QR / Barcode** | Native指令 support, format validation, multiple symbologies |
| **Print Preview** | Render ESC/POS commands to image preview |
| **Template Engine** | Built-in receipt and label templates |

### Queue & Reliability

| Feature | Description |
|---------|-------------|
| **Pause / Resume / Cancel** | Breakpoint continuation for print jobs |
| **Offline Cache** | Auto-cache when offline, sync when connected |
| **Print Queue** | Priority-based ordering with automatic retry |
| **Scheduled Retry** | Exponential backoff, configurable timing, resume on restart |
| **Batch Optimization** | Merge small tasks, auto-flush, continuous cut support |

### Management & Operations

| Feature | Description |
|---------|-------------|
| **Multi-Printer Manager** | `MultiPrinterManager` for concurrent device management |
| **Print History** | `PrintHistory` tracks records and statistics |
| **Printer Status** | `PrinterStatus` detects paper/ink levels |
| **Statistics** | `PrintStatistics` full lifecycle tracking by date/driver |

### Developer Experience

| Feature | Description |
|---------|-------------|
| **TypeScript** | Full type definitions and JSDoc |
| **Tree-shaking** | Unused code eliminated at build time |
| **Lazy Encoding** | Encoding tables loaded on-demand |
| **Plugin System** | Extensible architecture with custom hooks |

### Encoding Support

GBK / GB2312 / Big5 / UTF-8 / EUC-KR / Shift-JIS / ISO-2022-JP

---

## Performance

| Metric | Value |
|--------|-------|
| Bundle Size | **26 KB** (gzip) |
| Tree-shaking | Supported |
| Lazy Loading | Encoding tables loaded on-demand |

---

## Quick Start

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

async function print() {
  // 1. Scan for devices
  const manager = new DeviceManager();
  await manager.startScan({ timeout: 10000 });
  const devices = manager.getDiscoveredDevices();

  if (devices.length === 0) {
    console.log('No devices found');
    return;
  }

  // 2. Connect to printer
  const printer = new BluetoothPrinter();
  await printer.connect(devices[0].deviceId);

  // 3. Print
  await printer
    .text('=== Welcome ===', 'GBK')
    .feed()
    .text('Item A     x1    $10.00', 'GBK')
    .text('Item B     x2    $20.00', 'GBK')
    .feed()
    .text('------------------------')
    .text('Total:            $30.00', 'GBK')
    .feed(2)
    .qr('https://example.com')
    .feed(2)
    .cut()
    .print();

  // 4. Disconnect
  await printer.disconnect();

  console.log('Print complete!');
}
```

> For full documentation, visit the [official guide](https://agions.github.io/taro-bluetooth-print/guide/getting-started).

---

## Platform Support

| Platform | Adapter | Status |
|----------|---------|--------|
| WeChat Mini Program | `TaroAdapter` | [x] |
| H5 (Web Bluetooth) | `WebBluetoothAdapter` | [x] |
| Alipay Mini Program | `AlipayAdapter` | [x] |
| Baidu Mini Program | `BaiduAdapter` | [x] |
| ByteDance Mini Program | `ByteDanceAdapter` | [x] |
| QQ Mini Program | `QQAdapter` | [x] |
| HarmonyOS | `HarmonyOSAdapter` | [x] |
| React Native | `ReactNativeAdapter` | [x] |

---

## Driver Support

| Driver | Protocol | Use Case |
|--------|----------|----------|
| `EscPos` | ESC/POS | Thermal receipt printers (58/80mm) |
| `TsplDriver` | TSPL | TSC label printers |
| `ZplDriver` | ZPL | Zebra label printers |
| `CpclDriver` | CPCL | HP / Honeywell mobile printers |
| `StarPrinter` | STAR | STAR TSP/SP700 series |

### Label Printing Example (TSPL)

```typescript
import { BluetoothPrinter, TsplDriver } from 'taro-bluetooth-print';

const driver = new TsplDriver();
const printer = new BluetoothPrinter(undefined, driver);

driver
  .size(60, 40)           // 60x40mm label
  .gap(3)                 // 3mm gap
  .clear()
  .text('Product Name', { x: 20, y: 20, font: 3 })
  .text('$99.00', { x: 20, y: 60, font: 4 })
  .barcode('6901234567890', { x: 20, y: 100, type: 'EAN13' })
  .qrcode('https://example.com', { x: 250, y: 20 })
  .print(1);

await printer.connect(deviceId);
await printer.print();
```

---

## Configuration

```typescript
const printer = new BluetoothPrinter();

// Adapter options
printer.setOptions({
  chunkSize: 20,   // Chunk size (default: 20)
  delay: 20,       // Chunk interval ms (default: 20)
  retries: 3,      // Retry count (default: 3)
});

// Event listeners
printer.on('progress', ({ sent, total }) => {
  console.log(`Progress: ${(sent / total * 100).toFixed(1)}%`);
});

printer.on('error', (error) => {
  console.error('Error:', error.code, error.message);
});

printer.on('print-complete', () => {
  console.log('Print complete');
});
```

---

## Architecture

```
+---------------------------------------------------------------+
|                     BluetoothPrinter (Core)                   |
|  - Connection  - Queue  - Events  - Breakpoint Continuation   |
+------------------------+--------------------------------------+
                         |
          +--------------+--------------+
          |                              |
    +-----v-----+                  +----v-----+
    |  Adapter  |                  |  Driver  |
    |    Layer  |                  |   Layer  |
    +-----------+                  +----------+
          |                              |
    +-----+-----+              +----+----+----+
    |         |              |         |      |
  Taro    Web BT         ESC/POS    TSPL    ZPL
  HarmonyOS              CPCL       STAR
                            |
                     +-------+-------+
                     |   Services   |
                     |  Plugin API  |
                     +--------------+
```

---

## Documentation

- [Getting Started](https://agions.github.io/taro-bluetooth-print/guide/getting-started) - 5-minute quickstart
- [Features](https://agions.github.io/taro-bluetooth-print/guide/features) - Complete feature guide
- [Drivers](https://agions.github.io/taro-bluetooth-print/guide/drivers) - ESC/POS, TSPL, ZPL, CPCL
- [Core Concepts](https://agions.github.io/taro-bluetooth-print/guide/core-concepts) - Architecture and design
- [API Reference](https://agions.github.io/taro-bluetooth-print/api) - Full API documentation
- [Troubleshooting](https://agions.github.io/taro-bluetooth-print/guide/troubleshooting) - Common issues

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
# Clone the repository
git clone https://github.com/agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Local docs
npm run docs:dev
```

---

## License

[MIT](./LICENSE) - Copyright (c) Agions

---

## Acknowledgments

- [Taro](https://taro.jd.com/) - Cross-platform framework
- [ESC/POS](https://www.epson-biz.com/) - Printer instruction set
- All contributors and beta testers
