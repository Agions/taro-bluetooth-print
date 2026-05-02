/**
 * Encoding Tests
 *
 * Tests for the Encoding class
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Encoding } from '@/utils/encoding';

describe('Encoding', () => {
  describe('encode', () => {
    it('should encode UTF-8 strings', () => {
      const result = Encoding.encode('Hello', 'UTF-8');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(5); // H,e,l,l,o
    });

    it('should handle ASCII characters', () => {
      const result = Encoding.encode('ABC', 'UTF-8');
      expect(result).toEqual(new Uint8Array([0x41, 0x42, 0x43]));
    });

    it('should handle empty string', () => {
      const result = Encoding.encode('', 'UTF-8');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should handle non-string input gracefully', () => {
      // @ts-expect-error - testing runtime behavior
      const result = Encoding.encode(null);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should use UTF-8 by default for GBK (fallback)', () => {
      const result = Encoding.encode('你好', 'GBK');
      expect(result).toBeInstanceOf(Uint8Array);
      // GBK encoding for 你好 would differ from UTF-8
      // Currently it uses UTF-8 as fallback
      expect(result.length).toBe(6); // UTF-8 encoding of 你好 is 6 bytes
    });

    it('should handle case-insensitive encoding names', () => {
      const utf8 = Encoding.encode('test', 'utf-8');
      const UTF8 = Encoding.encode('test', 'UTF8');
      expect(utf8).toEqual(UTF8);
    });
  });

  describe('isSupported', () => {
    it('should return true for UTF-8', () => {
      expect(Encoding.isSupported('UTF-8')).toBe(true);
      expect(Encoding.isSupported('utf8')).toBe(true);
      expect(Encoding.isSupported('UTF8')).toBe(true);
    });

    it('should return false for other encodings', () => {
      expect(Encoding.isSupported('GBK')).toBe(false);
      expect(Encoding.isSupported('ASCII')).toBe(false);
    });

    it('should return false for invalid input', () => {
      // @ts-expect-error - testing runtime behavior
      expect(Encoding.isSupported(null)).toBe(false);
      // @ts-expect-error - testing runtime behavior
      expect(Encoding.isSupported(undefined)).toBe(false);
      expect(Encoding.isSupported('')).toBe(false);
    });
  });

  describe('configure', () => {
    it('should allow disabling warnings', () => {
      Encoding.configure({ showWarnings: false });
      const result = Encoding.encode('test', 'GBK');
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});