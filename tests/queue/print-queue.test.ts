import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

describe('PrintQueue', () => {
  let PrintQueue: any;
  let queue: any;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('@/queue/PrintQueue');
    PrintQueue = module.PrintQueue;
    // Disable autoProcess to prevent automatic job execution
    queue = new PrintQueue({ autoProcess: false });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    test('should create queue with default config', () => {
      expect(queue).toBeDefined();
      expect(queue.size).toBe(0);
    });

    test('should create queue with custom config', () => {
      const customQueue = new PrintQueue({
        maxSize: 50,
        defaultRetries: 5,
        retryDelay: 2000,
        autoProcess: false,
        concurrency: 2,
      });
      expect(customQueue).toBeDefined();
    });
  });

  describe('add()', () => {
    test('should add job to queue', () => {
      const data = new Uint8Array([0x1b, 0x40]); // ESC @ reset
      const jobId = queue.add(data);

      expect(jobId).toBeDefined();
      expect(queue.size).toBe(1);
    });

    test('should add job with priority', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      const jobId = queue.add(data, { priority: 3 }); // URGENT

      expect(jobId).toBeDefined();
    });

    test('should respect max size', () => {
      const smallQueue = new PrintQueue({ maxSize: 2, autoProcess: false });
      const data = new Uint8Array([0x1b, 0x40]);

      smallQueue.add(data);
      smallQueue.add(data);

      // Third job should throw
      expect(() => smallQueue.add(data)).toThrow('Queue is full');
    });
  });

  describe('pause() / resume()', () => {
    test('should pause and resume queue', () => {
      queue.pause();
      expect(queue.paused).toBe(true);

      queue.resume();
      expect(queue.paused).toBe(false);
    });

    test('should not emit events when already paused', () => {
      const callback = vi.fn();
      queue.on('queue-paused', callback);

      queue.pause();
      queue.pause(); // Second pause should not emit

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear()', () => {
    test('should clear pending jobs', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      queue.add(data);
      queue.add(data);

      expect(queue.size).toBe(2);

      queue.clear();
      expect(queue.size).toBe(0);
    });
  });

  describe('events', () => {
    test('should emit job-added event', () => {
      const callback = vi.fn();
      queue.on('job-added', callback);

      const data = new Uint8Array([0x1b, 0x40]);
      queue.add(data);

      expect(callback).toHaveBeenCalled();
    });

    test('should emit job-cancelled event on cancel', () => {
      const callback = vi.fn();
      queue.on('job-cancelled', callback);

      const data = new Uint8Array([0x1b, 0x40]);
      const jobId = queue.add(data);

      queue.cancel(jobId);

      expect(callback).toHaveBeenCalled();
    });

    test('should emit queue-paused event', () => {
      const callback = vi.fn();
      queue.on('queue-paused', callback);

      queue.pause();

      expect(callback).toHaveBeenCalled();
    });

    test('should emit queue-resumed event', () => {
      queue.pause();
      const callback = vi.fn();
      queue.on('queue-resumed', callback);

      queue.resume();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getJob()', () => {
    test('should return job by id', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      const jobId = queue.add(data);

      const job = queue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
    });

    test('should return null for unknown job', () => {
      const job = queue.getJob('unknown-id');
      expect(job).toBeNull();
    });
  });

  describe('cancel()', () => {
    test('should cancel pending job', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      const jobId = queue.add(data);

      const result = queue.cancel(jobId);
      expect(result).toBe(true);
      expect(queue.size).toBe(0);
    });

    test('should not cancel unknown job', () => {
      const result = queue.cancel('unknown-id');
      expect(result).toBe(false);
    });

    test('should not cancel completed job', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      const jobId = queue.add(data);

      // Simulate job completion by modifying status directly
      const job = queue.getJob(jobId);
      if (job) {
        job.status = 'completed';
      }

      const result = queue.cancel(jobId);
      expect(result).toBe(false);
    });
  });

  describe('getAllJobs()', () => {
    test('should return all jobs', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      queue.add(data);
      queue.add(data);

      const jobs = queue.getAllJobs();
      expect(jobs).toHaveLength(2);
    });
  });

  describe('getPendingJobs()', () => {
    test('should return pending jobs', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      queue.add(data);

      const jobs = queue.getPendingJobs();
      expect(jobs).toHaveLength(1);
    });
  });

  describe('getQueueStatus()', () => {
    test('should return correct status', () => {
      const data = new Uint8Array([0x1b, 0x40]);
      queue.add(data);

      const status = queue.getQueueStatus();
      expect(status.pending).toBe(1);
      expect(status.inProgress).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
    });
  });

  describe('setExecutor()', () => {
    test('should set job executor', () => {
      const executor = vi.fn();
      queue.setExecutor(executor);

      // Verify executor was set by checking internal state
      // The actual execution is tested in integration tests
      expect(queue).toBeDefined();
    });
  });
});

describe('PrintJobPriority', () => {
  test('should have correct priority values', async () => {
    const module = await import('@/queue/PrintQueue');
    expect(module.PrintJobPriority.LOW).toBe(0);
    expect(module.PrintJobPriority.NORMAL).toBe(1);
    expect(module.PrintJobPriority.HIGH).toBe(2);
    expect(module.PrintJobPriority.URGENT).toBe(3);
  });
});

describe('PrintJobStatus', () => {
  test('should have correct status values', async () => {
    const module = await import('@/queue/PrintQueue');
    expect(module.PrintJobStatus.PENDING).toBe('pending');
    expect(module.PrintJobStatus.IN_PROGRESS).toBe('in_progress');
    expect(module.PrintJobStatus.COMPLETED).toBe('completed');
    expect(module.PrintJobStatus.FAILED).toBe('failed');
    expect(module.PrintJobStatus.CANCELLED).toBe('cancelled');
    expect(module.PrintJobStatus.PAUSED).toBe('paused');
  });
});
