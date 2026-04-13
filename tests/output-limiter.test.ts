import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  truncateString,
  truncateForLog,
  batchProcess,
  createLimitedLogger,
  generateSummary,
} from '@/utils/outputLimiter';

describe('Output Limiter', () => {
  describe('truncateString', () => {
    it('should return original string if within limit', () => {
      const str = 'short string';
      expect(truncateString(str, { maxLength: 100 })).toBe(str);
    });

    it('should truncate string exceeding limit', () => {
      const str = 'a'.repeat(1000);
      const result = truncateString(str, { maxLength: 100 });
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('[truncated]');
    });

    it('should preserve head and tail when configured', () => {
      const str = 'a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500);
      const result = truncateString(str, {
        maxLength: 200,
        preserveHead: true,
        headLength: 50,
        tailLength: 50,
      });
      expect(result.startsWith('a'.repeat(50))).toBe(true);
      expect(result.endsWith('c'.repeat(50))).toBe(true);
      expect(result).toContain('[truncated]');
    });

    it('should use custom suffix', () => {
      const str = 'a'.repeat(1000);
      const result = truncateString(str, { maxLength: 100, suffix: '... (more)' });
      expect(result).toContain('... (more)');
    });
  });

  describe('truncateForLog', () => {
    it('should handle null', () => {
      expect(truncateForLog(null)).toBe('null');
    });

    it('should handle undefined', () => {
      expect(truncateForLog(undefined)).toBe('undefined');
    });

    it('should handle primitives', () => {
      expect(truncateForLog(123)).toBe('123');
      expect(truncateForLog(true)).toBe('true');
    });

    it('should truncate long strings', () => {
      const str = 'a'.repeat(10000);
      const result = truncateForLog(str, 1000);
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should format Uint8Array', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03, 0xff]);
      const result = truncateForLog(data);
      expect(result).toContain('Uint8Array');
      expect(result).toContain('01 02 03 ff');
    });

    it('should format large Uint8Array with summary', () => {
      const data = new Uint8Array(1000);
      const result = truncateForLog(data);
      expect(result).toContain('Uint8Array');
      expect(result).toContain('1000 bytes');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = truncateForLog(error);
      expect(result).toContain('Error');
      expect(result).toContain('Test error');
    });

    it('should handle objects', () => {
      const obj = { a: 1, b: 'test', c: [1, 2, 3] };
      const result = truncateForLog(obj);
      expect(result).toContain('a');
      expect(result).toContain('test');
    });
  });

  describe('batchProcess', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processor = vi.fn((batch: number[]) => batch.map(x => x * 2));

      const results = await batchProcess(items, 3, processor);

      expect(processor).toHaveBeenCalledTimes(4); // 3+3+3+1
      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    });

    it('should handle async processor', async () => {
      const items = [1, 2, 3];
      const processor = async (batch: number[]) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return batch.map(x => x * 2);
      };

      const results = await batchProcess(items, 2, processor);
      expect(results).toEqual([2, 4, 6]);
    });

    it('should handle empty array', async () => {
      const results = await batchProcess([], 10, batch => batch);
      expect(results).toEqual([]);
    });
  });

  describe('createLimitedLogger', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log with truncation', () => {
      const logger = createLimitedLogger(100);
      const longString = 'a'.repeat(1000);

      logger.log('message', longString);

      expect(consoleLogSpy).toHaveBeenCalled();
      // logger.log calls console.log with processed args
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs.length).toBeGreaterThanOrEqual(2);
      // Find the truncated argument
      const truncatedArg = callArgs.find(arg => typeof arg === 'string' && (arg as string).includes('[truncated]'));
      expect(truncatedArg).toBeDefined();
      expect((truncatedArg as string).length).toBeLessThanOrEqual(100);
    });

    it('should warn with truncation', () => {
      const logger = createLimitedLogger(50);
      logger.warn('warning', 'b'.repeat(100));

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should error with truncation', () => {
      const logger = createLimitedLogger(50);
      logger.error('error', 'c'.repeat(100));

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('generateSummary', () => {
    it('should summarize string', () => {
      const str = 'a'.repeat(200);
      const result = generateSummary(str);
      expect(result).toContain('string(200)');
      expect(result).toContain('[truncated]');
    });

    it('should summarize array', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(generateSummary(arr)).toBe('array[5]');
    });

    it('should summarize Uint8Array', () => {
      const data = new Uint8Array(500);
      expect(generateSummary(data)).toBe('Uint8Array(500 bytes)');
    });

    it('should summarize object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
      const result = generateSummary(obj);
      expect(result).toContain('object{6 keys');
      expect(result).toContain('...');
    });

    it('should summarize Error', () => {
      const error = new Error('Something went wrong');
      const result = generateSummary(error);
      expect(result).toContain('Error');
      expect(result).toContain('Something went wrong');
    });

    it('should handle null and undefined', () => {
      expect(generateSummary(null)).toBe('null');
      expect(generateSummary(undefined)).toBe('undefined');
    });
  });
});
