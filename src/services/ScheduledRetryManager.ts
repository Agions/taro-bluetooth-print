/**
 * Scheduled Retry Manager
 *
 * Provides time-based retry scheduling for failed print jobs.
 * Supports exponential backoff and persists scheduled retries across restarts.
 *
 * @example
 * ```typescript
 * const manager = new ScheduledRetryManager();
 *
 * // Schedule a retry in 30 seconds
 * manager.scheduleRetry('job-123', new Date(Date.now() + 30_000));
 *
 * // Schedule with exponential backoff
 * manager.scheduleRetry('job-456', new Date(), {
 *   baseDelay: 1000,
 *   maxDelay: 60000,
 *   maxAttempts: 5,
 * });
 *
 * // Cancel a scheduled retry
 * manager.cancelRetry('job-123');
 *
 * // Get all scheduled retries
 * const retries = manager.getScheduledRetries();
 * ```
 */

import { Logger } from '@/utils/logger';
import { normalizeError } from '@/utils/normalizeError';
import { OfflineCache, CachedJob } from '@/cache/OfflineCache';
import { PrintQueue } from '@/queue/PrintQueue';
import { EventEmitter } from '@/core/EventEmitter';

/**
 * Scheduled retry entry
 */
export interface ScheduledRetry {
  /** Job ID to retry */
  jobId: string;
  /** Scheduled execution time */
  runAt: Date;
  /** Current attempt count */
  attemptCount: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay in ms for exponential backoff */
  baseDelay: number;
  /** Maximum delay in ms for exponential backoff */
  maxDelay: number;
  /** Last error message */
  lastError?: string;
  /** Scheduled timeout reference (internal, not serialized) */
  timeout?: ReturnType<typeof setTimeout>;
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 60000) */
  maxDelay?: number;
  /** Maximum attempts (default: 5) */
  maxAttempts?: number;
}

/**
 * Scheduler events
 */
export interface ScheduledRetryEvents {
  'retry-due': { entry: ScheduledRetry };
  'retry-executed': { entry: ScheduledRetry; success: boolean };
  'retry-cancelled': { jobId: string };
  'retry-exhausted': { jobId: string };
  'schedule-restored': { count: number };
}

/**
 * Scheduled retry configuration
 */
export interface ScheduledRetryManagerConfig {
  /** Default base delay in ms */
  baseDelay: number;
  /** Default max delay in ms */
  maxDelay: number;
  /** Default max attempts */
  maxAttempts: number;
  /** Persist scheduled retries to OfflineCache */
  persistEnabled: boolean;
  /** Restore pending retries on startup */
  autoRestore: boolean;
}

/** Default configuration */
const DEFAULT_CONFIG: ScheduledRetryManagerConfig = {
  baseDelay: 1000,
  maxDelay: 60000,
  maxAttempts: 5,
  persistEnabled: true,
  autoRestore: true,
};

/**
 * Scheduled Retry Manager
 *
 * Manages time-based retries for failed print jobs with support for:
 * - Scheduled execution at specific times
 * - Exponential backoff between retries
 * - Persistence across process restarts via OfflineCache
 * - Event-driven callbacks for retry execution
 */
export class ScheduledRetryManager extends EventEmitter<ScheduledRetryEvents> {
  protected readonly logger = Logger.scope('ScheduledRetryManager');

  /** Scheduled retries map: jobId -> ScheduledRetry */
  private readonly scheduledRetries: Map<string, ScheduledRetry> = new Map();

  /** Configuration */
  private readonly config: ScheduledRetryManagerConfig;

  /** Offline cache instance for persistence */
  private readonly offlineCache: OfflineCache;

  /** Print queue reference for requeueing jobs */
  private printQueue: PrintQueue | null = null;

  /** Retry executor function */
  private retryExecutor: ((jobId: string) => Promise<void>) | null = null;

  /**
   * Creates a new ScheduledRetryManager instance
   *
   * @param config - Optional configuration overrides
   * @param offlineCache - Optional OfflineCache instance (uses singleton if not provided)
   */
  constructor(config?: Partial<ScheduledRetryManagerConfig>, offlineCache?: OfflineCache) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.offlineCache = offlineCache ?? new OfflineCache();

