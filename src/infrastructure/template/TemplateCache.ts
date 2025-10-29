/**
 * 模板缓存
 */

import { ITemplate } from '../../domain/template/types';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // 生存时间（毫秒）
  enableStats?: boolean;
}

export class TemplateCache {
  private cache = new Map<string, CacheEntry<ITemplate>>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly enableStats: boolean;

  // 统计信息
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 300000; // 默认5分钟
    this.enableStats = options.enableStats || false;

    // 定期清理过期项
    if (this.ttl > 0) {
      setInterval(() => {
        this.cleanup();
      }, Math.min(this.ttl / 4, 60000)); // 最多每分钟清理一次
    }
  }

  /**
   * 获取模板
   */
  get(key: string): ITemplate | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableStats) {
        this.misses++;
      }
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.enableStats) {
        this.misses++;
      }
      return null;
    }

    // 更新访问信息
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    if (this.enableStats) {
      this.hits++;
    }

    return entry.value;
  }

  /**
   * 设置模板
   */
  set(key: string, template: ITemplate): void {
    // 如果缓存已满，移除最少使用的项
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry<ITemplate> = {
      value: template,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * 删除模板
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查模板是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存键列表
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    if (this.ttl <= 0) {
      return 0;
    }

    let removedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * 移除最少使用的项
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedAccessCount = Infinity;
    let leastUsedLastAccessed = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastUsedAccessCount ||
        (entry.accessCount === leastUsedAccessCount && entry.lastAccessed < leastUsedLastAccessed)) {
        leastUsedKey = key;
        leastUsedAccessCount = entry.accessCount;
        leastUsedLastAccessed = entry.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      if (this.enableStats) {
        this.evictions++;
      }
    }
  }

  /**
   * 检查项是否过期
   */
  private isExpired(entry: CacheEntry<ITemplate>): boolean {
    return this.ttl > 0 && (Date.now() - entry.timestamp) > this.ttl;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
    size: number;
    maxSize: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * 获取详细的缓存信息
   */
  getDetailedInfo(): Array<{
    key: string;
    accessCount: number;
    age: number;
    lastAccessed: number;
    size: number;
  }> {
    const now = Date.now();
    const info = [];

    for (const [key, entry] of this.cache) {
      info.push({
        key,
        accessCount: entry.accessCount,
        age: now - entry.timestamp,
        lastAccessed: now - entry.lastAccessed,
        size: this.estimateSize(entry.value)
      });
    }

    return info.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  /**
   * 估算对象大小
   */
  private estimateSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }

  /**
   * 预热缓存
   */
  async warmup(templates: Array<{ key: string; loader: () => Promise<ITemplate> }>): Promise<void> {
    const promises = templates.map(async ({ key, loader }) => {
      try {
        const template = await loader();
        this.set(key, template);
      } catch (error) {
        console.warn(`Failed to warmup template '${key}':`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 获取缓存配置
   */
  getConfig(): CacheOptions {
    return {
      maxSize: this.maxSize,
      ttl: this.ttl,
      enableStats: this.enableStats
    };
  }

  /**
   * 导出缓存数据
   */
  export(): Array<{ key: string; template: any; timestamp: number }> {
    const data = [];
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      // 只导出未过期的项
      if (!this.isExpired(entry)) {
        data.push({
          key,
          template: entry.value,
          timestamp: entry.timestamp
        });
      }
    }

    return data;
  }

  /**
   * 导入缓存数据
   */
  import(data: Array<{ key: string; template: any; timestamp: number }>): number {
    let importedCount = 0;

    for (const item of data) {
      // 检查数据是否有效
      if (item.key && item.template && item.timestamp) {
        // 检查是否过期
        if (this.ttl <= 0 || (Date.now() - item.timestamp) <= this.ttl) {
          const entry: CacheEntry<ITemplate> = {
            value: item.template,
            timestamp: item.timestamp,
            accessCount: 1,
            lastAccessed: Date.now()
          };

          this.cache.set(item.key, entry);
          importedCount++;
        }
      }
    }

    return importedCount;
  }
}