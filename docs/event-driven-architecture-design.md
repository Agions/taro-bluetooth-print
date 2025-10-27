# 事件驱动架构和消息总线设计

## 设计目标

1. **松耦合通信**：模块间通过事件进行通信，减少直接依赖
2. **异步处理**：支持异步事件处理，提高系统响应性
3. **事件溯源**：记录所有事件，支持系统状态回溯
4. **可扩展性**：支持动态事件订阅和处理
5. **错误隔离**：单个处理器错误不影响其他处理器

## 核心概念

### 事件系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Gateway                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Event Router  │  │ Event Publisher │  │Event Store  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Message Bus                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Sync Channel  │  │  Async Channel  │  │Dead Letter   │ │
│  │                 │  │                 │  │  Queue       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                  Event Handlers                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Bluetooth       │  │ Printer         │  │   System     │ │
│  │ Handlers        │  │ Handlers        │  │  Handlers    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 核心接口定义

### 事件基础接口

```typescript
/**
 * 基础事件接口
 */
export interface IEvent<T = unknown> {
  /** 事件唯一标识 */
  readonly id: string;
  /** 事件类型 */
  readonly type: string;
  /** 事件数据 */
  readonly data: T;
  /** 事件时间戳 */
  readonly timestamp: number;
  /** 事件版本 */
  readonly version: string;
  /** 事件来源 */
  readonly source: string;
  /** 事件关联ID（用于事件追踪） */
  readonly correlationId?: string;
  /** 事件因果链ID（用于事件溯源） */
  readonly causationId?: string;
  /** 事件元数据 */
  readonly metadata?: Record<string, unknown>;
}

/**
 * 领域事件接口
 */
export interface IDomainEvent<T = unknown> extends IEvent<T> {
  /** 聚合根ID */
  readonly aggregateId: string;
  /** 聚合根类型 */
  readonly aggregateType: string;
}

/**
 * 集成事件接口
 */
export interface IIntegrationEvent<T = unknown> extends IEvent<T> {
  /** 目标系统 */
  readonly targetSystem?: string;
}

/**
 * 应用事件接口
 */
export interface IApplicationEvent<T = unknown> extends IEvent<T> {
  /** 用户ID */
  readonly userId?: string;
  /** 会话ID */
  readonly sessionId?: string;
}
```

### 事件处理器接口

```typescript
/**
 * 事件处理器接口
 */
export interface IEventHandler<TEvent extends IEvent = IEvent> {
  /**
   * 处理事件
   * @param event 事件实例
   * @returns 处理结果
   */
  handle(event: TEvent): Promise<void> | void;

  /**
   * 获取处理器支持的事件类型
   */
  getEventType(): string;

  /**
   * 获取处理器优先级
   */
  getPriority(): number;

  /**
   * 检查是否可以处理指定事件
   * @param event 事件实例
   */
  canHandle(event: IEvent): boolean;
}

/**
 * 异步事件处理器接口
 */
export interface IAsyncEventHandler<TEvent extends IEvent = IEvent> extends IEventHandler<TEvent> {
  /**
   * 异步处理事件
   * @param event 事件实例
   * @returns 处理结果
   */
  handleAsync(event: TEvent): Promise<void>;
}

/**
 * 事件处理器工厂接口
 */
export interface IEventHandlerFactory {
  /**
   * 创建事件处理器
   * @param eventType 事件类型
   */
  createHandler(eventType: string): IEventHandler | null;

  /**
   * 获取支持的事件类型列表
   */
  getSupportedEventTypes(): string[];
}
```

### 事件总线接口

