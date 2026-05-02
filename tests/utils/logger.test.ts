/**
 * Logger Tests
 *
 * Tests for the Logger class
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel } from '@/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset to defaults before each test
    Logger.setLevel(LogLevel.WARN);
    Logger.configure({ handler: undefined, prefix: '[TaroBTPrint]', useSummaryMode: false });

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should not log debug messages by default (level = WARN)', () => {
      Logger.debug('debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages by default (level = WARN)', () => {
      Logger.info('info message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages by default', () => {
      Logger.warn('warn message');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TaroBTPrint] [WARN]'),
        'warn message'
      );
    });

    it('should log error messages by default', () => {
      Logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TaroBTPrint] [ERROR]'),
        'error message'
      );
    });
  });

  describe('setLevel', () => {
    it('should respect DEBUG level', () => {
      Logger.setLevel(LogLevel.DEBUG);
      Logger.debug('debug message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should respect INFO level', () => {
      Logger.setLevel(LogLevel.INFO);
      Logger.info('info message');
      expect(consoleLogSpy).toHaveBeenCalled();
      Logger.debug('debug message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // only info, not debug
    });

    it('should respect NONE level (suppress all)', () => {
      Logger.setLevel(LogLevel.NONE);
      Logger.error('error message');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return current level', () => {
      Logger.setLevel(LogLevel.DEBUG);
      expect(Logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('configure', () => {
    it('should set custom prefix', () => {
      Logger.configure({ prefix: '[Custom]' });
      Logger.warn('test');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Custom]'),
        'test'
      );
    });

    it('should use custom handler when provided', () => {
      const handler = vi.fn();
      Logger.configure({ handler });
      Logger.warn('test message');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.WARN,
          message: 'test message',
        })
      );
      // Should NOT fallback to console when custom handler is set
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('scope', () => {
    it('should create scoped logger with prefix', () => {
      const scope = Logger.scope('MyScope');
      scope.warn('scoped message');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TaroBTPrint]:MyScope'),
        'scoped message'
      );
    });

    it('should respect global log level', () => {
      Logger.setLevel(LogLevel.ERROR);
      const scope = Logger.scope('Test');
      scope.info('should not appear');
      scope.error('should appear');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('log with args', () => {
    it('should forward additional arguments', () => {
      Logger.setLevel(LogLevel.DEBUG);
      Logger.debug('test', { key: 'value' }, 42);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        'test',
        expect.stringContaining('"key":"value"'), // arguments are serialized by truncateForLog
        '42'
      );
    });

    it('should process args in summary mode', () => {
      Logger.configure({ useSummaryMode: true });
      Logger.setLevel(LogLevel.DEBUG);
      Logger.debug('test', { key: 'value' }, [1, 2, 3]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        'test',
        expect.stringContaining('object{'),
        expect.stringContaining('array[')
      );
    });
  });
});