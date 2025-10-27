/**
 * 日志记录器实现
 */

import {
  ILogger,
  ILogEntry,
  ILogAppender,
  ILogFilter,
  ILogContext,
  ITimer,
  LogLevel,
  ILogStats
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 基础日志记录器实现
 */
export class Logger implements ILogger {
  /** 记录器名称 */
  public readonly name: string;

  /** 日志级别 */
  private _level: LogLevel;

  /** 日志输出器列表 */
  private appenders: ILogAppender[] = [];

  /** 日志过滤器列表 */
  private filters: ILogFilter[] = [];

  /** 日志标签 */
  private tags: string[] = [];

  /** 日志上下文 */
  private context: ILogContext = {};

  /** 是否启用 */
  private enabled: boolean = true;

  /** 日志统计 */
  private stats: ILogStats = {
    totalLogs: 0,
    logsByLevel: {
      [LogLevel.TRACE]: 0,
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0,
      [LogLevel.OFF]: 0
    },
    logsBySource: {},
    errorCount: 0,
    warningCount: 0,
    averageLogSize: 0,
    appenderStats: {}
  };

  constructor(
    name: string,
    level: LogLevel = LogLevel.INFO,
    context: ILogContext = {}
  ) {
    this.name = name;
    this._level = level;
    this.context = { ...context, source: context.source || name };
  }

  /**
   * 记录日志
   */
  public log(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error
  ): void {
    if (!this.enabled || level < this._level) {
      return;
    }

    // 创建日志条目
    const entry: ILogEntry = {
      id: uuidv4(),
      level,
      message,
      timestamp: Date.now(),
      ...this.context,
      tags: [...this.tags],
      data,
      error
    };

    // 添加错误信息
    if (error) {
      entry.stack = error.stack;
    }

    // 过滤检查
    if (!this.shouldLog(entry)) {
      return;
    }

    // 更新统计
    this.updateStats(entry);

    // 输出到所有输出器
    this.appenders.forEach(appender => {
      try {
        if (appender.isEnabled()) {
          appender.append(entry);
        }
      } catch (error) {
        console.error(`Error in appender '${appender.name}':`, error);
      }
    });
  }

  /**
   * 记录追踪日志
   */
  public trace(message: string, data?: any): void {
    this.log(LogLevel.TRACE, message, data);
  }

  /**
   * 记录调试日志
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录信息日志
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告日志
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
    this.stats.warningCount++;
  }

  /**
   * 记录错误日志
   */
  public error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
    this.stats.errorCount++;
  }

  /**
   * 记录致命错误日志
   */
  public fatal(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.FATAL, message, data, error);
    this.stats.errorCount++;
  }

  /**
   * 设置日志级别
   */
  public setLevel(level: LogLevel): void {
    this._level = level;
  }

  /**
   * 获取日志级别
   */
  public getLevel(): LogLevel {
    return this._level;
  }

  /**
   * 添加过滤器
   */
  public addFilter(filter: ILogFilter): void {
    this.filters.push(filter);
  }

  /**
   * 移除过滤器
   */
  public removeFilter(name: string): void {
    this.filters = this.filters.filter(f => f.name !== name);
  }

  /**
   * 添加输出器
   */
  public addAppender(appender: ILogAppender): void {
    this.appenders.push(appender);
    this.stats.appenderStats[appender.name] = {
      count: 0,
      errors: 0
    };
  }

  /**
   * 移除输出器
   */
  public removeAppender(name: string): void {
    const index = this.appenders.findIndex(a => a.name === name);
    if (index !== -1) {
      const appender = this.appenders[index];
      try {
        appender.close();
      } catch (error) {
        console.error(`Error closing appender '${name}':`, error);
      }
      this.appenders.splice(index, 1);
      delete this.stats.appenderStats[name];
    }
  }

  /**
   * 设置标签
   */
  public setTags(tags: string[]): void {
    this.tags = [...tags];
  }

  /**
   * 添加标签
   */
  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * 移除标签
   */
  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * 创建子记录器
   */
  public child(name: string, data?: any): Logger {
    const childContext = {
      ...this.context,
      source: name,
      data: { ...this.context.data, ...data }
    };

    const childLogger = new Logger(
      `${this.name}.${name}`,
      this._level,
      childContext
    );

    // 继承父记录器的配置
    childLogger.filters = [...this.filters];
    childLogger.appenders = [...this.appenders];
    childLogger.tags = [...this.tags];

    return childLogger;
  }

  /**
   * 创建带数据的记录器
   */
  public withData(data: any): Logger {
    const logger = this.child('withData', data);
    logger.setTags(this.tags);
    return logger;
  }

  /**
   * 创建带上下文的记录器
   */
  public withContext(context: ILogContext): Logger {
    const logger = this.child('withContext', context.data);
    logger.context = { ...logger.context, ...context };
    logger.setTags(this.tags);
    return logger;
  }

  /**
   * 性能测量开始
   */
  public startTimer(operation: string): ITimer {
    return new Timer(operation, this, this.context);
  }

  /**
   * 启用/禁用日志
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取统计信息
   */
  public getStats(): ILogStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.TRACE]: 0,
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0,
        [LogLevel.OFF]: 0
      },
      logsBySource: {},
      errorCount: 0,
      warningCount: 0,
      averageLogSize: 0,
      appenderStats: { ...this.stats.appenderStats }
    };
  }

  /**
   * 刷新所有输出器
   */
  public async flush(): Promise<void> {
    await Promise.all(
      this.appenders.map(appender => {
        try {
          return appender.flush();
        } catch (error) {
          console.error(`Error flushing appender '${appender.name}':`, error);
        }
      })
    );
  }

  /**
   * 销毁记录器
   */
  public dispose(): void {
    this.enabled = false;

    // 关闭所有输出器
    this.appenders.forEach(appender => {
      try {
        appender.close();
      } catch (error) {
        console.error(`Error closing appender '${appender.name}':`, error);
      }
    });

    this.appenders = [];
    this.filters = [];
    this.tags = [];
    this.resetStats();
  }

  // 私有方法

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(entry: ILogEntry): boolean {
    // 应用过滤器
    return this.filters.every(filter => filter.shouldLog(entry));
  }

  /**
   * 更新统计信息
   */
  private updateStats(entry: ILogEntry): void {
    this.stats.totalLogs++;
    this.stats.logsByLevel[entry.level]++;

    // 更新来源统计
    const source = entry.source || 'unknown';
    this.stats.logsBySource[source] = (this.stats.logsBySource[source] || 0) + 1;

    // 更新输出器统计
    this.appenders.forEach(appender => {
      if (appender.isEnabled()) {
        const stats = this.stats.appenderStats[appender.name];
        if (stats) {
          stats.count++;
        }
      }
    });

    // 更新最后日志时间
    this.stats.lastLogTime = entry.timestamp;

    // 计算平均日志大小（简化处理）
    const logSize = JSON.stringify(entry).length;
    this.stats.averageLogSize = (this.stats.averageLogSize * (this.stats.totalLogs - 1) + logSize) / this.stats.totalLogs;
  }
}

