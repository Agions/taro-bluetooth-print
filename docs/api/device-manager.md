# DeviceManager API

设备管理器，负责蓝牙设备的扫描、发现和管理。

## 导入

```typescript
import { DeviceManager } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const manager = new DeviceManager();
```

## 方法

### 扫描设备

#### `startScan(options?: ScanOptions): Promise<void>`

开始扫描蓝牙设备。

```typescript
await manager.startScan({
  timeout: 10000,           // 扫描超时 ms
  serviceUUIDs: ['...'],    // 过滤服务 UUID
  nameFilter: /Printer/i,   // 过滤设备名称
  allowDuplicates: false    // 允许重复报告
});
```

#### `stopScan(): Promise<void>`

停止扫描。

```typescript
await manager.stopScan();
```

### 获取设备

#### `getDiscoveredDevices(): BluetoothDevice[]`

获取已发现的设备列表。

```typescript
const devices = manager.getDiscoveredDevices();
devices.forEach(device => {
  console.log(device.name, device.deviceId);
});
```

#### `getPairedDevices(): Promise<BluetoothDevice[]>`

获取已配对的设备列表。

```typescript
const paired = await manager.getPairedDevices();
```

#### `getDeviceInfo(deviceId: string): BluetoothDevice | null`

获取指定设备信息。

```typescript
const device = manager.getDeviceInfo('device-id');
```

### 连接管理

#### `connect(deviceId: string): Promise<void>`

连接到指定设备。

```typescript
await manager.connect('device-id');
```

#### `disconnect(deviceId: string): Promise<void>`

断开指定设备。

```typescript
await manager.disconnect('device-id');
```

## 事件

```typescript
manager.on('device-found', (device) => {
  console.log('发现设备:', device.name, device.deviceId);
});

manager.on('scan-start', () => {
  console.log('开始扫描');
});

manager.on('scan-stop', () => {
  console.log('停止扫描');
});

manager.on('device-connected', (deviceId) => {
  console.log('已连接:', deviceId);
});

manager.on('device-disconnected', (deviceId) => {
  console.log('已断开:', deviceId);
});

manager.on('error', (error) => {
  console.error('错误:', error);
});
```

## 类型定义

### BluetoothDevice

```typescript
interface BluetoothDevice {
  deviceId: string;          // 设备唯一标识
  name: string;              // 设备名称
  rssi?: number;             // 信号强度
  advertisementData?: ArrayBuffer;  // 广播数据
  serviceUUIDs?: string[];   // 服务 UUID 列表
  localName?: string;        // 本地名称
  isPaired?: boolean;        // 是否已配对
  lastConnected?: number;    // 上次连接时间戳
}
```

### ScanOptions

```typescript
interface ScanOptions {
  timeout?: number;          // 扫描超时 ms，默认 15000
  serviceUUIDs?: string[];   // 过滤服务 UUID
  nameFilter?: string | RegExp;  // 过滤设备名称
  allowDuplicates?: boolean; // 允许重复报告，默认 false
}
```

## 完整示例

```typescript
import { DeviceManager } from 'taro-bluetooth-print';

async function findPrinter() {
  const manager = new DeviceManager();
  
  manager.on('device-found', (device) => {
    console.log(`发现: ${device.name} (${device.deviceId}) RSSI: ${device.rssi}`);
  });

  try {
    // 扫描 10 秒
    await manager.startScan({ timeout: 10000 });
    
    const devices = manager.getDiscoveredDevices();
    console.log(`共发现 ${devices.length} 个设备`);
    
    // 找第一个设备连接
    if (devices.length > 0) {
      await manager.connect(devices[0].deviceId);
      console.log('已连接');
    }
  } catch (error) {
    console.error('扫描失败:', error);
  } finally {
    await manager.stopScan();
  }
}
```
