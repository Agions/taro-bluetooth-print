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

export { PrintHistory, printHistory, type PrintHistoryEntry, type PrintHistoryStats, type HistoryQueryOptions } from './PrintHistory';

export { PrinterStatus, printerStatus, type PrinterStatusInfo, type StatusQueryOptions, type PaperStatus } from './PrinterStatus';

export { BatchPrintManager, batchPrintManager, type BatchJob, type BatchConfig, type BatchStats, type BatchEvents } from './BatchPrintManager';

export * from './interfaces';
