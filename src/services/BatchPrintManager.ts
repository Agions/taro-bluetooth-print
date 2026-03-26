/**
 * Batch Print Manager
 *
 * Optimizes printing multiple jobs by:
 * - Merging consecutive small jobs (combining jobs < 50 bytes for efficiency)
 * - Reducing Bluetooth communication overhead via batching
 * - Prioritizing urgent jobs
 * - Auto-flush on task interval timeout
 * - Batch merge with unified cut commands
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
  /** Small job size threshold for merging (bytes, default: 50) */
  smallJobThreshold: number;
  /** Interval timeout for auto-flush in ms (0 = disabled) */
  flushIntervalTimeout: number;
  /** Unified cut command appended after batch merge (default: ESC d 4) */
  unifiedCutCommand?: Uint8Array;
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
  /** Merged jobs count (small jobs combined) */
  mergedJobs: number;
  /** Auto-flush triggered count */
  autoFlushCount: number;
  /** Unified cuts applied */
  unifiedCutsApplied: number;
}

/**
 * Batch events
 */
export interface BatchEvents {
  'batch-ready': (data: BatchJob[]) => void;
  'batch-processed': (data: { jobCount: number; bytes: number }) => void;
  'job-added': (data: BatchJob) => void;
  'job-rejected': (data: { reason: string }) => void;
  'auto-flush': (data: { jobCount: number; bytes: number }) => void;
  'jobs-merged': (data: { fromCount: number; toCount: number; savedBytes: number }) => void;
}

/**
 * Event handler map type
 */
type BatchEventHandlerMap = {
  [K in keyof BatchEvents]: Set<BatchEvents[K]>;
};

/**
 * ESC/POS commands for cutting
 */
const ESC = 0x1b;
const GS = 0x1d;

/**
 * Default cut command: ESC d 4 (full cut, 4 lines feed)
 */
const DEFAULT_CUT_COMMAND = new Uint8Array([ESC, 0x64, 0x04, GS, 0x56, 0x00]);

/**
 * Default batch configuration
 */
const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 1024 * 50, // 50KB max per batch
  maxWaitTime: 1000, // 1 second max wait
  minBatchSize: 1, // Process even single jobs
  enableMerging: true, // Enable content merging
  autoProcessInterval: 500, // Check every 500ms
  smallJobThreshold: 50, // 50 bytes threshold for small job merging
  flushIntervalTimeout: 2000, // 2s interval timeout for auto-flush
  unifiedCutCommand: DEFAULT_CUT_COMMAND,
};

/**
 * Batch Print Manager
 *
 * Collects print jobs and processes them in optimized batches.
 * Features:
 * - Small job merging: consecutive jobs < smallJobThreshold bytes are combined
 * - Interval timeout auto-flush: flushes pending jobs if no new jobs arrive within timeout
 * - Unified cut: optionally appends a single cut command after batch merge
 * - Priority sorting: higher priority jobs are processed first
 */
export class BatchPrintManager {
  private readonly logger = Logger.scope('BatchPrintManager');
  private readonly jobs: BatchJob[] = [];
  private readonly listeners: BatchEventHandlerMap = {
    'batch-ready': new Set(),
    'batch-processed': new Set(),
    'job-added': new Set(),
    'job-rejected': new Set(),
    'auto-flush': new Set(),
    'jobs-merged': new Set(),
  };
  private config: BatchConfig;
  private isProcessing = false;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  private autoProcessTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private stats: BatchStats = {
    totalJobs: 0,
    totalBytes: 0,
    batchesProcessed: 0,
    avgBatchSize: 0,
    mergedJobs: 0,
    autoFlushCount: 0,
    unifiedCutsApplied: 0,
  };

  /**
   * Last job timestamp for interval timeout tracking
   */
  private lastJobAt = 0;

  /**
   * Creates a new BatchPrintManager instance
   *
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register event listener
   *
   * @param event - Event name
   * @param callback - Event handler
   */
  on<K extends keyof BatchEvents>(event: K, callback: BatchEvents[K]): void {
    this.listeners[event].add(callback);
  }

