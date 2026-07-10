# 错误处理

所有 SDK 内部错误统一继承 `BluetoothPrintError`，携带可枚举的 `ErrorCode` 便于程序化处理。

## 导入

```typescript
import {
  BluetoothPrintError,
  ConnectionError,
  PrintJobError,
  CommandBuildError,
  ErrorCode,
} from 'taro-bluetooth-print/errors';
```

## 错误码

```typescript
enum ErrorCode {
  // 连接层
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  ADAPTER_NOT_AVAILABLE = 'ADAPTER_NOT_AVAILABLE',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',

  // 任务层
  PRINT_JOB_FAILED = 'PRINT_JOB_FAILED',
  PRINT_JOB_CANCELLED = 'PRINT_JOB_CANCELLED',
  PRINT_JOB_NOT_FOUND = 'PRINT_JOB_NOT_FOUND',

  // 命令层
  COMMAND_BUILD_FAILED = 'COMMAND_BUILD_FAILED',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',

  // 数据层
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  ENCODING_FAILED = 'ENCODING_FAILED',

  // 通用
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

## 基础错误类

```typescript
class BluetoothPrintError extends Error {
  code: ErrorCode;
  cause?: Error;
  context?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, cause?: Error, context?: Record<string, unknown>);
}
```

## 子类

```typescript
class ConnectionError extends BluetoothPrintError { /* code: CONNECTION_* */ }
class PrintJobError extends BluetoothPrintError { /* code: PRINT_JOB_* */ }
class CommandBuildError extends BluetoothPrintError { /* code: COMMAND_* */ }
```

子类不引入新字段，仅收紧 `code` 取值范围，便于下游用 `instanceof` 守卫。

## 使用模式

### 基础 try/catch

```typescript
try {
  await printer.print();
} catch (e) {
  if (e instanceof BluetoothPrintError) {
    console.error(`[${e.code}] ${e.message}`);
    if (e.cause) console.error('Caused by:', e.cause);
  } else {
    throw e;  // 非 SDK 错误，继续上抛
  }
}
```

### 按 code 分支

```typescript
import { BluetoothPrintError, ErrorCode } from 'taro-bluetooth-print/errors';

async function printWithRetry(printer: BluetoothPrinter, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await printer.print();
      return;
    } catch (e) {
      if (!(e instanceof BluetoothPrintError)) throw e;
      switch (e.code) {
        case ErrorCode.DEVICE_DISCONNECTED:
          await printer.connect(deviceId);  // 重新连接
          break;
        case ErrorCode.PRINT_JOB_FAILED:
          if (i === attempts - 1) throw e;
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));  // 退避重试
          break;
        default:
          throw e;
      }
    }
  }
}
```

### 监听 error 事件

```typescript
printer.on('error', (e: BluetoothPrintError) => {
  console.error(`[${e.code}] ${e.message}`);
  // 提示用户 / 上报埋点
});
```

## 工具函数

`normalizeError()` 把任意 error 归一化为 `BluetoothPrintError`：

```typescript
import { normalizeError } from 'taro-bluetooth-print/utils';

try {
  await someExternalCall();
} catch (e) {
  const err = normalizeError(e);  // 一定是 BluetoothPrintError
  logger.error(err.code, err.message);
}
```

## 相关

- [BluetoothPrinter](./bluetooth-printer.md#错误处理)
- [Logger](./logger.md) — 错误日志格式