/**
 * Service Interfaces
 *
 * Defines the interfaces for the core services used by BluetoothPrinter
 */

import { IAdapterOptions, IQrOptions, PrinterState, IPrinterAdapter } from '@/types';

/**
 * Connection Manager Interface
 *
 * Manages Bluetooth device connections
 */
export interface IConnectionManager {
  /**
   * Connects to a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   * @param options - Connection options
   * @returns Promise<void>
   */
  connect(deviceId: string, options?: { retries?: number; timeout?: number }): Promise<void>;

  /**
   * Disconnects from the current device
   *
   * @returns Promise<void>
   */
  disconnect(): Promise<void>;

  /**
   * Checks if a device is connected
   *
   * @returns boolean - True if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Gets the current device ID
   *
   * @returns string | null - Device ID or null if not connected
   */
  getDeviceId(): string | null;

  /**
   * Gets the current connection state
   *
   * @returns PrinterState - Current state
   */
  getState(): PrinterState;

  /**
   * Gets the printer adapter instance
   *
   * @returns IPrinterAdapter - Printer adapter
   */
  getAdapter(): IPrinterAdapter;
}

/**
 * Print Job Manager Interface
 *
 * Manages print jobs, including pause/resume/cancel functionality
 */
export interface IPrintJobManager {
  /**
   * Starts a print job
   *
   * @param buffer - Print data buffer
   * @returns Promise<void>
   */
  start(buffer: Uint8Array, options?: { jobId?: string }): Promise<void>;

  /**
   * Pauses the current print job
   */
  pause(): void;

  /**
   * Resumes a paused print job
   *
   * @returns Promise<void>
   */
  resume(jobId?: string): Promise<void>;

  /**
   * Cancels the current print job
   */
  cancel(): void;

  /**
   * Gets the number of bytes remaining to print
   *
   * @returns number - Bytes remaining
   */
  remaining(): number;

  /**
   * Checks if the print job is paused
   *
   * @returns boolean - True if paused, false otherwise
   */
  isPaused(): boolean;

  /**
   * Checks if a print job is in progress
   *
   * @returns boolean - True if in progress, false otherwise
   */
  isInProgress(): boolean;

  /**
   * Sets adapter options for write operations
   *
   * @param options - Adapter options
   */
  setOptions(options: IAdapterOptions): void;

  /**
   * Sets the progress callback
   * 
   * @param callback - Progress callback function
   */
  setProgressCallback(callback?: (sent: number, total: number) => void): void;

  /**
   * Sets the job state change callback
   * 
   * @param callback - Job state change callback function
   */
  setJobStateCallback(callback?: (state: 'in-progress' | 'paused' | 'completed' | 'cancelled') => void): void;
}

/**
 * Command Builder Interface
 *
 * Builds print commands using the printer driver
 */
export interface ICommandBuilder {
  /**
   * Adds text to the print queue
   *
   * @param content - Text content
   * @param encoding - Text encoding
   * @returns this - For method chaining
   */
  text(content: string, encoding?: string): this;

  /**
   * Adds line feeds to the print queue
   *
   * @param lines - Number of lines to feed
   * @returns this - For method chaining
   */
  feed(lines?: number): this;

  /**
   * Adds a paper cut command to the print queue
   *
   * @returns this - For method chaining
   */
  cut(): this;

  /**
   * Adds an image to the print queue
   *
   * @param data - Image data as Uint8Array
   * @param width - Image width
   * @param height - Image height
   * @returns this - For method chaining
   */
  image(data: Uint8Array, width: number, height: number): this;

  /**
   * Adds a QR code to the print queue
   *
   * @param content - QR code content
   * @param options - QR code options
   * @returns this - For method chaining
   */
  qr(content: string, options?: IQrOptions): this;

  /**
   * Clears the print queue
   *
   * @returns this - For method chaining
   */
  clear(): this;

  /**
   * Gets the current buffer
   *
   * @returns Uint8Array - Current print buffer
   */
  getBuffer(): Uint8Array;

  /**
   * Gets the total number of bytes in the buffer
   *
   * @returns number - Total bytes
   */
  getTotalBytes(): number;
}
