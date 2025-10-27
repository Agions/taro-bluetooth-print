# 错误处理和日志接口设计

## 设计目标

1. **统一错误处理**：提供一致的错误分类、处理和恢复机制
2. **结构化日志**：支持结构化日志记录和查询
3. **多级别日志**：支持不同级别的日志输出
4. **可扩展性**：支持自定义错误类型和日志格式
5. **性能优化**：高效的错误处理和日志记录机制

## 核心接口定义

### 1. 错误处理系统接口

```typescript
/**
 * 错误处理系统接口
 */
export interface IErrorHandler {
  /** 系统是否已初始化 */
  readonly isInitialized: boolean;
  /** 当前错误统计 */
  readonly statistics: IErrorStatistics;
  /** 已注册的错误处理器 */
  readonly registeredHandlers: Map<string, IErrorProcessor>;

  /**
   * 初始化错误处理系统
   * @param options 初始化选项
   */
  initialize(options?: ErrorHandlerOptions): void;

  /**
   * 销毁错误处理系统
   */
  dispose(): void;

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文
   */
  handleError(error: Error | string, context?: IErrorContext): IErrorResult;

  /**
   * 处理错误并返回结果
   * @param error 错误对象
   * @param context 错误上下文
   * @param fallbackResult 回退结果
   */
  handleErrorWithFallback<T>(
    error: Error | string,
    context: IErrorContext,
    fallbackResult: T
  ): T;

  /**
   * 注册错误处理器
   * @param errorType 错误类型
   * @param processor 错误处理器
   */
  registerProcessor(errorType: string, processor: IErrorProcessor): void;

  /**
   * 注销错误处理器
   * @param errorType 错误类型
   */
  unregisterProcessor(errorType: string): boolean;

  /**
   * 创建错误对象
   * @param code 错误代码
   * @param message 错误消息
   * @param details 错误详情
   * @param cause 原因错误
   */
  createError(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): SystemError;

  /**
   * 包装错误
   * @param error 原始错误
   * @param code 错误代码
   * @param message 错误消息
   * @param context 错误上下文
   */
  wrapError(
    error: Error,
    code: ErrorCode | string,
    message: string,
    context?: IErrorContext
  ): SystemError;

  /**
   * 判断错误是否可恢复
   * @param error 错误对象
   */
  isRecoverable(error: Error): boolean;

  /**
   * 获取错误恢复策略
   * @param error 错误对象
   */
  getRecoveryStrategy(error: Error): IRecoveryStrategy | null;

  /**
   * 执行错误恢复
   * @param error 错误对象
   */
  recover(error: Error): Promise<IRecoveryResult>;

  /**
   * 设置全局错误处理器
   * @param handler 错误处理器
   */
  setGlobalHandler(handler: IGlobalErrorHandler): void;

  /**
   * 获取错误统计信息
   */
  getStatistics(): IErrorStatistics;

  /**
   * 重置错误统计
   */
  resetStatistics(): void;

  /**
   * 配置错误策略
   * @param policies 错误策略
   */
  configurePolicies(policies: IErrorPolicies): void;

  /**
   * 创建错误边界
   * @param name 边界名称
   * @param options 边界选项
   */
  createErrorBoundary(name: string, options?: ErrorBoundaryOptions): IErrorBoundary;
}

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否启用全局错误捕获 */
  enableGlobalCapture?: boolean;
  /** 默认错误策略 */
  defaultPolicy?: ErrorPolicy;
  /** 错误报告配置 */
  reporting?: IErrorReporting;
  /** 错误恢复配置 */
  recovery?: IErrorRecovery;
}

/**
 * 错误上下文
 */
export interface IErrorContext {
  /** 错误发生时间 */
  timestamp: number;
  /** 错误来源 */
  source: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 请求ID */
  requestId?: string;
  /** 操作类型 */
  operation?: string;
  /** 组件名称 */
  component?: string;
  /** 设备信息 */
  device?: IDeviceInfo;
  /** 应用版本 */
  appVersion?: string;
  /** 环境信息 */
  environment?: string;
  /** 自定义数据 */
  custom?: Record<string, unknown>;
}

/**
 * 错误结果
 */
export interface IErrorResult {
  /** 是否成功处理 */
  handled: boolean;
  /** 错误ID */
  errorId: string;
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: Record<string, unknown>;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 恢复策略 */
  recoveryStrategy?: IRecoveryStrategy;
  /** 处理时间（毫秒） */
  processingTime: number;
  /** 用户友好的错误消息 */
  userMessage?: string;
  /** 建议操作 */
  suggestions?: string[];
}

/**
 * 错误处理器接口
 */
export interface IErrorProcessor {
  /** 处理器ID */
  readonly id: string;
  /** 处理器名称 */
  readonly name: string;
  /** 支持的错误类型 */
  readonly supportedErrorTypes: string[];

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文
   */
  process(error: Error, context: IErrorContext): Promise<IErrorResult>;

  /**
   * 判断是否可以处理指定错误
   * @param error 错误对象
   */
  canHandle(error: Error): boolean;

  /**
   * 获取处理器优先级
   */
  getPriority(): number;
}

/**
 * 系统错误类
 */
export class SystemError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: number;
  public readonly context?: IErrorContext;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly recoverable: boolean;
  public readonly errorId: string;

  constructor(
    code: string,
    message: string,
    options: SystemErrorOptions = {}
  ) {
    super(message);
    this.name = 'SystemError';
    this.code = code;
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.severity = options.severity || ErrorSeverity.ERROR;
    this.timestamp = options.timestamp || Date.now();
    this.context = options.context;
    this.details = options.details;
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? false;
    this.errorId = options.errorId || this.generateErrorId();

    if (options.cause) {
      this.stack = options.cause.stack;
    }
  }

  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转换为用户友好的错误消息
   */
  toUserMessage(): string {
    return this.details?.userMessage || this.message;
  }

  /**
   * 获取建议操作
   */
  getSuggestions(): string[] {
    return this.details?.suggestions || [];
  }
}

/**
 * 系统错误选项
 */
export interface SystemErrorOptions {
  /** 错误分类 */
  category?: ErrorCategory;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
  /** 时间戳 */
  timestamp?: number;
  /** 错误上下文 */
  context?: IErrorContext;
  /** 错误详情 */
  details?: Record<string, unknown>;
  /** 原因错误 */
  cause?: Error;
  /** 是否可恢复 */
  recoverable?: boolean;
  /** 错误ID */
  errorId?: string;
}

/**
 * 错误分类枚举
 */
export enum ErrorCategory {
  UNKNOWN = 'unknown',
  VALIDATION = 'validation',
  NETWORK = 'network',
  BLUETOOTH = 'bluetooth',
  PRINTER = 'printer',
  HARDWARE = 'hardware',
  SYSTEM = 'system',
  PERMISSION = 'permission',
  CONFIGURATION = 'configuration',
  BUSINESS_LOGIC = 'business_logic',
  USER_INPUT = 'user_input',
  TIMEOUT = 'timeout',
  RESOURCE = 'resource'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 预定义错误代码
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  TIMEOUT = 'TIMEOUT',

  // 蓝牙错误
  BLUETOOTH_UNAVAILABLE = 'BLUETOOTH_UNAVAILABLE',
  BLUETOOTH_PERMISSION_DENIED = 'BLUETOOTH_PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_CONNECTION_FAILED = 'DEVICE_CONNECTION_FAILED',
  DEVICE_CONNECTION_TIMEOUT = 'DEVICE_CONNECTION_TIMEOUT',
  DEVICE_DISCONNECTED_UNEXPECTEDLY = 'DEVICE_DISCONNECTED_UNEXPECTEDLY',
  DEVICE_NOT_CONNECTED = 'DEVICE_NOT_CONNECTED',
  ADAPTER_INITIALIZATION_FAILED = 'ADAPTER_INITIALIZATION_FAILED',

  // 打印机错误
  PRINTER_NOT_FOUND = 'PRINTER_NOT_FOUND',
  PRINTER_CONNECTION_FAILED = 'PRINTER_CONNECTION_FAILED',
  PRINTER_BUSY = 'PRINTER_BUSY',
  PRINTER_OUT_OF_PAPER = 'PRINTER_OUT_OF_PAPER',
  PRINTER_OVERHEATED = 'PRINTER_OVERHEATED',
  PRINTER_COVER_OPEN = 'PRINTER_COVER_OPEN',
  PRINTER_PAPER_JAM = 'PRINTER_PAPER_JAM',
  PRINTER_COMMAND_FAILED = 'PRINTER_COMMAND_FAILED',
  PRINT_JOB_FAILED = 'PRINT_JOB_FAILED',
  PRINT_JOB_TIMEOUT = 'PRINT_JOB_TIMEOUT',

  // 系统错误
  SYSTEM_INITIALIZATION_FAILED = 'SYSTEM_INITIALIZATION_FAILED',
  MEMORY_INSUFFICIENT = 'MEMORY_INSUFFICIENT',
  DISK_SPACE_INSUFFICIENT = 'DISK_SPACE_INSUFFICIENT',
  CONFIGURATION_INVALID = 'CONFIGURATION_INVALID',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 网络错误
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_DATA_TRANSFER_FAILED = 'NETWORK_DATA_TRANSFER_FAILED'
}

/**
 * 错误统计信息
 */
export interface IErrorStatistics {
  /** 总错误数量 */
  totalErrors: number;
  /** 按分类统计 */
  errorsByCategory: Record<ErrorCategory, number>;
  /** 按严重程度统计 */
  errorsBySeverity: Record<ErrorSeverity, number>;
  /** 按错误代码统计 */
  errorsByCode: Record<string, number>;
  /** 按来源统计 */
  errorsBySource: Record<string, number>;
  /** 可恢复错误数量 */
  recoverableErrors: number;
  /** 不可恢复错误数量 */
  nonRecoverableErrors: number;
  /** 最近错误列表 */
  recentErrors: IRecentError[];
  /** 错误趋势 */
  trend: IErrorTrend;
}

/**
 * 最近错误
 */
export interface IRecentError {
  /** 错误ID */
  errorId: string;
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误分类 */
  category: ErrorCategory;
  /** 严重程度 */
  severity: ErrorSeverity;
  /** 发生时间 */
  timestamp: number;
  /** 错误来源 */
  source: string;
}

/**
 * 错误趋势
 */
export interface IErrorTrend {
  /** 时间段 */
  period: 'hour' | 'day' | 'week' | 'month';
  /** 错误数量变化 */
  change: number;
  /** 变化百分比 */
  changePercentage: number;
  /** 趋势方向 */
  direction: 'increasing' | 'decreasing' | 'stable';
}

/**
 * 错误恢复策略
 */
export interface IRecoveryStrategy {
  /** 策略ID */
  readonly id: string;
  /** 策略名称 */
  readonly name: string;
  /** 策略类型 */
  readonly type: RecoveryStrategyType;
  /** 策略描述 */
  readonly description: string;
  /** 最大重试次数 */
  readonly maxRetries: number;
  /** 重试间隔策略 */
  readonly retryInterval: RetryIntervalStrategy;

  /**
   * 执行恢复
   * @param error 错误对象
   * @param context 错误上下文
   */
  execute(error: Error, context: IErrorContext): Promise<IRecoveryResult>;
}

/**
 * 恢复策略类型枚举
 */
export enum RecoveryStrategyType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  RESET = 'reset',
  RESTART = 'restart',
  IGNORE = 'ignore',
  MANUAL_INTERVENTION = 'manual_intervention'
}

/**
 * 重试间隔策略
 */
export enum RetryIntervalStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential'
}

/**
 * 恢复结果
 */
export interface IRecoveryResult {
  /** 是否成功 */
  success: boolean;
  /** 策略ID */
  strategyId: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
  /** 结果消息 */
  message: string;
  /** 建议操作 */
  suggestions?: string[];
  /** 是否需要人工干预 */
  requiresManualIntervention: boolean;
}

/**
 * 全局错误处理器
 */
export type IGlobalErrorHandler = (error: Error, context: IErrorContext) => void | Promise<void>;

/**
 * 错误策略配置
 */
export interface IErrorPolicies {
  /** 默认策略 */
  defaultPolicy: ErrorPolicy;
  /** 分类策略 */
  categoryPolicies: Record<ErrorCategory, ErrorPolicy>;
  /** 代码策略 */
  codePolicies: Record<string, ErrorPolicy>;
  /** 严重程度策略 */
  severityPolicies: Record<ErrorSeverity, ErrorPolicy>;
}

/**
 * 错误策略
 */
export interface ErrorPolicy {
  /** 是否记录错误 */
  logError: boolean;
  /** 是否报告错误 */
  reportError: boolean;
  /** 是否尝试恢复 */
  attemptRecovery: boolean;
  /** 是否显示用户通知 */
  showUserNotification: boolean;
  /** 错误级别 */
  level: ErrorSeverity;
  /** 用户消息 */
  userMessage?: string;
  /** 建议操作 */
  suggestions?: string[];
}

/**
 * 错误边界接口
 */
export interface IErrorBoundary {
  /** 边界名称 */
  readonly name: string;
  /** 是否活跃 */
  readonly active: boolean;
  /** 边界内的错误统计 */
  readonly statistics: IErrorBoundaryStatistics;

  /**
   * 执行操作
   * @param operation 操作函数
   */
  execute<T>(operation: () => T): Promise<T>;

  /**
   * 捕获错误
   * @param error 错误对象
   */
  capture(error: Error): void;

  /**
   * 重置边界状态
   */
  reset(): void;

  /**
   * 设置错误处理器
   * @param handler 错误处理器
   */
  setErrorHandler(handler: IErrorBoundaryHandler): void;

  /**
   * 获取错误历史
   * @param limit 限制数量
   */
  getErrorHistory(limit?: number): IErrorHistory[];
}

/**
 * 错误边界选项
 */
export interface ErrorBoundaryOptions {
  /** 最大错误数量 */
  maxErrors?: number;
  /** 错误重置时间（毫秒） */
  resetAfter?: number;
  /** 是否记录错误 */
  logErrors?: boolean;
  /** 默认错误处理器 */
  defaultHandler?: IErrorBoundaryHandler;
}

/**
 * 错误边界统计
 */
export interface IErrorBoundaryStatistics {
  /** 边界名称 */
  name: string;
  /** 总错误数量 */
  totalErrors: number;
  /** 最后错误时间 */
  lastErrorAt?: number;
  /** 错误频率（每小时） */
  errorRate: number;
}

/**
 * 错误边界处理器
 */
export type IErrorBoundaryHandler = (error: Error, boundary: IErrorBoundary) => void;

/**
 * 错误历史
 */
export interface IErrorHistory {
  /** 错误ID */
  errorId: string;
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 发生时间 */
  timestamp: number;
  /** 是否已恢复 */
  recovered: boolean;
}
```

