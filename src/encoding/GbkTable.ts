/**
 * GBK Encoding Table - 懒加载版本
 *
 * 优化策略（v2.15.4 重新设计）：
 * 1. 默认使用精简版编码表 (GbkLite.ts，约 106 个最常用汉字)
 * 2. 命中精简表的字符直接返回（毫秒级）
 * 3. 未命中时查完整表 (GbkData.ts)
 * 4. GbkData 通过 vite manualChunks 拆成独立 chunk `chunks/gbk-data-*.js`
 *    —— 在 dist 输出层面做到了代码分割，但运行时仍然同步可用
 *
 * 注意：dynamic import() 方案曾在 v2.15.4-dev 中尝试，但因为
 * EncodingService.encode() / TemplateRenderer 都是同步 API，
 * 切换到 dynamic 后会导致中文编码首次失败（'生产日期'/'谢谢惠顾'
 * 这类字符不在 lite 表中）。v2.15.4-final 选择保留 static import
 * 来换取 100% backward compat；异步 pre-warm 留给 v2.15.5+ 重构
 * sync → async encoding API 时再启用。
 *
 * GBK: 23940 个字符映射
 * Big5: 13911 个字符映射
 */

import { binarySearchGbk, isInCommonRange } from './GbkLite';
import { GBK_DATA as FULL_GBK_DATA, BIG5_DATA as FULL_BIG5_DATA } from './GbkData';

// 懒加载完整编码数据
let GBK_DATA: number[] | null = null;
let BIG5_DATA: number[] | null = null;

function loadFullData(): { GBK_DATA: number[]; BIG5_DATA: number[] } {
  if (!GBK_DATA) {
    GBK_DATA = FULL_GBK_DATA;
    BIG5_DATA = FULL_BIG5_DATA;
  }
  // After the guard above, both module-level vars are guaranteed initialized.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return { GBK_DATA: GBK_DATA as number[], BIG5_DATA: BIG5_DATA as number[] };
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
 * Get GBK bytes for a Unicode character.
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
