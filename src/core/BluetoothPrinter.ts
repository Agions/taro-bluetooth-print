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
   * Send all queued commands to printer
   */
  async print(): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Printer not connected');
    }

    // Combine all buffers
    const totalLength = this.buffer.reduce((acc, b) => acc + b.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of this.buffer) {
      combined.set(b, offset);
      offset += b.length;
    }

    await this.adapter.write(this.deviceId, combined.buffer);

    // Clear buffer after printing
    this.buffer = [];
  }
}
