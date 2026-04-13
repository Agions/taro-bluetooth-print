# PrintStatistics API

打印统计服务，提供详细的打印数据统计和分析。

## 导入

```typescript
import { PrintStatistics } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const stats = new PrintStatistics();
```

## 方法

### 任务追踪

#### `trackJobStart(jobId: string, deviceId: string): void`

记录任务开始。

```typescript
stats.trackJobStart('job-123', 'printer-1');
```

#### `trackJobComplete(jobId: string, bytesSent: number): void`

记录任务完成。

```typescript
stats.trackJobComplete('job-123', 1024);
```

#### `trackJobFail(jobId: string, error: Error): void`

记录任务失败。

```typescript
stats.trackJobFail('job-123', new Error('写入失败'));
```

#### `trackJobCancel(jobId: string): void`

记录任务取消。

```typescript
stats.trackJobCancel('job-123');
```

### 统计查询

#### `getSummary(): StatisticsSummary`

获取统计摘要。

```typescript
const summary = stats.getSummary();
console.log(`总任务: ${summary.totalJobs}`);
console.log(`成功: ${summary.successfulJobs}`);
console.log(`失败: ${summary.failedJobs}`);
console.log(`成功率: ${summary.successRate}`);
console.log(`平均耗时: ${summary.avgDuration}ms`);
```

#### `getDeviceStats(deviceId: string): DeviceStatistics`

获取设备统计。

```typescript
const deviceStats = stats.getDeviceStats('printer-1');
```

#### `getHourlyDistribution(): HourlyStats[]`

获取小时分布统计。

```typescript
const hourly = stats.getHourlyDistribution();
// 用于绘制图表
```

### 导入导出

#### `exportToJSON(): string`

导出为 JSON。

```typescript
const json = stats.exportToJSON();
```

#### `importFromJSON(json: string): void`

从 JSON 导入。

```typescript
stats.importFromJSON(json);
```

## 类型定义

### StatisticsSummary

```typescript
interface StatisticsSummary {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  successRate: number;
  avgDuration: number;
  totalBytes: number;
}
```
