# 功能特性

`taro-bluetooth-print` 提供从基础打印到高级管理的完整解决方案，支持热敏票据、标签打印、多平台适配、离线缓存和批量管理。

## 基础打印功能

### 文本打印

支持 GBK / GB2312 / Big5 / UTF-8 等多种字符编码。中文内容推荐使用 GBK 编码。

```typescript
// 中文打印 (推荐 GBK)
await printer.text('欢迎光临', 'GBK');

// 英文打印
await printer.text('Hello World', 'UTF-8');

// 链式调用构建多行内容
await printer
  .text('第一行内容', 'GBK')
  .feed()                 // 换行
  .text('第二行内容', 'GBK')
  .print();
```

### 文本格式化

v2.2+ 支持丰富的文本格式化选项：

```typescript
await printer
  .align('center')              // 对齐: 'left' | 'center' | 'right'
  .setSize(2, 2)                // 字体宽高倍数 (1-8)
  .setBold(true)                // 加粗
  .setUnderline(true)          // 下划线
  .text('大标题文本')
  .feed()
  .resetStyle()                 // 重置所有样式为默认
  .text('普通文本')
  .print();
```

### 图片打印

内置 Floyd-Steinberg 抖动算法，将 RGBA 图像转换为高质量黑白位图：

```typescript
// 从 Canvas 获取图像数据后打印
Taro.canvasGetImageData({
  canvasId: 'myCanvas',
  x: 0, y: 0,
  width: 200,
  height: 100,
  success: (res) => {
    const imageData = new Uint8Array(res.data);
    printer.image(imageData, res.width, res.height).print();
  },
});
```

::: tip 提示
建议图片宽度不超过 384 像素（58mm 纸宽 @ 203 DPI）。过宽的图片需要先缩放。
:::

### 二维码打印

支持自定义大小、模型和纠错级别：

```typescript
// 基本用法
printer.qr('https://example.com');

// 高级选项
printer.qr('https://example.com', {
  model: 2,                    // 模型: 1 或 2 (默认 2)
  size: 8,                     // 模块大小: 1-16 (默认 6)
  errorCorrection: 'H',         // 纠错级别: L(7%) | M(15%) | Q(25%) | H(30%)
});
```

### 条码打印

支持多种一维码格式：

```typescript
// Code 128 (最常用，可编码字母数字)
printer.barcode('1234567890', '128', { height: 50 });

// Code 39 (常用于工业)
printer.barcode('ABC-123-456', '39', { height: 40 });

// EAN-13 (商品条码)
printer.barcode('6901234567890', 'EAN13', { height: 60 });

// EAN-8 (短条码)
printer.barcode('96385074', 'EAN8');
```

### 纸张控制

```typescript
// 进纸
printer.feed();                // 进 1 行
printer.feed(3);               // 进 3 行
printer.feedLines(50);         // 进纸 50 点

// 切纸
printer.cut();                  // 全切
printer.partialCut();          // 半切 (部分型号支持)

// 开钱箱 (需打印机支持)
printer.openCashDrawer();
```

---

## 高级功能

### 断点续传

支持在打印过程中**暂停、恢复和取消**任务，适合大量数据打印和可中断操作场景：

```typescript
// 构建大量打印内容
printer
  .text('第1页内容...')
  .feed(10)
  .text('第2页内容...')
  .feed(10)
  .text('第3页内容...');

// 开始异步打印
const printPromise = printer.print();

// 5 秒后暂停
setTimeout(() => {
  printer.pause();
  console.log('已暂停，剩余:', printer.remaining(), '字节');
}, 5000);

// 再过 5 秒恢复
setTimeout(async () => {
  await printer.resume();
  console.log('已恢复打印');
}, 10000);

// 或在任意时刻取消
setTimeout(() => {
  printer.cancel();
}, 3000);

await printPromise;
```

### 弱网适配

在网络不稳定环境下自动重试：

```typescript
printer.setOptions({
  chunkSize: 20,    // 每次发送字节数 (默认 20，过大易丢包)
  delay: 50,        // 分片间隔 ms (默认 20)
  retries: 5,       // 失败重试次数 (默认 3)
});
```

### 打印进度监听

实时监听打印进度：

```typescript
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  console.log(`打印进度: ${percent}% (${sent}/${total} 字节)`);
  // 可用于更新 UI 进度条
});

printer.on('print-complete', () => {
  console.log('打印完成！');
});

printer.on('error', (error) => {
  console.error('打印错误:', error.code, error.message);
});
```

### 模板引擎（enhanced）

v2.x 内置增强版模板引擎，支持 `loop` 循环、`condition` 条件、`border` 边框、`table` 表格等高级语法：

