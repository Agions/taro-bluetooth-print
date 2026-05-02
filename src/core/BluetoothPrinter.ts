/**
 * Core Bluetooth Printer Class
 * Main entry point for interacting with Bluetooth thermal printers
 */

import { IAdapterOptions, IQrOptions, PrinterState, IPrinterAdapter } from '@/types';
import { EventEmitter } from './EventEmitter';
import { Logger } from '@/utils/logger';
import { normalizeError } from '@/utils/normalizeError';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';
import { ConnectionManager } from '@/services/ConnectionManager';
import { PrintJobManager } from '@/services/PrintJobManager';
import { CommandBuilder } from '@/services/CommandBuilder';
import type { IConnectionManager } from '@/services/interfaces';
import type { IPrintJobManager } from '@/services/interfaces';
import type { ICommandBuilder } from '@/services/interfaces';

/**
 * Event types emitted by BluetoothPrinter
 */
export interface PrinterEvents {
  /** Emitted when connection state changes */
  'state-change': PrinterState;
  /** Emitted during printing to show progress */
  progress: { sent: number; total: number };
  /** Emitted when an error occurs */
  error: BluetoothPrintError;
  /** Emitted when successfully connected */
  connected: string; // deviceId
  /** Emitted when disconnected */
  disconnected: string; // deviceId
  /** Emitted when print job completes */
  'print-complete': void;
}

/**
 * Bluetooth Thermal Printer Controller
 *
 * Provides a fluent API for building and sending print commands to Bluetooth thermal printers.
 * Supports text, images, QR codes, and advanced features like pause/resume and progress tracking.
 *
 * @example
 * ```typescript
 * const printer = new BluetoothPrinter();
 *
 * // Listen for events
 * printer.on('progress', ({ sent, total }) => {
 *   console.log(`Progress: ${sent}/${total}`);
 * });
 *
 * // Connect and print
 * await printer.connect('device-id');
 * await printer
 *   .text('Hello World!')
 *   .feed(2)
 *   .qr('https://example.com')
 *   .cut()
 *   .print();
 *
 * await printer.disconnect();
 * ```
 */
export class BluetoothPrinter extends EventEmitter<PrinterEvents> {
  private readonly printerLogger = Logger.scope('BluetoothPrinter');

  /** Current printer state */
  public state: PrinterState = PrinterState.DISCONNECTED;

  /** Connection manager instance */
  private connectionManager: IConnectionManager;

  /** Print job manager instance */
  private printJobManager: IPrintJobManager;

  /** Command builder instance */
  private commandBuilder: ICommandBuilder;

  /**
   * Creates a new BluetoothPrinter instance
   *
   * Supports two calling conventions:
   * - Modern DI: new BluetoothPrinter(connectionManager, printJobManager, commandBuilder)
   * - Legacy API: new BluetoothPrinter(adapter) - adapter is wrapped in ConnectionManager
   *
   * @param connectionManagerOrAdapter - Connection manager (recommended) or IPrinterAdapter (legacy)
   * @param printJobManager - Print job manager instance
   * @param commandBuilder - Command builder instance
   *
   * @example
   * ```typescript
   * // Recommended: use the factory
   * import { createBluetoothPrinter } from 'taro-bluetooth-print';
   * const printer = createBluetoothPrinter({ adapter: myAdapter });
   *
   * // Direct instantiation with DI
   * const printer = new BluetoothPrinter(connectionManager, printJobManager, commandBuilder);
   *
   * // Legacy API (backward compatible)
   * const printer = new BluetoothPrinter(adapter);
   * ```
   */
  constructor(
    connectionManagerOrAdapter?: IConnectionManager | IPrinterAdapter,
    printJobManager?: IPrintJobManager,
    commandBuilder?: ICommandBuilder
  ) {
    super();

    // Detect legacy API: first arg is an adapter (has connect method) vs connection manager
    const isAdapter =
      connectionManagerOrAdapter != null &&
      typeof (connectionManagerOrAdapter as IPrinterAdapter).connect === 'function';

    if (isAdapter) {
      // Legacy API: wrap adapter in ConnectionManager
      const adapter = connectionManagerOrAdapter as IPrinterAdapter;
      this.connectionManager = new ConnectionManager(adapter);
      this.printJobManager = printJobManager ?? new PrintJobManager(this.connectionManager);
      this.commandBuilder = commandBuilder ?? new CommandBuilder();
    } else {
      // Modern DI
      this.connectionManager =
        (connectionManagerOrAdapter as IConnectionManager) ?? new ConnectionManager();
      this.printJobManager = printJobManager ?? new PrintJobManager(this.connectionManager);
      this.commandBuilder = commandBuilder ?? new CommandBuilder();
    }

    this.updateState();
  }

  /**
   * Updates the current state based on the connection manager and print job manager states
   */
  private updateState(): void {
    // All interface methods are guaranteed to exist
    const connectionState = this.connectionManager.getState();

    const isPrinting = this.printJobManager.isInProgress();

    const isPaused = this.printJobManager.isPaused();

    // Determine the final state
    if (isPaused) {
      this.state = PrinterState.PAUSED;
    } else if (isPrinting) {
      this.state = PrinterState.PRINTING;
    } else {
      this.state = connectionState;
    }

    this.emit('state-change', this.state);
    this.printerLogger.debug('State updated:', this.state);
  }

