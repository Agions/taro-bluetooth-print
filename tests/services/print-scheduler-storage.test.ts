/**
 * Tests for PrintScheduler persistence using IStorageAdapter
 * 验证 PrintScheduler 使用抽象存储适配器时的跨端任务持久化与自愈恢复
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrintScheduler } from '../../src/services/PrintScheduler';
import { MemoryStorageAdapter } from '../../src/storage';

describe('PrintScheduler - Universal Storage Persistence', () => {
  let memoryStorage: MemoryStorageAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    memoryStorage = new MemoryStorageAdapter('test_sched_');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('persists scheduled print jobs into IStorageAdapter across instances', () => {
    const scheduler1 = new PrintScheduler({ storage: memoryStorage });

    const futureTime = Date.now() + 60000;
    const job = scheduler1.scheduleOnce({
      name: 'Receipt Print',
      onceAt: futureTime,
      templateData: { orderId: '12345' },
    });

    expect(job.id).toBeDefined();

    // Fast-forward debounce timer (500ms)
    vi.advanceTimersByTime(600);

    const rawPersisted = memoryStorage.getItem('print-scheduler-jobs');
    expect(rawPersisted).toBeTruthy();
    expect(rawPersisted).toContain('Receipt Print');

    // Create a new scheduler instance sharing the same storage (simulating app restart)
    const scheduler2 = new PrintScheduler({ storage: memoryStorage });
    const restoredJobs = scheduler2.getAllJobs();

    expect(restoredJobs.length).toBe(1);
    expect(restoredJobs[0]?.name).toBe('Receipt Print');
    expect(restoredJobs[0]?.templateData).toEqual({ orderId: '12345' });

    scheduler1.clear();
    scheduler2.clear();
  });
});
