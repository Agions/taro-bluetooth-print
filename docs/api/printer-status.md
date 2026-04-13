# PrinterStatus API

打印机状态监控服务，实时监控打印机状态变化。

## 导入

```typescript
import { PrinterStatus } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const statusMonitor = new PrinterStatus({
  pollInterval: 5000,    // 轮询间隔 ms
  timeout: 10000         // 超时时间 ms
});
```

## 方法

### 状态监控

#### `startMonitoring(deviceId: string): void`

开始监控设备状态。

```typescript
statusMonitor.startMonitoring('printer-1');
```

#### `stopMonitoring(deviceId: string): void`

停止监控。

```typescript
statusMonitor.stopMonitoring('printer-1');
```

#### `getStatus(deviceId: string): DeviceStatus`

获取当前状态。

```typescript
const status = statusMonitor.getStatus('printer-1');
// 'online' | 'offline' | 'busy' | 'error' | 'paper-out' | 'cover-open'
```

### 批量操作

#### `startMonitoringAll(): void`

监控所有已连接设备。

```typescript
statusMonitor.startMonitoringAll();
```

#### `stopMonitoringAll(): void`

停止所有监控。

```typescript
statusMonitor.stopMonitoringAll();
```

#### `getAllStatus(): Map<string, DeviceStatus>`

获取所有设备状态。

```typescript
const allStatus = statusMonitor.getAllStatus();
allStatus.forEach((status, deviceId) => {
  console.log(`${deviceId}: ${status}`);
});
```

## 事件

```typescript
statusMonitor.on('status-change', (deviceId, newStatus, oldStatus) => {
  console.log(`${deviceId}: ${oldStatus} -> ${newStatus}`);
});

statusMonitor.on('offline', (deviceId) => {
  console.warn(`设备离线: ${deviceId}`);
});

statusMonitor.on('error', (deviceId, error) => {
  console.error(`设备错误: ${deviceId}`, error);
});

statusMonitor.on('paper-out', (deviceId) => {
  console.warn(`缺纸: ${deviceId}`);
});

statusMonitor.on('cover-open', (deviceId) => {
  console.warn(`盖子打开: ${deviceId}`);
});
```

## 状态类型

| 状态 | 说明 |
|------|------|
| `online` | 在线空闲 |
| `offline` | 离线 |
| `busy` | 打印中 |
| `error` | 错误 |
| `paper-out` | 缺纸 |
| `cover-open` | 盖子打开 |
| `overheated` | 过热 |