```typescript
/**
 * 事件总线接口
 */
export interface IEventBus {
  /**
   * 发布事件
   * @param event 事件实例
   */
  publish<TEvent extends IEvent>(event: TEvent): Promise<void>;

  /**
   * 同步发布事件
   * @param event 事件实例
   */
  publishSync<TEvent extends IEvent>(event: TEvent): void;

  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @returns 取消订阅函数
   */
  subscribe<TEvent extends IEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>
  ): () => void;

  /**
   * 订阅事件（带过滤器）
   * @param eventType 事件类型
   * @param handler 事件处理器
   * @param filter 事件过滤器
   * @returns 取消订阅函数
   */
  subscribeWithFilter<TEvent extends IEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>,
    filter: (event: TEvent) => boolean
  ): () => void;

  /**
   * 取消订阅
   * @param eventType 事件类型
   * @param handler 事件处理器
   */
  unsubscribe(eventType: string, handler: IEventHandler): void;

  /**
   * 获取事件处理器数量
   * @param eventType 事件类型
   */
  getHandlerCount(eventType: string): number;

  /**
   * 清空所有订阅
   */
  clear(): void;

  /**
   * 释放资源
   */
  dispose(): void;
}

/**
 * 事件存储接口
 */
export interface IEventStore {
  /**
   * 保存事件
   * @param event 事件实例
   */
  save(event: IEvent): Promise<void>;

  /**
   * 获取事件流
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本
   */
  getEvents(aggregateId: string, fromVersion?: number): Promise<IEvent[]>;

  /**
   * 获取事件
   * @param eventId 事件ID
   */
  getEvent(eventId: string): Promise<IEvent | null>;

  /**
   * 按时间范围获取事件
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  getEventsByTimeRange(startTime: number, endTime: number): Promise<IEvent[]>;

  /**
   * 按事件类型获取事件
   * @param eventType 事件类型
   * @param limit 限制数量
   */
  getEventsByType(eventType: string, limit?: number): Promise<IEvent[]>;
}
```

## 核心实现

### 事件基类实现

```typescript
/**
 * 事件基类
 */
export abstract class BaseEvent<T = unknown> implements IEvent<T> {
  public readonly id: string;
  public readonly type: string;
  public readonly data: T;
  public readonly timestamp: number;
  public readonly version: string;
  public readonly source: string;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(data: T, options: EventOptions = {}) {
    this.id = options.id || this.generateId();
    this.type = this.getEventType();
    this.data = data;
    this.timestamp = options.timestamp || Date.now();
    this.version = options.version || '1.0.0';
    this.source = options.source || 'Unknown';
    this.correlationId = options.correlationId;
    this.causationId = options.causationId;
    this.metadata = options.metadata;
  }

  protected abstract getEventType(): string;

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 事件选项
 */
export interface EventOptions {
  id?: string;
  timestamp?: number;
  version?: string;
  source?: string;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 领域事件基类
 */
export abstract class DomainEvent<T = unknown> extends BaseEvent<T> implements IDomainEvent<T> {
  public readonly aggregateId: string;
  public readonly aggregateType: string;

  constructor(
    data: T,
    aggregateId: string,
    aggregateType: string,
    options: EventOptions = {}
  ) {
    super(data, options);
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
  }
}

/**
 * 集成事件基类
 */
export abstract class IntegrationEvent<T = unknown> extends BaseEvent<T> implements IIntegrationEvent<T> {
  public readonly targetSystem?: string;

  constructor(data: T, options: IntegrationEventOptions = {}) {
    super(data, options);
    this.targetSystem = options.targetSystem;
  }
}

/**
 * 集成事件选项
 */
export interface IntegrationEventOptions extends EventOptions {
  targetSystem?: string;
}
```

### 具体事件定义

