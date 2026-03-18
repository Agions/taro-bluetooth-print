# 示例项目

本目录包含 `taro-bluetooth-print` 库在各个平台上的完整使用示例。

## 目录结构

```
examples/
├── weapp/           # 微信小程序示例
│   ├── printer-page.tsx    # 完整打印页面
│   └── pages.json          # 页面配置
│
├── h5/              # H5 Web Bluetooth 示例
│   └── index.html         # 完整的 HTML 示例
│
├── harmonyos/      # 鸿蒙 HarmonyOS 示例
│   └── harmony-print-service.ts  # 打印服务类
│
├── react-native/   # React Native 示例
│   └── PrinterScreen.tsx   # 打印屏幕组件
│
└── label-print/    # 标签打印完整示例
    ├── tspl-label.ts      # TSPL 标签打印
    └── zpl-label.ts      # ZPL 标签打印
```

## 快速开始

### 微信小程序

```bash
# 1. 安装依赖
npm install taro-bluetooth-print

# 2. 复制示例代码到 pages 目录

# 3. 配置 app.json
```

详细说明: [weapp/README.md](weapp/README.md)

### H5 Web Bluetooth

```bash
# 1. 构建库
npm run build

# 2. 启动本地服务器
npx serve examples/h5

# 3. 浏览器打开 (需要 HTTPS 或 localhost)
```

详细说明: [h5/README.md](h5/README.md)

### 鸿蒙 HarmonyOS

```typescript
// 1. 安装
npm install taro-bluetooth-print

// 2. 引入使用
import { HarmonyPrintService } from './harmony-print-service';

const service = new HarmonyPrintService();
await service.scanDevices();
await service.connect(deviceId);
await service.printTestPage();
```

详细说明: [harmonyos/README.md](harmonyos/README.md)

### React Native

```bash
# 1. 安装
npm install taro-bluetooth-print

# 2. iOS 原生配置
cd ios && pod install

# 3. 使用组件
import PrinterScreen from './PrinterScreen';
```

详细说明: [react-native/README.md](react-native/README.md)

## 常见示例

### 1. 打印收据

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter();
await printer.connect(deviceId);

// 构建收据内容
await printer
  .align('center')
  .setSize(2, 2)
  .text('商店名称', 'GBK')
  .resetStyle()
  .feed()
  .text('------------------------', 'GBK')
  .feed();

// 商品明细
const items = [
  { name: '商品A', price: 10, qty: 2 },
  { name: '商品B', price: 20, qty: 1 },
];
const total = 40;

items.forEach(item => {
  const line = `${item.name} x${item.qty}`.padEnd(15) + `¥${item.price * item.qty}`;
  printer.text(line, 'GBK');
});

await printer
  .feed()
  .text('------------------------', 'GBK')
  .feed()
  .setBold(true)
  .text(`合计: ¥${total}`, 'GBK')
  .resetStyle()
  .feed(3)
  .cut()
  .print();
```

### 2. 打印标签 (TSPL)

```typescript
import { BluetoothPrinter, TsplDriver } from 'taro-bluetooth-print';

const driver = new TsplDriver();
const printer = new BluetoothPrinter(undefined, driver);

driver
  .size(60, 40)           // 60x40mm
  .gap(3)                 // 3mm 间隙
  .clear()
  .text('商品名称', { x: 20, y: 20, font: 3 })
  .text('¥99.00', { x: 20, y: 60, font: 4 })
  .barcode('6901234567890', { x: 20, y: 100, type: 'EAN13' })
  .qrcode('https://example.com', { x: 250, y: 20 })
  .print(1);

await printer.connect(deviceId);
await printer.print();
```

### 3. 打印标签 (ZPL)

```typescript
import { BluetoothPrinter, ZplDriver } from 'taro-bluetooth-print';

const driver = new ZplDriver();
const printer = new BluetoothPrinter(undefined, driver);

driver
  .startFormat()
  .labelHome(20, 20)
  .text('商品标签', { x: 50, y: 50 })
  .barcode('1234567890', { x: 50, y: 120, type: '128', height: 60 })
  .qrcode('https://example.com', { x: 300, y: 50 })
  .box({ x: 10, y: 10, width: 380, height: 200 })
  .quantity(1)
  .print();

await printer.connect(deviceId);
await printer.print();
```

### 4. 使用打印队列

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({ maxSize: 100 });

// 添加任务
queue.add(printData1, { priority: 'HIGH' });
queue.add(printData2, { priority: 'NORMAL' });
queue.add(printData3, { priority: 'LOW' });

// 监听
queue.on('job-completed', (job) => {
  console.log('任务完成:', job.id);
});

queue.on('job-failed', (job, error) => {
  console.error('任务失败:', job.id, error);
});
```

### 5. 断点续传

```typescript
// 大批量打印时支持暂停
const printPromise = printer.print();

setTimeout(() => {
  printer.pause();
  console.log('已暂停，剩余:', printer.remaining());
}, 5000);

setTimeout(async () => {
  await printer.resume();
}, 10000);

await printPromise;
```

## 平台差异

| 功能 | 微信小程序 | H5 | 鸿蒙 | React Native |
|------|-----------|-----|------|--------------|
| 蓝牙扫描 | ✅ | ✅ | ✅ | ✅ |
| BLE 连接 | ✅ | ✅ | ✅ | ✅ |
| 打印收据 | ✅ | ✅ | ✅ | ✅ |
| 打印标签 | ✅ | ✅ | ✅ | ✅ |
| 断点续传 | ✅ | ✅ | ✅ | ✅ |
| 打印队列 | ✅ | ✅ | ✅ | ✅ |

## 故障排查

1. **无法扫描设备**
   - 检查蓝牙权限
   - 确认设备已开启蓝牙
   - 靠近设备

2. **连接成功但打印失败**
   - 检查打印机是否支持 ESC/POS
   - 尝试增加 chunkSize
   - 查看错误日志

3. **打印乱码**
   - 确认编码设置正确 (GBK/UTF-8)
   - 打印机可能只支持特定编码

更多问题请查看 [故障排除文档](../docs/guide/troubleshooting.md)
