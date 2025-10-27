/**
 * 配置管理器实现
 */

import {
  IConfigManager,
  IConfigProvider,
  IConfig,
  IConfigCache,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ConfigType,
  IConfigChangeEvent,
  IConfigManagerConfig
} from './types';
import { EventEmitter } from 'events';

/**
 * 配置管理器实现类
 */
export class ConfigManager extends EventEmitter implements IConfigManager {
  /** 配置提供者列表 */
  private providers: IConfigProvider[] = [];

  /** 配置模式定义 */
  private schemas: Map<string, IConfig> = new Map();

  /** 配置缓存 */
  private cache?: IConfigCache;

  /** 配置变更监听器 */
  private watchers: Map<string, Set<(value: any, oldValue?: any) => void>> = new Map();

  /** 批量监听器 */
  private batchWatchers: Set<(changes: Record<string, { newValue: any; oldValue: any }>) => void> = new Set();

  /** 配置管理器配置 */
  private config: Required<IConfigManagerConfig>;

  /** 是否已销毁 */
  private isDisposed: boolean = false;

  /** 统计信息 */
  private stats = {
    gets: 0,
    sets: 0,
    hits: 0,
    misses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdated: Date.now()
  };

  constructor(config: IConfigManagerConfig = {}) {
    super();
    this.config = {
      defaultEnvironment: config.defaultEnvironment || 'development',
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 300000, // 5分钟
      enableValidation: config.enableValidation !== false,
      enableHotReload: config.enableHotReload || false,
      configPaths: config.configPaths || [],
      envPrefix: config.envPrefix || 'APP',
      autoReloadInterval: config.autoReloadInterval || 60000, // 1分钟
      encryptionKey: config.encryptionKey,
      enableChangeEvents: config.enableChangeEvents !== false,
      maxDepth: config.maxDepth || 10,
      defaultProviders: config.defaultProviders || ['memory', 'environment']
    };

    this.initializeCache();
    this.setupDefaultProviders();
  }

  /**
   * 注册配置提供者
   */
  public registerProvider(provider: IConfigProvider): void {
    if (this.isDisposed) {
      throw new Error('Cannot register provider to disposed config manager');
    }

    // 检查是否已存在同名提供者
    const existingIndex = this.providers.findIndex(p => p.name === provider.name);
    if (existingIndex !== -1) {
      // 替换现有提供者
      this.providers[existingIndex] = provider;
    } else {
      // 添加新提供者
      this.providers.push(provider);
    }

    // 按优先级排序
    this.providers.sort((a, b) => b.priority - a.priority);

    // 清除缓存
    this.clearCache();

    console.log(`Config provider '${provider.name}' registered with priority ${provider.priority}`);
  }

  /**
   * 移除配置提供者
   */
  public removeProvider(name: string): void {
    const index = this.providers.findIndex(p => p.name === name);
    if (index !== -1) {
      const provider = this.providers[index];
      provider.dispose();
      this.providers.splice(index, 1);
      this.clearCache();
      console.log(`Config provider '${name}' removed`);
    }
  }

