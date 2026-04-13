# PrintQueue API

打印队列管理器，支持优先级排序、失败重试和并发控制。

## 导入

```typescript
import { PrintQueue } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const queue = new PrintQueue({
  maxConcurrent: 1,      // 最大并发数
  retryCount: 3,         // 重试次数
  retryDelay: 1000       // 重试延迟 ms
});
```

## 方法

### 队列操作

#### `enqueue(job: PrintJob): string`

添加打印任务到队列，返回任务 ID。

```typescript
const jobId = queue.enqueue({
  deviceId: 'device-id',
  data: printData,
  priority: 'normal'  // 'high' | 'normal' | 'low'
});
```

#### `dequeue(): PrintJob | undefined`

取出下一个任务。

```typescript
const job = queue.dequeue();
```

#### `peek(): PrintJob | undefined`

查看下一个任务（不移除）。

```typescript
const nextJob = queue.peek();
```

### 任务管理

#### `cancel(jobId: string): boolean`

取消指定任务。

```typescript
queue.cancel(jobId);
```

#### `retry(jobId: string): boolean`

重试指定任务。

```typescript
queue.retry(jobId);
```

#### `clear(): void`

清空队列。

```typescript
queue.clear();
```

### 状态查询

#### `size(): number`

获取队列大小。

```typescript
const count = queue.size();
```

#### `isEmpty(): boolean`

检查队列是否为空。

```typescript
if (queue.isEmpty()) {
  console.log('队列为空');
}
```

#### `getStatus(jobId: string): JobStatus | undefined`

获取任务状态。

```typescript
const status = queue.getStatus(jobId);
// 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
```

#### `getStats(): QueueStats`

获取队列统计信息。

```typescript
const stats = queue.getStats();
console.log(`待处理: ${stats.pending}, 完成: ${stats.completed}, 失败: ${stats.failed}`);
```

## 事件

```typescript
queue.on('job-added', (job) => {
  console.log('任务添加:', job.id);
});

queue.on('job-started', (job) => {
  console.log('任务开始:', job.id);
});

queue.on('job-completed', (job) => {
  console.log('任务完成:', job.id);
});

queue.on('job-failed', (job, error) => {
  console.log('任务失败:', job.id, error);
});

queue.on('queue-empty', () => {
  console.log('队列已空');
});
```

## 类型定义

### PrintJob

```typescript
interface PrintJob {
  id?: string;                    // 任务 ID（可选，自动生成）
  deviceId: string;               // 目标设备 ID
  data: Uint8Array;               // 打印数据
  priority?: 'high' | 'normal' | 'low';  // 优先级，默认 'normal'
  retries?: number;               // 重试次数
  createdAt?: number;             // 创建时间
  metadata?: Record<string, unknown>;  // 自定义元数据
}
```

### QueueStats

```typescript
interface QueueStats {
  pending: number;    // 待处理
  running: number;    // 执行中
  completed: number;  // 已完成
  failed: number;     // 已失败
  cancelled: number;  // 已取消
}
```

## 完整示例

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({
  maxConcurrent: 2,
  retryCount: 3,
  retryDelay: 1000
});

// 监听事件
queue.on('job-completed', (job) => {
  console.log(`任务 ${job.id} 完成`);
});

queue.on('job-failed', (job, error) => {
  console.error(`任务 ${job.id} 失败:`, error);
});

// 添加高优先级任务
queue.enqueue({
  deviceId: 'printer-1',
  data: receiptData,
  priority: 'high'
});

// 添加普通任务
queue.enqueue({
  deviceId: 'printer-1',
  data: labelData,
  priority: 'normal'
});

// 处理队列
while (!queue.isEmpty()) {
  const job = queue.dequeue();
  // 执行打印...
}
```