### 2. 日志系统接口

```typescript
/**
 * 日志系统接口
 */
export interface ILogger {
  /** 日志器名称 */
  readonly name: string;
  /** 当前日志级别 */
  readonly level: LogLevel;
  /** 是否启用 */
  readonly enabled: boolean;

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 日志数据
   */
  log(level: LogLevel, message: string, data?: unknown): void;

  /**
   * 记录跟踪日志
   * @param message 日志消息
   * @param data 日志数据
   */
  trace(message: string, data?: unknown): void;

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param data 日志数据
   */
  debug(message: string, data?: unknown): void;

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param data 日志数据
   */
  info(message: string, data?: unknown): void;

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param data 日志数据
   */
  warn(message: string, data?: unknown): void;

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param error 错误对象
   * @param data 日志数据
   */
  error(message: string, error?: Error, data?: unknown): void;

  /**
   * 记录致命错误日志
   * @param message 日志消息
   * @param error 错误对象
   * @param data 日志数据
   */
  fatal(message: string, error?: Error, data?: unknown): void;

  /**
   * 创建子日志器
   * @param name 子日志器名称
   * @param context 上下文数据
   */
  createChild(name: string, context?: Record<string, unknown>): ILogger;

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void;

  /**
   * 启用/禁用日志器
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void;

  /**
   * 添加日志输出器
   * @param output 日志输出器
   */
  addOutput(output: ILogOutput): void;

  /**
   * 移除日志输出器
   * @param outputId 输出器ID
   */
  removeOutput(outputId: string): boolean;

  /**
   * 添加日志格式化器
   * @param formatter 日志格式化器
   */
  addFormatter(formatter: ILogFormatter): void;

  /**
   * 添加日志过滤器
   * @param filter 日志过滤器
   */
  addFilter(filter: ILogFilter): void;

  /**
   * 记录性能指标
   * @param operation 操作名称
   * @param duration 持续时间（毫秒）
   * @param metadata 元数据
   */
  performance(operation: string, duration: number, metadata?: Record<string, unknown>): void;

  /**
   * 开始性能计时
   * @param operation 操作名称
   */
  startTimer(operation: string): ITimer;

  /**
   * 记录用户操作
   * @param action 操作名称
   * @param details 操作详情
   */
  userAction(action: string, details?: Record<string, unknown>): void;

  /**
   * 记录业务事件
   * @param event 事件名称
   * @param details 事件详情
   */
  businessEvent(event: string, details?: Record<string, unknown>): void;

  /**
   * 记录安全事件
   * @param event 事件名称
   * @param details 事件详情
   */
  securityEvent(event: string, details?: Record<string, unknown>): void;

  /**
   * 获取日志统计
   */
  getStatistics(): ILogStatistics;
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  OFF = 6
}

/**
 * 日志输出器接口
 */
export interface ILogOutput {
  /** 输出器ID */
  readonly id: string;
  /** 输出器名称 */
  readonly name: string;
  /** 输出器类型 */
  readonly type: LogOutputType;
  /** 最小日志级别 */
  readonly minLevel: LogLevel;
  /** 是否启用 */
  readonly enabled: boolean;

  /**
   * 输出日志
   * @param entry 日志条目
   */
  write(entry: ILogEntry): Promise<void>;

  /**
   * 刷新缓冲区
   */
  flush(): Promise<void>;

  /**
   * 关闭输出器
   */
  close(): Promise<void>;

  /**
   * 配置输出器
   * @param config 配置选项
   */
  configure(config: Record<string, unknown>): void;
}

/**
 * 日志输出器类型枚举
 */
export enum LogOutputType {
  CONSOLE = 'console',
  FILE = 'file',
  REMOTE = 'remote',
  DATABASE = 'database',
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook'
}

/**
 * 日志格式化器接口
 */
export interface ILogFormatter {
  /** 格式化器ID */
  readonly id: string;
  /** 格式化器名称 */
  readonly name: string;
  /** 格式化器类型 */
  readonly type: LogFormatterType;

  /**
   * 格式化日志条目
   * @param entry 日志条目
   */
  format(entry: ILogEntry): string;
}

/**
 * 日志格式化器类型枚举
 */
export enum LogFormatterType {
  SIMPLE = 'simple',
  DETAILED = 'detailed',
  JSON = 'json',
  STRUCTURED = 'structured',
  COLORED = 'colored'
}

/**
 * 日志过滤器接口
 */
export interface ILogFilter {
  /** 过滤器ID */
  readonly id: string;
  /** 过滤器名称 */
  readonly name: string;
  /** 过滤器类型 */
  readonly type: LogFilterType;

  /**
   * 判断是否通过过滤
   * @param entry 日志条目
   */
  passes(entry: ILogEntry): boolean;
}

/**
 * 日志过滤器类型枚举
 */
export enum LogFilterType {
  LEVEL = 'level',
  MESSAGE = 'message',
  CONTEXT = 'context',
  TIME = 'time',
  CUSTOM = 'custom'
}

/**
 * 日志条目接口
 */
export interface ILogEntry {
  /** 日志ID */
  readonly id: string;
  /** 日志级别 */
  readonly level: LogLevel;
  /** 日志消息 */
  readonly message: string;
  /** 时间戳 */
  readonly timestamp: number;
  /** 日志器名称 */
  readonly logger: string;
  /** 线程ID */
  readonly threadId?: string;
  /** 调用位置 */
  readonly location?: ILogLocation;
  /** 日志数据 */
  readonly data?: unknown;
  /** 错误对象 */
  readonly error?: Error;
  /** 标签 */
  readonly tags?: string[];
  /** 相关ID */
  readonly correlationId?: string;
}

/**
 * 日志位置
 */
export interface ILogLocation {
  /** 文件名 */
  fileName: string;
  /** 函数名 */
  functionName: string;
  /** 行号 */
  lineNumber: number;
  /** 列号 */
  columnNumber: number;
}

/**
 * 计时器接口
 */
export interface ITimer {
  /** 操作名称 */
  readonly operation: string;
  /** 开始时间 */
  readonly startTime: number;
  /** 是否已结束 */
  readonly finished: boolean;

  /**
   * 结束计时
   * @param metadata 元数据
   */
  end(metadata?: Record<string, unknown>): number;

  /**
   * 获取已用时间
   */
  getElapsed(): number;
}

/**
 * 日志统计信息
 */
export interface ILogStatistics {
  /** 日志器名称 */
  logger: string;
  /** 总日志数量 */
  totalLogs: number;
  /** 按级别统计 */
  logsByLevel: Record<LogLevel, number>;
  /** 按输出器统计 */
  logsByOutput: Record<string, number>;
  /** 每秒日志数量 */
  logsPerSecond: number;
  /** 平均日志大小 */
  averageLogSize: number;
  /** 错误日志数量 */
  errorLogs: number;
  /** 警告日志数量 */
  warningLogs: number;
  /** 最近日志时间 */
  lastLogTime: number;
  /** 统计更新时间 */
  statisticsTime: number;
}
```

