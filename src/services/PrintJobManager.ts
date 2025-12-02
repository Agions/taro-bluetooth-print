/**
 * Print Job Manager Service
 *
 * Manages print jobs, including pause/resume/cancel functionality
 */

import { Service } from 'typedi';
import type { IPrinterAdapter } from '@/types';
import { IAdapterOptions, PrinterState } from '@/types';
import { IPrintJobManager, IConnectionManager } from './interfaces';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Print Job Manager implementation
 */
@Service()
export class PrintJobManager implements IPrintJobManager {
  private adapter: IPrinterAdapter;
  private connectionManager: IConnectionManager;
  private jobBuffer: Uint8Array | null = null;
  private jobOffset = 0;
  private _isPaused = false;
  private _isInProgress = false;
  private adapterOptions: IAdapterOptions = {};
  private readonly logger = Logger.scope('PrintJobManager');

  /**
   * Creates a new PrintJobManager instance
   *
   * @param connectionManagerOrAdapter - Connection manager instance or adapter instance (for backward compatibility)
   * @param adapter - Printer adapter instance (optional, will be taken from connectionManager if not provided)
   */
  constructor(
    connectionManagerOrAdapter?: IConnectionManager | IPrinterAdapter,
    adapter?: IPrinterAdapter
  ) {
    // Handle case where adapter is explicitly provided
    if (adapter) {
      // New API: new PrintJobManager(connectionManager, adapter)
      this.connectionManager = connectionManagerOrAdapter as IConnectionManager;
      this.adapter = adapter;
    }
    // Handle backward compatibility for old API: new PrintJobManager(adapter, driver)
    else if (
      connectionManagerOrAdapter &&
      typeof (connectionManagerOrAdapter as IPrinterAdapter).connect === 'function'
    ) {
      // Old API: new PrintJobManager(adapter)
      this.adapter = connectionManagerOrAdapter as IPrinterAdapter;
      // Create a minimal connection manager for backward compatibility
      this.connectionManager = {
        getDeviceId: () => 'test-device', // Default device ID for backward compatibility
        isConnected: () => true,
        getState: () => PrinterState.CONNECTED, // Default to CONNECTED
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        getAdapter: () => this.adapter,
      };
    }
    // Handle new API: new PrintJobManager(connectionManager)
    else {
      // New API: dependency injection or manual service creation
      this.connectionManager = connectionManagerOrAdapter as IConnectionManager;
      // Try to get adapter from connectionManager
      if (
        this.connectionManager &&
        typeof (
          this.connectionManager as IConnectionManager & { getAdapter?: () => IPrinterAdapter }
        ).getAdapter === 'function'
      ) {
        this.adapter = (
          this.connectionManager as IConnectionManager & { getAdapter: () => IPrinterAdapter }
        ).getAdapter();
      } else {
        throw new Error(
          'Printer adapter not provided and could not be retrieved from connection manager'
        );
      }
    }
  }

  /**
   * Starts a print job
   *
   * @param buffer - Print data buffer
   * @returns Promise<void>
   */
  async start(buffer: Uint8Array): Promise<void> {
    if (this._isInProgress) {
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_IN_PROGRESS,
        'A print job is already in progress. Wait for completion or cancel it.'
      );
    }

    this.logger.info(`Starting print job: ${buffer.length} bytes`);

    this.jobBuffer = buffer;
    this.jobOffset = 0;
    this._isPaused = false;
    this._isInProgress = true;

    try {
      await this.processJob();

      // Check if the job was paused
      if (this._isPaused) {
        this.logger.info('Print job paused');
        // Don't reset _isInProgress when paused, so resume() and cancel() can still work
      } else {
        // Print job completed successfully
        this.logger.info('Print job completed successfully');
        this._isInProgress = false;
        this.jobBuffer = null;
        this.jobOffset = 0;
      }
    } catch (error) {
      this.logger.error('Print job failed:', error);
      this._isInProgress = false;
      this.jobBuffer = null;
      this.jobOffset = 0;

      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(ErrorCode.PRINT_JOB_FAILED, 'Print job failed', error as Error);
      throw printError;
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
   * Resumes a paused print job
   *
   * @returns Promise<void>
   */
  async resume(): Promise<void> {
    if (!this._isInProgress || !this._isPaused) {
      this.logger.warn('Resume called but no paused print job');
      return;
    }

    this._isPaused = false;
    this.logger.info('Print job resumed');

    try {
      await this.processJob();

      if (!this._isPaused) {
        // Print job completed successfully
        this.logger.info('Print job completed successfully');
        this._isInProgress = false;
        this.jobBuffer = null;
        this.jobOffset = 0;
      }
    } catch (error) {
      this.logger.error('Print job failed after resume:', error);
      this._isInProgress = false;
      this.jobBuffer = null;
      this.jobOffset = 0;

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

    this._isPaused = false;
    this._isInProgress = false;
    this.jobBuffer = null;
    this.jobOffset = 0;
    this.logger.info('Print job cancelled');
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

    const printerChunkSize = 512;
    const total = this.jobBuffer.length;
    const jobBuffer = this.jobBuffer; // Cache to avoid closure issues

    try {
      while (this.jobOffset < jobBuffer.length) {
        if (this._isPaused) {
          this.logger.debug('Job paused at offset:', this.jobOffset);
          return;
        }

        // Check device connection state
        // Note: We rely on the adapter to handle connection state changes

        const end = Math.min(this.jobOffset + printerChunkSize, jobBuffer.length);
        const chunk = jobBuffer.slice(this.jobOffset, end);

        await this.adapter.write(this.getDeviceId(), chunk.buffer, this.adapterOptions);

        this.jobOffset = end;

        this.logger.debug(`Processed ${this.jobOffset}/${total} bytes`);
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
