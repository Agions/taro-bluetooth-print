# PrintHistory API

打印历史记录管理器，记录所有打印任务的详细信息。

## 导入

```typescript
import { PrintHistory } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const history = new PrintHistory({
  maxSize: 1000,        // 最大记录数
  persist: true,        // 是否持久化
  storageKey: 'print-history'
});
```

## 方法

### 记录操作

#### `add(record: PrintRecord): void`

添加打印记录。

```typescript
history.add({
  jobId: 'job-123',
  deviceId: 'printer-1',
  dataSize: 1024,
  duration: 1500,
  success: true
});
```

### 查询操作

#### `getAll(): PrintRecord[]`

获取所有记录。

```typescript
const records = history.getAll();
```

#### `getByDevice(deviceId: string): PrintRecord[]`

按设备 ID 查询。

```typescript
const deviceRecords = history.getByDevice('printer-1');
```

#### `getByDateRange(start: Date, end: Date): PrintRecord[]`

按时间范围查询。

```typescript
const today = history.getByDateRange(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

#### `getSuccessRate(): number`

获取成功率。

```typescript
const rate = history.getSuccessRate();
console.log(`成功率: ${(rate * 100).toFixed(1)}%`);
```

### 清理操作

#### `clear(): void`

清空所有记录。

```typescript
history.clear();
```

#### `prune(keepDays: number): void`

清理指定天数之前的记录。

```typescript
history.prune(30); // 保留最近 30 天
```

## 类型定义

### PrintRecord

```typescript
interface PrintRecord {
  id: string;
  jobId: string;
  deviceId: string;
  dataSize: number;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}
```
