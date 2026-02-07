/**
 * GBK Encoding Table
 *
 * This module provides character mapping tables for GBK, GB2312, and Big5 encodings.
 * GBK is a superset of GB2312 and covers most Chinese characters used in simplified Chinese.
 * Big5 is used for traditional Chinese characters.
 *
 * GBK encoding uses double-byte encoding for Chinese characters:
 * - First byte: 0x81-0xFE
 * - Second byte: 0x40-0xFE (excluding 0x7F)
 *
 * 映射数据存储在 gbk-data.ts 中，运行时解码为 Map。
 * GBK: 23940 个字符映射
 * Big5: 13911 个字符映射
 */

import { GBK_DATA, BIG5_DATA } from './gbk-data';

/**
 * Unicode to GBK mapping table
 * Maps Unicode code points to GBK byte pairs
 */
export const unicodeToGbk: Map<number, number> = new Map();

/**
 * GBK to Unicode mapping table
 * Maps GBK byte pairs to Unicode code points
 */
export const gbkToUnicode: Map<number, number> = new Map();

/**
 * Unicode to Big5 mapping table
 */
export const unicodeToBig5: Map<number, number> = new Map();

/**
 * Big5 to Unicode mapping table
 */
export const big5ToUnicode: Map<number, number> = new Map();

/**
 * Decode flat array mapping data into forward and reverse maps.
 * Array format: [unicode1, encoded1, unicode2, encoded2, ...]
 */
function decodeMappings(
  data: number[],
  forwardMap: Map<number, number>,
  reverseMap: Map<number, number>
): void {
  for (let i = 0; i < data.length; i += 2) {
    const unicode = data[i]!;
    const encoded = data[i + 1]!;
    forwardMap.set(unicode, encoded);
    reverseMap.set(encoded, unicode);
  }
}

// Initialize mappings at module load time
decodeMappings(GBK_DATA, unicodeToGbk, gbkToUnicode);
decodeMappings(BIG5_DATA, unicodeToBig5, big5ToUnicode);

/**
 * Get GBK bytes for a Unicode character
 * @param unicode - Unicode code point
 * @returns GBK byte pair [high, low] or null if not found
 */
export function getGbkBytes(unicode: number): [number, number] | null {
  const gbk = unicodeToGbk.get(unicode);
  if (gbk !== undefined) {
    return [(gbk >> 8) & 0xff, gbk & 0xff];
  }
  return null;
}

/**
 * Get Unicode character from GBK bytes
 * @param high - High byte
 * @param low - Low byte
 * @returns Unicode code point or null if not found
 */
export function getUnicodeFromGbk(high: number, low: number): number | null {
  const gbk = (high << 8) | low;
  return gbkToUnicode.get(gbk) ?? null;
}

/**
 * Get Big5 bytes for a Unicode character
 * @param unicode - Unicode code point
 * @returns Big5 byte pair or null if not found
 */
export function getBig5Bytes(unicode: number): [number, number] | null {
  const big5 = unicodeToBig5.get(unicode);
  if (big5 !== undefined) {
    return [(big5 >> 8) & 0xff, big5 & 0xff];
  }
  return null;
}

/**
 * Check if a character is in the ASCII range
 * @param code - Unicode code point
 * @returns true if ASCII
 */
export function isAscii(code: number): boolean {
  return code >= 0x00 && code <= 0x7f;
}

/**
 * Check if a character is a CJK character
 * @param code - Unicode code point
 * @returns true if CJK
 */
export function isCjk(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Unified Ideographs Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Unified Ideographs Extension D
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0x2f800 && code <= 0x2fa1f) // CJK Compatibility Ideographs Supplement
  );
}

/**
 * Check if a character is a Chinese punctuation mark
 * @param code - Unicode code point
 * @returns true if Chinese punctuation
 */
export function isChinesePunctuation(code: number): boolean {
  return (
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
    (code >= 0xff00 && code <= 0xffef) // Halfwidth and Fullwidth Forms
  );
}
