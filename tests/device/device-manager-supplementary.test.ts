/**
 * DeviceManager supplementary tests — covers branches not exercised by
 * tests/device/device-manager.test.ts:
 * - stopScan() no-op when not scanning
 * - startScan() error path (Taro.openBluetoothAdapter rejects)
 * - getPairedDevices() storage error path
 * - connect() failure paths (no services, no writable char, services=[])
 * - getDeviceInfo() cache expiry
 * - handleDeviceFound dedup + RSSI update
 * - savePairedDevice setStorage error path
 */
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

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

import Taro from '@tarojs/taro';
import { DeviceManager } from '@/device/DeviceManager';
import type { BluetoothDevice } from '@/device/DeviceManager';
import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';

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
  getBLEDeviceServices: ReturnType<typeof vi.fn>;
  getBLEDeviceCharacteristics: ReturnType<typeof vi.fn>;
};

function makeDevice(id: string, rssi = -50): BluetoothDevice {
  return {
    deviceId: id,
    name: `dev-${id}`,
    RSSI: rssi,
    isPaired: false,
  };
}

describe('DeviceManager — supplementary', () => {
  let manager: DeviceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockTaro.openBluetoothAdapter.mockResolvedValue(undefined);
    mockTaro.closeBluetoothAdapter.mockResolvedValue(undefined);
    mockTaro.startBluetoothDevicesDiscovery.mockResolvedValue(undefined);
    mockTaro.stopBluetoothDevicesDiscovery.mockResolvedValue(undefined);
    mockTaro.getStorageSync.mockReturnValue(null);
    mockTaro.setStorageSync.mockReturnValue(undefined);
    mockTaro.createBLEConnection.mockResolvedValue(undefined);
    mockTaro.closeBLEConnection.mockResolvedValue(undefined);
    mockTaro.getBLEDeviceServices.mockResolvedValue({ services: [] });
    mockTaro.getBLEDeviceCharacteristics.mockResolvedValue({ characteristics: [] });
    manager = new DeviceManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('stopScan()', () => {
    test('is a no-op when not scanning', async () => {
      await manager.stopScan();
      expect(mockTaro.stopBluetoothDevicesDiscovery).not.toHaveBeenCalled();
    });

    test('rethrows if Taro.stopBluetoothDevicesDiscovery rejects', async () => {
      mockTaro.startBluetoothDevicesDiscovery.mockResolvedValue(undefined);
      await manager.startScan();
      mockTaro.stopBluetoothDevicesDiscovery.mockRejectedValueOnce(new Error('fail'));
      await expect(manager.stopScan()).rejects.toThrow('fail');
    });
  });

  describe('startScan() error path', () => {
    test('emits and throws if openBluetoothAdapter fails', async () => {
      mockTaro.openBluetoothAdapter.mockRejectedValueOnce(new Error('bluetooth off'));
      await expect(manager.startScan()).rejects.toThrow('bluetooth off');
      expect(manager['isScanning' as keyof DeviceManager]).toBe(false);
    });
  });

  describe('getPairedDevices()', () => {
    test('returns parsed devices with isPaired=true', async () => {
      const stored = [
        { deviceId: 'a', name: 'A', RSSI: -60 },
        { deviceId: 'b', name: 'B', RSSI: -70 },
      ];
      mockTaro.getStorageSync.mockReturnValue(stored);
      const result = await manager.getPairedDevices();
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ deviceId: 'a', isPaired: true });
      expect(result[1]).toMatchObject({ deviceId: 'b', isPaired: true });
    });

    test('returns [] when storage is null', async () => {
      mockTaro.getStorageSync.mockReturnValue(null);
      const result = await manager.getPairedDevices();
      expect(result).toEqual([]);
    });

    test('returns [] when storage throws', async () => {
      mockTaro.getStorageSync.mockImplementation(() => {
        throw new Error('storage broken');
      });
      const result = await manager.getPairedDevices();
      expect(result).toEqual([]);
    });
  });

  describe('connect() failure paths', () => {
    test('throws SERVICE_NOT_FOUND when device exposes no services', async () => {
      mockTaro.getBLEDeviceServices.mockResolvedValueOnce({ services: [] });
      await expect(manager.connect('dev1')).rejects.toMatchObject({
        code: ErrorCode.SERVICE_NOT_FOUND,
      });
    });

    test('throws CHARACTERISTIC_NOT_FOUND when no writable characteristic exists', async () => {
      mockTaro.getBLEDeviceServices.mockResolvedValueOnce({
        services: [{ uuid: 'svc-1', isPrimary: true }],
      });
      mockTaro.getBLEDeviceCharacteristics.mockResolvedValueOnce({
        characteristics: [{ uuid: 'char-1', properties: { read: true, write: false } }],
      });
      await expect(manager.connect('dev1')).rejects.toMatchObject({
        code: ErrorCode.CHARACTERISTIC_NOT_FOUND,
      });
    });

    test('finds the first writable characteristic across multiple services', async () => {
      mockTaro.getBLEDeviceServices.mockResolvedValueOnce({
        services: [
          { uuid: 'svc-1', isPrimary: true },
          { uuid: 'svc-2', isPrimary: true },
        ],
      });
      // First service: only readable
      mockTaro.getBLEDeviceCharacteristics
        .mockResolvedValueOnce({
          characteristics: [{ uuid: 'char-r', properties: { write: false } }],
        })
        // Second service: writable
        .mockResolvedValueOnce({
          characteristics: [{ uuid: 'char-w', properties: { write: true } }],
        });
      await manager.connect('dev1');
      expect(mockTaro.createBLEConnection).toHaveBeenCalledWith({ deviceId: 'dev1' });
    });

    test('skips cache when the device was not in discoveredDevices', async () => {
      mockTaro.getBLEDeviceServices.mockResolvedValueOnce({
        services: [{ uuid: 'svc-1', isPrimary: true }],
      });
      mockTaro.getBLEDeviceCharacteristics.mockResolvedValueOnce({
        characteristics: [{ uuid: 'char-1', properties: { write: true } }],
      });
      // No handleDeviceFound call → discoveredDevices is empty.
      await manager.connect('dev1');
      expect(manager.getDeviceInfo('dev1')).toBeNull(); // not cached
    });
  });

  describe('getDeviceInfo()', () => {
    test('returns discovered device when present', () => {
      const d = makeDevice('d1');
      manager['discoveredDevices' as keyof DeviceManager].set('d1', d);
      expect(manager.getDeviceInfo('d1')).toEqual(d);
    });

    test('returns null for unknown device', () => {
      expect(manager.getDeviceInfo('unknown')).toBeNull();
    });

    test('returns cached device if within 24h expiry', () => {
      const d = makeDevice('d2');
      manager['deviceCache' as keyof DeviceManager].set('d2', {
        device: d,
        serviceId: 'svc',
        characteristicId: 'char',
        cachedAt: Date.now(),
      });
      expect(manager.getDeviceInfo('d2')).toEqual(d);
    });

    test('returns null when cached device is past 24h expiry', () => {
      const d = makeDevice('d3');
      manager['deviceCache' as keyof DeviceManager].set('d3', {
        device: d,
        serviceId: 'svc',
        characteristicId: 'char',
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // 25h ago
      });
      expect(manager.getDeviceInfo('d3')).toBeNull();
    });
  });

  describe('disconnect()', () => {
    test('rethrows on Taro failure', async () => {
      mockTaro.closeBLEConnection.mockRejectedValueOnce(new Error('lost'));
      await expect(manager.disconnect('dev1')).rejects.toThrow('lost');
    });

    test('emits device-disconnected on success', async () => {
      const handler = vi.fn();
      manager.on('device-disconnected', handler);
      await manager.disconnect('dev1');
      expect(handler).toHaveBeenCalledWith('dev1');
    });
  });

  describe('handleDeviceFound()', () => {
    test('deduplicates devices by deviceId (allowDuplicates=false default)', () => {
      const handler = (manager as unknown as { handleDeviceFound: (res: unknown) => void })
        .handleDeviceFound;
      handler.bind(manager)({
        devices: [{ deviceId: 'd1', name: 'D', RSSI: -70 }],
      });
      // Duplicate with stronger RSSI is dropped because allowDuplicates=false.
      handler.bind(manager)({
        devices: [{ deviceId: 'd1', name: 'D', RSSI: -50 }],
      });
      const devices = manager.getDiscoveredDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0]!.rssi).toBe(-70); // first wins
    });

    test('updates RSSI when allowDuplicates=true', async () => {
      await manager.startScan({ allowDuplicates: true });
      const handler = (manager as unknown as { handleDeviceFound: (res: unknown) => void })
        .handleDeviceFound;
      handler.bind(manager)({
        devices: [{ deviceId: 'd1', name: 'D', RSSI: -70 }],
      });
      handler.bind(manager)({
        devices: [{ deviceId: 'd1', name: 'D', RSSI: -50 }],
      });
      expect(manager.getDiscoveredDevices()[0]!.rssi).toBe(-50);
    });

    test('skips devices with no name and no localName', () => {
      const handler = (manager as unknown as { handleDeviceFound: (res: unknown) => void })
        .handleDeviceFound;
      handler.bind(manager)({
        devices: [{ deviceId: 'd1', RSSI: -50 }],
      });
      expect(manager.getDiscoveredDevices()).toHaveLength(0);
    });

    test('honors nameFilter string (case-insensitive)', async () => {
      await manager.startScan({ nameFilter: 'PRINTER' });
      const handler = (manager as unknown as { handleDeviceFound: (res: unknown) => void })
        .handleDeviceFound;
      handler.bind(manager)({
        devices: [
          { deviceId: 'd1', name: 'My Printer', RSSI: -50 },
          { deviceId: 'd2', name: 'Random Speaker', RSSI: -50 },
        ],
      });
      const devices = manager.getDiscoveredDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0]!.deviceId).toBe('d1');
    });

    test('honors nameFilter regex', async () => {
      await manager.startScan({ nameFilter: /^BT-/ });
      const handler = (manager as unknown as { handleDeviceFound: (res: unknown) => void })
        .handleDeviceFound;
      handler.bind(manager)({
        devices: [
          { deviceId: 'd1', name: 'BT-58', RSSI: -50 },
          { deviceId: 'd2', name: 'Other', RSSI: -50 },
        ],
      });
      expect(manager.getDiscoveredDevices()).toHaveLength(1);
    });
  });

  describe('savePairedDevice()', () => {
    test('persists device via setStorageSync', () => {
      const d = makeDevice('d9');
      // Trigger via internal API or by connect+discovered flow. Here we
      // simulate by calling the private method.
      (manager as unknown as { savePairedDevice: (d: BluetoothDevice) => void })
        .savePairedDevice(d);
      expect(mockTaro.setStorageSync).toHaveBeenCalledWith(
        'bluetooth_paired_devices',
        expect.arrayContaining([expect.objectContaining({ deviceId: 'd9' })])
      );
    });

    test('catches setStorageSync errors and logs (does not throw)', () => {
      mockTaro.setStorageSync.mockImplementation(() => {
        throw new Error('storage full');
      });
      const d = makeDevice('d9');
      expect(() =>
        (manager as unknown as { savePairedDevice: (d: BluetoothDevice) => void })
          .savePairedDevice(d)
      ).not.toThrow();
    });
  });
});