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

```typescript
batchManager.on('progress', (batchId, progress) => {
  console.log(`批次 ${batchId}: ${progress.percentage}%`);
});

batchManager.on('item-complete', (batchId, itemId) => {
  console.log(`项目完成: ${itemId}`);
});

batchManager.on('item-failed', (batchId, itemId, error) => {
  console.error(`项目失败: ${itemId}`, error);
});

batchManager.on('batch-complete', (batchId, result) => {
  console.log(`批次完成: 成功 ${result.success}, 失败 ${result.failed}`);
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
