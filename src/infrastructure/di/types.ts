/**
 * 依赖注入容器类型定义
 */

export enum ServiceLifecycle {
  /** 瞬态：每次解析都创建新实例 */
  TRANSIENT = 'transient',
  /** 单例：整个容器生命周期内只创建一个实例 */
  SINGLETON = 'singleton',
  /** 作用域：在特定作用域内是单例 */
  SCOPED = 'scoped'
}

export interface ServiceDescriptor<T = any> {
  /** 服务名称 */
  name: string;
  /** 工厂函数 */
  factory: () => T;
  /** 生命周期 */
  lifecycle: ServiceLifecycle;
  /** 实例（单例模式下使用） */
  instance?: T;
  /** 依赖的服务名称列表 */
  dependencies?: string[];
}

export type ServiceFactory<T> = () => T;

export interface ServiceScope {
  /** 获取作用域内的服务实例 */
  resolve<T>(name: string): T;
  /** 销毁作用域 */
  dispose(): void;
}

export interface DependencyResolver {
  /** 解析依赖 */
  resolve<T>(name: string): T;
  /** 检查服务是否已注册 */
  isRegistered(name: string): boolean;
  /** 创建新的作用域 */
  createScope(): ServiceScope;
}