```typescript
import { TemplateEngine } from 'taro-bluetooth-print';

const engine = new TemplateEngine();

// 收据模板
const receiptData = {
  store: {
    name: '我的商店',
    address: '北京市朝阳区建国路 88 号',
    phone: '010-12345678',
  },
  order: {
    id: 'ORD-20240115-001',
    date: '2024-01-15 14:30:00',
    cashier: '张三',
  },
  items: [
    { name: '农夫山泉', quantity: 2, price: 3.0 },
    { name: '方便面', quantity: 1, price: 5.5 },
    { name: '口香糖', quantity: 1, price: 6.5, discount: 1.0 },
  ],
  payment: {
    subtotal: 18.0,
    discount: 1.0,
    total: 17.0,
    method: '微信支付',
    received: 20.0,
    change: 3.0,
  },
  qrCode: 'wxp://f2f0xxx',
};

const commands = engine.renderReceipt(receiptData);
await printer.print(commands);
```

自定义模板（支持 loop 和 condition）：

```typescript
import { TemplateElement } from 'taro-bluetooth-print';

const customTemplate: TemplateElement[] = [
  { type: 'text', content: '=== 销售单 ===', align: 'center' },
  { type: 'line' },
  // 循环打印商品
  {
    type: 'loop',
    items: '{{items}}',
    children: [
      { type: 'text', content: '{{name}} x{{quantity}}    ¥{{price}}' },
    ],
  },
  // 条件判断：有折扣时显示
  {
    type: 'condition',
    test: '{{hasDiscount}}',
    then: [
      { type: 'text', content: '优惠：-¥{{discount}}' },
    ],
  },
  { type: 'line' },
  {
    type: 'text',
    content: '合计：¥{{total}}',
    bold: true,
  },
  { type: 'qr', content: '{{qrCode}}' },
];

const commands = engine.render(customTemplate, receiptData);
```

### 打印预览

将 ESC/POS 指令渲染为图像用于预览：

```typescript
import { PreviewRenderer } from 'taro-bluetooth-print';

const preview = new PreviewRenderer({
  width: 576,    // 58mm 纸宽 @ 203 DPI = 384px；80mm = 576px
  height: 800,
});

// 渲染当前打印指令为图像
const imageData = await preview.render(printer.getCommands());

// 显示在 Canvas
const ctx = canvas.getContext('2d');
ctx.putImageData(imageData, 0, 0);
```

### 打印队列

管理多个打印任务，支持优先级排序：

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({
  maxSize: 100,
  retryDelay: 1000,
});

// 添加任务（带优先级）
queue.add(printData1, { priority: 'HIGH' });
queue.add(printData2, { priority: 'NORMAL' });
queue.add(printData3, { priority: 'LOW' });

// 监听事件
queue.on('job-added', (job) => console.log('新任务:', job.id));
queue.on('job-completed', (job) => console.log('完成:', job.id));
queue.on('job-failed', (job, error) => console.error('失败:', job.id, error));
```

### 离线缓存

网络断开时自动缓存任务，恢复后自动同步：

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache({
  storage: 'localStorage',
  maxSize: 50,
});

// 断网时保存任务
await cache.save({
  id: 'job-001',
  data: printData,
  timestamp: Date.now(),
});

// 重连后同步
await cache.sync();

// 查看缓存状态
const stats = cache.getStats();
console.log('缓存任务数:', stats.jobCount);
```

---

## 新增功能（v2.4+）

### PrintStatistics — 打印统计

跟踪和分析打印任务的执行情况：

```typescript
import { PrintStatistics } from 'taro-bluetooth-print';

const stats = new PrintStatistics();

// 跟踪任务开始
stats.trackJobStart('job-001', { driver: 'EscPos', deviceId: 'xxx' });

// 跟踪任务完成
stats.trackJobComplete('job-001', 1024, 500); // bytes, durationMs

// 获取统计报告
const report = stats.getStatistics();
console.log('成功率:', (report.successRate * 100).toFixed(1) + '%');
console.log('平均打印时间:', report.averagePrintTime, 'ms');

// 按日期和驱动分别统计
console.log('今日:', report.byDate['2024-01-15']);
console.log('EscPos:', report.byDriver['EscPos']);

// 导出 JSON
const json = stats.exportToJSON();
```

### ScheduledRetryManager — 定时重试

支持时间调度和指数退避的智能重试：

```typescript
import { ScheduledRetryManager } from 'taro-bluetooth-print';

const manager = new ScheduledRetryManager();

// 30 秒后重试
manager.scheduleRetry('job-456', new Date(Date.now() + 30_000));

// 指数退避重试
manager.scheduleRetry('job-789', new Date(), {
  baseDelay: 1000,     // 初始延迟 1s
  maxDelay: 60000,     // 最大延迟 60s
  maxAttempts: 5,
});

// 监听重试事件
manager.on('retry-due', ({ entry }) => {
  console.log('触发重试:', entry.jobId, '第', entry.attemptCount, '次');
});

manager.on('retry-exhausted', ({ jobId }) => {
  console.error('重试次数用尽:', jobId);
});
```

