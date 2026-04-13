import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock Taro before any imports - vi.mock is hoisted
vi.mock('@tarojs/taro', () => ({
  default: {
    openBluetoothAdapter: vi.fn(),
    closeBluetoothAdapter: vi.fn(),
    startBluetoothDevicesDiscovery: vi.fn(),
    stopBluetoothDevicesDiscovery: vi.fn(),
    getBluetoothDevices: vi.fn(),
    getBluetoothAdapterState: vi.fn(),
    onBluetoothDeviceFound: vi.fn(),
    offBluetoothDeviceFound: vi.fn(),
    createBLEConnection: vi.fn(),
    closeBLEConnection: vi.fn(),
    getStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    getBLEDeviceServices: vi.fn(),
    getBLEDeviceCharacteristics: vi.fn(),
  },
}));

// Import after mocking
import Taro from '@tarojs/taro';
import { DeviceManager } from '@/device/DeviceManager';
import type { BluetoothDevice, ScanOptions } from '@/device/DeviceManager';

const mockTaro = Taro as unknown as {
  openBluetoothAdapter: ReturnType<typeof vi.fn>;
  closeBluetoothAdapter: ReturnType<typeof vi.fn>;
  startBluetoothDevicesDiscovery: ReturnType<typeof vi.fn>;
  stopBluetoothDevicesDiscovery: ReturnType<typeof vi.fn>;
  getBluetoothDevices: ReturnType<typeof vi.fn>;
  getBluetoothAdapterState: ReturnType<typeof vi.fn>;
  onBluetoothDeviceFound: ReturnType<typeof vi.fn>;
  offBluetoothDeviceFound: ReturnType<typeof vi.fn>;
  createBLEConnection: ReturnType<typeof vi.fn>;
  closeBLEConnection: ReturnType<typeof vi.fn>;
  getStorageSync: ReturnType<typeof vi.fn>;
  setStorageSync: ReturnType<typeof vi.fn>;
};

describe('DeviceManager', () => {
  let manager: DeviceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockTaro.openBluetoothAdapter.mockResolvedValue(undefined);
    mockTaro.closeBluetoothAdapter.mockResolvedValue(undefined);
    mockTaro.startBluetoothDevicesDiscovery.mockResolvedValue(undefined);
    mockTaro.stopBluetoothDevicesDiscovery.mockResolvedValue(undefined);
    mockTaro.getStorageSync.mockReturnValue(null);
    manager = new DeviceManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startScan()', () => {
    test('should start scanning successfully', async () => {
      const scanPromise = manager.startScan();
      await vi.runAllTimersAsync();
      await scanPromise;

      expect(mockTaro.openBluetoothAdapter).toHaveBeenCalled();
      expect(mockTaro.startBluetoothDevicesDiscovery).toHaveBeenCalled();
    });

    test('should not start scan if already scanning', async () => {
      await manager.startScan();
      vi.clearAllMocks();

      await manager.startScan();
      expect(mockTaro.startBluetoothDevicesDiscovery).not.toHaveBeenCalled();
    });

    test('should apply timeout option', async () => {
      const options: ScanOptions = { timeout: 5000 };
      await manager.startScan(options);

      expect(mockTaro.startBluetoothDevicesDiscovery).toHaveBeenCalledWith(
        expect.objectContaining({
          allowDuplicatesKey: false,
        })
      );
    });

    test('should apply serviceUUIDs filter', async () => {
      const options: ScanOptions = { serviceUUIDs: ['uuid-1', 'uuid-2'] };
      await manager.startScan(options);

      expect(mockTaro.startBluetoothDevicesDiscovery).toHaveBeenCalledWith(
        expect.objectContaining({
          services: ['uuid-1', 'uuid-2'],
        })
      );
    });

    test('should handle scan error', async () => {
      mockTaro.startBluetoothDevicesDiscovery.mockRejectedValue(new Error('Scan failed'));

      await expect(manager.startScan()).rejects.toThrow('Scan failed');
    });
  });

  describe('stopScan()', () => {
    test('should stop scanning', async () => {
      await manager.startScan();
      await manager.stopScan();

      expect(mockTaro.stopBluetoothDevicesDiscovery).toHaveBeenCalled();
    });

    test('should do nothing if not scanning', async () => {
      await manager.stopScan();
      expect(mockTaro.stopBluetoothDevicesDiscovery).not.toHaveBeenCalled();
    });
  });

  describe('getDiscoveredDevices()', () => {
    test('should return empty array initially', () => {
      expect(manager.getDiscoveredDevices()).toEqual([]);
    });
  });

  describe('connect()', () => {
    test('should connect to device successfully', async () => {
      mockTaro.createBLEConnection.mockResolvedValue(undefined);
      mockTaro.getBLEDeviceServices.mockResolvedValue({
        services: [
          { uuid: 'service-1', isPrimary: true }
        ]
      });
      mockTaro.getBLEDeviceCharacteristics.mockResolvedValue({
        characteristics: [
          { uuid: 'char-1', properties: { write: true, writeNoResponse: false }, value: 'base64test' }
        ]
      });

      await manager.connect('device-123');

      expect(mockTaro.createBLEConnection).toHaveBeenCalledWith({
        deviceId: 'device-123',
      });
    });

    test('should handle connection error', async () => {
      mockTaro.createBLEConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(manager.connect('device-123')).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect()', () => {
    test('should disconnect from device', async () => {
      mockTaro.closeBLEConnection.mockResolvedValue(undefined);

      await manager.disconnect('device-123');

      expect(mockTaro.closeBLEConnection).toHaveBeenCalledWith({
        deviceId: 'device-123',
      });
    });
  });

  describe('getDeviceInfo()', () => {
    test('should return null for unknown device', () => {
      expect(manager.getDeviceInfo('unknown-device')).toBeNull();
    });
  });

  describe('Event handling', () => {
    test('should register and emit events', () => {
      const callback = vi.fn();
      manager.on('device-found', callback);

      // Manually trigger the event handler
      const foundCallback = mockTaro.onBluetoothDeviceFound.mock.calls[0]?.[0];
      if (foundCallback) {
        const device: BluetoothDevice = {
          deviceId: 'test-1',
          name: 'Test Device',
          rssi: -50,
        };
        foundCallback({ devices: [device] });
      }
    });

    test('should remove event listeners', () => {
      const callback = vi.fn();
      manager.on('scan-start', callback);
      manager.off('scan-start', callback);
    });
  });

  describe('getPairedDevices()', () => {
    test('should return empty array when no stored devices', async () => {
      mockTaro.getStorageSync.mockReturnValue(null);

      const devices = await manager.getPairedDevices();
      expect(devices).toEqual([]);
    });

    test('should return stored paired devices', async () => {
      const storedDevices: BluetoothDevice[] = [
        { deviceId: 'device-1', name: 'Printer 1' },
        { deviceId: 'device-2', name: 'Printer 2' },
      ];
      mockTaro.getStorageSync.mockReturnValue(storedDevices);

      const devices = await manager.getPairedDevices();
      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('device-1');
    });
  });
});
