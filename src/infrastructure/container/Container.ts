/**
 * 依赖注入容器实现
 */

import {
  IContainer,
  IServiceScope,
  ServiceLifetime,
  ServiceDescriptor as IServiceDescriptor,
  ServiceRegistration,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ContainerOptions,
  CircularDependencyOptions
} from './types';
import { ServiceDescriptor } from './ServiceDescriptor';
import { ServiceScope } from './ServiceScope';

/**
 * 依赖注入容器实现类
 */
export class Container implements IContainer {
  /** 服务注册表 */
  private readonly services: Map<string | symbol | Function, IServiceDescriptor> = new Map();

  /** 令牌映射（用于字符串和符号令牌） */
  private readonly tokenMap: Map<string, string | symbol | Function> = new Map();

  /** 作用域列表 */
  private readonly scopes: Set<IServiceScope> = new Set();

  /** 容器选项 */
  private readonly options: Required<ContainerOptions>;

  /** 是否已销毁 */
  private isDisposed: boolean = false;

  /** 创建时间 */
  public readonly createdAt: number;

  /** 解析统计 */
  private resolveStats: Map<string | symbol | Function, number> = new Map();

  constructor(options: ContainerOptions = {}) {
    this.options = {
      autoRegister: options.autoRegister || false,
      enableCircularDependencyDetection: options.enableCircularDependencyDetection !== false,
      circularDependencyOptions: {
        maxDepth: 50,
        includeTransient: false,
        ...options.circularDependencyOptions
      },
      defaultLifetime: options.defaultLifetime || ServiceLifetime.Transient,
      strictMode: options.strictMode || false,
      name: options.name || 'DefaultContainer',
      parent: options.parent || null
    };

    this.createdAt = Date.now();
  }

