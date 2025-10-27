/**
 * 依赖注入装饰器
 */

import 'reflect-metadata';
import {
  INJECTABLE_METADATA_KEY,
  INJECT_METADATA_KEY,
  SCOPE_METADATA_KEY,
  InjectableOptions,
  InjectOptions
} from './types';
import { ServiceLifetime } from './types';

/**
 * 可注入装饰器
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target: any) => {
    // 设置可注入元数据
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, {
      lifetime: options.lifetime || ServiceLifetime.Transient,
      tags: options.tags || [],
      lazy: options.lazy || false,
      scope: options.scope || []
    }, target);

    return target;
  };
}

/**
 * 注入装饰器
 */
export function Inject(token?: string | symbol | Function, options: InjectOptions = {}): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];

    // 如果没有指定令牌，尝试从参数类型推断
    let actualToken = token;
    if (!actualToken && paramTypes[parameterIndex]) {
      actualToken = paramTypes[parameterIndex];
    }

    existingTokens[parameterIndex] = {
      token: actualToken,
      optional: options.optional || false,
      defaultValue: options.defaultValue,
      tag: options.tag
    };

    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
  };
}

/**
 * 作用域装饰器
 */
export function Scope(scope: string | string[]): ClassDecorator {
  return (target: any) => {
    const scopes = Array.isArray(scope) ? scope : [scope];
    Reflect.defineMetadata(SCOPE_METADATA_KEY, scopes, target);
    return target;
  };
}

/**
 * 自动注入装饰器
 */
export function AutoWired(target: any): any {
  // 获取构造函数参数类型
  const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
  const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];

  // 创建自动注入的元数据
  const autoInjectTokens = paramTypes.map((paramType: any, index: number) => {
    if (injectMetadata[index]) {
      return injectMetadata[index];
    }
    return {
      token: paramType,
      optional: false,
      defaultValue: undefined
    };
  });

  Reflect.defineMetadata(INJECT_METADATA_KEY, autoInjectTokens, target);
  return target;
}

/**
 * 命名服务装饰器
 */
export function Named(name: string): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('named', name, target);
    return target;
  };
}

/**
 * 单例装饰器
 */
export function Singleton(target: any): any {
  return Injectable({
    lifetime: ServiceLifetime.Singleton
  })(target);
}

/**
 * 瞬态装饰器
 */
export function Transient(target: any): any {
  return Injectable({
    lifetime: ServiceLifetime.Transient
  })(target);
}

/**
 * 作用域服务装饰器
 */
export function Scoped(target: any): any {
  return Injectable({
    lifetime: ServiceLifetime.Scoped
  })(target);
}

/**
 * 延迟加载装饰器
 */
export function Lazy(target: any): any {
  return Injectable({
    lazy: true
  })(target);
}

/**
 * 令牌装饰器
 */
export function Token(description?: string): (target: any) => void {
  return (target: any) => {
    Reflect.defineMetadata('token', description || target.name, target);
  };
}

/**
 * 工厂装饰器
 */
export function Factory(target: any): any {
  Reflect.defineMetadata('factory', true, target);
  return target;
}

/**
 * 后处理器装饰器
 */
export function PostProcessor(target: any): any {
  Reflect.defineMetadata('postProcessor', true, target);
  return target;
}

/**
 * 拦截器装饰器
 */
export function Interceptor(target: any): any {
  Reflect.defineMetadata('interceptor', true, target);
  return target;
}

/**
 * 装饰器工具函数
 */
export class DecoratorUtils {
  /**
   * 获取可注入元数据
   */
  static getInjectableMetadata(target: any): any {
    return Reflect.getMetadata(INJECTABLE_METADATA_KEY, target);
  }

  /**
   * 获取注入元数据
   */
  static getInjectMetadata(target: any): any[] {
    return Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
  }

  /**
   * 获取作用域元数据
   */
  static getScopeMetadata(target: any): string[] {
    return Reflect.getMetadata(SCOPE_METADATA_KEY, target) || [];
  }

  /**
   * 获取命名元数据
   */
  static getNamedMetadata(target: any): string | undefined {
    return Reflect.getMetadata('named', target);
  }

  /**
   * 获取令牌元数据
   */
  static getTokenMetadata(target: any): string | undefined {
    return Reflect.getMetadata('token', target);
  }

  /**
   * 检查是否为工厂
   */
  static isFactory(target: any): boolean {
    return Reflect.getMetadata('factory', target) === true;
  }

