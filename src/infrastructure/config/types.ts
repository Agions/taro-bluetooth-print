/**
 * 配置管理类型定义
 */

// 基础配置接口
export interface IConfig {
  /** 配置值 */
  value: any;
  /** 配置类型 */
  type: ConfigType;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 描述 */
  description?: string;
  /** 验证规则 */
  validation?: ValidationRule[];
  /** 环境变量映射 */
  envVar?: string;
  /** 配置是否敏感 */
  sensitive?: boolean;
  /** 配置是否只读 */
  readonly?: boolean;
  /** 配置是否可热更新 */
  hotReload?: boolean;
  /** 配置元数据 */
  metadata?: Record<string, any>;
}

// 配置类型枚举
export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  JSON = 'json',
  DATE = 'date',
  URL = 'url',
  EMAIL = 'email',
  REGEX = 'regex',
  ENUM = 'enum',
  CUSTOM = 'custom'
}

// 验证规则接口
export interface ValidationRule {
  /** 规则名称 */
  name: string;
  /** 验证函数 */
  validate: (value: any) => boolean | string;
  /** 错误消息 */
  message?: string;
  /** 规则优先级 */
  priority?: number;
}

// 配置提供者接口
export interface IConfigProvider {
  /** 提供者名称 */
  readonly name: string;
  /** 提供者优先级 */
  readonly priority: number;
  /** 是否只读 */
  readonly readonly: boolean;
  /** 支持的配置类型 */
  readonly supportedTypes?: ConfigType[];

  /** 获取配置值 */
  get(key: string): Promise<any>;

  /** 设置配置值 */
  set(key: string, value: any): Promise<void>;

  /** 检查配置是否存在 */
  has(key: string): Promise<boolean>;

  /** 删除配置 */
  remove(key: string): Promise<boolean>;

  /** 获取所有配置键 */
  keys(): Promise<string[]>;

  /** 重载配置 */
  reload(): Promise<void>;

  /** 监听配置变化 */
  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void;

  /** 销毁提供者 */
  dispose(): void;
}

// 配置管理器接口
export interface IConfigManager {
  /** 注册配置提供者 */
  registerProvider(provider: IConfigProvider): void;

  /** 移除配置提供者 */
  removeProvider(name: string): void;

  /** 获取配置值 */
  get<T = any>(key: string, defaultValue?: T): T;

  /** 异步获取配置值 */
  getAsync<T = any>(key: string, defaultValue?: T): Promise<T>;

  /** 设置配置值 */
  set(key: string, value: any): Promise<void>;

  /** 检查配置是否存在 */
  has(key: string): boolean;

  /** 异步检查配置是否存在 */
  hasAsync(key: string): Promise<boolean>;

  /** 删除配置 */
  remove(key: string): Promise<boolean>;

  /** 获取所有配置 */
  getAll(): Record<string, any>;

  /** 获取配置元数据 */
  getMetadata(key: string): IConfig | null;

  /** 验证配置 */
  validate(key?: string): ValidationResult;

  /** 监听配置变化 */
  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void;

  /** 批量监听配置变化 */
  watchBatch(keys: string[], callback: (changes: Record<string, { newValue: any; oldValue: any }>) => void): () => void;

  /** 重载配置 */
  reload(): Promise<void>;

  /** 导出配置 */
  export(format?: 'json' | 'yaml' | 'properties'): string;

  /** 导入配置 */
  import(data: string | Record<string, any>, format?: 'json' | 'yaml' | 'properties'): Promise<void>;

  /** 获取配置统计 */
  getStats(): ConfigStats;

  /** 销毁配置管理器 */
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
  /** 配置键 */
  key: string;
  /** 错误消息 */
  message: string;
  /** 当前值 */
  value?: any;
  /** 规则名称 */
  rule?: string;
}

// 验证警告接口
export interface ValidationWarning {
  /** 配置键 */
  key: string;
  /** 警告消息 */
  message: string;
  /** 当前值 */
  value?: any;
  /** 规则名称 */
  rule?: string;
}

