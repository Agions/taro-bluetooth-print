# 事件系统接口设计

## 设计目标

1. **类型安全的事件系统**：提供完整的TypeScript事件类型定义
2. **高性能事件处理**：支持同步和异步事件处理
3. **灵活的事件路由**：支持事件过滤、转换和路由
4. **事件溯源支持**：完整的事件历史记录和回放能力
5. **可扩展性**：支持插件式事件处理器和中间件

## 核心接口定义

### 1. 事件系统核心接口

```typescript
/**
 * 事件系统接口
 */
export interface IEventSystem {
  /** 系统是否已初始化 */
  readonly isInitialized: boolean;
  /** 当前系统状态 */
  readonly state: EventSystemState;
  /** 事件统计信息 */
  readonly statistics: IEventStatistics;
  /** 已注册的事件类型 */
  readonly registeredEventTypes: string[];
  /** 活跃的处理器数量 */
  readonly activeHandlersCount: number;

  /**
   * 初始化事件系统
   * @param options 初始化选项
   */
  initialize(options?: EventSystemOptions): Promise<void>;

  /**
   * 销毁事件系统
   */
  dispose(): Promise<void>;

  /**
   * 注册事件类型
   * @param eventType 事件类型
   * @param schema 事件模式
   */
  registerEventType<T extends IEvent>(eventType: string, schema?: EventSchema): void;

  /**
   * 注销事件类型
   * @param eventType 事件类型
   */
  unregisterEventType(eventType: string): void;

  /**
   * 发布事件
   * @param event 事件实例
   * @param options 发布选项
   */
  publish<TEvent extends IEvent>(event: TEvent, options?: PublishOptions): Promise<PublishResult>;

  /**
   * 同步发布事件
   * @param event 事件实例
   * @param options 发布选项
   */
  publishSync<TEvent extends IEvent>(event: TEvent, options?: PublishOptions): PublishResult;

  /**
   * 批量发布事件
   * @param events 事件列表
   * @param options 发布选项
   */
  publishBatch<TEvent extends IEvent>(events: TEvent[], options?: BatchPublishOptions): Promise<PublishResult[]>;

  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @param options 订阅选项
   */
  subscribe<TEvent extends IEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>,
    options?: SubscribeOptions
  ): IEventSubscription;

  /**
   * 订阅事件模式
   * @param pattern 事件模式
   * @param handler 事件处理器
   * @param options 订阅选项
   */
  subscribePattern<TEvent extends IEvent>(
    pattern: string,
    handler: IEventHandler<TEvent>,
    options?: SubscribeOptions
  ): IEventSubscription;

  /**
   * 取消订阅
   * @param subscription 订阅对象
   */
  unsubscribe(subscription: IEventSubscription): void;

  /**
   * 取消所有订阅
   * @param eventType 事件类型
   */
  unsubscribeAll(eventType?: string): void;

  /**
   * 获取事件处理器数量
   * @param eventType 事件类型
   */
  getHandlerCount(eventType: string): number;

  /**
   * 获取事件处理器列表
   * @param eventType 事件类型
   */
  getHandlers(eventType: string): IEventHandler[];

  /**
   * 注册事件中间件
   * @param middleware 中间件
   */
  use(middleware: IEventMiddleware): void;

  /**
   * 创建事件通道
   * @param name 通道名称
   * @param options 通道选项
   */
  createChannel(name: string, options?: ChannelOptions): IEventChannel;

  /**
   * 获取事件通道
   * @param name 通道名称
   */
  getChannel(name: string): IEventChannel | null;

  /**
   * 删除事件通道
   * @param name 通道名称
   */
  deleteChannel(name: string): boolean;

  /**
   * 启动事件录制
   * @param options 录制选项
   */
  startRecording(options?: RecordingOptions): IEventRecorder;

  /**
   * 停止事件录制
   * @param recorder 录制器
   */
  stopRecording(recorder: IEventRecorder): Promise<IEventRecording>;

  /**
   * 回放事件录制
   * @param recording 事件录制
   * @param options 回放选项
   */
  replayRecording(recording: IEventRecording, options?: ReplayOptions): Promise<ReplayResult>;

  /**
   * 查询事件历史
   * @param query 查询条件
   */
  queryEvents(query: EventQuery): Promise<IEvent[]>;

  /**
   * 获取系统诊断信息
   */
  getDiagnostics(): Promise<IEventSystemDiagnostics>;
}

/**
 * 事件系统选项
 */
export interface EventSystemOptions {
  /** 最大并发处理器数量 */
  maxConcurrentHandlers?: number;
  /** 默认处理器超时时间（毫秒） */
  defaultHandlerTimeout?: number;
  /** 是否启用事件验证 */
  enableEventValidation?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 事件存储配置 */
  storage?: IEventStorage;
  /** 事件序列化器 */
  serializer?: IEventSerializer;
  /** 错误处理策略 */
  errorHandlingStrategy?: ErrorHandlingStrategy;
}

/**
 * 发布选项
 */
export interface PublishOptions {
  /** 是否等待处理器完成 */
  waitForHandlers?: boolean;
  /** 处理器超时时间（毫秒） */
  handlerTimeout?: number;
  /** 是否跳过验证 */
  skipValidation?: boolean;
  /** 发布到特定通道 */
  channel?: string;
  /** 自定义元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 发布结果
 */
export interface PublishResult {
  /** 事件ID */
  eventId: string;
  /** 是否成功 */
  success: boolean;
  /** 处理器执行结果 */
  handlerResults: HandlerResult[];
  /** 总执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  errors?: Error[];
}

/**
 * 处理器结果
 */
export interface HandlerResult {
  /** 处理器ID */
  handlerId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  error?: Error;
}

/**
 * 订阅选项
 */
export interface SubscribeOptions {
  /** 处理器优先级 */
  priority?: number;
  /** 是否只运行一次 */
  once?: boolean;
  /** 处理器超时时间（毫秒） */
  timeout?: number;
  /** 过滤条件 */
  filter?: EventFilter;
  /** 转换函数 */
  transformer?: EventTransformer;
  /** 错误处理策略 */
  onError?: ErrorHandler;
}

/**
 * 批量发布选项
 */
export interface BatchPublishOptions {
  /** 是否按顺序处理 */
  sequential?: boolean;
  /** 批处理大小 */
  batchSize?: number;
  /** 批处理间隔（毫秒） */
  batchInterval?: number;
  /** 单个失败是否停止整个批次 */
  stopOnFirstError?: boolean;
}

/**
 * 事件订阅
 */
export interface IEventSubscription {
  /** 订阅ID */
  readonly id: string;
  /** 事件类型 */
  readonly eventType: string;
  /** 处理器ID */
  readonly handlerId: string;
  /** 订阅时间 */
  readonly subscribedAt: number;
  /** 是否活跃 */
  readonly active: boolean;

  /**
   * 暂停订阅
   */
  pause(): void;

  /**
   * 恢复订阅
   */
  resume(): void;

  /**
   * 取消订阅
   */
  unsubscribe(): void;
}
```

