# 快速开始

## 安装

```bash
# npm
npm install taro-bluetooth-print

# yarn
yarn add taro-bluetooth-print

# pnpm
pnpm add taro-bluetooth-print
```

## 微信小程序示例

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

async function main() {
  // 1. 创建设备管理器并扫描
  const deviceManager = new DeviceManager();
  
  // 监听设备发现
  deviceManager.on('device-found', (device) => {
    console.log('发现设备:', device.name, device.deviceId);
  });
  
  // 开始扫描 (10秒)
  await deviceManager.startScan({ timeout: 10000 });
  
  // 获取设备列表
  const devices = deviceManager.getDiscoveredDevices();
  console.log('设备列表:', devices);
  
  if (devices.length === 0) {
    console.log('未发现设备');
    return;
  }
  
  // 2. 连接打印机
  const printer = new BluetoothPrinter();
  const targetDevice = devices[0]; // 选择第一个设备
  
  await printer.connect(targetDevice.deviceId);
  console.log('已连接:', targetDevice.name);
  
  // 3. 构建打印内容
  await printer
    .text('=== 欢迎光临 ===', 'GBK')
    .feed()
    .text('商品A     x1    ¥10.00', 'GBK')
    .text('商品B     x2    ¥20.00', 'GBK')
    .feed()
    .text('------------------------', 'GBK')
    .text('合计：            ¥30.00', 'GBK')
    .feed(2)
    .qr('https://example.com', { size: 6 })
    .feed(2)
    .cut()
    .print();
  
  console.log('打印完成!');
  
  // 4. 断开连接
  await printer.disconnect();
}

main();
```

## H5 Web Bluetooth 示例

```typescript
import { BluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

async function main() {
  // 使用 Web Bluetooth 适配器
  const adapter = new WebBluetoothAdapter();
  const printer = new BluetoothPrinter(adapter);
  
  // 请求设备
  await adapter.requestDevice();
  
  // 连接
  const devices = adapter.getDiscoveredDevices();
  if (devices.length === 0) {
    console.log('请选择设备');
    return;
  }
  
  await printer.connect(devices[0].deviceId);
  
  // 打印
  await printer
    .text('Hello Web Bluetooth!', 'UTF-8')
    .feed()
    .cut()
    .print();
    
  await printer.disconnect();
}
```

## 标签打印示例 (TSPL)

```typescript
import { BluetoothPrinter, TsplDriver } from 'taro-bluetooth-print';

async function printLabel() {
  // 使用 TSPL 驱动
  const driver = new TsplDriver();
  const printer = new BluetoothPrinter(undefined, driver);
  
  // 构建标签内容
  driver
    .size(60, 40)           // 60x40mm 标签
    .gap(3)                 // 间隙 3mm
    .clear()
    .text('商品名称', { x: 20, y: 20, font: 3 })
    .text('¥99.00', { x: 20, y: 60, font: 4, xMultiplier: 2 })
    .barcode('6901234567890', { 
      x: 20, 
      y: 100, 
      type: 'EAN13',
      height: 50 
    })
    .qrcode('https://shop.example.com/item/123', { 
      x: 250, 
      y: 20, 
      cellWidth: 4 
    })
    .print(1);
  
  await printer.connect(deviceId);
  await printer.print();
}
```

## 标签打印示例 (ZPL)

```typescript
import { BluetoothPrinter, ZplDriver } from 'taro-bluetooth-print';

async function printZplLabel() {
  const driver = new ZplDriver();
  const printer = new BluetoothPrinter(undefined, driver);
  
  // 构建 ZPL 标签
  driver
    .startFormat()
    .labelHome(20, 20)
    .text('产品标签', { x: 50, y: 50 })
    .barcode('1234567890', { x: 50, y: 120, type: '128', height: 60 })
    .qrcode('https://example.com', { x: 300, y: 50 })
    .box({ x: 10, y: 10, width: 380, height: 250, borderThickness: 2 })
    .quantity(1)
    .print();
  
  await printer.connect(deviceId);
  await printer.print();
}
```

## 配置参数

```typescript
const printer = new BluetoothPrinter();

// 适配器参数 (蓝牙传输)
printer.setOptions({
  chunkSize: 20,    // 每次发送字节数 (默认 20)
  delay: 20,        // 分片间隔 ms (默认 20)
  retries: 3,       // 失败重试次数 (默认 3)
});

// 监听打印进度
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  console.log(`打印进度: ${percent}%`);
});

// 监听错误
printer.on('error', (error) => {
  console.error('打印错误:', error.code, error.message);
});

// 监听完成
printer.on('print-complete', () => {
  console.log('打印完成！');
});
```

## 断点续传

```typescript
// 构建大量打印内容
printer
  .text('第1页内容...')
  .feed(10)
  .text('第2页内容...')
  .feed(10)
  .text('第3页内容...');

// 开始打印 (异步)
const printPromise = printer.print();

// 5秒后暂停
setTimeout(() => {
  printer.pause();
  console.log('已暂停，剩余:', printer.remaining(), '字节');
}, 5000);

// 再过5秒恢复
setTimeout(async () => {
  await printer.resume();
  console.log('已恢复打印');
}, 10000);

await printPromise;
```

## 常用指令速查

| 功能 | 方法 |
|------|------|
| 打印文本 | `.text('内容', 'GBK')` |
| 换行 | `.feed()` 或 `.feed(3)` |
| 二维码 | `.qr('内容', { size: 6 })` |
| 条码 | `.barcode('123456', 'EAN13')` |
| 切纸 | `.cut()` |
| 对齐 | `.align('center')` |
| 加粗 | `.setBold(true)` |
| 字体大小 | `.setSize(2, 2)` |
