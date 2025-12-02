/**
 * Text encoding utilities
 * Handles conversion between strings and byte arrays with various encodings
 */

import { Logger } from './logger';

const logger = Logger.scope('Encoding');

/**
 * Encoding configuration options
 */
export interface EncodingConfig {
  /** Whether to show warnings for unsupported encodings */
  showWarnings?: boolean;
}

/**
 * Text encoding utility class
 *
 * Provides encoding services for converting strings to byte arrays.
 * Currently supports UTF-8 natively, with a TODO for full GBK support.
 *
 * @example
 * ```typescript
 * // Configure encoding to disable warnings
 * Encoding.configure({ showWarnings: false });
 *
 * const bytes = Encoding.encode('Hello World', 'UTF-8');
 * const gbkBytes = Encoding.encode('你好世界', 'GBK');
 * ```
 */
export class Encoding {
  private static utf8Encoder = new TextEncoder();
  private static warningShown = false;
  private static config: EncodingConfig = {
    showWarnings: true
  };

  /**
   * Configures the encoding utility
   *
   * @param config - Configuration options
   *
   * @example
   * ```typescript
   * Encoding.configure({
   *   showWarnings: false
   * });
   * ```
   */
  static configure(config: Partial<EncodingConfig>): void {
    this.config = { ...this.config, ...config };
  }

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
   * Currently falls back to UTF-8 with a warning (configurable).
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
    if (!text || typeof text !== 'string') {
      return new Uint8Array(0);
    }

    const normalizedEncoding = encoding.toUpperCase().replace('-', '');

    // UTF-8 encoding is fully supported
    if (normalizedEncoding === 'UTF8' || normalizedEncoding === 'UTF-8') {
      return this.utf8Encoder.encode(text);
    }

    // For other encodings, show warning only once if enabled
    if (this.config.showWarnings && !this.warningShown) {
      logger.warn(
        `Encoding ${encoding} not yet fully implemented, falling back to UTF-8. ` +
        `This may cause display issues with some printers.`
      );
      this.warningShown = true;
    }

    return this.utf8Encoder.encode(text);
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
    if (!encoding || typeof encoding !== 'string') {
      return false;
    }
    const normalizedEncoding = encoding.toUpperCase().replace('-', '');
    // Currently only UTF-8 is fully supported
    return normalizedEncoding === 'UTF8' || normalizedEncoding === 'UTF-8';
  }
}
