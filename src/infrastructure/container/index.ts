/**
 * 依赖注入容器模块导出
 */

// 核心类
export { Container } from './Container';
export { ServiceScope } from './ServiceScope';
export { ServiceDescriptor } from './ServiceDescriptor';

// 类型定义
export {
  IContainer,
  IServiceScope,
  ServiceDescriptor as IServiceDescriptor,
  ServiceRegistration,
  ServiceLifetime,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  InjectableOptions,
  InjectOptions,
  CircularDependencyOptions,
  ContainerOptions
} from './types';

// 装饰器
export {
  Injectable,
  Inject,
  Scope,
  AutoWired,
  Named,
  Singleton,
  Transient,
  Scoped,
  Lazy,
  Token,
  Factory,
  PostProcessor,
  Interceptor,
  InjectProperty,
  Value,
  Config,
  Log,
  Cache
} from './decorators';

// 工具类
export { DecoratorUtils } from './decorators';

// 元数据键
export {
  INJECTABLE_METADATA_KEY,
  INJECT_METADATA_KEY,
  SCOPE_METADATA_KEY
} from './types';

// 创建默认容器实例
export const defaultContainer = new Container({
  name: 'DefaultContainer',
  enableCircularDependencyDetection: true,
  strictMode: false
});

// 容器工厂函数
export function createContainer(options?: ContainerOptions): Container {
  return new Container(options);
}

// 全局容器注册表
export class ContainerRegistry {
  private static containers: Map<string, Container> = new Map();

  /**
   * 注册容器
   */
  static register(name: string, container: Container): void {
    this.containers.set(name, container);
  }

  /**
   * 获取容器
   */
  static get(name: string): Container | undefined {
    return this.containers.get(name);
  }

  /**
   * 移除容器
   */
  static remove(name: string): boolean {
    return this.containers.delete(name);
  }

  /**
   * 获取所有容器名称
   */
  static getNames(): string[] {
    return Array.from(this.containers.keys());
  }

  /**
   * 清空所有容器
   */
  static clear(): void {
    this.containers.clear();
  }

  /**
   * 销毁所有容器
   */
  static disposeAll(): void {
    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();
  }
}

// 服务令牌定义
export const ServiceTokens = {
  // 容器相关
  CONTAINER: Symbol('Container'),
  CONTAINER_REGISTRY: Symbol('ContainerRegistry'),

  // 事件系统
  EVENT_BUS: Symbol('EventBus'),
  EVENT_DISPATCHER: Symbol('EventDispatcher'),
  EVENT_STORE: Symbol('EventStore'),

  // 配置管理
  CONFIG_MANAGER: Symbol('ConfigManager'),
  CONFIG_PROVIDER: Symbol('ConfigProvider'),
  CONFIG_VALIDATOR: Symbol('ConfigValidator'),

  // 日志系统
  LOGGER: Symbol('Logger'),
  LOGGER_FACTORY: Symbol('LoggerFactory'),
  LOG_APPENDER: Symbol('LogAppender'),

  // 错误处理
  ERROR_HANDLER: Symbol('ErrorHandler'),
  ERROR_REPORTER: Symbol('ErrorReporter'),
  ERROR_RECOVERY: Symbol('ErrorRecovery'),

  // 蓝牙相关
  BLUETOOTH_ADAPTER: Symbol('BluetoothAdapter'),
  BLUETOOTH_DISCOVERY: Symbol('BluetoothDiscovery'),
  BLUETOOTH_CONNECTION: Symbol('BluetoothConnection'),

  // 打印机相关
  PRINTER_MANAGER: Symbol('PrinterManager'),
  PRINTER_QUEUE: Symbol('PrinterQueue'),
  PRINT_JOB_MANAGER: Symbol('PrintJobManager'),
  TEMPLATE_ENGINE: Symbol('TemplateEngine'),

  // 工具类
  PERFORMANCE_MONITOR: Symbol('PerformanceMonitor'),
  METRICS_COLLECTOR: Symbol('MetricsCollector'),
  HEALTH_CHECKER: Symbol('HealthChecker')
} as const;

// 服务标签
export const ServiceTags = {
  CORE: 'core',
  INFRASTRUCTURE: 'infrastructure',
  APPLICATION: 'application',
  DOMAIN: 'domain',
  BLUETOOTH: 'bluetooth',
  PRINTER: 'printer',
  CONFIGURATION: 'configuration',
  LOGGING: 'logging',
  ERROR_HANDLING: 'error-handling',
  MONITORING: 'monitoring',
  TESTING: 'testing',
  DEVELOPMENT: 'development',
  PRODUCTION: 'production'
} as const;

// 生命周期配置
export const ServiceLifecycles = {
  SINGLETON: ServiceLifetime.Singleton,
  TRANSIENT: ServiceLifetime.Transient,
  SCOPED: ServiceLifetime.Scoped
} as const;