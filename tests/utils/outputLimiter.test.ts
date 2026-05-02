/**
 * Output Limiter Tests
 *
 * Tests for output limiting utilities (truncation, batching, summary)
 */
import { describe, it, expect } from 'vitest';
import {
  truncateString,
  truncateForLog,
  batchProcess,
  generateSummary,
} from '@/utils/outputLimiter';

describe('truncateString', () => {
  it('should return the original string if under maxLength', () => {
    const result = truncateString('Hello', { maxLength: 100 });
    expect(result).toBe('Hello');
  });

  it('should truncate with suffix when over maxLength', () => {
    const long = 'a'.repeat(100);
    const result = truncateString(long, { maxLength: 50, suffix: '...' });
    expect(result.length).toBeLessThanOrEqual(53); // 50 + ...
    expect(result.endsWith('...')).toBe(true);
  });

  it('should preserve head and tail by default', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz'.repeat(5);
    const result = truncateString(long, {
      maxLength: 30,
      headLength: 10,
      tailLength: 10,
      suffix: '...',
    });
    expect(result.startsWith('abcdefghij')).toBe(true);
    expect(result.endsWith('uvwxyz...')).toBe(false); // ends with tail + suffix
    expect(result).toContain('...');
  });

  it('should use defaults when no options provided', () => {
    const short = 'Hello World';
    const result = truncateString(short);
    expect(result).toBe(short);
  });

  it('should handle empty string', () => {
    expect(truncateString('')).toBe('');
  });

it('should handle preserveHead=false to just cut at maxLength', () => {
      const long = 'a'.repeat(100);
      const result = truncateString(long, {
        maxLength: 20,
        preserveHead: false,
        suffix: '...',
      });
      // maxLength(20) - suffix.length(3) = 17 characters + '...'
      expect(result).toBe('aaaaaaaaaaaaaaaaa...'); // 17 a's + ...
      expect(result.length).toBe(20);
    });
});

describe('truncateForLog', () => {
  it('should handle null', () => {
    expect(truncateForLog(null)).toBe('null');
  });

  it('should handle undefined', () => {
    expect(truncateForLog(undefined)).toBe('undefined');
  });

  it('should return string for numbers and booleans', () => {
    expect(truncateForLog(42)).toBe('42');
    expect(truncateForLog(true)).toBe('true');
    expect(truncateForLog(false)).toBe('false');
  });

  it('should truncate long strings', () => {
    const long = 'a'.repeat(5000);
    const result = truncateForLog(long, 100);
    expect(result.length).toBeLessThanOrEqual(103); // 100 + ...
  });

  it('should format Error objects', () => {
    const error = new Error('Something went wrong');
    const result = truncateForLog(error);
    expect(result).toContain('Error: Something went wrong');
  });

  it('should format Uint8Array', () => {
    const arr = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    const result = truncateForLog(arr);
    expect(result).toContain('Uint8Array(5)');
    expect(result).toContain('48 65 6c 6c 6f');
  });

  it('should format large Uint8Array with truncation', () => {
    const arr = new Uint8Array(200);
    const result = truncateForLog(arr);
    expect(result).toContain('Uint8Array(200)');
    expect(result).toContain('...');
  });

  it('should format empty Uint8Array', () => {
    const arr = new Uint8Array(0);
    const result = truncateForLog(arr);
    expect(result).toContain('Uint8Array(0)');
  });

  it('should format ArrayBuffer', () => {
    const buffer = new ArrayBuffer(10);
    const result = truncateForLog(buffer);
    expect(result).toContain('Uint8Array(10)');
  });

  it('should handle objects with JSON representation', () => {
    const obj = { name: 'test', value: 42 };
    const result = truncateForLog(obj);
    expect(result).toContain('test');
    expect(result).toContain('42');
  });
});

describe('generateSummary', () => {
  it('should handle null and undefined', () => {
    expect(generateSummary(null)).toBe('null');
    expect(generateSummary(undefined)).toBe('undefined');
  });

  it('should summarize strings with length', () => {
    expect(generateSummary('hello')).toBe('string(5): "hello"');
  });

  it('should truncate long strings in summary', () => {
    const long = 'a'.repeat(500);
    const result = generateSummary(long);
    expect(result).toMatch(/^string\(500\): "a+/);
    expect(result.length).toBeLessThan(200);
  });

  it('should summarize numbers and booleans', () => {
    expect(generateSummary(42)).toBe('number: 42');
    expect(generateSummary(true)).toBe('boolean: true');
  });

  it('should summarize arrays with length', () => {
    expect(generateSummary([1, 2, 3])).toBe('array[3]');
    expect(generateSummary([])).toBe('array[0]');
  });

  it('should summarize typed arrays', () => {
    expect(generateSummary(new Uint8Array(5))).toBe('Uint8Array(5 bytes)');
    expect(generateSummary(new ArrayBuffer(10))).toBe('ArrayBuffer(10 bytes)');
  });

  it('should summarize Error objects', () => {
    const error = new Error('Test error');
    const result = generateSummary(error);
    expect(result).toContain('Error: Error: Test error');
  });

  it('should summarize objects with key count', () => {
    const result = generateSummary({ a: 1, b: 2, c: 3 });
    expect(result).toContain('object{3 keys');
    expect(result).toContain('a, b, c');
  });

  it('should limit object keys in summary', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 10; i++) obj[`key${i}`] = i;
    const result = generateSummary(obj);
    expect(result).toContain('object{10 keys');
    expect(result).toContain('...');
  });
});

describe('batchProcess', () => {
  it('should process items in batches', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = await batchProcess(
      items,
      3,
      async (batch) => batch.map(x => x * 2)
    );
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });

  it('should handle empty array', async () => {
    const results = await batchProcess(
      [],
      5,
      async (batch) => batch
    );
    expect(results).toEqual([]);
  });

  it('should handle single batch', async () => {
    const items = [1, 2, 3];
    const results = await batchProcess(
      items,
      10,
      async (batch) => batch.map(x => x.toString())
    );
    expect(results).toEqual(['1', '2', '3']);
  });

  it('should throw error if processor throws', async () => {
    const items = [1, 2, 3];
    await expect(
      batchProcess(items, 2, async () => {
        throw new Error('Processing failed');
      })
    ).rejects.toThrow('Processing failed');
  });

  it('should work with synchronous processors', async () => {
    const items = [1, 2, 3, 4];
    const results = await batchProcess(
      items,
      2,
      (batch) => batch.map(x => x + 1)
    );
    expect(results).toEqual([2, 3, 4, 5]);
  });

  it('should pass correct batchIndex to processor', async () => {
    const items = [1, 2, 3, 4, 5];
    const batchIndices: number[] = [];
    await batchProcess(items, 2, async (batch, index) => {
      batchIndices.push(index);
      return batch;
    });
    expect(batchIndices).toEqual([1, 2, 3]); // 5 items in batches of 2 → 3 batches
  });
});