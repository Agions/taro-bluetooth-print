/**
 * Edge-case tests for src/utils/normalizeError.ts
 *
 * Goals:
 *  - Cover every branch of `normalizeError` (Error / null / undefined / other).
 *  - Verify that `Error` subclasses pass through unchanged (preserving stack).
 *  - Verify that stringified non-Error values produce an Error with the right message.
 *  - Cover `emitAndThrow` end-to-end: it must emit then throw the normalized error.
 *
 * Target coverage: 80%+
 */
import { describe, test, expect, vi } from 'vitest';
import { normalizeError, emitAndThrow } from '../../src/utils/normalizeError';

describe('normalizeError', () => {
  describe('Error instance pass-through', () => {
    test('returns a plain Error unchanged', () => {
      const err = new Error('boom');
      const result = normalizeError(err);
      expect(result).toBe(err);
      expect(result.message).toBe('boom');
    });

    test('returns a TypeError unchanged and preserves its name', () => {
      const err = new TypeError('bad type');
      const result = normalizeError(err);
      expect(result).toBe(err);
      expect(result).toBeInstanceOf(TypeError);
      expect(result.name).toBe('TypeError');
      expect(result.message).toBe('bad type');
    });

    test('returns a RangeError unchanged', () => {
      const err = new RangeError('out of range');
      const result = normalizeError(err);
      expect(result).toBe(err);
      expect(result).toBeInstanceOf(RangeError);
      expect(result.message).toBe('out of range');
    });

    test('returns a custom error class unchanged', () => {
      class CustomError extends Error {
        constructor(msg: string) {
          super(msg);
          this.name = 'CustomError';
        }
      }
      const err = new CustomError('custom failure');
      const result = normalizeError(err);
      expect(result).toBe(err);
      expect(result).toBeInstanceOf(CustomError);
      expect(result.name).toBe('CustomError');
      expect(result.message).toBe('custom failure');
    });

    test('preserves the stack trace of an Error', () => {
      const err = new Error('with stack');
      const result = normalizeError(err);
      expect(result.stack).toBe(err.stack);
      expect(typeof result.stack).toBe('string');
      expect(result.stack).toContain('Error: with stack');
    });

    test('preserves stack trace of subclassed errors', () => {
      const err = new TypeError('typed');
      const result = normalizeError(err);
      expect(result.stack).toBe(err.stack);
      expect(result.stack).toContain('TypeError: typed');
    });

    test('does not wrap an Error even when the message is empty', () => {
      const err = new Error('');
      const result = normalizeError(err);
      expect(result).toBe(err);
    });
  });

  describe('null / undefined handling', () => {
    test('wraps null into an Error with the null-or-undefined message', () => {
      const result = normalizeError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error (null or undefined)');
    });

    test('wraps undefined into an Error with the null-or-undefined message', () => {
      const result = normalizeError(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error (null or undefined)');
    });

    test('does not return the same instance for null (creates a new Error)', () => {
      const result = normalizeError(null);
      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });
  });

  describe('non-Error values are stringified', () => {
    test('wraps a string into an Error with the same message', () => {
      const result = normalizeError('something went wrong');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('something went wrong');
    });

    test('wraps an empty string into an Error with empty message', () => {
      const result = normalizeError('');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('');
    });

    test('wraps a number into an Error with the number stringified', () => {
      const result = normalizeError(42);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('42');
    });

    test('wraps 0 into an Error with message "0"', () => {
      const result = normalizeError(0);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('0');
    });

    test('wraps a boolean into an Error', () => {
      const t = normalizeError(true);
      const f = normalizeError(false);
      expect(t).toBeInstanceOf(Error);
      expect(t.message).toBe('true');
      expect(f.message).toBe('false');
    });

    test('wraps a plain object into an Error using String() coercion', () => {
      const result = normalizeError({ foo: 'bar' });
      expect(result).toBeInstanceOf(Error);
      // String({foo:'bar'}) === '[object Object]'
      expect(result.message).toBe('[object Object]');
    });

    test('wraps an array into an Error with comma-joined values', () => {
      const result = normalizeError([1, 2, 3]);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('1,2,3');
    });

    test('wraps a Symbol into an Error using String()', () => {
      const result = normalizeError(Symbol('x'));
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Symbol(x)');
    });
  });

  describe('emitAndThrow', () => {
    test('emits the normalized error and then throws it', () => {
      const emit = vi.fn();
      const cause = new Error('inner cause');
      expect(() => emitAndThrow(cause, emit)).toThrow(cause);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith('error', cause);
    });

    test('normalizes a non-Error before emitting and throwing', () => {
      const emit = vi.fn();
      let caught: unknown;
      try {
        emitAndThrow('boom-string', emit);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe('boom-string');
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith('error', caught);
    });

    test('emits the same Error instance it throws for Error inputs', () => {
      const emit = vi.fn();
      const cause = new TypeError('typed');
      let caught: unknown;
      try {
        emitAndThrow(cause, emit);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBe(cause);
      const [event, payload] = emit.mock.calls[0]!;
      expect(event).toBe('error');
      expect(payload).toBe(cause);
    });

    test('emits before throwing (emit is called even though throw follows)', () => {
      const order: string[] = [];
      const emit = vi.fn(() => {
        order.push('emit');
      });
      try {
        emitAndThrow(new Error('x'), emit);
      } catch {
        order.push('catch');
      }
      expect(order).toEqual(['emit', 'catch']);
    });
  });
});
