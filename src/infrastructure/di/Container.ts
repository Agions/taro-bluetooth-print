/**
 * 依赖注入容器
 */

import { ServiceLifecycle, ServiceDescriptor } from './ServiceDescriptor';
import { ServiceScopeImpl } from './ServiceScope';
import { ServiceScope } from './ServiceScope';

export class Container {
  private services = new Map<string, ServiceDescriptor>();
  private scopedInstances = new Map<string, Map<string, any>>();
  private scopes = new Set<ServiceScope>();

  /**
   * 注册服务
   */
  register<T>(
    name: string,
    factory: () => T,
    lifecycle: ServiceLifecycle = ServiceLifecycle.TRANSIENT,
    dependencies?: string[]
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const descriptor = ServiceDescriptor.create(name, factory, lifecycle, dependencies);
    this.services.set(name, descriptor);
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(name: string, factory: () => T, dependencies?: string[]): void {
    this.register(name, factory, ServiceLifecycle.SINGLETON, dependencies);
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(name: string, factory: () => T, dependencies?: string[]): void {
    this.register(name, factory, ServiceLifecycle.TRANSIENT, dependencies);
  }

  /**
   * 注册作用域服务
   */
  registerScoped<T>(name: string, factory: () => T, dependencies?: string[]): void {
    this.register(name, factory, ServiceLifecycle.SCOPED, dependencies);
  }

  /**
   * 注册服务描述符
   */
  registerDescriptor<T>(descriptor: ServiceDescriptor<T>): void {
    if (this.services.has(descriptor.name)) {
      throw new Error(`Service '${descriptor.name}' is already registered`);
    }

    this.services.set(descriptor.name, descriptor);
  }

  /**
   * 解析服务
   */
  resolve<T>(name: string): T {
    const descriptor = this.services.get(name);
    if (!descriptor) {
      throw new Error(`Service '${name}' not found`);
    }

    switch (descriptor.lifecycle) {
      case ServiceLifecycle.SINGLETON:
        return this.resolveSingleton<T>(descriptor);
      case ServiceLifecycle.SCOPED:
        throw new Error(`Cannot resolve scoped service '${name}' without a scope. Use resolveInScope() instead.`);
      case ServiceLifecycle.TRANSIENT:
      default:
        return this.resolveTransient<T>(descriptor);
    }
  }

  /**
   * 在特定作用域中解析服务
   */
  resolveInScope<T>(name: string, scopeId: string): T {
    const descriptor = this.services.get(name);
    if (!descriptor) {
      throw new Error(`Service '${name}' not found`);
    }

    switch (descriptor.lifecycle) {
      case ServiceLifecycle.SINGLETON:
        return this.resolveSingleton<T>(descriptor);
      case ServiceLifecycle.SCOPED:
        return this.resolveScoped<T>(descriptor, scopeId);
      case ServiceLifecycle.TRANSIENT:
      default:
        return this.resolveTransient<T>(descriptor);
    }
  }

  private resolveSingleton<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.getInstance()) {
      return descriptor.getInstance()!;
    }

    const instance = this.createInstance<T>(descriptor);
    descriptor.setInstance(instance);
    return instance;
  }

  private resolveScoped<T>(descriptor: ServiceDescriptor<T>, scopeId: string): T {
    if (!this.scopedInstances.has(scopeId)) {
      this.scopedInstances.set(scopeId, new Map());
    }

    const scopeInstances = this.scopedInstances.get(scopeId)!;

    if (scopeInstances.has(descriptor.name)) {
      return scopeInstances.get(descriptor.name);
    }

    const instance = this.createInstance<T>(descriptor);
    scopeInstances.set(descriptor.name, instance);

    return instance;
  }

