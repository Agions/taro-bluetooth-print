/**
 * 事件总线实现
 */

import {
  IEventBus,
  IEvent,
  IEventHandler,
  IEventMiddleware,
  IEventBusConfig
} from './types';

/**
 * 事件总线实现类
 */
export class EventBus implements IEventBus {
  /** 事件处理器注册表 */
  private readonly handlers: Map<string, Set<IEventHandler>> = new Map();

  /** 中间件列表 */
  private readonly middlewares: IEventMiddleware[] = [];

  /** 事件总线配置 */
  private readonly config: Required<IEventBusConfig>;

  /** 是否已销毁 */
  private isDisposed: boolean = false;

  /** 处理统计 */
  private stats: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    averageProcessingTime: number;
    lastProcessedAt?: number;
  } = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0
  };

  constructor(config: IEventBusConfig = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency || 100,
      enableEventStore: config.enableEventStore || false,
      enableSnapshots: config.enableSnapshots || false,
      snapshotInterval: config.snapshotInterval || 100,
      enableValidation: config.enableValidation !== false,
      enableMiddleware: config.enableMiddleware !== false,
      middlewareOrder: config.middlewareOrder || 'sequential',
      defaultRetryConfig: config.defaultRetryConfig || {
        maxRetries: 3,
        delay: 1000,
        exponentialBackoff: true,
        maxDelay: 30000
      },
      eventExpiration: config.eventExpiration || 3600000, // 1小时
      enableCompression: config.enableCompression || false,
      serializer: config.serializer,
      validator: config.validator
    };
  }

  /**
   * 发布事件
   */
  public async publish<T extends IEvent>(event: T): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot publish events to disposed event bus');
    }

    const startTime = Date.now();

    try {
      // 验证事件
      if (this.config.enableValidation && this.config.validator) {
        const validation = this.config.validator.validate(event);
        if (!validation.isValid) {
          throw new Error(`Event validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // 检查事件是否过期
      if (this.config.eventExpiration && event.isExpired(this.config.eventExpiration)) {
        console.warn(`Event ${event.id} has expired and will not be processed`);
        return;
      }

      // 获取事件处理器
      const handlers = this.getHandlersForEvent(event);

      if (handlers.length === 0) {
        console.warn(`No handlers registered for event type: ${event.type}`);
        return;
      }

      // 通过中间件处理事件
      if (this.config.enableMiddleware && this.middlewares.length > 0) {
        await this.processWithMiddleware(event, handlers);
      } else {
        await this.processEventWithHandlers(event, handlers);
      }

      // 更新统计
      this.stats.totalEvents++;
      this.stats.successfulEvents++;
      this.updateProcessingTime(Date.now() - startTime);
      this.stats.lastProcessedAt = Date.now();

    } catch (error) {
      // 更新统计
      this.stats.totalEvents++;
      this.stats.failedEvents++;
      this.updateProcessingTime(Date.now() - startTime);

      throw error;
    }
  }

  /**
   * 发布多个事件
   */
  public async publishBatch<T extends IEvent>(events: T[]): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot publish events to disposed event bus');
    }

    // 根据并发配置处理事件
    if (events.length <= this.config.maxConcurrency) {
      // 并发处理所有事件
      await Promise.all(events.map(event => this.publish(event)));
    } else {
      // 分批处理
      const batches = this.createBatches(events, this.config.maxConcurrency);
      for (const batch of batches) {
        await Promise.all(batch.map(event => this.publish(event)));
      }
    }
  }

  /**
   * 订阅事件
   */
  public subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): () => void {
    if (this.isDisposed) {
      throw new Error('Cannot subscribe to disposed event bus');
    }

    // 获取或创建事件类型的处理器集合
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlerSet = this.handlers.get(eventType)!;

    // 检查是否已经订阅
    if (handlerSet.has(handler)) {
      throw new Error(`Handler ${handler.name} is already subscribed to event type ${eventType}`);
    }

    // 添加处理器
    handlerSet.add(handler);

    // 按优先级排序处理器
    this.sortHandlers(handlerSet);

    // 返回取消订阅函数
    return () => {
      handlerSet.delete(handler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * 取消订阅
   */
  public unsubscribe(eventType: string, handler: IEventHandler): void {
    const handlerSet = this.handlers.get(eventType);
    if (handlerSet) {
      handlerSet.delete(handler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * 添加中间件
   */
  public use<T extends IEvent = IEvent>(middleware: IEventMiddleware<T>): void {
    if (this.isDisposed) {
      throw new Error('Cannot add middleware to disposed event bus');
    }

    // 检查中间件名称是否重复
    if (this.middlewares.some(m => m.name === middleware.name)) {
      throw new Error(`Middleware with name '${middleware.name}' already exists`);
    }

    this.middlewares.push(middleware);

    // 按优先级排序中间件
    this.middlewares.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * 移除中间件
   */
  public removeMiddleware(name: string): void {
    const index = this.middlewares.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
    }
  }

  /**
   * 获取订阅者数量
   */
  public getSubscriberCount(eventType: string): number {
    const handlerSet = this.handlers.get(eventType);
    return handlerSet ? handlerSet.size : 0;
  }

  /**
   * 获取所有事件类型
   */
  public getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取事件类型的处理器
   */
  public getHandlers(eventType: string): IEventHandler[] {
    const handlerSet = this.handlers.get(eventType);
    return handlerSet ? Array.from(handlerSet) : [];
  }

  /**
   * 清空所有订阅
   */
  public clear(): void {
    if (this.isDisposed) {
      return;
    }

    this.handlers.clear();
    this.middlewares.length = 0;

    // 重置统计
    this.stats = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * 销毁事件总线
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.clear();
    this.isDisposed = true;
  }

  /**
   * 获取事件总线统计信息
   */
  public getStats(): {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    successRate: number;
    averageProcessingTime: number;
    lastProcessedAt?: number;
    eventTypeCount: number;
    handlerCount: number;
    middlewareCount: number;
  } {
    let totalHandlerCount = 0;
    for (const handlerSet of this.handlers.values()) {
      totalHandlerCount += handlerSet.size;
    }

    return {
      ...this.stats,
      successRate: this.stats.totalEvents > 0
        ? (this.stats.successfulEvents / this.stats.totalEvents) * 100
        : 0,
      eventTypeCount: this.handlers.size,
      handlerCount: totalHandlerCount,
      middlewareCount: this.middlewares.length
    };
  }

  /**
   * 检查事件总线是否活跃
   */
  public get isActive(): boolean {
    return !this.isDisposed;
  }

  // 私有方法

  /**
   * 获取事件的处理器
   */
  private getHandlersForEvent<T extends IEvent>(event: T): IEventHandler<T>[] {
    const directHandlers = this.handlers.get(event.type) || new Set<IEventHandler<T>>();

    // 按优先级排序
    const sortedHandlers = Array.from(directHandlers).sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return sortedHandlers as IEventHandler<T>[];
  }

  /**
   * 通过中间件处理事件
   */
  private async processWithMiddleware<T extends IEvent>(
    event: T,
    handlers: IEventHandler<T>[]
  ): Promise<void> {
    if (this.config.middlewareOrder === 'sequential') {
      await this.processMiddlewareSequential(event, handlers);
    } else {
      await this.processMiddlewareParallel(event, handlers);
    }
  }

  /**
   * 顺序执行中间件
   */
  private async processMiddlewareSequential<T extends IEvent>(
    event: T,
    handlers: IEventHandler<T>[]
  ): Promise<void> {
    let middlewareIndex = 0;

    const next = async (): Promise<void> => {
      if (middlewareIndex < this.middlewares.length) {
        const middleware = this.middlewares[middlewareIndex++];
        await middleware.process(event, next);
      } else {
        // 所有中间件执行完毕，执行事件处理器
        await this.processEventWithHandlers(event, handlers);
      }
    };

    await next();
  }

  /**
   * 并行执行中间件
   */
  private async processMiddlewareParallel<T extends IEvent>(
    event: T,
    handlers: IEventHandler<T>[]
  ): Promise<void> {
    // 先执行所有中间件
    const middlewarePromises = this.middlewares.map(middleware => {
      return middleware.process(event, async () => {});
    });

    await Promise.all(middlewarePromises);

    // 然后执行事件处理器
    await this.processEventWithHandlers(event, handlers);
  }

  /**
   * 使用处理器处理事件
   */
  private async processEventWithHandlers<T extends IEvent>(
    event: T,
    handlers: IEventHandler<T>[]
  ): Promise<void> {
    const handlerPromises = handlers.map(handler => this.executeHandler(handler, event));
    await Promise.all(handlerPromises);
  }

  /**
   * 执行单个处理器
   */
  private async executeHandler<T extends IEvent>(
    handler: IEventHandler<T>,
    event: T
  ): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      console.error(`Error in event handler ${handler.name} for event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * 按优先级排序处理器
   */
  private sortHandlers(handlers: Set<IEventHandler>): void {
    const sortedArray = Array.from(handlers).sort((a, b) => (b.priority || 0) - (a.priority || 0));
    handlers.clear();
    sortedArray.forEach(handler => handlers.add(handler));
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 更新处理时间统计
   */
  private updateProcessingTime(processingTime: number): void {
    const totalEvents = this.stats.totalEvents;
    const currentAverage = this.stats.averageProcessingTime;

    // 计算新的平均值
    this.stats.averageProcessingTime = (currentAverage * (totalEvents - 1) + processingTime) / totalEvents;
  }
}

/**
 * 事件总线工厂
 */
export class EventBusFactory {
  /**
   * 创建默认事件总线
   */
  static createDefault(config?: IEventBusConfig): EventBus {
    return new EventBus(config);
  }

  /**
   * 创建高性能事件总线
   */
  static createHighPerformance(config?: IEventBusConfig): EventBus {
    return new EventBus({
      maxConcurrency: 1000,
      enableMiddleware: true,
      enableValidation: false,
      middlewareOrder: 'parallel',
      ...config
    });
  }

  /**
   * 创建开发模式事件总线
   */
  static createDevelopment(config?: IEventBusConfig): EventBus {
    return new EventBus({
      enableValidation: true,
      enableMiddleware: true,
      maxConcurrency: 10,
      ...config
    });
  }

  /**
   * 创建生产模式事件总线
   */
  static createProduction(config?: IEventBusConfig): EventBus {
    return new EventBus({
      maxConcurrency: 100,
      enableValidation: true,
      enableMiddleware: true,
      enableEventStore: true,
      eventExpiration: 3600000,
      defaultRetryConfig: {
        maxRetries: 5,
        delay: 2000,
        exponentialBackoff: true,
        maxDelay: 60000
      },
      ...config
    });
  }
}