  /**
   * Connects to a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID (obtained from device scanning)
   * @returns This instance for method chaining
   * @throws {BluetoothPrintError} When connection fails
   *
   * @example
   * ```typescript
   * await printer.connect('device-12345');
   * ```
   */
  async connect(deviceId: string): Promise<this> {
    this.printerLogger.info('Connecting to device:', deviceId);

    try {
      await this.connectionManager.connect(deviceId);
      this.updateState();
      this.emit('connected', deviceId);
      this.printerLogger.info('Connected successfully');

      return this;
    } catch (error) {
      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(
              ErrorCode.CONNECTION_FAILED,
              'Connection failed',
              normalizeError(error)
            );
      this.emit('error', printError);
      this.updateState();
      throw printError;
    }
  }

  /**
   * Disconnects from the current device
   *
   * @throws {BluetoothPrintError} When disconnect fails
   *
   * @example
   * ```typescript
   * await printer.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    const deviceId = this.connectionManager.getDeviceId();
    if (!deviceId) {
      this.printerLogger.warn('Disconnect called but no device connected');
      return;
    }

    this.printerLogger.info('Disconnecting from device:', deviceId);

    try {
      await this.connectionManager.disconnect();
      this.printJobManager.cancel();
      this.updateState();
      this.emit('disconnected', deviceId);
      this.printerLogger.info('Disconnected successfully');
    } catch (error) {
      const printError = new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Disconnect failed',
        normalizeError(error)
      );
      this.emit('error', printError);
      this.updateState();
      throw printError;
    }
  }

  /**
   * Adds text to the print queue
   *
   * @param content - Text content to print
   * @param encoding - Text encoding (default: 'GBK')
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.text('Hello World!').text('你好世界', 'GBK');
   * ```
   */
  text(content: string, encoding?: string): this {
    this.commandBuilder.text(content, encoding);
    return this;
  }

  /**
   * Adds line feeds to the print queue
   *
   * @param lines - Number of lines to feed (default: 1)
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.text('Line 1').feed(2).text('Line 3');
   * ```
   */
  feed(lines = 1): this {
    this.commandBuilder.feed(lines);
    return this;
  }

  /**
   * Adds paper cut command to the print queue
   *
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.text('Receipt').feed(3).cut();
   * ```
   */
  cut(): this {
    this.commandBuilder.cut();
    return this;
  }

  /**
   * Adds image to the print queue
   *
   * @param data - RGBA pixel data as Uint8Array
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * const imageData = new Uint8Array(width * height * 4); // RGBA
   * printer.image(imageData, 200, 100);
   * ```
   */
  image(data: Uint8Array, width: number, height: number): this {
    this.commandBuilder.image(data, width, height);
    return this;
  }

  /**
   * Adds QR code to the print queue
   *
   * @param content - QR code content (URL, text, etc.)
   * @param options - QR code options (model, size, error correction)
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.qr('https://example.com', { size: 8, errorCorrection: 'M' });
   * ```
   */
  qr(content: string, options?: IQrOptions): this {
    this.commandBuilder.qr(content, options);
    return this;
  }

  /**
   * Sets adapter options for write operations
   *
   * @param options - Adapter options (chunk size, delay, retries)
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.setOptions({ chunkSize: 20, delay: 30, retries: 3 });
   * ```
   */
  setOptions(options: IAdapterOptions): this {
    this.printJobManager.setOptions(options);
    return this;
  }

  /**
   * Pauses the current print job
   * Can be resumed with resume()
   *
   * @example
   * ```typescript
   * printer.pause();
   * // ... do something ...
   * await printer.resume();
   * ```
   */
  pause(): void {
    this.printJobManager.pause();
    this.updateState();
    this.printerLogger.info('Print job paused');
  }

  /**
   * Resumes a paused print job
   *
   * @throws {BluetoothPrintError} When resume fails
   *
   * @example
   * ```typescript
   * await printer.resume();
   * ```
   */
  async resume(): Promise<void> {
    this.printerLogger.info('Resuming print job');

    try {
      await this.printJobManager.resume();
      this.updateState();
      this.printerLogger.info('Print job resumed');
    } catch (error) {
      const printError = new BluetoothPrintError(
        ErrorCode.PRINT_JOB_FAILED,
        'Failed to resume print job',
        normalizeError(error)
      );
      this.emit('error', printError);
      this.updateState();
      throw printError;
    }
  }

  /**
   * Cancels the current print job and clears the queue
   *
   * @example
   * ```typescript
   * printer.cancel();
   * ```
   */
  cancel(): void {
    this.printJobManager.cancel();
    this.commandBuilder.clear();
    this.updateState();
    this.printerLogger.info('Print job cancelled');
  }

