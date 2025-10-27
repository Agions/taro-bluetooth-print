/**
 * 事件处理器实现
 */

import {
  IEventHandler,
  IEvent,
  RetryConfig
} from './types';

/**
 * 基础事件处理器抽象类
 */
export abstract class BaseEventHandler<T extends IEvent = IEvent> implements IEventHandler<T> {
  /** 处理器名称 */
  public readonly name: string;

  /** 处理的事件类型 */
  public readonly eventType: string;

  /** 处理器优先级 */
  public readonly priority: number;

  /** 是否异步处理 */
  public readonly async: boolean;

  /** 重试配置 */
  public readonly retryConfig?: RetryConfig;

  /** 处理统计 */
  protected stats: {
    handledCount: number;
    successCount: number;
    failureCount: number;
    totalProcessingTime: number;
    lastProcessedAt?: number;
  } = {
    handledCount: 0,
    successCount: 0,
    failureCount: 0,
    totalProcessingTime: 0
  };

  constructor(
    eventType: string,
    options: {
      name?: string;
      priority?: number;
      async?: boolean;
      retryConfig?: RetryConfig;
    } = {}
  ) {
    this.eventType = eventType;
    this.name = options.name || `${this.constructor.name}(${eventType})`;
    this.priority = options.priority || 0;
    this.async = options.async !== false;
    this.retryConfig = options.retryConfig;
  }

  /**
   * 处理事件（带统计和重试）
   */
  public async handle(event: T): Promise<void> {
    const startTime = Date.now();

    try {
      if (this.retryConfig) {
        await this.handleWithRetry(event);
      } else {
        await this.processEvent(event);
      }

      // 更新统计
      this.stats.handledCount++;
      this.stats.successCount++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      this.stats.lastProcessedAt = Date.now();

    } catch (error) {
      // 更新统计
      this.stats.handledCount++;
      this.stats.failureCount++;
      this.stats.totalProcessingTime += Date.now() - startTime;

      throw error;
    }
  }

  /**
   * 抽象方法：处理具体事件
   */
  protected abstract processEvent(event: T): Promise<void> | void;

  /**
   * 带重试的事件处理
   */
  private async handleWithRetry(event: T): Promise<void> {
    const retryConfig = this.retryConfig!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        await this.processEvent(event);
        return; // 成功处理，直接返回
      } catch (error) {
        lastError = error as Error;

        // 检查是否应该重试
        if (retryConfig.retryCondition && !retryConfig.retryCondition(lastError)) {
          throw lastError;
        }

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === retryConfig.maxRetries) {
          throw lastError;
        }

        // 计算延迟时间
        let delay = retryConfig.delay;
        if (retryConfig.exponentialBackoff) {
          delay = Math.min(delay * Math.pow(2, attempt), retryConfig.maxDelay || Infinity);
        }

        // 等待后重试
        await this.sleep(delay);
      }
    }

    // 如果所有重试都失败了，抛出最后一个错误
    throw lastError!;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查事件是否匹配
   */
  public canHandle(event: IEvent): boolean {
    return event.type === this.eventType;
  }

  /**
   * 获取处理器统计信息
   */
  public getStats(): {
    name: string;
    eventType: string;
    handledCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    averageProcessingTime: number;
    lastProcessedAt?: number;
  } {
    return {
      name: this.name,
      eventType: this.eventType,
      handledCount: this.stats.handledCount,
      successCount: this.stats.successCount,
      failureCount: this.stats.failureCount,
      successRate: this.stats.handledCount > 0
        ? (this.stats.successCount / this.stats.handledCount) * 100
        : 0,
      averageProcessingTime: this.stats.handledCount > 0
        ? this.stats.totalProcessingTime / this.stats.handledCount
        : 0,
      lastProcessedAt: this.stats.lastProcessedAt
    };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = {
      handledCount: 0,
      successCount: 0,
      failureCount: 0,
      totalProcessingTime: 0
    };
  }

  /**
   * 转换为字符串
   */
  public toString(): string {
    return `${this.name}(priority=${this.priority}, async=${this.async})`;
  }
}

/**
 * 同步事件处理器
 */
export abstract class SyncEventHandler<T extends IEvent = IEvent> extends BaseEventHandler<T> {
  constructor(eventType: string, options: {
    name?: string;
    priority?: number;
    retryConfig?: RetryConfig;
  } = {}) {
    super(eventType, {
      ...options,
      async: false
    });
  }

  /**
   * 处理事件（同步）
   */
  public handle(event: T): void {
    const startTime = Date.now();

    try {
      if (this.retryConfig) {
        this.handleWithRetrySync(event);
      } else {
        this.processEvent(event);
      }

      // 更新统计
      this.stats.handledCount++;
      this.stats.successCount++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      this.stats.lastProcessedAt = Date.now();

    } catch (error) {
      // 更新统计
      this.stats.handledCount++;
      this.stats.failureCount++;
      this.stats.totalProcessingTime += Date.now() - startTime;

      throw error;
    }
  }

