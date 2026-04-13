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

| 驱动 | 协议 | 说明 |
|------|------|------|
| `EscPos` | ESC/POS | 热敏票据打印机 |
| `TsplDriver` | TSPL | TSC 标签打印机 |
| `ZplDriver` | ZPL | Zebra 标签打印机 |
| `CpclDriver` | CPCL | 移动打印机 |
| `StarPrinter` | STAR | STAR 系列打印机 |

## 适配器

| 适配器 | 平台 |
|--------|------|
| `TaroAdapter` | 微信/支付宝/百度/字节跳动小程序 |
| `WebBluetoothAdapter` | H5 浏览器 |
| `ReactNativeAdapter` | React Native |
| `AlipayAdapter` | 支付宝小程序 |
| `BaiduAdapter` | 百度小程序 |
| `ByteDanceAdapter` | 字节跳动小程序 |
| `QQAdapter` | QQ 小程序 |

## 错误处理

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