### 2. 事件处理器接口

```typescript
/**
 * 事件处理器接口
 */
export interface IEventHandler<TEvent extends IEvent = IEvent> {
  /** 处理器ID */
  readonly id: string;
  /** 处理器名称 */
  readonly name: string;
  /** 处理器优先级 */
  readonly priority: number;
  /** 是否支持异步处理 */
  readonly async: boolean;

  /**
   * 处理事件
   * @param event 事件实例
   * @param context 处理上下文
   */
  handle(event: TEvent, context: IHandlerContext): Promise<HandlerResult> | HandlerResult;

  /**
   * 检查是否可以处理指定事件
   * @param event 事件实例
   */
  canHandle(event: IEvent): boolean;

  /**
   * 获取处理器统计信息
   */
  getStatistics(): IHandlerStatistics;
}

/**
 * 处理上下文
 */
export interface IHandlerContext {
  /** 事件ID */
  readonly eventId: string;
  /** 发布时间 */
  readonly publishTime: number;
  /** 处理开始时间 */
  readonly startTime: number;
  /** 取消令牌 */
  readonly cancellationToken: ICancellationToken;
  /** 上下文数据 */
  readonly data: Map<string, unknown>;
}

/**
 * 取消令牌
 */
export interface ICancellationToken {
  /** 是否已取消 */
  readonly cancelled: boolean;
  /** 取消原因 */
  readonly reason?: string;

  /**
   * 取消操作
   * @param reason 取消原因
   */
  cancel(reason?: string): void;

  /**
   * 注册取消回调
   * @param callback 回调函数
   */
  onCancelled(callback: (reason?: string) => void): () => void;
}

/**
 * 处理器统计信息
 */
export interface IHandlerStatistics {
  /** 处理器ID */
  handlerId: string;
  /** 总处理次数 */
  totalHandled: number;
  /** 成功处理次数 */
  successCount: number;
  /** 失败处理次数 */
  failureCount: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最大执行时间（毫秒） */
  maxExecutionTime: number;
  /** 最小执行时间（毫秒） */
  minExecutionTime: number;
  /** 最后处理时间 */
  lastHandledAt?: number;
  /** 错误列表 */
  errors: HandlerError[];
}

/**
 * 处理器错误
 */
export interface HandlerError {
  /** 错误时间 */
  timestamp: number;
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 事件ID */
  eventId: string;
}

/**
 * 事件过滤器
 */
export type EventFilter = (event: IEvent) => boolean;

/**
 * 事件转换器
 */
export type EventTransformer = (event: IEvent) => IEvent | Promise<IEvent>;

/**
 * 错误处理器
 */
export type ErrorHandler = (error: Error, event: IEvent) => void | Promise<void>;
```

