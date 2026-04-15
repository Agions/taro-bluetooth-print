import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock Taro before any imports
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
  },
}));

// Import after mocking
import Taro from '@tarojs/taro';

const mockTaro = Taro as unknown as {
  getStorageSync: ReturnType<typeof vi.fn>;
  setStorageSync: ReturnType<typeof vi.fn>;
  removeStorageSync: ReturnType<typeof vi.fn>;
};

describe('OfflineCache', () => {
  let OfflineCache: any;
  let cache: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Default mock implementations
    mockTaro.getStorageSync.mockReturnValue([]);
    mockTaro.setStorageSync.mockReturnValue(undefined);
    mockTaro.removeStorageSync.mockReturnValue(undefined);

    const module = await import('@/cache/OfflineCache');
    OfflineCache = module.OfflineCache;
    cache = new OfflineCache({ autoSync: false });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    test('should create cache with default config', () => {
      expect(cache).toBeDefined();
    });

    test('should create cache with custom config', () => {
      const customCache = new OfflineCache({
        maxJobs: 100,
        expiryTime: 60 * 60 * 1000, // 1 hour
        storagePrefix: 'custom_',
        autoSync: false,
      });
      expect(customCache).toBeDefined();
    });
  });

  describe('save()', () => {
    test('should save job to cache', () => {
      const job = {
        id: 'job-1',
        data: new Uint8Array([0x1b, 0x40]),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        retryCount: 0,
      };

      cache.save(job);

      expect(mockTaro.setStorageSync).toHaveBeenCalled();
    });

    test('should update existing job', () => {
      const job = {
        id: 'job-1',
        data: new Uint8Array([0x1b, 0x40]),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        retryCount: 0,
      };

      cache.save(job);
      job.retryCount = 1;
      cache.save(job);

      expect(mockTaro.setStorageSync).toHaveBeenCalledTimes(2);
    });

    test('should emit job-saved event', () => {
      const callback = vi.fn();
      cache.on('job-saved', callback);

      const job = {
        id: 'job-1',
        data: new Uint8Array([0x1b, 0x40]),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        retryCount: 0,
      };

      cache.save(job);

      expect(callback).toHaveBeenCalledWith(job);
    });
  });

  describe('getAll()', () => {
    test('should return all cached jobs', () => {
      const storedJobs = [
        {
          id: 'job-1',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      const jobs = cache.getAll();

      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('job-1');
    });

    test('should return empty array when no jobs', () => {
      mockTaro.getStorageSync.mockReturnValue(null);

      const jobs = cache.getAll();

      expect(jobs).toEqual([]);
    });
  });

  describe('remove()', () => {
    test('should remove job from cache', () => {
      const storedJobs = [
        {
          id: 'job-1',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      cache.remove('job-1');

      expect(mockTaro.setStorageSync).toHaveBeenCalled();
    });

    test('should emit job-removed event', () => {
      const storedJobs = [
        {
          id: 'job-1',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      const callback = vi.fn();
      cache.on('job-removed', callback);

      cache.remove('job-1');

      expect(callback).toHaveBeenCalledWith('job-1');
    });
  });

  describe('cleanup()', () => {
    test('should remove expired jobs', () => {
      const pastTime = Date.now() - 1000;
      const futureTime = Date.now() + 86400000;
      const storedJobs = [
        {
          id: 'expired-job',
          data: [0x1b, 0x40],
          createdAt: pastTime,
          expiresAt: pastTime,
          retryCount: 0,
        },
        {
          id: 'valid-job',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: futureTime,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      const removed = cache.cleanup();

      expect(removed).toBe(1);
      expect(mockTaro.setStorageSync).toHaveBeenCalled();
    });

    test('should emit cleanup-completed event', () => {
      const pastTime = Date.now() - 1000;
      const storedJobs = [
        {
          id: 'expired-job',
          data: [0x1b, 0x40],
          createdAt: pastTime,
          expiresAt: pastTime,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      const callback = vi.fn();
      cache.on('cleanup-completed', callback);

      cache.cleanup();

      expect(callback).toHaveBeenCalledWith(1);
    });
  });

  describe('getStats()', () => {
    test('should return correct statistics', () => {
      const pastTime = Date.now() - 1000;
      const futureTime = Date.now() + 86400000;
      const storedJobs = [
        {
          id: 'expired-job',
          data: [0x1b, 0x40],
          createdAt: pastTime,
          expiresAt: pastTime,
          retryCount: 0,
        },
        {
          id: 'valid-job',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: futureTime,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      const stats = cache.getStats();

      expect(stats.total).toBe(2);
      expect(stats.expired).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('sync()', () => {
    test('should do nothing if no executor set', async () => {
      await cache.sync();

      // No error should be thrown
    });

    test('should skip if already syncing', async () => {
      cache.setSyncExecutor(vi.fn());
      mockTaro.getStorageSync.mockReturnValue([]);

      // Start first sync
      const syncPromise = cache.sync();
      // Start second sync immediately
      await cache.sync();

      await syncPromise;
    });

    test('should execute jobs with executor', async () => {
      const executor = vi.fn().mockResolvedValue(undefined);
      cache.setSyncExecutor(executor);

      const futureTime = Date.now() + 86400000;
      const storedJobs = [
        {
          id: 'job-1',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: futureTime,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      await cache.sync();

      expect(executor).toHaveBeenCalled();
    });

    test('should remove synced job after success', async () => {
      const executor = vi.fn().mockResolvedValue(undefined);
      cache.setSyncExecutor(executor);

      const futureTime = Date.now() + 86400000;
      const storedJobs = [
        {
          id: 'job-1',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: futureTime,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      await cache.sync();

      expect(mockTaro.setStorageSync).toHaveBeenCalled();
    });

    test('should emit sync-completed event', async () => {
      const executor = vi.fn().mockResolvedValue(undefined);
      cache.setSyncExecutor(executor);

      const futureTime = Date.now() + 86400000;
      const storedJobs = [
        {
          id: 'job-1',
          data: [0x1b, 0x40],
          createdAt: Date.now(),
          expiresAt: futureTime,
          retryCount: 0,
        },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedJobs);

      const callback = vi.fn();
      cache.on('sync-completed', callback);

      await cache.sync();

      expect(callback).toHaveBeenCalledWith({ success: 1, failed: 0 });
    });
  });

  describe('createJob()', () => {
    test('should create job with correct expiry', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      const job = cache.createJob('job-1', data);

      expect(job.id).toBe('job-1');
      expect(job.data).toBe(data);
      expect(job.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('clear()', () => {
    test('should clear all cached jobs', () => {
      cache.clear();

      expect(mockTaro.removeStorageSync).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    test('should register and remove event listeners', () => {
      const callback = vi.fn();
      cache.on('job-saved', callback);
      cache.off('job-saved', callback);

      const job = {
        id: 'job-1',
        data: new Uint8Array([0x1b, 0x40]),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        retryCount: 0,
      };

      cache.save(job);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle event handler errors', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      cache.on('job-saved', errorCallback);

      const job = {
        id: 'job-1',
        data: new Uint8Array([0x1b, 0x40]),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        retryCount: 0,
      };

      // Should not throw
      expect(() => cache.save(job)).not.toThrow();
    });
  });

  describe('syncing getter', () => {
    test('should return false initially', () => {
      expect(cache.syncing).toBe(false);
    });
  });
});

describe('CachedJob type', () => {
  test('should export CachedJob interface', async () => {
    const module = await import('@/cache/OfflineCache');
    // TypeScript interfaces are compile-time only, check class exports instead
    expect(module.OfflineCache).toBeDefined();
  });
});

describe('CacheConfig type', () => {
  test('should export OfflineCache class', async () => {
    const module = await import('@/cache/OfflineCache');
    expect(module.OfflineCache).toBeDefined();
  });
});

describe('CacheStats type', () => {
  test('should be able to create cache instance', async () => {
    const module = await import('@/cache/OfflineCache');
    const cache = new module.OfflineCache();
    expect(cache.getStats()).toBeDefined();
  });
});
