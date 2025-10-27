# 依赖注入容器和工厂模式设计

## 设计目标

1. **解耦依赖关系**：消除硬编码的依赖关系
2. **支持测试**：便于在测试中替换依赖
3. **生命周期管理**：支持单例、瞬态等不同生命周期
4. **配置驱动**：支持通过配置注册服务
5. **类型安全**：提供TypeScript类型支持

## IoC容器设计

### 核心接口定义

```typescript
/**
 * 服务生命周期枚举
 */
export enum ServiceLifecycle {
  /** 单例模式，整个容器生命周期内只有一个实例 */
  Singleton = 'singleton',
  /** 瞬态模式，每次解析都创建新实例 */
  Transient = 'transient',
  /** 作用域模式，在特定作用域内是单例 */
  Scoped = 'scoped'
}

/**
 * 服务工厂函数类型
 */
export type ServiceFactory<T> = (container: IIoCContainer) => T;

/**
 * 服务描述符
 */
export interface ServiceDescriptor<T = unknown> {
  /** 服务标识符 */
  key: string;
  /** 工厂函数 */
  factory: ServiceFactory<T>;
  /** 生命周期 */
  lifecycle: ServiceLifecycle;
  /** 服务实例（仅用于单例模式） */
  instance?: T;
  /** 创建时间戳 */
  createdAt?: number;
  /** 是否已初始化 */
  initialized?: boolean;
}

/**
 * IoC容器接口
 */
export interface IIoCContainer {
  /**
   * 注册服务
   * @param key 服务标识符
   * @param factory 工厂函数
   * @param lifecycle 生命周期
   */
  register<T>(key: string, factory: ServiceFactory<T>, lifecycle?: ServiceLifecycle): IIoCContainer;

  /**
   * 注册单例服务
   * @param key 服务标识符
   * @param factory 工厂函数
   */
  registerSingleton<T>(key: string, factory: ServiceFactory<T>): IIoCContainer;

  /**
   * 注册瞬态服务
   * @param key 服务标识符
   * @param factory 工厂函数
   */
  registerTransient<T>(key: string, factory: ServiceFactory<T>): IIoCContainer;

  /**
   * 注册作用域服务
   * @param key 服务标识符
   * @param factory 工厂函数
   */
  registerScoped<T>(key: string, factory: ServiceFactory<T>): IIoCContainer;

  /**
   * 注册实例
   * @param key 服务标识符
   * @param instance 服务实例
   */
  registerInstance<T>(key: string, instance: T): IIoCContainer;

  /**
   * 解析服务
   * @param key 服务标识符
   * @throws 如果服务未注册则抛出异常
   */
  resolve<T>(key: string): T;

  /**
   * 尝试解析服务
   * @param key 服务标识符
   * @returns 服务实例或null
   */
  tryResolve<T>(key: string): T | null;

  /**
   * 检查服务是否已注册
   * @param key 服务标识符
   */
  has(key: string): boolean;

  /**
   * 移除服务
   * @param key 服务标识符
   */
  remove(key: string): boolean;

  /**
   * 清空所有服务
   */
  clear(): void;

  /**
   * 获取所有已注册的服务键
   */
  getRegisteredKeys(): string[];

  /**
   * 创建子容器
   */
  createChild(): IIoCContainer;

  /**
   * 释放资源
   */
  dispose(): void;
}
```

### 容器实现

