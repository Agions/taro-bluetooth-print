# OfflineCache API

离线缓存管理器，支持断网自动缓存、来网自动同步。

## 导入

```typescript
import { OfflineCache } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const cache = new OfflineCache({
  maxSize: 100,          // 最大缓存条数
  expireTime: 3600000,   // 过期时间 ms（默认 1 小时）
  autoSync: true         // 自动同步
});
```

## 方法

### 缓存操作

#### `add(job: PrintJob): string`

添加任务到缓存，返回缓存 ID。

```typescript
const cacheId = cache.add({
  deviceId: 'device-id',
  data: printData
});
```

#### `get(cacheId: string): CachedJob | undefined`

获取缓存的任务。

```typescript
const cached = cache.get(cacheId);
```

#### `remove(cacheId: string): boolean`

移除缓存任务。

```typescript
cache.remove(cacheId);
```

#### `clear(): void`

清空所有缓存。

```typescript
cache.clear();
```

### 批量操作

#### `getAll(): CachedJob[]`

获取所有缓存任务。

```typescript
const allCached = cache.getAll();
```

#### `getPending(): CachedJob[]`

获取待同步的任务。

```typescript
const pending = cache.getPending();
```

### 同步操作

#### `sync(): Promise<SyncResult>`

手动触发同步。

```typescript
const result = await cache.sync();
console.log(`成功: ${result.success}, 失败: ${result.failed}`);
```

#### `enableAutoSync(): void`

启用自动同步。

```typescript
cache.enableAutoSync();
```

#### `disableAutoSync(): void`

禁用自动同步。

```typescript
cache.disableAutoSync();
```

### 状态查询

#### `size(): number`

获取缓存大小。

```typescript
const count = cache.size();
```

#### `isOnline(): boolean`

检查网络状态。

```typescript
if (cache.isOnline()) {
  // 在线
}
```

## 事件

```typescript
cache.on('cached', (job) => {
  console.log('已缓存:', job.id);
});

cache.on('synced', (job) => {
  console.log('已同步:', job.id);
});

cache.on('sync-failed', (job, error) => {
  console.error('同步失败:', job.id, error);
});

cache.on('expired', (job) => {
  console.log('已过期:', job.id);
});

cache.on('online', () => {
  console.log('网络恢复');
});

cache.on('offline', () => {
  console.log('网络断开');
});
```

## 类型定义

### CachedJob

```typescript
interface CachedJob {
  id: string;              // 缓存 ID
  deviceId: string;        // 设备 ID
  data: Uint8Array;        // 打印数据
  createdAt: number;       // 创建时间
  syncedAt?: number;       // 同步时间
  retryCount: number;      // 重试次数
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}
```

### SyncResult

```typescript
interface SyncResult {
  success: number;   // 成功数量
  failed: number;    // 失败数量
  skipped: number;   // 跳过数量
}
```

## 完整示例

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache({
  maxSize: 100,
  expireTime: 3600000,
  autoSync: true
});

// 监听网络状态
cache.on('offline', () => {
  console.log('网络断开，将自动缓存打印任务');
});

cache.on('online', () => {
  console.log('网络恢复，开始自动同步');
});

// 添加任务（离线时自动缓存）
const cacheId = cache.add({
  deviceId: 'printer-1',
  data: printData
});

// 检查缓存状态
console.log(`缓存大小: ${cache.size()}`);

// 手动同步
if (cache.isOnline() && cache.size() > 0) {
  const result = await cache.sync();
  console.log(`同步完成: 成功 ${result.success}, 失败 ${result.failed}`);
}
```
