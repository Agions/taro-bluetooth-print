/**
 * 服务描述符
 */

import { ServiceLifecycle, ServiceFactory } from './types';

// 重新导出ServiceLifecycle
export { ServiceLifecycle, ServiceFactory } from './types';

export class ServiceDescriptor<T = any> {
  constructor(
    public readonly name: string,
    public readonly factory: ServiceFactory<T>,
    public readonly lifecycle: ServiceLifecycle = ServiceLifecycle.TRANSIENT,
    public readonly dependencies: string[] = []
  ) {}

  /** 服务实例（单例模式下使用） */
  private _instance: T | null = null;

  /** 获取实例 */
  getInstance(): T | null {
    return this._instance;
  }

  /** 设置实例（仅用于单例模式） */
  setInstance(instance: T): void {
    if (this.lifecycle === ServiceLifecycle.SINGLETON) {
      this._instance = instance;
    }
  }

  /** 清除实例 */
  clearInstance(): void {
    this._instance = null;
  }

  /** 是否为单例模式 */
  isSingleton(): boolean {
    return this.lifecycle === ServiceLifecycle.SINGLETON;
  }

  /** 是否为作用域模式 */
  isScoped(): boolean {
    return this.lifecycle === ServiceLifecycle.SCOPED;
  }

  /** 是否为瞬态模式 */
  isTransient(): boolean {
    return this.lifecycle === ServiceLifecycle.TRANSIENT;
  }

  /** 创建服务描述符 */
  static create<T>(
    name: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle = ServiceLifecycle.TRANSIENT,
    dependencies: string[] = []
  ): ServiceDescriptor<T> {
    return new ServiceDescriptor(name, factory, lifecycle, dependencies);
  }

  /** 创建单例服务描述符 */
  static singleton<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): ServiceDescriptor<T> {
    return new ServiceDescriptor(name, factory, ServiceLifecycle.SINGLETON, dependencies);
  }

  /** 创建瞬态服务描述符 */
  static transient<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): ServiceDescriptor<T> {
    return new ServiceDescriptor(name, factory, ServiceLifecycle.TRANSIENT, dependencies);
  }

  /** 创建作用域服务描述符 */
  static scoped<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): ServiceDescriptor<T> {
    return new ServiceDescriptor(name, factory, ServiceLifecycle.SCOPED, dependencies);
  }
}