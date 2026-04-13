# ScheduledRetryManager API

定时重试管理器，支持智能重试策略和定时任务。

## 导入

```typescript
import { ScheduledRetryManager } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const retryManager = new ScheduledRetryManager({
  maxRetries: 3,
  baseDelay: 1000,      // 基础延迟 ms
  maxDelay: 60000,      // 最大延迟 ms
  backoffMultiplier: 2  // 退避系数
});
```

## 方法

### 重试调度

#### `schedule(job: PrintJob, strategy?: RetryStrategy): string`

调度重试任务，返回任务 ID。

```typescript
const jobId = retryManager.schedule({
  data: printData,
  deviceId: 'printer-1',
  priority: 'high'
});
```

#### `cancel(jobId: string): void`

取消重试任务。

```typescript
retryManager.cancel('job-123');
```

#### `reschedule(jobId: string, newTime: Date): void`

重新调度任务时间。

```typescript
retryManager.reschedule('job-123', new Date(Date.now() + 60000));
```

### 查询操作

#### `getPending(): RetryJob[]`

获取待重试任务列表。

```typescript
const pending = retryManager.getPending();
```

#### `getHistory(jobId: string): RetryHistory[]`

获取任务重试历史。

```typescript
const history = retryManager.getHistory('job-123');
console.log(`已重试 ${history.length} 次`);
```

## 重试策略

### 指数退避

```typescript
retryManager.schedule(job, {
  type: 'exponential',
  baseDelay: 1000,
  maxDelay: 60000
});
```

### 固定间隔

```typescript
retryManager.schedule(job, {
  type: 'fixed',
  delay: 5000
});
```

### 自定义

```typescript
retryManager.schedule(job, {
  type: 'custom',
  calculateDelay: (attempt, error) => {
    if (error.code === 'DEVICE_BUSY') return 10000;
    return 1000 * attempt;
  }
});
```

## 事件

```typescript
retryManager.on('retry', (jobId, attempt) => {
  console.log(`任务 ${jobId} 第 ${attempt} 次重试`);
});

retryManager.on('success', (jobId) => {
  console.log(`任务 ${jobId} 重试成功`);
});

retryManager.on('failed', (jobId, error) => {
  console.error(`任务 ${jobId} 重试失败:`, error);
});
```