  /**
   * Gets the number of bytes remaining to print
   *
   * @returns Number of bytes remaining
   *
   * @example
   * ```typescript
   * console.log('Remaining:', printer.remaining(), 'bytes');
   * ```
   */
  remaining(): number {
    // When print() is called, command buffer content is transferred to printJobManager
    // and command buffer is cleared (except for init command).
    // So we only need to return printJobManager.remaining()
    return this.printJobManager.remaining();
  }

  /**
   * Sends all queued commands to the printer
   *
   * @throws {BluetoothPrintError} When print fails
   *
   * @example
   * ```typescript
   * await printer
   *   .text('Hello')
   *   .feed(2)
   *   .cut()
   *   .print();
   * ```
   */
  async print(): Promise<void> {
    const isConnected = this.connectionManager.isConnected();

    if (!isConnected) {
      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        'Printer not connected. Call connect() first.'
      );
    }

    const buffer = this.commandBuilder.getBuffer();
    this.printerLogger.info(`Starting print job: ${buffer.length} bytes`);

    // Clear the command buffer after getting the buffer for printing
    this.commandBuilder.clear();

    this.updateState();

    // Set progress callback
    this.printJobManager.setProgressCallback((sent, total) => {
      this.emit('progress', { sent, total });
    });

    try {
      await this.printJobManager.start(buffer);

      const isPaused = this.printJobManager.isPaused();

      if (isPaused) {
        // Print job was paused
        this.printerLogger.info('Print job paused');
      } else {
        // Print job completed successfully
        this.emit('print-complete');
        this.printerLogger.info('Print job completed successfully');
      }
    } catch (error) {
      this.printerLogger.error('Print job failed with error:', error);
      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(
              ErrorCode.PRINT_JOB_FAILED,
              'Print job failed',
              normalizeError(error)
            );
      this.emit('error', printError);
      throw printError;
    } finally {
      this.updateState();
    }
  }

  // ============================================
  // Text Formatting Methods (New in v2.2)
  // ============================================

  /**
   * Sets text alignment
   *
   * @param alignment - Text alignment ('left', 'center', 'right')
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.align('center').text('Centered Text');
   * ```
   */
  align(alignment: 'left' | 'center' | 'right'): this {
    this.commandBuilder.align(alignment as import('@/formatter/TextFormatter').TextAlign);
    return this;
  }

  /**
   * Sets text size (width and height multiplier)
   *
   * @param width - Width multiplier (1-8)
   * @param height - Height multiplier (1-8)
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.setSize(2, 2).text('Large Text');
   * ```
   */
  setSize(width: number, height: number): this {
    this.commandBuilder.setSize(width, height);
    return this;
  }

  /**
   * Sets bold text mode
   *
   * @param enabled - Whether to enable bold
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.setBold(true).text('Bold Text').setBold(false);
   * ```
   */
  setBold(enabled: boolean): this {
    this.commandBuilder.setBold(enabled);
    return this;
  }

  /**
   * Sets underline text mode
   *
   * @param enabled - Whether to enable underline
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.setUnderline(true).text('Underlined').setUnderline(false);
   * ```
   */
  setUnderline(enabled: boolean): this {
    this.commandBuilder.setUnderline(enabled);
    return this;
  }

  /**
   * Resets all text formatting to default
   *
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.setBold(true).text('Bold').resetStyle().text('Normal');
   * ```
   */
  resetStyle(): this {
    this.commandBuilder.resetStyle();
    return this;
  }

  /**
   * Adds a barcode to the print queue
   *
   * @param content - Barcode content
   * @param format - Barcode format ('CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPCA')
   * @param options - Optional barcode settings
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * printer.barcode('1234567890128', 'EAN13', { height: 80 });
   * ```
   */
  barcode(
    content: string,
    format: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPCA',
    options?: { height?: number; width?: number; showText?: boolean }
  ): this {
    this.commandBuilder.barcode(content, {
      format: format as import('@/barcode/BarcodeGenerator').BarcodeFormat,
      ...options,
    });
    return this;
  }

  /**
   * Gets the connection manager instance
   * Useful for advanced connection management features
   *
   * @returns Connection manager instance
   */
  getConnectionManager(): IConnectionManager {
    return this.connectionManager;
  }

  /**
   * Gets the command builder instance
   * Useful for advanced command building
   *
   * @returns Command builder instance
   */
  getCommandBuilder(): ICommandBuilder {
    return this.commandBuilder;
  }

  /**
   * Cleanup resources and destroy the printer instance
   * Removes all event listeners and releases resources
   *
   * @example
   * ```typescript
   * printer.destroy();
   * ```
   */
  destroy(): void {
    this.printerLogger.info('Destroying BluetoothPrinter instance');

    // Cancel any pending print job
    this.printJobManager.cancel();

    // Clear command buffer
    this.commandBuilder.clear();

    // Disconnect if connected
    if (this.connectionManager.isConnected()) {
      this.connectionManager.disconnect().catch(error => {
        this.printerLogger.warn('Error during disconnect in destroy:', error);
      });
    }

    // Cleanup connection manager resources (IConnectionManager now has destroy())
    this.connectionManager.destroy();

    // Remove all event listeners
    this.removeAllListeners();

    this.printerLogger.info('BluetoothPrinter instance destroyed');
  }
}
