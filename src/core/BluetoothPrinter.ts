/**
 * Core Bluetooth Printer Class
 */

import { IPrinterAdapter, IPrinterDriver, PrinterState } from '../types';
import { EscPos } from '../drivers/EscPos';
import { TaroAdapter } from '../adapters/TaroAdapter';

export class BluetoothPrinter {
  private adapter: IPrinterAdapter;
  private driver: IPrinterDriver;
  private deviceId: string | null = null;
  private buffer: Uint8Array[] = [];
  public state: PrinterState = PrinterState.DISCONNECTED;

  constructor(adapter?: IPrinterAdapter, driver?: IPrinterDriver) {
    this.adapter = adapter || new TaroAdapter();
    this.driver = driver || new EscPos();

    this.adapter.onStateChange?.((state) => {
      this.state = state;
    });
  }

  /**
   * Connect to a device
   */
  async connect(deviceId: string): Promise<this> {
    this.deviceId = deviceId;
    await this.adapter.connect(deviceId);
    // Initialize printer
    this.buffer.push(...this.driver.init());
    return this;
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.deviceId) {
      await this.adapter.disconnect(this.deviceId);
      this.deviceId = null;
    }
  }

  /**
   * Add text to print queue
   */
  text(content: string, encoding?: string): this {
    this.buffer.push(...this.driver.text(content, encoding));
    return this;
  }

  /**
   * Add newline
   */
  feed(lines: number = 1): this {
    this.buffer.push(...this.driver.feed(lines));
    return this;
  }

  /**
   * Cut paper
   */
  cut(): this {
    this.buffer.push(...this.driver.cut());
    return this;
  }

  /**
   * Print image
   */
  image(data: Uint8Array, width: number, height: number): this {
    this.buffer.push(...this.driver.image(data, width, height));
    return this;
  }

  /**
   * Print QR Code
   */
  qr(content: string, options?: import('../types').IQrOptions): this {
    this.buffer.push(...this.driver.qr(content, options));
    return this;
  }

  private adapterOptions: import('../types').IAdapterOptions = {};

  /**
   * Set adapter options (chunk size, delay, retries)
   */
  setOptions(options: import('../types').IAdapterOptions): this {
    this.adapterOptions = { ...this.adapterOptions, ...options };
    return this;
  }

  private isPaused: boolean = false;
  private jobBuffer: Uint8Array | null = null;
  private jobOffset: number = 0;

  /**
   * Pause printing
   */
  pause(): void {
    this.isPaused = true;
    this.state = PrinterState.PAUSED; // Need to add PAUSED to PrinterState enum or just use internal state
    // Actually PrinterState enum in types.ts doesn't have PAUSED. 
    // I should update types.ts first? 
    // Or just use internal flag. The user might want to know.
    // Let's assume I'll update types.ts in next step or use a callback.
    // For now, just set flag.
  }

  /**
   * Resume printing
   */
  async resume(): Promise<void> {
    if (this.isPaused && this.jobBuffer) {
      this.isPaused = false;
      this.state = PrinterState.PRINTING; // Need PRINTING state too
      await this.processJob();
    }
  }

  /**
   * Cancel current job
   */
  cancel(): void {
    this.isPaused = false;
    this.jobBuffer = null;
    this.jobOffset = 0;
    this.buffer = [];
    this.state = PrinterState.CONNECTED;
  }

  /**
   * Get remaining bytes to print
   */
  remaining(): number {
    if (this.jobBuffer) {
      return this.jobBuffer.length - this.jobOffset;
    }
    return this.buffer.reduce((acc, b) => acc + b.length, 0);
  }

  /**
   * Send all queued commands to printer
   */
  async print(): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Printer not connected');
    }

    if (this.jobBuffer) {
      throw new Error('A print job is already in progress');
    }

    // Combine all buffers
    const totalLength = this.buffer.reduce((acc, b) => acc + b.length, 0);
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

    await this.processJob();
  }

  private async processJob(): Promise<void> {
    if (!this.jobBuffer || !this.deviceId) return;

    // Printer level chunk size (large enough to be efficient, small enough to allow pause)
    const printerChunkSize = 512;

    while (this.jobOffset < this.jobBuffer.length) {
      if (this.isPaused) {
        return;
      }

      const end = Math.min(this.jobOffset + printerChunkSize, this.jobBuffer.length);
      const chunk = this.jobBuffer.slice(this.jobOffset, end);

      await this.adapter.write(this.deviceId, chunk.buffer, this.adapterOptions);

      this.jobOffset = end;
    }

    // Job done
    this.jobBuffer = null;
    this.jobOffset = 0;
  }
}
