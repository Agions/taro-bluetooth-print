/**
 * Core Bluetooth Printer Class
 * Main entry point for interacting with Bluetooth thermal printers.
 *
 * The class accepts dependencies via constructor injection; legacy "adapter as first
 * arg" detection has been removed in v3.0.0 — use {@link createBluetoothPrinter} from
 * the factory module to construct instances with auto-detected adapters.
 */

import { IAdapterOptions, IQrOptions, PrinterState } from '@/types';
import { EventEmitter } from './EventEmitter';
import type { IPrinterAdapter } from '@/types';
import { Logger } from '@/utils/logger';
import { normalizeError } from '@/utils/normalizeError';
import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';
import { ConnectionManager } from '@/services/ConnectionManager';
import { PrintJobManager } from '@/services/PrintJobManager';
import { CommandBuilder } from '@/services/CommandBuilder';
import type { IConnectionManager } from '@/services/interfaces';
import type { IPrintJobManager } from '@/services/interfaces';
import type { ICommandBuilder } from '@/services/interfaces';
import type { TextAlign } from '@/formatter';
import type { BarcodeFormat } from '@/barcode';

/** Printer event map. */
export interface PrinterEvents {
  'state-change': PrinterState;
  progress: { sent: number; total: number };
  error: BluetoothPrintError;
  connected: string;
  disconnected: string;
  'print-complete': void;
}

/** Bluetooth Thermal Printer Controller. */
export class BluetoothPrinter extends EventEmitter<PrinterEvents> {
  private readonly printerLogger = Logger.scope('BluetoothPrinter');

  public state: PrinterState = PrinterState.DISCONNECTED;

  private readonly connectionManager: IConnectionManager;
  private readonly printJobManager: IPrintJobManager;
  private readonly commandBuilder: ICommandBuilder;

  /**
   * @param connectionManagerOrAdapter - Either an `IConnectionManager` (preferred)
   *   or a legacy `IPrinterAdapter` (will be wrapped in a default ConnectionManager).
   *   Passing nothing auto-creates a platform-default ConnectionManager.
   * @param printJobManager - Print job manager instance
   * @param commandBuilder - Command builder instance
   *
   * @example
   * ```typescript
   * import { createBluetoothPrinter } from 'taro-bluetooth-print';
   * const printer = createBluetoothPrinter({ adapter: myAdapter });
   * ```
   */
  constructor(
    connectionManagerOrAdapter?: IConnectionManager | IPrinterAdapter,
    printJobManager?: IPrintJobManager,
    commandBuilder?: ICommandBuilder
  ) {
    super();
    this.connectionManager = this.resolveConnectionManager(connectionManagerOrAdapter);
    this.printJobManager = printJobManager ?? new PrintJobManager(this.connectionManager);
    this.commandBuilder = commandBuilder ?? new CommandBuilder();
    this.updateState();
  }

  /**
   * Resolve the first constructor argument to an IConnectionManager. An adapter
   * (anything implementing `connect`/`disconnect`/`write`) gets auto-wrapped for
   * backward compatibility; missing/undefined falls back to a default manager.
   *
   * Disambiguation: `IConnectionManager` exposes `getState()` (manager-only
   * method on the interface). Adapters only have `connect`/`disconnect`/`write`.
   * Using `getState` as the discriminator correctly identifies a pre-built
   * manager vs. a raw adapter — using `connect` (which both have) silently
   * re-wrapped managers and broke isConnected() (v2.15.3 fix).
   */
  private resolveConnectionManager(
    arg: IConnectionManager | IPrinterAdapter | undefined
  ): IConnectionManager {
    if (!arg) {
      return new ConnectionManager();
    }
    // Managers expose `getState`; adapters do not. Disambiguate by method presence.
    if (typeof (arg as IConnectionManager).getState === 'function') {
      return arg as IConnectionManager;
    }
    return new ConnectionManager(arg as IPrinterAdapter);
  }