### BatchPrintManager — 批量打印

高效管理大量打印任务，自动合并和分批处理：

```typescript
import { BatchPrintManager } from 'taro-bluetooth-print';

const batch = new BatchPrintManager({
  maxBatchSize: 50 * 1024,   // 最大批次 50KB
  maxWaitTime: 1000,          // 最大等待 1s
  enableMerging: true,        // 启用合并
});

// 添加批量任务
batch.addJob(data1, 'HIGH', { label: '订单A' });
batch.addJob(data2, 'NORMAL', { label: '订单B' });

// 手动触发批次处理
batch.processBatch(async (jobs) => {
  for (const job of jobs) {
    await printer.print(job.data);
  }
  return jobs.length;
});

// 监听批次就绪
batch.on('batch-ready', (jobs) => {
  console.log('批次就绪，共', jobs.length, '个任务');
});
```

### PrintHistory — 打印历史

记录和管理打印历史，支持查询和导出：

```typescript
import { PrintHistory } from 'taro-bluetooth-print';

const history = new PrintHistory(1000); // 最多保留 1000 条

// 添加历史记录
history.addJob({
  id: 'job-001',
  deviceId: 'device-xxx',
  deviceName: '热敏打印机-01',
  bytes: 1024,
  duration: 500,
  status: 'completed',
  timestamp: Date.now(),
});

// 查询最近记录
const recent = history.getRecent(10);

// 统计
const stats = history.getStats({ status: 'completed' });
console.log('总打印次数:', stats.total);

// 导出
const json = history.export();
```

### PrinterStatus — 状态查询

查询打印机当前状态（纸张、刀纸、温度等）：

```typescript
import { PrinterStatus } from 'taro-bluetooth-print';

const status = new PrinterStatus();

// 查询完整状态
const info = await status.getStatus(
  (data) => printer.write(data),   // 写入函数
  () => printer.read(),            // 读取函数（如果支持）
);

// 检查纸张状态
const paper = await status.checkPaper(
  (data) => printer.write(data),
  () => printer.read(),
);

console.log('纸张状态:', paper); // 'ok' | 'low' | 'out' | 'unknown'

// 检查打印机是否就绪
const ready = await status.isReady(
  (data) => printer.write(data),
  () => printer.read(),
);
```

### BarcodeGenerator — 条码生成器

内置多种条码格式的生成器，支持校验和错误检测：

```typescript
import { BarcodeGenerator, BarcodeFormat } from 'taro-bluetooth-print';

const generator = new BarcodeGenerator();

// 生成条码指令
const commands = generator.generate('1234567890', {
  format: BarcodeFormat.CODE128,
  width: 2,
  height: 50,
  displayText: true,
});

// 校验条码内容
const result = generator.validate('1234567890', BarcodeFormat.EAN13);
if (!result.valid) {
  console.error('条码校验失败:', result.errors);
}

// 获取支持的格式
const supported = generator.getSupportedFormats();
// ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPCA', 'ITF', 'CODABAR']
```

---

## 编码支持

| 编码 | 说明 | 推荐场景 |
|------|------|---------|
| GBK | 中文简体 | 中国产热敏打印机（**推荐**） |
| GB2312 | 简体中文（子集） | 老旧打印机 |
| Big5 | 中文繁体 | 台湾/香港打印机 |
| UTF-8 | Unicode | 支持 Unicode 的新型打印机 |

```typescript
// 自动检测最佳编码
const encoding = encodingService.detectEncoding('Hello 你好');
// => 'UTF-8' (混合内容)

// 手动指定
driver.text('中文内容', 'GBK');
```

::: danger 注意
目前库的 GBK 编码实现会回退到 UTF-8。如果打印机不支持 UTF-8，建议使用支持 GBK 的打印机型号。
:::

## 插件系统

v2.3+ 支持功能扩展插件：

```typescript
import { PluginManager, createLoggingPlugin, createRetryPlugin } from 'taro-bluetooth-print';

const plugins = new PluginManager();

// 日志插件
plugins.register(createLoggingPlugin({
  logProgress: true,
  logErrors: true,
}));

// 重试插件
plugins.register(createRetryPlugin({
  maxRetries: 5,
  initialDelay: 1000,
  backoff: 'exponential',
}));

// 自定义插件
plugins.register({
  name: 'analytics',
  hooks: {
    beforePrint: (buffer) => {
      analytics.track('print', { size: buffer.length });
      return buffer;
    },
    afterPrint: (bytesSent) => {
      analytics.track('print_complete', { bytes: bytesSent });
    },
  },
});
```
