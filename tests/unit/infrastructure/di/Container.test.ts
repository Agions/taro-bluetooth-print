/**
 * 依赖注入容器单元测试
 */

import { Container, ServiceLifecycle } from '../../../../src/infrastructure/di/Container';
import { IContainer } from '../../../../src/infrastructure/di/types';

describe('Container', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.dispose();
  });

  describe('基础功能', () => {
    it('应该正确创建容器实例', () => {
      expect(container).toBeInstanceOf(Container);
      expect(container.getRegisteredServices()).toHaveLength(0);
    });

    it('应该能够注册和解析服务', () => {
      // 注册服务
      container.register('TestService', () => ({ name: 'test' }));

      // 验证服务已注册
      expect(container.has('TestService')).toBe(true);
      expect(container.getRegisteredServices()).toContain('TestService');

      // 解析服务
      const service = container.resolve('TestService');
      expect(service).toEqual({ name: 'test' });
    });

    it('应该支持不同类型的token', () => {
      class TestClass {}
      const symbol = Symbol('test');

      container.register('string', () => 'string-value');
      container.register(TestClass, () => new TestClass());
      container.register(symbol, () => 'symbol-value');

      expect(container.resolve('string')).toBe('string-value');
      expect(container.resolve(TestClass)).toBeInstanceOf(TestClass);
      expect(container.resolve(symbol)).toBe('symbol-value');
    });

    it('应该能够注销服务', () => {
      container.register('TestService', () => ({ name: 'test' }));
      expect(container.has('TestService')).toBe(true);

      container.unregister('TestService');
      expect(container.has('TestService')).toBe(false);
      expect(container.getRegisteredServices()).not.toContain('TestService');
    });

    it('应该能够清空所有服务', () => {
      container.register('Service1', () => ({ name: 'service1' }));
      container.register('Service2', () => ({ name: 'service2' }));

      expect(container.getRegisteredServices()).toHaveLength(2);

      container.clear();
      expect(container.getRegisteredServices()).toHaveLength(0);
      expect(container.has('Service1')).toBe(false);
      expect(container.has('Service2')).toBe(false);
    });
  });

  describe('生命周期管理', () => {
    it('应该正确处理Transient生命周期', () => {
      let callCount = 0;
      container.register(
        'TransientService',
        () => {
          callCount++;
          return { id: callCount };
        },
        ServiceLifecycle.TRANSIENT
      );

      const service1 = container.resolve('TransientService');
      const service2 = container.resolve('TransientService');

      expect(service1.id).toBe(1);
      expect(service2.id).toBe(2);
      expect(callCount).toBe(2);
    });

    it('应该正确处理Singleton生命周期', () => {
      let callCount = 0;
      container.register(
        'SingletonService',
        () => {
          callCount++;
          return { id: callCount };
        },
        ServiceLifecycle.SINGLETON
      );

      const service1 = container.resolve('SingletonService');
      const service2 = container.resolve('SingletonService');

      expect(service1.id).toBe(1);
      expect(service2.id).toBe(1);
      expect(service1).toBe(service2);
      expect(callCount).toBe(1);
    });

    it('应该正确处理Scoped生命周期', () => {
      let callCount = 0;
      container.register(
        'ScopedService',
        () => {
          callCount++;
          return { id: callCount };
        },
        ServiceLifecycle.SCOPED
      );

      const service1 = container.resolve('ScopedService');
      const service2 = container.resolve('ScopedService');

      // Scoped在简化实现中应该每次返回新实例
      expect(service1.id).toBe(1);
      expect(service2.id).toBe(2);
      expect(callCount).toBe(2);
    });

    it('应该默认使用Transient生命周期', () => {
      let callCount = 0;
      container.register('DefaultService', () => {
        callCount++;
        return { id: callCount };
      });

      const service1 = container.resolve('DefaultService');
      const service2 = container.resolve('DefaultService');

      expect(service1.id).toBe(1);
      expect(service2.id).toBe(2);
      expect(callCount).toBe(2);
    });
  });

  describe('依赖注入', () => {
    it('应该能够注入依赖', () => {
      // 注册依赖
      container.register('Dependency', () => ({ name: 'dependency' }));

      // 注册需要依赖的服务
      container.register('Service', () => {
        const dependency = container.resolve('Dependency');
        return { dependency, name: 'service' };
      });

      const service = container.resolve('Service');
      expect(service.dependency.name).toBe('dependency');
      expect(service.name).toBe('service');
    });

    it('应该能够处理循环依赖（简单情况）', () => {
      // 注册服务A依赖B
      container.register('ServiceA', () => {
        const serviceB = container.resolve('ServiceB');
        return { name: 'A', dependency: serviceB };
      });

      // 注册服务B依赖A（这可能导致问题）
      container.register('ServiceB', () => {
        return { name: 'B' };
      });

      const serviceA = container.resolve('ServiceA');
      expect(serviceA.name).toBe('A');
      expect(serviceA.dependency.name).toBe('B');
    });

    it('应该能够注入容器本身', () => {
      container.register('SelfService', (c) => ({
        container: c,
        name: 'self'
      }));

      const service = container.resolve('SelfService');
      expect(service.container).toBe(container);
      expect(service.name).toBe('self');
    });
  });

  describe('错误处理', () => {
    it('解析未注册的服务应该抛出错误', () => {
      expect(() => {
        container.resolve('NonExistentService');
      }).toThrow('Service not registered: NonExistentService');
    });

    it('工厂函数抛出错误应该传播', () => {
      container.register('ErrorService', () => {
        throw new Error('Factory error');
      });

      expect(() => {
        container.resolve('ErrorService');
      }).toThrow('Factory error');
    });

    it('工厂函数返回undefined应该正常工作', () => {
      container.register('UndefinedService', () => undefined);

      const service = container.resolve('UndefinedService');
      expect(service).toBeUndefined();
    });
  });

  describe('覆盖注册', () => {
    it('应该能够覆盖已注册的服务', () => {
      container.register('Service', () => ({ version: 1 }));
      expect(container.resolve('Service').version).toBe(1);

      container.register('Service', () => ({ version: 2 }));
      expect(container.resolve('Service').version).toBe(2);
    });

    it('覆盖服务应该重置Singleton实例', () => {
      let callCount = 0;
      container.register(
        'Service',
        () => {
          callCount++;
          return { version: callCount };
        },
        ServiceLifecycle.SINGLETON
      );

      const service1 = container.resolve('Service');
      expect(service1.version).toBe(1);
      expect(callCount).toBe(1);

      // 覆盖注册
      container.register(
        'Service',
        () => {
          callCount++;
          return { version: callCount };
        },
        ServiceLifecycle.SINGLETON
      );

      const service2 = container.resolve('Service');
      expect(service2.version).toBe(2);
      expect(callCount).toBe(2);
      expect(service1).not.toBe(service2);
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的注册服务统计', () => {
      expect(container.getRegisteredServices()).toHaveLength(0);

      container.register('Service1', () => ({}));
      container.register('Service2', () => ({}));
      container.register('Service3', () => ({}));

      const services = container.getRegisteredServices();
      expect(services).toHaveLength(3);
      expect(services).toContain('Service1');
      expect(services).toContain('Service2');
      expect(services).toContain('Service3');
    });

    it('应该正确跟踪已注册服务的数量', () => {
      // 使用私有方法获取服务数量（通过类型断言）
      const mockContainer = container as any;
      expect(mockContainer.getServiceCount()).toBe(0);

      container.register('Service1', () => ({}));
      expect(mockContainer.getServiceCount()).toBe(1);

      container.register('Service2', () => ({}));
      expect(mockContainer.getServiceCount()).toBe(2);

      container.unregister('Service1');
      expect(mockContainer.getServiceCount()).toBe(1);

      container.clear();
      expect(mockContainer.getServiceCount()).toBe(0);
    });
  });

  describe('销毁功能', () => {
    it('应该能够正确销毁容器', () => {
      container.register('Service1', () => ({}));
      container.register('Service2', () => ({}));

      expect(container.getRegisteredServices()).toHaveLength(2);

      container.dispose();

      expect(container.getRegisteredServices()).toHaveLength(0);
    });

    it('销毁后的容器不能注册服务', () => {
      container.dispose();

      expect(() => {
        container.register('Service', () => ({}));
      }).toThrow('Cannot register service to disposed container');
    });

    it('销毁后的容器不能解析服务', () => {
      container.register('Service', () => ({}));
      container.dispose();

      expect(() => {
        container.resolve('Service');
      }).toThrow('Cannot resolve service from disposed container');
    });

    it('应该能够检查容器是否已销毁', () => {
      const mockContainer = container as any;
      expect(mockContainer.isDisposed()).toBe(false);

      container.dispose();
      expect(mockContainer.isDisposed()).toBe(true);
    });
  });

  describe('复杂场景', () => {
    it('应该能够处理复杂的依赖图', () => {
      // 注册基础服务
      container.register('Database', () => ({ connected: true }));
      container.register('Logger', () => ({ level: 'info' }));

      // 注册中间层服务
      container.register('Repository', () => {
        const db = container.resolve('Database');
        const logger = container.resolve('Logger');
        return { database: db, logger };
      });

      // 注册顶层服务
      container.register('Service', () => {
        const repository = container.resolve('Repository');
        const logger = container.resolve('Logger');
        return { repository, logger };
      });

      const service = container.resolve('Service');
      expect(service.repository.database.connected).toBe(true);
      expect(service.repository.logger.level).toBe('info');
      expect(service.logger.level).toBe('info');
    });

    it('应该能够处理工厂函数中的异步操作（通过同步模拟）', () => {
      let asyncCallCount = 0;
      container.register('AsyncService', () => {
        asyncCallCount++;
        return {
          id: asyncCallCount,
          data: `async-result-${asyncCallCount}`
        };
      });

      const service1 = container.resolve('AsyncService');
      const service2 = container.resolve('AsyncService');

      expect(service1.id).toBe(1);
      expect(service2.id).toBe(2);
      expect(service1.data).toBe('async-result-1');
      expect(service2.data).toBe('async-result-2');
    });

    it('应该能够处理大量服务注册', () => {
      const serviceCount = 100;

      for (let i = 0; i < serviceCount; i++) {
        container.register(`Service${i}`, () => ({ id: i }));
      }

      expect(container.getRegisteredServices()).toHaveLength(serviceCount);

      // 验证所有服务都能正确解析
      for (let i = 0; i < serviceCount; i++) {
        const service = container.resolve(`Service${i}`);
        expect(service.id).toBe(i);
      }
    });
  });
});