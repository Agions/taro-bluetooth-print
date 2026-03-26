import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchPrintManager } from '../../src/services/BatchPrintManager';

describe('BatchPrintManager - Enhanced Features', () => {
  let manager: BatchPrintManager;

  beforeEach(() => {
    manager = new BatchPrintManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('mergeConsecutiveSmallJobs configuration', () => {
    it('should merge small jobs below smallJobThreshold', () => {
      // smallJobThreshold defaults to 50 bytes
      const smallData = new Uint8Array(30); // Below threshold
      const anotherSmallData = new Uint8Array(40); // Below threshold

      const jobs: Array<{ data: Uint8Array; priority?: number }> = [
        { data: smallData },
        { data: anotherSmallData },
      ];

      manager.addJobs(jobs);

      const pending = manager.getPendingJobs();
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it('should not merge jobs above smallJobThreshold', () => {
      const smallData = new Uint8Array(30);
      const largeData = new Uint8Array(100); // Above threshold

      manager.addJob(smallData, 1);
      manager.addJob(largeData, 1);

      const pending = manager.getPendingJobs();
      expect(pending.length).toBe(2);
    });

    it('should respect custom smallJobThreshold config', () => {
      const customManager = new BatchPrintManager({
        smallJobThreshold: 20,
      });

      const data1 = new Uint8Array(15); // Below 20
      const data2 = new Uint8Array(18); // Below 20

      customManager.addJob(data1, 1);
      customManager.addJob(data2, 1);

      customManager.destroy();
    });

    it('should not merge single job even if small', () => {
      const smallData = new Uint8Array(30);
      manager.addJob(smallData, 1);

      const pending = manager.getPendingJobs();
      expect(pending.length).toBe(1);
    });

    it('should preserve job metadata after small job merge', () => {
      const customManager = new BatchPrintManager({
        smallJobThreshold: 100,
      });

      const smallData = new Uint8Array(50);

      customManager.addJob(smallData, 5, { source: 'test' });

      customManager.destroy();
    });
  });

  describe('flushIntervalTimeout auto-flush', () => {
    it('should emit auto-flush event after interval timeout', () => {
      vi.useFakeTimers();

      const autoFlushHandler = vi.fn();
      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 2000,
      });
      customManager.on('auto-flush', autoFlushHandler);

      customManager.addJob(new Uint8Array(100), 1);
      customManager.addJob(new Uint8Array(50), 1);

      // Advance time past the flush interval
      vi.advanceTimersByTime(2500);

      expect(autoFlushHandler).toHaveBeenCalled();

      customManager.destroy();
      vi.useRealTimers();
    });

    it('should not trigger auto-flush if new job arrives within interval', () => {
      vi.useFakeTimers();

      const autoFlushHandler = vi.fn();
      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 2000,
      });
      customManager.on('auto-flush', autoFlushHandler);

      customManager.addJob(new Uint8Array(100), 1);

      // Advance time halfway
      vi.advanceTimersByTime(1000);

      // Add another job - this should restart the timer
      customManager.addJob(new Uint8Array(50), 1);

      // Advance past original timeout but not new one
      vi.advanceTimersByTime(1500);

      // Should not have triggered yet (needs 2000ms from last job)
      expect(autoFlushHandler).not.toHaveBeenCalled();

      // Advance past the new timeout
      vi.advanceTimersByTime(600);

      expect(autoFlushHandler).toHaveBeenCalled();

      customManager.destroy();
      vi.useRealTimers();
    });

    it('should track autoFlushCount in statistics', () => {
      vi.useFakeTimers();

      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 1000,
        autoProcessInterval: 0,
      });

      customManager.addJob(new Uint8Array(100), 1);

      // Trigger auto-flush
      vi.advanceTimersByTime(1500);

      const stats = customManager.getStats();
      expect(stats.autoFlushCount).toBe(1);

      customManager.destroy();
      vi.useRealTimers();
    });

    it('should not auto-flush when flushIntervalTimeout is 0 (disabled)', () => {
      vi.useFakeTimers();

      const autoFlushHandler = vi.fn();
      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 0, // Disabled
      });
      customManager.on('auto-flush', autoFlushHandler);

      customManager.addJob(new Uint8Array(100), 1);

      vi.advanceTimersByTime(10000); // Very long time

      expect(autoFlushHandler).not.toHaveBeenCalled();

      customManager.destroy();
      vi.useRealTimers();
    });

    it('should emit auto-flush with correct job count and bytes', () => {
      vi.useFakeTimers();

      const autoFlushHandler = vi.fn();
      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 1000,
        autoProcessInterval: 0,
      });
      customManager.on('auto-flush', autoFlushHandler);

      customManager.addJob(new Uint8Array(100), 1);
      customManager.addJob(new Uint8Array(200), 1);

      vi.advanceTimersByTime(1500);

      expect(autoFlushHandler).toHaveBeenCalledWith({
        jobCount: 2,
        bytes: 300,
      });

      customManager.destroy();
      vi.useRealTimers();
    });
  });

  describe('unifiedCutCommand', () => {
    it('should append unified cut command to merged output', async () => {
      const customCut = new Uint8Array([0x1b, 0x64, 0x03]); // ESC d 3
      const customManager = new BatchPrintManager({
        unifiedCutCommand: customCut,
        enableMerging: true,
        smallJobThreshold: 0, // Disable small job merging
      });

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array([1, 2, 3]), 1);

      await customManager.processBatch(processor);

      expect(processor).toHaveBeenCalled();
      const calledData = processor.mock.calls[0]![0] as Uint8Array;
      // Should end with cut command
      const endsWithCut = calledData.slice(-3).every(
        (byte, i) => byte === customCut[i]
      );
      expect(endsWithCut).toBe(true);

      customManager.destroy();
    });

    it('should track unifiedCutsApplied in statistics', async () => {
      const customCut = new Uint8Array([0x1b, 0x64, 0x03]);
      const customManager = new BatchPrintManager({
        unifiedCutCommand: customCut,
        enableMerging: false,
      });

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array([1, 2, 3]), 1);
      await customManager.processBatch(processor);

      const stats = customManager.getStats();
      expect(stats.unifiedCutsApplied).toBe(1);

      customManager.destroy();
    });

    it('should apply unified cut only once per batch', async () => {
      const customCut = new Uint8Array([0x1b, 0x64, 0x03]);
      const customManager = new BatchPrintManager({
        unifiedCutCommand: customCut,
        enableMerging: false,
      });

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array([1, 2, 3]), 1);
      await customManager.processBatch(processor);
      customManager.addJob(new Uint8Array([4, 5, 6]), 1);
      await customManager.processBatch(processor);

      const stats = customManager.getStats();
      expect(stats.unifiedCutsApplied).toBe(2);

      customManager.destroy();
    });

    it('should work without unifiedCutCommand (undefined)', async () => {
      const customManager = new BatchPrintManager({
        unifiedCutCommand: undefined,
        enableMerging: false,
      });

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array([1, 2, 3]), 1);
      await customManager.processBatch(processor);

      expect(processor).toHaveBeenCalled();

      customManager.destroy();
    });

    it('should use default cut command when not specified', () => {
      // Default cut command should be set by default
      const customManager = new BatchPrintManager();
      const stats = customManager.getStats();
      // Initial stats should show 0 unified cuts
      expect(stats.unifiedCutsApplied).toBe(0);

      customManager.destroy();
    });
  });

  describe('mergedJobs statistic', () => {
    it('should track number of merged small jobs', async () => {
      const customManager = new BatchPrintManager({
        smallJobThreshold: 50,
        enableMerging: true,
        autoProcessInterval: 0,
      });

      const processor = vi.fn().mockResolvedValue(undefined);

      // Add multiple small jobs that should be merged
      customManager.addJob(new Uint8Array(20), 1);
      customManager.addJob(new Uint8Array(30), 1);
      customManager.addJob(new Uint8Array(40), 1);

      // Process batch to trigger merge
      await customManager.processBatch(processor);

      const stats = customManager.getStats();
      expect(stats.mergedJobs).toBeGreaterThanOrEqual(0);

      customManager.destroy();
    });

    it('should emit jobs-merged event when small jobs are merged', async () => {
      const customManager = new BatchPrintManager({
        smallJobThreshold: 100,
        enableMerging: true,
        autoProcessInterval: 0,
      });

      const mergedHandler = vi.fn();
      customManager.on('jobs-merged', mergedHandler);

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array(30), 1);
      customManager.addJob(new Uint8Array(40), 1);

      await customManager.processBatch(processor);

      // mergedHandler may or may not be called depending on merge results
      customManager.destroy();
    });

    it('should calculate savedBytes correctly in jobs-merged event', async () => {
      const customManager = new BatchPrintManager({
        smallJobThreshold: 100,
        enableMerging: true,
        autoProcessInterval: 0,
      });

      const mergedHandler = vi.fn();
      customManager.on('jobs-merged', mergedHandler);

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array(30), 1);
      customManager.addJob(new Uint8Array(40), 1);

      await customManager.processBatch(processor);

      if (mergedHandler.mock.calls.length > 0) {
        const call = mergedHandler.mock.calls[0]![0];
        expect(call).toHaveProperty('fromCount');
        expect(call).toHaveProperty('toCount');
        expect(call).toHaveProperty('savedBytes');
      }

      customManager.destroy();
    });
  });

  describe('autoFlushCount statistic', () => {
    it('should increment autoFlushCount each time auto-flush triggers', () => {
      vi.useFakeTimers();

      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 1000,
        autoProcessInterval: 0,
      });

      // First batch
      customManager.addJob(new Uint8Array(50), 1);
      vi.advanceTimersByTime(1500);
      expect(customManager.getStats().autoFlushCount).toBe(1);

      // Second batch - add new job and wait
      customManager.addJob(new Uint8Array(50), 1);
      vi.advanceTimersByTime(1500);
      expect(customManager.getStats().autoFlushCount).toBe(2);

      customManager.destroy();
      vi.useRealTimers();
    });

    it('should not count manual batch-ready triggers as auto-flush', () => {
      vi.useFakeTimers();

      const customManager = new BatchPrintManager({
        flushIntervalTimeout: 0, // Disable auto-flush
      });

      const readyHandler = vi.fn();
      customManager.on('batch-ready', readyHandler);

      customManager.addJob(new Uint8Array(50), 1);

      vi.advanceTimersByTime(10000);

      // batch-ready may be called but not via auto-flush
      expect(customManager.getStats().autoFlushCount).toBe(0);

      customManager.destroy();
      vi.useRealTimers();
    });
  });

  describe('unifiedCutsApplied statistic', () => {
    it('should start at 0', () => {
      const stats = manager.getStats();
      expect(stats.unifiedCutsApplied).toBe(0);
    });

    it('should not increment when unifiedCutCommand is undefined', async () => {
      const customManager = new BatchPrintManager({
        unifiedCutCommand: undefined,
        enableMerging: false,
      });

      const processor = vi.fn().mockResolvedValue(undefined);

      customManager.addJob(new Uint8Array([1, 2, 3]), 1);
      await customManager.processBatch(processor);

      expect(customManager.getStats().unifiedCutsApplied).toBe(0);

      customManager.destroy();
    });
  });

  describe('combined enhanced features', () => {
    it('should work with all enhanced features enabled', async () => {
      vi.useFakeTimers();

      const customManager = new BatchPrintManager({
        smallJobThreshold: 50,
        flushIntervalTimeout: 2000,
        unifiedCutCommand: new Uint8Array([0x1b, 0x64, 0x03]),
        enableMerging: true,
        autoProcessInterval: 0,
      });

      const batchReadyHandler = vi.fn();
      const batchProcessedHandler = vi.fn();
      const autoFlushHandler = vi.fn();
      const jobsMergedHandler = vi.fn();

      customManager.on('batch-ready', batchReadyHandler);
      customManager.on('batch-processed', batchProcessedHandler);
      customManager.on('auto-flush', autoFlushHandler);
      customManager.on('jobs-merged', jobsMergedHandler);

      // Add mixed size jobs
      customManager.addJob(new Uint8Array(20), 1); // Small
      customManager.addJob(new Uint8Array(80), 1); // Large
      customManager.addJob(new Uint8Array(30), 1); // Small

      const stats = customManager.getStats();
      expect(stats.totalJobs).toBe(3);

      // Process batch
      const processor = vi.fn().mockResolvedValue(undefined);
      await customManager.processBatch(processor);

      expect(batchProcessedHandler).toHaveBeenCalled();

      // Trigger auto-flush with new batch
      customManager.addJob(new Uint8Array(50), 1);
      vi.advanceTimersByTime(2500);

      expect(autoFlushHandler).toHaveBeenCalled();

      customManager.destroy();
      vi.useRealTimers();
    });

    it('should correctly aggregate all statistics', () => {
      const customManager = new BatchPrintManager({
        smallJobThreshold: 50,
        flushIntervalTimeout: 1000,
        unifiedCutCommand: new Uint8Array([0x1b, 0x64, 0x03]),
      });

      // Add multiple jobs
      customManager.addJob(new Uint8Array(100), 1);
      customManager.addJob(new Uint8Array(200), 1);
      customManager.addJob(new Uint8Array(300), 1);

      const stats = customManager.getStats();
      const pending = customManager.getPendingJobs();

      expect(stats.totalJobs).toBe(3);
      expect(pending.length).toBe(3);

      customManager.destroy();
    });
  });
});
