import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  PrintScheduler, 
  type ScheduledPrint,
  parseCronExpression,
  getNextCronRun,
  getNextIntervalRun
} from '../../src/services/PrintScheduler';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('PrintScheduler', () => {
  let scheduler: PrintScheduler;

  beforeEach(() => {
    scheduler = new PrintScheduler();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    scheduler.clear();
    vi.restoreAllMocks();
  });

  describe('scheduleOnce()', () => {
    it('should schedule a one-time print job', () => {
      const futureTime = Date.now() + 60000;
      const job = scheduler.scheduleOnce({
        name: 'Test Job',
        onceAt: futureTime,
        templateData: { content: 'Hello' },
      });

      expect(job.id).toBeDefined();
      expect(job.name).toBe('Test Job');
      expect(job.onceAt).toBe(futureTime);
      expect(job.status).toBe('active');
      expect(job.nextRunTime).toBe(futureTime);
      expect(job.totalRuns).toBe(0);
    });

    it('should throw error for past date', () => {
      expect(() => {
        scheduler.scheduleOnce({
          name: 'Invalid Job',
          onceAt: Date.now() - 1000,
          templateData: {},
        });
      }).toThrow('onceAt must be a future date');
    });

    it('should accept Date object', () => {
      const futureDate = new Date(Date.now() + 60000);
      const job = scheduler.scheduleOnce({
        name: 'Date Job',
        onceAt: futureDate,
        templateData: {},
      });

      expect(job.onceAt).toBe(futureDate.getTime());
    });
  });

  describe('scheduleRepeat()', () => {
    it('should schedule a repeating job with interval', () => {
      const job = scheduler.scheduleRepeat({
        name: 'Interval Job',
        repeatInterval: 3600000, // 1 hour
        templateData: { content: 'Repeating' },
      });

      expect(job.id).toBeDefined();
      expect(job.repeatInterval).toBe(3600000);
      expect(job.status).toBe('active');
      expect(job.nextRunTime).toBeGreaterThan(Date.now());
    });

    it('should schedule a repeating job with cron expression', () => {
      const job = scheduler.scheduleRepeat({
        name: 'Cron Job',
        cronExpression: '0 9 * * *', // 9 AM daily
        templateData: { content: 'Daily' },
      });

      expect(job.cronExpression).toBe('0 9 * * *');
      expect(job.status).toBe('active');
      expect(job.nextRunTime).toBeDefined();
    });

    it('should throw error if neither cron nor interval provided', () => {
      expect(() => {
        scheduler.scheduleRepeat({
          name: 'Invalid',
          templateData: {},
        });
      }).toThrow('Either cronExpression or repeatInterval is required');
    });
  });

  describe('scheduleCron()', () => {
    it('should schedule a cron-based job', () => {
      const job = scheduler.scheduleCron({
        name: 'Cron Schedule',
        cronExpression: '*/5 * * * *', // Every 5 minutes
        templateData: { content: 'Every 5 min' },
      });

      expect(job.cronExpression).toBe('*/5 * * * *');
      expect(job.status).toBe('active');
    });
  });

  describe('cancel()', () => {
    it('should cancel a scheduled job', () => {
      const job = scheduler.scheduleOnce({
        name: 'To Cancel',
        onceAt: Date.now() + 60000,
        templateData: {},
      });

      const result = scheduler.cancel(job.id);
      expect(result).toBe(true);
      expect(scheduler.getJob(job.id)).toBeUndefined();
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.cancel('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('pause() and resume()', () => {
    it('should pause a job', () => {
      const job = scheduler.scheduleOnce({
        name: 'To Pause',
        onceAt: Date.now() + 60000,
        templateData: {},
      });

      const result = scheduler.pause(job.id);
      expect(result).toBe(true);
      expect(job.status).toBe('paused');
    });

    it('should return false for non-active job', () => {
      const job = scheduler.scheduleOnce({
        name: 'Already Paused',
        onceAt: Date.now() + 60000,
        templateData: {},
      });
      scheduler.pause(job.id);

      const result = scheduler.pause(job.id);
      expect(result).toBe(false);
    });

    it('should resume a paused job', () => {
      const job = scheduler.scheduleOnce({
        name: 'To Resume',
        onceAt: Date.now() + 60000,
        templateData: {},
      });
      scheduler.pause(job.id);

      const result = scheduler.resume(job.id);
      expect(result).toBe(true);
      expect(job.status).toBe('active');
      expect(job.nextRunTime).toBeDefined();
    });

    it('should return false for non-paused job', () => {
      const job = scheduler.scheduleOnce({
        name: 'Already Active',
        onceAt: Date.now() + 60000,
        templateData: {},
      });

      const result = scheduler.resume(job.id);
      expect(result).toBe(false);
    });
  });

  describe('update()', () => {
    it('should update job properties', () => {
      const job = scheduler.scheduleOnce({
        name: 'Original Name',
        onceAt: Date.now() + 60000,
        templateData: { content: 'Original' },
      });

      const result = scheduler.update(job.id, {
        name: 'Updated Name',
        templateData: { content: 'Updated' },
        printerId: 'printer-1',
      });

      expect(result).toBe(true);
      expect(job.name).toBe('Updated Name');
      expect(job.templateData).toEqual({ content: 'Updated' });
      expect(job.printerId).toBe('printer-1');
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.update('non-existent', { name: 'Test' });
      expect(result).toBe(false);
    });
  });

  describe('getAllJobs() and getActiveJobs()', () => {
    it('should return all jobs', () => {
      scheduler.scheduleOnce({
        name: 'Job 1',
        onceAt: Date.now() + 60000,
        templateData: {},
      });
      scheduler.scheduleOnce({
        name: 'Job 2',
        onceAt: Date.now() + 120000,
        templateData: {},
      });

      const allJobs = scheduler.getAllJobs();
      expect(allJobs.length).toBe(2);
    });

    it('should return only active jobs', () => {
      scheduler.scheduleOnce({
        name: 'Active Job',
        onceAt: Date.now() + 60000,
        templateData: {},
      });
      const pausedJob = scheduler.scheduleOnce({
        name: 'Paused Job',
        onceAt: Date.now() + 120000,
        templateData: {},
      });
      scheduler.pause(pausedJob.id);

      const activeJobs = scheduler.getActiveJobs();
      expect(activeJobs.length).toBe(1);
      expect(activeJobs[0].name).toBe('Active Job');
    });
  });

  describe('getUpcomingJobs()', () => {
    it('should return jobs sorted by nextRunTime', () => {
      const job2 = scheduler.scheduleOnce({
        name: 'Job 2',
        onceAt: Date.now() + 120000,
        templateData: {},
      });
      const job1 = scheduler.scheduleOnce({
        name: 'Job 1',
        onceAt: Date.now() + 60000,
        templateData: {},
      });

      const upcoming = scheduler.getUpcomingJobs(10);
      expect(upcoming.length).toBe(2);
      expect(upcoming[0].id).toBe(job1.id);
      expect(upcoming[1].id).toBe(job2.id);
    });

    it('should limit results', () => {
      scheduler.scheduleOnce({
        name: 'Job 1',
        onceAt: Date.now() + 60000,
        templateData: {},
      });
      scheduler.scheduleOnce({
        name: 'Job 2',
        onceAt: Date.now() + 120000,
        templateData: {},
      });

      const upcoming = scheduler.getUpcomingJobs(1);
      expect(upcoming.length).toBe(1);
    });
  });

  describe('start() and stop()', () => {
    it('should start the scheduler', () => {
      scheduler.start();
      expect(scheduler.getStatus().isRunning).toBe(true);
    });

    it('should stop the scheduler', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.getStatus().isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      scheduler.start();
      scheduler.start();
      expect(scheduler.getStatus().isRunning).toBe(true);
    });
  });

  describe('getStatus()', () => {
    it('should return correct status', () => {
      scheduler.scheduleOnce({
        name: 'Test Job',
        onceAt: Date.now() + 60000,
        templateData: {},
      });

      const status = scheduler.getStatus();
      expect(status.totalJobs).toBe(1);
      expect(status.activeJobs).toBe(1);
      expect(status.isRunning).toBe(false);
      expect(status.nextScheduledRun).toBeDefined();
    });

    it('should return null for nextScheduledRun when no jobs', () => {
      const status = scheduler.getStatus();
      expect(status.nextScheduledRun).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should clear all jobs', () => {
      scheduler.scheduleOnce({
        name: 'Job 1',
        onceAt: Date.now() + 60000,
        templateData: {},
      });
      scheduler.scheduleOnce({
        name: 'Job 2',
        onceAt: Date.now() + 120000,
        templateData: {},
      });

      scheduler.clear();

      expect(scheduler.getAllJobs().length).toBe(0);
      expect(scheduler.getStatus().isRunning).toBe(false);
    });
  });

  describe('event emissions', () => {
    it('should emit next-run event when job is scheduled', () => {
      const spy = vi.fn();
      scheduler.on('next-run', spy);

      scheduler.scheduleOnce({
        name: 'Event Test',
        onceAt: Date.now() + 60000,
        templateData: {},
      });

      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].job.name).toBe('Event Test');
    });
  });
});

describe('parseCronExpression()', () => {
  it('should parse valid cron expression', () => {
    const result = parseCronExpression('0 9 * * 1');
    expect(result.minutes).toEqual([0]);
    expect(result.hours).toEqual([9]);
    expect(result.months).toHaveLength(12);
    expect(result.daysOfWeek).toEqual([1]);
  });

  it('should parse step values', () => {
    const result = parseCronExpression('*/15 * * * *');
    expect(result.minutes).toEqual([0, 15, 30, 45]);
  });

  it('should parse range values', () => {
    const result = parseCronExpression('0 9-17 * * *');
    expect(result.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('should parse list values', () => {
    const result = parseCronExpression('0,15,30,45 * * * *');
    expect(result.minutes).toEqual([0, 15, 30, 45]);
  });

  it('should throw error for invalid cron expression', () => {
    expect(() => {
      parseCronExpression('invalid');
    }).toThrow('Invalid cron expression');
  });
});

describe('getNextIntervalRun()', () => {
  it('should return time + interval', () => {
    const fromTime = Date.now();
    const interval = 3600000;
    const result = getNextIntervalRun(interval, fromTime);
    expect(result).toBe(fromTime + interval);
  });
});