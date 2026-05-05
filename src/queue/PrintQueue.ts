/**
 * Print Queue
 *
 * Manages print job queue with priority ordering and retry logic.
 * Supports FIFO processing within priority levels.
 *
 * @example
 * ```typescript
 * const queue = new PrintQueue();
 * queue.on('job-completed', (job) => console.log('Completed:', job.id));
 * const jobId = queue.add(printData, { priority: PrintJobPriority.HIGH });
 * ```
 */

import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';
import { normalizeError } from '@/utils/normalizeError';
import { EventEmitter } from '@/core/EventEmitter';

/**
 * Print job status
 */
export enum PrintJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

/**
 * Print job priority
 */
export enum PrintJobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * Print job
 */
export interface PrintJob {
  /** Unique job identifier */
  id: string;
  /** Print data */
  data: Uint8Array;
  /** Job status */
  status: PrintJobStatus;
  /** Job priority */
  priority: PrintJobPriority;
  /** Creation timestamp */
  createdAt: number;
  /** Start timestamp */
  startedAt?: number;
  /** Completion timestamp */
  completedAt?: number;
  /** Retry count */
  retryCount: number;
  /** Maximum retries */
  maxRetries: number;
  /** Error if failed */
  error?: Error;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Maximum queue size (default: 100) */
  maxSize: number;
  /** Default retry count (default: 3) */
  defaultRetries: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay: number;
  /** Auto-process queue (default: true) */
  autoProcess: boolean;
  /** Concurrent jobs (default: 1) */
  concurrency: number;
}

/**
 * Print queue events
 */
export interface PrintQueueEvents {
  'job-added': PrintJob;
  'job-started': PrintJob;
  'job-completed': PrintJob;
  'job-failed': PrintJob;
  'job-cancelled': PrintJob;
  'queue-empty': void;
  'queue-paused': void;
  'queue-resumed': void;
}

/**
 * Print queue interface
 */
export interface IPrintQueue {
  add(data: Uint8Array, options?: Partial<PrintJob>): string;
  getJob(jobId: string): PrintJob | null;
  cancel(jobId: string): boolean;
  pause(): void;
  resume(): void;
  clear(): void;
  getQueueStatus(): {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  on<K extends keyof PrintQueueEvents>(
    event: K,
    callback: (data: PrintQueueEvents[K]) => void
  ): void;
}

/**
 * Job execution function type
 */
export type JobExecutor = (job: PrintJob) => Promise<void>;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: QueueConfig = {
  maxSize: 100,
  defaultRetries: 3,
  retryDelay: 1000,
  autoProcess: true,
  concurrency: 1,
};

/**
 * Print Queue class
 * Manages print jobs with priority and retry support
 */
export class PrintQueue extends EventEmitter<PrintQueueEvents> implements IPrintQueue {
  protected readonly logger = Logger.scope('PrintQueue');
  private readonly config: QueueConfig;
  private jobs: Map<string, PrintJob> = new Map();
  private pendingQueue: string[] = [];
  private isPaused = false;
  private isProcessing = false;
  private activeJobs = 0;
  private jobCounter = 0;
  private executor: JobExecutor | null = null;

  // 优化：使用单个定时器 + 延迟队列，避免每个失败任务创建独立 setTimeout
  // 减少定时器数量，降低内存开销和定时器泄漏风险
  private retryQueue: Array<{ jobId: string; retryAt: number; delay: number }> = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Creates a new PrintQueue instance
   */
  constructor(config?: Partial<QueueConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the job executor function
   */
  setExecutor(executor: JobExecutor): void {
    this.executor = executor;
  }

  /**
   * Add a job to the queue
   */
  add(data: Uint8Array, options?: Partial<PrintJob>): string {
    if (this.jobs.size >= this.config.maxSize) {
      throw new BluetoothPrintError(ErrorCode.QUEUE_FULL, 'Queue is full');
    }

    const id = this.generateJobId();
    const job: PrintJob = {
      id,
      data,
      status: PrintJobStatus.PENDING,
      priority: options?.priority ?? PrintJobPriority.NORMAL,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: options?.maxRetries ?? this.config.defaultRetries,
      metadata: options?.metadata,
    };

    this.jobs.set(id, job);
    this.insertByPriority(id, job.priority);
    this.emit('job-added', job);
    this.logger.debug(`Job added: ${id} (priority: ${job.priority})`);

    if (this.config.autoProcess && !this.isPaused) {
      void this.processQueue();
    }

    return id;
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): PrintJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  /**
   * Cancel a job
   */
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === PrintJobStatus.IN_PROGRESS) {
      this.logger.warn(`Cannot cancel in-progress job: ${jobId}`);
      return false;
    }