  /**
   * 检查是否为后处理器
   */
  static isPostProcessor(target: any): boolean {
    return Reflect.getMetadata('postProcessor', target) === true;
  }

  /**
   * 检查是否为拦截器
   */
  static isInterceptor(target: any): boolean {
    return Reflect.getMetadata('interceptor', target) === true;
  }

  /**
   * 提取参数类型
   */
  static extractParameterTypes(target: any): any[] {
    return Reflect.getMetadata('design:paramtypes', target) || [];
  }

  /**
   * 提取返回类型
   */
  static extractReturnType(target: any): any {
    return Reflect.getMetadata('design:returntype', target);
  }

  /**
   * 提取属性类型
   */
  static extractPropertyType(target: any, propertyKey: string): any {
    return Reflect.getMetadata('design:type', target, propertyKey);
  }

  /**
   * 设置元数据
   */
  static setMetadata<T>(key: string, value: T, target: any): void {
    Reflect.defineMetadata(key, value, target);
  }

  /**
   * 获取元数据
   */
  static getMetadata<T>(key: string, target: any): T | undefined {
    return Reflect.getMetadata(key, target);
  }

  /**
   * 检查是否有元数据
   */
  static hasMetadata(key: string, target: any): boolean {
    return Reflect.hasMetadata(key, target);
  }

  /**
   * 删除元数据
   */
  static deleteMetadata(key: string, target: any): boolean {
    return Reflect.deleteMetadata(key, target);
  }

  /**
   * 获取所有元数据键
   */
  static getMetadataKeys(target: any): string[] {
    return Reflect.getMetadataKeys(target);
  }

  /**
   * 遍历元数据
   */
  static forEachMetadata(target: any, callback: (key: string, value: any) => void): void {
    const keys = this.getMetadataKeys(target);
    for (const key of keys) {
      const value = this.getMetadata(key, target);
      if (value !== undefined) {
        callback(key, value);
      }
    }
  }
}

/**
 * 属性注入装饰器
 */
export function InjectProperty(token?: string | symbol | Function, options: InjectOptions = {}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const propertyType = Reflect.getMetadata('design:type', target, propertyKey);
    const actualToken = token || propertyType;

    // 存储属性注入元数据
    const existingProperties = Reflect.getMetadata('injectProperties', target.constructor) || [];
    existingProperties.push({
      propertyKey,
      token: actualToken,
      optional: options.optional || false,
      defaultValue: options.defaultValue,
      tag: options.tag
    });
    Reflect.defineMetadata('injectProperties', existingProperties, target.constructor);
  };
}

/**
 * 值装饰器
 */
export function Value(value: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingValues = Reflect.getMetadata('values', target.constructor) || {};
    existingValues[propertyKey] = value;
    Reflect.defineMetadata('values', existingValues, target.constructor);
  };
}

/**
 * 配置装饰器
 */
export function Config(key?: string): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingConfigs = Reflect.getMetadata('configs', target.constructor) || [];
    existingConfigs.push({
      propertyKey,
      key: key || propertyKey
    });
    Reflect.defineMetadata('configs', existingConfigs, target.constructor);
  };
}

/**
 * 日志装饰器
 */
export function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const className = target.constructor.name;
    const methodName = propertyKey.toString();
    console.log(`[${className}] Entering ${methodName} with args:`, args);

    try {
      const result = originalMethod.apply(this, args);

      if (result && typeof result.then === 'function') {
        // 异步方法
        return result
          .then((res: any) => {
            console.log(`[${className}] Exiting ${methodName} with result:`, res);
            return res;
          })
          .catch((error: any) => {
            console.error(`[${className}] Error in ${methodName}:`, error);
            throw error;
          });
      } else {
        // 同步方法
        console.log(`[${className}] Exiting ${methodName} with result:`, result);
        return result;
      }
    } catch (error) {
      console.error(`[${className}] Error in ${methodName}:`, error);
      throw error;
    }
  };
}

/**
 * 缓存装饰器
 */
export function Cache(ttl?: number): MethodDecorator {
  const cache = new Map<string, { value: any; expires: number }>();

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      const now = Date.now();

      // 检查缓存
      const cached = cache.get(key);
      if (cached && (!ttl || cached.expires > now)) {
        return cached.value;
      }

      // 执行原方法
      const result = originalMethod.apply(this, args);

      // 存储到缓存
      cache.set(key, {
        value: result,
        expires: ttl ? now + ttl : Number.MAX_SAFE_INTEGER
      });

      return result;
    };
  };
}