  /**
   * 抽象方法：同步处理事件
   */
  protected abstract processEvent(event: T): void;

  /**
   * 带重试的同步事件处理
   */
  private handleWithRetrySync(event: T): void {
    const retryConfig = this.retryConfig!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        this.processEvent(event);
        return; // 成功处理，直接返回
      } catch (error) {
        lastError = error as Error;

        // 检查是否应该重试
        if (retryConfig.retryCondition && !retryConfig.retryCondition(lastError)) {
          throw lastError;
        }

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === retryConfig.maxRetries) {
          throw lastError;
        }

        // 计算延迟时间
        let delay = retryConfig.delay;
        if (retryConfig.exponentialBackoff) {
          delay = Math.min(delay * Math.pow(2, attempt), retryConfig.maxDelay || Infinity);
        }

        // 同步等待（使用阻塞方式）
        const start = Date.now();
        while (Date.now() - start < delay) {
          // 空循环等待
        }
      }
    }

    // 如果所有重试都失败了，抛出最后一个错误
    throw lastError!;
  }
}

/**
 * 异步事件处理器
 */
export abstract class AsyncEventHandler<T extends IEvent = IEvent> extends BaseEventHandler<T> {
  constructor(eventType: string, options: {
    name?: string;
    priority?: number;
    retryConfig?: RetryConfig;
  } = {}) {
    super(eventType, {
      ...options,
      async: true
    });
  }
}

/**
 * 函数式事件处理器
 */
export class FunctionEventHandler<T extends IEvent = IEvent> extends BaseEventHandler<T> {
  private handlerFunction: (event: T) => Promise<void> | void;

  constructor(
    eventType: string,
    handlerFunction: (event: T) => Promise<void> | void,
    options: {
      name?: string;
      priority?: number;
      async?: boolean;
      retryConfig?: RetryConfig;
    } = {}
  ) {
    super(eventType, options);
    this.handlerFunction = handlerFunction;
  }

  protected async processEvent(event: T): Promise<void> {
    return await this.handlerFunction(event);
  }
}

/**
 * 批量事件处理器
 */
export abstract class BatchEventHandler<T extends IEvent = IEvent> extends BaseEventHandler<T> {
  /** 批量大小 */
  protected readonly batchSize: number;

  /** 批量超时时间（毫秒） */
  protected readonly batchTimeout: number;

  /** 事件缓冲区 */
  private eventBuffer: T[] = [];

  /** 批量处理定时器 */
  private batchTimer?: NodeJS.Timeout;

  constructor(
    eventType: string,
    options: {
      name?: string;
      priority?: number;
      batchSize?: number;
      batchTimeout?: number;
      retryConfig?: RetryConfig;
    } = {}
  ) {
    super(eventType, options);
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 1000;
  }

  /**
   * 处理事件（添加到批量缓冲区）
   */
  public async handle(event: T): Promise<void> {
    this.eventBuffer.push(event);

    // 如果达到批量大小，立即处理
    if (this.eventBuffer.length >= this.batchSize) {
      await this.processBatch();
      return;
    }

    // 如果还没有设置定时器，设置一个
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchTimeout);
    }
  }

  /**
   * 处理批量事件
   */
  private async processBatch(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    // 清除定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // 获取当前批量事件
    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // 调用具体的批量处理方法
      await this.processBatchEvents(events);

      // 更新统计
      this.stats.handledCount += events.length;
      this.stats.successCount += events.length;
      this.stats.lastProcessedAt = Date.now();

    } catch (error) {
      // 更新统计
      this.stats.handledCount += events.length;
      this.stats.failureCount += events.length;

      throw error;
    }
  }

  /**
   * 抽象方法：处理批量事件
   */
  protected abstract processBatchEvents(events: T[]): Promise<void> | void;

  /**
   * 强制处理当前批量（用于清理）
   */
  public async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    await this.processBatch();
  }

  /**
   * 销毁处理器
   */
  public dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    this.eventBuffer = [];
  }
}

/**
 * 条件事件处理器
 */
export abstract class ConditionalEventHandler<T extends IEvent = IEvent> extends BaseEventHandler<T> {
  constructor(
    eventType: string,
    protected condition: (event: T) => boolean,
    options: {
      name?: string;
      priority?: number;
      async?: boolean;
      retryConfig?: RetryConfig;
    } = {}
  ) {
    super(eventType, options);
  }

  /**
   * 检查是否应该处理事件
   */
  public shouldHandle(event: T): boolean {
    return this.canHandle(event) && this.condition(event);
  }

  /**
   * 条件处理事件
   */
  public async handle(event: T): Promise<void> {
    if (this.shouldHandle(event)) {
      await super.handle(event);
    }
  }
}