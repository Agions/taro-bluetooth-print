# 工厂函数

`taro-bluetooth-print` 顶层导出的工厂函数。负责按平台自动选择 adapter、组装核心服务、构造 `BluetoothPrinter` 实例。

## 导入

```typescript
import {
  createBluetoothPrinter,
  createWebBluetoothPrinter,
  PrinterFactory,        // 旧版 (v2.x) 兼容层
} from 'taro-bluetooth-print';
```

## createBluetoothPrinter

主入口，**v2.6+ 推荐**。

```typescript
function createBluetoothPrinter(options?: {
  adapter?: IPrinterAdapter;
  connectionManager?: IConnectionManager;
  printJobManager?: IPrintJobManager;
  commandBuilder?: ICommandBuilder;
  logger?: Logger;
}): BluetoothPrinter
```

### 最小用法（自动选 adapter）

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter();
// ↑ 内部检测平台：wx → TaroAdapter, navigator.bluetooth → WebBluetoothAdapter...
```

### 显式 adapter

```typescript
import { createBluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({
  adapter: new TaroAdapter(),
});
```

### 注入自定义服务

```typescript
import { createBluetoothPrinter, TsplDriver, ConnectionManager } from 'taro-bluetooth-print';

const cm = new ConnectionManager({
  heartbeatEnabled: false,
  maxReconnectAttempts: 5,
});

const printer = createBluetoothPrinter({
  connectionManager: cm,
  // commandBuilder: new CommandBuilder(new TsplDriver()),  // 注意: TsplDriver 不实现 IPrinterDriver
});
```

## createWebBluetoothPrinter

H5 / Web Bluetooth 专用快捷方式，等价于 `createBluetoothPrinter({ adapter: new WebBluetoothAdapter() })`：

```typescript
import { createWebBluetoothPrinter } from 'taro-bluetooth-print';

const printer = createWebBluetoothPrinter();
```

## PrinterFactory（旧版兼容）

v2.0 ~ v2.5 的工厂类，v2.6 起标记为 `@deprecated`，**不推荐**用于新代码。`createBluetoothPrinter` 内部不再使用它。

```typescript
import { PrinterFactory } from 'taro-bluetooth-print';

// 旧用法
const printer = PrinterFactory.create({ adapter: new TaroAdapter() });

// ✅ 新用法
const printer = createBluetoothPrinter({ adapter: new TaroAdapter() });
```

## 相关

- [BluetoothPrinter](./bluetooth-printer.md#创建实例) — 实例 API
- [Adapters](./adapters.md) — 各平台 adapter 列表
- [Logger](./logger.md) — 自定义 logger 注入