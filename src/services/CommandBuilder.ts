/**
 * Command Builder Service
 *
 * Builds print commands using the printer driver
 */

import type { IPrinterDriver, IQrOptions } from '@/types';
import { ICommandBuilder } from '@/services/interfaces';
import { Logger } from '@/utils/logger';
import { EscPos } from '@/drivers/EscPos';
import { TextFormatter, TextAlign, TextStyle } from '@/formatter';
import { BarcodeGenerator, BarcodeOptions } from '@/barcode';

/**
 * Command Builder implementation
 */
export class CommandBuilder implements ICommandBuilder {
  private driver: IPrinterDriver;
  private buffer: Uint8Array[] = [];
  private readonly logger = Logger.scope('CommandBuilder');
  private readonly formatter: TextFormatter;
  private readonly barcodeGenerator: BarcodeGenerator;

  /**
   * Creates a new CommandBuilder instance
   *
   * @param driver - Printer driver instance
   */
  constructor(driver?: IPrinterDriver) {
    this.driver = driver || new EscPos();
    this.formatter = new TextFormatter();
    this.barcodeGenerator = new BarcodeGenerator();

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
   * Sets text alignment
   *
   * @param alignment - Text alignment (left, center, right)
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.align(TextAlign.CENTER).text('Centered Text');
   * ```
   */
  align(alignment: TextAlign): this {
    this.logger.debug('Setting alignment:', alignment);
    this.buffer.push(...this.formatter.align(alignment));
    return this;
  }

  /**
   * Sets character size (width and height scale)
   *
   * @param width - Width scale factor (1-8)
   * @param height - Height scale factor (1-8)
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.setSize(2, 2).text('Double Size');
   * ```
   */
  setSize(width: number, height: number): this {
    this.logger.debug(`Setting size: ${width}x${height}`);
    this.buffer.push(...this.formatter.setSize(width, height));
    return this;
  }

  /**
   * Sets bold text mode
   *
   * @param enabled - Enable or disable bold
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.setBold(true).text('Bold Text').setBold(false);
   * ```
   */
  setBold(enabled: boolean): this {
    this.logger.debug('Setting bold:', enabled);
    this.buffer.push(...this.formatter.setBold(enabled));
    return this;
  }

  /**
   * Sets underline text mode
   *
   * @param enabled - Enable or disable underline
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.setUnderline(true).text('Underlined').setUnderline(false);
   * ```
   */
  setUnderline(enabled: boolean): this {
    this.logger.debug('Setting underline:', enabled);
    this.buffer.push(...this.formatter.setUnderline(enabled));
    return this;
  }

  /**
   * Sets inverse printing mode (white on black)
   *
   * @param enabled - Enable or disable inverse
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.setInverse(true).text('Inverse Text').setInverse(false);
   * ```
   */
  setInverse(enabled: boolean): this {
    this.logger.debug('Setting inverse:', enabled);
    this.buffer.push(...this.formatter.setInverse(enabled));
    return this;
  }

  /**
   * Sets multiple text style properties at once
   *
   * @param style - Text style configuration
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.setStyle({ align: TextAlign.CENTER, bold: true, heightScale: 2 });
   * ```
   */
  setStyle(style: TextStyle): this {
    this.logger.debug('Setting style:', style);
    this.buffer.push(...this.formatter.setStyle(style));
    return this;
  }

  /**
   * Resets all text formatting to default
   *
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.resetStyle().text('Normal Text');
   * ```
   */
  resetStyle(): this {
    this.logger.debug('Resetting style');
    this.buffer.push(...this.formatter.resetStyle());
    return this;
  }

  /**
   * Adds a 1D barcode to the print queue
   *
   * @param content - Barcode content/data
   * @param options - Barcode options (format, height, width, showText, textPosition)
   * @returns this - For method chaining
   *
   * @example
   * ```typescript
   * builder.barcode('1234567890128', {
   *   format: BarcodeFormat.EAN13,
   *   height: 80,
   *   showText: true
   * });
   * ```
   */
  barcode(content: string, options: BarcodeOptions): this {
    this.logger.debug(`Adding barcode: ${content} (${options.format})`);
    const commands = this.barcodeGenerator.generate(content, options);
    if (commands.length > 0) {
      this.buffer.push(...commands);
    } else {
      this.logger.warn(`Failed to generate barcode for content: ${content}`);
    }
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