### 3. 事件中间件接口

```typescript
/**
 * 事件中间件接口
 */
export interface IEventMiddleware {
  /** 中间件名称 */
  readonly name: string;
  /** 中间件优先级 */
  readonly priority: number;

  /**
   * 处理事件
   * @param event 事件实例
   * @param next 下一个中间件
   * @param context 处理上下文
   */
  process(event: IEvent, next: NextMiddleware, context: IMiddlewareContext): Promise<void> | void;
}

/**
 * 下一个中间件函数
 */
export type NextMiddleware = () => Promise<void> | void;

/**
 * 中间件上下文
 */
export interface IMiddlewareContext {
  /** 事件ID */
  readonly eventId: string;
  /** 中间件执行链 */
  readonly chain: string[];
  /** 中间件数据 */
  readonly data: Map<string, unknown>;
}

/**
 * 内置中间件
 */
export namespace BuiltInMiddleware {
  /**
   * 事件验证中间件
   */
  export class EventValidationMiddleware implements IEventMiddleware {
    constructor(private schemaRegistry: ISchemaRegistry) {}

    readonly name = 'EventValidation';
    readonly priority = 1000;

    async process(event: IEvent, next: NextMiddleware, context: IMiddlewareContext): Promise<void> {
      const schema = this.schemaRegistry.getSchema(event.type);
      if (schema && !this.validateEvent(event, schema)) {
        throw new Error(`Event validation failed for type: ${event.type}`);
      }
      await next();
    }

    private validateEvent(event: IEvent, schema: EventSchema): boolean {
      // 验证逻辑
      return true;
    }
  }

  /**
   * 性能监控中间件
   */
  export class PerformanceMonitoringMiddleware implements IEventMiddleware {
    readonly name = 'PerformanceMonitoring';
    readonly priority = 500;

    async process(event: IEvent, next: NextMiddleware, context: IMiddlewareContext): Promise<void> {
      const startTime = performance.now();
      context.data.set('startTime', startTime);

      try {
        await next();
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.recordMetrics(event.type, duration);
      }
    }

    private recordMetrics(eventType: string, duration: number): void {
      // 记录性能指标
    }
  }

  /**
   * 日志记录中间件
   */
  export class LoggingMiddleware implements IEventMiddleware {
    constructor(private logger: ILogger) {}

    readonly name = 'Logging';
    readonly priority = 100;

    async process(event: IEvent, next: NextMiddleware, context: IMiddlewareContext): Promise<void> {
      this.logger.debug(`Processing event: ${event.type}`, { eventId: event.id });

      try {
        await next();
        this.logger.debug(`Event processed successfully: ${event.type}`, { eventId: event.id });
      } catch (error) {
        this.logger.error(`Event processing failed: ${event.type}`, {
          eventId: event.id,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  }
}
```

