/**
 * 依赖注入容器类型定义
 */

// 服务生命周期枚举
export enum ServiceLifetime {
  /** 单例模式 - 整个应用生命周期中只创建一次 */
  Singleton = 'singleton',
  /** 瞬态模式 - 每次请求都创建新实例 */
  Transient = 'transient',
  /** 作用域模式 - 在特定作用域内保持单例 */
  Scoped = 'scoped'
}

// 服务描述符接口
export interface ServiceDescriptor {
  /** 服务标识符 */
  token: string | symbol | Function;
  /** 服务实现类 */
  implementation: Function;
  /** 服务生命周期 */
  lifetime: ServiceLifetime;
  /** 工厂函数（可选） */
  factory?: (...args: any[]) => any;
  /** 服务实例（仅用于单例模式） */
  instance?: any;
  /** 依赖项列表 */
  dependencies?: (string | symbol | Function)[];
  /** 服务标签（用于命名服务） */
  tags?: string[];
  /** 是否延迟创建 */
  lazy?: boolean;
  /** 创建参数 */
  args?: any[];
}

// 服务注册配置接口
export interface ServiceRegistration {
  /** 服务实现类 */
  implementation: Function;
  /** 服务生命周期 */
  lifetime?: ServiceLifetime;
  /** 工厂函数 */
  factory?: (...args: any[]) => any;
  /** 依赖项覆盖 */
  dependencies?: (string | symbol | Function)[];
  /** 服务标签 */
  tags?: string[];
  /** 是否延迟创建 */
  lazy?: boolean;
  /** 创建参数 */
  args?: any[];
}

// 作用域接口
export interface IServiceScope {
  /** 作用域唯一标识符 */
  readonly id: string;
  /** 创建作用域内的服务实例 */
  resolve<T>(token: string | symbol | Function): T;
  /** 尝试解析服务 */
  tryResolve<T>(token: string | symbol | Function): T | null;
  /** 检查服务是否已注册 */
  isRegistered(token: string | symbol | Function): boolean;
  /** 销毁作用域 */
  dispose(): void;
}

// 容器接口
export interface IContainer {
  /** 注册服务 */
  register<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration,
    lifetime?: ServiceLifetime
  ): IContainer;

  /** 注册单例服务 */
  registerSingleton<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration
  ): IContainer;

  /** 注册瞬态服务 */
  registerTransient<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration
  ): IContainer;

  /** 注册作用域服务 */
  registerScoped<T>(
    token: string | symbol | (new (...args: any[]) => T),
    implementation: Function | ServiceRegistration
  ): IContainer;

  /** 注册工厂函数 */
  registerFactory<T>(
    token: string | symbol | Function,
    factory: (...args: any[]) => T,
    lifetime?: ServiceLifetime
  ): IContainer;

  /** 注册实例 */
  registerInstance<T>(
    token: string | symbol | Function,
    instance: T
  ): IContainer;

  /** 解析服务 */
  resolve<T>(token: string | symbol | Function): T;

  /** 尝试解析服务 */
  tryResolve<T>(token: string | symbol | Function): T | null;

  /** 解析所有匹配的服务 */
  resolveAll<T>(token: string | symbol | Function): T[];

  /** 检查服务是否已注册 */
  isRegistered(token: string | symbol | Function): boolean;

  /** 创建作用域 */
  createScope(): IServiceScope;

  /** 获取服务描述符 */
  getDescriptor(token: string | symbol | Function): ServiceDescriptor | null;

  /** 移除服务注册 */
  remove(token: string | symbol | Function): boolean;

  /** 清空所有注册 */
  clear(): void;

  /** 获取所有已注册的服务令牌 */
  getRegisteredTokens(): (string | symbol | Function)[];

  /** 验证依赖关系 */
  validateDependencies(): ValidationResult;

  /** 销毁容器 */
  dispose(): void;
}

// 验证结果接口
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
}

// 验证错误接口
export interface ValidationError {
  /** 错误类型 */
  type: 'circular_dependency' | 'missing_dependency' | 'invalid_factory' | 'invalid_implementation';
  /** 相关的服务令牌 */
  token: string | symbol | Function;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
}

// 验证警告接口
export interface ValidationWarning {
  /** 警告类型 */
  type: 'potential_memory_leak' | 'unused_dependency' | 'deprecated_registration';
  /** 相关的服务令牌 */
  token: string | symbol | Function;
  /** 警告消息 */
  message: string;
}

// 装饰器元数据键
export const INJECTABLE_METADATA_KEY = Symbol('injectable');
export const INJECT_METADATA_KEY = Symbol('inject');
export const SCOPE_METADATA_KEY = Symbol('scope');

// 可注入装饰器接口
export interface InjectableOptions {
  /** 服务生命周期 */
  lifetime?: ServiceLifetime;
  /** 服务标签 */
  tags?: string[];
  /** 是否延迟创建 */
  lazy?: boolean;
  /** 作用域 */
  scope?: string[];
}

// 注入装饰器选项接口
export interface InjectOptions {
  /** 是否可选 */
  optional?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 服务标签 */
  tag?: string;
}

// 循环依赖检测选项
export interface CircularDependencyOptions {
  /** 最大检测深度 */
  maxDepth?: number;
  /** 是否包含瞬态服务 */
  includeTransient?: boolean;
  /** 自定义检测函数 */
  customDetector?: (token: string | symbol | Function, dependencies: (string | symbol | Function)[]) => boolean;
}

// 容器配置选项
export interface ContainerOptions {
  /** 是否自动注册 */
  autoRegister?: boolean;
  /** 是否启用循环依赖检测 */
  enableCircularDependencyDetection?: boolean;
  /** 循环依赖检测选项 */
  circularDependencyOptions?: CircularDependencyOptions;
  /** 默认服务生命周期 */
  defaultLifetime?: ServiceLifetime;
  /** 是否启用严格模式 */
  strictMode?: boolean;
  /** 容器名称 */
  name?: string;
  /** 父容器 */
  parent?: IContainer;
}