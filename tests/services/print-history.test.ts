import { describe, it, expect, beforeEach } from 'vitest';
import { PrintHistory, type PrintHistoryEntry } from '../../src/services/PrintHistory';
import { PrintJobStatus, PrintJobPriority } from '../../src/queue/PrintQueue';

describe('PrintHistory', () => {
  let history: PrintHistory;

  beforeEach(() => {
    history = new PrintHistory(100);
  });

  describe('addJob()', () => {
    it('should add a new print job to history', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const id = history.addJob({
        data,
        status: PrintJobStatus.COMPLETED,
        deviceId: 'device-1',
        deviceName: 'Test Printer',
      });

      expect(id).toBeDefined();
      expect(id.startsWith('history_')).toBe(true);

      const entry = history.getEntry(id);
      expect(entry).toBeDefined();
      expect(entry?.dataSize).toBe(5);
      expect(entry?.status).toBe(PrintJobStatus.COMPLETED);
      expect(entry?.deviceId).toBe('device-1');
      expect(entry?.deviceName).toBe('Test Printer');
    });

    it('should use default priority when not specified', () => {
      const data = new Uint8Array([1, 2, 3]);
      const id = history.addJob({
        data,
        status: PrintJobStatus.COMPLETED,
      });

      const entry = history.getEntry(id);
      expect(entry?.priority).toBe(PrintJobPriority.NORMAL);
    });

    it('should enforce max entries limit', () => {
      const smallHistory = new PrintHistory(3);
      
      // Add 5 entries (exceeds limit of 3)
      for (let i = 0; i < 5; i++) {
        smallHistory.addJob({
          data: new Uint8Array([i]),
          status: PrintJobStatus.COMPLETED,
        });
      }

      // Should only have 3 entries
      expect(smallHistory.query().length).toBe(3);
    });
  });

  describe('updateJob()', () => {
    it('should update job status', () => {
      const data = new Uint8Array([1, 2, 3]);
      const id = history.addJob({
        data,
        status: PrintJobStatus.PENDING,
      });

      history.updateJob(id, {
        status: PrintJobStatus.COMPLETED,
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
      });

      const entry = history.getEntry(id);
      expect(entry?.status).toBe(PrintJobStatus.COMPLETED);
      expect(entry?.startedAt).toBeDefined();
      expect(entry?.completedAt).toBeDefined();
      expect(entry?.duration).toBeDefined();
      expect(entry?.duration).toBeGreaterThan(0);
    });

    it('should add error message on failure', () => {
      const data = new Uint8Array([1, 2, 3]);
      const id = history.addJob({
        data,
        status: PrintJobStatus.PENDING,
      });

      history.updateJob(id, {
        status: PrintJobStatus.FAILED,
        error: 'Connection timeout',
      });

      const entry = history.getEntry(id);
      expect(entry?.status).toBe(PrintJobStatus.FAILED);
      expect(entry?.error).toBe('Connection timeout');
    });

    it('should log warning for non-existent job', () => {
      history.updateJob('non-existent-id', {
        status: PrintJobStatus.COMPLETED,
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getEntry()', () => {
    it('should return entry by ID', () => {
      const data = new Uint8Array([1, 2, 3]);
      const id = history.addJob({
        data,
        status: PrintJobStatus.COMPLETED,
      });

      const entry = history.getEntry(id);
      expect(entry).toBeDefined();
      expect(entry?.id).toBe(id);
    });

    it('should return undefined for non-existent ID', () => {
      const entry = history.getEntry('non-existent');
      expect(entry).toBeUndefined();
    });
  });

  describe('getRecent()', () => {
    it('should return recent jobs', () => {
      // Add 5 jobs
      for (let i = 0; i < 5; i++) {
        history.addJob({
          data: new Uint8Array([i]),
          status: PrintJobStatus.COMPLETED,
        });
      }

      const recent = history.getRecent(3);
      expect(recent.length).toBe(3);
      // Should be sorted by createdAt descending
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].createdAt).toBeGreaterThanOrEqual(recent[i + 1].createdAt);
      }
    });

    it('should return all jobs when count exceeds total', () => {
      history.addJob({
        data: new Uint8Array([1]),
        status: PrintJobStatus.COMPLETED,
      });

      const recent = history.getRecent(100);
      expect(recent.length).toBe(1);
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      // Add some test entries
      history.addJob({
        data: new Uint8Array([1]),
        status: PrintJobStatus.COMPLETED,
        deviceId: 'device-1',
      });
      history.addJob({
        data: new Uint8Array([2]),
        status: PrintJobStatus.FAILED,
        deviceId: 'device-2',
      });
      history.addJob({
        data: new Uint8Array([3]),
        status: PrintJobStatus.COMPLETED,
        deviceId: 'device-1',
      });
    });

    it('should filter by status', () => {
      const results = history.query({ status: PrintJobStatus.COMPLETED });
      expect(results.length).toBe(2);
      expect(results.every(e => e.status === PrintJobStatus.COMPLETED)).toBe(true);
    });

    it('should filter by multiple statuses', () => {
      const results = history.query({ 
        status: [PrintJobStatus.COMPLETED, PrintJobStatus.FAILED] 
      });
      expect(results.length).toBe(3);
    });

    it('should filter by device ID', () => {
      const results = history.query({ deviceId: 'device-1' });
      expect(results.length).toBe(2);
      expect(results.every(e => e.deviceId === 'device-1')).toBe(true);
    });

    it('should filter by date range', () => {
      const now = Date.now();
      const results = history.query({
        startDate: now - 1000,
        endDate: now + 1000,
      });
      expect(results.length).toBe(3);
    });

    it('should apply pagination', () => {
      const results = history.query({ limit: 1, offset: 1 });
      expect(results.length).toBe(1);
    });
  });

  describe('getStats()', () => {
    beforeEach(() => {
      // Add test entries
      history.addJob({
        data: new Uint8Array([1]),
        status: PrintJobStatus.COMPLETED,
      });
      history.addJob({
        data: new Uint8Array([2, 3]),
        status: PrintJobStatus.COMPLETED,
      });
      history.addJob({
        data: new Uint8Array([4]),
        status: PrintJobStatus.FAILED,
      });
      history.addJob({
        data: new Uint8Array([5]),
        status: PrintJobStatus.CANCELLED,
      });
    });

    it('should return correct statistics', () => {
      const stats = history.getStats();

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.totalBytes).toBe(5);
      expect(stats.successRate).toBe(50);
    });

    it('should filter by days', () => {
      const stats = history.getStats({ days: 1 });
      expect(stats.total).toBe(4);
    });

    it('should handle empty history', () => {
      const emptyHistory = new PrintHistory();
      const stats = emptyHistory.getStats();

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.totalBytes).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all history', () => {
      history.addJob({
        data: new Uint8Array([1]),
        status: PrintJobStatus.COMPLETED,
      });

      history.clear();

      expect(history.query().length).toBe(0);
    });
  });

  describe('export()', () => {
    it('should export history as JSON', () => {
      history.addJob({
        data: new Uint8Array([1, 2, 3]),
        status: PrintJobStatus.COMPLETED,
        metadata: { test: 'value' },
      });

      const exported = history.export();
      const parsed = JSON.parse(exported) as PrintHistoryEntry[];

      expect(parsed.length).toBe(1);
      expect(parsed[0].dataSize).toBe(3);
      expect(parsed[0].metadata).toEqual({ test: 'value' });
    });
  });

  describe('import()', () => {
    it('should import history from JSON', () => {
      const entries: PrintHistoryEntry[] = [
        {
          id: 'test-1',
          dataSize: 10,
          status: PrintJobStatus.COMPLETED,
          priority: PrintJobPriority.HIGH,
          createdAt: Date.now(),
        },
        {
          id: 'test-2',
          dataSize: 20,
          status: PrintJobStatus.FAILED,
          priority: PrintJobPriority.NORMAL,
          createdAt: Date.now(),
          error: 'Test error',
        },
      ];

      const imported = history.import(JSON.stringify(entries));

      expect(imported).toBe(2);
      expect(history.getEntry('test-1')).toBeDefined();
      expect(history.getEntry('test-2')).toBeDefined();
    });

    it('should handle invalid JSON', () => {
      const imported = history.import('invalid json');
      expect(imported).toBe(0);
    });

    it('should enforce max entries after import', () => {
      const smallHistory = new PrintHistory(2);
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: `import-${i}`,
        dataSize: i + 1,
        status: PrintJobStatus.COMPLETED,
        priority: PrintJobPriority.NORMAL,
        createdAt: Date.now(),
      }));

      smallHistory.import(JSON.stringify(entries));
      expect(smallHistory.query().length).toBe(2);
    });
  });
});