```typescript
/**
 * 蓝牙相关事件
 */
export namespace BluetoothEvents {
  /** 蓝牙适配器已初始化 */
  export class AdapterInitialized extends DomainEvent<{ platform: string }> {
    protected getEventType(): string {
      return 'bluetooth.adapter.initialized';
    }
  }

  /** 设备发现开始 */
  export class DeviceDiscoveryStarted extends DomainEvent<{ timeout: number }> {
    protected getEventType(): string {
      return 'bluetooth.discovery.started';
    }
  }

  /** 设备发现完成 */
  export class DeviceDiscoveryCompleted extends DomainEvent<{ devices: BluetoothDevice[] }> {
    protected getEventType(): string {
      return 'bluetooth.discovery.completed';
    }
  }

  /** 设备连接成功 */
  export class DeviceConnected extends DomainEvent<{ deviceId: string; deviceName: string }> {
    protected getEventType(): string {
      return 'bluetooth.device.connected';
    }
  }

  /** 设备断开连接 */
  export class DeviceDisconnected extends DomainEvent<{ deviceId: string }> {
    protected getEventType(): string {
      return 'bluetooth.device.disconnected';
    }
  }

  /** 连接失败 */
  export class ConnectionFailed extends DomainEvent<{ deviceId: string; error: string }> {
    protected getEventType(): string {
      return 'bluetooth.connection.failed';
    }
  }
}

/**
 * 打印机相关事件
 */
export namespace PrinterEvents {
  /** 打印机已准备 */
  export class PrinterReady extends DomainEvent<{ deviceId: string }> {
    protected getEventType(): string {
      return 'printer.ready';
    }
  }

  /** 打印开始 */
  export class PrintStarted extends DomainEvent<{ jobId: string; content: string }> {
    protected getEventType(): string {
      return 'printer.print.started';
    }
  }

  /** 打印进度更新 */
  export class PrintProgressUpdated extends DomainEvent<{ jobId: string; progress: number }> {
    protected getEventType(): string {
      return 'printer.print.progress.updated';
    }
  }

  /** 打印完成 */
  export class PrintCompleted extends DomainEvent<{ jobId: string; success: boolean }> {
    protected getEventType(): string {
      return 'printer.print.completed';
    }
  }

  /** 打印失败 */
  export class PrintFailed extends DomainEvent<{ jobId: string; error: string }> {
    protected getEventType(): string {
      return 'printer.print.failed';
    }
  }

  /** 缺纸 */
  export class OutOfPaper extends DomainEvent<{ deviceId: string }> {
    protected getEventType(): string {
      return 'printer.out.of.paper';
    }
  }
}

/**
 * 系统相关事件
 */
export namespace SystemEvents {
  /** 配置已更新 */
  export class ConfigurationUpdated extends ApplicationEvent<{ key: string; value: unknown }> {
    protected getEventType(): string {
      return 'system.configuration.updated';
    }
  }

  /** 错误发生 */
  export class ErrorOccurred extends ApplicationEvent<{ error: Error; context?: Record<string, unknown> }> {
    protected getEventType(): string {
      return 'system.error.occurred';
    }
  }

  /** 性能警告 */
  export class PerformanceWarning extends ApplicationEvent<{ metric: string; value: number; threshold: number }> {
    protected getEventType(): string {
      return 'system.performance.warning';
    }
  }
}
```

### 事件总线实现

