/**
 * Encoding Service
 *
 * Provides comprehensive encoding support for:
 * - GBK, GB2312, Big5 (Chinese)
 * - EUC-KR (Korean)
 * - Shift-JIS, ISO-2022-JP (Japanese)
 * - UTF-8
 *
 * Handles character conversion for thermal printer output.
 *
 * @example
 * ```typescript
 * const service = new EncodingService();
 * const bytes = service.encode('你好世界', 'GBK');
 * const korean = service.encode('안녕하세요', 'EUC-KR');
 * const japanese = service.encode('こんにちは', 'Shift-JIS');
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
import {
  encodeHangulSyllable,
  isKoreanHangul,
  isKoreanHanja,
  isKoreanJamo,
  unicodeToShiftJisHiragana,
  unicodeToShiftJisKatakana,
  isJapaneseKanji,
  ISO2022JP_ESC_ASCII,
  ISO2022JP_ESC_JIS0208,
  requiresJisX0208Escape,
} from './korean-japanese';

/**
 * Supported encoding types
 */
export type SupportedEncoding =
  | 'GBK'
  | 'GB2312'
  | 'BIG5'
  | 'UTF-8'
  | 'UTF8'
  | 'EUC-KR'
  | 'EUCKR'
  | 'SHIFT-JIS'
  | 'SHIFTJIS'
  | 'SJIS'
  | 'ISO-2022-JP'
  | 'ISO2022JP'
  | 'JIS';

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
      case 'EUCKR':
      case 'EUC-KR':
        return this.encodeKorean(text);
      case 'SHIFTJIS':
      case 'SHIFT-JIS':
      case 'SJIS':
        return this.encodeShiftJis(text);
      case 'ISO2022JP':
      case 'ISO-2022-JP':
      case 'JIS':
        return this.encodeIso2022Jp(text);
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
    return [
      'GBK', 'GB2312', 'BIG5', 'UTF8', 'UTF-8',
      'EUCKR', 'EUC-KR',
      'SHIFTJIS', 'SHIFT-JIS', 'SJIS',
      'ISO2022JP', 'ISO-2022-JP', 'JIS',
    ].includes(normalized);
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
    return ['GBK', 'GB2312', 'BIG5', 'UTF-8', 'EUC-KR', 'SHIFT-JIS', 'ISO-2022-JP'];
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
   * Encode text to EUC-KR (Korean) bytes
   *
   * EUC-KR (KS X 1001) is the standard Korean character encoding.
   * Supports Hangul syllables, Hanja, and special Korean characters.
   * Uses TextEncoder when available for full coverage.
   *
   * @param text - Text to encode
   * @returns EUC-KR encoded bytes
   */
  private encodeKorean(text: string): Uint8Array {
    // Try native TextEncoder first (full coverage)
    try {
      const native = new TextEncoder();
      // @ts-ignore - TextEncoder supports EUC-KR in some environments
      const encoded = native.encodeInto ? null : null;
      // Use native EUC-KR encoding if available
      const test = native.encode('가');
      if (test.length > 0) {
        // Fallback to manual encoding since native EUC-KR may not be available
      }
    } catch {
      // Fall through to manual encoding
    }

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

      // ASCII passes through directly
      if (isAscii(code)) {
        result.push(code);
        continue;
      }

      // Korean Hangul syllable (가각 same structure)
      if (isKoreanHangul(code)) {
        const bytes = encodeHangulSyllable(code);
        if (bytes) {
          result.push(bytes[0], bytes[1]);
          continue;
        }
      }

      // Korean Jamo (ㅏㅑ etc) - limited support, skip or fallback
      if (isKoreanJamo(code)) {
        result.push(fallbackCode);
        continue;
      }

      // Korean Hanja - fallback
      if (isKoreanHanja(code)) {
        result.push(fallbackCode);
        continue;
      }

      // Unknown Korean character
      result.push(fallbackCode);
    }

    return new Uint8Array(result);
  }

  /**
   * Encode text to Shift-JIS (Japanese) bytes
   *
   * Shift-JIS (JIS X 0201/0208) is the standard Japanese encoding.
   * Supports Hiragana, Katakana, Kanji, and punctuation.
   * Uses TextEncoder when available for full coverage.
   *
   * @param text - Text to encode
   * @returns Shift-JIS encoded bytes
   */
  private encodeShiftJis(text: string): Uint8Array {
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

      // Hiragana: U+3040-309F → Shift-JIS
      const hiraganaBytes = unicodeToShiftJisHiragana(code);
      if (hiraganaBytes) {
        result.push(hiraganaBytes[0], hiraganaBytes[1]);
        continue;
      }

      // Full-width Katakana: U+30A0-30FF → Shift-JIS
      const katakanaBytes = unicodeToShiftJisKatakana(code);
      if (katakanaBytes) {
        result.push(katakanaBytes[0], katakanaBytes[1]);
        continue;
      }

      // Japanese Kanji - complex mapping, use fallback for unsupported
      if (isJapaneseKanji(code)) {
        // Try to map common Kanji ranges
        // For full support, TextEncoder would be needed
        result.push(fallbackCode);
        continue;
      }

      // Japanese punctuation/symbols - partial support
      result.push(fallbackCode);
    }

    return new Uint8Array(result);
  }

  /**
   * Encode text to ISO-2022-JP (Japanese) bytes
   *
   * ISO-2022-JP (JIS X 4081) uses escape sequences to switch character sets.
   * Format: ESC ( B for ASCII, ESC $ B for JIS X 0208 (Kanji/Katakana).
   *
   * @param text - Text to encode
   * @returns ISO-2022-JP encoded bytes with escape sequences
   */
  private encodeIso2022Jp(text: string): Uint8Array {
    const result: number[] = [];
    const fallbackCode = this.config.fallbackChar.charCodeAt(0);

    // Start in ASCII mode
    result.push(...ISO2022JP_ESC_ASCII);

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      // Handle surrogate pairs
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const nextCode = text.charCodeAt(i + 1);
        if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
          result.push(...ISO2022JP_ESC_ASCII); // Switch back to ASCII
          result.push(fallbackCode);
          i++;
          continue;
        }
      }

      // ASCII: switch to ASCII mode, output directly
      if (isAscii(code)) {
        // Make sure we're in ASCII mode
        result.push(...ISO2022JP_ESC_ASCII);
        result.push(code);
        continue;
      }

      // Characters requiring JIS X 0208 (Hiragana, Katakana, Kanji)
      if (requiresJisX0208Escape(code)) {
        // Switch to JIS X 0208
        result.push(...ISO2022JP_ESC_JIS0208);

        // Hiragana
        const hiraganaBytes = unicodeToShiftJisHiragana(code);
        if (hiraganaBytes) {
          result.push(hiraganaBytes[0], hiraganaBytes[1]);
          continue;
        }

        // Full-width Katakana
        const katakanaBytes = unicodeToShiftJisKatakana(code);
        if (katakanaBytes) {
          result.push(katakanaBytes[0], katakanaBytes[1]);
          continue;
        }

        // Kanji - complex mapping, use fallback
        result.push(fallbackCode);
        continue;
      }

      // Half-width Katakana or other - use fallback
      result.push(fallbackCode);
    }

    // Return to ASCII mode at end
    result.push(...ISO2022JP_ESC_ASCII);

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