### 4. 事件通道接口

```typescript
/**
 * 事件通道接口
 */
export interface IEventChannel {
  /** 通道名称 */
  readonly name: string;
  /** 通道状态 */
  readonly state: ChannelState;
  /** 通道中的事件数量 */
  readonly eventCount: number;
  /** 订阅者数量 */
  readonly subscriberCount: number;

  /**
   * 发布事件到通道
   * @param event 事件实例
   */
  publish<TEvent extends IEvent>(event: TEvent): Promise<void>;

  /**
   * 订阅通道事件
   * @param handler 事件处理器
   * @param filter 事件过滤器
   */
  subscribe<TEvent extends IEvent>(
    handler: IEventHandler<TEvent>,
    filter?: EventFilter
  ): IChannelSubscription;

  /**
   * 暂停通道
   */
  pause(): void;

  /**
   * 恢复通道
   */
  resume(): void;

  /**
   * 清空通道
   */
  clear(): void;

  /**
   * 关闭通道
   */
  close(): void;
}

/**
 * 通道状态枚举
 */
export enum ChannelState {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed'
}

/**
 * 通道选项
 */
export interface ChannelOptions {
  /** 最大事件数量 */
  maxEvents?: number;
  /** 是否持久化事件 */
  persistent?: boolean;
  /** 事件过期时间（毫秒） */
  eventTtl?: number;
  /** 是否启用重复检测 */
  enableDuplicateDetection?: boolean;
}

/**
 * 通道订阅
 */
export interface IChannelSubscription {
  /** 订阅ID */
  readonly id: string;
  /** 处理器ID */
  readonly handlerId: string;
  /** 订阅时间 */
  readonly subscribedAt: number;

  /**
   * 取消订阅
   */
  unsubscribe(): void;
}
```

### 5. 事件存储和录制接口

