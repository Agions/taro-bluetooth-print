/**
 * Unit tests for Logger
 */

import { Logger, LogLevel } from '../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Reset to default level
    Logger.setLevel(LogLevel.WARN);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('setLevel / getLevel', () => {
    it('should set and get log level', () => {
      Logger.setLevel(LogLevel.DEBUG);
      expect(Logger.getLevel()).toBe(LogLevel.DEBUG);

      Logger.setLevel(LogLevel.ERROR);
      expect(Logger.getLevel()).toBe(LogLevel.ERROR);

      Logger.setLevel(LogLevel.NONE);
      expect(Logger.getLevel()).toBe(LogLevel.NONE);
    });
  });

  describe('debug', () => {
    it('should log when level is DEBUG', () => {
      Logger.setLevel(LogLevel.DEBUG);
      Logger.debug('Debug message', { data: 123 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TaroBTPrint] [DEBUG]',
        'Debug message',
        { data: 123 }
      );
    });

    it('should not log when level is INFO or higher', () => {
      Logger.setLevel(LogLevel.INFO);
      Logger.debug('Debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log when level is INFO or lower', () => {
      Logger.setLevel(LogLevel.INFO);
      Logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[TaroBTPrint] [INFO]', 'Info message');
    });

    it('should not log when level is WARN or higher', () => {
      Logger.setLevel(LogLevel.WARN);
      Logger.info('Info message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log when level is WARN or lower', () => {
      Logger.setLevel(LogLevel.WARN);
      Logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[TaroBTPrint] [WARN]', 'Warning message');
    });

    it('should not log when level is ERROR or higher', () => {
      Logger.setLevel(LogLevel.ERROR);
      Logger.warn('Warning message');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log when level is ERROR or lower', () => {
      Logger.setLevel(LogLevel.ERROR);
      Logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[TaroBTPrint] [ERROR]', 'Error message');
    });

    it('should not log when level is NONE', () => {
      Logger.setLevel(LogLevel.NONE);
      Logger.error('Error message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('scope', () => {
    it('should create scoped logger with custom prefix', () => {
      Logger.setLevel(LogLevel.DEBUG);
      const scoped = Logger.scope('TestModule');

      scoped.debug('Debug from module');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[TaroBTPrint]:TestModule [DEBUG]',
        'Debug from module'
      );
    });

    it('should respect global log level', () => {
      Logger.setLevel(LogLevel.WARN);
      const scoped = Logger.scope('TestModule');

      scoped.debug('Debug from module');
      scoped.info('Info from module');
      scoped.warn('Warning from module');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
