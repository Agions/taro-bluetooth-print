/**
 * ESC/POS Driver Implementation
 * Converts high-level print commands to ESC/POS byte sequences
 */

import { IPrinterDriver, IQrOptions } from '../types';
import { Encoding } from '../utils/encoding';
import { ImageProcessing } from '../utils/image';
import { Logger } from '../utils/logger';

/**
 * ESC/POS thermal printer driver
 *
 * Implements the standard ESC/POS command set used by most thermal receipt printers.
 * Supports text, images, QR codes, and paper control commands.
 *
 * @example
 * ```typescript
 * const driver = new EscPos();
 * const commands = [
 *   ...driver.init(),
 *   ...driver.text('Hello World!'),
 *   ...driver.feed(2),
 *   ...driver.cut()
 * ];
 * ```
 */
export class EscPos implements IPrinterDriver {
  private readonly logger = Logger.scope('EscPos');

  /**
   * Initializes the printer
   * Sends ESC @ command to reset printer to default state
   *
   * @returns Array of command buffers
   */
  init(): Uint8Array[] {
    this.logger.debug('Generating init command');
    return [new Uint8Array([0x1b, 0x40])]; // ESC @
  }

  /**
   * Generates text print command
   *
   * @param content - Text content to print
   * @param encoding - Text encoding (default: 'GBK')
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.text('你好世界', 'GBK');
   * ```
   */
  text(content: string, encoding = 'GBK'): Uint8Array[] {
    this.logger.debug(`Generating text command: "${content.substring(0, 30)}..." (${encoding})`);
    const encoded = Encoding.encode(content, encoding);
    return [encoded];
  }

  /**
   * Generates line feed command
   *
   * @param lines - Number of lines to feed (default: 1)
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.feed(3); // Feed 3 lines
   * ```
   */
  feed(lines = 1): Uint8Array[] {
    this.logger.debug(`Generating feed command: ${lines} lines`);
    return [new Uint8Array([0x1b, 0x64, lines])]; // ESC d n
  }

  /**
   * Generates paper cut command
   *
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.cut();
   * ```
   */
  cut(): Uint8Array[] {
    this.logger.debug('Generating cut command');
    return [new Uint8Array([0x1d, 0x56, 0x00])]; // GS V 0
  }

  /**
   * Generates image print command
   * Uses Floyd-Steinberg dithering for better quality
   *
   * @param data - RGBA pixel data
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * const imageData = new Uint8Array(width * height * 4); // RGBA
   * driver.image(imageData, 200, 100);
   * ```
   */
  image(data: Uint8Array, width: number, height: number): Uint8Array[] {
    this.logger.debug(`Generating image command: ${width}x${height}`);

    const bitmap = ImageProcessing.toBitmap(data, width, height);
    const xL = Math.ceil(width / 8) % 256;
    const xH = Math.floor(Math.ceil(width / 8) / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);

    // GS v 0 m xL xH yL yH d1...dk
    const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    this.logger.debug(
      `Image header: mode=0, width_bytes=${xL + xH * 256}, height=${yL + yH * 256}`
    );

    return [header, bitmap];
  }

  /**
   * Generates QR code print command
   *
   * @param content - QR code content (URL, text, etc.)
   * @param options - QR code options
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.qr('https://example.com', {
   *   model: 2,
   *   size: 8,
   *   errorCorrection: 'M'
   * });
   * ```
   */
  qr(content: string, options?: IQrOptions): Uint8Array[] {
    const model = options?.model ?? 2;
    const size = options?.size ?? 6;
    const errorCorrection = options?.errorCorrection ?? 'M';

    this.logger.debug(`Generating QR code: model=${model}, size=${size}, ec=${errorCorrection}`);

    const commands: Uint8Array[] = [];

    // 1. Set Model (Function 165)
    // GS ( k 04 00 31 41 n1 n2
    // n1: 49 (Model 1), 50 (Model 2)
    // n2: 0
    commands.push(
      new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, model === 1 ? 49 : 50, 0])
    );

    // 2. Set Module Size (Function 167)
    // GS ( k 03 00 31 43 n (n = 1-16)
    commands.push(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]));

    // 3. Set Error Correction (Function 169)
    // GS ( k 03 00 31 45 n
    // n: 48 (L=7%), 49 (M=15%), 50 (Q=25%), 51 (H=30%)
    const ecMap: Record<string, number> = { L: 48, M: 49, Q: 50, H: 51 };
    const ecValue = ecMap[errorCorrection] ?? 49; // Default to M (15%)
    commands.push(
      new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecValue])
    );

    // 4. Store Data (Function 180)
    // GS ( k pL pH 31 50 30 d1...dk
    // pL, pH: length of data + 3
    const data = Encoding.encode(content, 'GBK');
    const len = data.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    commands.push(new Uint8Array([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]));
    commands.push(data);

    // 5. Print Symbol (Function 181)
    // GS ( k 03 00 31 51 30
    commands.push(new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));

    this.logger.debug(`QR code commands generated: ${commands.length} buffers`);
    return commands;
  }
}
