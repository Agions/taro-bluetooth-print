import { vi, describe, test, expect, beforeEach, afterEach, Mock } from 'vitest';
/**
 * Unit tests for Encoding utility
 */

import { Encoding } from '../src/utils/encoding';
import { Logger, LogLevel } from '../src/utils/logger';

describe('Encoding', () => {
  beforeAll(() => {
    // Suppress warnings during tests
    Logger.setLevel(LogLevel.ERROR);
  });

  afterAll(() => {
    Logger.setLevel(LogLevel.WARN);
  });

  describe('encode', () => {
    it('should encode UTF-8 text', () => {
      const text = 'Hello World!';
      const result = Encoding.encode(text, 'UTF-8');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);

      // Verify encoding
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe(text);
    });

    it('should handle UTF-8 with case-insensitive encoding name', () => {
      const text = 'Test';

      const result1 = Encoding.encode(text, 'utf-8');
      const result2 = Encoding.encode(text, 'UTF-8');
      const result3 = Encoding.encode(text, 'UTF8');

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should encode Unicode characters in UTF-8', () => {
      const text = '你好世界 🌍';
      const result = Encoding.encode(text, 'UTF-8');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(text.length); // Multi-byte characters

      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe(text);
    });

    it('should fallback to UTF-8 for GBK encoding', () => {
      const text = '测试文本';
      const warnSpy = vi.spyOn(Logger, 'warn');

      const result = Encoding.encode(text, 'GBK');

      expect(result).toBeInstanceOf(Uint8Array);
      // Currently falls back to UTF-8
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe(text);
    });

    it('should fallback to UTF-8 for GB2312 encoding', () => {
      const text = 'Test';
      const result = Encoding.encode(text, 'GB2312');

      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should handle default encoding parameter (GBK)', () => {
      const text = 'Default encoding test';
      const result = Encoding.encode(text);

      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should fallback for unsupported encodings', () => {
      const text = 'Test';
      const result = Encoding.encode(text, 'UNKNOWN_ENCODING');

      expect(result).toBeInstanceOf(Uint8Array);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe(text);
    });

    it('should handle empty string', () => {
      const result = Encoding.encode('', 'UTF-8');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should handle special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\';
      const result = Encoding.encode(text, 'UTF-8');

      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe(text);
    });
  });

  describe('isSupported', () => {
    it('should return true for UTF-8', () => {
      expect(Encoding.isSupported('UTF-8')).toBe(true);
      expect(Encoding.isSupported('utf-8')).toBe(true);
      expect(Encoding.isSupported('UTF8')).toBe(true);
    });

    it('should return false for GBK', () => {
      expect(Encoding.isSupported('GBK')).toBe(false);
    });

    it('should return false for GB2312', () => {
      expect(Encoding.isSupported('GB2312')).toBe(false);
    });

    it('should return false for unknown encodings', () => {
      expect(Encoding.isSupported('UNKNOWN')).toBe(false);
    });
  });
});
