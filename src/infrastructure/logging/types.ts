/**
 * 日志系统类型定义
 */

// 日志级别枚举
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  OFF = 6
}

// 日志条目接口
export interface ILogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
  /** 日志来源 */
  source?: string;
  /** 日志标签 */
  tags?: string[];
  /** 额外数据 */
  data?: any;
  /** 错误对象 */
  error?: Error;
  /** 调用堆栈 */
  stack?: string;
  /** 日志ID */
  id?: string;
  /** 会话ID */
  sessionId?: string;
  /** 用户ID */
  userId?: string;
  /** 请求ID */
  requestId?: string;
  /** 相关ID */
  correlationId?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 内存使用 */
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
}

// 日志格式化器接口
export interface ILogFormatter {
  /** 格式化日志条目 */
  format(entry: ILogEntry): string;
  /** 格式化器名称 */
  readonly name: string;
}

// 日志输出器接口
export interface ILogAppender {
  /** 输出器名称 */
  readonly name: string;
  /** 日志级别 */
  readonly level: LogLevel;
  /** 输出日志条目 */
  append(entry: ILogEntry): Promise<void> | void;
  /** 刷新缓冲区 */
  flush(): Promise<void> | void;
  /** 关闭输出器 */
  close(): Promise<void> | void;
  /** 检查是否启用 */
  isEnabled(): boolean;
}

// 日志过滤器接口
export interface ILogFilter {
  /** 过滤器名称 */
  readonly name: string;
  /** 检查日志是否应该输出 */
  shouldLog(entry: ILogEntry): boolean;
}

// 日志记录器接口
export interface ILogger {
  /** 记录器名称 */
  readonly name: string;
  /** 日志级别 */
  readonly level: LogLevel;

  /** 记录日志 */
  log(level: LogLevel, message: string, data?: any, error?: Error): void;

  /** 记录追踪日志 */
  trace(message: string, data?: any): void;

  /** 记录调试日志 */
  debug(message: string, data?: any): void;

  /** 记录信息日志 */
  info(message: string, data?: any): void;

  /** 记录警告日志 */
  warn(message: string, data?: any): void;

  /** 记录错误日志 */
  error(message: string, error?: Error, data?: any): void;

  /** 记录致命错误日志 */
  fatal(message: string, error?: Error, data?: any): void;

  /** 设置日志级别 */
  setLevel(level: LogLevel): void;

  /** 获取日志级别 */
  getLevel(): LogLevel;

  /** 添加过滤器 */
  addFilter(filter: ILogFilter): void;

  /** 移除过滤器 */
  removeFilter(name: string): void;

  /** 添加输出器 */
  addAppender(appender: ILogAppender): void;

  /** 移除输出器 */
  removeAppender(name: string): void;

  /** 设置标签 */
  setTags(tags: string[]): void;

  /** 添加标签 */
  addTag(tag: string): void;

  /** 移除标签 */
  removeTag(tag: string): void;

  /** 创建子记录器 */
  child(name: string, data?: any): ILogger;

  /** 创建带数据的记录器 */
  withData(data: any): ILogger;

  /** 创建带上下文的记录器 */
  withContext(context: {
    source?: string;
    sessionId?: string;
    userId?: string;
    requestId?: string;
    correlationId?: string;
  }): ILogger;

  /** 性能测量开始 */
  startTimer(operation: string): ITimer;

  /** 销毁记录器 */
  dispose(): void;
}

// 计时器接口
export interface ITimer {
  /** 操作名称 */
  operation: string;
  /** 开始时间 */
  startTime: number;
  /** 结束计时 */
  end(data?: any): number;
}

// 日志上下文接口
export interface ILogContext {
  /** 日志源 */
  source?: string;
  /** 会话ID */
  sessionId?: string;
  /** 用户ID */
  userId?: string;
  /** 请求ID */
  requestId?: string;
  /** 关联ID */
  correlationId?: string;
  /** 附加数据 */
  data?: any;
}

