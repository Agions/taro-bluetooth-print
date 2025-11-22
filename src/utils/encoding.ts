/**
 * Text encoding utilities
 * Handles conversion between strings and byte arrays with various encodings
 */

import { Logger } from './logger';

const logger = Logger.scope('Encoding');

/**
 * Text encoding utility class
 *
 * Provides encoding services for converting strings to byte arrays.
 * Currently supports UTF-8 natively, with a TODO for full GBK support.
 *
 * @example
 * ```typescript
 * const bytes = Encoding.encode('Hello World', 'UTF-8');
 * const gbkBytes = Encoding.encode('你好世界', 'GBK');
 * ```
 */
export class Encoding {
  private static utf8Encoder = new TextEncoder();

  /**
   * Encodes a string to a Uint8Array using the specified encoding
   *
   * @param text - Text to encode
   * @param encoding - Target encoding (default: 'GBK')
   * @returns Encoded bytes
   *
   * @remarks
   * Note: Native TextEncoder only supports UTF-8.
   * For GBK encoding, a third-party library or polyfill is recommended.
   * Currently falls back to UTF-8 with a warning.
   *
   * @example
   * ```typescript
   * // UTF-8 encoding
   * const utf8 = Encoding.encode('Hello', 'UTF-8');
   *
   * // GBK encoding (currently falls back to UTF-8)
   * const gbk = Encoding.encode('你好', 'GBK');
   * ```
   */
  static encode(text: string, encoding = 'GBK'): Uint8Array {
    const normalizedEncoding = encoding.toUpperCase().replace('-', '');

    switch (normalizedEncoding) {
      case 'UTF8':
      case 'UTF-8':
        logger.debug(`Encoding text with UTF-8: "${text.substring(0, 30)}..."`);
        return this.utf8Encoder.encode(text);

      case 'GBK':
      case 'GB2312':
        // TODO: Implement actual GBK encoding
        // Options:
        // 1. Use a library like 'iconv-lite' or 'text-encoding'
        // 2. Implement a GBK lookup table
        // 3. Use a Web API polyfill
        logger.warn(
          `GBK encoding not yet implemented, falling back to UTF-8. ` +
            `This may cause display issues with some printers.`
        );
        return this.utf8Encoder.encode(text);

      default:
        logger.warn(`Unsupported encoding: ${encoding}, falling back to UTF-8`);
        return this.utf8Encoder.encode(text);
    }
  }

  /**
   * Checks if an encoding is supported
   *
   * @param encoding - Encoding name to check
   * @returns True if supported, false otherwise
   *
   * @example
   * ```typescript
   * if (Encoding.isSupported('GBK')) {
   *   console.log('GBK is supported');
   * }
   * ```
   */
  static isSupported(encoding: string): boolean {
    const normalizedEncoding = encoding.toUpperCase().replace('-', '');
    // Currently only UTF-8 is fully supported
    return normalizedEncoding === 'UTF8' || normalizedEncoding === 'UTF-8';
  }
}
