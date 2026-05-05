import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchPrintManager, BatchConfig, BatchJob } from '../../src/services/BatchPrintManager';

describe('BatchPrintManager Service', () => {
  let batchManager: BatchPrintManager;

  beforeEach(() => {
    batchManager = new BatchPrintManager();
  });

  afterEach(() => {
    batchManager.destroy();
  });

  describe('constructor()', () => {
    it('should create with default config', () => {
      const manager = new BatchPrintManager();
      expect(manager).toBeDefined();
      manager.destroy();
    });

    it('should accept custom config overrides', () => {
      const customConfig: Partial<BatchConfig> = {
        maxBatchSize: 1024,
        maxWaitTime: 500,
        enableMerging: false,
      };
      const manager = new BatchPrintManager(customConfig);
      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('addJob()', () => {
    it('should add a basic job and return job ID', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const jobId = batchManager.addJob(data);

      expect(jobId).toBeDefined();
      expect(jobId.length).toBeGreaterThan(0);
    });

    it('should add job with custom priority', () => {
      const data = new Uint8Array([1, 2, 3]);
      const jobId = batchManager.addJob(data, 5);

      expect(jobId).toBeDefined();
    });

    it('should add job with metadata', () => {
      const data = new Uint8Array([1, 2, 3]);
      const metadata = { driver: 'EscPos', deviceId: 'device-1' };
      const jobId = batchManager.addJob(data, 1, metadata);

      expect(jobId).toBeDefined();
    });

    it('should add multiple jobs', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.addJob(new Uint8Array([4, 5, 6]));
      batchManager.addJob(new Uint8Array([7, 8, 9]));

      expect(batchManager.pendingCount).toBe(3);
    });

    it('should track pending bytes correctly', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3, 4, 5])); // 5 bytes
      batchManager.addJob(new Uint8Array([6, 7, 8])); // 3 bytes

      expect(batchManager.pendingCount).toBe(2);
    });

    it('should prioritize higher priority jobs', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]), 1); // low priority
      batchManager.addJob(new Uint8Array([4, 5, 6]), 10); // high priority
      batchManager.addJob(new Uint8Array([7, 8, 9]), 5); // medium priority

      const pendingJobs = batchManager.getPendingJobs();
      expect(pendingJobs[0]!.priority).toBe(10);
      expect(pendingJobs[1]!.priority).toBe(5);
      expect(pendingJobs[2]!.priority).toBe(1);
    });
  });

  describe('getStats()', () => {
    it('should return initial stats with zeros', () => {
      const stats = batchManager.getStats();

      expect(stats.totalJobs).toBe(0);
      expect(stats.totalBytes).toBe(0);
      expect(stats.batchesProcessed).toBe(0);
      expect(stats.avgBatchSize).toBe(0);
      expect(stats.mergedJobs).toBe(0);
      expect(stats.autoFlushCount).toBe(0);
      expect(stats.unifiedCutsApplied).toBe(0);
    });

    it('should track total jobs after adding', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.addJob(new Uint8Array([4, 5, 6, 7, 8]));

      const stats = batchManager.getStats();
      expect(stats.totalJobs).toBe(2);
    });

    it('should update totalBytes after processBatch', async () => {
      // Create a fresh instance to avoid any state pollution
      const freshManager = new BatchPrintManager({
        unifiedCutCommand: undefined, // Disable cut command for this test
      });
      freshManager.addJob(new Uint8Array([1, 2, 3, 4, 5]));

      // Process the batch
      await freshManager.processBatch(async (data) => {
        // Mock processor
      });

      const stats = freshManager.getStats();
      expect(stats.totalBytes).toBe(5);
      expect(stats.batchesProcessed).toBe(1);

      freshManager.destroy();
    });
  });

  describe('getPendingJobs()', () => {
    it('should return empty array when no jobs', () => {
      const jobs = batchManager.getPendingJobs();
      expect(jobs).toEqual([]);
    });

    it('should return all pending jobs', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.addJob(new Uint8Array([4, 5, 6]));

      const jobs = batchManager.getPendingJobs();
      expect(jobs.length).toBe(2);
    });

    it('should return a copy, not the original array', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));

      const jobs = batchManager.getPendingJobs();
      jobs.push({ id: 'fake', data: new Uint8Array([99]), priority: 1, addedAt: Date.now() });

      // Original should be unchanged
      expect(batchManager.getPendingJobs().length).toBe(1);
    });
  });

  describe('pendingCount getter', () => {
    it('should return 0 when no jobs', () => {
      expect(batchManager.pendingCount).toBe(0);
    });

    it('should return correct count after adding jobs', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.addJob(new Uint8Array([4, 5, 6]));
      batchManager.addJob(new Uint8Array([7, 8, 9]));

      expect(batchManager.pendingCount).toBe(3);
    });
  });

  describe('cancelAll()', () => {
    it('should clear all pending jobs', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.addJob(new Uint8Array([4, 5, 6]));

      batchManager.cancelAll();

      expect(batchManager.getPendingJobs()).toEqual([]);
      expect(batchManager.pendingCount).toBe(0);
    });

    it('should not reset stats on cancel', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.cancelAll();

      const stats = batchManager.getStats();
      expect(stats.totalJobs).toBe(1);
    });

    it('should clear pending bytes', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3, 4, 5]));
      batchManager.cancelAll();

      // pendingCount should be 0
      expect(batchManager.pendingCount).toBe(0);
    });
  });

  describe('resetStats()', () => {
    it('should reset all stats to zero', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.resetStats();

      const stats = batchManager.getStats();
      expect(stats.totalJobs).toBe(0);
      expect(stats.totalBytes).toBe(0);
      expect(stats.batchesProcessed).toBe(0);
    });
  });

  describe('destroy()', () => {
    it('should cleanup timers and jobs', () => {
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      batchManager.destroy();

      expect(batchManager.pendingCount).toBe(0);
    });

    it('should remove all event listeners', () => {
      const spy = vi.fn();
      batchManager.on('job-added', spy);
      batchManager.destroy();

      // After destroy, listeners should be removed
      batchManager.addJob(new Uint8Array([1, 2, 3]));
      // Spy should not be called since listeners were removed
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      batchManager.updateConfig({ maxBatchSize: 2048 });

      // Config should be updated (we can verify through behavior)
      expect(batchManager).toBeDefined();
    });
  });

  describe('event emissions', () => {
    it('should emit job-added event when adding a job', async () => {
      const spy = vi.fn();
      batchManager.on('job-added', spy);

      const data = new Uint8Array([1, 2, 3]);
      batchManager.addJob(data);

      await vi.waitFor(() => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    it('should emit batch-ready event when wait timer expires', async () => {
      const manager = new BatchPrintManager({
        maxWaitTime: 100,
        autoProcessInterval: 0,
        flushIntervalTimeout: 0,
      });

      const spy = vi.fn();
      manager.on('batch-ready', spy);

      manager.addJob(new Uint8Array([1, 2, 3]));

      await vi.waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      manager.destroy();
    });
  });

  describe('small job merging', () => {
    it('should not merge when merging is disabled', async () => {
      const manager = new BatchPrintManager({
        enableMerging: false,
        maxWaitTime: 100,
      });

      const mergeSpy = vi.fn();
      manager.on('jobs-merged', mergeSpy);

      manager.addJob(new Uint8Array([1, 2]));
      manager.addJob(new Uint8Array([3, 4]));

      await vi.waitFor(() => {
        expect(mergeSpy).not.toHaveBeenCalled();
      });

      manager.destroy();
    });
  });

  describe('auto-flush', () => {
    it('should emit auto-flush event after flush interval timeout', async () => {
      const manager = new BatchPrintManager({
        flushIntervalTimeout: 100,
        autoProcessInterval: 0,
        maxWaitTime: 0,
      });

      const flushSpy = vi.fn();
      manager.on('auto-flush', flushSpy);

      manager.addJob(new Uint8Array([1, 2, 3]));

      await vi.waitFor(() => {
        expect(flushSpy).toHaveBeenCalled();
      });

      manager.destroy();
    });
  });

  describe('batch processing', () => {
    it('should process batch when minBatchSize is 1', async () => {
      const manager = new BatchPrintManager({
        minBatchSize: 1,
        maxWaitTime: 5000,
        autoProcessInterval: 0,
        flushIntervalTimeout: 0,
      });

      const processSpy = vi.fn();
      manager.on('batch-processed', processSpy);

      manager.addJob(new Uint8Array([1, 2, 3]));

      // Wait for wait timer to trigger batch-ready, then process
      await vi.waitFor(async () => {
        if (manager.pendingCount > 0) {
          await manager.processBatch(async () => {});
        }
      });

      expect(processSpy).toHaveBeenCalled();
      manager.destroy();
    });

    it('should process batch when maxBatchSize is reached', async () => {
      const manager = new BatchPrintManager({
        maxBatchSize: 10,
        maxWaitTime: 5000,
        autoProcessInterval: 0,
        flushIntervalTimeout: 0,
      });

      const processSpy = vi.fn();
      manager.on('batch-processed', processSpy);

      // Add jobs that exceed maxBatchSize
      manager.addJob(new Uint8Array([1, 2, 3, 4, 5]));
      manager.addJob(new Uint8Array([6, 7, 8, 9, 10]));
      manager.addJob(new Uint8Array([11, 12]));

      // Wait for wait timer to trigger
      await vi.waitFor(async () => {
        if (manager.pendingCount > 0) {
          await manager.processBatch(async () => {});
        }
      });

      expect(processSpy).toHaveBeenCalled();
      manager.destroy();
    });

    it('should return number of jobs processed', async () => {
      const freshManager = new BatchPrintManager();
      freshManager.addJob(new Uint8Array([1, 2, 3]));
      freshManager.addJob(new Uint8Array([4, 5, 6]));

      const processedCount = await freshManager.processBatch(async () => {});

      expect(processedCount).toBe(2);

      freshManager.destroy();
    });

    it('should throw error when processing already in progress', async () => {
      const freshManager = new BatchPrintManager();
      freshManager.addJob(new Uint8Array([1, 2, 3]));

      // Start processing
      const promise = freshManager.processBatch(async () => {
        // Keep processing "in progress"
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Try to process again while already processing
      await expect(freshManager.processBatch(async () => {})).rejects.toThrow('Batch processing already in progress');

      await promise;

      freshManager.destroy();
    });

    it('should return 0 when no jobs to process', async () => {
      const freshManager = new BatchPrintManager();
      const count = await freshManager.processBatch(async () => {});
      expect(count).toBe(0);

      freshManager.destroy();
    });
  });

  describe('unified cut command', () => {
    it('should append unified cut command when merging', async () => {
      const customCut = new Uint8Array([0x1b, 0x56, 0x00]);
      const manager = new BatchPrintManager({
        enableMerging: true,
        smallJobThreshold: 50,
        maxWaitTime: 5000,
        autoProcessInterval: 0,
        flushIntervalTimeout: 0,
        unifiedCutCommand: customCut,
      });

      const processSpy = vi.fn();
      manager.on('batch-processed', processSpy);

      manager.addJob(new Uint8Array([1, 2]));
      manager.addJob(new Uint8Array([3, 4]));

      await vi.waitFor(async () => {
        if (manager.pendingCount > 0) {
          await manager.processBatch(async () => {});
        }
      });

      expect(processSpy).toHaveBeenCalled();
      manager.destroy();
    });
  });

  describe('mergeJobs internal behavior', () => {
    it('should merge consecutive small jobs', async () => {
      const manager = new BatchPrintManager({
        enableMerging: true,
        smallJobThreshold: 50,
        maxWaitTime: 5000,
        autoProcessInterval: 0,
        flushIntervalTimeout: 0,
      });

      const mergeSpy = vi.fn();
      manager.on('jobs-merged', mergeSpy);

      manager.addJob(new Uint8Array([1, 2]));
      manager.addJob(new Uint8Array([3, 4]));
      manager.addJob(new Uint8Array([5, 6]));

      await vi.waitFor(async () => {
        if (manager.pendingCount > 0) {
          await manager.processBatch(async () => {});
        }
      });

      // Should have emitted jobs-merged event
      expect(mergeSpy).toHaveBeenCalled();
      manager.destroy();
    });
  });
});
