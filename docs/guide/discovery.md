# 设备发现

## 概述

`DiscoveryService` 提供增强型蓝牙设备发现功能，支持多维度过滤、智能排序和设备缓存。

## 功能特性

- **多维度过滤**：支持名称、通配符、正则、RSSI 信号强度、厂商 ID、外观类型
- **智能排序**：按信号强度、名称、发现时间排序
- **设备缓存**：自动缓存发现设备，支持过期清理
- **自动重试**：发现失败时自动重试
- **等待特定设备**：可以等待匹配条件的设备被发现

## 基础用法

```typescript
import { discoveryService, DiscoveryOptions } from 'taro-bluetooth-print';

// 创建设备发现服务（可选配置）
const discovery = new DiscoveryService({
  timeout: 15000,        // 发现超时 15 秒
  maxDevices: 20,        // 最多保留 20 个设备
  enableCache: true,     // 启用设备缓存
  cacheExpiry: 30000,    // 缓存 30 秒后过期
  autoRetry: true,       // 自动重试
  retryInterval: 5000,    // 重试间隔 5 秒
  maxRetries: 3          // 最多重试 3 次
});

// 设置平台适配器（需要蓝牙适配器）
discovery.setPlatformAdapter(bluetoothAdapter);

// 开始发现
await discovery.startDiscovery();

// 获取设备
const devices = discovery.getDevices();
```

## 设备过滤

### 名称过滤

```typescript
// 精确名称
discovery.setFilters([
  { name: 'Printer001' }
]);

// 通配符匹配 (* 匹配任意字符)
discovery.setFilters([
  { name: 'POS-*' }
]);

// 多个名称
discovery.setFilters([
  { name: ['Printer001', 'Printer002', 'Printer003'] }
]);

// 正则表达式
discovery.setFilters([
  { namePattern: /^POS-\d{3}$/ }
]);
```

### 信号强度过滤

```typescript
// 只显示信号强度 >= -70 dBm 的设备
discovery.setFilters([
  { rssiThreshold: -70 }
]);
```

### 组合过滤

```typescript
discovery.setFilters([
  { name: 'Printer*', rssiThreshold: -70 },
  { namePattern: /^TEST-/ }
]);
```

## 设备排序

```typescript
// 按信号强度排序（默认）
discovery.setSortOptions(['rssi']);

// 按名称排序
discovery.setSortOptions(['name']);

// 按最后发现时间排序
discovery.setSortOptions(['lastSeen']);

// 多级排序：先按信号强度，再按名称
discovery.setSortOptions(['rssi', 'name']);
```

## 事件监听

```typescript
// 发现新设备
discovery.on('device-found', (device) => {
  console.log('发现设备:', device.name, 'RSSI:', device.rssi);
});

// 设备信息更新
discovery.on('device-updated', (device) => {
  console.log('设备更新:', device.name, 'RSSI:', device.rssi);
});

// 设备丢失（缓存过期）
discovery.on('device-lost', (device) => {
  console.log('设备丢失:', device.name);
});

// 发现开始/停止
discovery.on('discovery-start', () => console.log('开始发现'));
discovery.on('discovery-stop', () => console.log('停止发现'));

// 发现完成
discovery.on('discovery-complete', (devices) => {
  console.log('发现完成，共', devices.length, '个设备');
});

// 发现错误
discovery.on('discovery-error', (error) => {
  console.error('发现错误:', error);
});
```

## 等待特定设备

```typescript
// 等待名称匹配或信号强度足够的设备
const device = await discovery.waitForDevice(
  (d) => d.name.includes('Printer001') || (d.rssi ?? -100) > -50,
  30000  // 超时 30 秒
);

if (device) {
  console.log('找到目标设备:', device.name);
} else {
  console.log('未找到匹配设备');
}
```

## 手动设备管理

```typescript
// 手动添加设备到缓存
discovery.addDevice({
  deviceId: '00:11:22:33:44:55',
  name: 'Manual-Printer',
  rssi: -60
});

// 获取单个设备
const device = discovery.getDevice('00:11:22:33:44:55');

// 移除设备
discovery.removeDevice('00:11:22:33:44:55');

// 清除所有缓存
discovery.clearCache();
```

## 获取设备信息

`DiscoveredDevice` 对象包含以下属性：

```typescript
interface DiscoveredDevice {
  id: string;              // 设备 ID
  name: string;           // 设备名称
  deviceId: string;        // 原始设备 ID
  rssi?: number;           // 信号强度 (dBm)
  appearance?: number;     // 设备外观类型
  manufacturerData?: DataView;  // 厂商数据
  serviceData?: Map<string, DataView>;  // 服务数据
  txPowerLevel?: number;   // 发射功率
  lastSeen: number;        // 最后发现时间戳
  discoveredCount: number; // 被发现次数
}
```

## API 参考

### 类型定义

```typescript
interface DiscoveryOptions {
  filters?: DeviceFilter[];
  sortBy?: SortOption[];
  timeout?: number;
  maxDevices?: number;
  enableCache?: boolean;
  cacheExpiry?: number;
  autoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
}

interface DeviceFilter {
  name?: string | string[];
  namePattern?: RegExp;
  rssiThreshold?: number;
  manufacturerId?: number;
  manufacturerDataPrefix?: Uint8Array;
  serviceUUIDs?: string[];
  appearance?: number[];
}

type SortOption = 'rssi' | 'name' | 'lastSeen' | 'discoveredCount';
```

### 方法

| 方法 | 说明 |
|------|------|
| `startDiscovery()` | 开始发现设备 |
| `stopDiscovery()` | 停止发现 |
| `getDevices()` | 获取过滤和排序后的设备列表 |
| `getAllDevices()` | 获取所有发现的设备（不过滤） |
| `getDevice(deviceId)` | 获取单个设备 |
| `addDevice(device)` | 手动添加设备 |
| `removeDevice(deviceId)` | 移除设备 |
| `clearCache()` | 清除设备缓存 |
| `setFilters(filters)` | 设置过滤器 |
| `addFilter(filter)` | 添加过滤器 |
| `clearFilters()` | 清除所有过滤器 |
| `setSortOptions(options)` | 设置排序选项 |
| `waitForDevice(predicate, timeout?)` | 等待特定设备 |
| `setPlatformAdapter(adapter)` | 设置平台适配器 |
| `destroy()` | 销毁服务 |

### 事件

| 事件 | 说明 |
|------|------|
| `device-found` | 发现新设备 |
| `device-updated` | 设备信息更新 |
| `device-lost` | 设备丢失 |
| `discovery-start` | 开始发现 |
| `discovery-stop` | 停止发现 |
| `discovery-complete` | 发现完成 |
| `discovery-error` | 发现错误 |
| `retry` | 重试尝试 |