  /**
   * Remove event listener
   *
   * @param event - Event name
   * @param callback - Event handler to remove
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
    const now = Date.now();
    const job: BatchJob = {
      id,
      data,
      priority,
      addedAt: now,
      metadata,
    };

    this.jobs.push(job);
    this.stats.totalJobs++;
    this.lastJobAt = now;

    // Sort by priority (descending)
    this.jobs.sort((a, b) => b.priority - a.priority);

    this.emit('job-added', job);
    this.logger.debug(`Job added: ${id} (priority: ${priority}, queue size: ${this.jobs.length}, bytes: ${data.length})`);

    // Start/restart wait timer
    this.startWaitTimer();

    // Restart flush timer (interval timeout auto-flush)
    this.startFlushTimer();

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
   *
   * @param jobs - Array of job data with optional priority and metadata
   * @returns Array of job IDs
   */
  addJobs(
    jobs: Array<{ data: Uint8Array; priority?: number; metadata?: Record<string, unknown> }>
  ): string[] {
    return jobs.map(job => this.addJob(job.data, job.priority, job.metadata));
  }

  /**
   * Cancel a job by ID
   *
   * @param id - Job ID to cancel
   * @returns true if cancelled, false if not found
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
    this.lastJobAt = 0;
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
   *
   * @returns Copy of pending jobs array
   */
  getPendingJobs(): BatchJob[] {
    return [...this.jobs];
  }

  /**
   * Get current statistics
   *
   * @returns Copy of current stats
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   *
   * @param updates - Configuration fields to update
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
      const { mergedData, fromCount, toCount } = this.mergeJobs(batchJobs);

      // Report merge stats if jobs were merged
      if (fromCount !== toCount) {
        const savedBytes = batchJobs.slice(0, fromCount).reduce((sum, j) => sum + j.data.length, 0) -
          mergedData.length;
        this.emit('jobs-merged', { fromCount, toCount, savedBytes: Math.abs(savedBytes) });
        this.stats.mergedJobs += fromCount - toCount;
      }

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
   *
   * Features:
   * - Consecutive small jobs (< smallJobThreshold bytes) are combined into a single job
   * - Applies unified cut command after all jobs if configured
   *
   * @param jobs - Jobs to merge
   * @returns Merged data with metadata about the merge operation
   */
  private mergeJobs(
    jobs: BatchJob[]
  ): { mergedData: Uint8Array; fromCount: number; toCount: number } {
    if (!this.config.enableMerging || jobs.length === 1) {
      let mergedData: Uint8Array;

      if (jobs.length === 1 && this.config.unifiedCutCommand) {
        // Single job with unified cut
        mergedData = this.concatBuffers([jobs[0]!.data, this.config.unifiedCutCommand!]);
        this.stats.unifiedCutsApplied++;
      } else {
        mergedData = jobs[0]?.data ?? new Uint8Array(0);
      }

      return { mergedData, fromCount: jobs.length, toCount: jobs.length };
    }

    // Phase 1: Merge consecutive small jobs
    const mergedAfterSmallJobs = this.mergeConsecutiveSmallJobs(jobs);
    const fromCount = jobs.length;
    const toCountAfterSmallMerge = mergedAfterSmallJobs.length;

    if (fromCount !== toCountAfterSmallMerge) {
      this.logger.debug(
        `Merged ${fromCount - toCountAfterSmallMerge} consecutive small jobs (threshold: ${this.config.smallJobThreshold} bytes)`
      );
    }

    // Phase 2: Calculate total size for final merge
    let totalSize = 0;
    for (const job of mergedAfterSmallJobs) {
      totalSize += job.data.length;
    }

    // Add unified cut command size if configured
    if (this.config.unifiedCutCommand) {
      totalSize += this.config.unifiedCutCommand.length;
    }

    // Phase 3: Concatenate all buffers
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const job of mergedAfterSmallJobs) {
      result.set(job.data, offset);
      offset += job.data.length;
    }

    // Append unified cut command
    if (this.config.unifiedCutCommand) {
      result.set(this.config.unifiedCutCommand, offset);
      this.stats.unifiedCutsApplied++;
      this.logger.debug(
        `Applied unified cut command: ${this.config.unifiedCutCommand.length} bytes`
      );
    }