  /**
   * 获取配置值
   */
  public get<T = any>(key: string, defaultValue?: T): T {
    if (this.isDisposed) {
      throw new Error('Cannot get config from disposed config manager');
    }

    this.stats.gets++;

    // 尝试从缓存获取
    if (this.config.enableCache && this.cache) {
      if (this.cache.has(key)) {
        this.stats.hits++;
        this.stats.cacheHits++;
        return this.cache.get(key);
      } else {
        this.stats.cacheMisses++;
      }
    }

    // 从提供者获取配置
    let value: any;
    for (const provider of this.providers) {
      try {
        if (provider.has && typeof provider.has === 'function') {
          // 异步提供者的同步检查
          // 这里简化处理，实际应该缓存has的结果
          value = provider.get(key);
          if (value !== undefined) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error getting config '${key}' from provider '${provider.name}':`, error);
      }
    }

    // 如果没有找到值，使用默认值
    if (value === undefined) {
      value = defaultValue;
    }

    // 验证配置
    if (this.config.enableValidation && value !== undefined) {
      const validation = this.validateKey(key, value);
      if (!validation.isValid) {
        console.warn(`Config validation failed for key '${key}':`, validation.errors);
      }
    }

    // 缓存值
    if (this.config.enableCache && this.cache && value !== undefined) {
      this.cache.set(key, value, this.config.cacheTTL);
    }

    this.stats.misses++;
    return value;
  }

  /**
   * 异步获取配置值
   */
  public async getAsync<T = any>(key: string, defaultValue?: T): Promise<T> {
    if (this.isDisposed) {
      throw new Error('Cannot get config from disposed config manager');
    }

    this.stats.gets++;

    // 尝试从缓存获取
    if (this.config.enableCache && this.cache) {
      if (this.cache.has(key)) {
        this.stats.hits++;
        this.stats.cacheHits++;
        return this.cache.get(key);
      } else {
        this.stats.cacheMisses++;
      }
    }

    // 从提供者异步获取配置
    let value: any;
    for (const provider of this.providers) {
      try {
        if (await provider.has(key)) {
          value = await provider.get(key);
          if (value !== undefined) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error getting config '${key}' from provider '${provider.name}':`, error);
      }
    }

    // 如果没有找到值，使用默认值
    if (value === undefined) {
      value = defaultValue;
    }

    // 验证配置
    if (this.config.enableValidation && value !== undefined) {
      const validation = this.validateKey(key, value);
      if (!validation.isValid) {
        console.warn(`Config validation failed for key '${key}':`, validation.errors);
      }
    }

    // 缓存值
    if (this.config.enableCache && this.cache && value !== undefined) {
      this.cache.set(key, value, this.config.cacheTTL);
    }

    this.stats.misses++;
    return value;
  }