    if (this.config.autoRestore) {
      this.restoreScheduledRetries();
    }
  }

  /**
   * Set the print queue for job requeuing
   *
   * @param queue - PrintQueue instance
   */
  setPrintQueue(queue: PrintQueue): void {
    this.printQueue = queue;
  }

  /**
   * Set the retry executor function
   *
   * @param executor - Async function that executes the retry
   */
  setRetryExecutor(executor: (jobId: string) => Promise<void>): void {
    this.retryExecutor = executor;
  }

  /**
   * Schedule a retry for a specific job at a given time
   *
   * @param jobId - Job identifier to retry
   * @param runAt - Date/time to execute the retry
   * @param options - Optional retry configuration
   */
  scheduleRetry(jobId: string, runAt: Date, options?: RetryOptions): void {
    // Cancel existing schedule if any
    this.cancelRetry(jobId);

    const now = Date.now();
    const scheduledTime = runAt.getTime();
    const delay = Math.max(0, scheduledTime - now);

    const entry: ScheduledRetry = {
      jobId,
      runAt,
      attemptCount: 0,
      maxAttempts: options?.maxAttempts ?? this.config.maxAttempts,
      baseDelay: options?.baseDelay ?? this.config.baseDelay,
      maxDelay: options?.maxDelay ?? this.config.maxDelay,
    };

    // Schedule the timeout
    entry.timeout = setTimeout(() => {
      void this.executeRetry(entry);
    }, delay);

    this.scheduledRetries.set(jobId, entry);
    void this.persistRetry(entry);

    this.logger.info(`Retry scheduled: ${jobId}, runAt: ${runAt.toISOString()}, delay: ${delay}ms`);
  }

  /**
   * Schedule a retry with exponential backoff starting from now
   *
   * @param jobId - Job identifier to retry
   * @param options - Retry options including baseDelay, maxDelay, maxAttempts
   */
  scheduleRetryWithBackoff(jobId: string, options?: RetryOptions): void {
    const entry = this.scheduledRetries.get(jobId);
    const attemptCount = entry?.attemptCount ?? 0;

    const baseDelay = options?.baseDelay ?? this.config.baseDelay;
    const maxDelay = options?.maxDelay ?? this.config.maxDelay;
    const maxAttempts = options?.maxAttempts ?? this.config.maxAttempts;

    // Calculate exponential delay: baseDelay * 2^attemptCount, capped at maxDelay
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
    const runAt = new Date(Date.now() + delay);

    this.scheduleRetry(jobId, runAt, {
      baseDelay,
      maxDelay,
      maxAttempts,
    });

    // Update attempt count on existing entry
    const updatedEntry = this.scheduledRetries.get(jobId);
    if (updatedEntry) {
      updatedEntry.attemptCount = attemptCount + 1;
    }
  }

  /**
   * Cancel a scheduled retry
   *
   * @param jobId - Job identifier to cancel
   * @returns true if a retry was cancelled, false if not found
   */
  cancelRetry(jobId: string): boolean {
    const entry = this.scheduledRetries.get(jobId);

    if (!entry) {
      this.logger.debug(`No scheduled retry found to cancel: ${jobId}`);
      return false;
    }

    // Clear timeout if exists
    if (entry.timeout) {
      clearTimeout(entry.timeout);
    }

    this.scheduledRetries.delete(jobId);
    this.removePersistedRetry(jobId);

    this.emit('retry-cancelled', { jobId });
    this.logger.info(`Retry cancelled: ${jobId}`);

    return true;
  }

  /**
   * Get all scheduled retries
   *
   * @returns Array of scheduled retry entries (without timeout refs)
   */
  getScheduledRetries(): Array<{ jobId: string; runAt: Date }> {
    return Array.from(this.scheduledRetries.values()).map(entry => ({
      jobId: entry.jobId,
      runAt: entry.runAt,
    }));
  }

  /**
   * Get a specific scheduled retry entry
   *
   * @param jobId - Job identifier
   * @returns Scheduled retry entry or undefined
   */
  getScheduledRetry(jobId: string): ScheduledRetry | undefined {
    const entry = this.scheduledRetries.get(jobId);
    if (!entry) return undefined;

    // Return a copy without the timeout (timeout cannot be serialized)
    const { timeout, ...rest } = entry;
    void timeout;
    return rest as ScheduledRetry;
  }

  /**
   * Check if a job has a scheduled retry
   *
   * @param jobId - Job identifier
   * @returns true if retry is scheduled
   */
  hasScheduledRetry(jobId: string): boolean {
    return this.scheduledRetries.has(jobId);
  }

  /**
   * Get count of scheduled retries
   *
   * @returns Number of pending scheduled retries
   */
  get pendingCount(): number {
    return this.scheduledRetries.size;
  }

  /**
   * Clear all scheduled retries
   */
  clearAll(): void {
    for (const entry of Array.from(this.scheduledRetries.values())) {
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
    }
    this.scheduledRetries.clear();
    this.offlineCache.clear();
    this.logger.info('All scheduled retries cleared');
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.clearAll();
    this.removeAllListeners();
    this.logger.info('ScheduledRetryManager destroyed');
  }

  // Private methods

  /**
   * Execute a scheduled retry
   */
  private async executeRetry(entry: ScheduledRetry) {
    const { jobId } = entry;

    // Remove from scheduled map (no longer pending)
    this.scheduledRetries.delete(jobId);
    this.removePersistedRetry(jobId);

    this.emit('retry-due', { entry });
    this.logger.info(`Executing scheduled retry: ${jobId}, attempt: ${entry.attemptCount + 1}`);

    let success = false;

    try {
      if (this.retryExecutor) {
        // Use custom executor
        await this.retryExecutor(jobId);
        success = true;
      } else if (this.printQueue) {
        // Re-add to print queue if available
        const job = this.printQueue.getJob(jobId);
        if (job) {
          this.printQueue.resume();
          success = true;
        } else {
          this.logger.warn(`Job not found in queue for retry: ${jobId}`);
          success = false;
        }
      } else {
        this.logger.warn(`No retry executor or print queue configured for: ${jobId}`);
        success = false;
      }

      this.emit('retry-executed', { entry, success });
    } catch (error) {
      const errorMessage = normalizeError(error).message;
      entry.lastError = errorMessage;

      this.logger.error(`Retry failed for ${jobId}:`, error);

      // Check if we should schedule another retry
      if (entry.attemptCount + 1 < entry.maxAttempts) {
        // Schedule with exponential backoff
        const nextDelay = Math.min(
          entry.baseDelay * Math.pow(2, entry.attemptCount),
          entry.maxDelay
        );
        const nextRunAt = new Date(Date.now() + nextDelay);

        entry.attemptCount++;
        entry.runAt = nextRunAt;

        entry.timeout = setTimeout(() => {
          void this.executeRetry(entry);
        }, nextDelay);

        this.scheduledRetries.set(jobId, entry);
        void this.persistRetry(entry);

        this.logger.info(
          `Scheduled next retry for ${jobId}: ${nextRunAt.toISOString()}, attempt: ${entry.attemptCount}`
        );
      } else {
        // Exhausted all attempts
        this.emit('retry-exhausted', { jobId });
        this.logger.warn(`All retry attempts exhausted for: ${jobId}`);
        this.emit('retry-executed', { entry, success: false });
      }
    }
  }

  /**
   * Persist a scheduled retry to OfflineCache
   */
  private persistRetry(entry: ScheduledRetry): void {
    if (!this.config.persistEnabled) return;

    try {
      const cachedJob: CachedJob = {
        id: `retry_${entry.jobId}`,
        data: new Uint8Array(0), // No data needed for retry records
        createdAt: Date.now(),
        expiresAt: entry.runAt.getTime() + 24 * 60 * 60 * 1000, // 24h after scheduled time
        retryCount: entry.attemptCount,
        lastError: entry.lastError,
        metadata: {
          jobId: entry.jobId,
          runAt: entry.runAt.toISOString(),
          maxAttempts: entry.maxAttempts,
          baseDelay: entry.baseDelay,
          maxDelay: entry.maxDelay,
          type: 'scheduled_retry',
        },
      };

      this.offlineCache.save(cachedJob);
    } catch (error) {
      this.logger.error('Failed to persist scheduled retry:', error);
    }
  }

  /**
   * Remove a persisted retry from OfflineCache
   */
  private removePersistedRetry(jobId: string): void {
    if (!this.config.persistEnabled) return;

    try {
      this.offlineCache.remove(`retry_${jobId}`);
    } catch (error) {
      this.logger.error('Failed to remove persisted retry:', error);
    }
  }

  /**
   * Restore scheduled retries from OfflineCache on startup
   */
  private restoreScheduledRetries(): void {
    if (!this.config.persistEnabled) return;

    try {
      const cachedJobs = this.offlineCache.getAll();
      const now = Date.now();
      let restoredCount = 0;

      for (const cached of cachedJobs) {
        // Only restore scheduled_retry entries
        if (cached.metadata && cached.metadata.type === 'scheduled_retry') {
          const meta = cached.metadata;
          const runAtStr = meta.runAt as string;
          const runAt = new Date(runAtStr);

          // Skip if already past scheduled time
          if (runAt.getTime() <= now) {
            this.offlineCache.remove(cached.id);
            continue;
          }

          // Re-schedule
          const entry: ScheduledRetry = {
            jobId: meta.jobId as string,
            runAt,
            attemptCount: cached.retryCount,
            maxAttempts: (meta.maxAttempts as number) ?? this.config.maxAttempts,
            baseDelay: (meta.baseDelay as number) ?? this.config.baseDelay,
            maxDelay: (meta.maxDelay as number) ?? this.config.maxDelay,
            lastError: cached.lastError,
          };

          // Schedule with correct delay
          entry.timeout = setTimeout(() => {
            void this.executeRetry(entry);
          }, runAt.getTime() - now);

          this.scheduledRetries.set(entry.jobId, entry);
          restoredCount++;
        }
      }

      if (restoredCount > 0) {
        this.emit('schedule-restored', { count: restoredCount });
        this.logger.info(`Restored ${restoredCount} scheduled retries`);
      }
    } catch (error) {
      this.logger.error('Failed to restore scheduled retries:', error);
    }
  }
}

/** Singleton instance */
export const scheduledRetryManager = new ScheduledRetryManager();