    this.logger.debug(
      `Merged ${fromCount} jobs into ${toCountAfterSmallMerge} after small-job merge, ` +
      `final size: ${totalSize} bytes`
    );

    return { mergedData: result, fromCount, toCount: toCountAfterSmallMerge };
  }

  /**
   * Merge consecutive small jobs (< smallJobThreshold bytes) into combined buffers
   *
   * Small jobs that arrive consecutively are combined to reduce Bluetooth overhead.
   * The merge preserves job boundaries conceptually but sends as a single chunk.
   *
   * @param jobs - Input jobs
   * @returns Jobs after merging consecutive small ones
   */
  private mergeConsecutiveSmallJobs(jobs: BatchJob[]): BatchJob[] {
    if (jobs.length < 2 || this.config.smallJobThreshold <= 0) {
      return jobs;
    }

    const result: BatchJob[] = [];
    let buffer: Uint8Array[] = [];
    let bufferPriority = 0;
    let bufferAddedAt = 0;

    for (const job of jobs) {
      if (job.data.length < this.config.smallJobThreshold) {
        // Small job - add to merge buffer
        buffer.push(job.data);
        if (buffer.length === 1) {
          // First small job in potential merge group
          bufferPriority = job.priority;
          bufferAddedAt = job.addedAt;
        }
        this.logger.debug(
          `Small job ${job.id} (${job.data.length} bytes) queued for merge buffer`
        );
      } else {
        // Non-small job - flush buffer first if not empty
        if (buffer.length > 0) {
          result.push(this.createMergedJob(buffer, bufferPriority, bufferAddedAt));
          buffer = [];
        }
        // Add the non-small job as-is
        result.push(job);
      }
    }

    // Flush remaining buffer
    if (buffer.length > 0) {
      result.push(this.createMergedJob(buffer, bufferPriority, bufferAddedAt));
    }

    return result;
  }

  /**
   * Create a merged job from multiple small buffers
   *
   * @param buffers - Array of small buffers to combine
   * @param priority - Priority of the merged job
   * @param addedAt - Timestamp of the first job in the merge
   * @returns Merged BatchJob
   */
  private createMergedJob(
    buffers: Uint8Array[],
    priority: number,
    addedAt: number
  ): BatchJob {
    // Calculate total size
    let totalSize = 0;
    for (const buf of buffers) {
      totalSize += buf.length;
    }

    // Merge into single buffer
    const merged = new Uint8Array(totalSize);
    let offset = 0;
    for (const buf of buffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    return {
      id: `merged_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      data: merged,
      priority,
      addedAt,
      metadata: {
        mergedFromCount: buffers.length,
        merged: true,
      },
    };
  }

  /**
   * Concatenate multiple Uint8Array buffers into one
   *
   * @param buffers - Array of buffers to concatenate
   * @returns Combined buffer
   */
  private concatBuffers(buffers: Uint8Array[]): Uint8Array {
    let totalSize = 0;
    for (const buf of buffers) {
      totalSize += buf.length;
    }

    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const buf of buffers) {
      result.set(buf, offset);
      offset += buf.length;
    }

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
   * Start the flush timer (interval timeout auto-flush)
   *
   * If no new jobs arrive within flushIntervalTimeout ms, the pending
   * jobs are automatically flushed via the 'auto-flush' event.
   */
  private startFlushTimer(): void {
    this.clearFlushTimer();

    if (this.config.flushIntervalTimeout <= 0 || this.jobs.length === 0) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      const elapsed = Date.now() - this.lastJobAt;
      if (elapsed >= this.config.flushIntervalTimeout && this.jobs.length > 0) {
        this.logger.debug(
          `Flush interval timeout triggered: ${this.jobs.length} jobs pending, ` +
          `elapsed: ${elapsed}ms`
        );
        this.stats.autoFlushCount++;
        this.emit('auto-flush', {
          jobCount: this.jobs.length,
          bytes: this.jobs.reduce((sum, j) => sum + j.data.length, 0),
        });
        this.emit('batch-ready', [...this.jobs]);
      }
    }, this.config.flushIntervalTimeout);
  }

  /**
   * Clear flush timer
   */
  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
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
    this.clearFlushTimer();
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
      autoFlushCount: 0,
      unifiedCutsApplied: 0,
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
