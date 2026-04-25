# DeviceManager API

设备管理器，负责蓝牙设备的**扫描发现、过滤排序、信息缓存和连接管理**。

::: info 适用平台
DeviceManager 基于 Taro API 实现，适用于所有 Taro 支持的小程序平台（微信、支付宝、百度、字节、QQ）。H5 和 React Native 环境请使用对应适配器的设备发现功能。
:::

---

## 导入

```typescript
import { DeviceManager } from 'taro-bluetooth-print';
```

---

## 创建实例

```typescript
const manager = new DeviceManager();
```

---

## 方法总览

| 方法 | 返回类型 | 说明 |
|------|---------|------|
| `startScan(options?)` | `Promise<void>` | 开始扫描蓝牙设备 |
| `stopScan()` | `Promise<void>` | 停止扫描 |
| `getDiscoveredDevices()` | `BluetoothDevice[]` | 获取已发现的设备列表 |
| `getPairedDevices()` | `Promise<BluetoothDevice[]>` | 获取已配对的设备列表 |
| `getDeviceInfo(deviceId)` | `BluetoothDevice \| null` | 获取指定设备信息 |
| `getCachedServiceInfo(deviceId)` | `{ serviceId; characteristicId } \| null` | 获取缓存的服务信息 |
| `connect(deviceId)` | `Promise<void>` | 连接到指定设备 |
| `disconnect(deviceId)` | `Promise<void>` | 断开指定设备 |

---

## 扫描设备

### `startScan(options?: ScanOptions): Promise<void>`

开始扫描附近的蓝牙设备。

```typescript
await manager.startScan({
  timeout: 10000,           // 扫描超时 10 秒
  serviceUUIDs: ['...'],    // 按服务 UUID 过滤
  nameFilter: /Printer/i,   // 按设备名称过滤
  allowDuplicates: false,   // 不重复报告
});
```

**行为说明：**

1. 初始化蓝牙适配器（如未初始化）
2. 清空上次发现的设备列表
3. 开始蓝牙扫描，监听 `onBluetoothDeviceFound`
4. 根据过滤条件筛选设备
5. 到达 `timeout` 后自动停止扫描
6. 每发现一个设备触发 `device-found` 事件

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `timeout` | `number` | `15000` | 扫描超时时间（毫秒） |
| `serviceUUIDs` | `string[]` | — | 过滤指定服务 UUID 的设备 |
| `nameFilter` | `string \| RegExp` | — | 按设备名称过滤（支持正则） |
| `allowDuplicates` | `boolean` | `false` | 是否允许重复报告同一设备 |

::: warning 注意
- 扫描前请确保已授权蓝牙权限
- 重复调用 `startScan` 不会启动多个扫描（会直接返回）
- 扫描会消耗较多电量，建议设置合理的 `timeout`
:::

---

### `stopScan(): Promise<void>`

停止当前扫描。

```typescript
await manager.stopScan();
```

**行为说明：**

1. 清除超时定时器
2. 停止蓝牙设备发现
3. 触发 `scan-stop` 事件

---

## 获取设备

### `getDiscoveredDevices(): BluetoothDevice[]`

获取本次扫描中发现的所有设备列表。

```typescript
const devices = manager.getDiscoveredDevices();

devices.forEach(device => {
  console.log(`${device.name} (${device.deviceId}) RSSI: ${device.rssi}`);
});
```

::: tip 提示
设备列表是去重后的结果（基于 `deviceId`），如果 `allowDuplicates` 为 `true`，后发现的设备信息会覆盖之前的。
:::

---

### `getPairedDevices(): Promise<BluetoothDevice[]>`

获取历史配对过的设备列表（从本地存储中读取）。

```typescript
const paired = await manager.getPairedDevices();

if (paired.length > 0) {
  console.log('最近连接过的设备:');
  paired.forEach(d => console.log(`  ${d.name} - ${d.deviceId}`));
}
```

**存储机制：**
- 配对信息存储在小程序 `Storage` 中
- Key 为 `bluetooth_paired_devices`
- 每次成功连接后自动保存

---

### `getDeviceInfo(deviceId: string): BluetoothDevice | null`

获取指定设备的详细信息。

```typescript
const device = manager.getDeviceInfo('device-id');

if (device) {
  console.log('设备名:', device.name);
  console.log('信号:', device.rssi);
} else {
  console.log('设备未找到');
}
```

**查找顺序：**
1. 先在已发现设备列表中查找
2. 再在设备缓存中查找（缓存有效期 24 小时）

---

### `getCachedServiceInfo(deviceId: string): { serviceId: string; characteristicId: string } | null`

获取缓存的服务和特征值信息（从上次连接中缓存）。

```typescript
const serviceInfo = manager.getCachedServiceInfo('device-id');

if (serviceInfo) {
  console.log('服务:', serviceInfo.serviceId);
  console.log('特征:', serviceInfo.characteristicId);
}
```

::: tip 用途
此方法返回上次成功连接时发现的可写服务和特征值，可用于跳过重复的服务发现过程，加速二次连接。
:::

---

## 连接管理

### `connect(deviceId: string): Promise<void>`

连接到指定蓝牙设备，自动完成服务发现和特征值查找。

```typescript
await manager.connect('device-id');
```

**连接流程：**

