/**
 * 配置提供者实现
 */

import {
  IConfigProvider,
  ConfigType
} from './types';

/**
 * 内存配置提供者
 */
export class MemoryConfigProvider implements IConfigProvider {
  readonly name = 'memory';
  readonly priority = 100;
  readonly readonly = false;
  readonly supportedTypes?: ConfigType[];

  private config: Record<string, any> = {};
  private watchers: Map<string, Set<(value: any, oldValue?: any) => void>> = new Map();

  constructor(initialConfig: Record<string, any> = {}, options: {
    priority?: number;
    readonly?: boolean;
    supportedTypes?: ConfigType[];
  } = {}) {
    this.config = { ...initialConfig };
    this.priority = options.priority || 100;
    this.readonly = options.readonly !== false;
    this.supportedTypes = options.supportedTypes;
  }

  async get(key: string): Promise<any> {
    return this.config[key];
  }

  async set(key: string, value: any): Promise<void> {
    if (this.readonly) {
      throw new Error('Memory config provider is readonly');
    }

    const oldValue = this.config[key];
    this.config[key] = value;

    // 通知观察者
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`Error in config watcher for key ${key}:`, error);
        }
      });
    }
  }

  async has(key: string): Promise<boolean> {
    return key in this.config;
  }

  async remove(key: string): Promise<boolean> {
    if (this.readonly) {
      return false;
    }

    if (key in this.config) {
      const oldValue = this.config[key];
      delete this.config[key];

      // 通知观察者
      const watchers = this.watchers.get(key);
      if (watchers) {
        watchers.forEach(callback => {
          try {
            callback(undefined, oldValue);
          } catch (error) {
            console.error(`Error in config watcher for key ${key}:`, error);
          }
        });
      }

      return true;
    }

    return false;
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.config);
  }

  async reload(): Promise<void> {
    // 内存提供者不需要重载
  }

  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
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

  dispose(): void {
    this.config = {};
    this.watchers.clear();
  }
}

/**
 * 环境变量配置提供者
 */
export class EnvironmentConfigProvider implements IConfigProvider {
  readonly name = 'environment';
  readonly priority = 90;
  readonly readonly = true;
  readonly supportedTypes = [ConfigType.STRING, ConfigType.NUMBER, ConfigType.BOOLEAN];

  private prefix: string;
  private watchers: Map<string, Set<(value: any, oldValue?: any) => void>> = new Map();

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  async get(key: string): Promise<any> {
    const envKey = this.getEnvKey(key);
    const envValue = process.env[envKey];

    if (envValue === undefined) {
      return undefined;
    }

    return this.parseValue(envValue);
  }

  async set(): Promise<void> {
    throw new Error('Environment config provider is readonly');
  }

  async has(key: string): Promise<boolean> {
    const envKey = this.getEnvKey(key);
    return envKey in process.env;
  }

  async remove(): Promise<boolean> {
    return false; // 环境变量提供者是只读的
  }

  async keys(): Promise<string[]> {
    const prefix = this.prefix ? this.prefix + '_' : '';
    const envKeys = Object.keys(process.env);

    return envKeys
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length).replace(/_/g, '.').toLowerCase());
  }

  async reload(): Promise<void> {
    // 环境变量提供者不需要重载
  }

  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
    // 环境变量通常不会在运行时变化，所以这里只是占位实现
    console.warn('Environment config provider does not support watching for changes');
    return () => {};
  }

  dispose(): void {
    this.watchers.clear();
  }

  private getEnvKey(key: string): string {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    return this.prefix ? `${this.prefix}_${envKey}` : envKey;
  }

  private parseValue(value: string): any {
    // 尝试解析为JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // 如果解析失败，返回原始字符串
        return value;
      }
    }

    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 尝试解析为数字
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }

    // 返回字符串
    return value;
  }
}

/**
 * 文件配置提供者
 */
export class FileConfigProvider implements IConfigProvider {
  readonly name: string;
  readonly priority: number;
  readonly readonly: boolean;
  readonly supportedTypes?: ConfigType[];

  private filePath: string;
  private config: Record<string, any> = {};
  private watchers: Map<string, Set<(value: any, oldValue?: any) => void>> = new Map();
  private fileWatcher?: any;
  private lastModified: number = 0;

  constructor(
    filePath: string,
    options: {
      name?: string;
      priority?: number;
      readonly?: boolean;
      supportedTypes?: ConfigType[];
    } = {}
  ) {
    this.filePath = filePath;
    this.name = options.name || `file:${filePath}`;
    this.priority = options.priority || 80;
    this.readonly = options.readonly !== false;
    this.supportedTypes = options.supportedTypes;
  }

  async get(key: string): Promise<any> {
    await this.ensureLoaded();
    return this.config[key];
  }

