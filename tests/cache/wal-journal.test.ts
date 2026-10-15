/**
 * WAL Journal Engine & Storage Adapter Tests
 * 预写日志与存储适配器容灾测试集
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crc32 } from '../../src/utils/checksum';
import {
  MemoryStorageAdapter,
  TaroStorageAdapter,
  createUniversalStorage,
} from '../../src/storage';
import { WALJournal } from '../../src/cache/WALJournal';
import { PrintQueue, PrintJobPriority } from '../../src/queue/PrintQueue';

describe('CRC32 Checksum Utility', () => {
  it('computes expected CRC32 for known byte patterns', () => {
    const empty = new Uint8Array(0);
    expect(crc32(empty)).toBe('00000000');

    const hello = new TextEncoder().encode('123456789');
    // Standard CRC-32 test vector for "123456789" is 0xcbf43926
    expect(crc32(hello)).toBe('cbf43926');
  });

  it('generates different checksums for different data', () => {
    const data1 = new Uint8Array([1, 2, 3, 4]);
    const data2 = new Uint8Array([1, 2, 3, 5]);
    expect(crc32(data1)).not.toBe(crc32(data2));
  });
});

describe('Storage Adapters', () => {
  it('MemoryStorageAdapter provides standard key-value storage', () => {
    const storage = new MemoryStorageAdapter('test_');
    expect(storage.getItem('key1')).toBeNull();

    storage.setItem('key1', 'value1');
    expect(storage.getItem('key1')).toBe('value1');

    storage.setItem('key2', 'value2');
    expect(storage.getAllKeys()).toEqual(['key1', 'key2']);

    storage.removeItem('key1');
    expect(storage.getItem('key1')).toBeNull();

    storage.clear();
    expect(storage.getAllKeys()).toEqual([]);
  });

  it('createUniversalStorage falls back to MemoryStorageAdapter when Taro is unavailable', () => {
    const savedTaro = (globalThis as unknown as { Taro?: unknown }).Taro;
    try {
      delete (globalThis as unknown as { Taro?: unknown }).Taro;
      const storage = createUniversalStorage('auto_');
      storage.setItem('foo', 'bar');
      expect(storage.getItem('foo')).toBe('bar');
    } finally {
      (globalThis as unknown as { Taro?: unknown }).Taro = savedTaro;
    }
  });

  it('TaroStorageAdapter correctly stores and retrieves data through Taro API', () => {
    const map = new Map<string, unknown>();
    const taro = (globalThis as unknown as {
      Taro: {
        getStorageSync: (k: string) => unknown;
        setStorageSync: (k: string, v: unknown) => void;
      };
    }).Taro;

    vi.spyOn(taro, 'setStorageSync').mockImplementation((k: string, v: unknown) => {
      map.set(k, v);
    });
    vi.spyOn(taro, 'getStorageSync').mockImplementation((k: string) => map.get(k));

    const storage = new TaroStorageAdapter('taro_test_');
    storage.setItem('foo', 'bar');
    expect(storage.getItem('foo')).toBe('bar');
  });
});

describe('WALJournal Engine', () => {
  let storage: MemoryStorageAdapter;
  let wal: WALJournal;

  beforeEach(() => {
    storage = new MemoryStorageAdapter('wal_test_');
    wal = new WALJournal(storage, {
      dedupWindowMs: 5000,
      retentionMs: 10000,
    });
  });

  it('records queued job and updates sequence monotonically', () => {
    const data1 = new Uint8Array([10, 20, 30]);
    const entry1 = wal.recordQueued({ id: 'job-1', data: data1, priority: 2 });

    expect(entry1.seq).toBe(1);
    expect(entry1.jobId).toBe('job-1');
    expect(entry1.status).toBe('QUEUED');
    expect(entry1.checksum).toBe(crc32(data1));

    const data2 = new Uint8Array([40, 50]);
    const entry2 = wal.recordQueued({ id: 'job-2', data: data2 });
    expect(entry2.seq).toBe(2);
  });

  it('transitions state: QUEUED -> IN_PROGRESS -> COMPLETED', () => {
    const data = new Uint8Array([1, 2, 3]);
    wal.recordQueued({ id: 'job-fsm', data });

    expect(wal.recordStarted('job-fsm')).toBe(true);
    let stats = wal.getStats();
    expect(stats.inProgress).toBe(1);

    expect(wal.recordCompleted('job-fsm')).toBe(true);
    stats = wal.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.inProgress).toBe(0);
  });

  it('detects duplicate print jobs within dedup window', () => {
    const data = new Uint8Array([99, 100, 101]);
    expect(wal.isDuplicate(data)).toBe(false);

    wal.recordQueued({ id: 'job-orig', data });
    wal.recordStarted('job-orig');
    wal.recordCompleted('job-orig');

    expect(wal.isDuplicate(data)).toBe(true);
  });

  it('recovers unfinished jobs after crash simulation', () => {
    const data1 = new Uint8Array([1, 1, 1]);
    const data2 = new Uint8Array([2, 2, 2]);
    const data3 = new Uint8Array([3, 3, 3]);

    wal.recordQueued({ id: 'job-done', data: data1 });
    wal.recordStarted('job-done');
    wal.recordCompleted('job-done');

    wal.recordQueued({ id: 'job-pending', data: data2, priority: 3 });
    wal.recordQueued({ id: 'job-running', data: data3, priority: 1 });
    wal.recordStarted('job-running');

    // Simulate system restart by initializing new WALJournal instance sharing same storage
    const recoveredWal = new WALJournal(storage);
    const unfinished = recoveredWal.getUnfinishedJobs();

    expect(unfinished.length).toBe(2);
    // Higher priority job-pending (3) should be ordered first
    expect(unfinished[0]!.id).toBe('job-pending');
    expect(unfinished[0]!.data).toEqual(data2);
    expect(unfinished[1]!.id).toBe('job-running');
    expect(unfinished[1]!.data).toEqual(data3);
  });

  it('compacts expired records correctly', () => {
    const data = new Uint8Array([5, 6]);
    wal.recordQueued({ id: 'job-old', data });
    wal.recordCompleted('job-old');

    // Compact with 0 retentionMs forces eviction of completed records
    const purged = wal.compact(-1);
    expect(purged).toBe(1);
    expect(wal.getStats().total).toBe(0);
  });
});

describe('PrintQueue with WAL Integration', () => {
  let storage: MemoryStorageAdapter;
  let wal: WALJournal;
  let queue: PrintQueue;

  beforeEach(() => {
    storage = new MemoryStorageAdapter('queue_wal_');
    wal = new WALJournal(storage);
    queue = new PrintQueue({
      wal,
      autoProcess: false,
    });
  });

  it('records jobs to WAL upon add and recovers via recoverFromWAL', () => {
    const data1 = new Uint8Array([10, 20]);
    const data2 = new Uint8Array([30, 40]);

    const id1 = queue.add(data1, { priority: PrintJobPriority.HIGH });
    const id2 = queue.add(data2, { priority: PrintJobPriority.NORMAL });

    const stats = wal.getStats();
    expect(stats.queued).toBe(2);

    // Create a new queue simulating crash recovery
    const freshQueue = new PrintQueue({ wal, autoProcess: false });
    const replayedCount = freshQueue.recoverFromWAL();

    expect(replayedCount).toBe(2);
    expect(freshQueue.getJob(id1)).not.toBeNull();
    expect(freshQueue.getJob(id2)).not.toBeNull();
  });

  it('rejects duplicate jobs when deduplicate flag is passed', () => {
    const data = new Uint8Array([50, 60]);
    queue.add(data);

    // Manually complete job in WAL to simulate prior completed print
    const entries = wal.getUnfinishedJobs();
    wal.recordStarted(entries[0]!.id);
    wal.recordCompleted(entries[0]!.id);

    expect(() => {
      queue.add(data, { deduplicate: true });
    }).toThrow('Duplicate print job detected');
  });
});
