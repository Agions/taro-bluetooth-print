/**
 * Offline Cache
 *
 * Provides offline storage for print jobs when device is disconnected.
 * Jobs are persisted to local storage and can be synced when reconnected.
 *
 * Optimizations:
 * - In-memory cache layer: loadJobs reads from storage once, subsequent
 *   reads return the in-memory copy. save/remove persist to storage.
 * - sync() processes all jobs in memory and persists once (O(n) instead of O(n²)).
 * - Uint8Array serialized as Base64 strings instead of number[] (≈3x less storage).
 * - Automatic expired-job cleanup on load and when cache is at capacity.
 * - **v2.12.0**: LRU eviction policy to prevent unbounded memory growth.
 *
 * @example
 * ```typescript
 * const cache = new OfflineCache();
 * await cache.save({ id: 'job1', data: printData, ... });
 * const jobs = await cache.getAll();
 * await cache.sync();
 * ```
 */

import Taro from '@tarojs/taro';
import { Logger } from '@/utils/logger';
import { normalizeError, emitAndThrow } from '@/utils/normalizeError';
import { EventEmitter } from '@/core/EventEmitter';

/**
 * Cached job
 */
export interface CachedJob {
  /** Unique job identifier */
  id: string;
  /** Print data */
  data: Uint8Array;
  /** Creation timestamp */
  createdAt: number;
  /** Expiry timestamp */
  expiresAt: number;
  /** Retry count */
  retryCount: number;
  /** Last error message */
  lastError?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of cached jobs (default: 50) */
  maxJobs: number;
  /** Job expiry time in ms (default: 24 hours) */
  expiryTime: number;
  /** Storage key prefix (default: 'bt_print_cache_') */
  storagePrefix: string;
  /** Auto sync when connected (default: true) */
  autoSync: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cached jobs */
  total: number;
  /** Expired jobs */
  expired: number;
  /** Pending jobs */
  pending: number;
}

/**
 * Offline cache events
 */
export interface OfflineCacheEvents {
  'job-saved': CachedJob;
  'job-removed': string;
  'job-synced': CachedJob;
  'sync-started': void;
  'sync-completed': { success: number; failed: number };
  'cleanup-completed': number;
  error: Error;
}

/**
 * Offline cache interface
 */
export interface IOfflineCache {
  save(job: CachedJob): void;
  getAll(): CachedJob[];
  remove(jobId: string): void;
  cleanup(): number;
  sync(): Promise<void>;
  getStats(): CacheStats;
}

/**
 * Sync executor function type
 */
export type SyncExecutor = (job: CachedJob) => Promise<void>;

/**
 * Storage format for serialization.
 * `data` can be a Base64 string (new) or a number[] (legacy) for backward compat.
 */
interface StoredJob {
  id: string;
  data: number[] | string;
  createdAt: number;
  expiresAt: number;
  retryCount: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxJobs: 50,
  expiryTime: 24 * 60 * 60 * 1000, // 24 hours
  storagePrefix: 'bt_print_cache_',
  autoSync: true,
};

// ─── Base64 helpers (mini-program safe, no btoa/atob dependency) ────────────

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  let result = '';
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = i + 1 < len ? (bytes[i + 1] ?? 0) : 0;
    const b3 = i + 2 < len ? (bytes[i + 2] ?? 0) : 0;
    result += B64_CHARS[b1 >> 2];
    result += B64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b3 & 63] : '=';
  }
  return result;
}

function base64ToUint8Array(b64: string): Uint8Array {
  // Strip padding for length calculation
  const padLen = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const outLen = ((b64.length + 3) >> 2) * 3 - padLen;
  const result = new Uint8Array(outLen);
  let idx = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const ch1 = b64[i];
    const ch2 = i + 1 < b64.length ? b64[i + 1] : undefined;
    const c1 = ch1 !== undefined ? B64_CHARS.indexOf(ch1) : 0;
    const c2 = ch2 !== undefined ? B64_CHARS.indexOf(ch2) : 0;
    const ch3 = i + 2 < b64.length ? b64[i + 2] : undefined;
    const ch4 = i + 3 < b64.length ? b64[i + 3] : undefined;
    const c3 = ch3 !== undefined ? B64_CHARS.indexOf(ch3) : 0;
    const c4 = ch4 !== undefined ? B64_CHARS.indexOf(ch4) : 0;
    if (idx < outLen) result[idx++] = (c1 << 2) | (c2 >> 4);
    if (idx < outLen) result[idx++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (idx < outLen) result[idx++] = ((c3 & 3) << 6) | c4;
  }
  return result;
}

/**
 * Offline Cache class
 * Manages offline storage for print jobs
 */
export class OfflineCache extends EventEmitter<OfflineCacheEvents> implements IOfflineCache {
  protected readonly logger = Logger.scope('OfflineCache');
  private readonly config: CacheConfig;
  private readonly JOBS_KEY: string;
  private syncExecutor: SyncExecutor | null = null;
  private isSyncing = false;

