/**
 * Core Bluetooth Printer Class
 * Main entry point for interacting with Bluetooth thermal printers
 */

import {
  IPrinterAdapter,
  IPrinterDriver,
  IAdapterOptions,
  IQrOptions,
  PrinterState,
} from '@/types';
import { EscPos } from '@/drivers/EscPos';
import { AdapterFactory } from '@/adapters/AdapterFactory';
import { EventEmitter } from './EventEmitter';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

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
  private adapter: IPrinterAdapter;
  private driver: IPrinterDriver;
  private deviceId: string | null = null;
  private buffer: Uint8Array[] = [];
  private adapterOptions: IAdapterOptions = {};
  private isPaused = false;
  private jobBuffer: Uint8Array | null = null;
  private jobOffset = 0;
  private readonly logger = Logger.scope('BluetoothPrinter');

  /** Current printer state */
  public state: PrinterState = PrinterState.DISCONNECTED;

  /**
   * Creates a new BluetoothPrinter instance
   *
   * @param adapter - Custom adapter implementation (defaults to platform-specific adapter)
   * @param driver - Custom driver implementation (defaults to EscPos)
   */
  constructor(adapter?: IPrinterAdapter, driver?: IPrinterDriver) {
    super();
    this.adapter = adapter || AdapterFactory.create();
    this.driver = driver || new EscPos();

    // Listen to adapter state changes
    this.adapter.onStateChange?.(state => {
      this.state = state;
      this.emit('state-change', state);
      this.logger.debug('State changed:', state);
    });
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
    this.logger.info('Connecting to device:', deviceId);

    try {
      this.deviceId = deviceId;
      await this.adapter.connect(deviceId);

      // Initialize printer with ESC/POS init command
      this.buffer.push(...this.driver.init());

      this.emit('connected', deviceId);
      this.logger.info('Connected successfully');

      return this;
    } catch (error) {
      this.deviceId = null;
      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(
              ErrorCode.CONNECTION_FAILED,
              'Connection failed',
              error as Error
            );
      this.emit('error', printError);
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
    if (!this.deviceId) {
      this.logger.warn('Disconnect called but no device connected');
      return;
    }

    const deviceId = this.deviceId;
    this.logger.info('Disconnecting from device:', deviceId);

    try {
      await this.adapter.disconnect(deviceId);
      this.deviceId = null;
      this.buffer = [];
      this.jobBuffer = null;
      this.jobOffset = 0;
      this.emit('disconnected', deviceId);
      this.logger.info('Disconnected successfully');
    } catch (error) {
      const printError = new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Disconnect failed',
        error as Error
      );
      this.emit('error', printError);
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
    this.logger.debug('Adding text:', content.substring(0, 50));
    this.buffer.push(...this.driver.text(content, encoding));
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
    this.logger.debug('Adding feed:', lines);
    this.buffer.push(...this.driver.feed(lines));
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
    this.logger.debug('Adding cut command');
    this.buffer.push(...this.driver.cut());
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
    this.logger.debug(`Adding image: ${width}x${height}`);
    this.buffer.push(...this.driver.image(data, width, height));
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
    this.logger.debug('Adding QR code:', content.substring(0, 50));
    this.buffer.push(...this.driver.qr(content, options));
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
    this.adapterOptions = { ...this.adapterOptions, ...options };
    this.logger.debug('Adapter options updated:', this.adapterOptions);
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
    this.isPaused = true;
    this.state = PrinterState.PAUSED;
    this.emit('state-change', PrinterState.PAUSED);
    this.logger.info('Print job paused');
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
    if (!this.isPaused || !this.jobBuffer) {
      this.logger.warn('Resume called but job not paused or no job buffer');
      return;
    }

    this.isPaused = false;
    this.state = PrinterState.PRINTING;
    this.emit('state-change', PrinterState.PRINTING);
    this.logger.info('Print job resumed');

    try {
      await this.processJob();
    } catch (error) {
      const printError = new BluetoothPrintError(
        ErrorCode.PRINT_JOB_FAILED,
        'Failed to resume print job',
        error as Error
      );
      this.emit('error', printError);
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
    this.isPaused = false;
    this.jobBuffer = null;
    this.jobOffset = 0;
    this.buffer = [];
    this.state = this.deviceId ? PrinterState.CONNECTED : PrinterState.DISCONNECTED;
    this.emit('state-change', this.state);
    this.logger.info('Print job cancelled');
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
    if (this.jobBuffer) {
      return this.jobBuffer.length - this.jobOffset;
    }
    return this.buffer.reduce((acc, b) => acc + b.length, 0);
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
    if (!this.deviceId) {
      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        'Printer not connected. Call connect() first.'
      );
    }

    if (this.jobBuffer) {
      throw new BluetoothPrintError(
        ErrorCode.PRINT_JOB_IN_PROGRESS,
        'A print job is already in progress. Wait for completion or cancel it.'
      );
    }

    // Combine all buffers
    const totalLength = this.buffer.reduce((acc, b) => acc + b.length, 0);
    this.logger.info(`Starting print job: ${totalLength} bytes`);

    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of this.buffer) {
      combined.set(b, offset);
      offset += b.length;
    }

    this.jobBuffer = combined;
    this.jobOffset = 0;
    this.buffer = []; // Clear queue
    this.isPaused = false;
    this.state = PrinterState.PRINTING; // 设置状态为PRINTING
    this.emit('state-change', this.state);

    try {
      await this.processJob();
      
      // 检查是否是因为暂停而返回
      if (this.isPaused) {
        // 打印任务被暂停，保持PAUSED状态
        this.logger.info('Print job paused');
      } else {
        // 打印任务正常完成
        this.emit('print-complete');
        this.logger.info('Print job completed successfully');
        // 打印完成后，将状态设置回CONNECTED
        this.state = PrinterState.CONNECTED;
        this.emit('state-change', this.state);
      }
    } catch (error) {
      const printError = error instanceof BluetoothPrintError
        ? error
        : new BluetoothPrintError(ErrorCode.PRINT_JOB_FAILED, 'Print job failed', error as Error);
      this.emit('error', printError);
      // 打印失败后，将状态设置回CONNECTED
      this.state = PrinterState.CONNECTED;
      this.emit('state-change', this.state);
      throw printError;
    }
  }

  /**
   * Processes the print job in chunks
   * Supports pause/resume and emits progress events
   */
  private async processJob(): Promise<void> {
    if (!this.jobBuffer || !this.deviceId) return;

    const printerChunkSize = 512;
    const total = this.jobBuffer.length;
    const deviceId = this.deviceId; // 缓存deviceId，避免闭包问题
    const jobBuffer = this.jobBuffer; // 缓存jobBuffer，避免闭包问题

    try {
      while (this.jobOffset < jobBuffer.length) {
        if (this.isPaused) {
          this.logger.debug('Job paused at offset:', this.jobOffset);
          return;
        }

        // 检查设备是否仍然连接
        if (this.state !== PrinterState.CONNECTED && this.state !== PrinterState.PRINTING && this.state !== PrinterState.PAUSED) {
          throw new BluetoothPrintError(
            ErrorCode.DEVICE_DISCONNECTED,
            'Device disconnected during print job'
          );
        }

        const end = Math.min(this.jobOffset + printerChunkSize, jobBuffer.length);
        const chunk = jobBuffer.slice(this.jobOffset, end);

        await this.adapter.write(deviceId, chunk.buffer, this.adapterOptions);

        this.jobOffset = end;

        // Emit progress only if there are listeners, avoid unnecessary computations
        if (this.hasListeners('progress')) {
          this.emit('progress', { sent: this.jobOffset, total });
        }
      }
    } finally {
      // 只有当任务完成时才清理缓冲区
      if (this.jobOffset >= jobBuffer.length) {
        this.jobBuffer = null;
        this.jobOffset = 0;
      }
    }
  }
}
