# 解决 "Response truncated due to output length limit" 问题

## 问题描述

在使用 taro-bluetooth-print 库时，如果遇到大量数据输出（如打印大图片、批量打印任务等），可能会出现 "Response truncated due to output length limit" 错误。这是因为：

1. **测试框架输出限制** - Vitest 默认会截断过长的输出
2. **控制台输出限制** - 某些环境对 console.log 输出有限制
3. **日志系统累积** - 大量日志数据导致内存或输出缓冲区溢出

## 解决方案

### 1. 使用输出限制工具 (outputLimiter)

我们提供了 `outputLimiter` 模块来帮助控制输出长度：

```typescript
import {
  truncateString,
  truncateForLog,
  generateSummary,
  batchProcess,
  createLimitedLogger,
} from 'taro-bluetooth-print/utils';

// 截断长字符串
const shortText = truncateString(longText, { maxLength: 1000 });

// 为日志截断数据
Logger.debug('Data received', truncateForLog(largeData, 2000));

// 生成数据摘要
Logger.info('Print job', generateSummary(printJob));
```

### 2. 配置 Logger 输出限制

```typescript
import { Logger, LogLevel } from 'taro-bluetooth-print/utils';

// 配置日志输出限制
Logger.configure({
  level: LogLevel.DEBUG,
  maxOutputLength: 5000,      // 单条日志最大字符数
  useSummaryMode: false,      // 是否使用摘要模式（减少输出量）
});

// 启用摘要模式（适用于生产环境）
Logger.configure({
  useSummaryMode: true,       // 只输出数据摘要，如 "array[100]" 而不是完整数组
});
```

### 3. 批量处理大量数据

```typescript
import { batchProcess } from 'taro-bluetooth-print/utils';

// 分批处理大量打印任务，避免一次性输出过多
const results = await batchProcess(
  largePrintJobs,      // 大量打印任务
  50,                  // 每批处理 50 个
  async (batch, index) => {
    console.log(`Processing batch ${index}...`);
    return await processBatch(batch);
  }
);
```

### 4. 测试配置

在 `vitest.config.ts` 中增加输出限制：

```typescript
export default defineConfig({
  test: {
    // 增加输出限制，防止 "Response truncated" 错误
    outputTruncateLength: 20000,
    outputDiffLines: 100,
  },
});
```

## 使用示例

### 示例 1: 打印大图片时的日志控制

```typescript
import { BluetoothPrinter, Logger, truncateForLog } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter();

// 打印前记录图片信息（截断）
async function printLargeImage(imageData: Uint8Array) {
  // 记录摘要而不是完整数据
  Logger.info('Printing image', {
    size: `${imageData.length} bytes`,
    preview: truncateForLog(imageData.slice(0, 100), 200),
  });

  await printer.image(imageData);
}
```

### 示例 2: 批量打印任务

```typescript
import { BluetoothPrinter, batchProcess, Logger } from 'taro-bluetooth-print';

async function batchPrint(orders: PrintOrder[]) {
  Logger.info(`Starting batch print for ${orders.length} orders`);

  const results = await batchProcess(
    orders,
    10,  // 每批 10 个订单
    async (batch, index) => {
      Logger.info(`Processing batch ${index}/${Math.ceil(orders.length / 10)}`);

      return await Promise.all(
        batch.map(order => printer.print(order))
      );
    }
  );

  Logger.info(`Batch print completed: ${results.length} orders`);
}
```

### 示例 3: 调试模式下的数据检查

```typescript
import { Logger, LogLevel, generateSummary } from 'taro-bluetooth-print';

// 开发环境：详细输出
Logger.configure({
  level: LogLevel.DEBUG,
  maxOutputLength: 10000,
  useSummaryMode: false,
});

// 生产环境：摘要输出
Logger.configure({
  level: LogLevel.WARN,
  maxOutputLength: 1000,
  useSummaryMode: true,
});

// 使用摘要模式
Logger.debug('Received data', generateSummary(largeData));
// 输出: "object{15 keys: id, name, items, ...}"
```

## 最佳实践

1. **开发环境**: 使用较大的 `maxOutputLength` (5000-10000) 便于调试
2. **生产环境**: 启用 `useSummaryMode` 并减小 `maxOutputLength` (1000-2000)
3. **大数据处理**: 使用 `batchProcess` 分批处理，避免阻塞
4. **日志级别**: 根据环境设置合适的日志级别

## API 参考

### truncateString

```typescript
truncateString(str: string, options?: TruncateOptions): string
```

智能截断字符串，可保留首尾部分。

### truncateForLog

```typescript
truncateForLog(data: unknown, maxLength?: number): string
```

将任意数据格式化为适合日志输出的字符串。

### generateSummary

```typescript
generateSummary(data: unknown): string
```

生成数据的简短摘要。

### batchProcess

```typescript
batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], batchIndex: number) => Promise<R[]> | R[]
): Promise<R[]>
```

分批处理大量数据。

### createLimitedLogger

```typescript
createLimitedLogger(maxLength?: number): LimitedLogger
```

创建带有输出限制的日志记录器。