  /** In-memory cache – null means "not yet loaded from storage" */
  private jobCache: CachedJob[] | null = null;

  /** LRU tracking: job IDs in access order (most recently used at end) */
  private lruOrder: string[] = [];

  /** Maximum cache entries for LRU eviction (default: 100) */
  private readonly maxCacheEntries = 100;

  /**
   * Creates a new OfflineCache instance
   */
  constructor(config?: Partial<CacheConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.JOBS_KEY = `${this.config.storagePrefix}jobs`;
  }

  /**
   * Set the sync executor function
   */
  setSyncExecutor(executor: SyncExecutor): void {
    this.syncExecutor = executor;
  }

  /**
   * Save a job to cache.
   * Operates on the in-memory cache and persists to storage once.
   * Includes LRU eviction if cache exceeds max entries.
   */
  save(job: CachedJob): void {
    try {
      const jobs = this.loadJobs();

      // LRU eviction: remove least recently used jobs if at capacity
      this.evictIfNecessary(jobs);

      // Auto-cleanup expired jobs when at capacity
      if (jobs.length >= this.config.maxJobs) {
        const now = Date.now();
        const expiredIndex = jobs.findIndex(j => j.expiresAt < now);
        if (expiredIndex !== -1) {
          jobs.splice(expiredIndex, 1);
        } else {
          jobs.shift(); // Remove oldest
        }
      }

      // Check if job already exists (O(n) scan, acceptable for max 50 items)
      const existingIndex = jobs.findIndex(j => j.id === job.id);
      if (existingIndex !== -1) {
        jobs[existingIndex] = job;
        // Update LRU order: move to end (most recently used)
        this.updateLRU(job.id);
      } else {
        jobs.push(job);
        // Add to LRU order
        this.lruOrder.push(job.id);
      }

      this.saveJobs(jobs);
      this.emit('job-saved', job);
      this.logger.debug(`Job saved to cache: ${job.id}`);
    } catch (error) {
      emitAndThrow(error, this.emit.bind(this));
    }
  }

  /**
   * Get all cached jobs
   * Updates LRU order for each job accessed.
   */
  getAll(): CachedJob[] {
    const jobs = this.loadJobs();
    // Update LRU order for all accessed jobs
    for (const job of jobs) {
      this.updateLRU(job.id);
    }
    return jobs;
  }

  /**
   * Remove a job from cache.
   * Operates on the in-memory cache and persists to storage once.
   */
  remove(jobId: string): void {
    try {
      const jobs = this.loadJobs();
      const index = jobs.findIndex(j => j.id === jobId);

      if (index !== -1) {
        jobs.splice(index, 1);
        this.saveJobs(jobs);
        this.emit('job-removed', jobId);
        this.logger.debug(`Job removed from cache: ${jobId}`);
      }
    } catch (error) {
      emitAndThrow(error, this.emit.bind(this));
    }
  }

  /**
   * Cleanup expired jobs.
   * Operates on the in-memory cache and persists to storage once.
   */
  cleanup(): number {
    try {
      const jobs = this.loadJobs();
      const now = Date.now();
      const validJobs = jobs.filter(j => j.expiresAt > now);
      const removedCount = jobs.length - validJobs.length;

      if (removedCount > 0) {
        this.saveJobs(validJobs);
        this.emit('cleanup-completed', removedCount);
        this.logger.info(`Cleaned up ${removedCount} expired jobs`);
      }

      return removedCount;
    } catch (error) {
      emitAndThrow(error, this.emit.bind(this));
    }
  }

  /**
   * Sync cached jobs (execute them).
   *
   * **Optimized**: All processing happens on the in-memory array; a single
   * persist happens at the end.  Previous implementation called remove()
   * per job → O(n) storage reads/writes → O(n²) total.  Now O(n).
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress');
      return;
    }

    if (!this.syncExecutor) {
      this.logger.warn('No sync executor set');
      return;
    }

    this.isSyncing = true;
    this.emit('sync-started', undefined);

    let success = 0;
    let failed = 0;

    try {
      const allJobs = this.loadJobs();
      const now = Date.now();
      const remaining: CachedJob[] = [];

      for (const job of allJobs) {
        // Skip expired jobs (don't include in remaining)
        if (job.expiresAt < now) {
          continue;
        }

        try {
          await this.syncExecutor(job);
          this.emit('job-synced', job);
          success++;
          this.logger.debug(`Job synced: ${job.id}`);
        } catch (error) {
          failed++;
          job.retryCount++;
          job.lastError = normalizeError(error).message;
          remaining.push(job); // Keep failed jobs for retry
          this.logger.warn(`Job sync failed: ${job.id}`, error);
        }
      }

      // Single persist for all changes
      this.saveJobs(remaining);

      this.emit('sync-completed', { success, failed });
      this.logger.info(`Sync completed: ${success} success, ${failed} failed`);
    } catch (error) {
      emitAndThrow(error, this.emit.bind(this));
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const jobs = this.loadJobs();
    const now = Date.now();

    let expired = 0;
    let pending = 0;

    for (const job of jobs) {
      if (job.expiresAt < now) {
        expired++;
      } else {
        pending++;
      }
    }

    return {
      total: jobs.length,
      expired,
      pending,
    };
  }

  /**
   * Check if syncing
   */
  get syncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Create a cached job from print data
   */
  createJob(id: string, data: Uint8Array, metadata?: Record<string, unknown>): CachedJob {
    const now = Date.now();
    return {
      id,
      data,
      createdAt: now,
      expiresAt: now + this.config.expiryTime,
      retryCount: 0,
      metadata,
    };
  }

