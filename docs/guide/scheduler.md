# 定时调度

## 概述

`PrintScheduler` 提供强大的定时打印调度功能，支持 cron 表达式、一次性定时任务和重复间隔任务。

## 功能特性

- **Cron 表达式**：支持标准 5 位 cron 表达式，精确控制执行时间
- **一次性任务**：在指定时间执行一次
- **重复间隔**：按固定时间间隔重复执行
- **持久化**：任务状态保存到 localStorage，重启后自动恢复
- **生命周期事件**：完整的 will-execute、executed、completed、failed 事件

## 基础用法

```typescript
import { printScheduler, ScheduleOptions } from 'taro-bluetooth-print';

// 1. 设置打印执行回调
printScheduler.setPrintExecutor(async (job) => {
  const printer = new BluetoothPrinter();
  await printer.connect(job.printerId!);
  await printer.printWithTemplate(job.templateId!, job.templateData);
});

// 2. 启动调度器
printScheduler.start();
```

## 调度任务

### 一次性定时

```typescript
// 指定时间执行一次
printScheduler.scheduleOnce({
  name: '报表打印',
  onceAt: new Date('2026-04-01T09:00:00'),
  printerId: 'printer-001',
  templateId: 'daily-report',
  templateData: { title: '日报' }
});
```

### Cron 表达式

```typescript
// 每天 9:00 执行
printScheduler.scheduleCron({
  name: '日报打印',
  cronExpression: '0 9 * * *',
  printerId: 'printer-001',
  templateId: 'daily-report',
  templateData: { title: '日报' }
});

// 每 15 分钟执行
printScheduler.scheduleCron({
  name: '监控打印',
  cronExpression: '*/15 * * * *',
  templateId: 'monitor-status',
  templateData: { type: 'monitor' }
});

// 工作日 9:00-17:00 每小时执行
printScheduler.scheduleCron({
  name: '工单打印',
  cronExpression: '0 9-17 * * 1-5',
  printerId: 'printer-001',
  templateId: 'work-order',
  maxRuns: 100  // 最多执行 100 次
});
```

### 重复间隔

```typescript
// 每 30 分钟执行一次
printScheduler.scheduleRepeat({
  name: '监控打印',
  repeatInterval: 30 * 60 * 1000,  // 30 分钟
  templateId: 'monitor-status',
  templateData: { type: 'monitor' }
});
```

## 任务管理

### 查询任务

```typescript
// 获取所有任务
const allJobs = printScheduler.getAllJobs();

// 获取活跃任务
const activeJobs = printScheduler.getActiveJobs();

// 获取即将执行的任务
const upcomingJobs = printScheduler.getUpcomingJobs(10);

// 获取单个任务
const job = printScheduler.getJob('job-id');

// 获取调度器状态
const status = printScheduler.getStatus();
console.log(status);
// { isRunning: true, totalJobs: 3, activeJobs: 2, nextScheduledRun: 1709251200000 }
```

### 控制任务

```typescript
// 暂停任务
printScheduler.pause('job-id');

// 恢复任务
printScheduler.resume('job-id');

// 取消任务
printScheduler.cancel('job-id');

// 更新任务
printScheduler.update('job-id', {
  name: '新名称',
  templateData: { ... },
  printerId: 'new-printer-id'
});
```

## 事件监听

```typescript
printScheduler.on('will-execute', (job) => {
  console.log('即将执行:', job.name);
});

printScheduler.on('executed', ({ job, success, error }) => {
  if (success) {
    console.log('执行成功:', job.name);
  } else {
    console.log('执行失败:', error);
  }
});

printScheduler.on('next-run', ({ job, runTime }) => {
  console.log(`下次执行: ${job.name} at ${new Date(runTime)}`);
});

printScheduler.on('completed', (job) => {
  console.log('任务完成:', job.name);
});
```

## Cron 表达式格式

```
┌───────────── 分钟 (0-59)
│ ┌───────────── 小时 (0-23)
│ │ ┌───────────── 日 (1-31)
│ │ │ ┌───────────── 月 (1-12)
│ │ │ │ ┌───────────── 星期 (0-6, 0=周日)
│ │ │ │ │
* * * * *
```

### 示例

| 表达式 | 说明 |
|--------|------|
| `0 9 * * *` | 每天 9:00 |
| `*/15 * * * *` | 每 15 分钟 |
| `0 9-17 * * 1-5` | 工作日 9:00-17:00 每小时 |
| `30 8 * * 1` | 每周一 8:30 |
| `0 0 1 * *` | 每月 1 日午夜 |

## API 参考

### 类型定义

```typescript
interface ScheduledPrint {
  id: string;
  name: string;
  cronExpression?: string;
  onceAt?: number;
  repeatInterval?: number;
  printerId?: string;
  templateData: Record<string, any>;
  templateId?: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  nextRunTime?: number;
  lastRunTime?: number;
  totalRuns: number;
  maxRuns?: number;
  createdAt: number;
  updatedAt: number;
}
```

### 方法

| 方法 | 说明 |
|------|------|
| `scheduleOnce(options)` | 创建一次性定时任务 |
| `scheduleCron(options)` | 创建 Cron 调度任务 |
| `scheduleRepeat(options)` | 创建重复间隔任务 |
| `cancel(jobId)` | 取消任务 |
| `pause(jobId)` | 暂停任务 |
| `resume(jobId)` | 恢复任务 |
| `update(jobId, updates)` | 更新任务 |
| `getAllJobs()` | 获取所有任务 |
| `getActiveJobs()` | 获取活跃任务 |
| `getJob(jobId)` | 获取单个任务 |
| `getUpcomingJobs(limit?)` | 获取即将执行的任务 |
| `start()` | 启动调度器 |
| `stop()` | 停止调度器 |
| `setPrintExecutor(fn)` | 设置打印执行回调 |