```typescript
/**
 * 事件存储接口
 */
export interface IEventStorage {
  /** 存储名称 */
  readonly name: string;
  /** 存储类型 */
  readonly type: EventStorageType;

  /**
   * 存储事件
   * @param event 事件实例
   */
  store(event: IEvent): Promise<void>;

  /**
   * 批量存储事件
   * @param events 事件列表
   */
  storeBatch(events: IEvent[]): Promise<void>;

  /**
   * 查询事件
   * @param query 查询条件
   */
  query(query: EventQuery): Promise<IEvent[]>;

  /**
   * 获取事件
   * @param eventId 事件ID
   */
  get(eventId: string): Promise<IEvent | null>;

  /**
   * 删除事件
   * @param eventId 事件ID
   */
  delete(eventId: string): Promise<boolean>;

  /**
   * 清空存储
   */
  clear(): Promise<void>;

  /**
   * 获取存储统计信息
   */
  getStatistics(): Promise<IEventStorageStatistics>;
}

/**
 * 事件存储类型枚举
 */
export enum EventStorageType {
  MEMORY = 'memory',
  FILE = 'file',
  DATABASE = 'database',
  REDIS = 'redis'
}

/**
 * 事件查询
 */
export interface EventQuery {
  /** 事件类型过滤 */
  eventTypes?: string[];
  /** 时间范围过滤 */
  timeRange?: {
    start: number;
    end: number;
  };
  /** 数据过滤 */
  dataFilter?: Record<string, unknown>;
  /** 限制数量 */
  limit?: number;
  /** 排序方式 */
  sortBy?: EventSortBy;
  /** 排序方向 */
  sortOrder?: SortOrder;
}

/**
 * 排序字段枚举
 */
export enum EventSortBy {
  TIMESTAMP = 'timestamp',
  TYPE = 'type',
  PRIORITY = 'priority'
}

/**
 * 排序方向枚举
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * 事件存储统计信息
 */
export interface IEventStorageStatistics {
  /** 存储名称 */
  name: string;
  /** 总事件数量 */
  totalEvents: number;
  /** 存储大小（字节） */
  storageSize: number;
  /** 最早事件时间 */
  earliestEvent: number;
  /** 最新事件时间 */
  latestEvent: number;
  /** 按事件类型统计 */
  eventsByType: Record<string, number>;
}

/**
 * 事件录制器接口
 */
export interface IEventRecorder {
  /** 录制器ID */
  readonly id: string;
  /** 录制开始时间 */
  readonly startTime: number;
  /** 录制状态 */
  readonly state: RecorderState;
  /** 已录制事件数量 */
  readonly recordedEvents: number;

  /**
   * 暂停录制
   */
  pause(): void;

  /**
   * 恢复录制
   */
  resume(): void;

  /**
   * 停止录制
   */
  stop(): void;

  /**
   * 添加事件过滤器
   * @param filter 过滤器
   */
  addFilter(filter: EventFilter): void;

  /**
   * 移除事件过滤器
   * @param filter 过滤器
   */
  removeFilter(filter: EventFilter): void;
}

/**
 * 录制器状态枚举
 */
export enum RecorderState {
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

/**
 * 录制选项
 */
export interface RecordingOptions {
  /** 录制名称 */
  name?: string;
  /** 是否包含元数据 */
  includeMetadata?: boolean;
  /** 最大录制事件数量 */
  maxEvents?: number;
  /** 最大录制时长（毫秒） */
  maxDuration?: number;
  /** 事件过滤器 */
  filters?: EventFilter[];
}

/**
 * 事件录制接口
 */
export interface IEventRecording {
  /** 录制ID */
  readonly id: string;
  /** 录制名称 */
  readonly name: string;
  /** 录制开始时间 */
  readonly startTime: number;
  /** 录制结束时间 */
  readonly endTime: number;
  /** 事件列表 */
  readonly events: IEvent[];
  /** 录制元数据 */
  readonly metadata: RecordingMetadata;
}

/**
 * 录制元数据
 */
export interface RecordingMetadata {
  /** 录制版本 */
  version: string;
  /** 事件系统版本 */
  systemVersion: string;
  /** 录制环境 */
  environment: string;
  /** 录制用户 */
  user?: string;
  /** 录制标签 */
  tags?: string[];
  /** 自定义属性 */
  custom?: Record<string, unknown>;
}

/**
 * 回放选项
 */
export interface ReplayOptions {
  /** 回放速度倍数 */
  speed?: number;
  /** 是否保持原始时间间隔 */
  preserveTiming?: boolean;
  /** 开始时间偏移（毫秒） */
  startOffset?: number;
  /** 结束时间偏移（毫秒） */
  endOffset?: number;
  /** 事件过滤器 */
  filters?: EventFilter[];
  /** 是否跳过错误 */
  skipErrors?: boolean;
}

/**
 * 回放结果
 */
export interface ReplayResult {
  /** 录制ID */
  readonly recordingId: string;
  /** 回放开始时间 */
  readonly startTime: number;
  /** 回放结束时间 */
  readonly endTime: number;
  /** 回放事件数量 */
  readonly replayedEvents: number;
  /** 成功事件数量 */
  readonly successEvents: number;
  /** 失败事件数量 */
  readonly failedEvents: number;
  /** 回放错误列表 */
  readonly errors: ReplayError[];
}

/**
 * 回放错误
 */
export interface ReplayError {
  /** 事件索引 */
  eventIndex: number;
  /** 事件ID */
  eventId: string;
  /** 错误消息 */
  message: string;
  /** 错误时间 */
  timestamp: number;
}
```

### 6. 事件统计和诊断接口

