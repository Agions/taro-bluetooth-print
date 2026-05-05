/**
 * 依赖注入容器
 * 提供现代化的依赖管理和服务定位功能
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;
export type Factory<T> = (container: Container) => T;
export type Provider<T> = Constructor<T> | Factory<T> | T;

export interface RegistrationOptions {
  /** 是否单例 */
  singleton?: boolean;
  /** 生命周期 */
  lifecycle?: 'transient' | 'singleton' | 'scoped';
  /** 标签，用于区分同一接口的不同实现 */
  tag?: string;
}

/**
 * Angular 风格的服务提供者配置
 */
export interface ServiceProviderConfig<T = unknown> {
  /** 使用类 */
  useClass?: Constructor<T>;
  /** 使用工厂函数 */
  useFactory?: Factory<T>;
  /** 使用实例值 */
  useValue?: T;
  /** 生命周期 */
  lifecycle?: 'transient' | 'singleton' | 'scoped';
  /** 依赖项 */
  dependencies?: (string | symbol | Constructor<unknown>)[];
}

interface Registration<T> {
  provider: Provider<T>;
  options: RegistrationOptions;
  instance?: T;
}

export class Container {
  private registrations = new Map<string | symbol, Registration<unknown>[]>();
  private parent?: Container;
  private scopedInstances = new Map<string | symbol, unknown>();

  constructor(parent?: Container) {
    this.parent = parent;
  }