```typescript
/**
 * IoC容器实现
 */
export class IoCContainer implements IIoCContainer {
  private services = new Map<string, ServiceDescriptor>();
  private disposed = false;
  private parent?: IIoCContainer;

  constructor(parent?: IIoCContainer) {
    this.parent = parent;
  }

  register<T>(key: string, factory: ServiceFactory<T>, lifecycle: ServiceLifecycle = ServiceLifecycle.Transient): IIoCContainer {
    this.throwIfDisposed();

    if (this.has(key)) {
      throw new Error(`Service '${key}' is already registered`);
    }

    this.services.set(key, {
      key,
      factory,
      lifecycle,
      initialized: false
    });

    return this;
  }

  registerSingleton<T>(key: string, factory: ServiceFactory<T>): IIoCContainer {
    return this.register(key, factory, ServiceLifecycle.Singleton);
  }

  registerTransient<T>(key: string, factory: ServiceFactory<T>): IIoCContainer {
    return this.register(key, factory, ServiceLifecycle.Transient);
  }

  registerScoped<T>(key: string, factory: ServiceFactory<T>): IIoCContainer {
    return this.register(key, factory, ServiceLifecycle.Scoped);
  }

  registerInstance<T>(key: string, instance: T): IIoCContainer {
    this.throwIfDisposed();

    if (this.has(key)) {
      throw new Error(`Service '${key}' is already registered`);
    }

    this.services.set(key, {
      key,
      factory: () => instance,
      lifecycle: ServiceLifecycle.Singleton,
      instance,
      initialized: true,
      createdAt: Date.now()
    });

    return this;
  }

  resolve<T>(key: string): T {
    this.throwIfDisposed();

    // 检查当前容器
    if (this.has(key)) {
      return this.createInstance<T>(key);
    }

    // 检查父容器
    if (this.parent?.has(key)) {
      return this.parent.resolve<T>(key);
    }

    throw new Error(`Service '${key}' is not registered`);
  }

  tryResolve<T>(key: string): T | null {
    try {
      return this.resolve<T>(key);
    } catch {
      return null;
    }
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  remove(key: string): boolean {
    this.throwIfDisposed();
    return this.services.delete(key);
  }

  clear(): void {
    this.throwIfDisposed();
    this.services.clear();
  }

  getRegisteredKeys(): string[] {
    return Array.from(this.services.keys());
  }

  createChild(): IIoCContainer {
    return new IoCContainer(this);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    // 释放所有可释放的服务
    for (const descriptor of this.services.values()) {
      if (descriptor.instance && typeof (descriptor.instance as any).dispose === 'function') {
        try {
          (descriptor.instance as any).dispose();
        } catch (error) {
          console.warn(`Error disposing service '${descriptor.key}':`, error);
        }
      }
    }

    this.services.clear();
    this.disposed = true;
  }

  private createInstance<T>(key: string): T {
    const descriptor = this.services.get(key);
    if (!descriptor) {
      throw new Error(`Service '${key}' not found`);
    }

    switch (descriptor.lifecycle) {
      case ServiceLifecycle.Singleton:
        return this.getOrCreateSingleton<T>(descriptor);

      case ServiceLifecycle.Transient:
        return descriptor.factory(this);

      case ServiceLifecycle.Scoped:
        return descriptor.factory(this);

      default:
        throw new Error(`Unsupported lifecycle: ${descriptor.lifecycle}`);
    }
  }

  private getOrCreateSingleton<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.initialized && descriptor.instance) {
      return descriptor.instance;
    }

    descriptor.instance = descriptor.factory(this);
    descriptor.initialized = true;
    descriptor.createdAt = Date.now();

    return descriptor.instance;
  }

  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }
  }
}
```

## 工厂模式设计

### 抽象工厂接口

```typescript
/**
 * 抽象工厂接口
 */
export interface IAbstractFactory<T> {
  /**
   * 创建产品
   * @param config 配置参数
   */
  create(config?: unknown): T;

  /**
   * 检查是否支持创建指定类型的产品
   * @param type 产品类型
   */
  supports(type: string): boolean;

  /**
   * 获取支持的产品类型列表
   */
  getSupportedTypes(): string[];
}

/**
 * 工厂注册表接口
 */
export interface IFactoryRegistry<T> {
  /**
   * 注册工厂
   * @param type 产品类型
   * @param factory 工厂实例
   */
  register(type: string, factory: IAbstractFactory<T>): void;

  /**
   * 获取工厂
   * @param type 产品类型
   */
  getFactory(type: string): IAbstractFactory<T> | null;

  /**
   * 创建产品
   * @param type 产品类型
   * @param config 配置参数
   */
  create(type: string, config?: unknown): T;

  /**
   * 检查是否支持指定类型
   * @param type 产品类型
   */
  supports(type: string): boolean;

  /**
   * 获取所有支持的类型
   */
  getSupportedTypes(): string[];

  /**
   * 移除工厂
   * @param type 产品类型
   */
  unregister(type: string): boolean;

  /**
   * 清空所有工厂
   */
  clear(): void;
}
```

