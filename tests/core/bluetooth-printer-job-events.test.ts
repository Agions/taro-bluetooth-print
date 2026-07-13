/**
 * Tests for BluetoothPrinter job-completed / job-failed events.
 *
 * These two events complement the legacy print-complete event by carrying
 * payload metadata (source, bytes, durationMs, error). They fire for both
 * the print() and writeRaw() pipelines.
 *
 * Goal: pin down the wire contract so downstream consumers (telemetry,
 * UI toasts, retry orchestration) can rely on a stable shape.
 */
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { BluetoothPrinter } from '../../src/core/BluetoothPrinter';
import { PrinterState } from '../../src/types';
import type {
  IConnectionManager,
  IPrinterAdapter,
  IPrintJobManager,
  ICommandBuilder,
} from '../../src/types';
import { BluetoothPrintError, ErrorCode } from '../../src/errors/BaseError';
import type { JobResult } from '../../src/core/BluetoothPrinter';

describe('BluetoothPrinter job-completed / job-failed events', () => {
  let mockAdapter: IPrinterAdapter;
  let mockConnectionManager: IConnectionManager;
  let mockPrintJobManager: IPrintJobManager;
  let mockCommandBuilder: ICommandBuilder;
  let printer: BluetoothPrinter;

  beforeEach(() => {
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockResolvedValue(undefined),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
      onStateChange: vi.fn(),
    };

    mockPrintJobManager = {
      start: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      remaining: vi.fn().mockReturnValue(0),
      isPaused: vi.fn().mockReturnValue(false),
      isInProgress: vi.fn().mockReturnValue(false),
      setOptions: vi.fn(),
      setProgressCallback: vi.fn(),
      setJobStateCallback: vi.fn(),
    };

    mockConnectionManager = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      getDeviceId: vi.fn().mockReturnValue('test-device'),
      getState: vi.fn().mockReturnValue(PrinterState.CONNECTED),
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
    };

    mockCommandBuilder = {
      text: vi.fn().mockReturnThis(),
      feed: vi.fn().mockReturnThis(),
      cut: vi.fn().mockReturnThis(),
      image: vi.fn().mockReturnThis(),
      qr: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      align: vi.fn().mockReturnThis(),
      setSize: vi.fn().mockReturnThis(),
      setBold: vi.fn().mockReturnThis(),
      setUnderline: vi.fn().mockReturnThis(),
      setInverse: vi.fn().mockReturnThis(),
      setStyle: vi.fn().mockReturnThis(),
      resetStyle: vi.fn().mockReturnThis(),
      barcode: vi.fn().mockReturnThis(),
      getBuffer: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5])),
      getTotalBytes: vi.fn().mockReturnValue(5),
    };

    printer = new BluetoothPrinter(mockConnectionManager, mockPrintJobManager, mockCommandBuilder);
  });

  afterEach(() => {
    printer.removeAllListeners();
  });

  // -------------------- print() pipeline --------------------

  describe('print()', () => {
    test('emits job-completed with source=print on success', async () => {
      const completed = vi.fn<(result: JobResult) => void>();
      printer.on('job-completed', completed);

      await printer.print();

      expect(completed).toHaveBeenCalledTimes(1);
      const result = completed.mock.calls[0]![0] as JobResult;
      expect(result.source).toBe('print');
      expect(result.bytes).toBe(5);
      expect(typeof result.completedAt).toBe('number');
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('does NOT emit job-completed when the job is paused', async () => {
      (mockPrintJobManager.isPaused as any).mockReturnValue(true);
      const completed = vi.fn();
      printer.on('job-completed', completed);

      await printer.print();

      expect(completed).not.toHaveBeenCalled();
    });

    test('emits job-failed with the BluetoothPrintError before re-throwing', async () => {
      // handleError preserves the original error code when it's already a BluetoothPrintError —
      // it does NOT re-wrap to PRINT_JOB_FAILED. The job-failed payload mirrors whatever
      // was thrown, which is more useful for callers than a forced uniform code.
      const failed = vi.fn();
      printer.on('job-failed', failed);
      const underlying = new BluetoothPrintError(ErrorCode.WRITE_FAILED, 'bluetooth gone');
      (mockPrintJobManager.start as any).mockRejectedValueOnce(underlying);

      await expect(printer.print()).rejects.toBeInstanceOf(BluetoothPrintError);

      expect(failed).toHaveBeenCalledTimes(1);
      const payload = failed.mock.calls[0]![0];
      expect(payload.source).toBe('print');
      expect(payload.bytes).toBe(5);
      expect(payload.error).toBeInstanceOf(BluetoothPrintError);
      expect(payload.error.code).toBe(ErrorCode.WRITE_FAILED); // original preserved
    });

    test('job-failed fires even when re-throwing fails async', async () => {
      const failed = vi.fn();
      printer.on('job-failed', failed);
      // A non-BluetoothPrintError cause should still produce a job-failed with a wrapped error.
      (mockPrintJobManager.start as any).mockRejectedValueOnce(new Error('plain boom'));

      await expect(printer.print()).rejects.toBeInstanceOf(BluetoothPrintError);
      expect(failed).toHaveBeenCalledTimes(1);
      expect(failed.mock.calls[0]![0].error.code).toBe(ErrorCode.PRINT_JOB_FAILED);
    });
  });

  // -------------------- writeRaw() pipeline --------------------

  describe('writeRaw()', () => {
    test('emits job-completed with source=writeRaw on success', async () => {
      const completed = vi.fn<(result: JobResult) => void>();
      printer.on('job-completed', completed);

      await printer.writeRaw(new Uint8Array([9, 8, 7, 6, 5, 4, 3]));

      expect(completed).toHaveBeenCalledTimes(1);
      const result = completed.mock.calls[0]![0] as JobResult;
      expect(result.source).toBe('writeRaw');
      expect(result.bytes).toBe(7);
      expect(typeof result.durationMs).toBe('number');
    });

    test('emits job-failed with source=writeRaw on adapter error', async () => {
      const failed = vi.fn();
      printer.on('job-failed', failed);
      (mockPrintJobManager.start as any).mockRejectedValueOnce(
        new BluetoothPrintError(ErrorCode.WRITE_TIMEOUT, 'timed out')
      );

      await expect(printer.writeRaw(new Uint8Array([1, 2]))).rejects.toBeInstanceOf(
        BluetoothPrintError
      );

      expect(failed).toHaveBeenCalledTimes(1);
      const payload = failed.mock.calls[0]![0];
      expect(payload.source).toBe('writeRaw');
      expect(payload.bytes).toBe(2);
      expect(payload.error.code).toBe(ErrorCode.WRITE_TIMEOUT); // original preserved
    });

    test('does NOT emit job-completed when paused', async () => {
      (mockPrintJobManager.isPaused as any).mockReturnValue(true);
      const completed = vi.fn();
      printer.on('job-completed', completed);

      await printer.writeRaw(new Uint8Array([1, 2]));

      expect(completed).not.toHaveBeenCalled();
    });
  });

  // -------------------- both events coexist with print-complete --------------------

  test('both job-completed and print-complete fire on print() success', async () => {
    const completed = vi.fn();
    const legacy = vi.fn();
    printer.on('job-completed', completed);
    printer.on('print-complete', legacy);

    await printer.print();

    expect(completed).toHaveBeenCalledTimes(1);
    expect(legacy).toHaveBeenCalledTimes(1);
  });

  test('multiple listeners all receive the same payload', async () => {
    const a = vi.fn();
    const b = vi.fn();
    printer.on('job-completed', a);
    printer.on('job-completed', b);

    await printer.print();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0]![0]).toEqual(b.mock.calls[0]![0]);
  });

  test('job-failed payload shape is stable (downstream consumers may destructure)', async () => {
    const failed = vi.fn();
    printer.on('job-failed', failed);
    (mockPrintJobManager.start as any).mockRejectedValueOnce(new Error('x'));

    await expect(printer.print()).rejects.toBeDefined();

    const payload = failed.mock.calls[0]![0];
    // The shape is the public contract — locked in.
    expect(Object.keys(payload).sort()).toEqual(
      ['bytes', 'completedAt', 'durationMs', 'error', 'source'].sort()
    );
  });
});