// 配置统计接口
export interface ConfigStats {
  /** 总配置数 */
  totalConfigs: number;
  /** 按类型分组的配置数 */
  configsByType: Record<ConfigType, number>;
  /** 按提供者分组的配置数 */
  configsByProvider: Record<string, number>;
  /** 只读配置数 */
  readonlyConfigs: number;
  /** 敏感配置数 */
  sensitiveConfigs: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 最后更新时间 */
  lastUpdatedAt: number;
  /** 提供者数量 */
  providerCount: number;
}

// 环境配置接口
export interface IEnvironmentConfig {
  /** 环境名称 */
  name: string;
  /** 环境类型 */
  type: EnvironmentType;
  /** 环境变量前缀 */
  prefix?: string;
  /** 默认配置 */
  defaults?: Record<string, any>;
  /** 配置覆盖 */
  overrides?: Record<string, any>;
  /** 配置验证规则 */
  validation?: Record<string, ValidationRule[]>;
  /** 配置描述 */
  descriptions?: Record<string, string>;
}

// 环境类型枚举
export enum EnvironmentType {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

// 配置缓存接口
export interface IConfigCache {
  /** 获取缓存值 */
  get(key: string): any;

  /** 设置缓存值 */
  set(key: string, value: any, ttl?: number): void;

  /** 检查缓存是否存在 */
  has(key: string): boolean;

  /** 删除缓存 */
  remove(key: string): void;

  /** 清空缓存 */
  clear(): void;

  /** 获取缓存大小 */
  size(): number;

  /** 获取缓存统计 */
  getStats(): CacheStats;
}

// 缓存统计接口
export interface CacheStats {
  /** 缓存大小 */
  size: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 设置次数 */
  sets: number;
  /** 删除次数 */
  deletes: number;
  /** 最后访问时间 */
  lastAccessedAt?: number;
}

// 配置模式接口
export interface IConfigSchema {
  /** 模式名称 */
  name: string;
  /** 模式版本 */
  version: string;
  /** 配置定义 */
  definitions: Record<string, IConfig>;
  /** 环境特定配置 */
  environments?: Record<string, Record<string, IConfig>>;
  /** 继承的模式 */
  extends?: string[];
}

// 配置变更事件接口
export interface IConfigChangeEvent {
  /** 变更类型 */
  type: 'added' | 'updated' | 'removed';
  /** 配置键 */
  key: string;
  /** 新值 */
  newValue?: any;
  /** 旧值 */
  oldValue?: any;
  /** 变更时间 */
  timestamp: number;
  /** 变更来源 */
  source: string;
  /** 变更元数据 */
  metadata?: Record<string, any>;
}

// 配置管理器配置接口
export interface IConfigManagerConfig {
  /** 默认环境 */
  defaultEnvironment?: string;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存TTL（毫秒） */
  cacheTTL?: number;
  /** 是否启用验证 */
  enableValidation?: boolean;
  /** 是否启用热重载 */
  enableHotReload?: boolean;
  /** 配置文件路径 */
  configPaths?: string[];
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 自动重载间隔（毫秒） */
  autoReloadInterval?: number;
  /** 敏感配置加密密钥 */
  encryptionKey?: string;
  /** 是否启用配置变更事件 */
  enableChangeEvents?: boolean;
  /** 最大配置层级深度 */
  maxDepth?: number;
  /** 默认提供者 */
  defaultProviders?: string[];
}

// 配置提供者工厂接口
export interface IConfigProviderFactory {
  /** 创建提供者 */
  create(config: any): IConfigProvider;
  /** 支持的提供者类型 */
  supportedTypes: string[];
}

// 配置序列化器接口
export interface IConfigSerializer {
  /** 序列化配置 */
  serialize(config: Record<string, any>): string;

  /** 反序列化配置 */
  deserialize(data: string): Record<string, any>;
  /** 支持的格式 */
  format: string;
}