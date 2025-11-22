/**
 * Logging utilities for debugging and monitoring
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger class for consistent logging across the library
 *
 * @example
 * ```typescript
 * // Enable debug logging
 * Logger.setLevel(LogLevel.DEBUG);
 *
 * Logger.debug('Connecting to device', deviceId);
 * Logger.info('Print job started');
 * Logger.warn('Retry attempt', { attempt: 2, maxRetries: 3 });
 * Logger.error('Connection failed', error);
 * ```
 */
export class Logger {
  private static level: LogLevel = LogLevel.WARN;
  private static prefix = '[TaroBTPrint]';

  /**
   * Sets the global log level
   *
   * @param level - Minimum log level to output
   */
  static setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Gets the current log level
   */
  static getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Logs a debug message (only in DEBUG level)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  /**
   * Logs an info message (DEBUG and INFO levels)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  /**
   * Logs a warning message (DEBUG, INFO, and WARN levels)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  /**
   * Logs an error message (all levels except NONE)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }

  /**
   * Creates a scoped logger with a specific prefix
   *
   * @param scope - Scope name (e.g., 'BluetoothPrinter', 'TaroAdapter')
   * @returns Scoped logger instance
   */
  static scope(scope: string) {
    const scopedPrefix = `${this.prefix}:${scope}`;
    return {
      debug: (message: string, ...args: any[]) => {
        if (Logger.level <= LogLevel.DEBUG) {
          console.log(`${scopedPrefix} [DEBUG]`, message, ...args);
        }
      },
      info: (message: string, ...args: any[]) => {
        if (Logger.level <= LogLevel.INFO) {
          console.log(`${scopedPrefix} [INFO]`, message, ...args);
        }
      },
      warn: (message: string, ...args: any[]) => {
        if (Logger.level <= LogLevel.WARN) {
          console.warn(`${scopedPrefix} [WARN]`, message, ...args);
        }
      },
      error: (message: string, ...args: any[]) => {
        if (Logger.level <= LogLevel.ERROR) {
          console.error(`${scopedPrefix} [ERROR]`, message, ...args);
        }
      },
    };
  }
}