```
connect(deviceId)
    │
    ├── 1. 创建 BLE 连接 (createBLEConnection)
    │
    ├── 2. 发现设备服务 (getBLEDeviceServices)
    │
    ├── 3. 遍历服务，查找可写特征值 (getBLEDeviceCharacteristics)
    │
    ├── 4. 缓存服务和特征值信息
    │
    ├── 5. 保存为已配对设备
    │
    └── 6. 触发 device-connected 事件
```

::: warning 注意
- 连接前请先通过 `startScan()` 扫描设备
- 如果未发现服务或可写特征值，将抛出错误
- 每个平台对同时连接的 BLE 设备数量有限制（通常为 4-7 个）
:::

---

### `disconnect(deviceId: string): Promise<void>`

断开与指定设备的连接。

```typescript
await manager.disconnect('device-id');
```

---

## 事件

### 事件列表

| 事件名 | 参数类型 | 触发时机 |
|--------|---------|---------|
| `device-found` | `BluetoothDevice` | 发现新设备时 |
| `scan-start` | `void` | 开始扫描时 |
| `scan-stop` | `void` | 停止扫描时 |
| `device-connected` | `string`（deviceId） | 设备连接成功时 |
| `device-disconnected` | `string`（deviceId） | 设备断开连接时 |
| `error` | `Error` | 发生错误时 |

### 事件监听

```typescript
// 发现新设备
manager.on('device-found', (device) => {
  console.log(`发现: ${device.name} (${device.deviceId})`);
  console.log(`  RSSI: ${device.rssi}`);
  console.log(`  服务: ${device.serviceUUIDs?.join(', ')}`);
});

// 扫描开始/停止
manager.on('scan-start', () => {
  console.log('扫描开始');
});

manager.on('scan-stop', () => {
  console.log('扫描结束');
});

// 设备连接/断开
manager.on('device-connected', (deviceId) => {
  console.log('已连接:', deviceId);
});

manager.on('device-disconnected', (deviceId) => {
  console.log('已断开:', deviceId);
});

// 错误
manager.on('error', (error) => {
  console.error('错误:', error.message);
});
```

### 移除监听

```typescript
const handler = (device) => console.log(device.name);
manager.on('device-found', handler);

// 移除监听
manager.off('device-found', handler);
```

---

## 类型定义

### BluetoothDevice

```typescript
interface BluetoothDevice {
  /** 设备唯一标识（平台相关格式） */
  deviceId: string;
  /** 设备名称 */
  name: string;
  /** 信号强度（RSSI），值越大信号越强 */
  rssi?: number;
  /** BLE 广播数据 */
  advertisementData?: ArrayBuffer;
  /** 设备支持的服务 UUID 列表 */
  serviceUUIDs?: string[];
  /** 广播中的本地名称 */
  localName?: string;
  /** 是否已配对 */
  isPaired?: boolean;
  /** 上次连接时间戳（毫秒） */
  lastConnected?: number;
}
```

### ScanOptions

```typescript
interface ScanOptions {
  /** 扫描超时时间（毫秒），默认 15000 */
  timeout?: number;
  /** 过滤指定服务 UUID 的设备 */
  serviceUUIDs?: string[];
  /** 按设备名称过滤（字符串精确匹配或正则表达式） */
  nameFilter?: string | RegExp;
  /** 是否允许重复报告同一设备，默认 false */
  allowDuplicates?: boolean;
}
```

### DeviceManagerEvents

```typescript
interface DeviceManagerEvents {
  'device-found': BluetoothDevice;
  'scan-start': void;
  'scan-stop': void;
  'device-connected': string;
  'device-disconnected': string;
  error: Error;
}
```

---

## 实用技巧

### 按 RSSI 排序设备

信号强度越强（RSSI 值越大），连接越稳定：

```typescript
const devices = manager.getDiscoveredDevices();
devices.sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));

// 选择信号最强的设备连接
if (devices.length > 0) {
  await manager.connect(devices[0].deviceId);
}
```

### 按名称过滤打印机

```typescript
await manager.startScan({
  nameFilter: /Printer|打印机|GP-|XP-/i,
  timeout: 10000,
});
```

### 快速重连已配对设备

```typescript
const paired = await manager.getPairedDevices();
if (paired.length > 0) {
  try {
    await manager.connect(paired[0].deviceId);
    console.log('重连成功');
  } catch {
    console.log('重连失败，开始扫描新设备');
    await manager.startScan();
  }
}
```

---

## 完整示例

### 扫描并连接打印机

```typescript
import { DeviceManager } from 'taro-bluetooth-print';

async function findAndConnect() {
  const manager = new DeviceManager();

  // 监听设备发现
  manager.on('device-found', (device) => {
    console.log(`发现: ${device.name} (${device.deviceId}) RSSI: ${device.rssi}`);
  });

  try {
    // 扫描 10 秒，过滤打印机
    await manager.startScan({
      timeout: 10000,
      nameFilter: /Printer|打印机/i,
    });

    // 获取设备列表并按信号强度排序
    const devices = manager.getDiscoveredDevices();
    devices.sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));

    console.log(`共发现 ${devices.length} 个打印机`);

    // 连接信号最强的设备
    if (devices.length > 0) {
      await manager.connect(devices[0].deviceId);
      console.log('已连接:', devices[0].name);
    }
  } catch (error) {
    console.error('扫描/连接失败:', error);
  } finally {
    await manager.stopScan();
  }
}
```
