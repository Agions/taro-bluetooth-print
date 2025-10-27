/**
 * 日志系统模块导出
 */

// 类型定义
export type {
  ILogEntry,
  ILogFormatter,
  ILogAppender,
  ILogFilter,
  ILogger,
  ITimer,
  ILogContext,
  ILoggerFactory,
  ILogConfig,
  ILogStats,
  IStructuredLog,
  ILogPattern,
  ISensitiveDataFilter,
  ILogAuditor,
  ILogAuditReport,
  IErrorHandler,
  IErrorContext,
  IErrorReport,
  IRecoveryStrategy,
  IErrorPattern
} from './types';

export {
  LogLevel,
  ConfigType,
  EnvironmentType,
  ErrorSeverity,
  ErrorCategory,
  IConfigManagerConfig,
  IEnvironmentConfig,
  IConfigChangeEvent,
  IConfigSerializer,
  IConfigProviderFactory,
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CacheStats,
  ConfigStats
} from './types';

// 核心日志记录器
export {
  Logger,
  PerformanceLogger,
  StructuredLogger,
  ErrorLogger,
  AuditLogger
} from './Logger';

// 日志输出器
export {
  ConsoleAppender,
  FileAppender,
  RemoteAppender,
  MemoryAppender,
  MultiplexAppender,
  BufferedAppender
} from './LogAppender';

// 日志过滤器
export {
  BaseFilter,
  LevelFilter,
  TagFilter,
  SourceFilter,
  MessagePatternFilter,
  TimeRangeFilter,
  ErrorTypeFilter,
  DuplicateFilter,
  CustomFilter,
  AndFilter,
  OrFilter,
  ContextFilter
} from './LogFilter';

// 日志格式化器
export {
  BaseFormatter,
  SimpleFormatter,
  DetailedFormatter,
  JsonFormatter,
  StructuredFormatter,
  ColorFormatter,
  TemplateFormatter,
  PatternFormatter,
  Formatters,
  createFormatter
} from './LogFormatter';

// 错误处理器
export {
  ErrorHandler,
  BluetoothRecoveryStrategy,
  PrinterRecoveryStrategy
} from './ErrorHandler';

// 日志工厂
export {
  LoggerFactory,
  defaultLoggerFactory,
  createLogger,
  createLoggerFactory,
  getDefaultLogger
} from './LoggerFactory';

// 默认实例和工厂函数
export const defaultLogger = getDefaultLogger();

/**
 * 快速日志记录函数
 */
export const log = {
  trace: (message: string, data?: any) => defaultLogger.trace(message, data),
  debug: (message: string, data?: any) => defaultLogger.debug(message, data),
  info: (message: string, data?: any) => defaultLogger.info(message, data),
  warn: (message: string, data?: any) => defaultLogger.warn(message, data),
  error: (message: string, error?: Error, data?: any) => defaultLogger.error(message, error, data),
  fatal: (message: string, error?: Error, data?: any) => defaultLogger.fatal(message, error, data)
};

/**
 * 性能日志记录函数
 */
export const perfLog = {
  startTimer: (operation: string) => defaultLogger.startTimer(operation),
  measureAsync: async <T>(operation: string, fn: () => Promise<T>, context?: any) => {
    const perfLogger = new PerformanceLogger();
    return await perfLogger.measureAsync(operation, fn, context);
  },
  measure: <T>(operation: string, fn: () => T, context?: any) => {
    const perfLogger = new PerformanceLogger();
    return perfLogger.measure(operation, fn, context);
  },
  logMemoryUsage: () => {
    const perfLogger = new PerformanceLogger();
    perfLogger.logMemoryUsage();
  }
};

/**
 * 创建专用日志记录器的工厂函数
 */
export function createStructuredLogger(name?: string): StructuredLogger {
  return new StructuredLogger(name);
}

export function createPerformanceLogger(name?: string): PerformanceLogger {
  return new PerformanceLogger(name);
}

