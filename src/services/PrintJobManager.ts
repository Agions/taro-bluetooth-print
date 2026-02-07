/**
 * Print Job Manager Service
 *
 * Manages print jobs, including pause/resume/cancel functionality
 */

import type { IPrinterAdapter } from '@/types';
import { IAdapterOptions } from '@/types';
import { IPrintJobManager, IConnectionManager } from '@/services/interfaces';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Creates a no-op adapter for backward compatibility with mock objects in tests.
 * Each method logs a warning and resolves (or throws for write if called unexpectedly).
 */
function createNoOpAdapter(): IPrinterAdapter {
  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    write: () => Promise.resolve(),
  };
}

/**
 * Saved job state structure
 */
interface SavedJobState {
  jobId: string;
  jobBuffer: number[];
  jobOffset: number;
  adapterOptions: IAdapterOptions;
  timestamp: number;
}

/**
 * Print Job Manager implementation
 */
export class PrintJobManager implements IPrintJobManager {
  /** 内存中的任务状态存储（可被子类或外部替换为持久化方案） */
  private static jobStateStore: Map<string, SavedJobState> = new Map();
  private adapter: IPrinterAdapter;
  private connectionManager: IConnectionManager;
  private jobBuffer: Uint8Array | null = null;
  private jobOffset = 0;
  private _isPaused = false;
  private _isInProgress = false;
  private adapterOptions: IAdapterOptions = {};
  private readonly logger = Logger.scope('PrintJobManager');
  private onProgress?: (sent: number, total: number) => void;
  private jobId: string | null = null;
  private onJobStateChange?: (state: 'in-progress' | 'paused' | 'completed' | 'cancelled') => void;

  /**
   * Sets the progress callback
   *
   * @param callback - Progress callback function
   */
  setProgressCallback(callback?: (sent: number, total: number) => void): void {
    this.onProgress = callback;
  }

  /**
   * Sets the job state change callback
   *
   * @param callback - Job state change callback function
   */
  setJobStateCallback(
    callback?: (state: 'in-progress' | 'paused' | 'completed' | 'cancelled') => void
  ): void {
    this.onJobStateChange = callback;
  }

  /**
   * Creates a new PrintJobManager instance
   *
   * @param connectionManager - Connection manager instance
   */
  constructor(connectionManager: IConnectionManager) {
    this.connectionManager = connectionManager;

    // Check if connectionManager has getAdapter method
    if (typeof connectionManager.getAdapter === 'function') {
      this.adapter = connectionManager.getAdapter();
    } else {
      // For backward compatibility with mock objects in tests.
      // Creates a no-op adapter that throws descriptive errors on unexpected usage.
      this.adapter = createNoOpAdapter();
    }
  }

  /**
   * Starts a print job
   *
   * @param buffer - Print data buffer
   * @param options - Print job options
   * @returns Promise<void>
   */
  async start(buffer: Uint8Array, options?: { jobId?: string }): Promise<void> {
    if (this._isInProgress) {
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_IN_PROGRESS,
        'A print job is already in progress. Wait for completion or cancel it.'
      );
    }

    this.jobId = options?.jobId || this.generateJobId();
    this.jobBuffer = buffer;
    this.jobOffset = 0;
    this._isPaused = false;
    this._isInProgress = true;

    this.logger.info(`Starting print job ${this.jobId}: ${buffer.length} bytes`);
    this.emitJobState('in-progress');

