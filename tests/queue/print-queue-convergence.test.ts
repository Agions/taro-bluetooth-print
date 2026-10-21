/**
 * Print Queue Convergence & Unified Resilience Tests
 * 任务队列收敛与统一重试容灾测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @tarojs/taro before importing modules that touch it
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    getStorageInfoSync: vi.fn(),
  },
}));

import {
  PrintQueue,
  PrintJobPriority,
  PrintJobStatus,
  printQueue,
  getPrintQueue,
} from '../../src/queue';
import { BatchPrintManager } from '../../src/services/BatchPrintManager';
import { PrintJobManager } from '../../src/services/PrintJobManager';
import { WALJournal } from '../../src/cache/WALJournal';
import { MemoryStorageAdapter } from '../../src/storage';
import { offlineCache, getOfflineCache } from '../../src/cache';

describe('PrintQueue Convergence & Resilience', () => {
  let queue: PrintQueue;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Exponential Backoff Retry', () => {
    it('calculates exponential backoff delay correctly across retry attempts', async () => {
      queue = new PrintQueue({
        autoProcess: true,
        concurrency: 1,
        defaultRetries: 4,
        retryDelay: 100,
        backoffFactor: 2.0,
        maxRetryDelay: 5000,
      });

      const retryEvents: Array<{ attempt: number; delay: number }> = [];
      queue.on('job-retry', e => {
        retryEvents.push({ attempt: e.attempt, delay: e.delay });
      });

      let failCount = 0;
      queue.setExecutor(async () => {
        failCount++;
        throw new Error(`Intentional failure #${failCount}`);
      });

      const data = new Uint8Array([0x1b, 0x40]);
      const jobId = queue.add(data);

      // Attempt 1 fails -> schedule retry 1 with delay = 100 * (2.0 ^ 0) = 100
      await vi.advanceTimersByTimeAsync(1);
      expect(retryEvents).toHaveLength(1);
      expect(retryEvents[0]?.attempt).toBe(1);
      expect(retryEvents[0]?.delay).toBe(100);

      // Advance by 100ms -> triggers Attempt 2 -> fails -> delay = 100 * (2.0 ^ 1) = 200
      await vi.advanceTimersByTimeAsync(100);
      expect(retryEvents).toHaveLength(2);
      expect(retryEvents[1]?.attempt).toBe(2);
      expect(retryEvents[1]?.delay).toBe(200);

      // Advance by 200ms -> triggers Attempt 3 -> fails -> delay = 100 * (2.0 ^ 2) = 400
      await vi.advanceTimersByTimeAsync(200);
      expect(retryEvents).toHaveLength(3);
      expect(retryEvents[2]?.attempt).toBe(3);
      expect(retryEvents[2]?.delay).toBe(400);

      const job = queue.getJob(jobId);
      expect(job).toBeDefined();
    });

    it('caps retry delay at maxRetryDelay', async () => {
      queue = new PrintQueue({
        autoProcess: true,
        concurrency: 1,
        defaultRetries: 3,
        retryDelay: 1000,
        backoffFactor: 10.0,
        maxRetryDelay: 2500,
      });

      const retryEvents: Array<{ attempt: number; delay: number }> = [];
      queue.on('job-retry', e => {
        retryEvents.push({ attempt: e.attempt, delay: e.delay });
      });

      queue.setExecutor(async () => {
        throw new Error('Failure');
      });

      queue.add(new Uint8Array([1]));
      await vi.advanceTimersByTimeAsync(1);

      // Attempt 1: 1000ms
      expect(retryEvents[0]?.delay).toBe(1000);

      // Attempt 2: 1000 * 10 = 10000ms, capped at 2500ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(retryEvents[1]?.delay).toBe(2500);
    });
  });

  describe('Manual retryJob() and Retry Queue Query', () => {
    it('allows manually re-queueing a failed job immediately', async () => {
      queue = new PrintQueue({ autoProcess: false });
      const jobId = queue.add(new Uint8Array([1, 2, 3]));
      const job = queue.getJob(jobId)!;

      // Simulate failure
      job.status = PrintJobStatus.FAILED;
      job.retryCount = 3;

      expect(queue.retryJob(jobId, { resetAttempts: true })).toBe(true);
      expect(job.status).toBe(PrintJobStatus.PENDING);
      expect(job.retryCount).toBe(0);
      expect(queue.getPendingJobs().map(j => j.id)).toContain(jobId);
    });

    it('allows manually re-queueing with custom delay into retry queue', () => {
      queue = new PrintQueue({ autoProcess: false });
      const jobId = queue.add(new Uint8Array([1, 2, 3]));
      const job = queue.getJob(jobId)!;
      job.status = PrintJobStatus.FAILED;

      expect(queue.retryJob(jobId, { delay: 5000 })).toBe(true);
      expect(job.status).toBe(PrintJobStatus.PENDING);
      const scheduled = queue.getRetryQueue();
      expect(scheduled.some(s => s.jobId === jobId)).toBe(true);
    });

    it('returns false when trying to retry a non-existent job or in-progress job', () => {
      queue = new PrintQueue({ autoProcess: false });
      expect(queue.retryJob('non_existent')).toBe(false);

      const jobId = queue.add(new Uint8Array([1]));
      const job = queue.getJob(jobId)!;
      job.status = PrintJobStatus.IN_PROGRESS;
      expect(queue.retryJob(jobId)).toBe(false);
    });
  });

  describe('WAL Deduplication Integration in PrintQueue', () => {
    it('isDuplicate() accurately delegates to WAL Journal', () => {
      const storage = new MemoryStorageAdapter('test_wal_');
      const wal = new WALJournal(storage, { dedupWindowMs: 60000 });
      queue = new PrintQueue({ wal, autoProcess: false });

      const data = new Uint8Array([0x1b, 0x40, 0x01]);
      expect(queue.isDuplicate(data)).toBe(false);

      // Add to queue (records into WAL as QUEUED)
      const jobId = queue.add(data);
      wal.recordStarted(jobId);
      expect(queue.isDuplicate(data)).toBe(true);
    });

    it('isDuplicate() returns false when no WAL is mounted', () => {
      queue = new PrintQueue({ autoProcess: false });
      expect(queue.isDuplicate(new Uint8Array([1, 2, 3]))).toBe(false);
    });
  });

  describe('BatchPrintManager Integration with PrintQueue', () => {
    it('flushToQueue() seamlessly pushes merged batch jobs into PrintQueue', () => {
      queue = new PrintQueue({ autoProcess: false });
      const batchManager = new BatchPrintManager({
        enableMerging: true,
        smallJobThreshold: 50,
      });

      batchManager.setPrintQueue(queue);
      expect(batchManager.getPrintQueue()).toBe(queue);

      batchManager.addJob(new Uint8Array([1, 2]), 1);
      batchManager.addJob(new Uint8Array([3, 4]), 2);

      const jobId = batchManager.flushToQueue({ priority: PrintJobPriority.HIGH });
      expect(jobId).toBeDefined();
      expect(queue.size).toBe(1);

      const queuedJob = queue.getJob(jobId!)!;
      expect(queuedJob.priority).toBe(PrintJobPriority.HIGH);
      expect(batchManager.getStats().batchesProcessed).toBe(1);
    });

    it('flushToQueue() throws if called without setting a PrintQueue', () => {
      const batchManager = new BatchPrintManager();
      batchManager.addJob(new Uint8Array([1]));
      expect(() => batchManager.flushToQueue()).toThrowError(/No PrintQueue attached/);
    });
  });

  describe('PrintJobManager Integration with PrintQueue', () => {
    it('allows binding and retrieving PrintQueue instance', () => {
      const mockConnMgr = {
        isConnected: () => true,
        getAdapter: () => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
          write: vi.fn(),
        }),
      } as any;

      const jobManager = new PrintJobManager(mockConnMgr);
      queue = new PrintQueue({ autoProcess: false });

      expect(jobManager.getPrintQueue()).toBeUndefined();
      jobManager.setPrintQueue(queue);
      expect(jobManager.getPrintQueue()).toBe(queue);
    });
  });

  describe('Lazy Singletons', () => {
    it('provides getPrintQueue() and transparent lazy proxy for printQueue', () => {
      const direct = getPrintQueue();
      expect(direct).toBeInstanceOf(PrintQueue);
      expect(typeof printQueue.add).toBe('function');
      expect(printQueue.size).toBe(direct.size);
    });

    it('provides getOfflineCache() and transparent lazy proxy for offlineCache', () => {
      const direct = getOfflineCache();
      expect(typeof direct.save).toBe('function');
      expect(typeof offlineCache.save).toBe('function');
    });
  });
});
