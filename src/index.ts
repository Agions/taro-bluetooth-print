/**
 * Taro Bluetooth Print Library
 * A lightweight, high-performance Bluetooth printing library for Taro
 *
 * @packageDocumentation
 */

// Core classes
export { BluetoothPrinter } from './core/BluetoothPrinter';
export type { PrinterEvents } from './core/BluetoothPrinter';
export { EventEmitter } from './core/EventEmitter';

// Drivers
export { EscPos } from './drivers/EscPos';

// Adapters
export { TaroAdapter } from './adapters/TaroAdapter';
export { AdapterFactory } from './adapters/AdapterFactory';
export { BaseAdapter } from './adapters/BaseAdapter';
export { WebBluetoothAdapter } from './adapters/WebBluetoothAdapter';
export type { WebBluetoothRequestOptions } from './adapters/WebBluetoothAdapter';

// Services
export { ConnectionManager } from './services/ConnectionManager';
export type {
  ConnectionManagerConfig,
  ConnectionManagerEvents,
} from './services/ConnectionManager';

// Device Management
export { DeviceManager } from './device/DeviceManager';
export type { BluetoothDevice, ScanOptions, DeviceManagerEvents } from './device/DeviceManager';

// Print Queue
export { PrintQueue } from './queue/PrintQueue';
export type {
  PrintJob,
  PrintJobStatus,
  PrintJobPriority,
  QueueConfig,
  PrintQueueEvents,
} from './queue/PrintQueue';

// Offline Cache
export { OfflineCache } from './cache/OfflineCache';
export type { CachedJob, CacheConfig, CacheStats } from './cache/OfflineCache';

// Template Engine
export { TemplateEngine } from './template/TemplateEngine';
export type {
  TemplateType,
  ReceiptData,
  LabelData,
  TemplateDefinition,
  TemplateElement,
  ValidationResult,
} from './template/TemplateEngine';

// Barcode Generator
export { BarcodeGenerator, BarcodeFormat } from './barcode/BarcodeGenerator';
export type { BarcodeOptions } from './barcode/BarcodeGenerator';

// Text Formatter
export { TextFormatter, TextAlign } from './formatter/TextFormatter';
export type { TextStyle } from './formatter/TextFormatter';

// Preview Renderer
export { PreviewRenderer } from './preview/PreviewRenderer';
export type { PreviewOptions, PreviewResult } from './preview/PreviewRenderer';

// Encoding Service
export { EncodingService } from './encoding/EncodingService';
export type { EncodingConfig } from './encoding/EncodingService';

// Utilities
export { Logger, LogLevel } from './utils/logger';
export { Encoding } from './utils/encoding';
export { ImageProcessing } from './utils/image';
export { PlatformType, detectPlatform, isPlatformSupported } from './utils/platform';

// Error handling
export { BluetoothPrintError, ErrorCode } from './errors/BluetoothError';

// Configuration
export { DEFAULT_CONFIG, mergeConfig } from './config/PrinterConfig';
export type {
  PrinterConfig,
  AdapterConfig,
  DriverConfig,
  LoggingConfig,
} from './config/PrinterConfig';

// Types
export * from './types';