  private resolveTransient<T>(descriptor: ServiceDescriptor<T>): T {
    return this.createInstance<T>(descriptor);
  }

  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    try {
      // 检查循环依赖
      this.checkCircularDependencies(descriptor.name);

      // 解析依赖
      if (descriptor.dependencies && descriptor.dependencies.length > 0) {
        const dependencies = descriptor.dependencies.map(dep => this.resolve(dep));
        return descriptor.factory(...dependencies);
      }

      return descriptor.factory();
    } catch (error) {
      throw new Error(`Failed to create instance of '${descriptor.name}': ${error.message}`);
    }
  }

  private checkCircularDependencies(serviceName: string, visited = new Set<string>()): void {
    if (visited.has(serviceName)) {
      throw new Error(`Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${serviceName}`);
    }

    visited.add(serviceName);
    const descriptor = this.services.get(serviceName);

    if (descriptor?.dependencies) {
      for (const dependency of descriptor.dependencies) {
        this.checkCircularDependencies(dependency, new Set(visited));
      }
    }
  }

  /**
   * 创建作用域
   */
  createScope(): ServiceScope {
    const scopeId = this.generateScopeId();
    const scopedServices = new Map<string, ServiceDescriptor>();

    // 收集所有作用域服务
    for (const [name, descriptor] of this.services) {
      if (descriptor.lifecycle === ServiceLifecycle.SCOPED) {
        scopedServices.set(name, descriptor);
      }
    }

    const scope = new ServiceScopeImpl(this, scopedServices);
    this.scopes.add(scope);

    // 当作用域销毁时清理
    const originalDispose = scope.dispose.bind(scope);
    scope.dispose = () => {
      this.scopedInstances.delete(scopeId);
      this.scopes.delete(scope);
      originalDispose();
    };

    return scope;
  }

  private generateScopeId(): string {
    return `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查服务是否存在
   */
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 获取所有注册的服务名称
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 获取服务描述符
   */
  getDescriptor<T>(name: string): ServiceDescriptor<T> | undefined {
    return this.services.get(name) as ServiceDescriptor<T> | undefined;
  }

  /**
   * 注销服务
   */
  unregister(name: string): boolean {
    const descriptor = this.services.get(name);
    if (!descriptor) {
      return false;
    }

    // 清理单例实例
    if (descriptor.isSingleton()) {
      descriptor.clearInstance();
    }

    // 清理所有作用域中的实例
    for (const scopeInstances of this.scopedInstances.values()) {
      const instance = scopeInstances.get(name);
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.warn(`Failed to dispose scoped instance of '${name}':`, error);
        }
      }
      scopeInstances.delete(name);
    }

    return this.services.delete(name);
  }

  /**
   * 清理容器
   */
  dispose(): void {
    // 销毁所有作用域
    for (const scope of this.scopes) {
      try {
        scope.dispose();
      } catch (error) {
        console.warn('Failed to dispose scope:', error);
      }
    }

    // 清理单例实例
    for (const descriptor of this.services.values()) {
      if (descriptor.isSingleton()) {
        const instance = descriptor.getInstance();
        if (instance && typeof instance.dispose === 'function') {
          try {
            instance.dispose();
          } catch (error) {
            console.warn(`Failed to dispose singleton service '${descriptor.name}':`, error);
          }
        }
        descriptor.clearInstance();
      }
    }

    // 清理所有数据
    this.services.clear();
    this.scopedInstances.clear();
    this.scopes.clear();
  }

  /**
   * 获取容器统计信息
   */
  getStats(): any {
    const stats = {
      totalServices: this.services.size,
      singletonServices: 0,
      scopedServices: 0,
      transientServices: 0,
      activeScopes: this.scopes.size,
      totalScopedInstances: 0,
      services: [] as any[]
    };

    for (const descriptor of this.services.values()) {
      if (descriptor.isSingleton()) {
        stats.singletonServices++;
      } else if (descriptor.isScoped()) {
        stats.scopedServices++;
      } else {
        stats.transientServices++;
      }

      stats.services.push({
        name: descriptor.name,
        lifecycle: descriptor.lifecycle,
        hasInstance: descriptor.getInstance() !== null,
        dependencies: descriptor.dependencies
      });
    }

    for (const scopeInstances of this.scopedInstances.values()) {
      stats.totalScopedInstances += scopeInstances.size;
    }

    return stats;
  }
}