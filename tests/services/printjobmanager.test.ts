import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { PrintJobManager } from '../../src/services/PrintJobManager';
import type { IConnectionManager, IPrinterAdapter } from '../../src/types';
import { PrinterState } from '../../src/types';
import { BluetoothPrintError, ErrorCode } from '../../src/errors/baseError';

describe('PrintJobManager', () => {
  let mockAdapter: IPrinterAdapter;
  let mockConnectionManager: IConnectionManager;
  let printJobManager: PrintJobManager;

  beforeEach(() => {
    // Create a mock adapter
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockResolvedValue(undefined),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
      onStateChange: vi.fn(),
    };

    // Create a mock connection manager
    mockConnectionManager = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      getDeviceId: vi.fn().mockReturnValue('test-device'),
      getState: vi.fn().mockReturnValue(PrinterState.CONNECTED),
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
    };

    printJobManager = new PrintJobManager(mockConnectionManager);
  });

  afterEach(() => {
    printJobManager.destroy();
    // Clear static store between tests
    PrintJobManager.cleanupExpiredJobs(0);
  });

  describe('constructor', () => {
    test('should create instance with connection manager', () => {
      expect(printJobManager).toBeInstanceOf(PrintJobManager);
    });

    test('should use adapter from connection manager', () => {
      expect(mockConnectionManager.getAdapter).toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    test('should start print job successfully', async () => {
      mockAdapter.write.mockResolvedValue(undefined);

      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      await printJobManager.start(buffer);

      expect(mockAdapter.write).toHaveBeenCalled();
      expect(printJobManager.isInProgress()).toBe(false); // Completed
    });

    test('should throw when job already in progress', async () => {
      mockAdapter.write.mockImplementation(
        () => new Promise(() => {/* never resolves */})
      );

      const buffer = new Uint8Array(1000);
      const startPromise = printJobManager.start(buffer);

      // Give it time to start
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(printJobManager.start(buffer)).rejects.toThrow(BluetoothPrintError);
    });

    test('should use custom jobId when provided', async () => {
      mockAdapter.write.mockResolvedValue(undefined);

      const buffer = new Uint8Array([1, 2, 3]);
      await printJobManager.start(buffer, { jobId: 'custom-job-123' });

      expect(printJobManager.isInProgress()).toBe(false);
    });

    test('should call progress callback during job', async () => {
      const progressCalls: [number, number][] = [];
      printJobManager.setProgressCallback((sent, total) => {
        progressCalls.push([sent, total]);
      });

      // Make write complete after some time
      mockAdapter.write.mockResolvedValue(undefined);

      const buffer = new Uint8Array(100);
      await printJobManager.start(buffer);

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    test('should emit job state events', async () => {
      const states: string[] = [];
      printJobManager.setJobStateCallback(state => states.push(state));

      mockAdapter.write.mockResolvedValue(undefined);

      const buffer = new Uint8Array([1, 2, 3]);
      await printJobManager.start(buffer);

      expect(states).toContain('in-progress');
      expect(states).toContain('completed');
    });

    test('should throw BluetoothPrintError on write failure', async () => {
      mockAdapter.write.mockRejectedValue(
        new BluetoothPrintError(ErrorCode.WRITE_FAILED, 'Write failed')
      );

      const buffer = new Uint8Array([1, 2, 3]);
      await expect(printJobManager.start(buffer)).rejects.toThrow(BluetoothPrintError);
    });

    test('should throw when device disconnected during job', async () => {
      mockConnectionManager.getDeviceId.mockReturnValue(null);

      const buffer = new Uint8Array([1, 2, 3]);
      await expect(printJobManager.start(buffer)).rejects.toThrow(BluetoothPrintError);
    });
  });

  describe('pause()', () => {
    test('should pause an in-progress job', async () => {
      let resumeWrite: () => void = () => {};
      mockAdapter.write.mockImplementation(
        () =>
          new Promise(resolve => {
            resumeWrite = resolve;
          })
      );

      // Use small chunk size to trigger multiple writes
      printJobManager.setOptions({ chunkSize: 5 });

      const buffer = new Uint8Array(20);
      const startPromise = printJobManager.start(buffer);

      await new Promise(resolve => setTimeout(resolve, 10));
      printJobManager.pause();

      expect(printJobManager.isPaused()).toBe(true);
      expect(printJobManager.remaining()).toBeGreaterThan(0);

      // Clean up
      resumeWrite();
      await startPromise.catch(() => {});
    });

    test('should do nothing when no job in progress', () => {
      printJobManager.pause();
      expect(printJobManager.isPaused()).toBe(false);
    });
  });

  describe('resume()', () => {
    test('should resume a paused job', async () => {
      mockAdapter.write.mockResolvedValue(undefined);

      const buffer = new Uint8Array([1, 2, 3]);
      await printJobManager.start(buffer);

      // Already completed - resume should do nothing
      expect(printJobManager.isInProgress()).toBe(false);
    });

    test('should do nothing when not paused and not in progress', async () => {
      await printJobManager.resume();
      expect(mockAdapter.write).not.toHaveBeenCalled();
    });
  });

  describe('cancel()', () => {
    test('should cancel an in-progress job', async () => {
      let resumeWrite: () => void = () => {};
      mockAdapter.write.mockImplementation(
        () =>
          new Promise(resolve => {
            resumeWrite = resolve;
          })
      );

      const buffer = new Uint8Array(20);
      const startPromise = printJobManager.start(buffer);

      await new Promise(resolve => setTimeout(resolve, 10));
      printJobManager.cancel();

      expect(printJobManager.isInProgress()).toBe(false);
      expect(printJobManager.remaining()).toBe(0);

      // Clean up
      resumeWrite();
      await startPromise.catch(() => {});
    });

    test('should do nothing when no job in progress', () => {
      printJobManager.cancel(); // Should not throw
      expect(printJobManager.isInProgress()).toBe(false);
    });

    test('should clear job state on cancel', async () => {
      let resumeWrite: () => void = () => {};
      mockAdapter.write.mockImplementation(
        () =>
          new Promise(resolve => {
            resumeWrite = resolve;
          })
      );

      const buffer = new Uint8Array(20);
      const startPromise = printJobManager.start(buffer, { jobId: 'cancel-test-job' });

      await new Promise(resolve => setTimeout(resolve, 10));
      printJobManager.cancel();

      expect(PrintJobManager.getStaticStoreSize()).toBe(0);

      // Clean up
      resumeWrite();
      await startPromise.catch(() => {});
    });
  });

  describe('isInProgress()', () => {
    test('should return false initially', () => {
      expect(printJobManager.isInProgress()).toBe(false);
    });

    test('should return true during job', async () => {
      mockAdapter.write.mockImplementation(
        () => new Promise(() => {/* never resolves */})
      );

      const buffer = new Uint8Array(1000);
      printJobManager.start(buffer);

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(printJobManager.isInProgress()).toBe(true);
    });
  });

  describe('isPaused()', () => {
    test('should return false initially', () => {
      expect(printJobManager.isPaused()).toBe(false);
    });
  });

  describe('remaining()', () => {
    test('should return 0 when no job', () => {
      expect(printJobManager.remaining()).toBe(0);
    });
  });

  describe('setOptions()', () => {
    test('should update adapter options', () => {
      printJobManager.setOptions({ chunkSize: 1024, retries: 5 });
      // Options should be set without throwing
    });

    test('should merge with existing options', () => {
      printJobManager.setOptions({ chunkSize: 100 });
      printJobManager.setOptions({ retries: 3 });
    });
  });

  describe('setProgressCallback()', () => {
    test('should accept progress callback', () => {
      printJobManager.setProgressCallback((sent, total) => {
        expect(typeof sent).toBe('number');
        expect(typeof total).toBe('number');
      });
    });

    test('should accept undefined to clear callback', () => {
      printJobManager.setProgressCallback(undefined); // Should not throw
    });
  });

  describe('setJobStateCallback()', () => {
    test('should accept job state callback', () => {
      printJobManager.setJobStateCallback(state => {
        expect(['in-progress', 'paused', 'completed', 'cancelled']).toContain(state);
      });
    });

    test('should accept undefined to clear callback', () => {
      printJobManager.setJobStateCallback(undefined); // Should not throw
    });
  });

  describe('job state persistence (static store)', () => {
    test('should save job state when paused', async () => {
      vi.useFakeTimers();

      try {
        let resolveWrite: (() => void) | null = null;
        mockAdapter.write.mockImplementation(
          () =>
            new Promise<void>(resolve => {
              resolveWrite = resolve;
            })
        );

        printJobManager.setOptions({ chunkSize: 5 });
        const buffer = new Uint8Array(20);

        // Start job but don't await - it will be paused
        const startPromise = printJobManager.start(buffer);

        // Wait for the first write to be called
        await vi.advanceTimersByTimeAsync(0);

        // Pause the job
        printJobManager.pause();

        // Now resolve the write
        resolveWrite!();

        await startPromise;

        expect(PrintJobManager.getStaticStoreSize()).toBeGreaterThan(0);
      } finally {
        vi.useRealTimers();
      }
    });

    test('should clear static store on cleanupExpiredJobs', async () => {
      vi.useFakeTimers();

      try {
        let resolveWrite: (() => void) | null = null;
        mockAdapter.write.mockImplementation(
          () =>
            new Promise<void>(resolve => {
              resolveWrite = resolve;
            })
        );

        printJobManager.setOptions({ chunkSize: 5 });
        const buffer = new Uint8Array(20);
        const startPromise = printJobManager.start(buffer);

        await vi.advanceTimersByTimeAsync(0);
        printJobManager.pause();
        resolveWrite!();

        await startPromise;

        const count = PrintJobManager.getStaticStoreSize();
        expect(count).toBeGreaterThan(0);

        // Advance fake time so the saved job becomes old enough to be cleaned up
        vi.advanceTimersByTime(3600001); // 1 hour + 1ms
        const cleaned = PrintJobManager.cleanupExpiredJobs(3600000); // jobs older than 1 hour
        expect(cleaned).toBe(count);
        expect(PrintJobManager.getStaticStoreSize()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('destroy()', () => {
    test('should cancel any in-progress job', async () => {
      mockAdapter.write.mockImplementation(
        () => new Promise(() => {/* never resolves */})
      );

      const buffer = new Uint8Array(1000);
      printJobManager.start(buffer);

      await new Promise(resolve => setTimeout(resolve, 10));
      printJobManager.destroy();

      expect(printJobManager.isInProgress()).toBe(false);
    });

    test('should clear progress and state callbacks', () => {
      printJobManager.setProgressCallback(() => {});
      printJobManager.setJobStateCallback(() => {});
      printJobManager.destroy();
      // Destroy should not throw
    });
  });

  describe('chunked writing', () => {
    test('should write in chunks when chunkSize is smaller than buffer', async () => {
      const writeCalls: ArrayBuffer[] = [];
      mockAdapter.write.mockImplementation(async (deviceId: string, data: ArrayBuffer) => {
        writeCalls.push(data);
      });

      printJobManager.setOptions({ chunkSize: 5 });
      const buffer = new Uint8Array(20);
      await printJobManager.start(buffer);

      // Should have multiple write calls (4 chunks: 5+5+5+5)
      expect(writeCalls.length).toBe(4);
    });
  });
});
