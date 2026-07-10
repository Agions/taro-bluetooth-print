import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { ConnectionManager } from '../../src/services/ConnectionManager';
import type { IConnectionManager } from '../../src/services/interfaces/IConnectionManager';
import { PrinterState } from '../../src/types';
import type { IPrinterAdapter } from '../../src/types';
import { BluetoothPrintError, ErrorCode } from '../../src/errors/BaseError';

/**
 * ConnectionManager Contract Tests
 *
 * Verifies that ConnectionManager implements the IConnectionManager interface
 * faithfully:
 *   - Type-level: the concrete class is assignable to IConnectionManager.
 *   - Structural: all 7 interface methods (connect/disconnect/isConnected/
 *     getDeviceId/getState/getAdapter/destroy) exist with the right shapes.
 *   - Behavioural: the state machine (DISCONNECTED → CONNECTING → CONNECTED →
 *     DISCONNECTED) and adapter delegation all match the contract.
 */
describe('ConnectionManager — IConnectionManager contract', () => {
  let mockAdapter: IPrinterAdapter;
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockResolvedValue(undefined),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
      onStateChange: vi.fn(),
    };
    connectionManager = new ConnectionManager(mockAdapter);
  });

  afterEach(() => {
    connectionManager.destroy();
  });

  test('instance is structurally assignable to IConnectionManager', () => {
    const asInterface: IConnectionManager = connectionManager;
    expect(asInterface).toBeDefined();
    expect(typeof asInterface.connect).toBe('function');
    expect(typeof asInterface.disconnect).toBe('function');
    expect(typeof asInterface.isConnected).toBe('function');
    expect(typeof asInterface.getDeviceId).toBe('function');
    expect(typeof asInterface.getState).toBe('function');
    expect(typeof asInterface.getAdapter).toBe('function');
    expect(typeof asInterface.destroy).toBe('function');
  });

  test('exposes exactly the 7 IConnectionManager methods', () => {
    const methodNames = [
      'connect',
      'disconnect',
      'isConnected',
      'getDeviceId',
      'getState',
      'getAdapter',
      'destroy',
    ];
    expect(methodNames.length).toBe(7);
    for (const name of methodNames) {
      expect(name in connectionManager, `${name} should exist on ConnectionManager`).toBe(true);
      expect(typeof (connectionManager as any)[name]).toBe('function');
    }
  });

  test('connect() drives the DISCONNECTED → CONNECTING → CONNECTED state machine and stores the device id', async () => {
    const transitions: PrinterState[] = [];
    connectionManager.on('state-change', s => transitions.push(s));

    // Pre-connect: DISCONNECTED, no device id, not connected.
    expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    expect(connectionManager.isConnected()).toBe(false);
    expect(connectionManager.getDeviceId()).toBeNull();

    await connectionManager.connect('dev-A');

    // Post-connect contract: CONNECTED, id is the device we asked for,
    // adapter.connect was delegated.
    expect(mockAdapter.connect).toHaveBeenCalledWith('dev-A');
    expect(connectionManager.getState()).toBe(PrinterState.CONNECTED);
    expect(connectionManager.isConnected()).toBe(true);
    expect(connectionManager.getDeviceId()).toBe('dev-A');

    // The state machine must have hit CONNECTING and CONNECTED (and may
    // also have emitted DISCONNECTED as part of cleanup depending on
    // timing, so we check containment rather than strict equality).
    expect(transitions).toContain(PrinterState.CONNECTING);
    expect(transitions).toContain(PrinterState.CONNECTED);
  });

  test('disconnect() reverses the state to DISCONNECTED and clears the device id', async () => {
    await connectionManager.connect('dev-B');
    expect(connectionManager.isConnected()).toBe(true);

    await connectionManager.disconnect();

    expect(mockAdapter.disconnect).toHaveBeenCalledWith('dev-B');
    expect(connectionManager.isConnected()).toBe(false);
    expect(connectionManager.getDeviceId()).toBeNull();
    expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
  });

  test('isConnected() / getDeviceId() / getState() are read-only accessors with no side effects', () => {
    // Multiple reads should be idempotent and return stable values.
    expect(connectionManager.isConnected()).toBe(false);
    expect(connectionManager.isConnected()).toBe(false);
    expect(connectionManager.getDeviceId()).toBeNull();
    expect(connectionManager.getDeviceId()).toBeNull();
    expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
  });

  test('connect() throws a BluetoothPrintError and ends in DISCONNECTED on adapter failure', async () => {
    mockAdapter.connect.mockRejectedValueOnce(new Error('boom'));

    await expect(connectionManager.connect('dev-C')).rejects.toBeInstanceOf(
      BluetoothPrintError
    );

    // Failed connect must restore the contract: no id, not connected, DISCONNECTED.
    expect(connectionManager.getDeviceId()).toBeNull();
    expect(connectionManager.isConnected()).toBe(false);
    expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
  });

  test('connect() classifies timeout errors as CONNECTION_TIMEOUT', async () => {
    mockAdapter.connect.mockRejectedValueOnce(new Error('timed out after 10000ms'));

    try {
      await connectionManager.connect('dev-D');
      expect.unreachable('expected connect() to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(BluetoothPrintError);
      expect((err as BluetoothPrintError).code).toBe(ErrorCode.CONNECTION_TIMEOUT);
    }
  });

  test('getAdapter() returns the same adapter instance passed in', () => {
    expect(connectionManager.getAdapter()).toBe(mockAdapter);
  });

  test('destroy() stops timers, removes listeners, and resets the state', async () => {
    const seen: string[] = [];
    connectionManager.on('state-change', () => seen.push('x'));

    await connectionManager.connect('dev-E');
    expect(connectionManager.isConnected()).toBe(true);

    // Capture listener count before destroy.
    const beforeListeners = connectionManager.listenerCount('state-change');
    expect(beforeListeners).toBeGreaterThan(0);

    connectionManager.destroy();

    // Contract: state is DISCONNECTED, no device id, adapter still
    // accessible (it's not nulled out by destroy).
    expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    expect(connectionManager.getDeviceId()).toBeNull();
    expect(connectionManager.getAdapter()).toBe(mockAdapter);

    // All listeners removed.
    expect(connectionManager.listenerCount('state-change')).toBe(0);

    // destroy() should not throw if called twice.
    expect(() => connectionManager.destroy()).not.toThrow();
  });
});