  /**
   * 设置配置值
   */
  public async set(key: string, value: any): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot set config in disposed config manager');
    }

    this.stats.sets++;

    // 验证配置
    if (this.config.enableValidation) {
      const validation = this.validateKey(key, value);
      if (!validation.isValid) {
        throw new Error(`Config validation failed for key '${key}': ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    // 获取旧值
    const oldValue = this.get(key);

    // 找到第一个可写的提供者
    for (const provider of this.providers) {
      if (!provider.readonly) {
        await provider.set(key, value);
        break;
      }
    }

    // 清除缓存
    this.clearCache();

    // 通知监听器
    this.notifyWatchers(key, value, oldValue);

    // 更新统计
    this.stats.lastUpdated = Date.now();
  }

  /**
   * 检查配置是否存在
   */
  public has(key: string): boolean {
    if (this.isDisposed) {
      return false;
    }

    // 先检查缓存
    if (this.config.enableCache && this.cache && this.cache.has(key)) {
      return true;
    }

    // 从提供者检查
    for (const provider of this.providers) {
      try {
        if (provider.has && typeof provider.has === 'function') {
          if (provider.has(key)) {
            return true;
          }
        }
      } catch (error) {
        console.error(`Error checking config '${key}' in provider '${provider.name}':`, error);
      }
    }

    return false;
  }

  /**
   * 异步检查配置是否存在
   */
  public async hasAsync(key: string): Promise<boolean> {
    if (this.isDisposed) {
      return false;
    }

    // 先检查缓存
    if (this.config.enableCache && this.cache && this.cache.has(key)) {
      return true;
    }

    // 从提供者检查
    for (const provider of this.providers) {
      try {
        if (await provider.has(key)) {
          return true;
        }
      } catch (error) {
        console.error(`Error checking config '${key}' in provider '${provider.name}':`, error);
      }
    }

    return false;
  }

  /**
   * 删除配置
   */
  public async remove(key: string): Promise<boolean> {
    if (this.isDisposed) {
      return false;
    }

    // 获取旧值
    const oldValue = this.get(key);

    // 从可写提供者删除
    let removed = false;
    for (const provider of this.providers) {
      if (!provider.readonly) {
        if (await provider.remove(key)) {
          removed = true;
          break;
        }
      }
    }

    if (removed) {
      // 清除缓存
      this.clearCache();

      // 通知监听器
      this.notifyWatchers(key, undefined, oldValue);

      // 更新统计
      this.stats.lastUpdated = Date.now();
    }

    return removed;
  }

  /**
   * 获取所有配置
   */
  public getAll(): Record<string, any> {
    if (this.isDisposed) {
      return {};
    }

    const allConfig: Record<string, any> = {};

    // 按优先级合并配置（优先级高的覆盖优先级低的）
    for (let i = this.providers.length - 1; i >= 0; i--) {
      const provider = this.providers[i];
      try {
        // 这里简化处理，实际应该异步获取所有键
        const keys = provider.keys && typeof provider.keys === 'function'
          ? provider.keys()
          : [];

        if (Array.isArray(keys)) {
          for (const key of keys) {
            const value = provider.get(key);
            if (value !== undefined) {
              allConfig[key] = value;
            }
          }
        }
      } catch (error) {
        console.error(`Error getting all config from provider '${provider.name}':`, error);
      }
    }

    return allConfig;
  }

  /**
   * 获取配置元数据
   */
  public getMetadata(key: string): IConfig | null {
    return this.schemas.get(key) || null;
  }

  /**
   * 验证配置
   */
  public validate(key?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (key) {
      // 验证单个配置
      const value = this.get(key);
      if (value !== undefined) {
        const validation = this.validateKey(key, value);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }
    } else {
      // 验证所有配置
      for (const [schemaKey, schema] of this.schemas) {
        const value = this.get(schemaKey);
        if (value !== undefined) {
          const validation = this.validateKey(schemaKey, value);
          errors.push(...validation.errors);
          warnings.push(...validation.warnings);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 监听配置变化
   */
  public watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
    if (this.isDisposed) {
      return () => {};
    }

    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    const watchers = this.watchers.get(key)!;
    watchers.add(callback);

    // 返回取消监听函数
    return () => {
      watchers.delete(callback);
      if (watchers.size === 0) {
        this.watchers.delete(key);
      }
    };
  }

  /**
   * 批量监听配置变化
   */
  public watchBatch(
    keys: string[],
    callback: (changes: Record<string, { newValue: any; oldValue: any }>) => void
  ): () => void {
    if (this.isDisposed) {
      return () => {};
    }

    this.batchWatchers.add(callback);

    // 为每个键设置监听器
    const unsubscribers = keys.map(key => {
      return this.watch(key, (newValue, oldValue) => {
        const changes: Record<string, { newValue: any; oldValue: any }> = {};
        changes[key] = { newValue, oldValue };
        callback(changes);
      });
    });

    // 返回取消所有监听的函数
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      this.batchWatchers.delete(callback);
    };
  }

  /**
   * 重载配置
   */
  public async reload(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    // 重载所有提供者
    await Promise.all(this.providers.map(provider => provider.reload()));

    // 清除缓存
    this.clearCache();

    // 更新统计
    this.stats.lastUpdated = Date.now();

    this.emit('reloaded');
  }

  /**
   * 导出配置
   */
  public export(format: 'json' | 'yaml' | 'properties' = 'json'): string {
    const config = this.getAll();

    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        // 简化的YAML序列化
        return this.toYaml(config);
      case 'properties':
        return this.toProperties(config);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 导入配置
   */
  public async import(
    data: string | Record<string, any>,
    format: 'json' | 'yaml' | 'properties' = 'json'
  ): Promise<void> {
    let config: Record<string, any>;

    if (typeof data === 'string') {
      switch (format) {
        case 'json':
          config = JSON.parse(data);
          break;
        case 'yaml':
          config = this.fromYaml(data);
          break;
        case 'properties':
          config = this.fromProperties(data);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
    } else {
      config = data;
    }

    // 批量设置配置
    for (const [key, value] of Object.entries(config)) {
      await this.set(key, value);
    }
  }

  /**
   * 获取配置统计
   */
  public getStats(): any {
    const cacheStats = this.cache ? this.cache.getStats() : {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      sets: 0,
      deletes: 0
    };

    return {
      totalConfigs: this.schemas.size,
      providers: this.providers.map(p => ({
        name: p.name,
        priority: p.priority,
        readonly: p.readonly
      })),
      cache: {
        enabled: this.config.enableCache,
        ...cacheStats,
        hitRate: cacheStats.hits + cacheStats.misses > 0
          ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
          : 0
      },
      operations: {
        gets: this.stats.gets,
        sets: this.stats.sets,
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: this.stats.gets > 0
          ? (this.stats.hits / this.stats.gets) * 100
          : 0
      },
      lastUpdated: this.stats.lastUpdated,
      isDisposed: this.isDisposed
    };
  }

  /**
   * 销毁配置管理器
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // 销毁所有提供者
    this.providers.forEach(provider => provider.dispose());
    this.providers = [];

    // 销毁缓存
    if (this.cache) {
      this.cache.clear();
    }

    // 清除监听器
    this.watchers.clear();
    this.batchWatchers.clear();

    // 移除所有事件监听器
    this.removeAllListeners();

    this.isDisposed = true;
  }

  // 私有方法

  /**
   * 初始化缓存
   */
  private initializeCache(): void {
    if (this.config.enableCache) {
      this.cache = new MemoryConfigCache(this.config.cacheTTL);
    }
  }

  /**
   * 设置默认提供者
   */
  private setupDefaultProviders(): void {
    // 这里应该根据配置创建默认提供者
    // 为了简化，这里只是占位
    console.log('Default providers setup placeholder');
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * 验证单个配置项
   */
  private validateKey(key: string, value: any): ValidationResult {
    const schema = this.schemas.get(key);
    if (!schema) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查必需性
    if (schema.required && (value === undefined || value === null)) {
      errors.push({
        key,
        message: `Config '${key}' is required`,
        value
      });
    }

    // 检查类型
    if (value !== undefined && !this.validateType(value, schema.type)) {
      errors.push({
        key,
        message: `Config '${key}' must be of type ${schema.type}`,
        value
      });
    }

    // 检查验证规则
    if (schema.validation && value !== undefined) {
      for (const rule of schema.validation) {
        const result = rule.validate(value);
        if (result === false) {
          errors.push({
            key,
            message: rule.message || `Validation rule '${rule.name}' failed for config '${key}'`,
            value,
            rule: rule.name
          });
        } else if (typeof result === 'string') {
          errors.push({
            key,
            message: result,
            value,
            rule: rule.name
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证类型
   */
  private validateType(value: any, type: ConfigType): boolean {
    switch (type) {
      case ConfigType.STRING:
        return typeof value === 'string';
      case ConfigType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case ConfigType.BOOLEAN:
        return typeof value === 'boolean';
      case ConfigType.ARRAY:
        return Array.isArray(value);
      case ConfigType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case ConfigType.JSON:
        try {
          JSON.stringify(value);
          return true;
        } catch {
          return false;
        }
      case ConfigType.DATE:
        return value instanceof Date || (!isNaN(Date.parse(value)));
      case ConfigType.URL:
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case ConfigType.EMAIL:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }

  /**
   * 通知监听器
   */
  private notifyWatchers(key: string, newValue: any, oldValue: any): void {
    // 通知单个键的监听器
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in config watcher for key ${key}:`, error);
        }
      });
    }

    // 通知批量监听器
    const changes: Record<string, { newValue: any; oldValue: any }> = {};
    changes[key] = { newValue, oldValue };

    this.batchWatchers.forEach(callback => {
      try {
        callback(changes);
      } catch (error) {
        console.error(`Error in batch config watcher:`, error);
      }
    });

    // 发出变更事件
    if (this.config.enableChangeEvents) {
      const changeEvent: IConfigChangeEvent = {
        type: newValue === undefined ? 'removed' : oldValue === undefined ? 'added' : 'updated',
        key,
        newValue,
        oldValue,
        timestamp: Date.now(),
        source: 'config-manager'
      };

      this.emit('change', changeEvent);
    }
  }

  /**
   * 转换为YAML格式
   */
  private toYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}-\n${this.toYaml(item, indent + 1)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      }
    } else {
      yaml += `${spaces}${obj}\n`;
    }

    return yaml;
  }

  /**
   * 从YAML解析
   */
  private fromYaml(yaml: string): Record<string, any> {
    // 简化的YAML解析，实际应该使用专门的YAML库
    throw new Error('YAML parsing not implemented');
  }

  /**
   * 转换为Properties格式
   */
  private toProperties(obj: Record<string, any>, prefix = ''): string {
    let props = '';

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        props += this.toProperties(value, fullKey);
      } else {
        props += `${fullKey}=${value}\n`;
      }
    }

    return props;
  }

  /**
   * 从Properties解析
   */
  private fromProperties(props: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = props.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          this.setNestedValue(result, key, value);
        }
      }
    }

    return result;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: string): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }
}

/**
 * 内存配置缓存实现
 */
class MemoryConfigCache implements IConfigCache {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private ttl: number;

  constructor(ttl: number = 300000) {
    this.ttl = ttl;
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.ttl);
    this.cache.set(key, { value, expires });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // 清理过期项
    this.cleanup();
    return this.cache.size;
  }

  getStats(): any {
    this.cleanup();
    return {
      size: this.cache.size,
      hits: 0, // 简化实现
      misses: 0,
      hitRate: 0,
      sets: 0,
      deletes: 0,
      lastAccessedAt: Date.now()
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}