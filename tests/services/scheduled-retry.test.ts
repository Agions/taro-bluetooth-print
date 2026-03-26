import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock @tarojs/taro at the top to prevent it from being loaded
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    getStorageInfoSync: vi.fn(),
  },
}));

// Mock the OfflineCache module
vi.mock('../../src/cache/OfflineCache', () => {
  return {
    OfflineCache: class MockOfflineCache {
      save = vi.fn();
      remove = vi.fn();
      get = vi.fn();
      getAll = vi.fn(() => []);
      clear = vi.fn();
    },
  };
});

// Now import the module under test
import { ScheduledRetryManager } from '../../src/services/ScheduledRetryManager';

describe('ScheduledRetryManager', () => {
  let manager: ScheduledRetryManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new ScheduledRetryManager({ autoRestore: false, persistEnabled: false });
  });

  afterEach(() => {
    manager.clearAll();
    manager.destroy();
    vi.useRealTimers();
  });

  describe('scheduleRetry()', () => {
    it('should schedule a retry at specified time', () => {
      const runAt = new Date(Date.now() + 5000);
      manager.scheduleRetry('job-1', runAt);
      expect(manager.hasScheduledRetry('job-1')).toBe(true);
    });

    it('should return pending retries list', () => {
      const runAt = new Date(Date.now() + 5000);
      manager.scheduleRetry('job-1', runAt);
      const retries = manager.getScheduledRetries();
      expect(Array.isArray(retries)).toBe(true);
      expect(retries.length).toBe(1);
      expect(retries[0]?.jobId).toBe('job-1');
    });

    it('should include runAt time in scheduled retry', () => {
      const runAt = new Date(Date.now() + 10000);
      manager.scheduleRetry('job-1', runAt);
      const retry = manager.getScheduledRetry('job-1');
      expect(retry).toBeDefined();
      expect(retry?.runAt.getTime()).toBe(runAt.getTime());
    });

    it('should replace existing retry when rescheduled', () => {
      const runAt1 = new Date(Date.now() + 10000);
      const runAt2 = new Date(Date.now() + 20000);
      manager.scheduleRetry('job-1', runAt1);
      manager.scheduleRetry('job-1', runAt2);
      const retries = manager.getScheduledRetries();
      expect(retries.length).toBe(1);
      expect(retries[0]?.runAt.getTime()).toBe(runAt2.getTime());
    });

    it('should use default retry options when not specified', () => {
      const runAt = new Date(Date.now() + 5000);
      manager.scheduleRetry('job-1', runAt);
      const retry = manager.getScheduledRetry('job-1');
      expect(retry?.maxAttempts).toBe(5);
      expect(retry?.baseDelay).toBe(1000);
      expect(retry?.maxDelay).toBe(60000);
    });

    it('should use custom retry options when specified', () => {
      const runAt = new Date(Date.now() + 5000);
      manager.scheduleRetry('job-1', runAt, {
        maxAttempts: 10,
        baseDelay: 500,
        maxDelay: 30000,
      });
      const retry = manager.getScheduledRetry('job-1');
      expect(retry?.maxAttempts).toBe(10);
      expect(retry?.baseDelay).toBe(500);
      expect(retry?.maxDelay).toBe(30000);
    });
  });

  describe('scheduleRetryWithBackoff()', () => {
    it('should schedule retry with exponential delay', () => {
      manager.scheduleRetryWithBackoff('job-1', { baseDelay: 1000, maxDelay: 60000 });
      expect(manager.hasScheduledRetry('job-1')).toBe(true);
      const retry = manager.getScheduledRetry('job-1');
      expect(retry?.attemptCount).toBe(1);
    });

    it('should increment attempt count on backoff', () => {
      manager.scheduleRetryWithBackoff('job-1', { baseDelay: 1000 });
      const firstEntry = manager.getScheduledRetry('job-1');
      expect(firstEntry?.attemptCount).toBe(1);
      manager.scheduleRetryWithBackoff('job-1', { baseDelay: 1000 });
      const secondEntry = manager.getScheduledRetry('job-1');
      expect(secondEntry?.attemptCount).toBe(2);
    });

    it('should cap delay at maxDelay', () => {
      manager.scheduleRetryWithBackoff('job-1', {
        baseDelay: 10000,
        maxDelay: 15000,
        maxAttempts: 10,
      });
      const retry = manager.getScheduledRetry('job-1');
      const delay = retry?.runAt.getTime() - Date.now();
      expect(delay).toBeLessThanOrEqual(15000 + 200);
    });

    it('should use custom options when provided', () => {
      manager.scheduleRetryWithBackoff('job-1', {
        baseDelay: 500,
        maxDelay: 10000,
        maxAttempts: 3,
      });
      const retry = manager.getScheduledRetry('job-1');
      expect(retry?.baseDelay).toBe(500);
      expect(retry?.maxDelay).toBe(10000);
      expect(retry?.maxAttempts).toBe(3);
    });
  });

  describe('cancelRetry()', () => {
    it('should cancel a scheduled retry', () => {
      const runAt = new Date(Date.now() + 10000);
      manager.scheduleRetry('job-1', runAt);
      const result = manager.cancelRetry('job-1');
      expect(result).toBe(true);
      expect(manager.hasScheduledRetry('job-1')).toBe(false);
    });

    it('should return false when no retry to cancel', () => {
      const result = manager.cancelRetry('non-existent-job');
      expect(result).toBe(false);
    });

    it('should remove from pending list after cancellation', () => {
      const runAt = new Date(Date.now() + 10000);
      manager.scheduleRetry('job-1', runAt);
      manager.cancelRetry('job-1');
      const retries = manager.getScheduledRetries();
      expect(retries.length).toBe(0);
    });
  });

  describe('getScheduledRetries()', () => {
    it('should return empty array when no retries scheduled', () => {
      const retries = manager.getScheduledRetries();
      expect(Array.isArray(retries)).toBe(true);
      expect(retries.length).toBe(0);
    });

    it('should return all scheduled retries', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      manager.scheduleRetry('job-2', new Date(Date.now() + 6000));
      manager.scheduleRetry('job-3', new Date(Date.now() + 7000));
      const retries = manager.getScheduledRetries();
      expect(retries.length).toBe(3);
    });

    it('should not include internal timeout in returned data', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      const retries = manager.getScheduledRetries();
      expect(retries[0]).not.toHaveProperty('timeout');
    });
  });

  describe('hasScheduledRetry()', () => {
    it('should return true for scheduled retry', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      expect(manager.hasScheduledRetry('job-1')).toBe(true);
    });

    it('should return false for non-existent job', () => {
      expect(manager.hasScheduledRetry('non-existent')).toBe(false);
    });

    it('should return false after cancellation', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      manager.cancelRetry('job-1');
      expect(manager.hasScheduledRetry('job-1')).toBe(false);
    });
  });

  describe('clearAll()', () => {
    it('should clear all scheduled retries', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      manager.scheduleRetry('job-2', new Date(Date.now() + 6000));
      manager.clearAll();
      expect(manager.getScheduledRetries().length).toBe(0);
    });

    it('should reset pending count to zero', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      manager.scheduleRetry('job-2', new Date(Date.now() + 6000));
      manager.clearAll();
      expect(manager.pendingCount).toBe(0);
    });
  });

  describe('pendingCount', () => {
    it('should return correct count of pending retries', () => {
      expect(manager.pendingCount).toBe(0);
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      expect(manager.pendingCount).toBe(1);
      manager.scheduleRetry('job-2', new Date(Date.now() + 6000));
      expect(manager.pendingCount).toBe(2);
      manager.cancelRetry('job-1');
      expect(manager.pendingCount).toBe(1);
    });
  });

  describe('getScheduledRetry()', () => {
    it('should return retry entry without timeout', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000), {
        maxAttempts: 3,
        baseDelay: 500,
        maxDelay: 5000,
      });
      const retry = manager.getScheduledRetry('job-1');
      expect(retry).toBeDefined();
      expect(retry?.jobId).toBe('job-1');
      expect(retry?.maxAttempts).toBe(3);
      expect(retry?.timeout).toBeUndefined();
    });

    it('should return undefined for non-existent job', () => {
      const retry = manager.getScheduledRetry('non-existent');
      expect(retry).toBeUndefined();
    });
  });

  describe('destroy()', () => {
    it('should clear all retries on destroy', () => {
      manager.scheduleRetry('job-1', new Date(Date.now() + 5000));
      manager.scheduleRetry('job-2', new Date(Date.now() + 6000));
      manager.destroy();
      expect(manager.pendingCount).toBe(0);
    });
  });
});
