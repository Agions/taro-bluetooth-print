# 插件系统

`taro-bluetooth-print/plugins` 子模块 — 通过插件拦截和扩展打印生命周期事件。v2.6+ 引入，**实验性 API**。

## 导入

```typescript
import {
  PluginManager,
  createLoggingPlugin,
  createRetryPlugin,
  type Plugin,
  type PluginHooks,
  type PluginOptions,
} from 'taro-bluetooth-print/plugins';
```

## 内置插件

### LoggingPlugin

记录每个打印生命周期事件到 logger：

```typescript
import { createLoggingPlugin } from 'taro-bluetooth-print/plugins';
import { Logger } from 'taro-bluetooth-print/utils';

const logging = createLoggingPlugin({ logger: Logger.scope('PrintLog') });
```

### RetryPlugin

adapter 写入失败时自动重试（指数退避）：

```typescript
import { createRetryPlugin } from 'taro-bluetooth-print/plugins';

const retry = createRetryPlugin({
  maxAttempts: 3,
  backoffMs: (attempt) => 100 * Math.pow(2, attempt - 1),  // 100, 200, 400 ms
});
```

## 使用

```typescript
import { createBluetoothPrinter, PluginManager } from 'taro-bluetooth-print';
import { createLoggingPlugin, createRetryPlugin } from 'taro-bluetooth-print/plugins';

const printer = createBluetoothPrinter();
const manager = new PluginManager();

manager.use(createLoggingPlugin());
manager.use(createRetryPlugin({ maxAttempts: 3 }));

// 钩入打印机生命周期
manager.attach(printer);
```

## 生命周期钩子

```typescript
interface PluginHooks {
  beforeConnect?: (deviceId: string) => void | Promise<void>;
  afterConnect?: (deviceId: string) => void | Promise<void>;
  beforePrint?: (buffer: Uint8Array) => Uint8Array | void | Promise<Uint8Array | void>;
  afterPrint?: (buffer: Uint8Array, result: 'success' | 'failed' | 'cancelled') => void | Promise<void>;
  beforeChunk?: (chunk: ArrayBuffer) => ArrayBuffer | void | Promise<ArrayBuffer | void>;
  onError?: (error: BluetoothPrintError) => void | Promise<void>;
}
```

## 自定义插件

```typescript
import type { Plugin } from 'taro-bluetooth-print/plugins';

const timingPlugin: Plugin = {
  name: 'timing',
  hooks: {
    beforePrint: (buffer) => {
      console.time('print-job');
    },
    afterPrint: (buffer, result) => {
      console.timeEnd('print-job');
      console.log(`Print ${result}: ${buffer.length} bytes`);
    },
  },
};
```

## 注意事项

- 插件按注册顺序**串行**执行
- `beforePrint` / `beforeChunk` 可返回修改后的 buffer 替换原值
- 插件抛出的 error 会**中断**当前打印任务并向上传播
- 跨实例共享 PluginManager（全局 logger / 统计 / 重试策略）

## 相关

- [Logger](./logger.md) — 配合 LoggingPlugin 使用
- [Errors](./errors.md) — 插件抛错的错误码