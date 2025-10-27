/**
 * 事件总线测试
 */

import {
  EventBus,
  BaseEvent,
  BaseEventHandler,
  AsyncEventHandler,
  FunctionEventHandler,
  IEvent,
  IEventHandler,
  LoggingMiddleware,
  MetricsMiddleware
} from '../index';

// 测试事件类
class TestEvent extends BaseEvent {
  constructor(data: any, options?: any) {
    super('TestEvent', data, options);
  }
}

class DomainTestEvent extends BaseEvent {
  constructor(data: any, options?: any) {
    super('DomainTestEvent', data, options);
  }
}

// 测试处理器类
class TestEventHandler extends BaseEventHandler<TestEvent> {
  public handledEvents: TestEvent[] = [];

  constructor(eventType: string = 'TestEvent') {
    super(eventType);
  }

  protected async processEvent(event: TestEvent): Promise<void> {
    this.handledEvents.push(event);
  }
}

class AsyncTestEventHandler extends AsyncEventHandler<TestEvent> {
  public handledEvents: TestEvent[] = [];
  public processingDelay: number = 0;

  constructor(eventType: string = 'TestEvent', delay: number = 0) {
    super(eventType);
    this.processingDelay = delay;
  }

  protected async processEvent(event: TestEvent): Promise<void> {
    if (this.processingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.processingDelay));
    }
    this.handledEvents.push(event);
  }
}

class FailingEventHandler extends BaseEventHandler<TestEvent> {
  public shouldFail: boolean = true;
  public failureCount: number = 0;

  constructor(eventType: string = 'TestEvent') {
    super(eventType, {
      retryConfig: {
        maxRetries: 2,
        delay: 10
      }
    });
  }

