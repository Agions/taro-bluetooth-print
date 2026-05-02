/**
 * Printer Config Tests
 *
 * Tests for configuration types and merge function
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, mergeConfig, PrinterConfig } from '@/config/PrinterConfig';
import { LogLevel } from '@/utils/logger';

describe('PrinterConfig', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have default adapter settings', () => {
      expect(DEFAULT_CONFIG.adapter.chunkSize).toBe(20);
      expect(DEFAULT_CONFIG.adapter.delay).toBe(20);
      expect(DEFAULT_CONFIG.adapter.retries).toBe(3);
      expect(DEFAULT_CONFIG.adapter.timeout).toBe(10000);
    });

    it('should have default driver settings', () => {
      expect(DEFAULT_CONFIG.driver.encoding).toBe('GBK');
      expect(DEFAULT_CONFIG.driver.paperWidth).toBe(58);
    });

    it('should have default logging level WARN', () => {
      expect(DEFAULT_CONFIG.logging.level).toBe(LogLevel.WARN);
    });
  });

  describe('mergeConfig', () => {
    it('should return defaults when no overrides provided', () => {
      const result = mergeConfig({}, {});
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should merge partial adapter config', () => {
      const result = mergeConfig({ adapter: { chunkSize: 100 } }, {});
      expect(result.adapter.chunkSize).toBe(100);
      expect(result.adapter.delay).toBe(20); // unchanged
    });

    it('should merge partial driver config', () => {
      const result = mergeConfig({}, { driver: { paperWidth: 80 } });
      expect(result.driver.paperWidth).toBe(80);
      expect(result.driver.encoding).toBe('GBK'); // unchanged
    });

    it('should merge logging config', () => {
      const result = mergeConfig({}, { logging: { level: LogLevel.DEBUG } });
      expect(result.logging.level).toBe(LogLevel.DEBUG);
    });

    it('should merge target and source with source taking priority', () => {
      const result = mergeConfig(
        { adapter: { chunkSize: 50 } },
        { adapter: { chunkSize: 100 } }
      );
      expect(result.adapter.chunkSize).toBe(100); // source wins
    });

    it('should merge all sections independently', () => {
      const result = mergeConfig(
        {
          adapter: { chunkSize: 64, delay: 10 },
          driver: { encoding: 'UTF-8' },
        },
        {
          adapter: { retries: 5 },
          logging: { level: LogLevel.DEBUG },
        }
      );
      expect(result.adapter.chunkSize).toBe(64);
      expect(result.adapter.delay).toBe(10);
      expect(result.adapter.retries).toBe(5);
      expect(result.driver.encoding).toBe('UTF-8');
      expect(result.logging.level).toBe(LogLevel.DEBUG);
    });
  });
});