/**
 * 计时器实现
 */
class Timer implements ITimer {
  public readonly operation: string;
  public readonly startTime: number;

  private logger: Logger;
  private context: ILogContext;
  private ended: boolean = false;

  constructor(operation: string, logger: Logger, context: ILogContext) {
    this.operation = operation;
    this.startTime = Date.now();
    this.logger = logger;
    this.context = context;
  }

  /**
   * 结束计时
   */
  public end(data?: any): number {
    if (this.ended) {
      return 0;
    }

    const duration = Date.now() - this.startTime;
    this.ended = true;

    // 记录性能日志
    this.logger.info(
      `Operation '${this.operation}' completed`,
      {
        ...this.context.data,
        ...data,
        duration,
        operation: this.operation,
        startTime: this.startTime,
        endTime: Date.now()
      }
    );

    return duration;
  }
}

/**
   * 性能日志记录器
   */
export class PerformanceLogger extends Logger {
  constructor(name?: string, level: LogLevel = LogLevel.INFO) {
    super(name || 'performance', level);
  }

  /**
   * 记录函数执行时间
   */
  public async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: any
  ): Promise<T> {
    const timer = this.startTimer(operation);
    this.debug(`Starting operation: ${operation}`, context);

    try {
      const result = await fn();
      timer.end();
      this.debug(`Operation completed: ${operation}`);
      return result;
    } catch (error) {
      timer.end();
      this.error(`Operation failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * 记录函数执行时间
   */
  public measure<T>(
    operation: string,
    fn: () => T,
    context?: any
  ): T {
    const timer = this.startTimer(operation);
    this.debug(`Starting operation: ${operation}`, context);

    try {
      const result = fn();
      timer.end();
      this.debug(`Operation completed: ${operation}`);
      return result;
    } catch (error) {
      timer.end();
      this.error(`Operation failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * 记录内存使用
   */
  public logMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.info('Memory usage', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      });
    }
  }

  /**
   * 创建性能监控装饰器
   */
  public createPerformanceDecorator(operation: string) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        const timer = this.startTimer(operation);
        try {
          const result = originalMethod.apply(this, args);
          timer.end();
          return result;
        } catch (error) {
          timer.end();
          this.error(`Method '${propertyName}' failed`, error);
          throw error;
        }
      };

      return descriptor;
    };
  }
}