  protected async processEvent(event: TestEvent): Promise<void> {
    this.failureCount++;
    if (this.shouldFail) {
      throw new Error('Handler failed intentionally');
    }
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus({
      enableMiddleware: false,
      enableValidation: false
    });
  });

  afterEach(() => {
    eventBus.dispose();
  });

  describe('基本功能', () => {
    it('应该能够发布和订阅事件', async () => {
      const handler = new TestEventHandler();
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent({ message: 'Hello, World!' });
      await eventBus.publish(event);

      expect(handler.handledEvents).toHaveLength(1);
      expect(handler.handledEvents[0].data.message).toBe('Hello, World!');
    });

    it('应该支持多个处理器订阅同一事件', async () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();
      const handler3 = new TestEventHandler();

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);
      eventBus.subscribe('TestEvent', handler3);

      const event = new TestEvent({ message: 'Test' });
      await eventBus.publish(event);

      expect(handler1.handledEvents).toHaveLength(1);
      expect(handler2.handledEvents).toHaveLength(1);
      expect(handler3.handledEvents).toHaveLength(1);
    });

    it('应该支持取消订阅', () => {
      const handler = new TestEventHandler();
      const unsubscribe = eventBus.subscribe('TestEvent', handler);

      expect(eventBus.getSubscriberCount('TestEvent')).toBe(1);

      unsubscribe();
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(0);
    });

    it('应该能够获取事件类型列表', () => {
      eventBus.subscribe('TestEvent', new TestEventHandler());
      eventBus.subscribe('DomainTestEvent', new TestEventHandler('DomainTestEvent'));

      const eventTypes = eventBus.getEventTypes();
      expect(eventTypes).toContain('TestEvent');
      expect(eventTypes).toContain('DomainTestEvent');
      expect(eventTypes).toHaveLength(2);
    });

    it('应该能够获取订阅者数量', () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();

      expect(eventBus.getSubscriberCount('TestEvent')).toBe(0);

      eventBus.subscribe('TestEvent', handler1);
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(1);

      eventBus.subscribe('TestEvent', handler2);
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(2);

      eventBus.unsubscribe('TestEvent', handler1);
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(1);
    });
  });

  describe('批量发布', () => {
    it('应该能够批量发布事件', async () => {
      const handler = new TestEventHandler();
      eventBus.subscribe('TestEvent', handler);

      const events = [
        new TestEvent({ id: 1 }),
        new TestEvent({ id: 2 }),
        new TestEvent({ id: 3 })
      ];

      await eventBus.publishBatch(events);

      expect(handler.handledEvents).toHaveLength(3);
      expect(handler.handledEvents.map(e => e.data.id)).toEqual([1, 2, 3]);
    });

    it('应该能够处理大量事件', async () => {
      const handler = new AsyncTestEventHandler('TestEvent', 1);
      eventBus.subscribe('TestEvent', handler);

      const events = Array.from({ length: 100 }, (_, i) => new TestEvent({ id: i }));

      const startTime = Date.now();
      await eventBus.publishBatch(events);
      const endTime = Date.now();

      expect(handler.handledEvents).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('处理器优先级', () => {
    it('应该按优先级顺序执行处理器', async () => {
      const executionOrder: string[] = [];

      const handler1 = new class extends BaseEventHandler<TestEvent> {
        constructor() {
          super('TestEvent', { priority: 1 });
        }
        protected async processEvent(event: TestEvent): Promise<void> {
          executionOrder.push('handler1');
        }
      };

      const handler2 = new class extends BaseEventHandler<TestEvent> {
        constructor() {
          super('TestEvent', { priority: 3 });
        }
        protected async processEvent(event: TestEvent): Promise<void> {
          executionOrder.push('handler2');
        }
      };

      const handler3 = new class extends BaseEventHandler<TestEvent> {
        constructor() {
          super('TestEvent', { priority: 2 });
        }
        protected async processEvent(event: TestEvent): Promise<void> {
          executionOrder.push('handler3');
        }
      };

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);
      eventBus.subscribe('TestEvent', handler3);

      await eventBus.publish(new TestEvent({}));

      expect(executionOrder).toEqual(['handler2', 'handler3', 'handler1']);
    });
  });

  describe('中间件', () => {
    it('应该支持添加中间件', () => {
      const middleware = new LoggingMiddleware();
      eventBus.use(middleware);

      expect(() => eventBus.use(middleware)).toThrow('already exists');
    });

    it('应该支持移除中间件', () => {
      const middleware = new LoggingMiddleware();
      eventBus.use(middleware);
      eventBus.removeMiddleware('Logging');

      expect(eventBus['middlewares']).toHaveLength(0);
    });

    it('应该按优先级顺序执行中间件', async () => {
      const executionOrder: string[] = [];

      const middleware1 = {
        name: 'Middleware1',
        priority: 1,
        async process(event: IEvent, next: () => Promise<void>): Promise<void> {
          executionOrder.push('middleware1-start');
          await next();
          executionOrder.push('middleware1-end');
        }
      };

      const middleware2 = {
        name: 'Middleware2',
        priority: 3,
        async process(event: IEvent, next: () => Promise<void>): Promise<void> {
          executionOrder.push('middleware2-start');
          await next();
          executionOrder.push('middleware2-end');
        }
      };

      const middleware3 = {
        name: 'Middleware3',
        priority: 2,
        async process(event: IEvent, next: () => Promise<void>): Promise<void> {
          executionOrder.push('middleware3-start');
          await next();
          executionOrder.push('middleware3-end');
        }
      };

      eventBus.use(middleware1);
      eventBus.use(middleware2);
      eventBus.use(middleware3);

      const handler = new TestEventHandler();
      eventBus.subscribe('TestEvent', handler);

      await eventBus.publish(new TestEvent({}));

      expect(executionOrder).toEqual([
        'middleware2-start',
        'middleware3-start',
        'middleware1-start',
        'middleware1-end',
        'middleware3-end',
        'middleware2-end'
      ]);
    });

    it('应该支持中间件错误处理', async () => {
      let middlewareErrorCaught = false;
      let handlerExecuted = false;

      const errorMiddleware = {
        name: 'ErrorMiddleware',
        async process(event: IEvent, next: () => Promise<void>): Promise<void> {
          try {
            await next();
          } catch (error) {
            middlewareErrorCaught = true;
            throw error;
          }
        }
      };

      const failingMiddleware = {
        name: 'FailingMiddleware',
        async process(event: IEvent, next: () => Promise<void>): Promise<void> {
          throw new Error('Middleware failed');
        }
      };

      const handler = new class extends BaseEventHandler<TestEvent> {
        protected async processEvent(event: TestEvent): Promise<void> {
          handlerExecuted = true;
        }
      };

      eventBus.use(errorMiddleware);
      eventBus.use(failingMiddleware);
      eventBus.subscribe('TestEvent', handler);

      await expect(eventBus.publish(new TestEvent({}))).rejects.toThrow('Middleware failed');
      expect(middlewareErrorCaught).toBe(true);
      expect(handlerExecuted).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该处理处理器错误', async () => {
      const failingHandler = new FailingEventHandler();
      const successHandler = new TestEventHandler();

      eventBus.subscribe('TestEvent', failingHandler);
      eventBus.subscribe('TestEvent', successHandler);

      const event = new TestEvent({});

      await expect(eventBus.publish(event)).rejects.toThrow('Handler failed intentionally');
      expect(failingHandler.failureCount).toBe(3); // 1次尝试 + 2次重试
      expect(successHandler.handledEvents).toHaveLength(1); // 其他处理器仍应执行
    });

    it('应该支持重试机制', async () => {
      const handler = new FailingEventHandler();
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent({});

      // 第一次应该失败
      await expect(eventBus.publish(event)).rejects.toThrow();
      expect(handler.failureCount).toBe(3);

      // 禁用失败，应该成功
      handler.shouldFail = false;
      handler.failureCount = 0;

      await eventBus.publish(event);
      expect(handler.failureCount).toBe(1); // 只尝试一次就成功
    });
  });

  describe('统计信息', () => {
    it('应该提供准确的统计信息', async () => {
      const handler = new TestEventHandler();
      eventBus.subscribe('TestEvent', handler);

      // 发布一些事件
      await eventBus.publish(new TestEvent({}));
      await eventBus.publish(new TestEvent({}));

      const stats = eventBus.getStats();

      expect(stats.totalEvents).toBe(2);
      expect(stats.successfulEvents).toBe(2);
      expect(stats.failedEvents).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.eventTypeCount).toBe(1);
      expect(stats.handlerCount).toBe(1);
      expect(stats.middlewareCount).toBe(0);
    });

    it('应该正确计算平均处理时间', async () => {
      const handler = new AsyncTestEventHandler('TestEvent', 10);
      eventBus.subscribe('TestEvent', handler);

      await eventBus.publish(new TestEvent({}));
      await eventBus.publish(new TestEvent({}));

      const stats = eventBus.getStats();

      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeLessThan(50); // 应该小于50ms
    });

    it('应该包含最后处理时间', async () => {
      const handler = new TestEventHandler();
      eventBus.subscribe('TestEvent', handler);

      const beforePublish = Date.now();
      await eventBus.publish(new TestEvent({}));
      const afterPublish = Date.now();

      const stats = eventBus.getStats();

      expect(stats.lastProcessedAt).toBeDefined();
      expect(stats.lastProcessedAt!).toBeGreaterThanOrEqual(beforePublish);
      expect(stats.lastProcessedAt!).toBeLessThanOrEqual(afterPublish);
    });
  });

  describe('并发处理', () => {
    it('应该支持并发处理事件', async () => {
      const handler1 = new AsyncTestEventHandler('TestEvent', 5);
      const handler2 = new AsyncTestEventHandler('TestEvent', 5);
      const handler3 = new AsyncTestEventHandler('TestEvent', 5);

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);
      eventBus.subscribe('TestEvent', handler3);

      const startTime = Date.now();
      await eventBus.publish(new TestEvent({}));
      const endTime = Date.now();

      // 并发处理应该比串行处理快
      expect(endTime - startTime).toBeLessThan(15); // 3个处理器各5ms，并发应该小于15ms
      expect(handler1.handledEvents).toHaveLength(1);
      expect(handler2.handledEvents).toHaveLength(1);
      expect(handler3.handledEvents).toHaveLength(1);
    });

    it('应该限制并发数量', async () => {
      const eventBusWithLimit = new EventBus({
        maxConcurrency: 2,
        enableMiddleware: false,
        enableValidation: false
      });

      const handler = new AsyncTestEventHandler('TestEvent', 10);
      eventBusWithLimit.subscribe('TestEvent', handler);

      const events = Array.from({ length: 5 }, (_, i) => new TestEvent({ id: i }));

      const startTime = Date.now();
      await eventBusWithLimit.publishBatch(events);
      const endTime = Date.now();

      expect(handler.handledEvents).toHaveLength(5);
      // 限制并发为2，5个事件应该需要约3批次的时间
      expect(endTime - startTime).toBeGreaterThan(20); // 2批次 x 10ms
      expect(endTime - startTime).toBeLessThan(40); // 但不应该超过40ms

      eventBusWithLimit.dispose();
    });
  });

  describe('生命周期管理', () => {
    it('应该支持清理所有订阅', () => {
      eventBus.subscribe('TestEvent', new TestEventHandler());
      eventBus.subscribe('DomainTestEvent', new TestEventHandler('DomainTestEvent'));

      expect(eventBus.getEventTypes()).toHaveLength(2);

      eventBus.clear();

      expect(eventBus.getEventTypes()).toHaveLength(0);
    });

    it('应该在销毁后禁止操作', async () => {
      eventBus.dispose();

      expect(() => {
        eventBus.subscribe('TestEvent', new TestEventHandler());
      }).toThrow('disposed event bus');

      await expect(eventBus.publish(new TestEvent({}))).rejects.toThrow('disposed event bus');
    });

    it('应该支持重复销毁', () => {
      expect(() => {
        eventBus.dispose();
        eventBus.dispose();
      }).not.toThrow();
    });
  });

  describe('函数式处理器', () => {
    it('应该支持函数式处理器', async () => {
      let handledEvent: TestEvent | null = null;

      const handler = new FunctionEventHandler('TestEvent', (event: TestEvent) => {
        handledEvent = event;
      });

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent({ message: 'Function handler test' });
      await eventBus.publish(event);

      expect(handledEvent).toBe(event);
      expect(handledEvent!.data.message).toBe('Function handler test');
    });

    it('应该支持异步函数式处理器', async () => {
      let handledEvent: TestEvent | null = null;

      const handler = new FunctionEventHandler('TestEvent', async (event: TestEvent) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        handledEvent = event;
      });

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent({ message: 'Async function handler test' });
      await eventBus.publish(event);

      expect(handledEvent).toBe(event);
      expect(handledEvent!.data.message).toBe('Async function handler test');
    });
  });

  describe('内置中间件', () => {
    it('应该支持日志中间件', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const eventBusWithLogging = new EventBus({
        enableMiddleware: true,
        enableValidation: false
      });

      eventBusWithLogging.use(new LoggingMiddleware());

      const handler = new TestEventHandler();
      eventBusWithLogging.subscribe('TestEvent', handler);

      await eventBusWithLogging.publish(new TestEvent({}));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing event: TestEvent')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event processed successfully: TestEvent')
      );

      eventBusWithLogging.dispose();
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('应该支持指标中间件', async () => {
      const eventBusWithMetrics = new EventBus({
        enableMiddleware: true,
        enableValidation: false
      });

      const metricsMiddleware = new MetricsMiddleware();
      eventBusWithMetrics.use(metricsMiddleware);

      const handler = new TestEventHandler();
      eventBusWithMetrics.subscribe('TestEvent', handler);

      await eventBusWithMetrics.publish(new TestEvent({}));
      await eventBusWithMetrics.publish(new TestEvent({}));

      const metrics = metricsMiddleware.getMetrics();

      expect(metrics['TestEvent']).toBeDefined();
      expect(metrics['TestEvent'].count).toBe(2);
      expect(metrics['TestEvent'].averageTime).toBeGreaterThan(0);
      expect(metrics['TestEvent'].errors).toBe(0);
      expect(metrics['TestEvent'].errorRate).toBe(0);

      eventBusWithMetrics.dispose();
    });
  });
});