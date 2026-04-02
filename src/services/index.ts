/**
 * Services Module
 * 服务模块 - 提供连接管理、命令构建、任务管理等功能
 */

export {
  ConnectionManager,
  type ConnectionManagerConfig,
  type ConnectionManagerEvents,
} from './ConnectionManager';

export { CommandBuilder } from './CommandBuilder';

export { PrintJobManager } from './PrintJobManager';

export {
  PrintHistory,
  printHistory,
  type PrintHistoryEntry,
  type PrintHistoryStats,
  type HistoryQueryOptions,
} from './PrintHistory';

export {
  PrinterStatus,
  printerStatus,
  type PrinterStatusInfo,
  type StatusQueryOptions,
  type PaperStatus,
} from './PrinterStatus';

export {
  BatchPrintManager,
  batchPrintManager,
  type BatchJob,
  type BatchConfig,
  type BatchStats,
  type BatchEvents,
} from './BatchPrintManager';

export {
  PrintStatistics,
  printStatistics,
  type PrintStatisticsData,
  type JobTrackingMeta,
} from './PrintStatistics';

export {
  ScheduledRetryManager,
  scheduledRetryManager,
  type ScheduledRetry,
  type RetryOptions,
  type ScheduledRetryEvents,
  type ScheduledRetryManagerConfig,
} from './ScheduledRetryManager';

// 定时打印调度器
export {
  PrintScheduler,
  printScheduler,
  type ScheduledPrint,
  type ScheduleOptions,
  type ScheduleEvents,
  parseCronExpression,
  getNextCronRun,
  getNextIntervalRun,
} from './PrintScheduler';

export * from './interfaces';

// 云打印服务
export {
  CloudPrintManager,
  type CloudPrintOptions,
  type PrintJob,
  type CloudPrinterStatus,
  type CloudPrintEvents,
  type CloudPrintEvent,
} from './CloudPrintManager';

// 二维码打印机配对服务
export {
  QRCodeDiscoveryService,
  type QRCodeDiscoveryOptions,
  type ParsedDeviceInfo,
  type DiscoveryResult,
} from './QRCodeDiscoveryService';

export {
  parseQRCode,
  parseMultipleQRCodes,
  detectQRCodeFormat,
  addQRCodeFormat,
  removeQRCodeFormat,
  getSupportedFormats,
  QR_CODE_FORMATS,
  type QRCodeFormat,
} from './QRCodeParser';
