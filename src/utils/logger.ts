/**
 * Logging utilities for debugging and monitoring
 */

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Additional arguments */
  args: unknown[];
  /** Timestamp */
  timestamp: Date;
  /** Scope name (if any) */
  scope?: string;
  /** Formatted log string */
  formatted: string;
}

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
 * Custom log handler function type
 */
export type LogHandler = (entry: LogEntry) => void;

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Global prefix for all log messages */
  prefix: string;
  /** Custom log handler function */
  handler?: LogHandler;
}

/**
 * Logger class for consistent logging across the library
 *
 * @example
 * ```typescript
 * // Enable debug logging
 * Logger.setLevel(LogLevel.DEBUG);
 *
 * // Configure custom log handler
 * Logger.configure({
 *   handler: (entry) => {
 *     // Send logs to a custom logging service
 *     console.log(entry.formatted);
 *   }
 * });
 *
 * Logger.debug('Connecting to device', deviceId);
 * Logger.info('Print job started');
 * Logger.warn('Retry attempt', { attempt: 2, maxRetries: 3 });
 * Logger.error('Connection failed', error);
 * ```
 */
export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.WARN,
    prefix: '[TaroBTPrint]',
  };

  /**
   * Configures the logger
   *
   * @param config - Configuration options
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Sets the global log level
   *
   * @param level - Minimum log level to output
   */
  static setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Gets the current log level
   */
  static getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Formats the log prefix
   */
  private static formatPrefix(level: LogLevel, scope?: string): string {
    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.NONE]: 'NONE',
    };

    const scopedPrefix = scope 
      ? `${this.config.prefix}:${scope}` 
      : this.config.prefix;
    
    return `${scopedPrefix} [${levelNames[level]}]`;
  }

  /**
   * Formats a complete log message for custom handlers
   */
  private static formatMessage(level: LogLevel, message: string, args: unknown[], scope?: string): string {
    const prefix = this.formatPrefix(level, scope);
    return `${prefix} ${message}`;
  }

  /**
   * Logs a message with the specified level
   */
  private static log(level: LogLevel, message: string, args: unknown[], scope?: string): void {
    if (this.config.level > level) {
      return;
    }

    const prefix = this.formatPrefix(level, scope);
    const formatted = this.formatMessage(level, message, args, scope);
    const entry: LogEntry = {
      level,
      message,
      args,
      timestamp: new Date(),
      scope,
      formatted,
    };

    if (this.config.handler) {
      // Use custom log handler if provided
      this.config.handler(entry);
    } else {
      // Fall back to console logging with separate arguments for compatibility with tests
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.log(prefix, message, ...args);
          break;
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(prefix, message, ...args);
          break;
        case LogLevel.ERROR:
          // eslint-disable-next-line no-console
          console.error(prefix, message, ...args);
          break;
      }
    }
  }

  /**
   * Logs a debug message (only in DEBUG level)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  /**
   * Logs an info message (DEBUG and INFO levels)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  /**
   * Logs a warning message (DEBUG, INFO, and WARN levels)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  /**
   * Logs an error message (all levels except NONE)
   *
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  static error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, args);
  }

  /**
   * Creates a scoped logger with a specific prefix
   *
   * @param scope - Scope name (e.g., 'BluetoothPrinter', 'TaroAdapter')
   * @returns Scoped logger instance
   */
  static scope(scope: string) {
    return {
      debug: (message: string, ...args: unknown[]) => {
        Logger.log(LogLevel.DEBUG, message, args, scope);
      },
      info: (message: string, ...args: unknown[]) => {
        Logger.log(LogLevel.INFO, message, args, scope);
      },
      warn: (message: string, ...args: unknown[]) => {
        Logger.log(LogLevel.WARN, message, args, scope);
      },
      error: (message: string, ...args: unknown[]) => {
        Logger.log(LogLevel.ERROR, message, args, scope);
      },
    };
  }
}
