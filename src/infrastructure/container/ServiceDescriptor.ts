/**
 * 服务描述符类
 */

import { ServiceLifetime, ServiceDescriptor as IServiceDescriptor } from './types';

/**
 * 服务描述符实现类
 */
export class ServiceDescriptor implements IServiceDescriptor {
  /** 服务标识符 */
  public readonly token: string | symbol | Function;

  /** 服务实现类 */
  public readonly implementation: Function;

  /** 服务生命周期 */
  public readonly lifetime: ServiceLifetime;

  /** 工厂函数 */
  public readonly factory?: (...args: any[]) => any;

  /** 服务实例（仅用于单例模式） */
  public instance?: any;

  /** 依赖项列表 */
  public readonly dependencies: (string | symbol | Function)[];

  /** 服务标签 */
  public readonly tags: string[];

  /** 是否延迟创建 */
  public readonly lazy: boolean;

  /** 创建参数 */
  public readonly args: any[];

  /** 创建时间戳 */
  public readonly createdAt: number;

  /** 最后解析时间 */
  public lastResolvedAt?: number;

  /** 解析次数 */
  public resolveCount: number = 0;

  constructor(
    token: string | symbol | Function,
    implementation: Function,
    lifetime: ServiceLifetime,
    options: {
      factory?: (...args: any[]) => any;
      instance?: any;
      dependencies?: (string | symbol | Function)[];
      tags?: string[];
      lazy?: boolean;
      args?: any[];
    } = {}
  ) {
    this.token = token;
    this.implementation = implementation;
    this.lifetime = lifetime;
    this.factory = options.factory;
    this.instance = options.instance;
    this.dependencies = options.dependencies || this.extractDependencies(implementation);
    this.tags = options.tags || [];
    this.lazy = options.lazy || false;
    this.args = options.args || [];
    this.createdAt = Date.now();
  }

  /**
   * 从构造函数中提取依赖项
   */
  private extractDependencies(implementation: Function): (string | symbol | Function)[] {
    try {
      // 获取函数的字符串表示
      const fnStr = implementation.toString();

      // 匹配构造函数参数
      const paramMatch = fnStr.match(/constructor\s*\(([^)]*)\)/);
      if (!paramMatch) {
        return [];
      }

      const paramStr = paramMatch[1];
      const params = paramStr.split(',').map(p => p.trim()).filter(p => p);

      return params.map(param => {
        // 移除类型注解
        const cleanParam = param.replace(/:\s*[A-Za-z<>._]+(\[\])?/, '').replace(/\?.*$/, '');
        return cleanParam;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * 创建服务实例
   */
  public createInstance(container: any, scope?: any): any {
    // 如果已有实例且为单例，直接返回
    if (this.lifetime === ServiceLifetime.Singleton && this.instance) {
      return this.instance;
    }

    let instance: any;

    try {
      // 使用工厂函数创建实例
      if (this.factory) {
        const args = this.resolveDependencies(container, scope);
        instance = this.factory(...args);
      } else {
        // 使用构造函数创建实例
        const args = this.resolveDependencies(container, scope);
        instance = new this.implementation(...args);
      }

      // 单例模式保存实例
      if (this.lifetime === ServiceLifetime.Singleton) {
        this.instance = instance;
      }

      // 更新解析统计
      this.lastResolvedAt = Date.now();
      this.resolveCount++;

      return instance;
    } catch (error) {
      throw new Error(`Failed to create instance for ${this.getTokenName()}: ${error.message}`);
    }
  }

  /**
   * 解析依赖项
   */
  private resolveDependencies(container: any, scope?: any): any[] {
    return this.dependencies.map(dep => {
      try {
        // 优先从作用域解析
        if (scope && scope.isRegistered(dep)) {
          return scope.resolve(dep);
        }

        // 从容器解析
        return container.resolve(dep);
      } catch (error) {
        throw new Error(`Failed to resolve dependency ${this.getTokenName(dep)} for ${this.getTokenName()}: ${error.message}`);
      }
    });
  }

  /**
   * 检查是否匹配指定标签
   */
  public hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * 获取令牌名称（用于日志）
   */
  public getTokenName(token?: string | symbol | Function): string {
    const targetToken = token || this.token;

    if (typeof targetToken === 'string') {
      return targetToken;
    }

    if (typeof targetToken === 'symbol') {
      return targetToken.toString();
    }

    if (typeof targetToken === 'function') {
      return targetToken.name || 'AnonymousFunction';
    }

    return 'UnknownToken';
  }

  /**
   * 获取描述符信息
   */
  public getInfo(): any {
    return {
      token: this.getTokenName(),
      implementation: this.implementation.name || 'AnonymousClass',
      lifetime: this.lifetime,
      dependencies: this.dependencies.map(dep => this.getTokenName(dep)),
      tags: this.tags,
      lazy: this.lazy,
      hasFactory: !!this.factory,
      hasInstance: !!this.instance,
      createdAt: new Date(this.createdAt).toISOString(),
      lastResolvedAt: this.lastResolvedAt ? new Date(this.lastResolvedAt).toISOString() : null,
      resolveCount: this.resolveCount
    };
  }

  /**
   * 克隆描述符
   */
  public clone(options: {
    lifetime?: ServiceLifetime;
    dependencies?: (string | symbol | Function)[];
    tags?: string[];
    lazy?: boolean;
    args?: any[];
  } = {}): ServiceDescriptor {
    return new ServiceDescriptor(
      this.token,
      this.implementation,
      options.lifetime || this.lifetime,
      {
        factory: this.factory,
        dependencies: options.dependencies || [...this.dependencies],
        tags: options.tags || [...this.tags],
        lazy: options.lazy !== undefined ? options.lazy : this.lazy,
        args: options.args || [...this.args]
      }
    );
  }

  /**
   * 验证描述符
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查实现是否为函数
    if (typeof this.implementation !== 'function') {
      errors.push('Implementation must be a function');
    }

    // 检查工厂函数
    if (this.factory && typeof this.factory !== 'function') {
      errors.push('Factory must be a function');
    }

    // 检查生命周期
    if (!Object.values(ServiceLifetime).includes(this.lifetime)) {
      errors.push('Invalid service lifetime');
    }

    // 检查单例实例
    if (this.lifetime === ServiceLifetime.Singleton && this.instance && typeof this.instance !== 'object') {
      errors.push('Singleton instance must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为字符串
   */
  public toString(): string {
    return `ServiceDescriptor(${this.getTokenName()}, ${this.lifetime})`;
  }
}