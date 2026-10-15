/**
 * Universal Storage Adapters
 * 跨平台存储驱动抽象层
 *
 * 统一屏蔽微信/支付宝/百度等小程序存储、浏览器 LocalStorage 及内存存储差异。
 */

import { Logger } from '@/utils/logger';

/**
 * 跨端持久化存储适配器接口
 */
export interface IStorageAdapter {
  /** 获取存储的值 */
  getItem(key: string): string | null;
  /** 设置存储键值对 */
  setItem(key: string, value: string): void;
  /** 移除指定键 */
  removeItem(key: string): void;
  /** 清空存储 */
  clear(): void;
  /** 获取所有存储的键列表（可选） */
  getAllKeys?(): string[];
}

/**
 * 内存存储适配器（测试环境与受限环境兜底）
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private readonly storage = new Map<string, string>();
  private readonly prefix: string;

  constructor(prefix = '') {
    this.prefix = prefix;
  }

  getItem(key: string): string | null {
    return this.storage.get(this.prefix + key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(this.prefix + key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(this.prefix + key);
  }

  clear(): void {
    if (!this.prefix) {
      this.storage.clear();
      return;
    }
    for (const key of Array.from(this.storage.keys())) {
      if (key.startsWith(this.prefix)) {
        this.storage.delete(key);
      }
    }
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }
}

/**
 * LocalStorage 适配器（Web / H5 / Electron）
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly prefix: string;
  private readonly logger = Logger.scope('LocalStorageAdapter');

  constructor(prefix = '') {
    this.prefix = prefix;
  }

  getItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(this.prefix + key);
      }
    } catch (err) {
      this.logger.warn(`Failed to read from localStorage: ${key}`, err);
    }
    return null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.prefix + key, value);
      }
    } catch (err) {
      this.logger.warn(`Failed to write to localStorage: ${key}`, err);
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.prefix + key);
      }
    } catch (err) {
      this.logger.warn(`Failed to remove from localStorage: ${key}`, err);
    }
  }

  clear(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        if (!this.prefix) {
          localStorage.clear();
          return;
        }
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(k => localStorage.removeItem(k));
      }
    } catch (err) {
      this.logger.warn('Failed to clear localStorage', err);
    }
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            keys.push(k.slice(this.prefix.length));
          }
        }
      }
    } catch {
      // ignore
    }
    return keys;
  }
}

interface TaroStorageAPI {
  getStorageSync: (key: string) => unknown;
  setStorageSync: (key: string, data: unknown) => void;
  removeStorageSync: (key: string) => void;
  clearStorageSync: () => void;
}

function getGlobalTaro(): TaroStorageAPI | undefined {
  const globalObj = globalThis as unknown as Record<string, unknown>;
  const taro = globalObj.Taro;
  if (
    taro &&
    typeof taro === 'object' &&
    'getStorageSync' in taro &&
    typeof (taro as TaroStorageAPI).getStorageSync === 'function'
  ) {
    return taro as TaroStorageAPI;
  }
  return undefined;
}

/**
 * Taro 小程序统一存储适配器（微信 / 支付宝 / 百度 / 字节 / QQ）
 */
export class TaroStorageAdapter implements IStorageAdapter {
  private readonly prefix: string;
  private readonly logger = Logger.scope('TaroStorageAdapter');

  constructor(prefix = '') {
    this.prefix = prefix;
  }

  getItem(key: string): string | null {
    try {
      const taro = getGlobalTaro();
      if (taro) {
        const res = taro.getStorageSync(this.prefix + key);
        if (typeof res === 'string') return res;
        if (res !== undefined && res !== null) return JSON.stringify(res);
      }
    } catch (err) {
      this.logger.warn(`Failed to read from Taro storage: ${key}`, err);
    }
    return null;
  }

  setItem(key: string, value: string): void {
    try {
      const taro = getGlobalTaro();
      if (taro) {
        taro.setStorageSync(this.prefix + key, value);
      }
    } catch (err) {
      this.logger.warn(`Failed to write to Taro storage: ${key}`, err);
    }
  }

  removeItem(key: string): void {
    try {
      const taro = getGlobalTaro();
      if (taro) {
        taro.removeStorageSync(this.prefix + key);
      }
    } catch (err) {
      this.logger.warn(`Failed to remove from Taro storage: ${key}`, err);
    }
  }

  clear(): void {
    try {
      const taro = getGlobalTaro();
      if (taro) {
        taro.clearStorageSync();
      }
    } catch (err) {
      this.logger.warn('Failed to clear Taro storage', err);
    }
  }
}

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    const testKey = '__bt_storage_probe__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 自动探测环境并生成最佳存储适配器
 */
export function createUniversalStorage(prefix = 'taro_bt_'): IStorageAdapter {
  if (getGlobalTaro() !== undefined) {
    return new TaroStorageAdapter(prefix);
  }
  if (isLocalStorageAvailable()) {
    return new LocalStorageAdapter(prefix);
  }
  return new MemoryStorageAdapter(prefix);
}
