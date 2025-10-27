/**
 * 依赖注入容器测试
 */

import {
  Container,
  ServiceLifetime,
  ServiceScope,
  Injectable,
  Inject,
  Singleton,
  Scoped,
  Transient
} from '../index';

// 测试服务类
@Injectable()
class TestService {
  public name = 'TestService';
  public readonly createdAt = Date.now();
}

@Injectable()
class DependencyService {
  public message = 'Dependency Service';
}

@Injectable()
class ServiceWithDependency {
  constructor(
    public dependency: DependencyService,
    public name: string = 'ServiceWithDependency'
  ) {}
}

@Singleton()
class SingletonService {
  public static instanceCount = 0;
  public readonly id: number;

  constructor() {
    SingletonService.instanceCount++;
    this.id = SingletonService.instanceCount;
  }
}

@Scoped()
class ScopedService {
  public static instanceCount = 0;
  public readonly id: number;

  constructor() {
    ScopedService.instanceCount++;
    this.id = ScopedService.instanceCount;
  }
}

@Transient()
class TransientService {
  public static instanceCount = 0;
  public readonly id: number;

  constructor() {
    TransientService.instanceCount++;
    this.id = TransientService.instanceCount;
  }
}

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({
      enableCircularDependencyDetection: true,
      strictMode: false
    });
  });

  afterEach(() => {
    container.dispose();
  });

  describe('基本功能', () => {
    it('应该能够注册和解析服务', () => {
      container.register(TestService, TestService);
      const service = container.resolve(TestService);

      expect(service).toBeInstanceOf(TestService);
      expect(service.name).toBe('TestService');
    });

    it('应该能够检查服务是否已注册', () => {
      expect(container.isRegistered(TestService)).toBe(false);

      container.register(TestService, TestService);
      expect(container.isRegistered(TestService)).toBe(true);
    });

    it('应该能够获取服务描述符', () => {
      container.register(TestService, TestService);
      const descriptor = container.getDescriptor(TestService);

      expect(descriptor).toBeDefined();
      expect(descriptor!.implementation).toBe(TestService);
      expect(descriptor!.lifetime).toBe(ServiceLifetime.Transient);
    });

    it('应该能够移除服务注册', () => {
      container.register(TestService, TestService);
      expect(container.isRegistered(TestService)).toBe(true);

      const removed = container.remove(TestService);
      expect(removed).toBe(true);
      expect(container.isRegistered(TestService)).toBe(false);
    });

    it('应该能够清空所有注册', () => {
      container.register(TestService, TestService);
      container.register(DependencyService, DependencyService);

      container.clear();

      expect(container.isRegistered(TestService)).toBe(false);
      expect(container.isRegistered(DependencyService)).toBe(false);
    });
  });

  describe('服务生命周期', () => {
    beforeEach(() => {
      // 重置计数器
      SingletonService.instanceCount = 0;
      ScopedService.instanceCount = 0;
      TransientService.instanceCount = 0;
    });

    it('单例服务应该返回相同实例', () => {
      container.registerSingleton(SingletonService, SingletonService);

      const instance1 = container.resolve(SingletonService);
      const instance2 = container.resolve(SingletonService);

      expect(instance1).toBe(instance2);
      expect(SingletonService.instanceCount).toBe(1);
    });

    it('瞬态服务应该返回不同实例', () => {
      container.registerTransient(TransientService, TransientService);

      const instance1 = container.resolve(TransientService);
      const instance2 = container.resolve(TransientService);

      expect(instance1).not.toBe(instance2);
      expect(TransientService.instanceCount).toBe(2);
    });

    it('作用域服务在相同作用域内返回相同实例', () => {
      container.registerScoped(ScopedService, ScopedService);

      const scope = container.createScope();

      const instance1 = scope.resolve(ScopedService);
      const instance2 = scope.resolve(ScopedService);

      expect(instance1).toBe(instance2);
      expect(ScopedService.instanceCount).toBe(1);

      scope.dispose();
    });

    it('作用域服务在不同作用域内返回不同实例', () => {
      container.registerScoped(ScopedService, ScopedService);

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const instance1 = scope1.resolve(ScopedService);
      const instance2 = scope2.resolve(ScopedService);

      expect(instance1).not.toBe(instance2);
      expect(ScopedService.instanceCount).toBe(2);

      scope1.dispose();
      scope2.dispose();
    });
  });

  describe('依赖注入', () => {
    it('应该能够注入依赖', () => {
      container.register(ServiceWithDependency, ServiceWithDependency);
      container.register(DependencyService, DependencyService);

      const service = container.resolve(ServiceWithDependency);

      expect(service).toBeInstanceOf(ServiceWithDependency);
      expect(service.dependency).toBeInstanceOf(DependencyService);
      expect(service.dependency.message).toBe('Dependency Service');
    });

    it('应该能够注入多个层级的依赖', () => {
      class GrandChildService {
        public value = 'grand-child';
      }

      @Injectable()
      class ChildService {
        constructor(public grandChild: GrandChildService) {}
      }

      @Injectable()
      class ParentService {
        constructor(public child: ChildService) {}
      }

      container.register(ParentService, ParentService);
      container.register(ChildService, ChildService);
      container.register(GrandChildService, GrandChildService);

      const service = container.resolve(ParentService);

      expect(service.child.grandChild.value).toBe('grand-child');
    });

    it('解析不存在的依赖应该抛出错误', () => {
      container.register(ServiceWithDependency, ServiceWithDependency);
      // 故意不注册 DependencyService

      expect(() => {
        container.resolve(ServiceWithDependency);
      }).toThrow('Dependency not registered');
    });
  });

  describe('工厂函数', () => {
    it('应该能够使用工厂函数创建实例', () => {
      const factory = () => ({ value: 'created by factory' });

      container.registerFactory('FactoryService', factory);
      const service = container.resolve('FactoryService');

      expect(service.value).toBe('created by factory');
    });

    it('工厂函数应该能够接收依赖', () => {
      const factory = (dependency: DependencyService) => ({
        value: `created with ${dependency.message}`
      });

      container.registerFactory('FactoryWithDep', factory);
      container.register(DependencyService, DependencyService);

      const service = container.resolve('FactoryWithDep');

      expect(service.value).toBe('created with Dependency Service');
    });
  });

  describe('实例注册', () => {
    it('应该能够注册现有实例', () => {
      const instance = new TestService();
      instance.name = 'Custom Instance';

      container.registerInstance('CustomService', instance);

      const resolved = container.resolve('CustomService');

      expect(resolved).toBe(instance);
      expect(resolved.name).toBe('Custom Instance');
    });
  });

  describe('作用域管理', () => {
    it('应该能够创建作用域', () => {
      const scope = container.createScope();

      expect(scope).toBeInstanceOf(ServiceScope);
      expect(scope.isActive).toBe(true);

      scope.dispose();
      expect(scope.isActive).toBe(false);
    });

    it('作用域应该能够解析单例服务', () => {
      container.registerSingleton(SingletonService, SingletonService);
      const scope = container.createScope();

      const service = scope.resolve(SingletonService);

      expect(service).toBeInstanceOf(SingletonService);

      scope.dispose();
    });

    it('作用域销毁时应该清理作用域服务', () => {
      let disposeCalled = false;

      class DisposableService {
        dispose() {
          disposeCalled = true;
        }
      }

      container.registerScoped(DisposableService, DisposableService);
      const scope = container.createScope();

      scope.resolve(DisposableService);
      scope.dispose();

      expect(disposeCalled).toBe(true);
    });
  });

  describe('循环依赖检测', () => {
    it('应该检测到简单的循环依赖', () => {
      class ServiceA {
        constructor(public serviceB: ServiceB) {}
      }

      class ServiceB {
        constructor(public serviceA: ServiceA) {}
      }

      container.register(ServiceA, ServiceA);
      container.register(ServiceB, ServiceB);

      expect(() => {
        container.resolve(ServiceA);
      }).toThrow('Circular dependency detected');
    });

    it('应该检测到复杂的循环依赖', () => {
      class ServiceA {
        constructor(public serviceB: ServiceB) {}
      }

      class ServiceB {
        constructor(public serviceC: ServiceC) {}
      }

      class ServiceC {
        constructor(public serviceA: ServiceA) {}
      }

      container.register(ServiceA, ServiceA);
      container.register(ServiceB, ServiceB);
      container.register(ServiceC, ServiceC);

      expect(() => {
        container.resolve(ServiceA);
      }).toThrow('Circular dependency detected');
    });

    it('应该能够禁用循环依赖检测', () => {
      class ServiceA {
        constructor(public serviceB: ServiceB) {}
      }

      class ServiceB {
        constructor(public serviceA: ServiceA) {}
      }

      const containerWithoutDetection = new Container({
        enableCircularDependencyDetection: false
      });

      containerWithoutDetection.register(ServiceA, ServiceA);
      containerWithoutDetection.register(ServiceB, ServiceB);

      // 应该不会抛出错误（但可能在运行时出现问题）
      expect(() => {
        containerWithoutDetection.resolve(ServiceA);
      }).not.toThrow('Circular dependency detected');

      containerWithoutDetection.dispose();
    });
  });

  describe('依赖验证', () => {
    it('应该验证依赖关系', () => {
      class ServiceA {
        constructor(public serviceB: ServiceB) {}
      }

      class ServiceB {}

      container.register(ServiceA, ServiceA);
      // 故意不注册 ServiceB

      const validation = container.validateDependencies();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].type).toBe('missing_dependency');
    });

    it('有效的依赖关系应该通过验证', () => {
      container.register(ServiceWithDependency, ServiceWithDependency);
      container.register(DependencyService, DependencyService);

      const validation = container.validateDependencies();

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该提供容器统计信息', () => {
      container.register(TestService, TestService);
      container.registerSingleton(SingletonService, SingletonService);

      const stats = container.getStats();

      expect(stats.name).toBe('DefaultContainer');
      expect(stats.serviceCount).toBe(2);
      expect(stats.isDisposed).toBe(false);
      expect(Array.isArray(stats.services)).toBe(true);
    });

    it('应该跟踪解析统计', () => {
      container.register(TestService, TestService);

      container.resolve(TestService);
      container.resolve(TestService);
      container.resolve(TestService);

      const stats = container.getStats();
      expect(stats.totalResolves).toBe(3);
    });
  });

  describe('错误处理', () => {
    it('解析不存在的服务应该抛出错误', () => {
      expect(() => {
        container.resolve(TestService);
      }).toThrow('Service not registered');
    });

    it('尝试解析不存在的服务应该返回null', () => {
      const service = container.tryResolve(TestService);
      expect(service).toBeNull();
    });

    it('已销毁的容器不能注册服务', () => {
      container.dispose();

      expect(() => {
        container.register(TestService, TestService);
      }).toThrow('Cannot register services in disposed container');
    });

    it('已销毁的容器不能解析服务', () => {
      container.register(TestService, TestService);
      container.dispose();

      expect(() => {
        container.resolve(TestService);
      }).toThrow('Cannot resolve services from disposed container');
    });

    it('已销毁的容器不能创建作用域', () => {
      container.dispose();

      expect(() => {
        container.createScope();
      }).toThrow('Cannot create scope from disposed container');
    });
  });

  describe('字符串令牌', () => {
    it('应该支持字符串令牌', () => {
      container.register('StringToken', TestService);
      const service = container.resolve('StringToken');

      expect(service).toBeInstanceOf(TestService);
    });

    it('应该支持Symbol令牌', () => {
      const symbolToken = Symbol('TestToken');
      container.register(symbolToken, TestService);
      const service = container.resolve(symbolToken);

      expect(service).toBeInstanceOf(TestService);
    });
  });

  describe('父容器', () => {
    it('应该能够创建带父容器的容器', () => {
      const parentContainer = new Container({ name: 'Parent' });
      parentContainer.register(ParentService, ParentService);

      const childContainer = new Container({
        name: 'Child',
        parent: parentContainer
      });

      // 子容器应该能够解析父容器中的服务
      const service = childContainer.resolve(ParentService);
      expect(service).toBeInstanceOf(ParentService);

      parentContainer.dispose();
      childContainer.dispose();
    });

    it('子容器的服务应该覆盖父容器的服务', () => {
      class ParentServiceImpl {
        public source = 'parent';
      }

      class ChildServiceImpl {
        public source = 'child';
      }

      const parentContainer = new Container({ name: 'Parent' });
      parentContainer.register('OverrideService', ParentServiceImpl);

      const childContainer = new Container({
        name: 'Child',
        parent: parentContainer
      });
      childContainer.register('OverrideService', ChildServiceImpl);

      const service = childContainer.resolve('OverrideService');
      expect(service.source).toBe('child');

      parentContainer.dispose();
      childContainer.dispose();
    });
  });
});