  /**
   * Unified error handler: normalize → emit → update state.
   * Avoids repeating the same try/catch boilerplate at every callsite.
   */
  private handleError(
    error: unknown,
    code: ErrorCode,
    fallbackMessage: string
  ): BluetoothPrintError {
    const printError =
      error instanceof BluetoothPrintError
        ? error
        : new BluetoothPrintError(code, fallbackMessage, normalizeError(error));
    this.emit('error', printError);
    this.updateState();
    return printError;
  }

  /**
   * Recomputes `state` from connection + job manager state and emits 'state-change'.
   */
  private updateState(): void {
    if (this.printJobManager.isPaused()) {
      this.state = PrinterState.PAUSED;
    } else if (this.printJobManager.isInProgress()) {
      this.state = PrinterState.PRINTING;
    } else {
      this.state = this.connectionManager.getState();
    }
    this.emit('state-change', this.state);
    this.printerLogger.debug('State updated:', this.state);
  }

  /**
   * Connects to a Bluetooth device.
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
      throw this.handleError(error, ErrorCode.CONNECTION_FAILED, 'Connection failed');
    }
  }

  /**
   * Disconnects from the current device.
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
      throw this.handleError(error, ErrorCode.DEVICE_DISCONNECTED, 'Disconnect failed');
    }
  }

  // ============================================
  // Command builders — pure delegation, all return `this`
  // ============================================

  text(content: string, encoding?: string): this {
    this.commandBuilder.text(content, encoding);
    return this;
  }

  feed(lines = 1): this {
    this.commandBuilder.feed(lines);
    return this;
  }

  cut(): this {
    this.commandBuilder.cut();
    return this;
  }

  image(data: Uint8Array, width: number, height: number): this {
    this.commandBuilder.image(data, width, height);
    return this;
  }

  qr(content: string, options?: IQrOptions): this {
    this.commandBuilder.qr(content, options);
    return this;
  }

  align(alignment: TextAlign): this {
    this.commandBuilder.align(alignment);
    return this;
  }

  setSize(width: number, height: number): this {
    this.commandBuilder.setSize(width, height);
    return this;
  }

  setBold(enabled: boolean): this {
    this.commandBuilder.setBold(enabled);
    return this;
  }

  setUnderline(enabled: boolean): this {
    this.commandBuilder.setUnderline(enabled);
    return this;
  }

  resetStyle(): this {
    this.commandBuilder.resetStyle();
    return this;
  }

  barcode(
    content: string,
    format: BarcodeFormat,
    options?: { height?: number; width?: number; showText?: boolean }
  ): this {
    this.commandBuilder.barcode(content, { format, ...options });
    return this;
  }

  setOptions(options: IAdapterOptions): this {
    this.printJobManager.setOptions(options);
    return this;
  }

  /**
   * Write a pre-built byte buffer directly to the connected printer,
   * bypassing the CommandBuilder entirely. Use this when a driver (such as
   * TsplDriver, ZplDriver, StarPrinter, CPCL or any custom protocol) emits
   * its own byte stream and you want the same connection / chunking /
   * progress / pause pipeline as the standard print() path.
   *
   * Unlike print() — which calls commandBuilder.getBuffer() then clears it —
   * writeRaw() does NOT touch the command queue. It is safe to call between
   * text() / qr() / cut() calls; those calls continue to accumulate in the
   * command buffer for the next print() invocation.
   *
   * @param buffer  Bytes to send (e.g. `tsplDriver.getBuffer()`)
   * @param options Optional adapter overrides (chunkSize, delay, retries).
   *                Forwarded to PrintJobManager.setOptions() before start.
   * @throws BluetoothPrintError(CONNECTION_FAILED) if not connected
   * @throws BluetoothPrintError(PRINT_JOB_FAILED) on adapter write failure
   *
   * @example
   * ```ts
   * // TSPL label printing — full end-to-end flow now works.
   * const tspl = new TsplDriver()
   *   .size(60, 40)
   *   .gap(3)
   *   .clear()
   *   .text('Hello', { x: 20, y: 20, font: 3 })
   *   .print(1, 1);
   * await printer.writeRaw(tspl.getBuffer());
   * ```
   */
  async writeRaw(buffer: Uint8Array, options?: IAdapterOptions): Promise<void> {
    if (!this.connectionManager.isConnected()) {
      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        'Printer not connected. Call connect() first.'
      );
    }

