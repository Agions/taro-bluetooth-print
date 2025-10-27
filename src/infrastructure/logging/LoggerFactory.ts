/**
 * 日志工厂实现
 */

import {
  ILoggerFactory,
  ILogger,
  ILogAppender,
  ILogFilter,
  ILogConfig,
  LogLevel,
  ILogContext
} from './types';
import { Logger } from './Logger';
import {
  ConsoleAppender,
  FileAppender,
  RemoteAppender,
  MemoryAppender,
  MultiplexAppender,
  BufferedAppender
} from './LogAppender';

/**
 * 日志工厂实现
 */
export class LoggerFactory implements ILoggerFactory {
  /** 根日志记录器 */
  private rootLogger: ILogger;

  /** 日志记录器缓存 */
  private loggers: Map<string, ILogger> = new Map();

  /** 全局过滤器 */
  private globalFilters: ILogFilter[] = [];

  /** 全局输出器 */
  private globalAppenders: ILogAppender[] = [];

  /** 默认日志级别 */
  private defaultLevel: LogLevel = LogLevel.INFO;

  /** 工厂是否已销毁 */
  private disposed: boolean = false;

  constructor(config?: ILogConfig) {
    this.rootLogger = this.createRootLogger(config);
    this.setupGlobalAppenders(config);
    this.setupGlobalFilters(config);
  }

  /**
   * 获取日志记录器
   */
  public getLogger(name?: string): ILogger {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    const loggerName = name || 'default';

    // 检查缓存
    let logger = this.loggers.get(loggerName);
    if (logger) {
      return logger;
    }

    // 创建新的日志记录器
    logger = this.createLogger(loggerName);
    this.loggers.set(loggerName, logger);

    return logger;
  }

  /**
   * 创建带上下文的日志记录器
   */
  public createLogger(name: string, context?: ILogContext): ILogger {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    const logger = new Logger(name, this.defaultLevel, context);

    // 添加全局过滤器
    this.globalFilters.forEach(filter => {
      logger.addFilter(filter);
    });

    // 添加全局输出器
    this.globalAppenders.forEach(appender => {
      logger.addAppender(appender);
    });

    return logger;
  }

  /**
   * 获取根日志记录器
   */
  public getRootLogger(): ILogger {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    return this.rootLogger;
  }

  /**
   * 设置默认级别
   */
  public setDefaultLevel(level: LogLevel): void {
    this.defaultLevel = level;
    this.rootLogger.setLevel(level);

    // 更新所有现有日志记录器的级别
    this.loggers.forEach(logger => {
      logger.setLevel(level);
    });
  }

  /**
   * 添加全局过滤器
   */
  public addGlobalFilter(filter: ILogFilter): void {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    this.globalFilters.push(filter);

    // 为所有现有日志记录器添加过滤器
    this.loggers.forEach(logger => {
      logger.addFilter(filter);
    });

    this.rootLogger.addFilter(filter);
  }

  /**
   * 移除全局过滤器
   */
  public removeGlobalFilter(name: string): void {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    this.globalFilters = this.globalFilters.filter(f => f.name !== name);

    // 从所有现有日志记录器中移除过滤器
    this.loggers.forEach(logger => {
      logger.removeFilter(name);
    });

    this.rootLogger.removeFilter(name);
  }

  /**
   * 添加全局输出器
   */
  public addGlobalAppender(appender: ILogAppender): void {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    this.globalAppenders.push(appender);

    // 为所有现有日志记录器添加输出器
    this.loggers.forEach(logger => {
      logger.addAppender(appender);
    });

    this.rootLogger.addAppender(appender);
  }

  /**
   * 移除全局输出器
   */
  public removeGlobalAppender(name: string): void {
    if (this.disposed) {
      throw new Error('Logger factory has been disposed');
    }

    this.globalAppenders = this.globalAppenders.filter(a => a.name !== name);

    // 从所有现有日志记录器中移除输出器
    this.loggers.forEach(logger => {
      logger.removeAppender(name);
    });

    this.rootLogger.removeAppender(name);
  }

  /**
   * 刷新所有日志记录器
   */
  public async flushAll(): Promise<void> {
    if (this.disposed) {
      return;
    }

    const promises = [
      this.rootLogger.flush(),
      ...Array.from(this.loggers.values()).map(logger => logger.flush())
    ];

    await Promise.all(promises);
  }