// 日志工厂接口
export interface ILoggerFactory {
  /** 创建日志记录器 */
  getLogger(name?: string): ILogger;

  /** 创建带上下文的日志记录器 */
  createLogger(name: string, context?: ILogContext): ILogger;

  /** 获取根日志记录器 */
  getRootLogger(): ILogger;

  /** 设置默认级别 */
  setDefaultLevel(level: LogLevel): void;

  /** 添加全局过滤器 */
  addGlobalFilter(filter: ILogFilter): void;

  /** 移除全局过滤器 */
  removeGlobalFilter(name: string): void;

  /** 添加全局输出器 */
  addGlobalAppender(appender: ILogAppender): void;

  /** 移除全局输出器 */
  removeGlobalAppender(name: string): void;

  /** 销毁工厂 */
  dispose(): void;
}

// 日志配置接口
export interface ILogConfig {
  /** 默认级别 */
  defaultLevel?: LogLevel;
  /** 默认格式化器 */
  defaultFormatter?: string;
  /** 默认输出器 */
  defaultAppenders?: string[];
  /** 启用性能测量 */
  enablePerformance?: boolean;
  /** 启用结构化日志 */
  enableStructuredLogging?: boolean;
  /** 控制台输出 */
  console?: {
    enabled?: boolean;
    level?: LogLevel;
    formatter?: string;
  };
  /** 文件输出 */
  file?: {
    enabled?: boolean;
    level?: LogLevel;
    path?: string;
    maxFileSize?: number;
    maxFiles?: number;
    formatter?: string;
  };
  /** 远程输出 */
  remote?: {
    enabled?: boolean;
    level?: LogLevel;
    endpoint?: string;
    headers?: Record<string, string>;
    batchSize?: number;
    flushInterval?: number;
    formatter?: string;
  };
  /** 缓冲配置 */
  buffer?: {
    enabled?: boolean;
    size?: number;
    flushInterval?: number;
  };
  /** 睙默错误类型 */
  silenceErrors?: string[];
}

// 日志统计接口
export interface ILogStats {
  /** 总日志数 */
  totalLogs: number;
  /** 按级别分组的日志数 */
  logsByLevel: Record<LogLevel, number>;
  /** 按来源分组的日志数 */
  logsBySource: Record<string, number>;
  /** 错误日志数 */
  errorCount: number;
  /** 警告日志数 */
  warningCount: number;
  /** 平均日志大小 */
  averageLogSize: number;
  /** 最后输出时间 */
  lastLogTime?: number;
  /** 输出器统计 */
  appenderStats: Record<string, {
    count: number;
    errors: number;
    lastFlushTime?: number;
  }>;
}

// 结构化日志接口
export interface IStructuredLog {
  /** 时间戳 */
  '@timestamp': string;
  /** 日志级别 */
  '@level': string;
  /** 日志消息 */
  '@message': string;
  /** 日志源 */
  '@source'?: string;
  /** 日志标签 */
  '@tags'?: string[];
  /** 日志ID */
  '@id'?: string;
  /** 会话ID */
  '@session_id'?: string;
  /** 用户ID */
  '@user_id'?: string;
  /** 请求ID */
  '@request_id'?: string;
  /** 关联ID */
  '@correlation_id'?: string;
  /** 错误信息 */
  '@error'?: {
    name: string;
    message: string;
    stack: string;
  };
  /** 性能信息 */
  '@performance'?: {
    operation: string;
    duration: number;
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
  };
  /** 附加数据 */
  [key: string]: any;
}

// 日志模式接口
export interface ILogPattern {
  /** 模式名称 */
  name: string;
  /** 模式正则表达式 */
  pattern: RegExp;
  /** 替换函数 */
  replacer: (matches: RegExpMatchArray, entry: ILogEntry) => string;
}

// 敏感数据过滤器接口
export interface ISensitiveDataFilter {
  /** 过滤器名称 */
  readonly name: string;
  /** 过滤敏感数据 */
  filter(data: any): any;
  /** 检查是否包含敏感数据 */
  containsSensitiveData(data: any): boolean;
}

