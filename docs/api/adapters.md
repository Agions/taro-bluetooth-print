# 平台适配器（Adapters）

`taro-bluetooth-print/adapters` 子模块 — 屏蔽各平台 BLE API 差异的统一接口。`IPrinterAdapter` 是核心抽象，连接 / 断开 / 写数据 / 设备发现都通过它。

## 导入

```typescript
import {
  TaroAdapter,        // 微信小程序
  AlipayAdapter,      // 支付宝小程序
  BaiduAdapter,       // 百度智能小程序
  ByteDanceAdapter,   // 字节跳动小程序
  QQAdapter,          // QQ 小程序
  WebBluetoothAdapter,// H5 / Web Bluetooth
  ReactNativeAdapter, // React Native
  AdapterFactory,     // 自动选择（按平台）
} from 'taro-bluetooth-print/adapters';
```

## 自动选择（推荐）

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({ adapter: AdapterFactory.create() });
```

`AdapterFactory.create()` 检测当前运行平台（`wx` / `my` / `swan` / `tt` / `qq` / `navigator.bluetooth`）并返回对应 adapter。

## 各平台 adapter

### 微信小程序

```typescript
import { TaroAdapter } from 'taro-bluetooth-print/adapters';

const adapter = new TaroAdapter();
const printer = createBluetoothPrinter({ adapter });

// 设备发现
adapter.on('device-found', device => console.log('Found:', device.name));
await adapter.startDiscovery();
```

底层调用 `wx.startBluetoothDevicesDiscovery` / `wx.createBLEConnection` / `wx.writeBLECharacteristicValue`。

### H5 / Web Bluetooth

```typescript
import { WebBluetoothAdapter } from 'taro-bluetooth-print/adapters';

const adapter = new WebBluetoothAdapter();
const printer = createBluetoothPrinter({ adapter });
```

浏览器需支持 Web Bluetooth API（Chrome / Edge），需 HTTPS。

### React Native

需要 `react-native-ble-manager` 或 `react-native-ble-plx`：

```typescript
import { ReactNativeAdapter } from 'taro-bluetooth-print/adapters';
import BleManager from 'react-native-ble-manager';

const adapter = new ReactNativeAdapter({ bleManager: BleManager });
```

## 设备发现

```typescript
adapter.on('device-found', (device: DeviceInfo) => {
  console.log(`${device.name} (${device.id}) RSSI=${device.rssi}`);
});

await adapter.startDiscovery();
// ... 用户选择设备 ...
await adapter.stopDiscovery();
```

## 写入数据

adapter 的 `write()` 由 `PrintJobManager` 自动调用，**用户一般不直接调用**。若需绕过：

```typescript
const connectedAdapter = printer.getConnectionManager().getAdapter();
await connectedAdapter.write(deviceId, buffer, { chunkSize: 100 });
```

## 自定义 Adapter

实现 `IPrinterAdapter` 接口（5 个方法）：

```typescript
import type { IPrinterAdapter, DeviceInfo, IAdapterOptions } from 'taro-bluetooth-print/types';

class MyAdapter implements IPrinterAdapter {
  async connect(deviceId: string, options?: IAdapterOptions): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> { /* ... */ }
  async startDiscovery(): Promise<void> { /* ... */ }
  async stopDiscovery(): Promise<void> { /* ... */ }
  onStateChange(handler: (state: PrinterState, deviceId?: string) => void): () => void { /* ... */ }
}
```

## 相关

- [Types](./types.md#iprinteradapter) — `IPrinterAdapter` 接口定义
- [Factory](./factory.md) — `createBluetoothPrinter()` 工厂函数
- [BluetoothPrinter](./bluetooth-printer.md) — 使用示例