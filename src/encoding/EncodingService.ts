/**
 * Encoding Service
 *
 * Provides comprehensive encoding support for GBK, GB2312, Big5, and UTF-8.
 * Handles character conversion for thermal printer output.
 *
 * @example
 * ```typescript
 * const service = new EncodingService();
 * const bytes = service.encode('你好世界', 'GBK');
 * const detected = service.detectEncoding('Hello 世界');
 * ```
 */

import { Logger } from '@/utils/logger';
import {
  unicodeToGbk,
  unicodeToBig5,
  getGbkBytes,
  getBig5Bytes,
  isAscii,
  isCjk,
  isChinesePunctuation,
} from './gbk-table';

/**
 * Supported encoding types
 */
export type SupportedEncoding = 'GBK' | 'GB2312' | 'BIG5' | 'UTF-8' | 'UTF8';

/**
 * Encoding configuration options
 */
export interface EncodingConfig {
  /** Default encoding to use */
  defaultEncoding: SupportedEncoding;
  /** Character to use when a character cannot be encoded */
  fallbackChar: string;
  /** Whether to show warnings for unsupported characters */
  showWarnings: boolean;
}

/**
 * Encoding result with metadata
 */
export interface EncodingResult {
  /** Encoded bytes */
  bytes: Uint8Array;
  /** Number of characters that couldn't be encoded */
  unsupportedCount: number;
  /** List of unsupported characters (if any) */
  unsupportedChars: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EncodingConfig = {
  defaultEncoding: 'GBK',
  fallbackChar: '?',
  showWarnings: true,
};

/**
 * Encoding Service class
 * Provides methods for encoding text to various character sets
 */
export class EncodingService {
  private readonly logger = Logger.scope('EncodingService');
  private config: EncodingConfig;
  private static utf8Encoder = new TextEncoder();

  /**
   * Creates a new EncodingService instance
   * @param config - Optional configuration
   */
  constructor(config?: Partial<EncodingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Configure the encoding service
   * @param config - Configuration options
   */
  configure(config: Partial<EncodingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): EncodingConfig {
    return { ...this.config };
  }

  /**
   * Encode text to bytes using the specified encoding
   *
   * @param text - Text to encode
   * @param encoding - Target encoding (default: from config)
   * @returns Encoded bytes as Uint8Array
   *
   * @example
   * ```typescript
   * const service = new EncodingService();
   * const bytes = service.encode('你好', 'GBK');
   * ```
   */
  encode(text: string, encoding?: string): Uint8Array {
    if (!text || typeof text !== 'string') {
      return new Uint8Array(0);
    }

    const targetEncoding = this.normalizeEncoding(encoding || this.config.defaultEncoding);

    switch (targetEncoding) {
      case 'UTF8':
      case 'UTF-8':
        return EncodingService.utf8Encoder.encode(text);
      case 'GBK':
      case 'GB2312':
        return this.encodeGbk(text);
      case 'BIG5':
        return this.encodeBig5(text);
      default:
        if (this.config.showWarnings) {
          this.logger.warn(`Unknown encoding "${encoding}", falling back to UTF-8`);
        }
        return EncodingService.utf8Encoder.encode(text);
    }
  }

  /**
   * Encode text with detailed result including unsupported character info
   *
   * @param text - Text to encode
   * @param encoding - Target encoding
   * @returns Encoding result with metadata
   */
  encodeWithInfo(text: string, encoding?: string): EncodingResult {
    if (!text || typeof text !== 'string') {
      return {
        bytes: new Uint8Array(0),
        unsupportedCount: 0,
        unsupportedChars: [],
      };
    }

    const targetEncoding = this.normalizeEncoding(encoding || this.config.defaultEncoding);

    if (targetEncoding === 'UTF8' || targetEncoding === 'UTF-8') {
      return {
        bytes: EncodingService.utf8Encoder.encode(text),
        unsupportedCount: 0,
        unsupportedChars: [],
      };
    }

    const result: number[] = [];
    const unsupportedChars: string[] = [];
    const fallbackCode = this.config.fallbackChar.charCodeAt(0);

    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      const code = text.charCodeAt(i);

      // Handle surrogate pairs for characters outside BMP
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const nextCode = text.charCodeAt(i + 1);
        if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
          // This is a surrogate pair - not supported in GBK/Big5
          unsupportedChars.push(text.substring(i, i + 2));
          result.push(fallbackCode);
          i++; // Skip the low surrogate
          continue;
        }
      }

      // ASCII characters pass through directly
      if (isAscii(code)) {
        result.push(code);
        continue;
      }

      // Try to encode based on target encoding
      let bytes: [number, number] | null = null;

      if (targetEncoding === 'BIG5') {
        bytes = getBig5Bytes(code);
      } else {
        // GBK or GB2312
        bytes = getGbkBytes(code);
      }

      if (bytes) {
        result.push(bytes[0], bytes[1]);
      } else {
        // Character not found in encoding table
        if (char !== undefined) {
          unsupportedChars.push(char);
        }
        result.push(fallbackCode);

        if (this.config.showWarnings && unsupportedChars.length === 1 && char !== undefined) {
          this.logger.warn(
            `Character "${char}" (U+${code.toString(16).toUpperCase()}) not supported in ${targetEncoding}`
          );
        }
      }
    }