### 3. 内置实现

```typescript
/**
 * 控制台日志输出器
 */
export class ConsoleLogOutput implements ILogOutput {
  readonly id = 'console';
  readonly name = 'Console Output';
  readonly type = LogOutputType.CONSOLE;
  readonly minLevel = LogLevel.TRACE;
  readonly enabled = true;

  constructor(private useColors = true) {}

  async write(entry: ILogEntry): Promise<void> {
    const message = this.formatMessage(entry);
    const method = this.getConsoleMethod(entry.level);

    if (this.useColors) {
      method(message);
    } else {
      console.log(message);
    }
  }

  async flush(): Promise<void> {
    // 控制台不需要刷新
  }

  async close(): Promise<void> {
    // 控制台不需要关闭
  }

  configure(config: Record<string, unknown>): void {
    this.useColors = config.useColors as boolean ?? this.useColors;
  }

  private formatMessage(entry: ILogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const logger = entry.logger.padEnd(20);

    let message = `[${timestamp}] [${level}] [${logger}] ${entry.message}`;

    if (entry.data) {
      message += ` ${JSON.stringify(entry.data)}`;
    }

    if (entry.error) {
      message += `\n${entry.error.stack || entry.error.message}`;
    }

    return message;
  }

  private getConsoleMethod(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

/**
 * 文件日志输出器
 */
export class FileLogOutput implements ILogOutput {
  readonly id: 'file';
  readonly name = 'File Output';
  readonly type = LogOutputType.FILE;
  readonly minLevel = LogLevel.TRACE;
  readonly enabled = true;

  private writeQueue: ILogEntry[] = [];
  private writing = false;

  constructor(
    private filePath: string,
    private options: FileLogOptions = {}
  ) {}

  async write(entry: ILogEntry): Promise<void> {
    if (!this.enabled || entry.level < this.minLevel) {
      return;
    }

    this.writeQueue.push(entry);
    if (!this.writing) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.writing || this.writeQueue.length === 0) {
      return;
    }

    this.writing = true;
    try {
      const entries = [...this.writeQueue];
      this.writeQueue = [];

      const content = entries
        .map(entry => this.formatEntry(entry))
        .join(this.options.lineSeparator || '\n');

      // 这里应该实现实际的文件写入逻辑
      // await fs.appendFile(this.filePath, content, 'utf8');

    } catch (error) {
      console.error('Failed to write log to file:', error);
    } finally {
      this.writing = false;
    }
  }

  async close(): Promise<void> {
    await this.flush();
  }

  configure(config: Record<string, unknown>): void {
    this.options = { ...this.options, ...config };
  }

  private formatEntry(entry: ILogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(5);

    let message = `[${timestamp}] [${level}] [${entry.logger}] ${entry.message}`;

    if (entry.data) {
      message += ` ${JSON.stringify(entry.data)}`;
    }

    if (entry.error) {
      message += ` ${entry.error.stack || entry.error.message}`;
    }

    return message;
  }
}

/**
 * 文件日志选项
 */
export interface FileLogOptions {
  /** 行分隔符 */
  lineSeparator?: string;
  /** 文件大小限制（字节） */
  maxFileSize?: number;
  /** 文件数量限制 */
  maxFiles?: number;
  /** 是否启用压缩 */
  enableCompression?: boolean;
}

/**
 * JSON格式化器
 */
export class JsonLogFormatter implements ILogFormatter {
  readonly id = 'json';
  readonly name = 'JSON Formatter';
  readonly type = LogFormatterType.JSON;

  format(entry: ILogEntry): string {
    return JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      level: LogLevel[entry.level],
      logger: entry.logger,
      message: entry.message,
      data: entry.data,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack
      } : undefined,
      tags: entry.tags,
      correlationId: entry.correlationId
    });
  }
}

/**
 * 级别过滤器
 */
export class LevelLogFilter implements ILogFilter {
  readonly id = 'level';
  readonly name = 'Level Filter';
  readonly type = LogFilterType.LEVEL;

  constructor(private minLevel: LogLevel) {}

  passes(entry: ILogEntry): boolean {
    return entry.level >= this.minLevel;
  }
}

/**
 * 消息过滤器
 */
export class MessageLogFilter implements ILogFilter {
  readonly id = 'message';
  readonly name = 'Message Filter';
  readonly type = LogFilterType.MESSAGE;

  constructor(
    private pattern: string | RegExp,
    private include: boolean = true
  ) {}

  passes(entry: ILogEntry): boolean {
    const matches = typeof this.pattern === 'string'
      ? entry.message.includes(this.pattern)
      : this.pattern.test(entry.message);

    return this.include ? matches : !matches;
  }
}

/**
 * 简单计时器
 */
export class SimpleTimer implements ITimer {
  readonly operation: string;
  readonly startTime: number;
  finished = false;
  endTime = 0;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(metadata?: Record<string, unknown>): number {
    if (this.finished) {
      return this.getElapsed();
    }

    this.finished = true;
    this.endTime = Date.now();

    const duration = this.getElapsed();

    // 这里应该记录到日志系统
    // logger.performance(this.operation, duration, metadata);

    return duration;
  }

  getElapsed(): number {
    const endTime = this.finished ? this.endTime : Date.now();
    return endTime - this.startTime;
  }
}
```