  async set(key: string, value: any): Promise<void> {
    if (this.readonly) {
      throw new Error('File config provider is readonly');
    }

    await this.ensureLoaded();
    const oldValue = this.config[key];
    this.config[key] = value;

    await this.saveToFile();

    // 通知观察者
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`Error in config watcher for key ${key}:`, error);
        }
      });
    }
  }

  async has(key: string): Promise<boolean> {
    await this.ensureLoaded();
    return key in this.config;
  }

  async remove(key: string): Promise<boolean> {
    if (this.readonly) {
      return false;
    }

    await this.ensureLoaded();
    if (key in this.config) {
      const oldValue = this.config[key];
      delete this.config[key];

      await this.saveToFile();

      // 通知观察者
      const watchers = this.watchers.get(key);
      if (watchers) {
        watchers.forEach(callback => {
          try {
            callback(undefined, oldValue);
          } catch (error) {
            console.error(`Error in config watcher for key ${key}:`, error);
          }
        });
      }

      return true;
    }

    return false;
  }

  async keys(): Promise<string[]> {
    await this.ensureLoaded();
    return Object.keys(this.config);
  }

  async reload(): Promise<void> {
    await this.loadFromFile();
  }

  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
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

  dispose(): void {
    this.config = {};
    this.watchers.clear();

    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (Object.keys(this.config).length === 0) {
      await this.loadFromFile();
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      // 这里应该使用实际的文件系统API
      // 为了简化，这里只是模拟
      const fs = require('fs').promises;
      const path = require('path');

      if (await fs.access(this.filePath).catch(() => false)) {
        const content = await fs.readFile(this.filePath, 'utf-8');
        const ext = path.extname(this.filePath).toLowerCase();

        switch (ext) {
          case '.json':
            this.config = JSON.parse(content);
            break;
          case '.js':
            delete require.cache[require.resolve(this.filePath)];
            this.config = require(this.filePath);
            break;
          default:
            // 默认尝试JSON解析
            this.config = JSON.parse(content);
        }

        this.lastModified = Date.now();
      }
    } catch (error) {
      console.error(`Failed to load config from file ${this.filePath}:`, error);
      this.config = {};
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(this.filePath, JSON.stringify(this.config, null, 2), 'utf-8');
      this.lastModified = Date.now();
    } catch (error) {
      console.error(`Failed to save config to file ${this.filePath}:`, error);
    }
  }
}

/**
 * 远程配置提供者（例如从API获取配置）
 */
export class RemoteConfigProvider implements IConfigProvider {
  readonly name: string;
  readonly priority: number;
  readonly readonly = true;
  readonly supportedTypes?: ConfigType[];

  private url: string;
  private headers: Record<string, string>;
  private config: Record<string, any> = {};
  private lastFetch: number = 0;
  private cacheTimeout: number;

  constructor(
    url: string,
    options: {
      name?: string;
      priority?: number;
      headers?: Record<string, string>;
      cacheTimeout?: number;
      supportedTypes?: ConfigType[];
    } = {}
  ) {
    this.url = url;
    this.name = options.name || `remote:${url}`;
    this.priority = options.priority || 70;
    this.headers = options.headers || {};
    this.cacheTimeout = options.cacheTimeout || 300000; // 5分钟
    this.supportedTypes = options.supportedTypes;
  }

  async get(key: string): Promise<any> {
    await this.ensureFresh();
    return this.config[key];
  }

  async set(): Promise<void> {
    throw new Error('Remote config provider is readonly');
  }

  async has(key: string): Promise<boolean> {
    await this.ensureFresh();
    return key in this.config;
  }

  async remove(): Promise<boolean> {
    return false; // 远程配置提供者是只读的
  }

  async keys(): Promise<string[]> {
    await this.ensureFresh();
    return Object.keys(this.config);
  }

  async reload(): Promise<void> {
    this.lastFetch = 0;
    await this.fetchConfig();
  }

  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
    // 远程配置提供者不支持实时监听
    console.warn('Remote config provider does not support watching for changes');
    return () => {};
  }

  dispose(): void {
    this.config = {};
  }

  private async ensureFresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch > this.cacheTimeout) {
      await this.fetchConfig();
    }
  }

  private async fetchConfig(): Promise<void> {
    try {
      // 这里应该使用实际的HTTP客户端
      // 为了简化，这里只是模拟
      const response = await fetch(this.url, {
        headers: this.headers
      });

      if (response.ok) {
        this.config = await response.json();
        this.lastFetch = Date.now();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to fetch remote config from ${this.url}:`, error);
      // 保持现有配置，不抛出错误
    }
  }
}

/**
 * 复合配置提供者（组合多个提供者）
 */
export class CompositeConfigProvider implements IConfigProvider {
  readonly name: string;
  readonly priority: number;
  readonly readonly: boolean;

  private providers: IConfigProvider[] = [];

  constructor(name: string = 'composite', priority: number = 50) {
    this.name = name;
    this.priority = priority;
    this.readonly = false; // 由子提供者决定
  }

  addProvider(provider: IConfigProvider): void {
    this.providers.push(provider);
    // 按优先级排序
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  removeProvider(name: string): void {
    this.providers = this.providers.filter(p => p.name !== name);
  }

  async get(key: string): Promise<any> {
    for (const provider of this.providers) {
      if (await provider.has(key)) {
        return await provider.get(key);
      }
    }
    return undefined;
  }

  async set(key: string, value: any): Promise<void> {
    // 找到第一个支持写入的提供者
    for (const provider of this.providers) {
      if (!provider.readonly) {
        await provider.set(key, value);
        return;
      }
    }
    throw new Error('No writable provider available');
  }

  async has(key: string): Promise<boolean> {
    for (const provider of this.providers) {
      if (await provider.has(key)) {
        return true;
      }
    }
    return false;
  }

  async remove(key: string): Promise<boolean> {
    // 找到第一个支持写入的提供者
    for (const provider of this.providers) {
      if (!provider.readonly) {
        return await provider.remove(key);
      }
    }
    return false;
  }

  async keys(): Promise<string[]> {
    const allKeys = new Set<string>();
    for (const provider of this.providers) {
      const keys = await provider.keys();
      keys.forEach(key => allKeys.add(key));
    }
    return Array.from(allKeys);
  }

  async reload(): Promise<void> {
    await Promise.all(this.providers.map(provider => provider.reload()));
  }

  watch(key: string, callback: (value: any, oldValue?: any) => void): () => void {
    const unsubscribers: (() => void)[] = [];

    for (const provider of this.providers) {
      unsubscribers.push(provider.watch(key, callback));
    }

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  dispose(): void {
    this.providers.forEach(provider => provider.dispose());
    this.providers = [];
  }

  getProviders(): IConfigProvider[] {
    return [...this.providers];
  }
}