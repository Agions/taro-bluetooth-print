/**
 * Taro Bluetooth Print Library
 * 轻量级、高性能的蓝牙打印库
 *
 * @packageDocumentation
 */

// Core classes
export { BluetoothPrinter } from './core/BluetoothPrinter';
export type { PrinterEvents } from './core/BluetoothPrinter';
export { EventEmitter } from './core/EventEmitter';

// Drivers - 打印机驱动
export * from './drivers';

// Adapters - 平台适配器
export { TaroAdapter } from './adapters/TaroAdapter';
export { AlipayAdapter } from './adapters/AlipayAdapter';
export { BaiduAdapter } from './adapters/BaiduAdapter';
export { ByteDanceAdapter } from './adapters/ByteDanceAdapter';
export { WebBluetoothAdapter } from './adapters/WebBluetoothAdapter';
export { AdapterFactory } from './adapters/AdapterFactory';
export { BaseAdapter } from './adapters/BaseAdapter';
export type { WebBluetoothRequestOptions } from './adapters/WebBluetoothAdapter';

// Services - 服务层
export * from './services';

// Device Management - 设备管理
export { DeviceManager, deviceManager } from './device/DeviceManager';
export type { BluetoothDevice, ScanOptions, DeviceManagerEvents } from './device/DeviceManager';

export { MultiPrinterManager, multiPrinterManager } from './device/MultiPrinterManager';
export type {
  PrinterConnection,
  MultiConnectOptions,
  BroadcastOptions,
  MultiPrinterManagerEvents,
} from './device/MultiPrinterManager';

// Print Queue - 打印队列
export { PrintQueue } from './queue/PrintQueue';
export type {
  PrintJob,
  PrintJobStatus,
  PrintJobPriority,
  QueueConfig,
  PrintQueueEvents,
} from './queue/PrintQueue';

// Offline Cache - 离线缓存
export { OfflineCache } from './cache/OfflineCache';
export type { CachedJob, CacheConfig, CacheStats } from './cache/OfflineCache';

// Template Engine - 模板引擎
export { TemplateEngine } from './template/TemplateEngine';
export type {
  TemplateType,
  ReceiptData,
  LabelData,
  TemplateDefinition,
  TemplateElement,
  ValidationResult,
} from './template/TemplateEngine';

// Barcode Generator - 条码生成
export { BarcodeGenerator, BarcodeFormat } from './barcode/BarcodeGenerator';
export type { BarcodeOptions } from './barcode/BarcodeGenerator';

// Text Formatter - 文本格式化
export { TextFormatter, TextAlign } from './formatter/TextFormatter';
export type { TextStyle } from './formatter/TextFormatter';

// Preview Renderer - 打印预览
export { PreviewRenderer } from './preview/PreviewRenderer';
export type { PreviewOptions, PreviewResult } from './preview/PreviewRenderer';

// Encoding - 编码服务
export { EncodingService } from './encoding/EncodingService';
export type { EncodingConfig } from './encoding/EncodingService';

// Utilities - 工具函数
export { Logger, LogLevel } from './utils/logger';
export { Encoding } from './utils/encoding';
export { ImageProcessing } from './utils/image';
export { PlatformType, detectPlatform, isPlatformSupported } from './utils/platform';
export {
  truncateString,
  truncateForLog,
  batchProcess,
  createLimitedLogger,
  generateSummary,
} from './utils/outputLimiter';
export type { TruncateOptions } from './utils/outputLimiter';

// Error handling - 错误处理
export { BluetoothPrintError, ErrorCode } from './errors/BluetoothError';
export { ConnectionError, ConnectionErrorCode } from './errors/ConnectionError';
export { PrintJobError, PrintJobErrorCode } from './errors/PrintJobError';
export { CommandBuildError, CommandBuildErrorCode } from './errors/CommandBuildError';

// Factory - 工厂模式
export {
  createBluetoothPrinter,
  createWebBluetoothPrinter,
  PrinterFactory,
  type PrinterFactoryOptions,
} from './factory';

// DI Factory - 依赖注入工厂
export {
  createPrinter,
  getServiceProvider,
  createServiceProvider,
  type CreatePrinterOptions,
  type ServiceProviderOptions,
} from './factory/di-factory';

// Core Architecture - 核心架构
export {
  Container,
  rootContainer,
  injectable,
  inject,
  EventBus,
  globalEventBus,
  PluginManager,
} from './core';

export {
  ADAPTER_TOKEN,
  DRIVER_TOKEN,
  DEVICE_MANAGER_TOKEN,
  CONNECTION_MANAGER_TOKEN,
  PRINT_JOB_MANAGER_TOKEN,
  PRINT_QUEUE_TOKEN,
  OFFLINE_CACHE_TOKEN,
  CONFIG_MANAGER_TOKEN,
  LOGGER_TOKEN,
  EVENT_BUS_TOKEN,
  PLUGIN_MANAGER_TOKEN,
  PERFORMANCE_MONITOR_TOKEN,
  COMMAND_BUILDER_TOKEN,
  PRINTER_STATUS_TOKEN,
  PRINT_HISTORY_TOKEN,
  PRINT_STATISTICS_TOKEN,
  CLOUD_PRINT_MANAGER_TOKEN,
  SCHEDULED_RETRY_MANAGER_TOKEN,
  BATCH_PRINT_MANAGER_TOKEN,
} from './core';

// Configuration - 配置
export { DEFAULT_CONFIG, mergeConfig } from './config/PrinterConfig';
export type {
  PrinterConfig,
  AdapterConfig,
  DriverConfig,
  LoggingConfig,
} from './config/PrinterConfig';

export { PrinterConfigManager, printerConfigManager } from './config/PrinterConfigManager';
export type { SavedPrinter, GlobalConfig, IConfigStorage } from './config/PrinterConfigManager';

// Plugin System - 插件系统
export { createLoggingPlugin, createRetryPlugin } from './plugins';
export type { Plugin, PluginHooks, PluginOptions, PluginFactory } from './plugins/types';

// Types - 类型定义
export * from './types';
