/**
 * Batch Print Manager
 *
 * Optimizes printing multiple jobs by:
 * - Merging small jobs into larger chunks
 * - Reducing Bluetooth communication overhead
 * - Prioritizing urgent jobs
 * - Batching similar content for efficiency
 *
 * @example
 * ```typescript
 * const batchManager = new BatchPrintManager();
 *
 * // Add print jobs
 * batchManager.addJob({ data: buffer1, priority: 1 });
 * batchManager.addJob({ data: buffer2, priority: 2 });
 *
 * // Process batch when ready
 * await batchManager.processBatch();
 * ```
 */

import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Batch job entry
 */
export interface BatchJob {
  /** Unique job ID */
  id: string;
  /** Print data */
  data: Uint8Array;
  /** Priority (higher = more urgent) */
  priority: number;
  /** Timestamp when added */
  addedAt: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Batch configuration
 */
export interface BatchConfig {
  /** Maximum batch size in bytes */
  maxBatchSize: number;
  /** Maximum wait time before processing in ms */
  maxWaitTime: number;
  /** Minimum jobs before batching */
  minBatchSize: number;
  /** Merge similar content */
  enableMerging: boolean;
  /** Auto-process interval in ms (0 = disabled) */
  autoProcessInterval: number;
}

/**
 * Batch statistics
 */
export interface BatchStats {
  /** Total jobs added */
  totalJobs: number;
  /** Total bytes processed */
  totalBytes: number;
  /** Batches processed */
  batchesProcessed: number;
  /** Average batch size */
  avgBatchSize: number;
  /** Merged jobs count */
  mergedJobs: number;
}

/**
 * Batch events
 */
export interface BatchEvents {
  'batch-ready': (data: BatchJob[]) => void;
  'batch-processed': (data: { jobCount: number; bytes: number }) => void;
  'job-added': (data: BatchJob) => void;
  'job-rejected': (data: { reason: string }) => void;
}

/**
 * Event handler map type
 */
type BatchEventHandlerMap = {
  [K in keyof BatchEvents]: Set<BatchEvents[K]>;
};

/**
 * Default batch configuration
 */
const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 1024 * 50, // 50KB max per batch
  maxWaitTime: 1000, // 1 second max wait
  minBatchSize: 1, // Process even single jobs
  enableMerging: true, // Enable content merging
  autoProcessInterval: 500, // Check every 500ms
};

/**
 * Batch Print Manager
 *
 * Collects print jobs and processes them in optimized batches.
 * Reduces Bluetooth communication overhead by combining small jobs.
 */
export class BatchPrintManager {
  private readonly logger = Logger.scope('BatchPrintManager');
  private readonly jobs: BatchJob[] = [];
  private readonly listeners: BatchEventHandlerMap = {
    'batch-ready': new Set(),
    'batch-processed': new Set(),
    'job-added': new Set(),
    'job-rejected': new Set(),
  };
  private config: BatchConfig;
  private isProcessing = false;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  private autoProcessTimer: ReturnType<typeof setInterval> | null = null;
  private stats: BatchStats = {
    totalJobs: 0,
    totalBytes: 0,
    batchesProcessed: 0,
    avgBatchSize: 0,
    mergedJobs: 0,
  };

