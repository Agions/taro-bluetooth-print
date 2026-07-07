/**
 * Command Builder Service
 *
 * Builds print commands using the printer driver. All mutating methods push
 * pre-built Uint8Array chunks into an internal buffer; {@link getBuffer} then
 * concatenates the chunks on demand (with a memoized cache).
 */

import type { IPrinterDriver, IQrOptions } from '@/types';
import { ICommandBuilder } from '@/services/interfaces';
import { Logger } from '@/utils/logger';
import { EscPos } from '@/drivers/EscPosDriver';
import { TextFormatter, TextAlign, TextStyle } from '@/formatter';
import { BarcodeGenerator, BarcodeOptions } from '@/barcode';

/**
 * Command Builder implementation
 */
export class CommandBuilder implements ICommandBuilder {
  private readonly driver: IPrinterDriver;
  private readonly formatter: TextFormatter;
  private readonly barcodeGenerator: BarcodeGenerator;
  private readonly logger = Logger.scope('CommandBuilder');

  private buffer: Uint8Array[] = [];
  private cachedBuffer: Uint8Array | null = null;

  constructor(driver?: IPrinterDriver) {
    this.driver = driver ?? new EscPos();
    this.formatter = new TextFormatter();
    this.barcodeGenerator = new BarcodeGenerator();
    this.buffer.push(...this.driver.init());
  }

  /**
   * Push pre-built command chunks and invalidate the concat cache.
   * Centralizes what was previously duplicated in every mutating method.
   */
  private pushCommands(chunks: Uint8Array[]): void {
    if (chunks.length > 0) {
      this.buffer.push(...chunks);
      this.cachedBuffer = null;
    }
  }

  text(content: string, encoding?: string): this {
    this.logger.debug('Adding text:', content.substring(0, 50));
    this.pushCommands(this.driver.text(content, encoding));
    return this;
  }

  feed(lines = 1): this {
    this.logger.debug('Adding feed:', lines);
    this.pushCommands(this.driver.feed(lines));
    return this;
  }

  cut(): this {
    this.logger.debug('Adding cut command');
    this.pushCommands(this.driver.cut());
    return this;
  }

  image(data: Uint8Array, width: number, height: number): this {
    this.logger.debug(`Adding image: ${width}x${height}`);
    this.pushCommands(this.driver.image(data, width, height));
    return this;
  }

  qr(content: string, options?: IQrOptions): this {
    this.logger.debug('Adding QR code:', content.substring(0, 50));
    this.pushCommands(this.driver.qr(content, options));
    return this;
  }

  /**
   * Clears the print queue and re-initializes the printer.
   */
  clear(): this {
    this.buffer = [];
    this.pushCommands(this.driver.init());
    return this;
  }

  align(alignment: TextAlign): this {
    this.logger.debug('Setting alignment:', alignment);
    this.pushCommands(this.formatter.align(alignment));
    return this;
  }

  setSize(width: number, height: number): this {
    this.logger.debug(`Setting size: ${width}x${height}`);
    this.pushCommands(this.formatter.setSize(width, height));
    return this;
  }

  setBold(enabled: boolean): this {
    this.logger.debug('Setting bold:', enabled);
    this.pushCommands(this.formatter.setBold(enabled));
    return this;
  }

  setUnderline(enabled: boolean): this {
    this.logger.debug('Setting underline:', enabled);
    this.pushCommands(this.formatter.setUnderline(enabled));
    return this;
  }

  setInverse(enabled: boolean): this {
    this.logger.debug('Setting inverse:', enabled);
    this.pushCommands(this.formatter.setInverse(enabled));
    return this;
  }

  setStyle(style: TextStyle): this {
    this.logger.debug('Setting style:', style);
    this.pushCommands(this.formatter.setStyle(style));
    return this;
  }

  resetStyle(): this {
    this.logger.debug('Resetting style');
    this.pushCommands(this.formatter.resetStyle());
    return this;
  }

  barcode(content: string, options: BarcodeOptions): this {
    this.logger.debug(`Adding barcode: ${content} (${options.format})`);
    const commands = this.barcodeGenerator.generate(content, options);
    if (commands.length > 0) {
      this.pushCommands(commands);
    } else {
      this.logger.warn(`Failed to generate barcode for content: ${content}`);
    }
    return this;
  }

  getBuffer(): Uint8Array {
    if (this.cachedBuffer) {
      return this.cachedBuffer;
    }

    const totalLength = this.buffer.reduce((acc, b) => acc + b.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of this.buffer) {
      combined.set(b, offset);
      offset += b.length;
    }
    this.cachedBuffer = combined;
    return combined;
  }

  getTotalBytes(): number {
    return this.buffer.reduce((acc, b) => acc + b.length, 0);
  }
}
