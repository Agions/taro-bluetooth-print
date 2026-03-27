# 平台适配器

`taro-bluetooth-print` 通过适配器模式接入不同平台的蓝牙 API，实现一套代码跨平台运行。

## 适配器概览

| 适配器 | 平台 | 说明 |
|--------|------|------|
| `TaroAdapter` | 微信 / 支付宝 / 百度 / 字节跳动小程序 | Taro 框架自动路由 |
| `AlipayAdapter` | 支付宝小程序 | 原生适配 |
| `BaiduAdapter` | 百度小程序 | 原生适配 |
| `ByteDanceAdapter` | 字节跳动小程序（抖音/头条） | 原生适配 |
| `QQAdapter` | QQ 小程序 | 原生适配 |
| `ReactNativeAdapter` | React Native | 使用 RN BLE 模块 |
| `WebBluetoothAdapter` | H5 浏览器 | Web Bluetooth API |

---

## TaroAdapter

适用于所有基于 Taro 框架的小程序平台，是**最推荐的适配器**。

```typescript
import { BluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const adapter = new TaroAdapter();
const printer = new BluetoothPrinter(adapter);
```

在 Taro 环境下使用时，框架会自动识别当前平台（微信/支付宝/百度/字节），无需手动选择。

### 权限配置

**微信小程序** — `app.json`：

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

**支付宝小程序** — `app.json`：

```json
{
  "permissions": {
    "location": {
      "desc": "用于扫描蓝牙打印机"
    }
  }
}
```

---

## WebBluetoothAdapter

适用于 H5 环境，需要浏览器支持 Web Bluetooth API。

### 浏览器兼容性

| 浏览器 | 支持情况 |
|--------|---------|
| Chrome | ✅ 56+ |
| Edge | ✅ 79+ |
| Opera | ✅ 43+ |
| Safari | ❌ 不支持 |
| Firefox | ❌ 不支持 |

::: warning 注意
Web Bluetooth **必须在 HTTPS 环境**或 `localhost` 下使用。Safari 和 Firefox 暂不支持。
:::

### 使用方式

```typescript
import { BluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

async function connectPrinter() {
  const adapter = new WebBluetoothAdapter();

  // 请求设备（会弹出系统设备选择框）
  await adapter.requestDevice({
    filters: [{ name: '热敏打印机' }],
    optionalServices: [
      '00001800-0000-1000-8000-00805f9b34fb', // GAP
      '00001801-0000-1000-8000-00805f9b34fb', // GATT
    ],
  });

  // 获取已选设备
  const devices = adapter.getDiscoveredDevices();
  if (devices.length === 0) {
    throw new Error('未选择设备');
  }

  // 创建打印机并连接
  const printer = new BluetoothPrinter(adapter);
  await printer.connect(devices[0].deviceId);

  return printer;
}
```

### 请求选项

```typescript
interface WebBluetoothRequestOptions {
  filters?: Array<{
    name?: string;                  // 按设备名称过滤
    namePrefix?: string;             // 按名称前缀过滤
    services?: string[];            // 按服务 UUID 过滤
  }>;
  optionalServices?: string[];       // 可选服务列表
  acceptAllDevices?: boolean;        // 接受所有设备
}
```

---

## ReactNativeAdapter

适用于 React Native 项目，使用原生 BLE 模块进行蓝牙通信。

```typescript
import { BluetoothPrinter, ReactNativeAdapter } from 'taro-bluetooth-print';

const adapter = new ReactNativeAdapter();
const printer = new BluetoothPrinter(adapter);
```

::: tip 提示
ReactNativeAdapter 需要配合 React Native 的 BLE 库（如 `react-native-ble-plx` 或 `react-native-ble-manager`）使用。
:::

---

## AlipayAdapter

支付宝小程序专用适配器。

```typescript
import { AlipayAdapter } from 'taro-bluetooth-print';

const adapter = new AlipayAdapter();
const printer = new BluetoothPrinter(adapter);
```

### 支付宝权限配置

```json
{
  "permissions": {
    "Bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

---

## BaiduAdapter

百度小程序专用适配器。

```typescript
import { BaiduAdapter } from 'taro-bluetooth-print';

const adapter = new BaiduAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## ByteDanceAdapter

字节跳动小程序（抖音/头条）专用适配器。

```typescript
import { ByteDanceAdapter } from 'taro-bluetooth-print';

const adapter = new ByteDanceAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## QQAdapter

QQ 小程序专用适配器。

```typescript
import { QQAdapter } from 'taro-bluetooth-print';

const adapter = new QQAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## 适配器工厂

使用 `AdapterFactory` 根据当前平台自动选择合适的适配器：

```typescript
import { AdapterFactory } from 'taro-bluetooth-print';

const factory = new AdapterFactory();
const adapter = factory.createAdapter();

// 或者传入平台名称强制指定
const adapter2 = factory.createAdapter('wechat');
const adapter3 = factory.createAdapter('web');
```

---

## 平台权限对比

| 平台 | 权限字段 | 位置 |
|------|---------|------|
| 微信小程序 | `scope.bluetooth` | `app.json → permission` |
| 支付宝小程序 | `Bluetooth` | `app.json → permissions` |
| 百度小程序 | `scope.bluetooth` | `app.json → permission` |
| 字节跳动小程序 | `scope.bluetooth` | `app.json → permission` |
| QQ 小程序 | `scope.bluetooth` | `app.json → permission` |
| H5 | 无需声明 | 浏览器内置 |

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
    // 实现数据写入
  }

  startDiscovery?(): Promise<void> {
    // 可选：实现设备发现
  }

  stopDiscovery?(): Promise<void> {
    // 可选：停止设备发现
  }

  onStateChange?(callback: (state: PrinterState) => void): void {
    // 可选：状态变化回调
  }
}

const printer = new BluetoothPrinter(new MyCustomAdapter());
```

::: tip 提示
实现自定义适配器时，建议参考内置 `BaseAdapter` 的实现，它提供了蓝牙操作的通用逻辑骨架。
:::