  /**
   * Clear all cached jobs.
   * Invalidates the in-memory cache and removes from storage.
   */
  clear(): void {
    try {
      this.jobCache = null;
      Taro.removeStorageSync(this.JOBS_KEY);
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      throw error;
    }
  }

  // ─── Private: storage I/O with in-memory cache ──────────────────────────

  /**
   * Load jobs – returns in-memory cache when available, otherwise reads
   * from storage (once) and caches the result.
   */
  private loadJobs(): CachedJob[] {
    if (this.jobCache !== null) {
      return this.jobCache;
    }

    try {
      const stored: unknown = Taro.getStorageSync(this.JOBS_KEY);
      if (!stored || !Array.isArray(stored)) {
        this.jobCache = [];
        return this.jobCache;
      }

      // Convert stored format back to CachedJob
      this.jobCache = (stored as StoredJob[]).map(job => this.deserializeJob(job));
      return this.jobCache;
    } catch (error) {
      this.logger.error('Error loading jobs:', error);
      this.jobCache = [];
      return this.jobCache;
    }
  }

  /**
   * Save jobs to storage.
   * Also updates the in-memory cache so subsequent reads skip storage.
   */
  private saveJobs(jobs: CachedJob[]): void {
    try {
      this.jobCache = jobs;
      const stored: StoredJob[] = jobs.map(job => this.serializeJob(job));
      Taro.setStorageSync(this.JOBS_KEY, stored);
    } catch (error) {
      this.logger.error('Error saving jobs:', error);
      throw error;
    }
  }

  /**
   * Serialize job for storage.
   * Uses Base64 encoding for Uint8Array data instead of Array.from()
   * which would expand each byte to a 64-bit float (8× memory).
   * Base64 is ~1.33× the original size – a net win.
   */
  private serializeJob(job: CachedJob): StoredJob {
    return {
      id: job.id,
      data: uint8ArrayToBase64(job.data),
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
      retryCount: job.retryCount,
      lastError: job.lastError,
      metadata: job.metadata,
    };
  }

  /**
   * Deserialize job from storage.
   * Supports both legacy number[] format and new Base64 string format
   * for backward compatibility.
   */
  private deserializeJob(stored: StoredJob): CachedJob {
    let data: Uint8Array;
    if (typeof stored.data === 'string') {
      data = base64ToUint8Array(stored.data);
    } else {
      data = new Uint8Array(stored.data);
    }
    return {
      id: stored.id,
      data,
      createdAt: stored.createdAt,
      expiresAt: stored.expiresAt,
      retryCount: stored.retryCount,
      lastError: stored.lastError,
      metadata: stored.metadata,
    };
  }

  // ==========================================================================
  // LRU (Least Recently Used) Cache Eviction
  // ==========================================================================

  /**
   * Evict least recently used jobs if cache exceeds max entries.
   * Called before adding a new job to prevent unbounded memory growth.
   */
  private evictIfNecessary(jobs: CachedJob[]): void {
    if (jobs.length <= this.maxCacheEntries) {
      return;
    }

    // Sort by LRU order (least recently used first)
    const jobsByLRU = jobs.sort((a, b) => {
      const aIndex = this.lruOrder.indexOf(a.id);
      const bIndex = this.lruOrder.indexOf(b.id);
      return aIndex - bIndex;
    });

    // Remove least recently used jobs
    const toRemove = jobsByLRU.slice(0, jobs.length - this.maxCacheEntries);
    for (const job of toRemove) {
      const idx = jobs.findIndex(j => j.id === job.id);
      if (idx !== -1) {
        jobs.splice(idx, 1);
      }
      const lruIdx = this.lruOrder.indexOf(job.id);
      if (lruIdx !== -1) {
        this.lruOrder.splice(lruIdx, 1);
      }
      this.logger.debug(`LRU eviction: removed job ${job.id}`);
    }
  }

  /**
   * Update LRU order for a job ID (move to end = most recently used).
   */
  private updateLRU(jobId: string): void {
    const idx = this.lruOrder.indexOf(jobId);
    if (idx !== -1) {
      // Remove from current position
      this.lruOrder.splice(idx, 1);
    }
    // Add to end (most recently used)
    this.lruOrder.push(jobId);
  }
}

// Export singleton instance for convenience
export const offlineCache = new OfflineCache();