    if (job.status === PrintJobStatus.COMPLETED || job.status === PrintJobStatus.CANCELLED) {
      return false;
    }

    job.status = PrintJobStatus.CANCELLED;
    this.removeFromPendingQueue(jobId);
    this.clearRetryTimer(jobId);
    this.emit('job-cancelled', job);
    this.logger.debug(`Job cancelled: ${jobId}`);

    return true;
  }

  /**
   * Pause the queue
   */
  pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.emit('queue-paused', undefined);
    this.logger.info('Queue paused');
  }

  /**
   * Resume the queue
   */
  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.emit('queue-resumed', undefined);
    this.logger.info('Queue resumed');

    if (this.config.autoProcess) {
      void this.processQueue();
    }
  }

  /**
   * Clear all pending jobs
   */
  clear(): void {
    // Cancel all pending retry timers
    this.clearAllRetryTimers();

    const pendingJobs = [...this.pendingQueue];
    for (const jobId of pendingJobs) {
      const job = this.jobs.get(jobId);
      if (job && job.status === PrintJobStatus.PENDING) {
        job.status = PrintJobStatus.CANCELLED;
        this.emit('job-cancelled', job);
      }
    }
    this.pendingQueue = [];
    this.logger.info('Queue cleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  } {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case PrintJobStatus.PENDING:
        case PrintJobStatus.PAUSED:
          pending++;
          break;
        case PrintJobStatus.IN_PROGRESS:
          inProgress++;
          break;
        case PrintJobStatus.COMPLETED:
          completed++;
          break;
        case PrintJobStatus.FAILED:
          failed++;
          break;
      }
    }

    return { pending, inProgress, completed, failed };
  }

  /**
   * Get all jobs
   */
  getAllJobs(): PrintJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get pending jobs in order
   */
  getPendingJobs(): PrintJob[] {
    return this.pendingQueue
      .map(id => this.jobs.get(id))
      .filter((job): job is PrintJob => job !== undefined);
  }

  /**
   * Check if queue is paused
   */
  get paused(): boolean {
    return this.isPaused;
  }

  /**
   * Get queue size
   */
  get size(): number {
    return this.pendingQueue.length;
  }

  /**
   * Process the queue
   */
  private processQueue(): void {
    if (this.isProcessing || this.isPaused) return;
    if (this.activeJobs >= this.config.concurrency) return;
    if (this.pendingQueue.length === 0) {
      this.emit('queue-empty', undefined);
      return;
    }

    this.isProcessing = true;

    while (
      this.pendingQueue.length > 0 &&
      this.activeJobs < this.config.concurrency &&
      !this.isPaused
    ) {
      const jobId = this.pendingQueue.shift();
      if (!jobId) break;

      const job = this.jobs.get(jobId);
      if (!job || job.status !== PrintJobStatus.PENDING) continue;

      this.activeJobs++;
      this.executeJob(job)
        .catch(error => {
          this.logger.error(`Unhandled error in job execution for ${job.id}:`, error);
        })
        .finally(() => {
          this.activeJobs--;
          if (!this.isPaused) {
            this.processQueue();
          }
        });
    }

    this.isProcessing = false;
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: PrintJob): Promise<void> {
    job.status = PrintJobStatus.IN_PROGRESS;
    job.startedAt = Date.now();
    this.emit('job-started', job);
    this.logger.debug(`Job started: ${job.id}`);

    try {
      if (this.executor) {
        await this.executor(job);
      } else {
        // Simulate execution if no executor set
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = PrintJobStatus.COMPLETED;
      job.completedAt = Date.now();
      this.emit('job-completed', job);
      this.logger.debug(`Job completed: ${job.id}`);
    } catch (error) {
      job.retryCount++;
      job.error = normalizeError(error);

      if (job.retryCount < job.maxRetries) {
        this.logger.warn(`Job ${job.id} failed, retrying (${job.retryCount}/${job.maxRetries})`);
        job.status = PrintJobStatus.PENDING;

        // 优化：添加到延迟队列，使用单个定时器调度
        this.scheduleRetry(job.id, this.config.retryDelay);
      } else {
        job.status = PrintJobStatus.FAILED;
        job.completedAt = Date.now();
        this.emit('job-failed', job);
        this.logger.error(`Job failed: ${job.id}`, error);
      }
    }
  }

  /**
   * Insert job ID into pending queue by priority
   */
  private insertByPriority(jobId: string, priority: PrintJobPriority): void {
    // Binary search for insertion point (higher priority first, then FIFO)
    let low = 0;
    let high = this.pendingQueue.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const midId = this.pendingQueue[mid];
      const midJob = midId ? this.jobs.get(midId) : undefined;
      if (midJob && midJob.priority >= priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.pendingQueue.splice(low, 0, jobId);
  }

  /**
   * Remove job from pending queue
   */
  private removeFromPendingQueue(jobId: string): void {
    const index = this.pendingQueue.indexOf(jobId);
    if (index !== -1) {
      this.pendingQueue.splice(index, 1);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    this.jobCounter++;
    return `job_${Date.now()}_${this.jobCounter}`;
  }

  /**
   * Schedule a job retry after the specified delay.
   * 优化：使用单个定时器 + 延迟队列，避免每个失败任务创建独立 setTimeout
   *
   * @param jobId - Job to retry
   * @param delay - Delay in milliseconds
   */
  private scheduleRetry(jobId: string, delay: number): void {
    // 从队列中移除该 job（如果已存在）
    this.removeFromRetryQueue(jobId);

    // 添加到延迟队列
    const retryAt = Date.now() + delay;
    this.retryQueue.push({ jobId, retryAt, delay });

    // 按 retryAt 排序（最早到期的在前）
    this.retryQueue.sort((a, b) => a.retryAt - b.retryAt);

    // 重新调度定时器
    this.scheduleNextRetry();
  }

  /**
   * Remove a job from the retry queue.
   */
  private removeFromRetryQueue(jobId: string): void {
    const index = this.retryQueue.findIndex(r => r.jobId === jobId);
    if (index !== -1) {
      this.retryQueue.splice(index, 1);
    }
  }

  /**
   * Schedule the next retry timer.
   * 使用单个定时器触发所有到期的重试任务。
   */
  private scheduleNextRetry(): void {
    // 清除现有定时器
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.retryQueue.length === 0) {
      return;
    }

    // 计算到下一个到期任务的延迟
    const next = this.retryQueue[0]!;
    const delay = Math.max(0, next.retryAt - Date.now());

    this.retryTimer = setTimeout(() => {
      this.processRetryQueue();
    }, delay);
  }

  /**
   * Process all expired retry tasks.
   */
  private processRetryQueue(): void {
    const now = Date.now();
    const processed: string[] = [];

    // 处理所有到期的任务
    while (this.retryQueue.length > 0 && this.retryQueue[0]!.retryAt <= now) {
      const { jobId } = this.retryQueue.shift()!;
      processed.push(jobId);
    }

    // 重新调度定时器（如果还有剩余任务）
    if (this.retryQueue.length > 0) {
      this.scheduleNextRetry();
    }

    // 将到期的 job 重新插入队列
    for (const jobId of processed) {
      const job = this.jobs.get(jobId);
      if (job && job.status === PrintJobStatus.PENDING) {
        this.insertByPriority(jobId, job.priority);
        if (this.config.autoProcess && !this.isPaused) {
          this.processQueue();
        }
      }
    }
  }

  /**
   * Clear retry timer for a specific job.
   * 优化：从延迟队列中移除，不再需要 clearTimeout
   */
  private clearRetryTimer(jobId: string): void {
    this.removeFromRetryQueue(jobId);
    // 如果队列变空，清除定时器
    if (this.retryQueue.length === 0 && this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Clear all retry timers.
   * 优化：清空队列并清除单个定时器
   */
  private clearAllRetryTimers(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryQueue = [];
  }
}

// Export singleton instance for convenience
export const printQueue = new PrintQueue();