  /**
   * 创建子容器
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * 注册服务
   */
  register<T>(
    token: string | symbol | Constructor<T>,
    provider: Provider<T> | ServiceProviderConfig<T>,
    options: RegistrationOptions = {}
  ): this {
    const key = this.getTokenKey(token);

    // 支持 ServiceProviderConfig 格式
    const config = provider as ServiceProviderConfig<T>;

    // 如果是对象语法（Angular 风格）
    if (
      config &&
      typeof config === 'object' &&
      (config.useClass || config.useFactory || config.useValue !== undefined)
    ) {
      let actualProvider: Provider<T>;

      if (config.useClass) {
        // 使用类 - 创建工厂函数来解析依赖
        const Cls = config.useClass;
        actualProvider = (container: Container) => {
          return container.createInstance(Cls);
        };
      } else if (config.useFactory) {
        actualProvider = config.useFactory;
      } else {
        actualProvider = config.useValue as T;
      }

      const registration: Registration<T> = {
        provider: actualProvider,
        options: {
          lifecycle: config.lifecycle || 'transient',
          ...options,
        },
      };

      if (!this.registrations.has(key)) {
        this.registrations.set(key, []);
      }
      this.registrations.get(key)!.push(registration);
      return this;
    }

    // 原有逻辑：Provider<T> 格式
    const registration: Registration<T> = {
      provider: provider as Provider<T>,
      options: {
        lifecycle: 'transient',
        ...options,
      },
    };

    if (!this.registrations.has(key)) {
      this.registrations.set(key, []);
    }
    this.registrations.get(key)!.push(registration);
    return this;
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(token: string | symbol | Constructor<T>, provider: Provider<T>): this {
    return this.register(token, provider, { lifecycle: 'singleton' });
  }

  /**
   * 注册类型映射
   */
  registerType<T>(
    from: string | symbol | Constructor<T>,
    to: Constructor<T>,
    options: RegistrationOptions = {}
  ): this {
    return this.register(from, c => c.resolve(to), options);
  }

  /**
   * 注册实例
   */
  registerInstance<T>(token: string | symbol | Constructor<T>, instance: T): this {
    return this.register(token, instance, { lifecycle: 'singleton' });
  }

  /**
   * 解析服务
   */
  resolve<T>(token: string | symbol | Constructor<T>, tag?: string): T {
    const key = this.getTokenKey(token);

    // 1. 检查当前容器的注册
    const registrations = this.registrations.get(key);
    if (registrations) {
      const registration = tag
        ? registrations.find(r => r.options.tag === tag)
        : registrations[registrations.length - 1];

      if (registration) {
        return this.getOrCreateInstance(registration as Registration<T>, key);
      }
    }

    // 2. 检查父容器
    if (this.parent) {
      return this.parent.resolve(token, tag);
    }

    // 3. 如果是构造函数，自动创建实例
    if (typeof token === 'function' && this.isConstructor(token)) {
      return this.createInstance(token);
    }

    throw new Error(`No registration found for token: ${String(key)}`);
  }

  /**
   * 解析所有注册的服务
   */
  resolveAll<T>(token: string | symbol | Constructor<T>): T[] {
    const key = this.getTokenKey(token);
    const results: T[] = [];

    // 从当前容器获取
    const registrations = this.registrations.get(key);
    if (registrations) {
      for (const r of registrations) {
        results.push(this.getOrCreateInstance(r as Registration<T>, key));
      }
    }

    // 从父容器获取
    if (this.parent) {
      results.push(...this.parent.resolveAll(token));
    }

    return results;
  }

  /**
   * 检查是否已注册
   */
  isRegistered<T>(token: string | symbol | Constructor<T>): boolean {
    const key = this.getTokenKey(token);
    return this.registrations.has(key) || (this.parent?.isRegistered(token) ?? false);
  }

  /**
   * 清除所有注册
   */
  clear(): void {
    this.registrations.clear();
    this.scopedInstances.clear();
  }

  /**
   * 创建作用域
   */
  createScope(): Container {
    return this.createChild();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTokenKey(token: string | symbol | Constructor<any>): string | symbol {
    if (typeof token === 'function') {
      return token.name || (token as unknown as symbol);
    }
    return token;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private isConstructor(fn: Function): boolean {
    return (
      typeof fn.prototype === 'object' &&
      fn.prototype !== null &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fn.prototype.constructor === fn
    );
  }

  private getOrCreateInstance<T>(registration: Registration<T>, key: string | symbol): T {
    const { provider, options } = registration;

    // 单例模式
    if (options.lifecycle === 'singleton') {
      if (registration.instance === undefined) {
        registration.instance = this.createProviderInstance(provider);
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return registration.instance as T; // 需要断言因为 instance 是 unknown 类型
    }

    // 作用域模式
    if (options.lifecycle === 'scoped') {
      if (this.scopedInstances.has(key)) {
        return this.scopedInstances.get(key) as T;
      }
      const instance = this.createProviderInstance(provider);
      this.scopedInstances.set(key, instance);
      return instance;
    }

    // 瞬态模式
    return this.createProviderInstance(provider);
  }

  private createProviderInstance<T>(provider: Provider<T>): T {
    if (typeof provider === 'function') {
      // 工厂函数
      if (provider.length === 1 && !this.isConstructor(provider)) {
        return (provider as Factory<T>)(this);
      }
      // 构造函数
      return this.createInstance(provider as Constructor<T>);
    }
    // 实例
    return provider;
  }

  private createInstance<T>(constructor: Constructor<T>): T {
    // 获取构造函数的参数类型（简化实现，实际可能需要反射元数据）
    const paramCount = constructor.length;
    const args: unknown[] = [];

    for (let i = 0; i < paramCount; i++) {
      // 尝试从容器解析参数
      // 这里简化处理，实际应该使用参数装饰器
      args.push(undefined);
    }

    return new constructor(...args);
  }
}

// 全局容器实例
export const rootContainer = new Container();

// 装饰器辅助函数
export function injectable<T extends Constructor<object>>(constructor: T): T {
  // 标记类为可注入
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (constructor as unknown as { __injectable: boolean }).__injectable = true;
  return constructor;
}

export function inject(token: string | symbol) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any, _propertyKey: string | symbol, parameterIndex: number) {
    // 存储注入元数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const existingInjections: (string | symbol)[] =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (target.__injections as (string | symbol)[]) || [];
    existingInjections[parameterIndex] = token;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    target.__injections = existingInjections;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return target;
  };
}
