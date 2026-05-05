import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container, injectable, inject } from '../../src/core/di/Container';

// 测试用的简单类
class TestService {
  constructor(public name: string = 'TestService') {}
  getValue() {
    return `Hello from ${this.name}`;
  }
}

class AnotherService {
  constructor(public value: string = 'Another') {}
  getData() {
    return this.value;
  }
}

// 带依赖的服务
class DependentService {
  constructor(
    public testService: TestService,
    public anotherService: AnotherService
  ) {}
  getCombined() {
    return `${this.testService.getValue()} - ${this.anotherService.getData()}`;
  }
}

describe('Container DI', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.clear();
  });

  describe('register()', () => {
    it('should register a class', () => {
      container.register(TestService, TestService);
      expect(container.isRegistered(TestService)).toBe(true);
    });

    it('should register with string token', () => {
      container.register('TestService', TestService);
      expect(container.isRegistered('TestService')).toBe(true);
    });

    it('should register with symbol token', () => {
      const TOKEN = Symbol('TestService');
      container.register(TOKEN, TestService);
      expect(container.isRegistered(TOKEN)).toBe(true);
    });

    it('should register an instance', () => {
      const instance = new TestService('InstanceService');
      container.registerInstance('MyService', instance);
      const resolved = container.resolve<TestService>('MyService');
      expect(resolved).toBe(instance);
    });

    it('should register with useValue', () => {
      const value = { name: 'Config', debug: true };
      container.register('Config', { useValue: value });
      const resolved = container.resolve('Config');
      expect(resolved).toEqual(value);
    });

    it('should register with useClass', () => {
      container.register('TestService', { useClass: TestService });
      const resolved = container.resolve<TestService>('TestService');
      expect(resolved).toBeInstanceOf(TestService);
    });

    it('should register with useFactory', () => {
      container.register('TestService', {
        useFactory: (c: Container) => new TestService('FactoryCreated')
      });
      const resolved = container.resolve<TestService>('TestService');
      expect(resolved.name).toBe('FactoryCreated');
    });

    it('should return container for chaining', () => {
      const result = container.register(TestService, TestService);
      expect(result).toBe(container);
    });
  });

  describe('registerSingleton()', () => {
    it('should register a singleton service', () => {
      container.registerSingleton(TestService, TestService);
      expect(container.isRegistered(TestService)).toBe(true);
    });

    it('should return container for chaining', () => {
      const result = container.registerSingleton(TestService, TestService);
      expect(result).toBe(container);
    });
  });

  describe('registerType()', () => {
    it('should register type mapping', () => {
      container.registerType('ITest', TestService);
      expect(container.isRegistered('ITest')).toBe(true);
    });

    it('should return container for chaining', () => {
      const result = container.registerType('ITest', TestService);
      expect(result).toBe(container);
    });
  });

  describe('resolve()', () => {
    it('should resolve a registered class', () => {
      container.register(TestService, TestService);
      const instance = container.resolve<TestService>(TestService);
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should resolve with string token', () => {
      container.register('TestService', TestService);
      const instance = container.resolve<TestService>('TestService');
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should auto-instantiate if token is a constructor', () => {
      container.register(TestService, TestService);
      const instance = container.resolve<TestService>(TestService);
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should throw error when token not registered', () => {
      expect(() => container.resolve('NonExistent')).toThrow('No registration found for token');
    });

    it('should resolve singleton only once', () => {
      container.register(TestService, TestService, { lifecycle: 'singleton' });
      const instance1 = container.resolve<TestService>(TestService);
      const instance2 = container.resolve<TestService>(TestService);
      expect(instance1).toBe(instance2);
    });

    it('should create new instance for transient', () => {
      container.register(TestService, TestService, { lifecycle: 'transient' });
      const instance1 = container.resolve<TestService>(TestService);
      const instance2 = container.resolve<TestService>(TestService);
      expect(instance1).not.toBe(instance2);
    });

    it('should resolve with tag', () => {
      container.register('TestService', TestService, { tag: 'v1' });
      container.register('TestService', TestService, { tag: 'v2' });
      const v1 = container.resolve<TestService>('TestService', 'v1');
      const v2 = container.resolve<TestService>('TestService', 'v2');
      expect(v1).toBeInstanceOf(TestService);
      expect(v2).toBeInstanceOf(TestService);
    });
  });

  describe('resolveAll()', () => {
    it('should resolve all registered instances', () => {
      container.register('Test', TestService);
      container.register('Test', TestService);
      const instances = container.resolveAll<TestService>('Test');
      expect(instances.length).toBe(2);
    });

    it('should include parent container registrations', () => {
      const parent = new Container();
      parent.register('Shared', TestService);
      const child = parent.createChild();
      child.register('Local', AnotherService);
      const shared = child.resolveAll<TestService>('Shared');
      expect(shared.length).toBe(1);
    });

    it('should return empty array when no registrations', () => {
      const instances = container.resolveAll('NonExistent');
      expect(instances).toEqual([]);
    });
  });

  describe('isRegistered()', () => {
    it('should return true for registered token', () => {
      container.register(TestService, TestService);
      expect(container.isRegistered(TestService)).toBe(true);
    });

    it('should return false for unregistered token', () => {
      expect(container.isRegistered('NonExistent')).toBe(false);
    });

    it('should check parent container', () => {
      const parent = new Container();
      parent.register('Shared', TestService);
      const child = parent.createChild();
      expect(child.isRegistered('Shared')).toBe(true);
    });
  });

  describe('createChild()', () => {
    it('should create a child container', () => {
      const child = container.createChild();
      expect(child).toBeInstanceOf(Container);
    });

    it('child should have parent reference', () => {
      const child = container.createChild();
      child.register('ChildOnly', TestService);
      expect(child.isRegistered('ChildOnly')).toBe(true);
    });

    it('child should inherit parent registrations', () => {
      container.register('ParentService', TestService);
      const child = container.createChild();
      expect(child.isRegistered('ParentService')).toBe(true);
      const resolved = child.resolve<TestService>('ParentService');
      expect(resolved).toBeInstanceOf(TestService);
    });

    it('child registrations should not affect parent', () => {
      container.register('ParentService', TestService);
      const child = container.createChild();
      child.register('ParentService', AnotherService);
      const parentResolved = container.resolve<TestService>('ParentService');
      const childResolved = child.resolve<AnotherService>('ParentService');
      expect(parentResolved).toBeInstanceOf(TestService);
      expect(childResolved).toBeInstanceOf(AnotherService);
    });
  });

  describe('createScope()', () => {
    it('should create a scoped container', () => {
      const scope = container.createScope();
      expect(scope).toBeInstanceOf(Container);
    });

    it('scope should have parent reference', () => {
      container.register('Shared', TestService);
      const scope = container.createScope();
      expect(scope.isRegistered('Shared')).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should clear all registrations', () => {
      container.register(TestService, TestService);
      container.register(AnotherService, AnotherService);
      container.clear();
      expect(container.isRegistered(TestService)).toBe(false);
      expect(container.isRegistered(AnotherService)).toBe(false);
    });

    it('should not affect parent container', () => {
      const parent = new Container();
      parent.register('Shared', TestService);
      const child = parent.createChild();
      child.register('Local', AnotherService);
      child.clear();
      expect(child.isRegistered('Local')).toBe(false);
      expect(child.isRegistered('Shared')).toBe(true);
    });
  });

  describe('lifecycle modes', () => {
    it('should handle transient lifecycle', () => {
      container.register(TestService, TestService, { lifecycle: 'transient' });
      const instance1 = container.resolve<TestService>(TestService);
      const instance2 = container.resolve<TestService>(TestService);
      expect(instance1).not.toBe(instance2);
    });

    it('should handle singleton lifecycle', () => {
      container.register(TestService, TestService, { lifecycle: 'singleton' });
      const instance1 = container.resolve<TestService>(TestService);
      const instance2 = container.resolve<TestService>(TestService);
      expect(instance1).toBe(instance2);
    });

    it('should handle scoped lifecycle', () => {
      container.register(TestService, TestService, { lifecycle: 'scoped' });
      const instance1 = container.resolve<TestService>(TestService);
      const instance2 = container.resolve<TestService>(TestService);
      expect(instance1).toBe(instance2);
    });
  });

  describe('ServiceProviderConfig format', () => {
    it('should support useClass config', () => {
      container.register('TestService', { useClass: TestService });
      const resolved = container.resolve<TestService>('TestService');
      expect(resolved).toBeInstanceOf(TestService);
    });

    it('should support useFactory config', () => {
      container.register('TestService', {
        useFactory: (c: Container) => new TestService('FactoryCreated')
      });
      const resolved = container.resolve<TestService>('TestService');
      expect(resolved.name).toBe('FactoryCreated');
    });

    it('should support useValue config', () => {
      const config = { apiUrl: 'https://api.example.com' };
      container.register('ApiConfig', { useValue: config });
      const resolved = container.resolve('ApiConfig');
      expect(resolved).toEqual(config);
    });

    it('should support dependencies array', () => {
      container.register(TestService, TestService);
      container.register('Dependent', {
        useClass: DependentService,
        dependencies: [TestService]
      });
      const resolved = container.resolve<DependentService>('Dependent');
      expect(resolved).toBeInstanceOf(DependentService);
    });
  });

  describe('rootContainer', () => {
    it('should have rootContainer exported', () => {
      expect(Container).toBeDefined();
    });
  });

  describe('decorators', () => {
    it('should support injectable decorator', () => {
      @injectable
      class DecoratedService {
        getValue() {
          return 'Decorated';
        }
      }
      const instance = new DecoratedService();
      expect(instance.getValue()).toBe('Decorated');
    });

    it('should support inject decorator', () => {
      class ServiceA {
        getValue() { return 'A'; }
      }
      class ServiceB {
        constructor(
          @inject('ServiceA') public serviceA: ServiceA
        ) {}
      }
      expect(inject).toBeDefined();
    });
  });
});