  /**
   * 注册服务
   */
  public register<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration,
    lifetime?: ServiceLifetime
  ): IContainer {
    if (this.isDisposed) {
      throw new Error('Cannot register services in disposed container');
    }

    const actualLifetime = lifetime || this.options.defaultLifetime;

    if (typeof implementation === 'function') {
      this.registerService(token, implementation, actualLifetime);
    } else {
      this.registerServiceWithRegistration(token, implementation, actualLifetime);
    }

    return this;
  }

  /**
   * 注册单例服务
   */
  public registerSingleton<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration
  ): IContainer {
    return this.register(token, implementation, ServiceLifetime.Singleton);
  }

  /**
   * 注册瞬态服务
   */
  public registerTransient<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration
  ): IContainer {
    return this.register(token, implementation, ServiceLifetime.Transient);
  }

  /**
   * 注册作用域服务
   */
  public registerScoped<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration
  ): IContainer {
    return this.register(token, implementation, ServiceLifetime.Scoped);
  }

  /**
   * 注册工厂函数
   */
  public registerFactory<T>(
    token: string | symbol | Function,
    factory: (...args: any[]) => T,
    lifetime: ServiceLifetime = ServiceLifetime.Transient
  ): IContainer {
    if (this.isDisposed) {
      throw new Error('Cannot register services in disposed container');
    }

    const descriptor = new ServiceDescriptor(token, factory, lifetime, {
      factory: factory as any,
      dependencies: []
    });

    this.addService(descriptor);
    return this;
  }

  /**
   * 注册实例
   */
  public registerInstance<T>(
    token: string | symbol | Function,
    instance: T
  ): IContainer {
    if (this.isDisposed) {
      throw new Error('Cannot register services in disposed container');
    }

    const descriptor = new ServiceDescriptor(token, instance.constructor || Object, ServiceLifetime.Singleton, {
      instance: instance,
      dependencies: []
    });

    this.addService(descriptor);
    return this;
  }

  /**
   * 解析服务
   */
  public resolve<T>(token: string | symbol | Function): T {
    if (this.isDisposed) {
      throw new Error('Cannot resolve services from disposed container');
    }

    const descriptor = this.getServiceDescriptor(token);
    if (!descriptor) {
      throw new Error(`Service not registered: ${this.getTokenName(token)}`);
    }

    // 循环依赖检测
    if (this.options.enableCircularDependencyDetection) {
      this.detectCircularDependency(token, new Set());
    }

    // 更新解析统计
    const currentCount = this.resolveStats.get(token) || 0;
    this.resolveStats.set(token, currentCount + 1);

    return descriptor.createInstance(this);
  }

  /**
   * 尝试解析服务
   */
  public tryResolve<T>(token: string | symbol | Function): T | null {
    try {
      return this.resolve<T>(token);
    } catch {
      return null;
    }
  }

  /**
   * 解析所有匹配的服务
   */
  public resolveAll<T>(token: string | symbol | Function): T[] {
    const results: T[] = [];

    // 遍历所有注册的服务，查找匹配的服务
    for (const [serviceToken, descriptor] of this.services) {
      if (this.isTokenMatch(token, serviceToken)) {
        results.push(this.resolve<T>(serviceToken));
      }
    }

    return results;
  }

  /**
   * 检查服务是否已注册
   */
  public isRegistered(token: string | symbol | Function): boolean {
    return this.services.has(token);
  }

  /**
   * 创建作用域
   */
  public createScope(): IServiceScope {
    if (this.isDisposed) {
      throw new Error('Cannot create scope from disposed container');
    }

    const scope = new ServiceScope(this);
    this.scopes.add(scope);

    // 添加作用域销毁监听
    const originalDispose = scope.dispose.bind(scope);
    scope.dispose = () => {
      originalDispose();
      this.scopes.delete(scope);
    };

    return scope;
  }

  /**
   * 获取服务描述符
   */
  public getDescriptor(token: string | symbol | Function): IServiceDescriptor | null {
    return this.getServiceDescriptor(token);
  }

  /**
   * 移除服务注册
   */
  public remove(token: string | symbol | Function): boolean {
    if (this.isDisposed) {
      return false;
    }

    return this.services.delete(token);
  }

  /**
   * 清空所有注册
   */
  public clear(): void {
    if (this.isDisposed) {
      return;
    }

    this.services.clear();
    this.tokenMap.clear();
    this.resolveStats.clear();
  }

  /**
   * 获取所有已注册的服务令牌
   */
  public getRegisteredTokens(): (string | symbol | Function)[] {
    return Array.from(this.services.keys());
  }

  /**
   * 验证依赖关系
   */
  public validateDependencies(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查每个服务
    for (const [token, descriptor] of this.services) {
      // 验证描述符
      const validation = descriptor.validate();
      if (!validation.isValid) {
        errors.push(...validation.errors.map(error => ({
          type: 'invalid_implementation' as const,
          token,
          message: error
        })));
      }

      // 检查依赖项是否存在
      for (const dependency of descriptor.dependencies) {
        if (!this.isRegistered(dependency)) {
          errors.push({
            type: 'missing_dependency',
            token,
            message: `Dependency not registered: ${this.getTokenName(dependency)}`,
            details: { dependency }
          });
        }
      }

      // 检查循环依赖
      if (this.options.enableCircularDependencyDetection) {
        try {
          this.detectCircularDependency(token, new Set());
        } catch (error) {
          errors.push({
            type: 'circular_dependency',
            token,
            message: error.message
          });
        }
      }

      // 检查潜在内存泄漏
      if (descriptor.lifetime === ServiceLifetime.Singleton && !descriptor.lazy) {
        if (descriptor.dependencies.length === 0 && descriptor.resolveCount === 0) {
          warnings.push({
            type: 'potential_memory_leak',
            token,
            message: 'Singleton service with no dependencies and no resolution may indicate potential memory leak'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 销毁容器
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // 销毁所有作用域
    for (const scope of this.scopes) {
      scope.dispose();
    }
    this.scopes.clear();

    // 销毁所有单例实例
    for (const descriptor of this.services.values()) {
      if (descriptor.instance && typeof descriptor.instance.dispose === 'function') {
        try {
          descriptor.instance.dispose();
        } catch (error) {
          console.error('Error disposing singleton service:', error);
        }
      }
    }

    // 清理所有数据
    this.services.clear();
    this.tokenMap.clear();
    this.resolveStats.clear();
    this.isDisposed = true;
  }

  /**
   * 获取容器统计信息
   */
  public getStats(): any {
    const stats = {
      name: this.options.name,
      createdAt: new Date(this.createdAt).toISOString(),
      isDisposed: this.isDisposed,
      serviceCount: this.services.size,
      scopeCount: this.scopes.size,
      services: [] as any[],
      resolveStats: {} as any,
      totalResolves: 0
    };

    // 收集服务统计
    for (const [token, descriptor] of this.services) {
      const serviceStats = descriptor.getInfo();
      stats.services.push(serviceStats);
      stats.totalResolves += serviceStats.resolveCount;
    }

    // 收集解析统计
    for (const [token, count] of this.resolveStats) {
      stats.resolveStats[this.getTokenName(token)] = count;
    }

    return stats;
  }

  // 私有方法

  /**
   * 注册服务
   */
  private registerService(
    token: string | symbol | Function,
    implementation: Function,
    lifetime: ServiceLifetime
  ): void {
    const descriptor = new ServiceDescriptor(token, implementation, lifetime);
    this.addService(descriptor);
  }

  /**
   * 通过注册配置注册服务
   */
  private registerServiceWithRegistration(
    token: string | symbol | Function,
    registration: ServiceRegistration,
    lifetime: ServiceLifetime
  ): void {
    const descriptor = new ServiceDescriptor(token, registration.implementation, lifetime, {
      factory: registration.factory,
      dependencies: registration.dependencies,
      tags: registration.tags,
      lazy: registration.lazy,
      args: registration.args
    });

    this.addService(descriptor);
  }

  /**
   * 添加服务到注册表
   */
  private addService(descriptor: IServiceDescriptor): void {
    if (this.options.strictMode && this.services.has(descriptor.token)) {
      throw new Error(`Service already registered: ${this.getTokenName(descriptor.token)}`);
    }

    this.services.set(descriptor.token, descriptor);

    // 更新令牌映射
    if (typeof descriptor.token === 'string' || typeof descriptor.token === 'symbol') {
      this.tokenMap.set(descriptor.token.toString(), descriptor.token);
    }
  }

  /**
   * 获取服务描述符
   */
  private getServiceDescriptor(token: string | symbol | Function): IServiceDescriptor | null {
    // 直接查找
    if (this.services.has(token)) {
      return this.services.get(token)!;
    }

    // 通过字符串映射查找
    if (typeof token === 'string' && this.tokenMap.has(token)) {
      const mappedToken = this.tokenMap.get(token)!;
      return this.services.get(mappedToken) || null;
    }

    // 检查父容器
    if (this.options.parent) {
      return this.options.parent.getDescriptor(token);
    }

    return null;
  }

  /**
   * 检测循环依赖
   */
  private detectCircularDependency(
    token: string | symbol | Function,
    visited: Set<string | symbol | Function>,
    depth: number = 0
  ): void {
    const maxDepth = this.options.circularDependencyOptions.maxDepth;

    if (depth > maxDepth) {
      throw new Error(`Maximum dependency depth (${maxDepth}) exceeded, possible circular dependency`);
    }

    if (visited.has(token)) {
      const path = Array.from(visited).map(t => this.getTokenName(t)).join(' -> ');
      throw new Error(`Circular dependency detected: ${path} -> ${this.getTokenName(token)}`);
    }

    const descriptor = this.getServiceDescriptor(token);
    if (!descriptor) {
      return;
    }

    // 跳过瞬态服务（如果配置）
    if (!this.options.circularDependencyOptions.includeTransient &&
        descriptor.lifetime === ServiceLifetime.Transient) {
      return;
    }

    visited.add(token);

    // 检查所有依赖项
    for (const dependency of descriptor.dependencies) {
      this.detectCircularDependency(dependency, new Set(visited), depth + 1);
    }
  }

  /**
   * 检查令牌是否匹配
   */
  private isTokenMatch(token1: string | symbol | Function, token2: string | symbol | Function): boolean {
    if (token1 === token2) {
      return true;
    }

    if (typeof token1 === 'string' && typeof token2 === 'string') {
      return token1 === token2;
    }

    if (typeof token1 === 'symbol' && typeof token2 === 'symbol') {
      return token1 === token2;
    }

    if (typeof token1 === 'function' && typeof token2 === 'function') {
      return token1 === token2;
    }

    return false;
  }

  /**
   * 获取令牌名称
   */
  private getTokenName(token: string | symbol | Function): string {
    if (typeof token === 'string') {
      return token;
    }

    if (typeof token === 'symbol') {
      return token.toString();
    }

    if (typeof token === 'function') {
      return token.name || 'AnonymousFunction';
    }

    return 'UnknownToken';
  }
}