```typescript
/**
 * 事件统计信息接口
 */
export interface IEventStatistics {
  /** 总发布事件数 */
  totalPublished: number;
  /** 总处理事件数 */
  totalHandled: number;
  /** 总失败事件数 */
  totalFailed: number;
  /** 平均处理时间（毫秒） */
  averageHandlingTime: number;
  /** 每秒事件数 */
  eventsPerSecond: number;
  /** 按事件类型统计 */
  eventsByType: Record<string, EventTypeStatistics>;
  /** 按处理器统计 */
  handlersByType: Record<string, HandlerTypeStatistics>;
  /** 系统负载 */
  systemLoad: SystemLoad;
}

/**
 * 事件类型统计
 */
export interface EventTypeStatistics {
  /** 事件类型 */
  eventType: string;
  /** 发布次数 */
  publishCount: number;
  /** 处理次数 */
  handleCount: number;
  /** 平均处理时间 */
  averageHandlingTime: number;
  /** 成功率 */
  successRate: number;
}

/**
 * 处理器类型统计
 */
export interface HandlerTypeStatistics {
  /** 处理器类型 */
  handlerType: string;
  /** 活跃处理器数量 */
  activeHandlers: number;
  /** 总处理次数 */
  totalHandled: number;
  /** 平均处理时间 */
  averageHandlingTime: number;
}

/**
 * 系统负载
 */
export interface SystemLoad {
  /** CPU使用率 */
  cpuUsage: number;
  /** 内存使用率 */
  memoryUsage: number;
  /** 队列大小 */
  queueSize: number;
  /** 活跃线程数 */
  activeThreads: number;
}

/**
 * 事件系统诊断信息
 */
export interface IEventSystemDiagnostics {
  /** 系统状态 */
  systemState: EventSystemState;
  /** 配置信息 */
  configuration: EventSystemConfiguration;
  /** 统计信息 */
  statistics: IEventStatistics;
  /** 健康检查结果 */
  healthCheck: IHealthCheckResult;
  /** 性能指标 */
  performanceMetrics: IPerformanceMetrics;
}

/**
 * 健康检查结果
 */
export interface IHealthCheckResult {
  /** 总体健康状态 */
  overall: HealthStatus;
  /** 各组件健康状态 */
  components: ComponentHealth[];
  /** 检查时间 */
  checkedAt: number;
  /** 建议改进项 */
  recommendations: string[];
}

/**
 * 健康状态枚举
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  UNHEALTHY = 'unhealthy'
}

/**
 * 组件健康状态
 */
export interface ComponentHealth {
  /** 组件名称 */
  name: string;
  /** 健康状态 */
  status: HealthStatus;
  /** 响应时间（毫秒） */
  responseTime?: number;
  /** 详细信息 */
  details?: Record<string, unknown>;
}

/**
 * 性能指标
 */
export interface IPerformanceMetrics {
  /** 延迟指标 */
  latency: ILatencyMetrics;
  /** 吞吐量指标 */
  throughput: IThroughputMetrics;
  /** 错误率指标 */
  errorRate: IErrorRateMetrics;
  /** 资源使用指标 */
  resourceUsage: IResourceUsageMetrics;
}

/**
 * 延迟指标
 */
export interface ILatencyMetrics {
  /** 平均延迟 */
  average: number;
  /** 中位数延迟 */
  median: number;
  /** 95分位延迟 */
  p95: number;
  /** 99分位延迟 */
  p99: number;
  /** 最大延迟 */
  max: number;
}

/**
 * 吞吐量指标
 */
export interface IThroughputMetrics {
  /** 每秒事件数 */
  eventsPerSecond: number;
  /** 每分钟事件数 */
  eventsPerMinute: number;
  /** 峰值吞吐量 */
  peakThroughput: number;
}

/**
 * 错误率指标
 */
export interface IErrorRateMetrics {
  /** 错误率（百分比） */
  errorRate: number;
  /** 每分钟错误数 */
  errorsPerMinute: number;
  /** 主要错误类型 */
  topErrors: ErrorTypeCount[];
}

/**
 * 错误类型计数
 */
export interface ErrorTypeCount {
  /** 错误类型 */
  type: string;
  /** 数量 */
  count: number;
  /** 百分比 */
  percentage: number;
}

/**
 * 资源使用指标
 */
export interface IResourceUsageMetrics {
  /** CPU使用率 */
  cpuUsage: number;
  /** 内存使用量（字节） */
  memoryUsage: number;
  /** 磁盘使用量（字节） */
  diskUsage: number;
  /** 网络I/O（字节） */
  networkIO: number;
}
```

