# API 参考

本节提供 `taro-bluetooth-print` 的完整 API 参考文档。

## 核心类

| 类 | 说明 |
|---|---|
| [BluetoothPrinter](./bluetooth-printer) | 蓝牙打印机主类，提供链式调用 API |
| [DeviceManager](./device-manager) | 设备管理器，负责扫描和连接设备 |
| [MultiPrinterManager](./multi-printer-manager) | 多打印机管理器，支持并发和负载均衡 |
| [PrintQueue](./queue) | 打印队列，支持优先级和重试 |

## 数据管理

| 类 | 说明 |
|---|---|
| [OfflineCache](./cache) | 离线缓存，断网自动缓存，来网自动同步 |
| [PrintHistory](./print-history) | 打印历史记录管理 |
| [PrintStatistics](./print-statistics) | 打印统计信息 |

## 高级管理

| 类 | 说明 |
|---|---|
| [ScheduledRetryManager](./scheduled-retry-manager) | 定时重试管理器 |
| [BatchPrintManager](./batch-print-manager) | 批量打印管理器 |
| [PrinterStatus](./printer-status) | 打印机状态监控 |

## 工具与模板

| 类 | 说明 |
|---|---|
| [TemplateEngine](./template-engine) | 模板引擎，支持循环、条件、表格 |
| [BarcodeGenerator](./barcode-generator) | 条码/二维码生成器 |
| [PrinterConfigManager](./printer-config-manager) | 打印机配置管理 |

## 驱动

详见 [drivers](./drivers.md) — 完整 driver 列表 + fluent-builder vs IPrinterDriver 选择指南。

| 驱动 | 协议 | 说明 |
|------|------|------|
| `EscPos` | ESC/POS | 热敏票据打印机 |
| `TsplDriver` | TSPL | TSC 标签打印机 |
| `ZplDriver` | ZPL | Zebra 标签打印机 |
| `CpclDriver` | CPCL | 移动打印机 |
| `StarPrinter` | STAR | STAR 系列打印机 |

## 适配器

详见 [adapters](./adapters.md) — 平台接入详情 + AdapterFactory 自动选择。

| 适配器 | 平台 |
|--------|------|
| `TaroAdapter` | 微信/支付宝/百度/字节跳动小程序 |
| `WebBluetoothAdapter` | H5 浏览器 |
| `ReactNativeAdapter` | React Native |
| `AlipayAdapter` | 支付宝小程序 |
| `BaiduAdapter` | 百度小程序 |
| `ByteDanceAdapter` | 字节跳动小程序 |
| `QQAdapter` | QQ 小程序 |

## 服务层

| 类 | 说明 |
|---|---|
| [BluetoothPrinter](./bluetooth-printer) | 蓝牙打印机主类，提供链式调用 API + `writeRaw()` 原始字节透传（v2.15.3+） |
| [ConnectionManager](#) | 底层 BLE 连接管理（heartbeat / auto-reconnect / state machine） |
| [CommandBuilder](#) | ESC/POS 命令构造器（fluent API） |
| [PrintJobManager](#) | 任务调度（chunking / retry / progress / pause） |
| [PrintScheduler](#) | 定时打印（cron 风格） |
| [CloudPrintManager](#) | 云端打印集成 |
| [QRCodeDiscoveryService](#) | 通过 QR 码发现并配对打印机 |
| [QRCodeParser](#) | QR 码内容解析（业务字段提取） |

## 工具与模板

| 类 | 说明 |
|---|---|
| [TemplateEngine](./template-engine) | 模板引擎，支持循环、条件、表格 |
| [BarcodeGenerator](./barcode-generator) | 条码/二维码生成器 |
| [TextFormatter](#) | 文本格式化（对齐 / 字号 / 加粗 / 下划线） |
| [PreviewRenderer](#) | 预览渲染（PNG / HTML） |
| [ImageProcessing](#) | 图像处理（dithering / 1-bit 转换） |
| [EncodingService](#) | 多编码支持（GBK / Big5 / UTF-8 / Shift-JIS） |
| [Platform](#) | 平台检测（wechat / alipay / h5 / rn） |
| [Logger](#) | 日志门面（scope / level / configure） |
| [outputLimiter](#) | 输出限流（截断 / 批量 / 摘要） |

## 工厂

| 导出 | 说明 |
|---|---|
| [createBluetoothPrinter](./factory) | 主工厂（v2.6+ 推荐） |
| [createWebBluetoothPrinter](./factory) | H5 专用快捷方式 |
| [PrinterFactory](./factory) | 旧版兼容（@deprecated） |

## 插件系统（v2.6+ 实验性）

| 导出 | 说明 |
|---|---|
| [PluginManager](./plugins) | 插件注册 / 顺序执行 |
| [createLoggingPlugin](./plugins) | 日志插件 |
| [createRetryPlugin](./plugins) | 自动重试插件 |
| `Plugin` / `PluginHooks` / `PluginOptions` | 插件接口类型 |

## 类型定义

详见 [types](#) — `IPrinterDriver` / `IPrinterAdapter` / `ICommandBuilder` / `IConnectionManager` / `IPrintJobManager` / `PrinterState` / `IQrOptions` / `IAdapterOptions` / `DeviceInfo` / `PrintProgress`。

## 事件总线

| 导出 | 说明 |
|---|---|
| [EventEmitter](#) | 通用事件总线（on / once / off / emit） |

## 错误处理

详见 [errors](./errors.md) — 完整错误码 + 子类 + retry 模式。

```typescript
import { BluetoothPrintError, ErrorCode } from 'taro-bluetooth-print';

try {
  await printer.print();
} catch (error) {
  if (error instanceof BluetoothPrintError) {
    console.log('错误码:', error.code);
    console.log('错误信息:', error.message);
  }
}
```

### 错误码

| 错误码 | 说明 |
|--------|------|
| `CONNECTION_FAILED` | 连接失败 |
| `CONNECTION_TIMEOUT` | 连接超时 |
| `WRITE_FAILED` | 数据写入失败 |
| `DEVICE_DISCONNECTED` | 设备已断开 |
| `SERVICE_NOT_FOUND` | 蓝牙服务未发现 |
| `CHARACTERISTIC_NOT_FOUND` | 特征值未发现 |
| `PRINT_JOB_IN_PROGRESS` | 打印任务进行中 |
| `INVALID_BUFFER` | 无效的数据缓冲区 |
