import { describe, it, expect } from 'vitest';
import * as tokens from '../../src/core/di/Tokens';

describe('DI Tokens', () => {
  describe('Adapter tokens', () => {
    it('should export ADAPTER_TOKEN', () => {
      expect(tokens.ADAPTER_TOKEN).toBeDefined();
      expect(typeof tokens.ADAPTER_TOKEN).toBe('symbol');
    });

    it('should export ADAPTER_FACTORY_TOKEN', () => {
      expect(tokens.ADAPTER_FACTORY_TOKEN).toBeDefined();
      expect(typeof tokens.ADAPTER_FACTORY_TOKEN).toBe('symbol');
    });
  });

  describe('Driver tokens', () => {
    it('should export DRIVER_TOKEN', () => {
      expect(tokens.DRIVER_TOKEN).toBeDefined();
      expect(typeof tokens.DRIVER_TOKEN).toBe('symbol');
    });

    it('should export DRIVER_FACTORY_TOKEN', () => {
      expect(tokens.DRIVER_FACTORY_TOKEN).toBeDefined();
      expect(typeof tokens.DRIVER_FACTORY_TOKEN).toBe('symbol');
    });
  });

  describe('Service tokens', () => {
    it('should export DEVICE_MANAGER_TOKEN', () => {
      expect(tokens.DEVICE_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.DEVICE_MANAGER_TOKEN).toBe('symbol');
    });

    it('should export CONNECTION_MANAGER_TOKEN', () => {
      expect(tokens.CONNECTION_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.CONNECTION_MANAGER_TOKEN).toBe('symbol');
    });

    it('should export PRINT_JOB_MANAGER_TOKEN', () => {
      expect(tokens.PRINT_JOB_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.PRINT_JOB_MANAGER_TOKEN).toBe('symbol');
    });

    it('should export PRINT_QUEUE_TOKEN', () => {
      expect(tokens.PRINT_QUEUE_TOKEN).toBeDefined();
      expect(typeof tokens.PRINT_QUEUE_TOKEN).toBe('symbol');
    });

    it('should export OFFLINE_CACHE_TOKEN', () => {
      expect(tokens.OFFLINE_CACHE_TOKEN).toBeDefined();
      expect(typeof tokens.OFFLINE_CACHE_TOKEN).toBe('symbol');
    });

    it('should export CONFIG_MANAGER_TOKEN', () => {
      expect(tokens.CONFIG_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.CONFIG_MANAGER_TOKEN).toBe('symbol');
    });
  });

  describe('New service tokens', () => {
    it('should export COMMAND_BUILDER_TOKEN', () => {
      expect(tokens.COMMAND_BUILDER_TOKEN).toBeDefined();
      expect(typeof tokens.COMMAND_BUILDER_TOKEN).toBe('symbol');
    });

    it('should export PRINTER_STATUS_TOKEN', () => {
      expect(tokens.PRINTER_STATUS_TOKEN).toBeDefined();
      expect(typeof tokens.PRINTER_STATUS_TOKEN).toBe('symbol');
    });

    it('should export PRINT_HISTORY_TOKEN', () => {
      expect(tokens.PRINT_HISTORY_TOKEN).toBeDefined();
      expect(typeof tokens.PRINT_HISTORY_TOKEN).toBe('symbol');
    });

    it('should export PRINT_STATISTICS_TOKEN', () => {
      expect(tokens.PRINT_STATISTICS_TOKEN).toBeDefined();
      expect(typeof tokens.PRINT_STATISTICS_TOKEN).toBe('symbol');
    });

    it('should export CLOUD_PRINT_MANAGER_TOKEN', () => {
      expect(tokens.CLOUD_PRINT_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.CLOUD_PRINT_MANAGER_TOKEN).toBe('symbol');
    });

    it('should export SCHEDULED_RETRY_MANAGER_TOKEN', () => {
      expect(tokens.SCHEDULED_RETRY_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.SCHEDULED_RETRY_MANAGER_TOKEN).toBe('symbol');
    });

    it('should export BATCH_PRINT_MANAGER_TOKEN', () => {
      expect(tokens.BATCH_PRINT_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.BATCH_PRINT_MANAGER_TOKEN).toBe('symbol');
    });
  });

  describe('Utility tokens', () => {
    it('should export LOGGER_TOKEN', () => {
      expect(tokens.LOGGER_TOKEN).toBeDefined();
      expect(typeof tokens.LOGGER_TOKEN).toBe('symbol');
    });

    it('should export ENCODING_SERVICE_TOKEN', () => {
      expect(tokens.ENCODING_SERVICE_TOKEN).toBeDefined();
      expect(typeof tokens.ENCODING_SERVICE_TOKEN).toBe('symbol');
    });

    it('should export IMAGE_PROCESSING_TOKEN', () => {
      expect(tokens.IMAGE_PROCESSING_TOKEN).toBeDefined();
      expect(typeof tokens.IMAGE_PROCESSING_TOKEN).toBe('symbol');
    });

    it('should export BARCODE_GENERATOR_TOKEN', () => {
      expect(tokens.BARCODE_GENERATOR_TOKEN).toBeDefined();
      expect(typeof tokens.BARCODE_GENERATOR_TOKEN).toBe('symbol');
    });

    it('should export TEMPLATE_ENGINE_TOKEN', () => {
      expect(tokens.TEMPLATE_ENGINE_TOKEN).toBeDefined();
      expect(typeof tokens.TEMPLATE_ENGINE_TOKEN).toBe('symbol');
    });
  });

  describe('System tokens', () => {
    it('should export EVENT_BUS_TOKEN', () => {
      expect(tokens.EVENT_BUS_TOKEN).toBeDefined();
      expect(typeof tokens.EVENT_BUS_TOKEN).toBe('symbol');
    });

    it('should export PLUGIN_MANAGER_TOKEN', () => {
      expect(tokens.PLUGIN_MANAGER_TOKEN).toBeDefined();
      expect(typeof tokens.PLUGIN_MANAGER_TOKEN).toBe('symbol');
    });

    it('should export PERFORMANCE_MONITOR_TOKEN', () => {
      expect(tokens.PERFORMANCE_MONITOR_TOKEN).toBeDefined();
      expect(typeof tokens.PERFORMANCE_MONITOR_TOKEN).toBe('symbol');
    });
  });

  describe('Token uniqueness', () => {
    it('should have unique symbol values', () => {
      const tokenKeys = Object.keys(tokens);
      const tokenSymbols = tokenKeys.map(k => tokens[k as keyof typeof tokens]);
      
      // All symbols should be unique
      const uniqueSymbols = new Set(tokenSymbols);
      expect(uniqueSymbols.size).toBe(tokenSymbols.length);
    });
  });
});