## 使用示例

### 错误处理

```typescript
// 创建错误处理器
const errorHandler = createErrorHandler();

// 初始化
errorHandler.initialize({
  enableGlobalCapture: true,
  defaultPolicy: {
    logError: true,
    reportError: true,
    attemptRecovery: true,
    showUserNotification: true,
    level: ErrorSeverity.ERROR
  }
});

// 注册错误处理器
errorHandler.registerProcessor(ErrorCode.BLUETOOTH_CONNECTION_FAILED, {
  id: 'bluetooth-connection-processor',
  name: 'Bluetooth Connection Error Processor',
  supportedErrorTypes: [ErrorCode.BLUETOOTH_CONNECTION_FAILED],
  priority: 100,

  async process(error, context) {
    console.log('处理蓝牙连接错误:', error.message);

    return {
      handled: true,
      errorId: error.errorId,
      code: error.code,
      message: error.message,
      recoverable: true,
      processingTime: 50,
      userMessage: '蓝牙连接失败，请检查设备是否已开启并重试',
      suggestions: [
        '确保蓝牙设备已开启',
        '检查设备是否在范围内',
        '重启蓝牙适配器'
      ]
    };
  },

  canHandle(error) {
    return error instanceof SystemError &&
           error.code === ErrorCode.BLUETOOTH_CONNECTION_FAILED;
  },

  getPriority() {
    return 100;
  }
});

// 处理错误
try {
  await connectToDevice(deviceId);
} catch (error) {
  const result = errorHandler.handleError(error, {
    source: 'bluetooth-service',
    operation: 'connect-device',
    device: { id: deviceId, name: 'Printer-001' }
  });

  console.log('错误处理结果:', result);
}
```