    this.printerLogger.info(`writeRaw: ${buffer.length} bytes`);
    if (options) this.printJobManager.setOptions(options);

    this.updateState();
    this.printJobManager.setProgressCallback((sent, total) => {
      this.emit('progress', { sent, total });
    });

    try {
      await this.printJobManager.start(buffer);
      if (!this.printJobManager.isPaused()) this.emit('print-complete');
    } catch (error) {
      throw this.handleError(error, ErrorCode.PRINT_JOB_FAILED, 'writeRaw failed');
    } finally {
      this.updateState();
    }
  }

  /**
   * Pauses the current print job.
   */
  pause(): void {
    this.printJobManager.pause();
    this.updateState();
    this.printerLogger.info('Print job paused');
  }

  /**
   * Resumes a paused print job.
   */
  async resume(): Promise<void> {
    this.printerLogger.info('Resuming print job');
    try {
      await this.printJobManager.resume();
      this.updateState();
      this.printerLogger.info('Print job resumed');
    } catch (error) {
      throw this.handleError(error, ErrorCode.PRINT_JOB_FAILED, 'Failed to resume print job');
    }
  }

  /**
   * Cancels the current print job and clears the command queue.
   */
  cancel(): void {
    this.printJobManager.cancel();
    this.commandBuilder.clear();
    this.updateState();
    this.printerLogger.info('Print job cancelled');
  }

  /**
   * Remaining bytes in the active print job.
   */
  remaining(): number {
    return this.printJobManager.remaining();
  }

  /**
   * Sends all queued commands to the printer.
   */
  async print(): Promise<void> {
    if (!this.connectionManager.isConnected()) {
      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        'Printer not connected. Call connect() first.'
      );
    }

    const buffer = this.commandBuilder.getBuffer();
    this.printerLogger.info(`Starting print job: ${buffer.length} bytes`);

    this.commandBuilder.clear();
    this.updateState();
    this.printJobManager.setProgressCallback((sent, total) => {
      this.emit('progress', { sent, total });
    });

    try {
      await this.printJobManager.start(buffer);
      if (this.printJobManager.isPaused()) {
        this.printerLogger.info('Print job paused');
      } else {
        this.emit('print-complete');
        this.printerLogger.info('Print job completed successfully');
      }
    } catch (error) {
      this.printerLogger.error('Print job failed with error:', error);
      throw this.handleError(error, ErrorCode.PRINT_JOB_FAILED, 'Print job failed');
    } finally {
      this.updateState();
    }
  }

  /** Exposes the underlying connection manager. */
  getConnectionManager(): IConnectionManager {
    return this.connectionManager;
  }

  /** Exposes the underlying command builder. */
  getCommandBuilder(): ICommandBuilder {
    return this.commandBuilder;
  }

  /**
   * Cleanup resources and destroy the printer instance.
   */
  destroy(): void {
    this.printerLogger.info('Destroying BluetoothPrinter instance');
    this.printJobManager.cancel();
    this.commandBuilder.clear();
    if (this.connectionManager.isConnected()) {
      this.connectionManager.disconnect().catch(error => {
        this.printerLogger.warn('Error during disconnect in destroy:', error);
      });
    }
    this.connectionManager.destroy();
    this.removeAllListeners();
    this.printerLogger.info('BluetoothPrinter instance destroyed');
  }
}