```typescript
/**
 * 事件总线实现
 */
export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<IEventHandler>>();
  private asyncHandlers = new Map<string, Set<IAsyncEventHandler>>();
  private disposed = false;
  private eventStore?: IEventStore;

  constructor(eventStore?: IEventStore) {
    this.eventStore = eventStore;
  }

  async publish<TEvent extends IEvent>(event: TEvent): Promise<void> {
    this.throwIfDisposed();

    try {
      // 保存事件到事件存储
      if (this.eventStore) {
        await this.eventStore.save(event);
      }

      // 同步处理
      this.publishSync(event);

      // 异步处理
      await this.publishAsync(event);
    } catch (error) {
      console.error(`Error publishing event ${event.type}:`, error);
      throw error;
    }
  }

  publishSync<TEvent extends IEvent>(event: TEvent): void {
    this.throwIfDisposed();

    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // 按优先级排序
    const sortedHandlers = Array.from(handlers).sort((a, b) => b.getPriority() - a.getPriority());

    for (const handler of sortedHandlers) {
      if (handler.canHandle(event)) {
        try {
          handler.handle(event);
        } catch (error) {
          console.error(`Error in sync handler for event ${event.type}:`, error);
          // 继续处理其他处理器，不传播错误
        }
      }
    }
  }

  private async publishAsync<TEvent extends IEvent>(event: TEvent): Promise<void> {
    const asyncHandlers = this.asyncHandlers.get(event.type);
    if (!asyncHandlers || asyncHandlers.size === 0) {
      return;
    }

    // 按优先级排序
    const sortedHandlers = Array.from(asyncHandlers).sort((a, b) => b.getPriority() - a.getPriority());

    const promises = sortedHandlers.map(async (handler) => {
      if (handler.canHandle(event)) {
        try {
          await handler.handleAsync(event);
        } catch (error) {
          console.error(`Error in async handler for event ${event.type}:`, error);
          // 不传播错误，记录日志即可
        }
      }
    });

    // 等待所有异步处理器完成（不抛出错误）
    await Promise.allSettled(promises);
  }

  subscribe<TEvent extends IEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>
  ): () => void {
    this.throwIfDisposed();

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // 返回取消订阅函数
    return () => this.unsubscribe(eventType, handler);
  }

  subscribeWithFilter<TEvent extends IEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>,
    filter: (event: TEvent) => boolean
  ): () => void {
    const filteredHandler = {
      ...handler,
      canHandle: (event: IEvent) => handler.canHandle(event) && filter(event as TEvent)
    };

    return this.subscribe(eventType, filteredHandler);
  }

  subscribeAsync<TEvent extends IEvent>(
    eventType: string,
    handler: IAsyncEventHandler<TEvent>
  ): () => void {
    this.throwIfDisposed();

    if (!this.asyncHandlers.has(eventType)) {
      this.asyncHandlers.set(eventType, new Set());
    }

    this.asyncHandlers.get(eventType)!.add(handler);

    return () => this.unsubscribeAsync(eventType, handler);
  }

  unsubscribe(eventType: string, handler: IEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  private unsubscribeAsync(eventType: string, handler: IAsyncEventHandler): void {
    const handlers = this.asyncHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.asyncHandlers.delete(eventType);
      }
    }
  }

  getHandlerCount(eventType: string): number {
    const syncCount = this.handlers.get(eventType)?.size || 0;
    const asyncCount = this.asyncHandlers.get(eventType)?.size || 0;
    return syncCount + asyncCount;
  }

  clear(): void {
    this.throwIfDisposed();
    this.handlers.clear();
    this.asyncHandlers.clear();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.clear();
    this.disposed = true;
  }

  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new Error('EventBus has been disposed');
    }
  }
}
```

### 事件处理器实现

```typescript
/**
 * 抽象事件处理器
 */
export abstract class AbstractEventHandler<TEvent extends IEvent> implements IEventHandler<TEvent> {
  abstract getEventType(): string;
  abstract getPriority(): number;

  canHandle(event: IEvent): boolean {
    return event.type === this.getEventType();
  }

  abstract handle(event: TEvent): Promise<void> | void;
}

/**
 * 异步事件处理器基类
 */
export abstract class AsyncEventHandler<TEvent extends IEvent> extends AbstractEventHandler<TEvent> implements IAsyncEventHandler<TEvent> {
  abstract handleAsync(event: TEvent): Promise<void>;

  async handle(event: TEvent): Promise<void> {
    return this.handleAsync(event);
  }
}

/**
 * 蓝牙事件处理器示例
 */
export class BluetoothDeviceConnectedHandler extends AsyncEventHandler<BluetoothEvents.DeviceConnected> {
  constructor(private deviceManager: IDeviceManager) {
    super();
  }

  getEventType(): string {
    return 'bluetooth.device.connected';
  }

  getPriority(): number {
    return 100; // 高优先级
  }

  async handleAsync(event: BluetoothEvents.DeviceConnected): Promise<void> {
    console.log(`Device connected: ${event.data.deviceName} (${event.data.deviceId})`);

    // 更新设备管理器状态
    await this.deviceManager.updateDeviceStatus(event.data.deviceId, 'connected');

    // 触发后续操作，如开始服务发现
    await this.deviceManager.discoverServices(event.data.deviceId);
  }
}

/**
 * 打印机事件处理器示例
 */
export class PrintProgressHandler extends AsyncEventHandler<PrinterEvents.PrintProgressUpdated> {
  constructor(private progressTracker: IProgressTracker) {
    super();
  }

  getEventType(): string {
    return 'printer.print.progress.updated';
  }

  getPriority(): number {
    return 50; // 中等优先级
  }

  async handleAsync(event: PrinterEvents.PrintProgressUpdated): Promise<void> {
    const { jobId, progress } = event.data;

    // 更新进度跟踪器
    await this.progressTracker.updateProgress(jobId, progress);

    // 如果进度达到100%，触发完成事件
    if (progress >= 100) {
      await this.progressTracker.completeJob(jobId);
    }
  }
}
```