/**
 * 结构化日志记录器
 */
export class StructuredLogger extends Logger {
  constructor(name?: string, level: LogLevel = LogLevel.INFO) {
    super(name || 'structured', level);
  }

  /**
   * 记录结构化日志
   */
  public logStructured(level: LogLevel, message: string, structuredData?: any): void {
    this.log(level, message, {
      structured: true,
      ...structuredData
    });
  }

  /**
   * 记录API请求
   */
  public logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: any
  ): void {
    this.info('HTTP Request', {
      http: {
        method,
        url,
        statusCode,
        duration
      },
      ...context
    });
  }

  /**
   * 记录数据库操作
   */
  public logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    affectedRows?: number,
    context?: any
  ): void {
    this.debug('Database Operation', {
      database: {
        operation,
        table,
        duration,
        affectedRows
      },
      ...context
    });
  }

  /**
   * 记录用户行为
   */
  public logUserAction(
    action: string,
    userId?: string,
    context?: any
  ): void {
    this.info('User Action', {
      user: {
        action,
        userId
      },
      ...context
    });
  }
}

/**
   * 错误日志记录器
   */
export class ErrorLogger extends Logger {
  constructor(name?: string, level: LogLevel = LogLevel.ERROR) {
    super(name || 'error', level);
  }

  /**
   * 记录异常详情
   */
  public logException(
    exception: Error,
    context?: any,
    recovery?: string
  ): void {
    this.fatal('Exception occurred', exception, {
      recovery,
      ...context
    });
  }

  /**
   * 记录错误恢复
   */
  public logRecovery(
    operation: string,
    fromError: Error,
    context?: any
  ): void {
    this.info('Error recovery', {
      operation,
      fromError: {
        message: fromError.message,
        stack: fromError.stack
      },
      ...context
    });
  }
}

/**
   * 审计日志记录器
   */
export class AuditLogger extends Logger {
  private auditTrail: Array<{
    timestamp: number;
    level: LogLevel;
    message: string;
    user?: string;
    action?: string;
    resource?: string;
    context?: any;
  }> = [];

  constructor(name?: string, level: LogLevel = LogLevel.INFO) {
    super(name || 'audit', level);
  }

  /**
   * 记录审计日志
   */
  public audit(
    action: string,
    resource?: string,
    user?: string,
    context?: any
  ): void {
    this.info(`Audit: ${action}`, {
      audit: {
        action,
        resource,
        user
      },
      ...context
    });

    // 保存审计记录
    this.auditTrail.push({
      timestamp: Date.now(),
      level: this.getLevel(),
      message: action,
      user,
      action,
      resource,
      context
    });
  }

  /**
   * 获取审计记录
   */
  public getAuditTrail(
    limit?: number,
    filter?: {
      user?: string;
      action?: string;
      resource?: string;
      from?: Date;
      to?: Date;
    }
  ): Array<{
    timestamp: number;
    level: LogLevel;
    message: string;
    user?: string;
    action?: string;
    resource?: string;
    context?: any;
  }> {
    let trail = [...this.auditTrail];

    // 过滤记录
    if (filter) {
      trail = trail.filter(record => {
        if (filter.user && record.user !== filter.user) return false;
        if (filter.action && record.action !== filter.action) return false;
        if (filter.resource && record.resource !== filter.resource) return false;
        if (filter.from && record.timestamp < filter.from.getTime()) return false;
        if (filter.to && record.timestamp > filter.to.getTime()) return false;
        return true;
      });
    }

    // 排序（最新的在前）
    trail.sort((a, b) => b.timestamp - a.timestamp);

    // 限制数量
    if (limit && limit > 0) {
      trail = trail.slice(0, limit);
    }

    return trail;
  }

  /**
   * 清空审计记录
   */
  public clearAuditTrail(): void {
    this.auditTrail = [];
  }

  /**
   * 导出审计记录
   */
  public exportAuditTrail(): string {
    return JSON.stringify(this.auditTrail, null, 2);
  }
}