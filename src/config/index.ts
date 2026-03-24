/**
 * Config Module
 * 配置模块 - 提供打印机配置管理
 */

export { PrinterConfigManager, printerConfigManager } from './PrinterConfigManager';
export type {
  SavedPrinter,
  PrintConfig,
  GlobalConfig,
  IConfigStorage,
} from './PrinterConfigManager';

export { DEFAULT_CONFIG, mergeConfig } from './PrinterConfig';
export type { PrinterConfig, AdapterConfig, DriverConfig, LoggingConfig } from './PrinterConfig';