### 工厂注册表实现

```typescript
/**
 * 工厂注册表实现
 */
export class FactoryRegistry<T> implements IFactoryRegistry<T> {
  private factories = new Map<string, IAbstractFactory<T>>();

  register(type: string, factory: IAbstractFactory<T>): void {
    if (this.factories.has(type)) {
      throw new Error(`Factory for type '${type}' is already registered`);
    }
    this.factories.set(type, factory);
  }

  getFactory(type: string): IAbstractFactory<T> | null {
    return this.factories.get(type) || null;
  }

  create(type: string, config?: unknown): T {
    const factory = this.getFactory(type);
    if (!factory) {
      throw new Error(`No factory registered for type '${type}'`);
    }
    return factory.create(config);
  }

  supports(type: string): boolean {
    return this.factories.has(type);
  }

  getSupportedTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  unregister(type: string): boolean {
    return this.factories.delete(type);
  }

  clear(): void {
    this.factories.clear();
  }
}
```

## 蓝牙适配器工厂设计

### 蓝牙适配器工厂

```typescript
/**
 * 蓝牙适配器工厂
 */
export class BluetoothAdapterFactory implements IAbstractFactory<IBluetoothAdapter> {
  private static readonly SUPPORTED_TYPES = [
    'weapp',
    'h5',
    'rn',
    'harmony'
  ];

  constructor(private container: IIoCContainer) {}

  create(platform?: string): IBluetoothAdapter {
    const targetPlatform = platform || this.detectPlatform();

    if (!this.supports(targetPlatform)) {
      throw new Error(`Unsupported platform: ${targetPlatform}`);
    }

    switch (targetPlatform) {
      case 'weapp':
        return this.container.resolve<WeAppBluetoothAdapter>('WeAppBluetoothAdapter');

      case 'h5':
        return this.container.resolve<H5BluetoothAdapter>('H5BluetoothAdapter');

      case 'rn':
        return this.container.resolve<RNBluetoothAdapter>('RNBluetoothAdapter');

      case 'harmony':
        return this.container.resolve<HarmonyBluetoothAdapter>('HarmonyBluetoothAdapter');

      default:
        throw new Error(`Platform '${targetPlatform}' not implemented`);
    }
  }

  supports(type: string): boolean {
    return BluetoothAdapterFactory.SUPPORTED_TYPES.includes(type);
  }

  getSupportedTypes(): string[] {
    return [...BluetoothAdapterFactory.SUPPORTED_TYPES];
  }

  private detectPlatform(): string {
    // 平台检测逻辑
    // 这里可以集成Taro的平台检测API
    return 'weapp'; // 示例
  }
}
```

### 服务注册配置