    return {
      bytes: new Uint8Array(result),
      unsupportedCount: unsupportedChars.length,
      unsupportedChars: [...new Set(unsupportedChars)], // Unique characters
    };
  }

  /**
   * Check if an encoding is supported
   *
   * @param encoding - Encoding name to check
   * @returns true if supported
   *
   * @example
   * ```typescript
   * service.isSupported('GBK'); // true
   * service.isSupported('SHIFT-JIS'); // false
   * ```
   */
  isSupported(encoding: string): boolean {
    if (!encoding || typeof encoding !== 'string') {
      return false;
    }

    const normalized = this.normalizeEncoding(encoding);
    return ['GBK', 'GB2312', 'BIG5', 'UTF8', 'UTF-8'].includes(normalized);
  }

  /**
   * Detect the best encoding for the given text
   *
   * Analyzes the text content and recommends the most appropriate encoding:
   * - UTF-8 for mixed content or when GBK coverage is insufficient
   * - GBK for simplified Chinese
   * - Big5 for traditional Chinese (when detected)
   *
   * @param text - Text to analyze
   * @returns Recommended encoding name
   *
   * @example
   * ```typescript
   * service.detectEncoding('Hello World'); // 'UTF-8'
   * service.detectEncoding('你好世界'); // 'GBK'
   * ```
   */
  detectEncoding(text: string): SupportedEncoding {
    if (!text || typeof text !== 'string') {
      return 'UTF-8';
    }

    let hasAscii = false;
    let hasCjk = false;
    let hasChinesePunctuation = false;
    let gbkCoverage = 0;
    let big5Coverage = 0;
    let totalNonAscii = 0;

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      // Skip surrogate pairs
      if (code >= 0xd800 && code <= 0xdfff) {
        continue;
      }

      if (isAscii(code)) {
        hasAscii = true;
        continue;
      }

      totalNonAscii++;

      if (isCjk(code)) {
        hasCjk = true;

        // Check GBK coverage
        if (unicodeToGbk.has(code)) {
          gbkCoverage++;
        }

        // Check Big5 coverage
        if (unicodeToBig5.has(code)) {
          big5Coverage++;
        }
      } else if (isChinesePunctuation(code)) {
        hasChinesePunctuation = true;

        if (unicodeToGbk.has(code)) {
          gbkCoverage++;
        }
      }
    }

    // Pure ASCII text
    if (!hasCjk && !hasChinesePunctuation && hasAscii) {
      return 'UTF-8';
    }

    // No non-ASCII characters
    if (totalNonAscii === 0) {
      return 'UTF-8';
    }

    // Calculate coverage ratios
    const gbkRatio = gbkCoverage / totalNonAscii;
    const big5Ratio = big5Coverage / totalNonAscii;

    // If Big5 has significantly better coverage, use it
    if (big5Ratio > gbkRatio && big5Ratio > 0.8) {
      return 'BIG5';
    }

    // If GBK has good coverage (>80%), use it
    if (gbkRatio > 0.8) {
      return 'GBK';
    }

    // Default to UTF-8 for mixed or unsupported content
    return 'UTF-8';
  }

  /**
   * Get list of supported encodings
   * @returns Array of supported encoding names
   */
  getSupportedEncodings(): SupportedEncoding[] {
    return ['GBK', 'GB2312', 'BIG5', 'UTF-8'];
  }

  /**
   * Encode text to GBK bytes
   * @param text - Text to encode
   * @returns GBK encoded bytes
   */
  private encodeGbk(text: string): Uint8Array {
    const result: number[] = [];
    const fallbackCode = this.config.fallbackChar.charCodeAt(0);

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      // Handle surrogate pairs
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const nextCode = text.charCodeAt(i + 1);
        if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
          result.push(fallbackCode);
          i++;
          continue;
        }
      }

      // ASCII passes through
      if (isAscii(code)) {
        result.push(code);
        continue;
      }

      // Try GBK encoding
      const bytes = getGbkBytes(code);
      if (bytes) {
        result.push(bytes[0], bytes[1]);
      } else {
        result.push(fallbackCode);
      }
    }

    return new Uint8Array(result);
  }

  /**
   * Encode text to Big5 bytes
   * @param text - Text to encode
   * @returns Big5 encoded bytes
   */
  private encodeBig5(text: string): Uint8Array {
    const result: number[] = [];
    const fallbackCode = this.config.fallbackChar.charCodeAt(0);

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      // Handle surrogate pairs
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const nextCode = text.charCodeAt(i + 1);
        if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
          result.push(fallbackCode);
          i++;
          continue;
        }
      }

      // ASCII passes through
      if (isAscii(code)) {
        result.push(code);
        continue;
      }

      // Try Big5 encoding
      const bytes = getBig5Bytes(code);
      if (bytes) {
        result.push(bytes[0], bytes[1]);
      } else {
        // Fall back to GBK if Big5 doesn't have the character
        const gbkBytes = getGbkBytes(code);
        if (gbkBytes) {
          result.push(gbkBytes[0], gbkBytes[1]);
        } else {
          result.push(fallbackCode);
        }
      }
    }

    return new Uint8Array(result);
  }

  /**
   * Normalize encoding name to standard format
   * @param encoding - Encoding name
   * @returns Normalized encoding name
   */
  private normalizeEncoding(encoding: string): string {
    return encoding.toUpperCase().replace(/-/g, '').replace('_', '');
  }
}

// Export singleton instance for convenience
export const encodingService = new EncodingService();
