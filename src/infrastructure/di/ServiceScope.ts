/**
 * 服务作用域
 */

import { ServiceDescriptor } from './ServiceDescriptor';

export interface ServiceScope {
  /** 获取作用域内的服务实例 */
  resolve<T>(name: string): T;
  /** 销毁作用域 */
  dispose(): void;
}

export class ServiceScopeImpl implements ServiceScope {
  private scopedInstances = new Map<string, any>();

  constructor(
    private readonly container: any,
    private readonly scopedServices: Map<string, ServiceDescriptor>
  ) {}

  /**
   * 获取作用域内的服务实例
   */
  resolve<T>(name: string): T {
    const descriptor = this.scopedServices.get(name);

    if (!descriptor) {
      // 如果不是作用域服务，委托给容器
      return this.container.resolve<T>(name);
    }

    // 检查是否已有实例
    if (this.scopedInstances.has(name)) {
      return this.scopedInstances.get(name);
    }

    // 创建新实例
    const instance = this.createInstance<T>(descriptor);
    this.scopedInstances.set(name, instance);

    return instance;
  }

  /**
   * 创建服务实例
   */
  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    try {
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

  /**
   * 销毁作用域
   */
  dispose(): void {
    // 清理作用域内的实例
    for (const [name, instance] of this.scopedInstances) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.warn(`Failed to dispose service '${name}':`, error);
        }
      }
    }

    this.scopedInstances.clear();
  }

  /**
   * 检查作用域内是否有实例
   */
  hasInstance(name: string): boolean {
    return this.scopedInstances.has(name);
  }

  /**
   * 获取作用域统计信息
   */
  getStats(): { [key: string]: any } {
    const stats: { [key: string]: any } = {
      scopedServicesCount: this.scopedServices.size,
      instancesCount: this.scopedInstances.size,
      services: []
    };

    for (const [name, instance] of this.scopedInstances) {
      stats.services.push({
        name,
        type: instance?.constructor?.name || 'Unknown',
        hasDispose: typeof instance?.dispose === 'function'
      });
    }

    return stats;
  }
}