### 日志记录

```typescript
// 创建日志器
const logger = createLogger('app.bluetooth');

// 添加输出器
logger.addOutput(new ConsoleLogOutput(true));
logger.addOutput(new FileLogOutput('./logs/app.log', {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5
}));

// 添加格式化器
logger.addFormatter(new JsonLogFormatter());

// 添加过滤器
logger.addFilter(new LevelLogFilter(LogLevel.DEBUG));

// 记录不同级别的日志
logger.trace('开始蓝牙扫描');
logger.debug('发现设备:', { deviceId: 'device123', name: 'Printer-001' });
logger.info('设备连接成功');
logger.warn('信号强度较低:', { rssi: -85 });
logger.error('连接失败', new Error('连接超时'));

// 性能计时
const timer = logger.startTimer('bluetooth-scan');
// ... 执行扫描操作
timer.end({ deviceCount: 3, scanDuration: 5000 });

// 用户操作记录
logger.userAction('connect-device', {
  deviceId: 'device123',
  deviceName: 'Printer-001'
});

// 业务事件记录
logger.businessEvent('print-job-completed', {
  jobId: 'job123',
  pages: 2,
  duration: 15000
});

// 安全事件记录
logger.securityEvent('unauthorized-access-attempt', {
  ip: '192.168.1.100',
  userId: 'unknown',
  target: 'bluetooth-service'
});
```

### 错误边界

```typescript
// 创建错误边界
const bluetoothBoundary = errorHandler.createErrorBoundary('bluetooth-service', {
  maxErrors: 10,
  resetAfter: 300000, // 5分钟
  logErrors: true
});

// 在边界中执行操作
const result = await bluetoothBoundary.execute(async () => {
  const devices = await scanDevices();
  const connected = await connectDevice(devices[0].id);
  return connected;
});

// 设置错误处理器
bluetoothBoundary.setErrorHandler((error, boundary) => {
  console.error(`错误边界 ${boundary.name} 捕获错误:`, error);

  // 发送错误报告
  errorReporting.send(error);

  // 显示用户通知
  notificationService.showError('蓝牙服务遇到错误，请重试');
});
```

这个错误处理和日志接口设计提供了：

1. **统一的错误处理**：完整的错误分类、处理和恢复机制
2. **结构化日志**：支持多种输出格式和过滤器
3. **性能监控**：内置性能计时和指标记录
4. **错误边界**：提供错误隔离和恢复机制
5. **可扩展性**：支持自定义处理器、输出器和格式化器

这为整个系统提供了强大的错误处理和日志记录基础设施。