export function createErrorLogger(name?: string): ErrorLogger {
  return new ErrorLogger(name);
}

export function createAuditLogger(name?: string): AuditLogger {
  return new AuditLogger(name);
}

/**
 * 创建子日志记录器的便捷函数
 */
export function createChildLogger(
  parentName: string,
  childName: string,
  data?: any
): Logger {
  const parent = defaultLoggerFactory.getLogger(parentName);
  return (parent as Logger).child(childName, data);
}

/**
 * 创建带上下文的日志记录器
 */
export function createContextLogger(
  name: string,
  context: ILogContext
): Logger {
  const logger = defaultLoggerFactory.createLogger(name, context);
  return logger as Logger;
}

/**
 * 错误处理便捷函数
 */
export function createErrorHandler(
  name: string,
  logger?: ILogger
): ErrorHandler {
  return new ErrorHandler(name, logger || defaultLogger);
}

/**
 * 全局错误处理器（用于未捕获的异常）
 */
export class GlobalErrorHandler {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;

    // 注册全局错误处理
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error: Error) => {
        this.errorHandler.handleError(error, {
          operation: 'uncaughtException',
          component: 'global'
        });
      });

      process.on('unhandledRejection', (reason: any) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.errorHandler.handleError(error, {
          operation: 'unhandledRejection',
          component: 'global'
        });
      });
    }
  }

  dispose(): void {
    // 移除全局错误处理
    if (typeof process !== 'undefined') {
      process.removeAllListeners('uncaughtException');
      process.removeAllListeners('unhandledRejection');
    }
  }
}

// 创建全局错误处理器实例
export const globalErrorHandler = new GlobalErrorHandler(
  createErrorHandler('global', defaultLogger)
);

/**
 * 日志系统配置
 */
export class LoggingSystem {
  private loggerFactory: LoggerFactory;
  private globalErrorHandler?: GlobalErrorHandler;

  constructor(config?: ILogConfig) {
    this.loggerFactory = new LoggerFactory(config);
  }

  /**
   * 获取日志记录器
   */
  getLogger(name?: string): ILogger {
    return this.loggerFactory.getLogger(name);
  }

  /**
   * 创建错误处理器
   */
  createErrorHandler(name: string): ErrorHandler {
    return new ErrorHandler(name, this.getLogger(name));
  }

  /**
   * 启用全局错误处理
   */
  enableGlobalErrorHandling(): void {
    if (!this.globalErrorHandler) {
      this.globalErrorHandler = new GlobalErrorHandler(
        this.createErrorHandler('global')
      );
    }
  }

  /**
   * 禁用全局错误处理
   */
  disableGlobalErrorHandling(): void {
    if (this.globalErrorHandler) {
      this.globalErrorHandler.dispose();
      this.globalErrorHandler = undefined;
    }
  }

  /**
   * 设置默认日志级别
   */
  setDefaultLevel(level: LogLevel): void {
    this.loggerFactory.setDefaultLevel(level);
  }

  /**
   * 添加全局过滤器
   */
  addGlobalFilter(filter: ILogFilter): void {
    this.loggerFactory.addGlobalFilter(filter);
  }

  /**
   * 添加全局输出器
   */
  addGlobalAppender(appender: ILogAppender): void {
    this.loggerFactory.addGlobalAppender(appender);
  }

  /**
   * 刷新所有日志
   */
  async flushAll(): Promise<void> {
    await this.loggerFactory.flushAll();
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      factory: this.loggerFactory.getStats(),
      globalErrorHandlerEnabled: !!this.globalErrorHandler
    };
  }

  /**
   * 销毁日志系统
   */
  dispose(): void {
    this.disableGlobalErrorHandling();
    this.loggerFactory.dispose();
  }
}

/**
 * 创建日志系统实例
 */
export function createLoggingSystem(config?: ILogConfig): LoggingSystem {
  return new LoggingSystem(config);
}