```typescript
/**
 * 服务注册配置类
 */
export class ServiceRegistry {
  /**
   * 注册核心服务
   * @param container IoC容器
   */
  static registerCoreServices(container: IIoCContainer): void {
    // 注册容器自身
    container.registerInstance('IoCContainer', container);

    // 注册事件总线
    container.registerSingleton('EventBus', () => new EventBus());

    // 注册配置管理器
    container.registerSingleton('ConfigurationManager', (c) =>
      new ConfigurationManager(c.resolve('EventBus'))
    );

    // 注册状态管理器
    container.registerSingleton('StateManager', () => new StateManager());

    // 注册蓝牙工厂注册表
    container.registerSingleton('BluetoothFactoryRegistry', () =>
      new FactoryRegistry<IBluetoothAdapter>()
    );

    // 注册蓝牙适配器工厂
    container.registerSingleton('BluetoothAdapterFactory', (c) =>
      new BluetoothAdapterFactory(c)
    );
  }

  /**
   * 注册蓝牙适配器
   * @param container IoC容器
   */
  static registerBluetoothAdapters(container: IIoCContainer): void {
    const factoryRegistry = container.resolve<FactoryRegistry<IBluetoothAdapter>>('BluetoothFactoryRegistry');
    const bluetoothFactory = new BluetoothAdapterFactory(container);

    // 注册工厂到注册表
    factoryRegistry.register('weapp', bluetoothFactory);
    factoryRegistry.register('h5', bluetoothFactory);
    factoryRegistry.register('rn', bluetoothFactory);
    factoryRegistry.register('harmony', bluetoothFactory);

    // 注册具体适配器实现
    container.registerTransient('WeAppBluetoothAdapter', () => new WeAppBluetoothAdapter());
    container.registerTransient('H5BluetoothAdapter', () => new H5BluetoothAdapter());
    container.registerTransient('RNBluetoothAdapter', () => new RNBluetoothAdapter());
    container.registerTransient('HarmonyBluetoothAdapter', () => new HarmonyBluetoothAdapter());
  }

  /**
   * 注册打印机服务
   * @param container IoC容器
   */
  static registerPrinterServices(container: IIoCContainer): void {
    // 注册打印机工厂
    container.registerSingleton('PrinterAdapterFactory', (c) =>
      new PrinterAdapterFactory(c)
    );

    // 注册命令队列服务
    container.registerSingleton('CommandQueueService', (c) =>
      new CommandQueueService(c.resolve('EventBus'))
    );

    // 注册打印机领域服务
    container.registerSingleton('PrinterDomainService', (c) =>
      new PrinterDomainService(
        c.resolve('CommandQueueService'),
        c.resolve('StateManager'),
        c.resolve('EventBus')
      )
    );
  }

  /**
   * 注册所有服务
   * @param container IoC容器
   */
  static registerAllServices(container: IIoCContainer): void {
    this.registerCoreServices(container);
    this.registerBluetoothAdapters(container);
    this.registerPrinterServices(container);
  }
}
```

## 使用示例

### 基本使用

```typescript
// 创建容器
const container = new IoCContainer();

// 注册服务
ServiceRegistry.registerAllServices(container);

// 解析并使用服务
const bluetoothService = container.resolve<BluetoothDomainService>('BluetoothDomainService');
await bluetoothService.initialize();

// 创建蓝牙适配器
const adapterFactory = container.resolve<BluetoothAdapterFactory>('BluetoothAdapterFactory');
const adapter = adapterFactory.create('weapp');
```

### 测试中的使用

```typescript
describe('BluetoothDomainService', () => {
  let container: IIoCContainer;
  let service: BluetoothDomainService;

  beforeEach(() => {
    container = new IoCContainer();

    // 注册Mock依赖
    container.registerInstance('EventBus', new MockEventBus());
    container.registerInstance('StateManager', new MockStateManager());
    container.registerInstance('BluetoothAdapterFactory', new MockBluetoothAdapterFactory());

    // 注册目标服务
    container.registerSingleton('BluetoothDomainService', (c) =>
      new BluetoothDomainService(
        c.resolve('BluetoothAdapterFactory'),
        c.resolve('StateManager'),
        c.resolve('EventBus')
      )
    );

    service = container.resolve('BluetoothDomainService');
  });

  it('should initialize successfully', async () => {
    await service.initialize();
    expect(service.isInitialized()).toBe(true);
  });
});
```

## 生命周期管理

### 作用域容器

```typescript
/**
 * 作用域容器，用于管理特定作用域内的服务生命周期
 */
export class ScopedContainer extends IoCContainer {
  private scopedServices = new Set<string>();

  /**
   * 注册作用域服务
   */
  registerScoped<T>(key: string, factory: ServiceFactory<T>): IIoCContainer {
    this.scopedServices.add(key);
    return super.registerScoped(key, factory);
  }

  /**
   * 清理作用域内的服务
   */
  disposeScope(): void {
    for (const key of this.scopedServices) {
      const descriptor = (this as any).services.get(key);
      if (descriptor?.instance && typeof descriptor.instance.dispose === 'function') {
        descriptor.instance.dispose();
      }
    }
    this.scopedServices.clear();
  }
}
```

这个依赖注入和工厂模式设计提供了：

1. **完整的IoC容器实现**：支持多种生命周期
2. **灵活的工厂模式**：支持动态类型注册
3. **类型安全**：完整的TypeScript类型支持
4. **测试友好**：便于Mock和单元测试
5. **扩展性强**：支持插件式架构

这为整个系统的解耦和可测试性奠定了坚实的基础。