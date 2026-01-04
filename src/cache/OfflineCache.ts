/**
 * Offline Cache
 *
 * Provides offline storage for print jobs when device is disconnected.
 * Jobs are persisted to local storage and can be synced when reconnected.
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
 * Event handler type
 */
type EventHandler<T> = (data: T) => void;

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
 * Storage format for serialization
 */
interface StoredJob {
  id: string;
  data: number[]; // Uint8Array serialized as number array
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

/**
 * Offline Cache class
 * Manages offline storage for print jobs
 */
export class OfflineCache implements IOfflineCache {
  private readonly logger = Logger.scope('OfflineCache');
  private readonly listeners: Map<string, Set<EventHandler<unknown>>> = new Map();
  private readonly config: CacheConfig;
  private readonly JOBS_KEY: string;
  private syncExecutor: SyncExecutor | null = null;
  private isSyncing = false;

  /**
   * Creates a new OfflineCache instance
   */
  constructor(config?: Partial<CacheConfig>) {
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
   * Save a job to cache
   */
  save(job: CachedJob): void {
    try {
      const jobs = this.loadJobs();

      // Check max jobs limit
      if (jobs.length >= this.config.maxJobs) {
        // Remove oldest expired job or oldest job
        const now = Date.now();
        const expiredIndex = jobs.findIndex(j => j.expiresAt < now);
        if (expiredIndex !== -1) {
          jobs.splice(expiredIndex, 1);
        } else {
          jobs.shift(); // Remove oldest
        }
      }

      // Check if job already exists
      const existingIndex = jobs.findIndex(j => j.id === job.id);
      if (existingIndex !== -1) {
        jobs[existingIndex] = job;
      } else {
        jobs.push(job);
      }

      this.saveJobs(jobs);
      this.emit('job-saved', job);
      this.logger.debug(`Job saved to cache: ${job.id}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Get all cached jobs
   */
  getAll(): CachedJob[] {
    return this.loadJobs();
  }

  /**
   * Remove a job from cache
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
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Cleanup expired jobs
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
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Sync cached jobs (execute them)
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
      const jobs = this.loadJobs();
      const now = Date.now();

      for (const job of jobs) {
        // Skip expired jobs
        if (job.expiresAt < now) {
          this.remove(job.id);
          continue;
        }

        try {
          await this.syncExecutor(job);
          this.remove(job.id);
          this.emit('job-synced', job);
          success++;
          this.logger.debug(`Job synced: ${job.id}`);
        } catch (error) {
          failed++;
          job.retryCount++;
          job.lastError = error instanceof Error ? error.message : String(error);
          this.save(job);
          this.logger.warn(`Job sync failed: ${job.id}`, error);
        }
      }

      this.emit('sync-completed', { success, failed });
      this.logger.info(`Sync completed: ${success} success, ${failed} failed`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
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
   * Register event listener
   */
  on<K extends keyof OfflineCacheEvents>(
    event: K,
    callback: EventHandler<OfflineCacheEvents[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventHandler<unknown>);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof OfflineCacheEvents>(
    event: K,
    callback: EventHandler<OfflineCacheEvents[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback as EventHandler<unknown>);
    }
  }

  /**
   * Clear all cached jobs
   */
  clear(): void {
    try {
      Taro.removeStorageSync(this.JOBS_KEY);
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Load jobs from storage
   */
  private loadJobs(): CachedJob[] {
    try {
      const stored: unknown = Taro.getStorageSync(this.JOBS_KEY);
      if (!stored || !Array.isArray(stored)) {
        return [];
      }

      // Convert stored format back to CachedJob
      return (stored as StoredJob[]).map(job => this.deserializeJob(job));
    } catch (error) {
      this.logger.error('Error loading jobs:', error);
      return [];
    }
  }

  /**
   * Save jobs to storage
   */
  private saveJobs(jobs: CachedJob[]): void {
    try {
      // Convert to storable format
      const stored: StoredJob[] = jobs.map(job => this.serializeJob(job));
      Taro.setStorageSync(this.JOBS_KEY, stored);
    } catch (error) {
      this.logger.error('Error saving jobs:', error);
      throw error;
    }
  }

  /**
   * Serialize job for storage
   */
  private serializeJob(job: CachedJob): StoredJob {
    return {
      id: job.id,
      data: Array.from(job.data),
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
      retryCount: job.retryCount,
      lastError: job.lastError,
      metadata: job.metadata,
    };
  }

  /**
   * Deserialize job from storage
   */
  private deserializeJob(stored: StoredJob): CachedJob {
    return {
      id: stored.id,
      data: new Uint8Array(stored.data),
      createdAt: stored.createdAt,
      expiresAt: stored.expiresAt,
      retryCount: stored.retryCount,
      lastError: stored.lastError,
      metadata: stored.metadata,
    };
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof OfflineCacheEvents>(event: K, data: OfflineCacheEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }
}

// Export singleton instance for convenience
export const offlineCache = new OfflineCache();