## 使用示例

### 基本使用

```typescript
// 创建事件总线
const eventBus = new EventBus();

// 创建事件处理器
const deviceConnectedHandler = new BluetoothDeviceConnectedHandler(deviceManager);
const printProgressHandler = new PrintProgressHandler(progressTracker);

// 订阅事件
eventBus.subscribeAsync('bluetooth.device.connected', deviceConnectedHandler);
eventBus.subscribeAsync('printer.print.progress.updated', printProgressHandler);

// 发布事件
const connectedEvent = new BluetoothEvents.DeviceConnected(
  { deviceId: 'device123', deviceName: 'Printer-001' },
  'device123',
  'bluetooth-adapter',
  { source: 'BluetoothService' }
);

await eventBus.publish(connectedEvent);
```

### 复杂事件流

```typescript
class PrintOrderProcessor {
  constructor(private eventBus: IEventBus) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // 处理打印订单
    this.eventBus.subscribeAsync('print.order.received', {
      getEventType: () => 'print.order.received',
      getPriority: () => 200,
      canHandle: (event) => event.type === 'print.order.received',
      handleAsync: async (event) => {
        await this.processPrintOrder(event.data);
      }
    });

    // 处理打印完成
    this.eventBus.subscribeAsync('printer.print.completed', {
      getEventType: () => 'printer.print.completed',
      getPriority: () => 100,
      canHandle: (event) => event.type === 'printer.print.completed',
      handleAsync: async (event) => {
        await this.handlePrintCompleted(event);
      }
    });
  }

  async processPrintOrder(order: PrintOrder): Promise<void> {
    try {
      // 发布打印开始事件
      await this.eventBus.publish(new PrinterEvents.PrintStarted(
        { jobId: order.id, content: order.content },
        order.printerId,
        'printer'
      ));

      // 执行打印逻辑...

    } catch (error) {
      // 发布打印失败事件
      await this.eventBus.publish(new PrinterEvents.PrintFailed(
        { jobId: order.id, error: error.message },
        order.printerId,
        'printer'
      ));
    }
  }

  async handlePrintCompleted(event: PrinterEvents.PrintCompleted): Promise<void> {
    const { jobId, success } = event.data;

    if (success) {
      // 更新订单状态
      await this.updateOrderStatus(jobId, 'completed');

      // 发送通知
      await this.sendNotification(jobId, '打印完成');
    }
  }
}
```

这个事件驱动架构设计提供了：

1. **完整的事件系统**：支持领域事件、集成事件和应用事件
2. **灵活的处理器机制**：支持同步和异步处理器
3. **事件溯源支持**：通过事件存储记录所有事件
4. **错误隔离**：单个处理器错误不影响其他处理器
5. **高性能**：支持事件优先级和并发处理

这为系统的模块间通信提供了松耦合、可扩展的解决方案。