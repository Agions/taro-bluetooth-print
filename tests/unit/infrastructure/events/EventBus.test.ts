/**
 * 事件总线单元测试
 */

import { EventBus } from '../../../../src/infrastructure/events/EventBus';
import { IEventBus, IEvent, IEventMiddleware } from '../../../../src/infrastructure/events/types';

// 测试事件类
class TestEvent implements IEvent {
  constructor(public data: any) {}
}

class AnotherEvent implements IEvent {
  constructor(public message: string) {}
}

// 测试中间件
class TestMiddleware implements IEventMiddleware {
  constructor(private name: string) {}

  async handle(event: IEvent): Promise<void> {
    // 中间件逻辑
  }
}

describe('EventBus', () => {
  let eventBus: IEventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.dispose();
  });

  describe('基础功能', () => {
    it('应该正确创建事件总线实例', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('应该能够发布和订阅事件', async () => {
      let receivedEvent: TestEvent | null = null;

      // 订阅事件
      const unsubscribe = eventBus.subscribe(TestEvent, (event) => {
        receivedEvent = event;
      });

      // 发布事件
      const testEvent = new TestEvent({ message: 'test' });
      await eventBus.publish(testEvent);

      // 验证事件被接收
      expect(receivedEvent).toBeInstanceOf(TestEvent);
      expect(receivedEvent?.data.message).toBe('test');

      // 清理
      unsubscribe();
    });

    it('应该支持多个订阅者', async () => {
      const results: string[] = [];

      // 添加多个订阅者
      const unsubscribe1 = eventBus.subscribe(TestEvent, (event) => {
        results.push('subscriber1');
      });

      const unsubscribe2 = eventBus.subscribe(TestEvent, (event) => {
        results.push('subscriber2');
      });

      const unsubscribe3 = eventBus.subscribe(TestEvent, (event) => {
        results.push('subscriber3');
      });

      // 发布事件
      await eventBus.publish(new TestEvent({}));

      // 验证所有订阅者都收到了事件
      expect(results).toHaveLength(3);
      expect(results).toContain('subscriber1');
      expect(results).toContain('subscriber2');
      expect(results).toContain('subscriber3');

      // 清理
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });

    it('应该支持不同类型的事件', async () => {
      let testEventReceived = false;
      let anotherEventReceived = false;

      // 订阅不同类型的事件
      const unsubscribe1 = eventBus.subscribe(TestEvent, () => {
        testEventReceived = true;
      });

      const unsubscribe2 = eventBus.subscribe(AnotherEvent, () => {
        anotherEventReceived = true;
      });

      // 发布不同类型的事件
      await eventBus.publish(new TestEvent({}));
      await eventBus.publish(new AnotherEvent('test'));

      expect(testEventReceived).toBe(true);
      expect(anotherEventReceived).toBe(true);

      // 清理
      unsubscribe1();
      unsubscribe2();
    });

    it('应该能够取消订阅', async () => {
      let callCount = 0;

      const unsubscribe = eventBus.subscribe(TestEvent, () => {
        callCount++;
      });

      // 发布事件
      await eventBus.publish(new TestEvent({}));
      expect(callCount).toBe(1);

      // 取消订阅
      unsubscribe();

      // 再次发布事件
      await eventBus.publish(new TestEvent({}));
      expect(callCount).toBe(1); // 应该还是1
    });
  });

  describe('中间件功能', () => {
    it('应该能够添加和执行中间件', async () => {
      const executionOrder: string[] = [];

      const middleware1: IEventMiddleware = {
        handle: async (event) => {
          executionOrder.push('middleware1');
        }
      };

      const middleware2: IEventMiddleware = {
        handle: async (event) => {
          executionOrder.push('middleware2');
        }
      };

      // 添加中间件
      eventBus.addMiddleware(middleware1);
      eventBus.addMiddleware(middleware2);

      // 添加事件处理器
      eventBus.subscribe(TestEvent, () => {
        executionOrder.push('handler');
      });

      // 发布事件
      await eventBus.publish(new TestEvent({}));

      // 验证执行顺序
      expect(executionOrder).toEqual(['middleware1', 'middleware2', 'handler']);
    });

    it('应该能够移除中间件', async () => {
      let middlewareExecuted = false;

      const middleware: IEventMiddleware = {
        handle: async (event) => {
          middlewareExecuted = true;
        }
      };

      // 添加中间件
      eventBus.addMiddleware(middleware);

      // 发布事件
      await eventBus.publish(new TestEvent({}));
      expect(middlewareExecuted).toBe(true);

      // 重置
      middlewareExecuted = false;

      // 移除中间件
      eventBus.removeMiddleware(middleware);

      // 再次发布事件
      await eventBus.publish(new TestEvent({}));
      expect(middlewareExecuted).toBe(false);
    });

    it('应该能够清空所有中间件', async () => {
      let middlewareCount = 0;

      const middleware1: IEventMiddleware = {
        handle: async (event) => {
          middlewareCount++;
        }
      };

      const middleware2: IEventMiddleware = {
        handle: async (event) => {
          middlewareCount++;
        }
      };

      // 添加中间件
      eventBus.addMiddleware(middleware1);
      eventBus.addMiddleware(middleware2);

      // 发布事件
      await eventBus.publish(new TestEvent({}));
      expect(middlewareCount).toBe(2);

      // 重置
      middlewareCount = 0;

      // 清空中间件
      eventBus.clearMiddleware();

      // 再次发布事件
      await eventBus.publish(new TestEvent({}));
      expect(middlewareCount).toBe(0);
    });

    it('应该跟踪中间件数量', () => {
      const mockEventBus = eventBus as any;
      expect(mockEventBus.getMiddlewareCount()).toBe(0);

      eventBus.addMiddleware(new TestMiddleware('test1'));
      expect(mockEventBus.getMiddlewareCount()).toBe(1);

      eventBus.addMiddleware(new TestMiddleware('test2'));
      expect(mockEventBus.getMiddlewareCount()).toBe(2);

      eventBus.removeMiddleware(mockEventBus.getMiddlewareCount() - 1);
      expect(mockEventBus.getMiddlewareCount()).toBe(1);

      eventBus.clearMiddleware();
      expect(mockEventBus.getMiddlewareCount()).toBe(0);
    });
  });

  describe('事件历史', () => {
    it('应该能够记录事件历史', async () => {
      const event1 = new TestEvent({ id: 1 });
      const event2 = new AnotherEvent('test');
      const event3 = new TestEvent({ id: 3 });

      // 发布事件
      await eventBus.publish(event1);
      await eventBus.publish(event2);
      await eventBus.publish(event3);

      // 获取历史
      const history = (eventBus as any).getEventHistory();
      expect(history).toHaveLength(3);
      expect(history[0]).toBe(event1);
      expect(history[1]).toBe(event2);
      expect(history[2]).toBe(event3);
    });

    it('应该能够清空事件历史', async () => {
      // 发布事件
      await eventBus.publish(new TestEvent({}));
      await eventBus.publish(new AnotherEvent('test'));

      // 验证历史不为空
      expect((eventBus as any).getEventHistory()).toHaveLength(2);

      // 清空历史
      (eventBus as any).clearHistory();

      // 验证历史已清空
      expect((eventBus as any).getEventHistory()).toHaveLength(0);
    });

    it('应该限制历史大小', async () => {
      const mockEventBus = eventBus as any;
      mockEventBus.setMaxHistorySize(3);

      // 发布超过限制的事件
      for (let i = 1; i <= 5; i++) {
        await eventBus.publish(new TestEvent({ id: i }));
      }

      // 验证只保留最新的3个事件
      const history = mockEventBus.getEventHistory();
      expect(history).toHaveLength(3);
      expect(history[0].data.id).toBe(3);
      expect(history[1].data.id).toBe(4);
      expect(history[2].data.id).toBe(5);
    });
  });

  describe('错误处理', () => {
    it('应该处理事件处理器中的错误', async () => {
      let errorHandlerCalled = false;
      let normalHandlerCalled = false;

      // 添加会抛出错误的处理器
      eventBus.subscribe(TestEvent, () => {
        throw new Error('Handler error');
      });

      // 添加正常处理器
      eventBus.subscribe(TestEvent, () => {
        normalHandlerCalled = true;
      });

      // 监听错误事件（如果EventBus支持）
      eventBus.on('error', () => {
        errorHandlerCalled = true;
      });

      // 发布事件
      await eventBus.publish(new TestEvent({}));

      // 正常处理器应该被调用
      expect(normalHandlerCalled).toBe(true);

      // 事件总线应该继续工作
      await eventBus.publish(new TestEvent({}));
      expect(normalHandlerCalled).toBe(true);
    });

    it('应该处理中间件中的错误', async () => {
      let middlewareError = false;
      let handlerCalled = false;

      // 添加会抛出错误的中间件
      eventBus.addMiddleware({
        handle: async () => {
          middlewareError = true;
          throw new Error('Middleware error');
        }
      });

      // 添加正常中间件
      eventBus.addMiddleware({
        handle: async () => {
          // 这个应该被执行
        }
      });

      // 添加处理器
      eventBus.subscribe(TestEvent, () => {
        handlerCalled = true;
      });

      // 发布事件
      await eventBus.publish(new TestEvent({}));

      // 验证处理器仍然被调用
      expect(handlerCalled).toBe(true);
    });
  });

  describe('异步处理', () => {
    it('应该支持异步事件处理器', async () => {
      let asyncResult = '';

      eventBus.subscribe(TestEvent, async (event) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncResult = 'async-completed';
      });

      await eventBus.publish(new TestEvent({}));

      // 等待异步处理完成
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(asyncResult).toBe('async-completed');
    });

    it('应该支持异步中间件', async () => {
      let middlewareOrder: string[] = [];

      eventBus.addMiddleware({
        handle: async (event) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          middlewareOrder.push('middleware1');
        }
      });

      eventBus.addMiddleware({
        handle: async (event) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          middlewareOrder.push('middleware2');
        }
      });

      eventBus.subscribe(TestEvent, async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        middlewareOrder.push('handler');
      });

      await eventBus.publish(new TestEvent({}));

      // 等待异步处理完成
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(middlewareOrder).toEqual(['middleware1', 'middleware2', 'handler']);
    });

    it('应该并发执行事件处理器', async () => {
      const handlerOrder: string[] = [];
      const startTime = Date.now();

      eventBus.subscribe(TestEvent, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        handlerOrder.push('handler1');
      });

      eventBus.subscribe(TestEvent, async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        handlerOrder.push('handler2');
      });

      await eventBus.publish(new TestEvent({}));

      // 等待所有处理器完成
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(handlerOrder).toHaveLength(2);
      // 验证是并发执行（总时间应该小于串行执行的时间）
      expect(Date.now() - startTime).toBeLessThan(80);
    });
  });

  describe('销毁功能', () => {
    it('应该能够正确销毁事件总线', () => {
      const mockEventBus = eventBus as any;

      // 添加一些中间件和订阅者
      eventBus.addMiddleware(new TestMiddleware('test'));
      eventBus.subscribe(TestEvent, () => {});

      expect(mockEventBus.getMiddlewareCount()).toBe(1);

      // 销毁
      eventBus.dispose();

      expect(mockEventBus.isDisposed()).toBe(true);
      expect(mockEventBus.getMiddlewareCount()).toBe(0);
    });

    it('销毁后不能发布事件', async () => {
      eventBus.dispose();

      await expect(eventBus.publish(new TestEvent({})))
        .rejects.toThrow('EventBus has been disposed');
    });

    it('销毁后不能添加中间件', () => {
      eventBus.dispose();

      expect(() => {
        eventBus.addMiddleware(new TestMiddleware('test'));
      }).toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量事件', async () => {
      let receivedCount = 0;

      eventBus.subscribe(TestEvent, () => {
        receivedCount++;
      });

      const eventCount = 1000;
      const startTime = Date.now();

      // 批量发布事件
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(eventBus.publish(new TestEvent({ id: i })));
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(receivedCount).toBe(eventCount);
      // 性能要求：1000个事件应在1秒内处理完成
      expect(duration).toBeLessThan(1000);
    });

    it('应该能够处理大量订阅者', async () => {
      const subscriberCount = 100;
      const subscriptions: Array<() => void> = [];

      // 添加大量订阅者
      for (let i = 0; i < subscriberCount; i++) {
        const unsubscribe = eventBus.subscribe(TestEvent, () => {});
        subscriptions.push(unsubscribe);
      }

      const startTime = Date.now();
      await eventBus.publish(new TestEvent({}));
      const duration = Date.now() - startTime;

      // 性能要求：通知100个订阅者应在合理时间内完成
      expect(duration).toBeLessThan(100);

      // 清理订阅
      subscriptions.forEach(unsubscribe => unsubscribe());
    });
  });

  describe('边界情况', () => {
    it('应该能够处理没有订阅者的事件', async () => {
      // 没有订阅者的情况下发布事件，不应该出错
      await expect(eventBus.publish(new TestEvent({})))
        .resolves.toBeUndefined();
    });

    it('应该能够处理空数据的事件', async () => {
      let receivedEvent: TestEvent | null = null;

      eventBus.subscribe(TestEvent, (event) => {
        receivedEvent = event;
      });

      await eventBus.publish(new TestEvent(null as any));
      expect(receivedEvent).toBeInstanceOf(TestEvent);
      expect(receivedEvent?.data).toBeNull();
    });

    it('应该能够处理重复的取消订阅', async () => {
      const unsubscribe = eventBus.subscribe(TestEvent, () => {});

      // 第一次取消订阅
      unsubscribe();

      // 第二次取消订阅不应该出错
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});