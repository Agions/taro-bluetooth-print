/**
 * 事件系统类型定义
 */

// 基础事件接口
export interface IEvent {
  /** 事件唯一标识符 */
  readonly id: string;
  /** 事件类型 */
  readonly type: string;
  /** 事件时间戳 */
  readonly timestamp: number;
  /** 事件来源 */
  readonly source?: string;
  /** 事件版本 */
  readonly version?: number;
  /** 事件数据 */
  readonly data?: any;
  /** 事件元数据 */
  readonly metadata?: Record<string, any>;
}

// 领域事件接口
export interface IDomainEvent extends IEvent {
  /** 聚合根ID */
  readonly aggregateId: string;
  /** 聚合根类型 */
  readonly aggregateType: string;
  /** 事件版本 */
  readonly eventVersion: number;
}

// 集成事件接口
export interface IIntegrationEvent extends IEvent {
  /** 目标系统 */
  readonly targetSystem?: string;
  /** 关联ID */
  readonly correlationId?: string;
  /** 因果ID */
  readonly causationId?: string;
}

// 应用事件接口
export interface IApplicationEvent extends IEvent {
  /** 用户ID */
  readonly userId?: string;
  /** 会话ID */
  readonly sessionId?: string;
  /** 请求ID */
  readonly requestId?: string;
}

// 事件处理器接口
export interface IEventHandler<T extends IEvent = IEvent> {
  /** 处理器名称 */
  readonly name: string;
  /** 处理的事件类型 */
  readonly eventType: string;
  /** 处理器优先级 */
  readonly priority?: number;
  /** 是否异步处理 */
  readonly async?: boolean;
  /** 重试配置 */
  readonly retryConfig?: RetryConfig;
  /** 处理事件 */
  handle(event: T): Promise<void> | void;
}

// 重试配置接口
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  delay: number;
  /** 指数退避 */
  exponentialBackoff?: boolean;
  /** 最大延迟 */
  maxDelay?: number;
  /** 重试条件 */
  retryCondition?: (error: Error) => boolean;
}

// 事件中间件接口
export interface IEventMiddleware<T extends IEvent = IEvent> {
  /** 中间件名称 */
  readonly name: string;
  /** 中间件优先级 */
  readonly priority?: number;
  /** 处理事件 */
  process(event: T, next: () => Promise<void>): Promise<void>;
}

// 事件总线接口
export interface IEventBus {
  /** 发布事件 */
  publish<T extends IEvent>(event: T): Promise<void>;
  /** 发布多个事件 */
  publishBatch<T extends IEvent>(events: T[]): Promise<void>;
  /** 订阅事件 */
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): () => void;
  /** 取消订阅 */
  unsubscribe(eventType: string, handler: IEventHandler): void;
  /** 添加中间件 */
  use<T extends IEvent>(middleware: IEventMiddleware<T>): void;
  /** 移除中间件 */
  removeMiddleware(name: string): void;
  /** 获取订阅者数量 */
  getSubscriberCount(eventType: string): number;
  /** 清空所有订阅 */
  clear(): void;
  /** 销毁事件总线 */
  dispose(): void;
}

