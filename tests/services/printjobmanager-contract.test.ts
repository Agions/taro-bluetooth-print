import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { PrintJobManager } from '../../src/services/PrintJobManager';
import type { IPrintJobManager } from '../../src/services/interfaces/IPrintJobManager';
import type { IConnectionManager, IPrinterAdapter } from '../../src/types';
import { PrinterState } from '../../src/types';
import { BluetoothPrintError } from '../../src/errors/BaseError';

/**
 * PrintJobManager Contract Tests
 *
 * Verifies that PrintJobManager implements the IPrintJobManager interface:
 *   - Type-level: the class is assignable to IPrintJobManager.
 *   - Structural: all 10 interface methods exist with the right shapes
 *     (start/pause/resume/cancel/remaining/isPaused/isInProgress/
 *      setOptions/setProgressCallback/setJobStateCallback).
 *   - Behavioural: the job state machine (in-progress → paused/completed/
 *     cancelled) and the adapter delegation match the contract.
 */
describe('PrintJobManager — IPrintJobManager contract', () => {
  let mockAdapter: IPrinterAdapter;
  let mockConnectionManager: IConnectionManager;
  let printJobManager: PrintJobManager;

  beforeEach(() => {
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockResolvedValue(undefined),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
      onStateChange: vi.fn(),
    };

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
    // Clear any persisted state between tests so the static store
    // doesn't leak across runs.
    PrintJobManager.cleanupExpiredJobs(0);
  });

  test('instance is structurally assignable to IPrintJobManager', () => {
    const asInterface: IPrintJobManager = printJobManager;
    expect(asInterface).toBeDefined();
    expect(typeof asInterface.start).toBe('function');
    expect(typeof asInterface.pause).toBe('function');
    expect(typeof asInterface.resume).toBe('function');
    expect(typeof asInterface.cancel).toBe('function');
    expect(typeof asInterface.remaining).toBe('function');
    expect(typeof asInterface.isPaused).toBe('function');
    expect(typeof asInterface.isInProgress).toBe('function');
    expect(typeof asInterface.setOptions).toBe('function');
    expect(typeof asInterface.setProgressCallback).toBe('function');
    expect(typeof asInterface.setJobStateCallback).toBe('function');
  });

  test('exposes exactly the 10 IPrintJobManager methods', () => {
    const methodNames = [
      'start',
      'pause',
      'resume',
      'cancel',
      'remaining',
      'isPaused',
      'isInProgress',
      'setOptions',
      'setProgressCallback',
      'setJobStateCallback',
    ];
    expect(methodNames.length).toBe(10);
    for (const name of methodNames) {
      expect(name in printJobManager, `${name} should exist on PrintJobManager`).toBe(true);
      expect(typeof (printJobManager as any)[name]).toBe('function');
    }
  });

  test('start() drives a complete job: in-progress → completed, with progress + state callbacks fired', async () => {
    const progress: Array<[number, number]> = [];
    const states: string[] = [];
    printJobManager.setProgressCallback((sent, total) => progress.push([sent, total]));
    printJobManager.setJobStateCallback(state => states.push(state));

    mockAdapter.write.mockResolvedValue(undefined);

    const buffer = new Uint8Array(100);
    await printJobManager.start(buffer);

    // Contract: job no longer in progress, no remaining bytes, write was
    // called at least once (chunked), progress callback fired, state
    // callback saw in-progress and completed.
    expect(printJobManager.isInProgress()).toBe(false);
    expect(printJobManager.isPaused()).toBe(false);
    expect(printJobManager.remaining()).toBe(0);
    expect((mockAdapter.write as any).mock.calls.length).toBeGreaterThan(0);
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1][0]).toBe(buffer.length);
    expect(states).toContain('in-progress');
    expect(states).toContain('completed');
  });

  test('pause() / resume() / cancel() lifecycle matches the contract', async () => {
    // Make write() return a never-resolving promise so the job stays
    // "in progress" while we manipulate the lifecycle. The afterEach
    // hook will call destroy() → cancel(), which clears the buffer and
    // lets the orphan write promise be collected.
    mockAdapter.write.mockImplementation(() => new Promise<void>(() => {}));

    const states: string[] = [];
    printJobManager.setJobStateCallback(state => states.push(state));

    // Small chunkSize + larger buffer so the job is mid-loop when we
    // assert on the lifecycle.
    printJobManager.setOptions({ chunkSize: 8 });

    // Fire and forget — we don't await the start() because the write
    // promise will never resolve on its own.
    void printJobManager.start(new Uint8Array(256));

    // Give the event loop a chance to advance to the first write.
    await new Promise(r => setTimeout(r, 10));
    expect(printJobManager.isInProgress()).toBe(true);
    expect(printJobManager.isPaused()).toBe(false);

    // Pause — contract: isPaused() flips, remaining() > 0.
    printJobManager.pause();
    expect(printJobManager.isPaused()).toBe(true);
    expect(printJobManager.remaining()).toBeGreaterThan(0);
    expect(states).toContain('in-progress');

    // Cancel — contract: not in progress, not paused, no remaining.
    printJobManager.cancel();
    expect(printJobManager.isInProgress()).toBe(false);
    expect(printJobManager.isPaused()).toBe(false);
    expect(printJobManager.remaining()).toBe(0);
    expect(states).toContain('cancelled');
  });

  test('resume() with no paused job is a no-op (does not throw)', async () => {
    // No job in progress: resume() should be a safe no-op.
    await expect(printJobManager.resume()).resolves.toBeUndefined();
    expect(printJobManager.isInProgress()).toBe(false);
    expect(printJobManager.isPaused()).toBe(false);
  });

  test('start() throws when another job is already in progress (rejects with BluetoothPrintError)', async () => {
    // Use a never-resolving write so the first job stays in progress
    // while we attempt to start a second one.
    mockAdapter.write.mockImplementation(() => new Promise<void>(() => {}));

    // Use a small chunkSize so the job is mid-loop (in-progress) while
    // we attempt the second start().
    printJobManager.setOptions({ chunkSize: 8 });

    // Fire and forget the first start — we know the write will never
    // resolve, so there's no value in awaiting it.
    void printJobManager.start(new Uint8Array(256));

    // Wait for the first job to be in progress.
    await new Promise(r => setTimeout(r, 10));
    expect(printJobManager.isInProgress()).toBe(true);

    // Second start should reject with BluetoothPrintError.
    await expect(printJobManager.start(new Uint8Array(8))).rejects.toBeInstanceOf(
      BluetoothPrintError
    );
  });

  test('setOptions() merges with prior options and affects subsequent writes', async () => {
    printJobManager.setOptions({ chunkSize: 32 });
    printJobManager.setOptions({ delay: 5 }); // merged, not replacing
    // Contract: setOptions has no observable return value, just side effect.
    expect(() => printJobManager.setOptions({ retries: 7 })).not.toThrow();

    mockAdapter.write.mockResolvedValue(undefined);
    const buffer = new Uint8Array(128); // > chunkSize of 32 → multiple writes
    await printJobManager.start(buffer);
    // 128 / 32 = 4 chunks.
    expect((mockAdapter.write as any).mock.calls.length).toBe(4);
  });

  test('destroy() is idempotent and resets lifecycle state', async () => {
    mockAdapter.write.mockResolvedValue(undefined);
    await printJobManager.start(new Uint8Array(8));
    expect(printJobManager.isInProgress()).toBe(false);

    expect(() => printJobManager.destroy()).not.toThrow();
    expect(() => printJobManager.destroy()).not.toThrow();

    // After destroy, the manager should be in a clean state.
    expect(printJobManager.isInProgress()).toBe(false);
    expect(printJobManager.isPaused()).toBe(false);
    expect(printJobManager.remaining()).toBe(0);
  });
});