  /**
   * Creates a new BatchPrintManager instance
   */
  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register event listener
   */
  on<K extends keyof BatchEvents>(event: K, callback: BatchEvents[K]): void {
    this.listeners[event].add(callback);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof BatchEvents>(event: K, callback: BatchEvents[K]): void {
    this.listeners[event].delete(callback);
  }

  /**
   * Emit an event
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit<K extends keyof BatchEvents>(event: K, data: Parameters<BatchEvents[K]>[0]): void {
    this.listeners[event].forEach(handler => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        (handler as (data: Parameters<BatchEvents[K]>[0]) => void)(data);
      } catch (error) {
        this.logger.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Add a job to the batch queue
   *
   * @param data - Print data
   * @param priority - Job priority (higher = more urgent)
   * @param metadata - Optional metadata
   * @returns Job ID
   */
  addJob(data: Uint8Array, priority = 1, metadata?: Record<string, unknown>): string {
    const id = this.generateId();
    const job: BatchJob = {
      id,
      data,
      priority,
      addedAt: Date.now(),
      metadata,
    };

    this.jobs.push(job);
    this.stats.totalJobs++;

    // Sort by priority (descending)
    this.jobs.sort((a, b) => b.priority - a.priority);

    this.emit('job-added', job);
    this.logger.debug(`Job added: ${id} (priority: ${priority}, queue size: ${this.jobs.length})`);

    // Start/restart wait timer
    this.startWaitTimer();

    // Check if we should process immediately
    if (this.shouldProcessImmediately()) {
      this.emit('batch-ready', [...this.jobs]);
    }

    // Start auto-process if enabled
    this.startAutoProcess();

    return id;
  }

  /**
   * Add multiple jobs at once
   */
  addJobs(
    jobs: Array<{ data: Uint8Array; priority?: number; metadata?: Record<string, unknown> }>
  ): string[] {
    return jobs.map(job => this.addJob(job.data, job.priority, job.metadata));
  }

  /**
   * Cancel a job by ID
   */
  cancelJob(id: string): boolean {
    const index = this.jobs.findIndex(j => j.id === id);
    if (index === -1) {
      return false;
    }

    this.jobs.splice(index, 1);
    this.logger.debug(`Job cancelled: ${id}`);
    return true;
  }

  /**
   * Cancel all jobs
   */
  cancelAll(): void {
    const count = this.jobs.length;
    this.jobs.length = 0;
    this.clearTimers();
    this.logger.info(`Cancelled ${count} jobs`);
  }

  /**
   * Get pending job count
   */
  get pendingCount(): number {
    return this.jobs.length;
  }

  /**
   * Get pending jobs
   */
  getPendingJobs(): BatchJob[] {
    return [...this.jobs];
  }

  /**
   * Get current statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.debug('Configuration updated');
  }

  /**
   * Process the current batch
   *
   * @param processor - Function to send batch data to printer
   * @returns Number of jobs processed
   */
  async processBatch(processor: (data: Uint8Array) => Promise<void>): Promise<number> {
    if (this.isProcessing) {
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_IN_PROGRESS,
        'Batch processing already in progress'
      );
    }

    if (this.jobs.length === 0) {
      this.logger.debug('No jobs to process');
      return 0;
    }

    this.isProcessing = true;
    this.clearTimers();

    try {
      // Get jobs for this batch
      const batchJobs = this.prepareBatch();
      const mergedData = this.mergeJobs(batchJobs);

      this.logger.info(`Processing batch: ${batchJobs.length} jobs, ${mergedData.length} bytes`);

      // Emit batch ready event
      this.emit('batch-ready', batchJobs);

      // Process the merged data
      await processor(mergedData);

      // Update stats
      this.stats.totalBytes += mergedData.length;
      this.stats.batchesProcessed++;
      this.stats.avgBatchSize =
        (this.stats.avgBatchSize * (this.stats.batchesProcessed - 1) + mergedData.length) /
        this.stats.batchesProcessed;

      // Remove processed jobs
      this.jobs.splice(0, batchJobs.length);

      this.emit('batch-processed', { jobCount: batchJobs.length, bytes: mergedData.length });
      this.logger.info(`Batch processed: ${batchJobs.length} jobs`);

      return batchJobs.length;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Prepare batch from pending jobs
   */
  private prepareBatch(): BatchJob[] {
    const batch: BatchJob[] = [];
    let totalSize = 0;

    for (const job of this.jobs) {
      // Check if adding this job would exceed max batch size
      if (batch.length > 0 && totalSize + job.data.length > this.config.maxBatchSize) {
        // Don't add if it would exceed, and we already have some jobs
        if (batch.length >= this.config.minBatchSize) {
          break;
        }
      }

      batch.push(job);
      totalSize += job.data.length;
    }

    return batch;
  }

  /**
   * Merge multiple jobs into a single buffer
   */
  private mergeJobs(jobs: BatchJob[]): Uint8Array {
    if (!this.config.enableMerging || jobs.length === 1) {
      return jobs[0]?.data ?? new Uint8Array(0);
    }

    // Calculate total size
    let totalSize = 0;
    for (const job of jobs) {
      totalSize += job.data.length;
    }

    // Merge into single buffer
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const job of jobs) {
      result.set(job.data, offset);
      offset += job.data.length;
      this.stats.mergedJobs++;
    }

    this.logger.debug(`Merged ${jobs.length} jobs into ${totalSize} bytes`);
    return result;
  }

  /**
   * Check if we should process immediately
   */
  private shouldProcessImmediately(): boolean {
    if (this.jobs.length === 0) {
      return false;
    }

    // Large single job
    const firstJob = this.jobs[0];
    if (
      this.jobs.length === 1 &&
      firstJob &&
      firstJob.data.length >= this.config.maxBatchSize * 0.8
    ) {
      return true;
    }

    // Queue is full
    const totalSize = this.jobs.reduce((sum, j) => sum + j.data.length, 0);
    if (totalSize >= this.config.maxBatchSize) {
      return true;
    }

    return false;
  }

  /**
   * Start the wait timer
   */
  private startWaitTimer(): void {
    this.clearWaitTimer();

    if (this.config.maxWaitTime <= 0) {
      return;
    }

    this.waitTimer = setTimeout(() => {
      this.logger.debug('Wait timer expired, batch ready');
      this.emit('batch-ready', [...this.jobs]);
    }, this.config.maxWaitTime);
  }

  /**
   * Clear wait timer
   */
  private clearWaitTimer(): void {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
  }

  /**
   * Start auto-process timer
   */
  private startAutoProcess(): void {
    if (this.autoProcessTimer || this.config.autoProcessInterval <= 0) {
      return;
    }

    this.autoProcessTimer = setInterval(() => {
      // Check if batch is ready
      if (this.shouldProcessImmediately()) {
        this.emit('batch-ready', [...this.jobs]);
      }
    }, this.config.autoProcessInterval);
  }

  /**
   * Stop auto-process timer
   */
  private stopAutoProcess(): void {
    if (this.autoProcessTimer) {
      clearInterval(this.autoProcessTimer);
      this.autoProcessTimer = null;
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearWaitTimer();
    this.stopAutoProcess();
  }

  /**
   * Generate unique job ID
   */
  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalJobs: 0,
      totalBytes: 0,
      batchesProcessed: 0,
      avgBatchSize: 0,
      mergedJobs: 0,
    };
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.cancelAll();
    // Clear all listeners
    for (const key of Object.keys(this.listeners) as (keyof BatchEventHandlerMap)[]) {
      this.listeners[key].clear();
    }
    this.logger.info('BatchPrintManager destroyed');
  }
}

// Export singleton for convenience
export const batchPrintManager = new BatchPrintManager();
