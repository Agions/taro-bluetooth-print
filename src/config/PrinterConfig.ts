/**
 * Configuration management for the printer library
 */

import { LogLevel } from '@/utils/logger';

/**
 * Adapter configuration options
 */
export interface AdapterConfig {
  /** Size of data chunks in bytes (default: 20) */
  chunkSize: number;
  /** Delay between chunks in milliseconds (default: 20) */
  delay: number;
  /** Number of retries on write failure (default: 3) */
  retries: number;
  /** Connection timeout in milliseconds (default: 10000) */
  timeout: number;
}

/**
 * Driver configuration options
 */
export interface DriverConfig {
  /** Text encoding (default: 'GBK') */
  encoding: string;
  /** Paper width in mm (default: 58) */
  paperWidth: number;
}

/**
 * Logging configuration options
 */
export interface LoggingConfig {
  /** Log level (default: WARN) */
  level: LogLevel;
}

/**
 * Complete printer configuration
 */
export interface PrinterConfig {
  adapter: AdapterConfig;
  driver: DriverConfig;
  logging: LoggingConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: PrinterConfig = {
  adapter: {
    chunkSize: 20,
    delay: 20,
    retries: 3,
    timeout: 10000,
  },
  driver: {
    encoding: 'GBK',
    paperWidth: 58,
  },
  logging: {
    level: LogLevel.WARN,
  },
};

/**
 * Deep merge two configuration objects
 *
 * @param target - Target configuration
 * @param source - Source configuration
 * @returns Merged configuration
 */
export function mergeConfig(
  target: Partial<PrinterConfig>,
  source: Partial<PrinterConfig>
): PrinterConfig {
  return {
    adapter: {
      ...DEFAULT_CONFIG.adapter,
      ...target.adapter,
      ...source.adapter,
    },
    driver: {
      ...DEFAULT_CONFIG.driver,
      ...target.driver,
      ...source.driver,
    },
    logging: {
      ...DEFAULT_CONFIG.logging,
      ...target.logging,
      ...source.logging,
    },
  };
}
