# 平台适配器

`taro-bluetooth-print` 通过适配器模式接入不同平台的蓝牙 API，实现**一套代码，七个平台**运行。

::: info 快速开始
大多数情况下，使用 `AdapterFactory` 自动检测平台即可，无需手动选择适配器。详见 [适配器工厂](#适配器工厂-adapterfactory)。
:::

---

## 适配器总览

| 适配器 | 平台 | 蓝牙 API | 推荐度 |
|--------|------|---------|--------|
| `TaroAdapter` | 微信 / 支付宝 / 百度 / 字节 / QQ 小程序 | Taro 统一 API | ⭐⭐⭐⭐⭐ |
| `AlipayAdapter` | 支付宝小程序（原生） | `my.*` BLE API | ⭐⭐⭐ |
| `BaiduAdapter` | 百度小程序（原生） | `swan.*` BLE API | ⭐⭐⭐ |
| `ByteDanceAdapter` | 抖音 / 头条小程序 | `tt.*` BLE API | ⭐⭐⭐ |
| `QQAdapter` | QQ 小程序（原生） | `qq.*` BLE API | ⭐⭐⭐ |
| `WebBluetoothAdapter` | H5 浏览器 | Web Bluetooth API | ⭐⭐⭐⭐ |
| `ReactNativeAdapter` | React Native | 原生 BLE 模块 | ⭐⭐⭐⭐ |

::: tip 推荐选择
- **Taro 项目**：直接使用 `TaroAdapter`，框架自动识别当前小程序平台
- **非 Taro 项目**：使用 `AdapterFactory` 自动检测，或手动选择对应适配器
:::

---

## 适配器工厂（AdapterFactory）

`AdapterFactory` 根据当前运行环境**自动检测**并创建最合适的适配器实例。

### 自动检测

```typescript
import { AdapterFactory, BluetoothPrinter } from 'taro-bluetooth-print';

// 自动检测当前平台并创建适配器
const adapter = AdapterFactory.create();
const printer = new BluetoothPrinter(adapter);
```

### 手动指定平台

```typescript
// 强制使用指定平台的适配器
const adapter = AdapterFactory.create('wechat');   // 微信小程序
const adapter = AdapterFactory.create('alipay');   // 支付宝小程序
const adapter = AdapterFactory.create('web');      // H5 Web Bluetooth
const adapter = AdapterFactory.create('rn');       // React Native
```

### 支持的平台标识

| 标识 | 平台 |
|------|------|
| `'wechat'` | 微信小程序 |
| `'alipay'` | 支付宝小程序 |
| `'baidu'` | 百度小程序 |
| `'bytedance'` | 字节跳动小程序（抖音/头条） |
| `'qq'` | QQ 小程序 |
| `'web'` | H5 浏览器 |
| `'rn'` | React Native |

### 检测逻辑

```
AdapterFactory.create()
       │
       ├── 检测 Taro 环境 ──► TaroAdapter（自动路由到对应小程序平台）
       │
       ├── 检测 navigator.bluetooth ──► WebBluetoothAdapter
       │
       ├── 检测 React Native 环境 ──► ReactNativeAdapter
       │
       └── 默认 ──► 抛出不支持平台的错误
```

---

## MiniProgramAdapter 基类

所有小程序适配器共享一个 `MiniProgramAdapter`（继承自 `BaseAdapter`）基类，封装了 BLE 操作的通用逻辑：

```
BaseAdapter
    │
    └── MiniProgramAdapter
            │
            ├── TaroAdapter
            ├── AlipayAdapter
            ├── BaiduAdapter
            ├── ByteDanceAdapter
            └── QQAdapter
```

### 基类提供的通用逻辑

| 功能 | 说明 |
|------|------|
| 蓝牙初始化 | `openBluetoothAdapter()` / 权限检查 |
| 设备扫描 | `startBluetoothDevicesDiscovery()` / 去重 |
| 连接管理 | `createBLEConnection()` / 服务发现 / 特征值查找 |
| 数据写入 | 分片写入 + 延迟 + 重试 |
| 断开连接 | `closeBLEConnection()` / 资源释放 |

### 各小程序适配器的差异

| 差异点 | 微信 | 支付宝 | 百度 | 字节 | QQ |
|--------|------|--------|------|------|-----|
| BLE 前缀 | `wx.` | `my.` | `swan.` | `tt.` | `qq.` |
| 写入方式 | `writeBLECharacteristicValue` | `writeBLECharacteristicValue` | `writeBLECharacteristicValue` | `writeBLECharacteristicValue` | `writeBLECharacteristicValue` |
| MTU 协商 | 支持 | 不支持 | 不支持 | 支持 | 不支持 |
| 权限声明 | `scope.bluetooth` | `Bluetooth` | `scope.bluetooth` | `scope.bluetooth` | `scope.bluetooth` |

---

## TaroAdapter

适用于所有基于 **Taro 框架** 的小程序平台，是**最推荐的适配器**。

```typescript
import { BluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const adapter = new TaroAdapter();
const printer = new BluetoothPrinter(adapter);
```

在 Taro 环境下使用时，框架会自动识别当前运行平台（微信/支付宝/百度/字节/QQ），无需手动选择。

### 权限配置

:::: code-group

::: code-group-item 微信小程序

```json
// app.json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

:::

::: code-group-item 支付宝小程序

```json
// app.json
{
  "permissions": {
    "Bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

:::

::: code-group-item 百度小程序

```json
// app.json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

:::

::: code-group-item 字节跳动小程序

```json
// app.json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

:::

::: code-group-item QQ 小程序

```json
// app.json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

:::

::::

---

## WebBluetoothAdapter

适用于 **H5 浏览器** 环境，基于 Web Bluetooth API 实现。

### 浏览器兼容性

| 浏览器 | 支持情况 | 最低版本 |
|--------|---------|---------|
| Chrome | ✅ 完全支持 | 56+ |
| Edge | ✅ 完全支持 | 79+ |
| Opera | ✅ 完全支持 | 43+ |
| Safari | ❌ 不支持 | — |
| Firefox | ❌ 不支持 | — |
| iOS WebView | ❌ 不支持 | — |

::: danger 重要限制
- Web Bluetooth **必须在 HTTPS 环境**或 `localhost` 下使用
- Safari 和 Firefox 暂不支持 Web Bluetooth API
- iOS 平台（包括 iOS Chrome）不支持 Web Bluetooth
:::

### 使用方式

```typescript
import { BluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

async function connectPrinter() {
  const adapter = new WebBluetoothAdapter();

  // 请求设备（会弹出系统设备选择弹窗）
  await adapter.requestDevice({
    filters: [{ name: '热敏打印机' }],
    optionalServices: [
      '00001800-0000-1000-8000-00805f9b34fb',
      '00001801-0000-1000-8000-00805f9b34fb',
    ],
  });

  // 获取已发现的设备
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

### 请求设备选项

```typescript
interface WebBluetoothRequestOptions {
  /** 按条件过滤设备 */
  filters?: Array<{
    name?: string;          // 按设备名称精确匹配
    namePrefix?: string;    // 按名称前缀过滤
    services?: string[];    // 按服务 UUID 过滤
  }>;
  /** 可选服务列表（用于后续操作） */
  optionalServices?: string[];
  /** 接受所有设备（不再使用 filters） */
  acceptAllDevices?: boolean;
}
```

::: warning 注意
Web Bluetooth 的设备选择需要**用户主动触发**（例如点击按钮），不能在页面加载时自动弹出。这是浏览器安全策略的要求。
:::

### 检测浏览器支持

```typescript
if ('bluetooth' in navigator) {
  console.log('当前浏览器支持 Web Bluetooth');
} else {
  console.error('当前浏览器不支持 Web Bluetooth');
}
```

---

## ReactNativeAdapter

适用于 **React Native** 项目，通过原生 BLE 模块进行蓝牙通信。

### 前置条件

::: warning 依赖要求
ReactNativeAdapter 需要配合 React Native 的 BLE 库使用，推荐：
- `react-native-ble-plx`（推荐）
- `react-native-ble-manager`
:::

### 安装依赖

```bash
# 推荐使用 react-native-ble-plx
npm install react-native-ble-plx

# 或使用 react-native-ble-manager
npm install react-native-ble-manager
```

### 权限配置

**iOS — `Info.plist`：**

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要蓝牙权限以连接打印机</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>需要蓝牙权限以连接打印机</string>
```

**Android — `AndroidManifest.xml`：**

```xml
<!-- Android 11 及以下 -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 12+ 需要额外声明 -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

### 使用方式

```typescript
import { BluetoothPrinter, ReactNativeAdapter } from 'taro-bluetooth-print';

const adapter = new ReactNativeAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## AlipayAdapter

支付宝小程序专用适配器（原生）。

```typescript
import { AlipayAdapter, BluetoothPrinter } from 'taro-bluetooth-print';

const adapter = new AlipayAdapter();
const printer = new BluetoothPrinter(adapter);
```

### 权限配置

```json
// app.json
{
  "permissions": {
    "Bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

::: tip 提示
如果你已经在使用 Taro 框架，不需要直接使用此适配器，`TaroAdapter` 会自动路由到支付宝 API。
:::

---

## BaiduAdapter

百度小程序专用适配器（原生）。

```typescript
import { BaiduAdapter, BluetoothPrinter } from 'taro-bluetooth-print';

const adapter = new BaiduAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## ByteDanceAdapter

字节跳动小程序（抖音/头条）专用适配器（原生）。

```typescript
import { ByteDanceAdapter, BluetoothPrinter } from 'taro-bluetooth-print';

const adapter = new ByteDanceAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## QQAdapter

QQ 小程序专用适配器（原生）。

```typescript
import { QQAdapter, BluetoothPrinter } from 'taro-bluetooth-print';

const adapter = new QQAdapter();
const printer = new BluetoothPrinter(adapter);
```

---

## 平台权限对比

| 平台 | 权限声明 | 配置文件位置 | 特殊要求 |
|------|---------|-------------|---------|
| 微信小程序 | `scope.bluetooth` | `app.json → permission` | 基础库 ≥ 2.9.2 |
| 支付宝小程序 | `Bluetooth` | `app.json → permissions` | — |
| 百度小程序 | `scope.bluetooth` | `app.json → permission` | — |
| 字节跳动小程序 | `scope.bluetooth` | `app.json → permission` | — |
| QQ 小程序 | `scope.bluetooth` | `app.json → permission` | — |
| H5 | 无需声明 | — | 必须 HTTPS |
| React Native | 系统权限 | `Info.plist` / `AndroidManifest.xml` | Android 12+ 额外权限 |

---

## 自定义适配器

如果需要支持其他蓝牙平台或自定义蓝牙通信方式，可以实现 `IPrinterAdapter` 接口。

### 完整实现示例

```typescript
import {
  IPrinterAdapter,
  IAdapterOptions,
  PrinterState,
  BluetoothPrinter,
} from 'taro-bluetooth-print';

class CustomAdapter implements IPrinterAdapter {
  private state: PrinterState = PrinterState.DISCONNECTED;
  private deviceId: string | null = null;

  async connect(deviceId: string): Promise<void> {
    // 实现连接逻辑
    this.deviceId = deviceId;
    this.state = PrinterState.CONNECTED;
  }

  async disconnect(): Promise<void> {
    // 实现断开逻辑
    this.deviceId = null;
    this.state = PrinterState.DISCONNECTED;
  }

  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    // 实现数据写入逻辑
    // 支持 options.chunkSize 分片、options.delay 延迟等
  }

  getState(): PrinterState {
    return this.state;
  }

  // 可选方法
  async startDiscovery?(): Promise<void> {
    // 实现设备发现
  }

  async stopDiscovery?(): Promise<void> {
    // 停止设备发现
  }

  onStateChange?(callback: (state: PrinterState) => void): void {
    // 状态变化回调
  }
}

// 使用自定义适配器
const printer = new BluetoothPrinter(new CustomAdapter());
```

::: tip 最佳实践
- 实现自定义适配器时，建议参考内置 `BaseAdapter` 的实现，它提供了蓝牙操作的通用逻辑骨架
- 务必在 `write` 方法中处理分片逻辑（`options.chunkSize`），否则大数据包可能导致传输失败
- 建议实现 `onStateChange` 以支持连接状态自动监听
:::

---

## 常见问题

### Q: 应该使用哪个适配器？

**推荐**：Taro 项目使用 `TaroAdapter`，非 Taro 项目使用 `AdapterFactory.create()` 自动检测。只有在有特殊需求时才手动指定适配器。

### Q: 为什么 Web Bluetooth 在 Safari 上不可用？

Safari 目前不支持 Web Bluetooth API。如果需要在 iOS 上使用蓝牙打印，建议通过微信小程序或 React Native 方案。

### Q: 不同适配器的写入性能有差异吗？

有差异。各平台的 BLE 实现不同，MTU（最大传输单元）也不同。建议通过 `setOptions()` 调整 `chunkSize` 和 `delay` 参数来优化传输性能。