// 日志审计接口
export interface ILogAuditor {
  /** 审计器名称 */
  readonly name: string;
  /** 审计日志条目 */
  audit(entry: ILogEntry): void;
  /** 获取审计报告 */
  getReport(): ILogAuditReport;
  /** 重置审计统计 */
  reset(): void;
}

// 日志审计报告接口
export interface ILogAuditReport {
  /** 审计时间范围 */
  timeRange: {
    start: number;
    end: number;
  };
  /** 日志总数 */
  totalLogs: number;
  /** 按级别分组的统计 */
  levelDistribution: Record<LogLevel, number>;
  /** 最活跃的来源 */
  topSources: Array<{
    source: string;
    count: number;
  }>;
  /** 最常见的错误 */
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  /** 性能指标 */
  performance: {
    averageDuration: number;
    slowOperations: Array<{
      operation: string;
      duration: number;
      count: number;
    }>;
  };
}

// 错误严重程度枚举
export enum ErrorSeverity {
  TRACE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

// 错误类别枚举
export enum ErrorCategory {
  SYSTEM = 'system',
  BLUETOOTH = 'bluetooth',
  PRINTER = 'printer',
  CONNECTION = 'connection',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource',
  SECURITY = 'security'
}

// 错误上下文接口
export interface IErrorContext {
  /** 时间戳 */
  timestamp: number;
  /** 错误ID */
  errorId: string;
  /** 关联ID */
  correlationId: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 操作名称 */
  operation?: string;
  /** 组件名称 */
  component?: string;
  /** 附加数据 */
  data?: any;
  /** 堆栈跟踪 */
  stackTrace?: string;
  /** 原始错误对象 */
  originalError: Error;
}

// 错误报告接口
export interface IErrorReport {
  /** 报告ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 错误对象 */
  error: Error;
  /** 错误上下文 */
  context: IErrorContext;
  /** 错误严重程度 */
  severity: ErrorSeverity;
  /** 错误类别 */
  category: ErrorCategory;
  /** 是否已处理 */
  handled: boolean;
  /** 是否已恢复 */
  recovered: boolean;
  /** 恢复尝试次数 */
  recoveryAttempts: number;
}

// 恢复策略接口
export interface IRecoveryStrategy {
  /** 策略名称 */
  readonly name: string;
  /** 执行恢复 */
  recover(error: Error, context?: IErrorContext): Promise<boolean>;
}

// 错误模式接口
export interface IErrorPattern {
  /** 模式名称 */
  name: string;
  /** 匹配函数 */
  matcher: (error: Error) => boolean;
  /** 错误严重程度 */
  severity: ErrorSeverity;
  /** 错误类别 */
  category: ErrorCategory;
  /** 恢复策略名称 */
  recoveryStrategy?: string;
  /** 描述 */
  description?: string;
}

// 错误处理器接口
export interface IErrorHandler {
  /** 处理器名称 */
  readonly name: string;
  /** 处理错误 */
  handleError(error: Error, context?: Partial<IErrorContext>): Promise<IErrorReport>;
  /** 注册错误模式 */
  registerPattern(pattern: IErrorPattern): void;
  /** 注册恢复策略 */
  registerStrategy(strategy: IRecoveryStrategy): void;
  /** 移除错误模式 */
  removePattern(name: string): void;
  /** 移除恢复策略 */
  removeStrategy(name: string): void;
  /** 获取错误报告 */
  getErrorReport(errorId: string): IErrorReport | undefined;
  /** 获取错误历史 */
  getErrorHistory(filter?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    component?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): IErrorReport[];
  /** 获取错误统计 */
  getStats(): any;
  /** 清空错误历史 */
  clearHistory(): void;
  /** 启用/禁用 */
  setEnabled(enabled: boolean): void;
  /** 检查是否启用 */
  isEnabled(): boolean;
  /** 销毁处理器 */
  dispose(): void;
}