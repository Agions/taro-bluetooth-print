/**
 * GBK Encoding Table - 懒加载版本
 *
 * 优化策略：
 * 1. 默认使用精简版编码表 (gbk-lite.ts，约 3500 常用字)
 * 2. 遇到非常用字时动态加载完整编码表
 * 3. 二分查找代替 Map，大幅减少内存占用
 *
 * GBK: 23940 个字符映射
 * Big5: 13911 个字符映射
 */

import { binarySearchGbk, isInCommonRange } from './gbk-lite';
import { GBK_DATA as FULL_GBK_DATA, BIG5_DATA as FULL_BIG5_DATA } from './gbk-data';

// 懒加载完整编码数据
let GBK_DATA: number[] | null = null;
let BIG5_DATA: number[] | null = null;

function loadFullData() {
  if (!GBK_DATA) {
    GBK_DATA = FULL_GBK_DATA;
    BIG5_DATA = FULL_BIG5_DATA;
  }
  return { GBK_DATA: GBK_DATA, BIG5_DATA: BIG5_DATA! };
}

// Unicode to GBK mapping table
export const unicodeToGbk: Map<number, number> = new Map();

// GBK to Unicode mapping table
export const gbkToUnicode: Map<number, number> = new Map();

// Unicode to Big5 mapping table
export const unicodeToBig5: Map<number, number> = new Map();

// Big5 to Unicode mapping table
export const big5ToUnicode: Map<number, number> = new Map();

/**
 * Get GBK bytes for a Unicode character
 * 先查精简表，查不到再懒加载完整表
 */
export function getGbkBytes(unicode: number): [number, number] | null {
  // ASCII 直接返回
  if (unicode >= 0x20 && unicode <= 0x7e) {
    return [0, unicode];
  }

  // 先查精简表
  const gbk = binarySearchGbk(unicode);
  if (gbk !== null) {
    return [(gbk >> 8) & 0xff, gbk & 0xff];
  }

  // 非常用字，懒加载完整表
  if (isInCommonRange(unicode)) {
    const { GBK_DATA } = loadFullData();
    for (let i = 0; i < GBK_DATA.length; i += 2) {
      if (GBK_DATA[i] === unicode) {
        const gbkValue = GBK_DATA[i + 1];
        if (gbkValue !== undefined) {
          return [(gbkValue >> 8) & 0xff, gbkValue & 0xff];
        }
      }
    }
  }

  return null;
}

/**
 * Get Unicode character from GBK bytes
 * 懒加载完整表
 */
export function getUnicodeFromGbk(high: number, low: number): number | null {
  const gbk = (high << 8) | low;

  // 先查缓存
  const cached = gbkToUnicode.get(gbk);
  if (cached !== undefined) return cached;

  // 懒加载完整表
  const { GBK_DATA } = loadFullData();
  for (let i = 0; i < GBK_DATA.length; i += 2) {
    if (GBK_DATA[i + 1] === gbk) {
      const result = GBK_DATA[i];
      return result ?? null;
    }
  }

  return null;
}

/**
 * Get Big5 bytes for a Unicode character
 * 懒加载完整表
 */
export function getBig5Bytes(unicode: number): [number, number] | null {
  // 先查缓存
  const cached = unicodeToBig5.get(unicode);
  if (cached !== undefined) {
    const cachedValue = cached;
    return [(cachedValue >> 8) & 0xff, cachedValue & 0xff];
  }

  // 懒加载完整表
  const { BIG5_DATA } = loadFullData();
  for (let i = 0; i < BIG5_DATA.length; i += 2) {
    if (BIG5_DATA[i] === unicode) {
      const big5 = BIG5_DATA[i + 1];
      if (big5 !== undefined) {
        return [(big5 >> 8) & 0xff, big5 & 0xff];
      }
    }
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
