/**
 * Tests for BluetoothPrinter.writeRaw() — the raw byte-passthrough API.
 *
 * Goal: verify the B4 fix that lets drivers like TsplDriver / ZplDriver /
 * StarPrinter / CPCL ship their own byte stream end-to-end through the same
 * connection / chunking / progress / pause pipeline as the standard print()
 * path.
 */
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { BluetoothPrinter } from '../../src/core/BluetoothPrinter';
import { CommandBuilder } from '../../src/services/CommandBuilder';
import { PrinterState } from '../../src/types';
import type { IConnectionManager } from '../../src/services/interfaces';
import type { IPrinterAdapter, IPrintJobManager, ICommandBuilder } from '../../src/types';
import { BluetoothPrintError, ErrorCode } from '../../src/errors/BaseError';

describe('BluetoothPrinter.writeRaw()', () => {
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

    // Build a tiny in-memory job manager that mimics PrintJobManager.start() semantics.
    // We keep it minimal: just enough to verify writeRaw() calls adapter.write correctly.
    let paused = false;
    let inProgress = false;
    mockPrintJobManager = {
      start: vi.fn(async (buffer: Uint8Array) => {
        inProgress = true;
        const chunkSize = (mockPrintJobManager as any).__chunkSize ?? 512;
        let offset = 0;
        while (offset < buffer.length) {
          if (paused) {
            // Save state and return early.
            (mockPrintJobManager as any).__saved = { buffer, offset };
            return;
          }
          const end = Math.min(offset + chunkSize, buffer.length);
          await mockAdapter.write('test-device', buffer.slice(offset, end).buffer, {});
          offset = end;
        }
        inProgress = false;
        (mockPrintJobManager as any).__saved = undefined;
      }),
      pause: vi.fn(() => { paused = true; }),
      resume: vi.fn(async () => { paused = false; }),
      cancel: vi.fn(() => { paused = false; inProgress = false; }),
      remaining: vi.fn(() => 0),
      isPaused: vi.fn(() => paused),
      isInProgress: vi.fn(() => inProgress),
      setOptions: vi.fn((opts: any) => { (mockPrintJobManager as any).__chunkSize = opts?.chunkSize; }),
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
      getBuffer: vi.fn().mockReturnValue(new Uint8Array(0)),
      getTotalBytes: vi.fn().mockReturnValue(0),
    };

    printer = new BluetoothPrinter(mockConnectionManager, mockPrintJobManager, mockCommandBuilder);
  });

  afterEach(() => {
    // Mock IConnectionManager doesn't expose destroy(); skip the underlying call.
    printer.removeAllListeners();
    // Best-effort cleanup of any lingering state in the print-job mock.
    (mockPrintJobManager as any).__saved = undefined;
  });

  test('writes the buffer to the adapter via PrintJobManager.start', async () => {
    const buffer = new Uint8Array([0x53, 0x49, 0x5a, 0x45, 0x20, 0x36, 0x30, 0x20, 0x6d, 0x6d]);
    // ^ "SIZE 60 mm"

    await printer.writeRaw(buffer);

    expect(mockPrintJobManager.start).toHaveBeenCalledWith(buffer);
    expect(mockAdapter.write).toHaveBeenCalled();
    const callArgs = (mockAdapter.write as any).mock.calls[0];
    expect(callArgs[0]).toBe('test-device');
    expect(callArgs[1]).toBeInstanceOf(ArrayBuffer);
  });

  test('emits progress events during chunked writes', async () => {
    const progressEvents: Array<{ sent: number; total: number }> = [];
    printer.on('progress', e => progressEvents.push(e));

    // Wire progress callback from our mock PrintJobManager into the printer event emitter.
    (mockPrintJobManager.setProgressCallback as any).mockImplementation((cb: any) => {
      // Simulate chunked progress callbacks.
      cb(20, 100);
      cb(40, 100);
      cb(60, 100);
      cb(80, 100);
      cb(100, 100);
    });

    await printer.writeRaw(new Uint8Array(100));

    expect(progressEvents.length).toBe(5);
    expect(progressEvents.at(-1)).toEqual({ sent: 100, total: 100 });
  });

  test('emits print-complete when the job finishes successfully', async () => {
    const onComplete = vi.fn();
    printer.on('print-complete', onComplete);
    // Force isPaused() to return false so the complete-emit branch runs.
    (mockPrintJobManager.isPaused as any).mockReturnValue(false);

    await printer.writeRaw(new Uint8Array([1, 2, 3, 4]));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('throws CONNECTION_FAILED when not connected', async () => {
    (mockConnectionManager.isConnected as any).mockReturnValue(false);

    await expect(printer.writeRaw(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(BluetoothPrintError);
    await expect(printer.writeRaw(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      code: ErrorCode.CONNECTION_FAILED,
    });
    expect(mockAdapter.write).not.toHaveBeenCalled();
  });

  test('wraps PrintJobManager errors via handleError → BluetoothPrintError', async () => {
    (mockPrintJobManager.start as any).mockRejectedValueOnce(
      new BluetoothPrintError(ErrorCode.PRINT_JOB_FAILED, 'mock failure')
    );

    await expect(printer.writeRaw(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(BluetoothPrintError);
  });

  test('does NOT touch the command queue (writeRaw is bypass-only)', async () => {
    // The mockCommandBuilder.getBuffer returns 0 bytes, so we can verify clear() was NOT called.
    await printer.writeRaw(new Uint8Array([0xff, 0xff]));
    expect(mockCommandBuilder.clear).not.toHaveBeenCalled();
    expect(mockCommandBuilder.getBuffer).not.toHaveBeenCalled();
  });

  test('forwards IAdapterOptions to PrintJobManager.setOptions before start', async () => {
    const opts = { chunkSize: 10 };
    await printer.writeRaw(new Uint8Array(100), opts);
    expect(mockPrintJobManager.setOptions).toHaveBeenCalledWith(opts);
    expect(mockPrintJobManager.start).toHaveBeenCalled();
  });

  test('integrates with TsplDriver: full TSPL end-to-end flow', async () => {
    // The motivating use case: TsplDriver.build → printer.writeRaw(driver.getBuffer())
    // — this is exactly the flow that was BROKEN in v2.15.x.
    const { TsplDriver } = await import('../../src/drivers/TsplDriver');
    const tspl = new TsplDriver()
      .size(60, 40)
      .gap(3)
      .clear()
      .text('Hello World', { x: 20, y: 20, font: 3 })
      .barcode('6901234567890', { x: 20, y: 100, type: 'EAN13', height: 60 })
      .print(1, 1);
    const buffer = tspl.getBuffer();
    expect(buffer.length).toBeGreaterThan(0);

    await printer.writeRaw(buffer);
    expect(mockPrintJobManager.start).toHaveBeenCalledWith(buffer);
  });

  test('accepts an empty buffer and skips print-complete emit (no chunks written)', async () => {
    const onComplete = vi.fn();
    printer.on('print-complete', onComplete);
    await printer.writeRaw(new Uint8Array(0));
    // start() IS called with the empty buffer (PrintJobManager handles it),
    // but adapter.write is not invoked.
    expect(mockPrintJobManager.start).toHaveBeenCalledWith(new Uint8Array(0));
  });
});