// 事件存储接口
export interface IEventStore {
  /** 保存事件 */
  save(event: IEvent): Promise<void>;
  /** 保存多个事件 */
  saveBatch(events: IEvent[]): Promise<void>;
  /** 获取事件 */
  get(eventId: string): Promise<IEvent | null>;
  /** 获取聚合根事件 */
  getAggregateEvents(
    aggregateId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<IEvent[]>;
  /** 获取事件流 */
  getEventStream(
    eventType?: string,
    fromTimestamp?: number,
    toTimestamp?: number,
    limit?: number
  ): Promise<IEvent[]>;
  /** 删除事件 */
  remove(eventId: string): Promise<boolean>;
  /** 清空事件存储 */
  clear(): Promise<void>;
}

// 事件调度器接口
export interface IEventDispatcher {
  /** 调度事件 */
  dispatch<T extends IEvent>(event: T): Promise<void>;
  /** 调度多个事件 */
  dispatchBatch<T extends IEvent>(events: T[]): Promise<void>;
  /** 延迟调度事件 */
  schedule<T extends IEvent>(event: T, delay: number): Promise<void>;
  /** 取消调度事件 */
  cancel(eventId: string): Promise<boolean>;
  /** 获取待调度事件数量 */
  getPendingCount(): number;
  /** 启动调度器 */
  start(): void;
  /** 停止调度器 */
  stop(): void;
}

// 事件监听器接口
export interface IEventListener {
  /** 监听器名称 */
  readonly name: string;
  /** 监听的事件类型 */
  readonly eventTypes: string[];
  /** 是否启用 */
  readonly enabled?: boolean;
  /** 处理事件 */
  onEvent<T extends IEvent>(event: T): Promise<void> | void;
}

// 事件投影接口
export interface IEventProjection {
  /** 投影名称 */
  readonly name: string;
  /** 监听的事件类型 */
  readonly eventTypes: string[];
  /** 投影版本 */
  readonly version: number;
  /** 处理事件 */
  project(event: IEvent): Promise<void>;
  /** 重置投影 */
  reset(): Promise<void>;
  /** 获取投影状态 */
  getState(): any;
}

// 事件快照接口
export interface IEventSnapshot {
  /** 快照ID */
  readonly id: string;
  /** 聚合根ID */
  readonly aggregateId: string;
  /** 聚合根类型 */
  readonly aggregateType: string;
  /** 快照版本 */
  readonly version: number;
  /** 快照数据 */
  readonly data: any;
  /** 快照时间戳 */
  readonly timestamp: number;
  /** 快照元数据 */
  readonly metadata?: Record<string, any>;
}

// 事件快照存储接口
export interface IEventSnapshotStore {
  /** 保存快照 */
  save(snapshot: IEventSnapshot): Promise<void>;
  /** 获取快照 */
  get(aggregateId: string, version?: number): Promise<IEventSnapshot | null>;
  /** 获取最新快照 */
  getLatest(aggregateId: string): Promise<IEventSnapshot | null>;
  /** 删除快照 */
  remove(aggregateId: string, version?: number): Promise<boolean>;
  /** 清空快照 */
  clear(): Promise<void>;
}

// 事件序列化器接口
export interface IEventSerializer {
  /** 序列化事件 */
  serialize(event: IEvent): string;
  /** 反序列化事件 */
  deserialize(data: string): IEvent;
  /** 序列化事件数据 */
  serializeEventData(data: any): any;
  /** 反序列化事件数据 */
  deserializeEventData(data: any, eventType: string): any;
}

// 事件验证器接口
export interface IEventValidator {
  /** 验证事件 */
  validate(event: IEvent): ValidationResult;
  /** 验证事件数据 */
  validateEventData(data: any, eventType: string): ValidationResult;
}

// 验证结果接口
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
}

// 验证错误接口
export interface ValidationError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误路径 */
  path?: string;
  /** 错误值 */
  value?: any;
}

// 验证警告接口
export interface ValidationWarning {
  /** 警告代码 */
  code: string;
  /** 警告消息 */
  message: string;
  /** 警告路径 */
  path?: string;
  /** 警告值 */
  value?: any;
}

// 事件总线配置接口
export interface IEventBusConfig {
  /** 最大并发处理数 */
  maxConcurrency?: number;
  /** 是否启用事件存储 */
  enableEventStore?: boolean;
  /** 是否启用快照 */
  enableSnapshots?: boolean;
  /** 快照间隔 */
  snapshotInterval?: number;
  /** 是否启用事件验证 */
  enableValidation?: boolean;
  /** 是否启用中间件 */
  enableMiddleware?: boolean;
  /** 中间件执行顺序 */
  middlewareOrder?: 'sequential' | 'parallel';
  /** 默认重试配置 */
  defaultRetryConfig?: RetryConfig;
  /** 事件过期时间（毫秒） */
  eventExpiration?: number;
  /** 是否启用事件压缩 */
  enableCompression?: boolean;
  /** 事件序列化器 */
  serializer?: IEventSerializer;
  /** 事件验证器 */
  validator?: IEventValidator;
}

// 事件统计接口
export interface IEventStatistics {
  /** 总事件数 */
  totalEvents: number;
  /** 成功处理数 */
  successfulEvents: number;
  /** 失败处理数 */
  failedEvents: number;
  /** 待处理事件数 */
  pendingEvents: number;
  /** 事件类型统计 */
  eventTypeStats: Record<string, number>;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 最后处理时间 */
  lastProcessedAt?: number;
}

// 事件过滤器接口
export interface IEventFilter {
  /** 过滤器名称 */
  readonly name: string;
  /** 匹配事件 */
  matches(event: IEvent): boolean;
}

// 事件路由器接口
export interface IEventRouter {
  /** 路由事件 */
  route(event: IEvent): string[];
  /** 添加路由规则 */
  addRule(pattern: string | RegExp | IEventFilter, target: string): void;
  /** 移除路由规则 */
  removeRule(target: string): void;
  /** 获取路由目标 */
  getRoutes(event: IEvent): string[];
}

// 事件通道接口
export interface IEventChannel {
  /** 通道名称 */
  readonly name: string;
  /** 发布事件 */
  publish<T extends IEvent>(event: T): Promise<void>;
  /** 订阅事件 */
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): () => void;
  /** 取消订阅 */
  unsubscribe(eventType: string, handler: IEventHandler): void;
  /** 获取订阅者数量 */
  getSubscriberCount(eventType: string): number;
  /** 关闭通道 */
  close(): void;
}