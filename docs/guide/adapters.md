# 平台适配器

`taro-bluetooth-print` 支持多种平台，通过适配器模式实现跨平台支持。

## 适配器概览

| 适配器 | 平台 | 支持状态 |
|--------|------|----------|
| `TaroAdapter` | 微信/支付宝/百度/字节跳动小程序 | ✅ 完整支持 |
| `WebBluetoothAdapter` | H5 (浏览器) | ✅ 完整支持 |
| `HarmonyOSAdapter` | 鸿蒙 HarmonyOS | ✅ 新增支持 |

## TaroAdapter

适用于基于 Taro 框架开发的各种小程序平台。

### 支持的平台

- 微信小程序
- 支付宝小程序
- 百度小程序
- 字节跳动小程序 (抖音/头条)
- React Native (通过 Taro RN)

### 使用方式

```typescript
import { BluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const adapter = new TaroAdapter();
const printer = new BluetoothPrinter(adapter);

// 扫描设备
const devices = await adapter.scanDevices();

// 连接
await printer.connect(deviceId);

// 打印
await printer.text('Hello').cut().print();
```

### 特性

- 自动服务发现
- 自动特征值识别
- 写入分片
- 错误重试

---

## WebBluetoothAdapter

适用于 H5 环境，需要浏览器支持 Web Bluetooth API。

### 浏览器支持

| 浏览器 | 支持版本 | 备注 |
|--------|----------|------|
| Chrome | 56+ | 完整支持 |
| Edge | 79+ | 完整支持 |
| Opera | 43+ | 完整支持 |
| Safari | ❌ | 不支持 |
| Firefox | ❌ | 不支持 |

### 使用方式

```typescript
import { BluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

const adapter = new WebBluetoothAdapter();

// 请求设备 (会弹出浏览器选择框)
await adapter.requestDevice({
  filters: [{
    name: '热敏打印机'  // 可选：过滤设备名称
  }],
  optionalServices: ['00001800-0000-1000-8000-00805f9b34fb']
});

const printer = new BluetoothPrinter(adapter);
await printer.connect(deviceId);
await printer.text('Hello from Web!').cut().print();
```

### 特性

- 浏览器原生 BLE 支持
- 无需安装，直接在网页使用
- 支持 HTTPS 或 localhost

### 注意事项

1. **必须 HTTPS** - 生产环境必须使用 HTTPS
2. **需要用户交互** - 必须由用户主动触发设备选择
3. **跨域限制** - 不支持 file:// 协议

---

## HarmonyOSAdapter

适用于华为鸿蒙 HarmonyOS 设备，提供原生 BLE 支持。

### 使用方式

```typescript
import { BluetoothPrinter, HarmonyOSAdapter } from 'taro-bluetooth-print';

const adapter = new HarmonyOSAdapter({
  debug: true,      // 开启调试日志
  timeout: 10000,   // 连接超时
  autoReconnect: false  // 自动重连
});

const printer = new BluetoothPrinter(adapter);

// 检查蓝牙状态
const enabled = await adapter.isEnabled();
if (!enabled) {
  await adapter.enable();
}

// 扫描设备
const devices = await adapter.scan(10000);

// 连接并打印
await printer.connect(devices[0].deviceId);
await printer.text('Hello HarmonyOS!').cut().print();
```

### 特性

- 原生 HarmonyOS BLE API
- 完整的 GATT 支持
- 通知/订阅
- RSSI 信号检测

### 设备信息

```typescript
// 扫描时获取设备信息
adapter.onDeviceFound((device) => {
  console.log('设备:', device.name);
  console.log('ID:', device.deviceId);
  console.log('信号:', device.RSSI);
});
```

---

## 选择适配器

根据您的开发平台选择合适的适配器：

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';
import { TaroAdapter } from './adapters/TaroAdapter';
import { WebBluetoothAdapter } from './adapters/WebBluetoothAdapter';
import { HarmonyOSAdapter } from './adapters/HarmonyOSAdapter';
import { detectPlatform } from './utils/platform';

// 自动检测平台
const platform = detectPlatform();

let adapter;
switch (platform) {
  case 'wechat':
  case 'alipay':
  case 'baidu':
  case 'bytedance':
    adapter = new TaroAdapter();
    break;
  case 'web':
    adapter = new WebBluetoothAdapter();
    break;
  case 'harmonyos':
    adapter = new HarmonyOSAdapter();
    break;
  default:
    adapter = new TaroAdapter(); // 默认
}

const printer = new BluetoothPrinter(adapter);
```

---

## 自定义适配器

如果需要支持其他平台，可以实现 `IPrinterAdapter` 接口：

```typescript
import { IPrinterAdapter, IAdapterOptions, PrinterState } from 'taro-bluetooth-print';

class MyCustomAdapter implements IPrinterAdapter {
  async connect(deviceId: string): Promise<void> {
    // 实现连接逻辑
  }
  
  async disconnect(deviceId: string): Promise<void> {
    // 实现断开逻辑
  }
  
  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    // 实现写入逻辑
  }
  
  // 可选：实现状态回调
  onStateChange?(callback: (state: PrinterState) => void): void {
    // 监听状态变化
  }
}

const printer = new BluetoothPrinter(new MyCustomAdapter());
```
