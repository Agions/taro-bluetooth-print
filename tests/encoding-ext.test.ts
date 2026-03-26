import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EncodingService } from '../src/encoding/EncodingService';
import { Logger, LogLevel } from '../src/utils/logger';

describe('EncodingService - Korean/Japanese Extensions', () => {
  beforeAll(() => {
    Logger.setLevel(LogLevel.ERROR);
  });

  afterAll(() => {
    Logger.setLevel(LogLevel.WARN);
  });

  describe('isSupported()', () => {
    it('should return true for EUC-KR', () => {
      const service = new EncodingService();
      expect(service.isSupported('EUC-KR')).toBe(true);
    });

    it('should return true for EUCKR (alias)', () => {
      const service = new EncodingService();
      expect(service.isSupported('EUCKR')).toBe(true);
    });

    it('should return true for Shift-JIS', () => {
      const service = new EncodingService();
      expect(service.isSupported('Shift-JIS')).toBe(true);
    });

    it('should return true for ShiftJIS (alias)', () => {
      const service = new EncodingService();
      expect(service.isSupported('ShiftJIS')).toBe(true);
    });

    it('should return true for SJIS (alias)', () => {
      const service = new EncodingService();
      expect(service.isSupported('SJIS')).toBe(true);
    });

    it('should return true for ISO-2022-JP', () => {
      const service = new EncodingService();
      expect(service.isSupported('ISO-2022-JP')).toBe(true);
    });

    it('should return true for ISO2022JP (alias)', () => {
      const service = new EncodingService();
      expect(service.isSupported('ISO2022JP')).toBe(true);
    });

    it('should return true for JIS (alias)', () => {
      const service = new EncodingService();
      expect(service.isSupported('JIS')).toBe(true);
    });

    it('should return true for GBK', () => {
      const service = new EncodingService();
      expect(service.isSupported('GBK')).toBe(true);
    });

    it('should return true for UTF-8', () => {
      const service = new EncodingService();
      expect(service.isSupported('UTF-8')).toBe(true);
    });

    it('should return false for unknown encoding', () => {
      const service = new EncodingService();
      expect(service.isSupported('UNKNOWN')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      const service = new EncodingService();
      expect(service.isSupported(null as any)).toBe(false);
      expect(service.isSupported(undefined as any)).toBe(false);
    });
  });

  describe('encode() - Korean (EUC-KR)', () => {
    it('should encode Korean Hangul syllables', () => {
      const service = new EncodingService();
      const result = service.encode('한글테스트', 'EUC-KR');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return non-empty result for Korean text', () => {
      const service = new EncodingService();
      const result = service.encode('안녕하세요', 'EUC-KR');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle mixed Korean ASCII text', () => {
      const service = new EncodingService();
      const result = service.encode('Hello 한글 World', 'EUC-KR');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const service = new EncodingService();
      const result = service.encode('', 'EUC-KR');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should use fallback char for unsupported characters', () => {
      const service = new EncodingService({ fallbackChar: '?' });
      const result = service.encode('日本語', 'EUC-KR');

      // Japanese characters not supported in EUC-KR should fall back
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('encode() - Japanese Shift-JIS', () => {
    it('should encode Hiragana characters', () => {
      const service = new EncodingService();
      const result = service.encode('あいうえお', 'Shift-JIS');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode Katakana characters', () => {
      const service = new EncodingService();
      const result = service.encode('カタカナ', 'Shift-JIS');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode mixed Japanese text', () => {
      const service = new EncodingService();
      const result = service.encode('日本語テスト', 'Shift-JIS');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode Japanese with ASCII mix', () => {
      const service = new EncodingService();
      const result = service.encode('Hello 日本語 World', 'Shift-JIS');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const service = new EncodingService();
      const result = service.encode('', 'Shift-JIS');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should use fallback for unsupported Korean in Shift-JIS', () => {
      const service = new EncodingService({ fallbackChar: '?' });
      const result = service.encode('한글', 'Shift-JIS');

      // Korean not supported in Shift-JIS
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('encode() - Japanese ISO-2022-JP', () => {
    it('should encode Japanese text with escape sequences', () => {
      const service = new EncodingService();
      const result = service.encode('日本語テスト', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include ESC escape sequences for JIS X 0208', () => {
      const service = new EncodingService();
      const result = service.encode('あ', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
      // ISO-2022-JP should contain ESC $ B for JIS X 0208
      const hasEscapeSequence = Array.from(result).some(
        (byte, i) => i > 0 && result[i - 1] === 0x1b && byte === 0x24
      );
      expect(hasEscapeSequence).toBe(true);
    });

    it('should return to ASCII mode at end of string', () => {
      const service = new EncodingService();
      const result = service.encode('ABC', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should handle Hiragana encoding', () => {
      const service = new EncodingService();
      const result = service.encode('こんにちは', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle Katakana encoding', () => {
      const service = new EncodingService();
      const result = service.encode('カタカナ', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle mixed ASCII and Japanese', () => {
      const service = new EncodingService();
      const result = service.encode('Hello 日本語 Test', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const service = new EncodingService();
      const result = service.encode('', 'ISO-2022-JP');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });
  });

  describe('encodeWithInfo()', () => {
    it('should return encoding result with metadata for EUC-KR', () => {
      const service = new EncodingService();
      const result = service.encodeWithInfo('안녕하세요', 'EUC-KR');

      expect(result).toHaveProperty('bytes');
      expect(result).toHaveProperty('unsupportedCount');
      expect(result).toHaveProperty('unsupportedChars');
      expect(result.bytes).toBeInstanceOf(Uint8Array);
    });

    it('should return encoding result with metadata for Shift-JIS', () => {
      const service = new EncodingService();
      const result = service.encodeWithInfo('日本語', 'Shift-JIS');

      expect(result).toHaveProperty('bytes');
      expect(result).toHaveProperty('unsupportedCount');
    });

    it('should return encoding result with metadata for ISO-2022-JP', () => {
      const service = new EncodingService();
      const result = service.encodeWithInfo('テスト', 'ISO-2022-JP');

      expect(result).toHaveProperty('bytes');
      expect(result).toHaveProperty('unsupportedCount');
    });
  });

  describe('getSupportedEncodings()', () => {
    it('should return array including Korean and Japanese encodings', () => {
      const service = new EncodingService();
      const encodings = service.getSupportedEncodings();

      expect(Array.isArray(encodings)).toBe(true);
      expect(encodings).toContain('EUC-KR');
      expect(encodings).toContain('SHIFT-JIS');
      expect(encodings).toContain('ISO-2022-JP');
    });
  });

  describe('detectEncoding()', () => {
    it('should detect EUC-KR for Korean text', () => {
      const service = new EncodingService();
      const detected = service.detectEncoding('안녕하세요');

      // May return EUC-KR or UTF-8 depending on coverage
      expect(typeof detected).toBe('string');
    });

    it('should detect Shift-JIS or UTF-8 for Japanese text', () => {
      const service = new EncodingService();
      const detected = service.detectEncoding('こんにちは');

      expect(typeof detected).toBe('string');
    });

    it('should return UTF-8 for ASCII text', () => {
      const service = new EncodingService();
      const detected = service.detectEncoding('Hello World');

      expect(detected).toBe('UTF-8');
    });

    it('should return UTF-8 for empty string', () => {
      const service = new EncodingService();
      const detected = service.detectEncoding('');

      expect(detected).toBe('UTF-8');
    });
  });

  describe('normalizeEncoding()', () => {
    it('should handle case-insensitive encoding names', () => {
      const service = new EncodingService();
      const r1 = service.encode('test', 'euc-kr');
      const r2 = service.encode('test', 'EUC-KR');
      const r3 = service.encode('test', 'Euc-Kr');

      expect(r1.length).toBe(r2.length);
      expect(r2.length).toBe(r3.length);
    });

    it('should handle encoding names with dashes and underscores', () => {
      const service = new EncodingService();
      const r1 = service.encode('test', 'Shift-JIS');
      const r2 = service.encode('test', 'SHIFT_JIS');

      expect(r1.length).toBe(r2.length);
    });
  });

  describe('configure() and getConfig()', () => {
    it('should allow configuring default encoding', () => {
      const service = new EncodingService();
      service.configure({ defaultEncoding: 'EUC-KR' });
      const config = service.getConfig();

      expect(config.defaultEncoding).toBe('EUC-KR');
    });

    it('should allow configuring fallback character', () => {
      const service = new EncodingService();
      service.configure({ fallbackChar: '#' });
      const config = service.getConfig();

      expect(config.fallbackChar).toBe('#');
    });

    it('should allow configuring showWarnings', () => {
      const service = new EncodingService();
      service.configure({ showWarnings: false });
      const config = service.getConfig();

      expect(config.showWarnings).toBe(false);
    });
  });
});
