# BatchPrintManager API

批量打印管理器，支持大批量打印任务的分片、并发控制和进度追踪。

## 导入

```typescript
import { BatchPrintManager } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const batchManager = new BatchPrintManager({
  chunkSize: 10,         // 每批数量
  concurrency: 3,        // 并发数
  delayBetweenChunks: 500 // 批次间隔 ms
});
```

## 方法

### 批量任务

#### `createBatch(items: BatchItem[]): string`

创建批量任务，返回批次 ID。

```typescript
const batchId = batchManager.createBatch([
  { id: 'item-1', data: printData1 },
  { id: 'item-2', data: printData2 },
  { id: 'item-3', data: printData3 }
]);
```

#### `startBatch(batchId: string): Promise<BatchResult>`

开始执行批量任务。

```typescript
const result = await batchManager.startBatch(batchId);
console.log(`成功: ${result.success}, 失败: ${result.failed}`);
```

#### `pauseBatch(batchId: string): void`

暂停批量任务。

```typescript
batchManager.pauseBatch(batchId);
```

#### `resumeBatch(batchId: string): void`

恢复批量任务。

```typescript
batchManager.resumeBatch(batchId);
```

#### `cancelBatch(batchId: string): void`

取消批量任务。

```typescript
batchManager.cancelBatch(batchId);
```

### 进度查询

#### `getProgress(batchId: string): BatchProgress`

获取批量任务进度。

```typescript
const progress = batchManager.getProgress(batchId);
console.log(`进度: ${progress.completed}/${progress.total}`);
console.log(`百分比: ${progress.percentage}%`);
```

#### `getFailedItems(batchId: string): FailedItem[]`

获取失败项目列表。

```typescript
const failed = batchManager.getFailedItems(batchId);
failed.forEach(item => {
  console.log(`${item.id}: ${item.error}`);
});
```

#### `retryFailed(batchId: string): Promise<void>`

重试所有失败项目。

```typescript
await batchManager.retryFailed(batchId);
```

## 事件

`BatchPrintManager` 继承自 `EventEmitter<BatchEvents>`，事件载荷是**类型安全的**。

### 事件列表

| 事件名 | 载荷 | 触发时机 |
|--------|------|---------|
| `batch-ready` | `BatchJob[]` | 一个批次组装完成，准备处理 |
| `batch-processed` | `{ jobCount, bytes }` | 批次成功处理完 |
| `job-added` | `BatchJob` | 新 job 加入队列 |
| `job-rejected` | `{ reason }` | job 被拒（如超 maxBatchSize） |
| `auto-flush` | `{ jobCount, bytes }` | 间隔超时自动 flush |
| `jobs-merged` | `{ fromCount, toCount, savedBytes }` | 小 job 被合并优化 |
| `batch-progress` | `{ sent, total, jobIds }` | 批次处理进度（v2.15.4+） |
| `batch-failed` | `{ jobIds, bytes, error }` | 整个批次失败（v2.15.4+） |
| `job-retried` | `BatchJob` | 失败 job 经 `retryJob()` 重入队（v2.15.4+） |

### 事件监听示例

```typescript
import type { BatchEvents } from 'taro-bluetooth-print';

batchManager.on('batch-ready', (jobs) => {
  console.log(`准备处理 ${jobs.length} 个任务`);
});

batchManager.on('batch-processed', ({ jobCount, bytes }) => {
  console.log(`✅ 处理完成 ${jobCount} 个任务, 共 ${bytes}B`);
});

batchManager.on('jobs-merged', ({ fromCount, toCount, savedBytes }) => {
  console.log(`🔀 ${fromCount} 个任务合并为 ${toCount} 个, 节省 ${savedBytes}B`);
});

// v2.15.4+ — 批次级进度与失败
batchManager.on('batch-progress', ({ sent, total, jobIds }) => {
  const pct = ((sent / total) * 100).toFixed(1);
  console.log(`📊 进度: ${pct}% (${jobIds.length} 个任务)`);
});

batchManager.on('batch-failed', ({ jobIds, error }) => {
  console.error(`❌ 批次失败 (${jobIds.length} 个任务):`, error.message);
  // 失败任务保留在 failedJobs 缓冲, 可通过 retryJob() 重试
});

batchManager.on('job-retried', (job) => {
  console.log(`🔄 重试任务 ${job.id} 已重新入队`);
});
```

## 失败任务管理（v2.15.4+）

批次处理失败时，失败的 job 不会从队列中删除，而是保存在 `failedJobs` 缓冲中等待显式重试：

### `getFailedJobs(): BatchJob[]`

获取当前失败任务快照（**返回副本**，不会影响内部状态）。

```typescript
const failed = batchManager.getFailedJobs();
if (failed.length > 0) {
  console.warn(`${failed.length} 个任务失败，待重试`);
}
```

### `retryJob(id: string): boolean`

将指定 ID 的失败任务重新入队。返回 `true` 表示成功重入队，`false` 表示未找到该失败任务。

```typescript
const ok = batchManager.retryJob('order-123');
if (!ok) console.warn('未找到该失败任务');
```

### `retryAllFailedJobs(): number`

一次性重试所有失败任务，返回成功重入队的数量。

```typescript
const count = batchManager.retryAllFailedJobs();
console.log(`已重试 ${count} 个失败任务`);
```

### `clearFailedJobs(): void`

清空失败任务缓冲（不重试，直接丢弃）。

```typescript
batchManager.clearFailedJobs();
```

### 典型编排模式

```typescript
batchManager.on('batch-failed', ({ jobIds, error }) => {
  // UI 提示失败
  Toast.show({ message: `打印失败: ${error.message}`, type: 'error' });

  // 等待用户确认后重试
  setTimeout(() => {
    const retried = batchManager.retryAllFailedJobs();
    console.log(`自动重试 ${retried} 个失败任务`);
  }, 3000);
});
```

## 类型定义

### BatchItem

```typescript
interface BatchItem {
  id: string;
  data: Uint8Array;
  deviceId?: string;
  priority?: 'high' | 'normal' | 'low';
}
```

### BatchProgress

```typescript
interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentage: number;
}
```
