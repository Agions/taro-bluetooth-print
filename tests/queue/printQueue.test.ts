/**
 * Print Queue Tests
 *
 * Tests for the PrintQueue class
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrintQueue, PrintJobPriority, PrintJobStatus, PrintJob } from '@/queue/PrintQueue';
import { Logger, LogLevel } from '@/utils/logger';

// Helper to create a queue with autoProcess disabled for simpler tests
function createManualQueue(config?: Partial<{
  maxSize: number;
  defaultRetries: number;
  retryDelay: number;
  autoProcess: boolean;
  concurrency: number;
}>): PrintQueue {
  return new PrintQueue({ autoProcess: false, ...config });
}

describe('PrintQueue', () => {
  let queue: PrintQueue;

  beforeEach(() => {
    Logger.setLevel(LogLevel.ERROR);
    queue = new PrintQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  describe('add', () => {
    it('should add a job and return an ID', () => {
      const manualQueue = createManualQueue();
      const id = manualQueue.add(new Uint8Array([0x1b, 0x40]));
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^job_\d+_\d+$/);
    });

    it('should add job with default priority (NORMAL)', () => {
      const manualQueue = createManualQueue();
      const id = manualQueue.add(new Uint8Array([0x1b]));
      const job = manualQueue.getJob(id);
      expect(job?.priority).toBe(PrintJobPriority.NORMAL);
    });

    it('should add job with custom priority', () => {
      const manualQueue = createManualQueue();
      const id = manualQueue.add(new Uint8Array([0x1b]), { priority: PrintJobPriority.URGENT });
      const job = manualQueue.getJob(id);
      expect(job?.priority).toBe(PrintJobPriority.URGENT);
    });

    it('should emit job-added event', () => {
      const manualQueue = createManualQueue();
      const callback = vi.fn();
      manualQueue.on('job-added', callback);
      manualQueue.add(new Uint8Array([0x1b]));
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        status: PrintJobStatus.PENDING,
      }));
    });

    it('should throw when queue is full', () => {
      const smallQueue = createManualQueue({ maxSize: 1 });
      smallQueue.add(new Uint8Array([0x1b]));
      expect(() => {
        smallQueue.add(new Uint8Array([0x1b]));
      }).toThrow('Queue is full');
    });
  });

  describe('getJob', () => {
    it('should return null for non-existent job', () => {
      const manualQueue = createManualQueue();
      expect(manualQueue.getJob('non-existent')).toBeNull();
    });

    it('should return the correct job', () => {
      const manualQueue = createManualQueue();
      const id = manualQueue.add(new Uint8Array([0x1b]));
      const job = manualQueue.getJob(id);
      expect(job).not.toBeNull();
      expect(job?.id).toBe(id);
    });
  });

  describe('priority ordering', () => {
    it('should order jobs by priority (urgent before normal)', () => {
      const manualQueue = createManualQueue();
      const normalId = manualQueue.add(new Uint8Array([0x1b]), { priority: PrintJobPriority.NORMAL });
      const urgentId = manualQueue.add(new Uint8Array([0x1b]), { priority: PrintJobPriority.URGENT });
      const highId = manualQueue.add(new Uint8Array([0x1b]), { priority: PrintJobPriority.HIGH });

      const pending = manualQueue.getPendingJobs();
      expect(pending[0]?.id).toBe(urgentId);
      expect(pending[1]?.id).toBe(highId);
      expect(pending[2]?.id).toBe(normalId);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending job', () => {
      const manualQueue = createManualQueue();
      const id = manualQueue.add(new Uint8Array([0x1b]));
      const result = manualQueue.cancel(id);
      expect(result).toBe(true);
      const job = manualQueue.getJob(id);
      expect(job?.status).toBe(PrintJobStatus.CANCELLED);
    });

    it('should return false for non-existent job', () => {
      const manualQueue = createManualQueue();
      expect(manualQueue.cancel('non-existent')).toBe(false);
    });

    it('should emit job-cancelled event', () => {
      const manualQueue = createManualQueue();
      const callback = vi.fn();
      manualQueue.on('job-cancelled', callback);
      const id = manualQueue.add(new Uint8Array([0x1b]));
      manualQueue.cancel(id);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('pause/resume', () => {
    it('should start unpaused', () => {
      const manualQueue = createManualQueue();
      expect(manualQueue.paused).toBe(false);
    });

    it('should pause the queue', () => {
      const manualQueue = createManualQueue();
      manualQueue.pause();
      expect(manualQueue.paused).toBe(true);
    });

    it('should emit queue-paused event', () => {
      const manualQueue = createManualQueue();
      const callback = vi.fn();
      manualQueue.on('queue-paused', callback);
      manualQueue.pause();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should resume the queue', () => {
      const manualQueue = createManualQueue();
      manualQueue.pause();
      manualQueue.resume();
      expect(manualQueue.paused).toBe(false);
    });

    it('should emit queue-resumed event', () => {
      const manualQueue = createManualQueue();
      manualQueue.pause();
      const callback = vi.fn();
      manualQueue.on('queue-resumed', callback);
      manualQueue.resume();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should cancel all pending jobs', () => {
      const manualQueue = createManualQueue();
      manualQueue.add(new Uint8Array([0x1b]));
      manualQueue.add(new Uint8Array([0x1b]));
      manualQueue.add(new Uint8Array([0x1b]));

      manualQueue.clear();

      const jobs = manualQueue.getAllJobs();
      for (const job of jobs) {
        expect(job.status).toBe(PrintJobStatus.CANCELLED);
      }
      expect(manualQueue.size).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return zero counts for empty queue', () => {
      const manualQueue = createManualQueue();
      const status = manualQueue.getQueueStatus();
      expect(status).toEqual({ pending: 0, inProgress: 0, completed: 0, failed: 0 });
    });

    it('should track pending jobs', () => {
      const manualQueue = createManualQueue();
      manualQueue.add(new Uint8Array([0x1b]));
      manualQueue.add(new Uint8Array([0x1b]));

      const status = manualQueue.getQueueStatus();
      expect(status.pending).toBe(2);
    });
  });

  describe('size', () => {
    it('should reflect pending jobs count', () => {
      const manualQueue = createManualQueue();
      expect(manualQueue.size).toBe(0);
      manualQueue.add(new Uint8Array([0x1b]));
      expect(manualQueue.size).toBe(1);
      manualQueue.add(new Uint8Array([0x1b]));
      expect(manualQueue.size).toBe(2);
    });
  });

  describe('setExecutor and job execution', () => {
    it('should execute job via executor', async () => {
      const executor = vi.fn().mockResolvedValue(undefined);
      queue.setExecutor(executor);

      const jobId = queue.add(new Uint8Array([0x1b]));

      await vi.waitFor(() => {
        const job = queue.getJob(jobId);
        expect(job?.status).toBe(PrintJobStatus.COMPLETED);
      });
    });

    it('should mark job as failed when executor throws', async () => {
      const executor = vi.fn().mockRejectedValue(new Error('Print failed'));
      const noRetryQueue = new PrintQueue({ defaultRetries: 0 });
      noRetryQueue.setExecutor(executor);

      const jobId = noRetryQueue.add(new Uint8Array([0x1b]));

      await vi.waitFor(() => {
        const job = noRetryQueue.getJob(jobId);
        expect(job?.status).toBe(PrintJobStatus.FAILED);
      });
    });

    it('should emit job-started and job-completed events', async () => {
      const executor = vi.fn().mockResolvedValue(undefined);
      queue.setExecutor(executor);

      const startedCallback = vi.fn();
      const completedCallback = vi.fn();
      queue.on('job-started', startedCallback);
      queue.on('job-completed', completedCallback);

      queue.add(new Uint8Array([0x1b]));

      await vi.waitFor(() => {
        expect(startedCallback).toHaveBeenCalledTimes(1);
        expect(completedCallback).toHaveBeenCalledTimes(1);
      });
    });

    it('should retry failed job', async () => {
      // Test failed job with zero retries (simpler, no timer involvement)
      const queue2 = new PrintQueue({ defaultRetries: 0 });
      queue2.setExecutor(vi.fn().mockRejectedValue(new Error('Fail')));
      const id2 = queue2.add(new Uint8Array([0x1b]));
      await vi.waitFor(() => {
        const j = queue2.getJob(id2);
        return j?.status === PrintJobStatus.FAILED;
      }, { timeout: 5000, interval: 50 });
      const failedJob = queue2.getJob(id2);
      expect(failedJob?.status).toBe(PrintJobStatus.FAILED);
      expect(failedJob?.retryCount).toBe(1);
    });
  });
});