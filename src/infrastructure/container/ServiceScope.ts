/**
 * 服务作用域实现
 */

import { IServiceScope, ServiceLifetime } from './types';
import { Container } from './Container';

/**
 * 服务作用域实现类
 */
export class ServiceScope implements IServiceScope {
  /** 作用域唯一标识符 */
  public readonly id: string;

  /** 父容器 */
  private readonly container: Container;

  /** 作用域内的服务实例缓存 */
  private readonly scopedInstances: Map<string | symbol | Function, any> = new Map();

  /** 作用域内的单例实例 */
  private readonly singletonInstances: Map<string | symbol | Function, any> = new Map();

  /** 是否已销毁 */
  private isDisposed: boolean = false;

  /** 创建时间 */
  public readonly createdAt: number;

  /** 销毁回调列表 */
  private disposeCallbacks: (() => void)[] = [];

  constructor(container: Container) {
    this.id = this.generateId();
    this.container = container;
    this.createdAt = Date.now();
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 解析服务
   */
  public resolve<T>(token: string | symbol | Function): T {
    if (this.isDisposed) {
      throw new Error(`Cannot resolve service from disposed scope: ${this.id}`);
    }

    const descriptor = this.container.getDescriptor(token);
    if (!descriptor) {
      throw new Error(`Service not registered: ${this.getTokenName(token)}`);
    }

    // 根据生命周期解析服务
    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        return this.resolveSingleton<T>(descriptor);

      case ServiceLifetime.Scoped:
        return this.resolveScoped<T>(descriptor);

      case ServiceLifetime.Transient:
        return this.resolveTransient<T>(descriptor);

      default:
        throw new Error(`Unknown service lifetime: ${descriptor.lifetime}`);
    }
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
   * 检查服务是否已注册
   */
  public isRegistered(token: string | symbol | Function): boolean {
    return this.container.isRegistered(token);
  }

  /**
   * 解析单例服务
   */
  private resolveSingleton<T>(descriptor: any): T {
    // 检查作用域内是否有缓存的实例
    if (this.singletonInstances.has(descriptor.token)) {
      return this.singletonInstances.get(descriptor.token);
    }

    // 尝试从容器获取实例
    let instance = this.container.tryResolve(descriptor.token);
    if (!instance) {
      // 创建新实例
      instance = descriptor.createInstance(this.container, this);
      this.singletonInstances.set(descriptor.token, instance);
    }

    return instance;
  }

  /**
   * 解析作用域服务
   */
  private resolveScoped<T>(descriptor: any): T {
    // 检查作用域内是否已有实例
    if (this.scopedInstances.has(descriptor.token)) {
      return this.scopedInstances.get(descriptor.token);
    }

    // 创建新实例
    const instance = descriptor.createInstance(this.container, this);
    this.scopedInstances.set(descriptor.token, instance);

    // 如果实例有dispose方法，注册销毁回调
    if (instance && typeof instance.dispose === 'function') {
      this.disposeCallbacks.push(() => instance.dispose());
    }

    return instance;
  }

  /**
   * 解析瞬态服务
   */
  private resolveTransient<T>(descriptor: any): T {
    // 瞬态服务每次都创建新实例
    const instance = descriptor.createInstance(this.container, this);

    // 如果实例有dispose方法，注册销毁回调
    if (instance && typeof instance.dispose === 'function') {
      this.disposeCallbacks.push(() => instance.dispose());
    }

    return instance;
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

  /**
   * 获取作用域统计信息
   */
  public getStats(): any {
    return {
      id: this.id,
      createdAt: new Date(this.createdAt).toISOString(),
      isDisposed: this.isDisposed,
      scopedInstanceCount: this.scopedInstances.size,
      singletonInstanceCount: this.singletonInstances.size,
      disposeCallbacksCount: this.disposeCallbacks.length,
      scopedServices: Array.from(this.scopedInstances.keys()).map(token => this.getTokenName(token)),
      singletonServices: Array.from(this.singletonInstances.keys()).map(token => this.getTokenName(token))
    };
  }

  /**
   * 清理特定服务
   */
  public clearService(token: string | symbol | Function): void {
    if (this.isDisposed) {
      return;
    }

    // 清理作用域实例
    if (this.scopedInstances.has(token)) {
      const instance = this.scopedInstances.get(token);
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
      }
      this.scopedInstances.delete(token);
    }

    // 清理单例实例（仅在作用域内的引用）
    if (this.singletonInstances.has(token)) {
      this.singletonInstances.delete(token);
    }
  }

  /**
   * 检查服务是否在作用域内
   */
  public hasInstance(token: string | symbol | Function): boolean {
    return this.scopedInstances.has(token) || this.singletonInstances.has(token);
  }

  /**
   * 获取作用域内服务实例
   */
  public getInstance<T>(token: string | symbol | Function): T | null {
    return this.scopedInstances.get(token) || this.singletonInstances.get(token) || null;
  }

  /**
   * 销毁作用域
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // 执行所有销毁回调
    this.disposeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error during scope disposal:', error);
      }
    });

    // 清理作用域实例
    this.scopedInstances.forEach((instance, token) => {
      try {
        if (instance && typeof instance.dispose === 'function') {
          instance.dispose();
        }
      } catch (error) {
        console.error(`Error disposing service ${this.getTokenName(token)}:`, error);
      }
    });

    // 清理所有缓存
    this.scopedInstances.clear();
    this.singletonInstances.clear();
    this.disposeCallbacks.length = 0;

    // 标记为已销毁
    this.isDisposed = true;
  }

  /**
   * 检查作用域是否活跃
   */
  public get isActive(): boolean {
    return !this.isDisposed;
  }

  /**
   * 获取作用域存活时间
   */
  public get lifetime(): number {
    return Date.now() - this.createdAt;
  }

  /**
   * 转换为字符串
   */
  public toString(): string {
    return `ServiceScope(${this.id}, ${this.isDisposed ? 'disposed' : 'active'})`;
  }
}