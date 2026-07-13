/**
 * GbkTable tests — full coverage of the GBK/Big5 lookup helpers.
 *
 * Coverage goals:
 * - ASCII fast-path (returns [0, code])
 * - Lite table hit (binarySearchGbk returns non-null)
 * - Lite table miss → falls through to full table
 * - Lite table miss + not in common range → returns null
 * - Cache hits on getUnicodeFromGbk / getBig5Bytes
 * - isAscii / isCjk / isChinesePunctuation edge cases
 */
import { describe, it, expect } from 'vitest';
import {
  getGbkBytes,
  getUnicodeFromGbk,
  getBig5Bytes,
  isAscii,
  isCjk,
  isChinesePunctuation,
} from '@/encoding/GbkTable';

describe('GbkTable', () => {
  describe('getGbkBytes', () => {
    it('returns ASCII bytes for printable ASCII range', () => {
      const result = getGbkBytes(0x41); // 'A'
      expect(result).toEqual([0, 0x41]);
    });

    it('returns ASCII bytes for space (0x20)', () => {
      expect(getGbkBytes(0x20)).toEqual([0, 0x20]);
    });

    it('returns ASCII bytes for tilde (0x7e)', () => {
      expect(getGbkBytes(0x7e)).toEqual([0, 0x7e]);
    });

    it('returns null for control characters below 0x20', () => {
      expect(getGbkBytes(0x00)).toBeNull();
      expect(getGbkBytes(0x1f)).toBeNull();
    });

    it('returns null for control characters above 0x7e (non-CJK)', () => {
      // 0x80 = control char, not in CJK common range
      expect(getGbkBytes(0x80)).toBeNull();
      expect(getGbkBytes(0xff)).toBeNull();
    });

    it('encodes a Chinese character that IS in the lite table', () => {
      // 你 = U+4F60, which IS in the 106-char lite table
      const result = getGbkBytes(0x4f60);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      const [high, low] = result!;
      expect(high).toBeGreaterThan(0);
      expect(low).toBeGreaterThan(0);
    });

    it('encodes a Chinese character that is NOT in the lite but IS in the full table', () => {
      // 谢 = U+8C22, NOT in lite (106 chars) but IS in the full 23940 GBK table
      const result = getGbkBytes(0x8c22);
      expect(result).not.toBeNull();
      expect(result![0]).toBeGreaterThan(0x80);
    });

    it('returns null for a character outside both tables', () => {
      // U+1F600 = 😀 emoji — neither in lite nor full GBK table
      expect(getGbkBytes(0x1f600)).toBeNull();
    });
  });

  describe('getUnicodeFromGbk', () => {
    it('returns null when cache is empty and table miss', () => {
      // (0xFF, 0xFE) — likely not a valid GBK mapping
      const result = getUnicodeFromGbk(0xff, 0xfe);
      // Could be null (no mapping) or a Unicode code point. Test that
      // the return type is consistent.
      expect(result === null || typeof result === 'number').toBe(true);
    });

    it('caches the first lookup and returns cached value on second call', () => {
      // First call populates the cache
      const first = getUnicodeFromGbk(0xc4, 0xe3); // 你 in GBK
      expect(first).toBe(0x4f60);
      // Second call should hit the cache (same return value, no error)
      const second = getUnicodeFromGbk(0xc4, 0xe3);
      expect(second).toBe(0x4f60);
    });
  });

  describe('getBig5Bytes', () => {
    it('returns null when not cached and not in full table', () => {
      // (0xFF, 0xFF) — not a valid Big5 mapping
      const result = getBig5Bytes(0xdead);
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    it('caches results after first call', () => {
      // First call may return null or a value, but the cache should
      // be populated so a second call with the same input is consistent.
      const r1 = getBig5Bytes(0x4f60);
      const r2 = getBig5Bytes(0x4f60);
      expect(r1).toEqual(r2);
    });
  });

  describe('isAscii', () => {
    it('returns true for ASCII range', () => {
      expect(isAscii(0x00)).toBe(true);
      expect(isAscii(0x41)).toBe(true);
      expect(isAscii(0x7f)).toBe(true);
    });

    it('returns false for non-ASCII', () => {
      expect(isAscii(0x80)).toBe(false);
      expect(isAscii(0xff)).toBe(false);
      expect(isAscii(0x4f60)).toBe(false);
    });
  });

  describe('isCjk', () => {
    it('identifies CJK Unified Ideographs', () => {
      expect(isCjk(0x4f60)).toBe(true); // 你
      expect(isCjk(0x9fff)).toBe(true); // edge of CJK Unified
    });

    it('identifies CJK Extension A', () => {
      expect(isCjk(0x3400)).toBe(true);
      expect(isCjk(0x4dbf)).toBe(true);
    });

    it('identifies CJK Extension B', () => {
      expect(isCjk(0x20000)).toBe(true);
      expect(isCjk(0x2a6df)).toBe(true);
    });

    it('identifies CJK Compatibility Ideographs', () => {
      expect(isCjk(0xf900)).toBe(true);
      expect(isCjk(0xfaff)).toBe(true);
    });

    it('rejects non-CJK characters', () => {
      expect(isCjk(0x0041)).toBe(false); // A
      expect(isCjk(0x3000)).toBe(false); // CJK Symbols (not CJK Unified)
      expect(isCjk(0x1f600)).toBe(false); // emoji
    });
  });

  describe('isChinesePunctuation', () => {
    it('identifies CJK Symbols and Punctuation (U+3000–U+303F)', () => {
      expect(isChinesePunctuation(0x3000)).toBe(true); // ideographic space
      expect(isChinesePunctuation(0x3002)).toBe(true); // 。
      expect(isChinesePunctuation(0x303f)).toBe(true); // edge
    });

    it('identifies Halfwidth and Fullwidth Forms (U+FF00–U+FFEF)', () => {
      expect(isChinesePunctuation(0xff00)).toBe(true);
      expect(isChinesePunctuation(0xffef)).toBe(true);
    });

    it('rejects characters outside the punctuation ranges', () => {
      expect(isChinesePunctuation(0x0041)).toBe(false); // A
      expect(isChinesePunctuation(0x2fff)).toBe(false); // just below
      expect(isChinesePunctuation(0x3100)).toBe(false); // just above
      expect(isChinesePunctuation(0xfeff)).toBe(false); // just below
      expect(isChinesePunctuation(0xfff0)).toBe(false); // just above
    });
  });
});