# 核心概念

理解以下核心概念有助于更好地使用和扩展 `taro-bluetooth-print`。

::: tip 推荐阅读
如果你想先了解整体架构设计，请先阅读 [架构设计](./architecture.md) 章节。
:::

## 插件架构详解

v2.3+ 引入的插件系统允许在打印流程的关键节点注入自定义逻辑。

### 插件接口

```typescript
import { Plugin, PluginHooks } from 'taro-bluetooth-print';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    beforePrint: (buffer, context) => {
      // 打印前拦截，可修改 buffer
      console.log('即将打印', buffer.byteLength, '字节');
      return buffer;
    },
    afterPrint: (result, context) => {
      // 打印完成后处理
      analytics.track('print_complete', result);
    },
    onError: (error, context) => {
      // 错误处理
      reportError(error);
    },
  },
  // 可选：初始化和销毁
  onInit: () => { /* 初始化 */ },
  onDestroy: () => { /* 清理 */ },
};
```

### 内置插件

**日志插件** — 记录所有打印事件：

```typescript
import { createLoggingPlugin } from 'taro-bluetooth-print';

plugins.register(createLoggingPlugin({
  logProgress: true,
  logErrors: true,
  logLevel: 'debug',
}));
```

**重试插件** — 自动重试失败的打印：

```typescript
import { createRetryPlugin } from 'taro-bluetooth-print';

plugins.register(createRetryPlugin({
  maxRetries: 5,
  initialDelay: 1000,
  backoff: 'exponential',  // 'linear' | 'exponential'
  maxDelay: 60000,
}));
```

---

## 打印队列机制

`PrintQueue` 提供任务排队、优先级调度和自动重试能力。

### 工作流程

```
添加任务 → 按优先级排序 → 取出最高优先级 → 执行打印
    │                                              │
    │                    ← 失败 → 重新入队（延迟重试）←┘
    │
    → 成功 → 发出 job-completed 事件
```

### 优先级队列

```typescript
import { PrintQueue } from 'taro-bluetooth-print';

const queue = new PrintQueue({
  maxSize: 100,
  retryDelay: 1000,
  maxRetries: 3,
});

// 添加任务（带优先级）
queue.add(data1, { priority: 'HIGH' });    // 高优先级
queue.add(data2, { priority: 'NORMAL' }); // 普通
queue.add(data3, { priority: 'LOW' });    // 低

// 任务按 HIGH → NORMAL → LOW 顺序执行
```

### 队列状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `in-progress` | 正在执行 |
| `completed` | 已完成 |
| `failed` | 失败（等待重试） |
| `cancelled` | 已取消 |

---

## 离线缓存策略

`OfflineCache` 在网络不稳定或蓝牙断开时自动缓存打印任务，恢复后自动同步。

### 缓存策略

```
网络正常 → 直接打印
    │
    ↓ 断网
网络断开 → 写入缓存 (localStorage / AsyncStorage)
    │
    ↓ 恢复连接
自动触发 sync() → 逐一取出任务 → 重新执行
```

### 使用方式

```typescript
import { OfflineCache } from 'taro-bluetooth-print';

const cache = new OfflineCache({
  storage: 'localStorage',  // 小程序用 'storage'，RN 用 'AsyncStorage'
  maxSize: 50,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天过期
  autoSync: true,            // 自动同步（默认 true）
  syncInterval: 5000,        // 每 5 秒检查一次
});

// 监听同步事件
cache.on('sync-start', () => console.log('开始同步'));
cache.on('sync-complete', ({ successCount, failedCount }) => {
  console.log(`同步完成: 成功 ${successCount}, 失败 ${failedCount}`);
});
cache.on('sync-error', ({ jobId, error }) => {
  console.error('同步失败:', jobId, error);
});
```

---

## 多打印机管理

`MultiPrinterManager` 支持同时管理多个打印机，进行广播打印和负载均衡。

### 典型场景

- **多门店场景**：每台设备连接各自打印机
- **负载均衡**：将打印任务分配给空闲打印机
- **故障转移**：某台打印机故障时自动切换到备用机

### 使用方式

```typescript
import { MultiPrinterManager } from 'taro-bluetooth-print';

const manager = new MultiPrinterManager();

// 连接多台打印机
await manager.connect('printer-1', 'device-id-1', '前台打印机');
await manager.connect('printer-2', 'device-id-2', '后厨打印机');

// 获取空闲打印机进行打印
const idlePrinters = manager.getIdlePrinters();
if (idlePrinters.length > 0) {
  const printer = manager.getPrinter(idlePrinters[0].printerId);
  await printer.text('Hello').print();
}

// 广播打印（所有打印机同时打印）
await manager.broadcast(data);

// 断开所有
await manager.disconnectAll();
```

### 广播打印结果

```typescript
const result = await manager.broadcast(printData);
console.log('成功:', result.success.length);
console.log('失败:', result.failed.length);
```

---

## 事件系统

`BluetoothPrinter` 基于 `EventEmitter`，支持以下事件：

```typescript
// 打印进度
printer.on('progress', ({ sent, total }) => {
  const pct = ((sent / total) * 100).toFixed(1);
  progressBar.value = pct;
});

// 连接状态变化
printer.on('state-change', (state) => {
  console.log('状态:', state);
});

// 已连接
printer.on('connected', (deviceId) => {
  console.log('已连接:', deviceId);
});

// 已断开
printer.on('disconnected', (deviceId) => {
  console.log('已断开:', deviceId);
});

// 打印完成
printer.on('print-complete', () => {
  console.log('打印完成');
});

// 错误
printer.on('error', (error) => {
  console.error('错误:', error.code, error.message);
});
```

### 移除监听器

```typescript
const handler = (data) => console.log(data);
printer.on('progress', handler);

// 使用完毕后移除
printer.off('progress', handler);

// 或使用 once（只监听一次）
printer.once('print-complete', () => {
  console.log('只触发一次');
});
```

---

## 配置管理

`PrinterConfigManager` 提供配置的持久化存储和动态切换：

```typescript
import { PrinterConfigManager } from 'taro-bluetooth-print';

const configManager = new PrinterConfigManager();

// 保存打印机配置
const id = configManager.savePrinter({
  id: 'printer-001',
  name: '前台热敏机',
  deviceId: 'device-xxx',
  driver: 'EscPos',
  config: { chunkSize: 20, delay: 20 },
  isDefault: true,
});

// 获取默认打印机
const defaultPrinter = configManager.getDefaultPrinter();

// 更新全局配置
configManager.updateGlobalConfig({
  defaultChunkSize: 100,
  defaultDelay: 10,
});

// 导出/导入配置
const exportData = configManager.export();
configManager.import(jsonData, { merge: true });
```