## 使用示例

### 基本事件发布和订阅

```typescript
// 创建事件系统
const eventSystem = createEventSystem();

// 初始化
await eventSystem.initialize({
  maxConcurrentHandlers: 10,
  defaultHandlerTimeout: 5000,
  enablePerformanceMonitoring: true
});

// 注册事件类型
eventSystem.registerEventType('bluetooth.device.connected');

// 创建事件处理器
const deviceConnectedHandler: IEventHandler<BluetoothDeviceConnectedEvent> = {
  id: 'device-connected-handler',
  name: 'Device Connected Handler',
  priority: 100,
  async: true,

  async handle(event, context) {
    console.log(`设备已连接: ${event.data.deviceName}`);
    return { success: true, executionTime: 10, handlerId: this.id };
  },

  canHandle(event) {
    return event.type === 'bluetooth.device.connected';
  },

  getStatistics() {
    return {
      handlerId: this.id,
      totalHandled: 1,
      successCount: 1,
      failureCount: 0,
      averageExecutionTime: 10,
      maxExecutionTime: 10,
      minExecutionTime: 10,
      lastHandledAt: Date.now(),
      errors: []
    };
  }
};

// 订阅事件
const subscription = eventSystem.subscribe('bluetooth.device.connected', deviceConnectedHandler, {
  priority: 100,
  timeout: 3000,
  filter: (event) => event.data.rssi && event.data.rssi > -50
});

// 发布事件
const event = new BluetoothDeviceConnectedEvent(
  { deviceId: 'device123', deviceName: 'Printer-001' },
  'device123',
  'bluetooth-adapter'
);

const result = await eventSystem.publish(event);
console.log('发布结果:', result);
```

### 使用中间件

```typescript
// 添加中间件
eventSystem.use(new BuiltInMiddleware.EventValidationMiddleware(schemaRegistry));
eventSystem.use(new BuiltInMiddleware.PerformanceMonitoringMiddleware());
eventSystem.use(new BuiltInMiddleware.LoggingMiddleware(logger));

// 自定义中间件
const customMiddleware: IEventMiddleware = {
  name: 'CustomMiddleware',
  priority: 200,

  async process(event, next, context) {
    console.log(`处理事件前: ${event.type}`);
    await next();
    console.log(`处理事件后: ${event.type}`);
  }
};

eventSystem.use(customMiddleware);
```

### 事件通道

```typescript
// 创建事件通道
const channel = eventSystem.createChannel('printer-events', {
  maxEvents: 1000,
  enableDuplicateDetection: true
});

// 订阅通道事件
channel.subscribe(printJobHandler, (event) => {
  return event.type.startsWith('printer.print');
});

// 发布到通道
await channel.publish(printEvent);
```

### 事件录制和回放

```typescript
// 开始录制
const recorder = eventSystem.startRecording({
  name: 'test-recording',
  maxEvents: 1000,
  filters: [event => event.type.startsWith('bluetooth')]
});

// 执行一些操作...

// 停止录制
const recording = await eventSystem.stopRecording(recorder);

// 回放录制
const replayResult = await eventSystem.replayRecording(recording, {
  speed: 2.0,
  preserveTiming: true,
  skipErrors: true
});

console.log(`回放完成: ${replayResult.successEvents}/${replayResult.replayedEvents}`);
```

这个事件系统接口设计提供了：

1. **完整的事件系统**：支持发布/订阅、中间件、通道等
2. **高性能处理**：支持异步处理和并发控制
3. **事件溯源**：完整的录制、存储和回放功能
4. **监控诊断**：详细的统计信息和健康检查
5. **类型安全**：完整的TypeScript类型定义

这为整个系统的事件驱动架构提供了强大的基础设施支持。