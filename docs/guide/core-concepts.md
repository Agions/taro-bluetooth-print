# 核心概念

## 架构设计

`taro-bluetooth-print` 采用分层架构设计，主要分为以下几层：

```
┌─────────────────────────────────────────┐
│              应用层                      │
│   (BluetoothPrinter, DeviceManager...)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│              驱动层 (Driver)              │
│   (EscPos, TsplDriver, ZplDriver...)   │
│   负责生成打印机指令                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│              适配层 (Adapter)            │
│   (TaroAdapter, WebBluetooth...)       │
│   负责底层蓝牙通信                        │
└─────────────────────────────────────────┘
```

## 核心组件

### 1. BluetoothPrinter (主类)

主入口类，负责协调驱动和适配器。

```typescript
const printer = new BluetoothPrinter(adapter, driver);

// 连接 → 打印 → 断开
await printer.connect(deviceId);
await printer.text('Hello').cut().print();
await printer.disconnect();
```

### 2. Driver (驱动)

驱动负责将高级 API 转换为打印机指令。

| 驱动 | 适用打印机 | 协议 |
|------|-----------|------|
| EscPos | 热敏票据打印机 | ESC/POS |
| TsplDriver | TSC 标签打印机 | TSPL |
| ZplDriver | Zebra 标签打印机 | ZPL |
| CpclDriver | HP/霍尼韦尔打印机 | CPCL |

### 3. Adapter (适配器)

适配器负责与不同平台的蓝牙 API 对接。

| 适配器 | 平台 |
|--------|------|
| TaroAdapter | 微信/支付宝/百度/字节跳动小程序 |
| WebBluetoothAdapter | H5 (浏览器) |

### 4. DeviceManager (设备管理)

独立的设备扫描和管理工具。

```typescript
const manager = new DeviceManager();

manager.on('device-found', (device) => {
  console.log(device.name, device.deviceId);
});

await manager.startScan({ timeout: 10000 });
const devices = manager.getDiscoveredDevices();
```

### 5. PrintQueue (打印队列)

管理多个打印任务，支持优先级和重试。

```typescript
const queue = new PrintQueue({ maxSize: 50 });

// 添加任务
queue.add(printData, { priority: 'HIGH' });

// 监听完成
queue.on('job-completed', (job) => {
  console.log('任务完成:', job.id);
});
```

### 6. OfflineCache (离线缓存)

网络断开时自动缓存任务，恢复后自动同步。

```typescript
const cache = new OfflineCache();

// 断网时保存
await cache.save({ id: 'job-1', data: printData });

// 重连后同步
await cache.sync();
```

## 数据流

```
用户代码
   │
   ▼
BluetoothPrinter.text() / .qr() / .barcode()
   │
   ▼ (构建指令)
Driver (EscPos/Tspl/Zpl/Cpcl)
   │
   ▼ (获取 Uint8Array)
Printer.print()
   │
   ▼ (分片写入)
Adapter.write()
   │
   ▼ (BLE 通信)
打印机
```

## 事件系统

Printer 使用 EventEmitter 模式：

```typescript
// 进度
printer.on('progress', ({ sent, total }) => {
  const pct = (sent / total * 100).toFixed(1);
  console.log(`进度: ${pct}%`);
});

// 错误
printer.on('error', (err) => {
  console.error(err.code, err.message);
});

// 完成
printer.on('print-complete', () => {
  console.log('打印完成');
});
```

## 编码支持

| 编码 | 说明 | 适用场景 |
|------|------|----------|
| GBK | 中文简体 | 中国产热敏打印机 |
| GB2312 | 简体中文 | 老旧打印机 |
| Big5 | 中文繁体 | 台湾/香港打印机 |
| UTF-8 | Unicode | 支持 Unicode 的打印机 |

```typescript
// 自动检测最佳编码
const encoding = encodingService.detectEncoding('Hello 你好');
// => 'UTF-8' (混合内容)

// 手动指定
driver.text('中文', 'GBK');
```

## 断点续传原理

```
┌─────────────────────────────────────┐
│           打印大数据                │
│         (10000 字节)                │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           分片发送                  │
│  [0-1000] [1000-2000] [2000-3000]  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           暂停/恢复                  │
│  暂停时保存位置，恢复后从断点继续    │
└─────────────────────────────────────┘
```

```typescript
const promise = printer.print();

setTimeout(() => {
  printer.pause();  // 暂停
  console.log(printer.remaining()); // 查看剩余
}, 5000);

setTimeout(() => {
  printer.resume();  // 恢复
}, 10000);
```

## 插件系统

v2.3+ 支持插件扩展：

```typescript
import { PluginManager, createLoggingPlugin } from 'taro-bluetooth-print';

const plugins = new PluginManager();

// 添加日志插件
plugins.register(createLoggingPlugin({
  logProgress: true
}));

// 自定义插件
plugins.register({
  name: 'my-plugin',
  hooks: {
    beforePrint: (buffer) => {
      console.log('即将打印', buffer.length, '字节');
      return buffer;
    },
    afterPrint: (bytesSent) => {
      console.log('已打印', bytesSent, '字节');
    }
  }
});
```
