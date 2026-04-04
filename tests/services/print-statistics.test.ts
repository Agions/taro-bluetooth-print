import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintStatistics } from '../../src/services/PrintStatistics';

describe('PrintStatistics Service', () => {
  let stats: PrintStatistics;

  beforeEach(() => {
    stats = new PrintStatistics();
  });

  afterEach(() => {
    stats.reset();
  });

  describe('trackJobStart()', () => {
    it('should track a basic job start', () => {
      stats.trackJobStart('job-1');

      const result = stats.getStatistics();
      expect(result.totalJobs).toBe(1);
      expect(result.completedJobs).toBe(0);
      expect(result.failedJobs).toBe(0);
    });

    it('should track job with metadata', () => {
      stats.trackJobStart('job-2', { driver: 'EscPos', deviceId: 'device-1' });

      const record = stats.getJobRecord('job-2');
      expect(record).toBeDefined();
      expect(record?.driver).toBe('EscPos');
      expect(record?.deviceId).toBe('device-1');
    });

    it('should track multiple job starts', () => {
      stats.trackJobStart('job-1');
      stats.trackJobStart('job-2');
      stats.trackJobStart('job-3');

      const result = stats.getStatistics();
      expect(result.totalJobs).toBe(3);
    });

    it('should increment totalJobs for each start', () => {
      for (let i = 0; i < 5; i++) {
        stats.trackJobStart(`job-${i}`);
      }

      const result = stats.getStatistics();
      expect(result.totalJobs).toBe(5);
    });
  });

  describe('trackJobComplete()', () => {
    it('should track job completion with bytes and duration', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 1024, 500);

      const result = stats.getStatistics();
      expect(result.completedJobs).toBe(1);
      expect(result.totalBytes).toBe(1024);
    });

    it('should update successRate correctly', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 1024, 500);
      stats.trackJobStart('job-2');
      stats.trackJobComplete('job-2', 512, 300);
      stats.trackJobStart('job-3');
      stats.trackJobFail('job-3', 'error');

      const result = stats.getStatistics();
      expect(result.completedJobs).toBe(2);
      expect(result.failedJobs).toBe(1);
      expect(result.successRate).toBe(2 / 3);
    });

    it('should handle orphan completion (no prior start)', () => {
      stats.trackJobComplete('orphan-job', 256, 100);

      const result = stats.getStatistics();
      expect(result.completedJobs).toBe(1);
      expect(result.totalJobs).toBe(1);
    });

    it('should calculate averagePrintTime correctly', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 200);
      stats.trackJobStart('job-2');
      stats.trackJobComplete('job-2', 100, 400);

      const result = stats.getStatistics();
      expect(result.averagePrintTime).toBe(300);
    });

    it('should update driver breakdown on completion', () => {
      stats.trackJobStart('job-1', { driver: 'EscPos' });
      stats.trackJobComplete('job-1', 100, 100);

      const byDriver = stats.getByDriver();
      expect(byDriver['EscPos']).toBeDefined();
      expect(byDriver['EscPos']?.completed).toBe(1);
    });

    it('should update date breakdown on completion', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const byDate = stats.getByDate();
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
      expect(byDate[today]).toBeDefined();
      expect(byDate[today]?.completed).toBe(1);
    });
  });

  describe('trackJobFail()', () => {
    it('should track job failure with error', () => {
      stats.trackJobStart('job-1');
      stats.trackJobFail('job-1', 'Connection lost');

      const result = stats.getStatistics();
      expect(result.failedJobs).toBe(1);
    });

    it('should track job failure with Error object', () => {
      stats.trackJobStart('job-1');
      stats.trackJobFail('job-1', new Error('Timeout'));

      const result = stats.getStatistics();
      expect(result.failedJobs).toBe(1);
    });

    it('should handle orphan failure (no prior start)', () => {
      stats.trackJobFail('orphan-job', 'error');

      const result = stats.getStatistics();
      expect(result.failedJobs).toBe(1);
      expect(result.totalJobs).toBe(1);
    });

    it('should update driver breakdown on failure', () => {
      stats.trackJobStart('job-1', { driver: 'StarPrinter' });
      stats.trackJobFail('job-1', 'error');

      const byDriver = stats.getByDriver();
      expect(byDriver['StarPrinter']?.failed).toBe(1);
    });

    it('should update date breakdown on failure', () => {
      stats.trackJobStart('job-1');
      stats.trackJobFail('job-1', 'error');

      const byDate = stats.getByDate();
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
      expect(byDate[today]?.failed).toBe(1);
    });
  });

  describe('trackJobCancel()', () => {
    it('should track job cancellation', () => {
      stats.trackJobStart('job-1');
      stats.trackJobCancel('job-1');

      const result = stats.getStatistics();
      expect(result.cancelledJobs).toBe(1);
    });

    it('should handle orphan cancellation', () => {
      stats.trackJobCancel('orphan-job');

      const result = stats.getStatistics();
      expect(result.cancelledJobs).toBe(1);
    });
  });

  describe('getStatistics()', () => {
    it('should return correct totalJobs', () => {
      stats.trackJobStart('job-1');
      stats.trackJobStart('job-2');

      const result = stats.getStatistics();
      expect(result.totalJobs).toBe(2);
    });

    it('should return correct completedJobs', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const result = stats.getStatistics();
      expect(result.completedJobs).toBe(1);
    });

    it('should return correct failedJobs', () => {
      stats.trackJobStart('job-1');
      stats.trackJobFail('job-1', 'error');

      const result = stats.getStatistics();
      expect(result.failedJobs).toBe(1);
    });

    it('should return successRate as 0 when no completed or failed', () => {
      stats.trackJobStart('job-1');

      const result = stats.getStatistics();
      expect(result.successRate).toBe(0);
    });

    it('should return successRate as 1 when all completed', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const result = stats.getStatistics();
      expect(result.successRate).toBe(1);
    });

    it('should return averagePrintTime as 0 when no completions', () => {
      const result = stats.getStatistics();
      expect(result.averagePrintTime).toBe(0);
    });

    it('should return byDate breakdown', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const result = stats.getStatistics();
      expect(result.byDate).toBeDefined();
    });

    it('should return byDriver breakdown', () => {
      stats.trackJobStart('job-1', { driver: 'EscPos' });
      stats.trackJobComplete('job-1', 100, 100);

      const result = stats.getStatistics();
      expect(result.byDriver).toBeDefined();
      expect(result.byDriver['EscPos']).toBeDefined();
    });
  });

  describe('exportToJSON() / importFromJSON()', () => {
    it('should export statistics as JSON', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 1024, 500);

      const json = stats.exportToJSON();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.totalJobs).toBe(1);
      expect(parsed.completedJobs).toBe(1);
    });

    it('should export as pretty-printed JSON by default', () => {
      const json = stats.exportToJSON();

      // Should contain newlines (pretty printed)
      expect(json).toContain('\n');
    });

    it('should export as compact JSON when pretty=false', () => {
      const json = stats.exportToJSON(false);

      expect(typeof json).toBe('string');
      expect(json).not.toContain('\n');
    });

    it('should import statistics from JSON', () => {
      const json = JSON.stringify({
        totalJobs: 10,
        completedJobs: 8,
        failedJobs: 2,
        cancelledJobs: 0,
        totalBytes: 8192,
        totalPrintTime: 4000,
        byDate: {},
        byDriver: {},
      });

      const fieldsRestored = stats.importFromJSON(json);

      expect(fieldsRestored).toBeGreaterThan(0);
    });

    it('should return 0 for invalid JSON', () => {
      const result = stats.importFromJSON('invalid json');

      expect(result).toBe(0);
    });

    it('should import byDate correctly', () => {
      const json = JSON.stringify({
        totalJobs: 5,
        completedJobs: 3,
        failedJobs: 2,
        cancelledJobs: 0,
        totalBytes: 0,
        totalPrintTime: 0,
        byDate: { '2024-01-01': { completed: 3, failed: 2 } },
        byDriver: {},
      });

      stats.importFromJSON(json);

      const result = stats.getStatistics();
      expect(result.byDate['2024-01-01']).toEqual({ completed: 3, failed: 2 });
    });

    it('should import byDriver correctly', () => {
      const json = JSON.stringify({
        totalJobs: 5,
        completedJobs: 3,
        failedJobs: 2,
        cancelledJobs: 0,
        totalBytes: 0,
        totalPrintTime: 0,
        byDate: {},
        byDriver: { 'EscPos': { completed: 2, failed: 1 }, 'StarPrinter': { completed: 1, failed: 1 } },
      });

      stats.importFromJSON(json);

      const result = stats.getStatistics();
      expect(result.byDriver['EscPos']).toEqual({ completed: 2, failed: 1 });
      expect(result.byDriver['StarPrinter']).toEqual({ completed: 1, failed: 1 });
    });
  });

  describe('reset()', () => {
    it('should clear all statistics', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);
      stats.trackJobStart('job-2');
      stats.trackJobFail('job-2', 'error');

      stats.reset();

      const result = stats.getStatistics();
      expect(result.totalJobs).toBe(0);
      expect(result.completedJobs).toBe(0);
      expect(result.failedJobs).toBe(0);
      expect(result.totalBytes).toBe(0);
    });

    it('should clear byDate breakdown', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      stats.reset();

      const result = stats.getStatistics();
      expect(Object.keys(result.byDate).length).toBe(0);
    });

    it('should clear byDriver breakdown', () => {
      stats.trackJobStart('job-1', { driver: 'EscPos' });
      stats.trackJobComplete('job-1', 100, 100);

      stats.reset();

      const result = stats.getStatistics();
      expect(Object.keys(result.byDriver).length).toBe(0);
    });

    it('should allow tracking new jobs after reset', () => {
      stats.trackJobStart('old-job');
      stats.reset();

      stats.trackJobStart('new-job');
      const result = stats.getStatistics();
      expect(result.totalJobs).toBe(1);
    });
  });

  describe('getStatisticsByDateRange()', () => {
    it('should filter jobs by date range', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const now = Date.now();
      const yesterday = new Date(now - 86400000);
      const tomorrow = new Date(now + 86400000);

      const result = stats.getStatisticsByDateRange(yesterday, tomorrow);

      expect(result.completedJobs).toBe(1);
    });

    it('should accept Date objects', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);

      const result = stats.getStatisticsByDateRange(yesterday, now);

      expect(result.completedJobs).toBe(1);
    });

    it('should accept timestamp numbers', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);

      const now = Date.now();
      const yesterday = now - 86400000;

      const result = stats.getStatisticsByDateRange(yesterday, now);

      expect(result.completedJobs).toBe(1);
    });

    it('should return empty stats when no jobs in range', () => {
      const now = Date.now();
      const lastWeek = new Date(now - 7 * 86400000);
      const twoDaysAgo = new Date(now - 2 * 86400000);

      const result = stats.getStatisticsByDateRange(lastWeek, twoDaysAgo);

      expect(result.totalJobs).toBe(0);
    });
  });

  describe('getJobRecord()', () => {
    it('should return job record by ID', () => {
      stats.trackJobStart('job-1', { driver: 'EscPos' });

      const record = stats.getJobRecord('job-1');

      expect(record).toBeDefined();
      expect(record?.id).toBe('job-1');
      expect(record?.driver).toBe('EscPos');
    });

    it('should return undefined for unknown job ID', () => {
      const record = stats.getJobRecord('unknown-job');

      expect(record).toBeUndefined();
    });

    it('should return updated record after completion', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 1024, 500);

      const record = stats.getJobRecord('job-1');

      expect(record?.status).toBe('completed');
      expect(record?.bytes).toBe(1024);
      expect(record?.duration).toBe(500);
    });

    it('should return updated record after failure', () => {
      stats.trackJobStart('job-1');
      stats.trackJobFail('job-1', 'Error message');

      const record = stats.getJobRecord('job-1');

      expect(record?.status).toBe('failed');
      expect(record?.error).toBe('Error message');
    });
  });

  describe('getByDate()', () => {
    it('should return date-based breakdown', () => {
      stats.trackJobStart('job-1');
      stats.trackJobComplete('job-1', 100, 100);
      stats.trackJobStart('job-2');
      stats.trackJobFail('job-2', 'error');

      const byDate = stats.getByDate();

      expect(Object.keys(byDate).length).toBeGreaterThan(0);
    });
  });

  describe('getByDriver()', () => {
    it('should return driver-based breakdown', () => {
      stats.trackJobStart('job-1', { driver: 'EscPos' });
      stats.trackJobComplete('job-1', 100, 100);
      stats.trackJobStart('job-2', { driver: 'StarPrinter' });
      stats.trackJobFail('job-2', 'error');

      const byDriver = stats.getByDriver();

      expect(byDriver['EscPos']).toBeDefined();
      expect(byDriver['StarPrinter']).toBeDefined();
    });
  });
});
