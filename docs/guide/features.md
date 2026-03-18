# 功能特性

`taro-bluetooth-print` 提供完整的蓝牙打印解决方案，支持热敏票据打印和标签打印。

## 核心功能

### 文本打印

支持多种字符编码，包括 GBK、GB2312、Big5 和 UTF-8。

```typescript
// 中文打印 (推荐 GBK)
await printer.text('欢迎光临', 'GBK');

// 英文打印
await printer.text('Hello World', 'UTF-8');

// 链式调用
await printer
  .text('第一行', 'GBK')
  .feed()
  .text('第二行', 'GBK')
  .print();
```

### 文本格式化

v2.2+ 支持丰富的文本格式化功能。

```typescript
await printer
  .align('center')           // 对齐: left/center/right
  .setSize(2, 2)            // 字体大小 (宽, 高)
  .setBold(true)             // 加粗
  .setUnderline(true)        // 下划线
  .text('大标题')
  .resetStyle()              // 重置所有样式
  .text('普通文本')
  .print();
```

### 图片打印

内置 Floyd-Steinberg 抖动算法，将 RGBA 图像转换为黑白位图。

```typescript
// 从 Canvas 获取图像数据
const canvas = Taro.createCanvasContext('myCanvas');
// ... 绘制内容 ...

Taro.canvasGetImageData({
  canvasId: 'myCanvas',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  success: (res) => {
    const imageData = new Uint8Array(res.data);
    printer.image(imageData, res.width, res.height).print();
  }
});
```

### 二维码打印

支持自定义大小和纠错级别。

```typescript
// 基本用法
printer.qr('https://example.com');

// 高级选项
printer.qr('https://example.com', {
  model: 2,               // 模型: 1 或 2 (默认 2)
  size: 8,                // 模块大小: 1-16 (默认 6)
  errorCorrection: 'M'     // 纠错级别: L/M/Q/H
});
```

### 条码打印

支持多种一维码格式。

```typescript
// Code 128 (最常用)
printer.barcode('1234567890', '128', { height: 50 });

// Code 39
printer.barcode('ABC-123', '39', { height: 40 });

// EAN-13
printer.barcode('6901234567890', 'EAN13', { height: 60 });

// EAN-8 (短条码)
prinner.barcode('96385074', 'EAN8');
```

### 纸张控制

```typescript
// 进纸
printer.feed();           // 进 1 行
printer.feed(3);          // 进 3 行
printer.feedLines(50);    // 进纸 50 点

// 切纸
printer.cut();            // 全切
printer.partialCut();     // 半切 (部分型号)

// 开钱箱 (需要打印机支持)
printer.openCashDrawer();
```

---

## 高级功能

### 断点续传

支持在打印过程中暂停、恢复和取消任务。

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

// 5秒后暂停
setTimeout(() => {
  printer.pause();
  console.log('已暂停，剩余:', printer.remaining(), '字节');
}, 5000);

// 再过5秒恢复
setTimeout(async () => {
  await printer.resume();
  console.log('已恢复打印');
}, 10000);

// 取消打印
setTimeout(() => {
  printer.cancel();
}, 3000);

await printPromise;
```

### 弱网适配

在网络不稳定环境下自动重试。

```typescript
printer.setOptions({
  chunkSize: 20,    // 每次发送字节数
  delay: 30,        // 分片间隔 (ms)
  retries: 5,       // 失败重试次数
});
```

### 打印进度

实时监听打印进度。

```typescript
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  console.log(`打印进度: ${percent}%`);
  
  // 更新 UI
  progressBar.value = percent;
});
```

### 打印队列

管理多个打印任务。

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({
  maxSize: 100,      // 最大队列长度
  retryDelay: 1000,  // 重试延迟
});

// 添加任务 (带优先级)
queue.add(printData1, { priority: 'HIGH' });
queue.add(printData2, { priority: 'NORMAL' });
queue.add(printData3, { priority: 'LOW' });

// 监听事件
queue.on('job-added', (job) => console.log('新任务:', job.id));
queue.on('job-completed', (job) => console.log('完成:', job.id));
queue.on('job-failed', (job, error) => console.error('失败:', job.id, error));
```

### 离线缓存

网络断开时自动缓存任务。

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache({
  storage: 'localStorage',  // 存储方式
  maxSize: 50,             // 最大缓存数
});

// 断网时保存
await cache.save({
  id: 'job-001',
  data: printData,
  timestamp: Date.now()
});

// 重连后同步
await cache.sync();

// 查看缓存状态
const stats = cache.getStats();
console.log('缓存任务数:', stats.jobCount);
```

### 模板引擎

内置收据和标签模板。

```typescript
import { TemplateEngine, ReceiptData } from 'taro-bluetooth-print';

const engine = new TemplateEngine();

// 收据模板
const receiptData: ReceiptData = {
  title: '商店名称',
  items: [
    { name: '商品A', price: 10, quantity: 1 },
    { name: '商品B', price: 20, quantity: 2 },
  ],
  total: 50,
  qrcode: 'https://example.com'
};

// 生成打印指令
const buffer = engine.render('receipt', receiptData);
await printer.print(buffer);
```

### 打印预览

将 ESC/POS 指令渲染为图像预览。

```typescript
import { PreviewRenderer } from 'taro-bluetooth-print';

const preview = new PreviewRenderer({
  width: 576,     // 58mm 纸宽 @ 203 DPI
  height: 800     // 预览高度
});

// 渲染预览图像
const imageData = await preview.render(printer.getCommands());

// 显示在 Canvas
const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
ctx.putImageData(imageData, 0, 0);
```

### 插件系统

v2.3+ 支持扩展功能。

```typescript
import { PluginManager, createLoggingPlugin } from 'taro-bluetooth-print';

const plugins = new PluginManager();

// 日志插件
plugins.register(createLoggingPlugin({
  logProgress: true,
  logErrors: true
}));

// 重试插件
plugins.register(createRetryPlugin({
  maxRetries: 5,
  initialDelay: 1000,
  backoff: 'exponential'
}));

// 自定义插件
plugins.register({
  name: 'analytics',
  hooks: {
    beforePrint: (buffer) => {
      // 上报打印数据
      analytics.track('print', { size: buffer.length });
      return buffer;
    },
    afterPrint: (bytesSent) => {
      analytics.track('print_complete', { bytes: bytesSent });
    }
  }
});
```

---

## 编码支持

| 编码 | 说明 | 推荐场景 |
|------|------|----------|
| GBK | 中文简体 | 中国产热敏打印机 |
| GB2312 | 简体中文 | 老旧打印机 |
| Big5 | 中文繁体 | 台湾/香港打印机 |
| UTF-8 | Unicode | 支持 Unicode 的新型打印机 |

```typescript
// 自动检测编码
const encoding = encodingService.detectEncoding('Hello 你好');
// => 'UTF-8' (混合内容)

// 手动指定
driver.text('中文内容', 'GBK');
```