  /**
   * 获取工厂统计信息
   */
  public getStats(): any {
    return {
      totalLoggers: this.loggers.size,
      globalFiltersCount: this.globalFilters.length,
      globalAppendersCount: this.globalAppenders.length,
      defaultLevel: LogLevel[this.defaultLevel],
      isDisposed: this.disposed,
      loggerNames: Array.from(this.loggers.keys())
    };
  }

  /**
   * 销毁工厂
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // 销毁所有日志记录器
    this.loggers.forEach(logger => {
      logger.dispose();
    });
    this.loggers.clear();

    // 销毁根日志记录器
    this.rootLogger.dispose();

    // 关闭所有全局输出器
    this.globalAppenders.forEach(appender => {
      try {
        appender.close();
      } catch (error) {
        console.error(`Error closing appender '${appender.name}':`, error);
      }
    });
    this.globalAppenders = [];

    // 清理过滤器
    this.globalFilters = [];
  }

  // 私有方法

  /**
   * 创建根日志记录器
   */
  private createRootLogger(config?: ILogConfig): Logger {
    const rootLogger = new Logger('root', config?.defaultLevel || LogLevel.INFO);
    return rootLogger;
  }

  /**
   * 设置全局输出器
   */
  private setupGlobalAppenders(config?: ILogConfig): void {
    if (!config) {
      // 默认配置：添加控制台输出器
      this.addGlobalAppender(new ConsoleAppender(LogLevel.INFO));
      return;
    }

    // 控制台输出器
    if (config.console?.enabled !== false) {
      const consoleAppender = new ConsoleAppender(
        config.console?.level || this.defaultLevel
      );
      this.addGlobalAppender(consoleAppender);
    }

    // 文件输出器
    if (config.file?.enabled) {
      const fileAppender = new FileAppender(
        config.file?.path || './logs/app.log',
        {
          level: config.file?.level || this.defaultLevel,
          maxSize: config.file?.maxFileSize,
          maxFiles: config.file?.maxFiles
        }
      );
      this.addGlobalAppender(fileAppender);
    }

    // 远程输出器
    if (config.remote?.enabled && config.remote?.endpoint) {
      const remoteAppender = new RemoteAppender(
        config.remote.endpoint,
        {
          level: config.remote?.level || this.defaultLevel,
          headers: config.remote?.headers,
          batchSize: config.remote?.batchSize,
          flushInterval: config.remote?.flushInterval
        }
      );
      this.addGlobalAppender(remoteAppender);
    }

    // 内存输出器（用于调试）
    if (config.enablePerformance) {
      const memoryAppender = new MemoryAppender(LogLevel.DEBUG, 1000);
      this.addGlobalAppender(memoryAppender);
    }
  }

  /**
   * 设置全局过滤器
   */
  private setupGlobalFilters(config?: ILogConfig): void {
    // 根据配置添加过滤器
    if (config?.silenceErrors) {
      const errorFilter = new SilenceErrorFilter(config.silenceErrors);
      this.addGlobalFilter(errorFilter);
    }
  }
}

/**
 * 错误静默过滤器
 */
class SilenceErrorFilter implements ILogFilter {
  public readonly name: string;
  private silencePatterns: string[];

  constructor(silenceErrors: string[]) {
    this.name = 'silence-error-filter';
    this.silencePatterns = silenceErrors;
  }

  shouldLog(entry: ILogEntry): boolean {
    if (!entry.error) {
      return true;
    }

    return !this.silencePatterns.some(pattern =>
      entry.error!.message.includes(pattern) ||
      entry.error!.name.includes(pattern) ||
      entry.message.includes(pattern)
    );
  }
}

/**
 * 预定义的日志工厂实例
 */
export const defaultLoggerFactory = new LoggerFactory({
  console: {
    enabled: true,
    level: LogLevel.INFO
  },
  enablePerformance: true,
  enableStructuredLogging: true
});

/**
 * 快速创建日志记录器的工厂函数
 */
export function createLogger(name?: string): ILogger {
  return defaultLoggerFactory.getLogger(name);
}

/**
 * 创建带配置的日志工厂
 */
export function createLoggerFactory(config: ILogConfig): LoggerFactory {
  return new LoggerFactory(config);
}

/**
 * 获取默认日志记录器
 */
export function getDefaultLogger(): ILogger {
  return defaultLoggerFactory.getRootLogger();
}