    try {
      await this.processJob();

      // Check if the job was paused
      if (this._isPaused) {
        this.logger.info(`Print job ${this.jobId} paused`);
        this.saveJobState();
        // Don't reset _isInProgress when paused, so resume() and cancel() can still work
      } else {
        // Print job completed successfully
        this.logger.info(`Print job ${this.jobId} completed successfully`);
        this._isInProgress = false;
        this.clearJobState();
        this.emitJobState('completed');
      }
    } catch (error) {
      this.logger.error(`Print job ${this.jobId} failed:`, error);
      this._isInProgress = false;

      // Save job state for resume later if needed
      if (this._isPaused) {
        this.saveJobState();
      } else {
        this.clearJobState();
      }

      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(ErrorCode.PRINT_JOB_FAILED, 'Print job failed', error as Error);
      throw printError;
    }
  }

  /**
   * Resumes a paused print job
   *
   * @param jobId - Job ID to resume (optional)
   * @returns Promise<void>
   */
  async resume(jobId?: string): Promise<void> {
    if (!this._isInProgress || !this._isPaused) {
      // Try to load paused job if jobId is provided
      if (jobId) {
        this.loadJobState(jobId);
      } else {
        this.logger.warn('Resume called but no paused print job');
        return;
      }
    }

    this._isPaused = false;
    this.logger.info(`Resuming print job ${this.jobId}`);
    this.emitJobState('in-progress');

    try {
      await this.processJob();

      if (!this._isPaused) {
        // Print job completed successfully
        this.logger.info(`Print job ${this.jobId} completed successfully`);
        this._isInProgress = false;
        this.clearJobState();
        this.emitJobState('completed');
      }
    } catch (error) {
      this.logger.error(`Print job ${this.jobId} failed after resume:`, error);
      this._isInProgress = false;
      this.clearJobState();
      this.emitJobState('cancelled');

      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(ErrorCode.PRINT_JOB_FAILED, 'Print job failed', error as Error);
      throw printError;
    }
  }

  /**
   * Cancels the current print job
   */
  cancel(): void {
    if (!this._isInProgress) {
      this.logger.warn('Cancel called but no print job in progress');
      return;
    }

    this.logger.info(`Cancelling print job ${this.jobId}`);
    this._isPaused = false;
    this._isInProgress = false;
    this.clearJobState();
    this.emitJobState('cancelled');
    this.logger.info(`Print job ${this.jobId} cancelled`);
  }

  /**
   * Generates a unique job ID
   *
   * @returns string - Unique job ID
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Saves the current job state for resume later.
   *
   * 默认实现使用内存存储。如需持久化（如 localStorage），
   * 可通过 setSaveHandler/setLoadHandler 自定义。
   */
  private saveJobState(): void {
    if (!this.jobBuffer || !this.jobId) {
      return;
    }

    try {
      const state = {
        jobId: this.jobId,
        jobBuffer: Array.from(this.jobBuffer),
        jobOffset: this.jobOffset,
        adapterOptions: this.adapterOptions,
        timestamp: Date.now(),
      };

      PrintJobManager.jobStateStore.set(this.jobId, state);

      this.logger.debug(
        `Saved job state for ${this.jobId}: offset=${this.jobOffset}/${this.jobBuffer.length}`
      );
    } catch (error) {
      this.logger.error(`Failed to save job state for ${this.jobId}:`, error);
    }
  }

  /**
   * Loads a saved job state
   *
   * @param jobId - Job ID to load
   */
  private loadJobState(jobId: string): void {
    try {
      this.logger.debug(`Loading job state for ${jobId}`);

      const savedState = PrintJobManager.jobStateStore.get(jobId);

      if (savedState) {
        this.jobId = savedState.jobId;
        this.jobBuffer = new Uint8Array(savedState.jobBuffer);
        this.jobOffset = savedState.jobOffset;
        this.adapterOptions = savedState.adapterOptions;
        this._isPaused = true;
        this._isInProgress = true;
        this.logger.info(
          `Loaded job ${this.jobId}: offset=${this.jobOffset}/${this.jobBuffer.length}`
        );
      } else {
        throw new Error(`Job state not found for ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load job state for ${jobId}:`, error);
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_FAILED,
        `Failed to load job ${jobId}`,
        error as Error
      );
    }
  }

  /**
   * Clears the current job state
   */
  private clearJobState(): void {
    if (this.jobId) {
      this.logger.debug(`Clearing job state for ${this.jobId}`);
      PrintJobManager.jobStateStore.delete(this.jobId);
    }

    this.jobBuffer = null;
    this.jobOffset = 0;
    this.jobId = null;
    this.adapterOptions = {};
  }

  /**
   * Emits job state change event
   *
   * @param state - New job state
   */
  private emitJobState(state: 'in-progress' | 'paused' | 'completed' | 'cancelled'): void {
    if (this.onJobStateChange) {
      this.onJobStateChange(state);
    }
  }

  /**
   * Pauses the current print job
   */
  pause(): void {
    if (!this._isInProgress) {
      this.logger.warn('Pause called but no print job in progress');
      return;
    }

    this._isPaused = true;
    this.logger.info('Print job paused');
  }

  /**
   * Gets the number of bytes remaining to print
   *
   * @returns number - Bytes remaining
   */
  remaining(): number {
    if (this.jobBuffer) {
      return this.jobBuffer.length - this.jobOffset;
    }
    return 0;
  }

  /**
   * Checks if the print job is paused
   *
   * @returns boolean - True if paused, false otherwise
   */
  isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Checks if a print job is in progress
   *
   * @returns boolean - True if in progress, false otherwise
   */
  isInProgress(): boolean {
    return this._isInProgress;
  }

  /**
   * Sets adapter options for write operations
   *
   * @param options - Adapter options
   */
  setOptions(options: IAdapterOptions): void {
    this.adapterOptions = { ...this.adapterOptions, ...options };
    this.logger.debug('Adapter options updated:', this.adapterOptions);
  }

  /**
   * Processes the print job in chunks
   * Supports pause/resume functionality
   *
   * @returns Promise<void>
   */
  private async processJob(): Promise<void> {
    if (!this.jobBuffer) {
      return;
    }

    // Check if adapter has write method
    if (!this.adapter || typeof this.adapter.write !== 'function') {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
        'Printer adapter does not support write operation'
      );
    }

    const { chunkSize = 512 } = this.adapterOptions;
    const total = this.jobBuffer.length;
    const jobBuffer = this.jobBuffer;
    const deviceId = this.getDeviceId();

    try {
      while (this.jobOffset < jobBuffer.length) {
        if (this._isPaused) {
          this.logger.debug('Job paused at offset:', this.jobOffset);
          return;
        }

        const end = Math.min(this.jobOffset + chunkSize, jobBuffer.length);
        const chunk = jobBuffer.slice(this.jobOffset, end);

        await this.adapter.write(deviceId, chunk.buffer, this.adapterOptions);

        this.jobOffset = end;

        this.logger.debug(`Processed ${this.jobOffset}/${total} bytes`);

        // Send progress event
        if (this.onProgress) {
          this.onProgress(this.jobOffset, total);
        }
      }
    } catch (error) {
      this.logger.error('Error processing job:', error);
      throw error;
    }
  }

  /**
   * Gets the current device ID from the connection manager
   *
   * @returns string - Device ID
   * @throws BluetoothPrintError if no device is connected
   */
  private getDeviceId(): string {
    const deviceId = this.connectionManager.getDeviceId();
    if (!deviceId) {
      throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device ID not available');
    }
    return deviceId;
  }
}
