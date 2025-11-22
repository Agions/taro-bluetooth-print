/**
 * Taro Bluetooth Print Library
 * A lightweight, high-performance Bluetooth printing library for Taro
 *
 * @packageDocumentation
 */

// Core classes
export { BluetoothPrinter } from './core/BluetoothPrinter';
export { EventEmitter } from './core/EventEmitter';

// Drivers
export { EscPos } from './drivers/EscPos';

// Adapters
export { TaroAdapter } from './adapters/TaroAdapter';

// Utilities
export { Logger, LogLevel } from './utils/logger';
export { Encoding } from './utils/encoding';
export { ImageProcessing } from './utils/image';

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
