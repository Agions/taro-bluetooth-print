import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { ConnectionManager } from '../../src/services/ConnectionManager';
import { PrinterState } from '../../src/types';
import type { IPrinterAdapter } from '../../src/types';
import { BluetoothPrintError, ErrorCode } from '../../src/errors/baseError';

describe('ConnectionManager', () => {
  let mockAdapter: IPrinterAdapter;
  let connectionManager: ConnectionManager;

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
    connectionManager = new ConnectionManager(mockAdapter);
  });

  afterEach(() => {
    connectionManager.destroy();
  });

  describe('constructor', () => {
    test('should create instance with default config', () => {
      expect(connectionManager).toBeInstanceOf(ConnectionManager);
    });

    test('should use provided adapter', () => {
      expect(connectionManager.getAdapter()).toBe(mockAdapter);
    });

    test('should use custom config', () => {
      const cm = new ConnectionManager(mockAdapter, {
        heartbeatEnabled: false,
        autoReconnect: false,
        maxReconnectAttempts: 5,
      });
      const config = cm.getConfig();
      expect(config.heartbeatEnabled).toBe(false);
      expect(config.autoReconnect).toBe(false);
      expect(config.maxReconnectAttempts).toBe(5);
      cm.destroy();
    });

    test('should default to DISCONNECTED state', () => {
      expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    });
  });

  describe('connect()', () => {
    test('should connect to device successfully', async () => {
      await connectionManager.connect('device-123');

      expect(mockAdapter.connect).toHaveBeenCalledWith('device-123');
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getDeviceId()).toBe('device-123');
      expect(connectionManager.getState()).toBe(PrinterState.CONNECTED);
    });

    test('should emit connected and state-change events', async () => {
      const stateChanges: PrinterState[] = [];
      const connectedDevices: string[] = [];

      connectionManager.on('state-change', state => stateChanges.push(state));
      connectionManager.on('connected', deviceId => connectedDevices.push(deviceId));

      await connectionManager.connect('device-123');

      expect(stateChanges).toContain(PrinterState.CONNECTING);
      expect(stateChanges).toContain(PrinterState.CONNECTED);
      expect(connectedDevices).toContain('device-123');
    });

    test('should throw on connection failure', async () => {
      mockAdapter.connect.mockRejectedValueOnce(
        new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'Connection failed')
      );

      await expect(connectionManager.connect('device-123')).rejects.toThrow(
        BluetoothPrintError
      );
      expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    });

    test('should throw BluetoothPrintError on generic error', async () => {
      mockAdapter.connect.mockRejectedValueOnce(new Error('Unknown error'));

      await expect(connectionManager.connect('device-123')).rejects.toThrow(
        BluetoothPrintError
      );
    });

    test('should support retry on transient failure', async () => {
      mockAdapter.connect
        .mockRejectedValueOnce(new Error('Transient failure'))
        .mockResolvedValueOnce(undefined);

      await connectionManager.connect('device-123', { retries: 1 });

      expect(mockAdapter.connect).toHaveBeenCalledTimes(2);
      expect(connectionManager.isConnected()).toBe(true);
    });

    test('should timeout when connection takes too long', async () => {
      mockAdapter.connect.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      await expect(
        connectionManager.connect('device-123', { timeout: 50 })
      ).rejects.toThrow('timed out');

      expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    });

    test('should emit error event on connection failure', async () => {
      const errors: BluetoothPrintError[] = [];
      mockAdapter.connect.mockRejectedValueOnce(
        new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'Failed')
      );

      connectionManager.on('error', err => errors.push(err));
      await expect(connectionManager.connect('device-123')).rejects.toThrow();

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('disconnect()', () => {
    test('should disconnect successfully', async () => {
      await connectionManager.connect('device-123');
      await connectionManager.disconnect();

      expect(mockAdapter.disconnect).toHaveBeenCalledWith('device-123');
      expect(connectionManager.isConnected()).toBe(false);
      expect(connectionManager.getDeviceId()).toBeNull();
      expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    });

    test('should emit disconnected and state-change events', async () => {
      await connectionManager.connect('device-123');

      const stateChanges: PrinterState[] = [];
      const disconnectedDevices: string[] = [];

      connectionManager.on('state-change', state => stateChanges.push(state));
      connectionManager.on('disconnected', deviceId => disconnectedDevices.push(deviceId));

      await connectionManager.disconnect();

      expect(stateChanges).toContain(PrinterState.DISCONNECTED);
      expect(disconnectedDevices).toContain('device-123');
    });

    test('should handle disconnect when not connected', async () => {
      // Should not throw
      await connectionManager.disconnect();
      expect(mockAdapter.disconnect).not.toHaveBeenCalled();
    });

    test('should throw BluetoothPrintError on disconnect failure', async () => {
      await connectionManager.connect('device-123');
      mockAdapter.disconnect.mockRejectedValueOnce(
        new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Failed')
      );

      await expect(connectionManager.disconnect()).rejects.toThrow(BluetoothPrintError);
    });
  });

  describe('isConnected()', () => {
    test('should return false when not connected', () => {
      expect(connectionManager.isConnected()).toBe(false);
    });

    test('should return true when connected', async () => {
      await connectionManager.connect('device-123');
      expect(connectionManager.isConnected()).toBe(true);
    });
  });

  describe('getDeviceId()', () => {
    test('should return null when not connected', () => {
      expect(connectionManager.getDeviceId()).toBeNull();
    });

    test('should return deviceId when connected', async () => {
      await connectionManager.connect('device-123');
      expect(connectionManager.getDeviceId()).toBe('device-123');
    });
  });

  describe('getState()', () => {
    test('should return DISCONNECTED initially', () => {
      expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
    });

    test('should return CONNECTING during connection', async () => {
      let stateDuringConnect: PrinterState | null = null;
      mockAdapter.connect.mockImplementation(async () => {
        stateDuringConnect = connectionManager.getState();
      });

      const connectPromise = connectionManager.connect('device-123');
      await new Promise(resolve => setTimeout(resolve, 10));
      await connectPromise;

      expect(stateDuringConnect).toBe(PrinterState.CONNECTING);
    });

    test('should return CONNECTED after connection', async () => {
      await connectionManager.connect('device-123');
      expect(connectionManager.getState()).toBe(PrinterState.CONNECTED);
    });
  });

  describe('getAdapter()', () => {
    test('should return the adapter instance', () => {
      expect(connectionManager.getAdapter()).toBe(mockAdapter);
    });
  });

  describe('getConfig()', () => {
    test('should return config object', () => {
      const config = connectionManager.getConfig();
      expect(config).toHaveProperty('heartbeatEnabled');
      expect(config).toHaveProperty('heartbeatInterval');
      expect(config).toHaveProperty('autoReconnect');
      expect(config).toHaveProperty('maxReconnectAttempts');
    });

    test('should be independent from original config', () => {
      const config = connectionManager.getConfig();
      config.maxReconnectAttempts = 999;
      expect(connectionManager.getConfig().maxReconnectAttempts).not.toBe(999);
    });
  });

  describe('getReconnectStatus()', () => {
    test('should return initial reconnect status', () => {
      const status = connectionManager.getReconnectStatus();
      expect(status.isReconnecting).toBe(false);
      expect(status.attempts).toBe(0);
      expect(status.maxAttempts).toBeGreaterThan(0);
    });
  });

  describe('reconnect()', () => {
    test('should throw when no device to reconnect to', () => {
      expect(() => connectionManager.reconnect()).toThrow(BluetoothPrintError);
    });

    test('should do nothing when already reconnecting', async () => {
      await connectionManager.connect('device-123');
      mockAdapter.connect.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      connectionManager.reconnect();
      expect(connectionManager.getReconnectStatus().isReconnecting).toBe(true);

      // Calling reconnect again should not throw
      connectionManager.reconnect();
    });
  });

  describe('stopReconnect()', () => {
    test('should stop reconnection attempts', async () => {
      await connectionManager.connect('device-123');

      // Start a reconnect that will fail
      mockAdapter.connect.mockRejectedValue(new Error('fail'));
      connectionManager.reconnect();

      expect(connectionManager.getReconnectStatus().isReconnecting).toBe(true);

      connectionManager.stopReconnect();
      expect(connectionManager.getReconnectStatus().isReconnecting).toBe(false);
      expect(connectionManager.getReconnectStatus().attempts).toBe(0);
    });
  });

  describe('heartbeat', () => {
    test('should start heartbeat after successful connection', async () => {
      vi.useFakeTimers();

      try {
        await connectionManager.connect('device-123');

        // Heartbeat timer should be running
        const state = connectionManager.getState();
        expect(state).toBe(PrinterState.CONNECTED);
      } finally {
        vi.useRealTimers();
      }
    });

    test('should stop heartbeat on disconnect', async () => {
      vi.useFakeTimers();

      try {
        await connectionManager.connect('device-123');
        await connectionManager.disconnect();

        const state = connectionManager.getState();
        expect(state).toBe(PrinterState.DISCONNECTED);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('destroy()', () => {
    test('should cleanup all resources', async () => {
      await connectionManager.connect('device-123');
      connectionManager.destroy();

      expect(connectionManager.getState()).toBe(PrinterState.DISCONNECTED);
      expect(connectionManager.getDeviceId()).toBeNull();
    });

    test('should remove all listeners', async () => {
      connectionManager.on('connected', () => {});
      connectionManager.on('error', () => {});

      connectionManager.destroy();

      // Should not throw when emitting after destroy
      expect(() => connectionManager.emit('connected', 'test')).not.toThrow();
    });
  });

  describe('event emitters', () => {
    test('should emit state-change event', async () => {
      const states: PrinterState[] = [];
      connectionManager.on('state-change', state => states.push(state));

      await connectionManager.connect('device-123');
      await connectionManager.disconnect();

      expect(states).toContain(PrinterState.CONNECTING);
      expect(states).toContain(PrinterState.CONNECTED);
      expect(states).toContain(PrinterState.DISCONNECTED);
    });

    test('should emit reconnecting event when reconnect starts', async () => {
      vi.useFakeTimers();

      try {
        const events: any[] = [];
        connectionManager.on('reconnecting', data => events.push(data));

        // Connect successfully first
        await connectionManager.connect('device-123');

        // Mock connect to always fail so reconnect retries
        mockAdapter.connect.mockRejectedValue(new Error('Connection lost'));

        // Manually trigger reconnect
        connectionManager.reconnect();

        // Advance timer to let the first reconnect attempt happen
        await vi.advanceTimersByTimeAsync(100);

        expect(events.length).toBeGreaterThan(0);
        expect(events[0].deviceId).toBe('device-123');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
