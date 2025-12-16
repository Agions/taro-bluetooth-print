/**
 * Command Builder Service
 *
 * Builds print commands using the printer driver
 */

import type { IPrinterDriver, IQrOptions } from '@/types';
import { ICommandBuilder } from '@/services/interfaces';
import { Logger } from '@/utils/logger';
import { EscPos } from '@/drivers/EscPos';

/**
 * Command Builder implementation
 */
export class CommandBuilder implements ICommandBuilder {
  private driver: IPrinterDriver;
  private buffer: Uint8Array[] = [];
  private readonly logger = Logger.scope('CommandBuilder');

  /**
   * Creates a new CommandBuilder instance
   *
   * @param driver - Printer driver instance
   */
  constructor(driver?: IPrinterDriver) {
    this.driver = driver || new EscPos();

    // Initialize printer with ESC/POS init command
    this.buffer.push(...this.driver.init());
  }

  /**
   * Adds text to the print queue
   *
   * @param content - Text content
   * @param encoding - Text encoding
   * @returns this - For method chaining
   */
  text(content: string, encoding?: string): this {
    this.logger.debug('Adding text:', content.substring(0, 50));
    this.buffer.push(...this.driver.text(content, encoding));
    return this;
  }

  /**
   * Adds line feeds to the print queue
   *
   * @param lines - Number of lines to feed
   * @returns this - For method chaining
   */
  feed(lines = 1): this {
    this.logger.debug('Adding feed:', lines);
    this.buffer.push(...this.driver.feed(lines));
    return this;
  }

  /**
   * Adds a paper cut command to the print queue
   *
   * @returns this - For method chaining
   */
  cut(): this {
    this.logger.debug('Adding cut command');
    this.buffer.push(...this.driver.cut());
    return this;
  }

  /**
   * Adds an image to the print queue
   *
   * @param data - Image data as Uint8Array
   * @param width - Image width
   * @param height - Image height
   * @returns this - For method chaining
   */
  image(data: Uint8Array, width: number, height: number): this {
    this.logger.debug(`Adding image: ${width}x${height}`);
    this.buffer.push(...this.driver.image(data, width, height));
    return this;
  }

  /**
   * Adds a QR code to the print queue
   *
   * @param content - QR code content
   * @param options - QR code options
   * @returns this - For method chaining
   */
  qr(content: string, options?: IQrOptions): this {
    this.logger.debug('Adding QR code:', content.substring(0, 50));
    this.buffer.push(...this.driver.qr(content, options));
    return this;
  }

  /**
   * Clears the print queue
   *
   * @returns this - For method chaining
   */
  clear(): this {
    this.logger.debug('Clearing buffer');
    this.buffer = [];
    // Re-initialize printer
    this.buffer.push(...this.driver.init());
    return this;
  }

  /**
   * Gets the current buffer
   *
   * @returns Uint8Array - Current print buffer
   */
  getBuffer(): Uint8Array {
    // Combine all buffers
    const totalLength = this.buffer.reduce((acc, b) => acc + b.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of this.buffer) {
      combined.set(b, offset);
      offset += b.length;
    }
    return combined;
  }

  /**
   * Gets the total number of bytes in the buffer
   *
   * @returns number - Total bytes
   */
  getTotalBytes(): number {
    return this.buffer.reduce((acc, b) => acc + b.length, 0);
  }
}
