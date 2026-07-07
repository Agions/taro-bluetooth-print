/**
 * Print Job Manager Service
 *
 * Manages print jobs, including pause/resume/cancel functionality.
 * Supports job state persistence for resume capability.
 */

import type { IPrinterAdapter, IAdapterOptions } from '@/types';
import { IPrintJobManager, IConnectionManager } from '@/services/interfaces';
import { Logger } from '@/utils/logger';
import { normalizeError } from '@/utils/normalizeError';
import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';

export type JobState = 'in-progress' | 'paused' | 'completed' | 'cancelled';

interface SavedJobState {
  jobId: string;
  jobBuffer: number[];
  jobOffset: number;
  adapterOptions: IAdapterOptions;
  timestamp: number;
}

/**
 * No-op adapter used when the connection manager has no getAdapter() method
 * (legacy mock objects in tests). write() throws if unexpectedly invoked.
 */
function createNoOpAdapter(): IPrinterAdapter {
  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    write: () => {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
        'No adapter available for print job write'
      );
    },
  };
}

const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes
const DEFAULT_EXPIRY_MS = 3_600_000; // 1 hour

export class PrintJobManager implements IPrintJobManager {
  private readonly instanceJobStateStore: Map<string, SavedJobState> = new Map();
  private static staticJobStateStore: Map<string, SavedJobState> = new Map();
  private static cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private readonly connectionManager: IConnectionManager;
  private readonly adapter: IPrinterAdapter;
  private jobBuffer: Uint8Array | null = null;
  private jobOffset = 0;
  private paused = false;
  private inProgress = false;
  private adapterOptions: IAdapterOptions = {};
  private jobId: string | null = null;
  private onProgress?: (sent: number, total: number) => void;
  private onJobStateChange?: (state: JobState) => void;
  private readonly logger = Logger.scope('PrintJobManager');

  constructor(connectionManager: IConnectionManager) {
    this.connectionManager = connectionManager;
    this.adapter =
      typeof connectionManager.getAdapter === 'function'
        ? connectionManager.getAdapter()
        : createNoOpAdapter();
  }

  setProgressCallback(callback?: (sent: number, total: number) => void): void {
    this.onProgress = callback;
  }

  setJobStateCallback(callback?: (state: JobState) => void): void {
    this.onJobStateChange = callback;
  }

  /**
   * Wraps a raw error as BluetoothPrintError if it isn't already one.
   */
  private wrapError(error: unknown, code: ErrorCode, message: string): BluetoothPrintError {
    return error instanceof BluetoothPrintError
      ? error
      : new BluetoothPrintError(code, message, normalizeError(error));
  }

  async start(buffer: Uint8Array, options?: { jobId?: string }): Promise<void> {
    if (this.inProgress) {
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_IN_PROGRESS,
        'A print job is already in progress. Wait for completion or cancel it.'
      );
    }

    this.jobId = options?.jobId ?? this.generateJobId();
    this.jobBuffer = buffer;
    this.jobOffset = 0;
    this.paused = false;
    this.inProgress = true;

    this.logger.info(`Starting print job ${this.jobId}: ${buffer.length} bytes`);
    this.emitJobState('in-progress');

    try {
      await this.processJob();

      if (this.paused) {
        this.logger.info(`Print job ${this.jobId} paused`);
        this.saveJobState();
      } else {
        this.completeJob();
      }
    } catch (error) {
      this.logger.error(`Print job ${this.jobId} failed:`, error);
      this.inProgress = false;
      if (this.paused) {
        this.saveJobState();
      } else {
        this.clearJobState();
      }
      throw this.wrapError(error, ErrorCode.PRINT_JOB_FAILED, 'Print job failed');
    }
  }

  async resume(jobId?: string): Promise<void> {
    if (!this.inProgress || !this.paused) {
      if (jobId) {
        this.loadJobState(jobId);
      } else {
        this.logger.warn('Resume called but no paused print job');
        return;
      }
    }

    this.paused = false;
    this.logger.info(`Resuming print job ${this.jobId}`);
    this.emitJobState('in-progress');

    try {
      await this.processJob();
      if (!this.paused) {
        this.completeJob();
      }
    } catch (error) {
      this.logger.error(`Print job ${this.jobId} failed after resume:`, error);
      this.inProgress = false;
      this.clearJobState();
      this.emitJobState('cancelled');
      throw this.wrapError(error, ErrorCode.PRINT_JOB_FAILED, 'Print job failed');
    }
  }

  cancel(): void {
    if (!this.inProgress) {
      this.logger.warn('Cancel called but no print job in progress');
      return;
    }
    this.logger.info(`Cancelling print job ${this.jobId}`);
    this.paused = false;
    this.inProgress = false;
    this.clearJobState();
    this.emitJobState('cancelled');
    this.logger.info(`Print job ${this.jobId} cancelled`);
  }

  pause(): void {
    if (!this.inProgress) {
      this.logger.warn('Pause called but no print job in progress');
      return;
    }
    this.paused = true;
    this.logger.info('Print job paused');
  }

  isPaused(): boolean {
    return this.paused;
  }

  isInProgress(): boolean {
    return this.inProgress;
  }

  remaining(): number {
    return this.jobBuffer ? this.jobBuffer.length - this.jobOffset : 0;
  }

  setOptions(options: IAdapterOptions): void {
    this.adapterOptions = { ...this.adapterOptions, ...options };
    this.logger.debug('Adapter options updated:', this.adapterOptions);
  }

  destroy(): void {
    this.cancel();
    this.instanceJobStateStore.clear();
    this.onProgress = undefined;
    this.onJobStateChange = undefined;
    this.logger.info('PrintJobManager destroyed');
  }

  // ============================================
  // Job state persistence
  // ============================================

  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private saveJobState(): void {
    if (!this.jobBuffer || !this.jobId) return;
    try {
      const state: SavedJobState = {
        jobId: this.jobId,
        jobBuffer: Array.from(this.jobBuffer),
        jobOffset: this.jobOffset,
        adapterOptions: { ...this.adapterOptions },
        timestamp: Date.now(),
      };
      this.instanceJobStateStore.set(this.jobId, state);
      PrintJobManager.staticJobStateStore.set(this.jobId, state);
      PrintJobManager.ensureCleanupTimer();
      this.logger.debug(
        `Saved job state for ${this.jobId}: offset=${this.jobOffset}/${this.jobBuffer.length}`
      );
    } catch (error) {
      this.logger.error(`Failed to save job state for ${this.jobId}:`, error);
    }
  }

  private loadJobState(jobId: string): void {
    try {
      this.logger.debug(`Loading job state for ${jobId}`);
      const savedState =
        this.instanceJobStateStore.get(jobId) ?? PrintJobManager.staticJobStateStore.get(jobId);
      if (!savedState) {
        throw new BluetoothPrintError(
          ErrorCode.QUEUE_JOB_NOT_FOUND,
          `Job state not found for ${jobId}`
        );
      }
      this.jobId = savedState.jobId;
      this.jobBuffer = new Uint8Array(savedState.jobBuffer);
      this.jobOffset = savedState.jobOffset;
      this.adapterOptions = { ...savedState.adapterOptions };
      this.paused = true;
      this.inProgress = true;
      this.logger.info(
        `Loaded job ${this.jobId}: offset=${this.jobOffset}/${this.jobBuffer.length}`
      );
    } catch (error) {
      this.logger.error(`Failed to load job state for ${jobId}:`, error);
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_FAILED,
        `Failed to load job ${jobId}`,
        normalizeError(error)
      );
    }
  }

  private clearJobState(): void {
    if (this.jobId) {
      this.logger.debug(`Clearing job state for ${this.jobId}`);
      this.instanceJobStateStore.delete(this.jobId);
      PrintJobManager.staticJobStateStore.delete(this.jobId);
    }
    this.jobBuffer = null;
    this.jobOffset = 0;
    this.jobId = null;
    this.adapterOptions = {};
  }

  /**
   * Lazily start the auto-cleanup timer for the static store. The Node.js
   * `unref()` call lets the process exit even if the timer is still scheduled.
   */
  private static ensureCleanupTimer(): void {
    if (PrintJobManager.cleanupTimer) return;
    PrintJobManager.cleanupTimer = setInterval(() => {
      PrintJobManager.cleanupExpiredJobs();
    }, CLEANUP_INTERVAL_MS);
    if (typeof PrintJobManager.cleanupTimer.unref === 'function') {
      PrintJobManager.cleanupTimer.unref();
    }
  }

  static cleanupExpiredJobs(maxAge = DEFAULT_EXPIRY_MS): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [jobId, state] of PrintJobManager.staticJobStateStore.entries()) {
      if (now - state.timestamp > maxAge) {
        PrintJobManager.staticJobStateStore.delete(jobId);
        cleaned++;
      }
    }
    if (PrintJobManager.staticJobStateStore.size === 0 && PrintJobManager.cleanupTimer) {
      clearInterval(PrintJobManager.cleanupTimer);
      PrintJobManager.cleanupTimer = null;
    }
    return cleaned;
  }

  static stopCleanupTimer(): void {
    if (PrintJobManager.cleanupTimer) {
      clearInterval(PrintJobManager.cleanupTimer);
      PrintJobManager.cleanupTimer = null;
    }
  }

  static getStaticStoreSize(): number {
    return PrintJobManager.staticJobStateStore.size;
  }

  private completeJob(): void {
    this.logger.info(`Print job ${this.jobId} completed successfully`);
    this.inProgress = false;
    this.clearJobState();
    this.emitJobState('completed');
  }

  private emitJobState(state: JobState): void {
    this.onJobStateChange?.(state);
  }

  private async processJob(): Promise<void> {
    if (!this.jobBuffer || typeof this.adapter.write !== 'function') {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
        'Printer adapter does not support write operation'
      );
    }

    const { chunkSize = 512 } = this.adapterOptions;
    const jobBuffer = this.jobBuffer;
    const total = jobBuffer.length;
    const deviceId = this.getDeviceId();

    while (this.jobOffset < jobBuffer.length) {
      if (this.paused) {
        this.logger.debug('Job paused at offset:', this.jobOffset);
        return;
      }
      const end = Math.min(this.jobOffset + chunkSize, jobBuffer.length);
      const chunk = jobBuffer.slice(this.jobOffset, end);
      await this.adapter.write(deviceId, chunk.buffer, this.adapterOptions);
      this.jobOffset = end;
      this.logger.debug(`Processed ${this.jobOffset}/${total} bytes`);
      this.onProgress?.(this.jobOffset, total);
    }
  }

  private getDeviceId(): string {
    const deviceId = this.connectionManager.getDeviceId();
    if (!deviceId) {
      throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device ID not available');
    }
    return deviceId;
  }
}
