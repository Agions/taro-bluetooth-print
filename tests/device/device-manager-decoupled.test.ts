/**
 * Tests for decoupled DeviceManager with custom IPrinterAdapter and IStorageAdapter
 * 验证在非 Taro 环境（如 Web / React Native / Node）下注入适配器与通用存储的完整生命周期
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { DeviceManager, getDeviceManager, deviceManager } from '../../src/device/DeviceManager';
import { MemoryStorageAdapter } from '../../src/storage';
import type { IPrinterAdapter, IAdapterOptions, BluetoothDevice } from '../../src';

describe('DeviceManager - Decoupled Architecture', () => {
  let mockAdapter: IPrinterAdapter;
  let memoryStorage: MemoryStorageAdapter;
  let manager: DeviceManager;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter('test_device_');
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockImplementation(async (_options, onDevice) => {
        if (onDevice) {
          onDevice({
            deviceId: 'dev-mock-001',
            name: 'Mock Thermal Printer',
            rssi: -50,
          });
        }
      }),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
    };

    manager = new DeviceManager(mockAdapter, memoryStorage);
  });

  test('scans for devices by delegating to adapter.startDiscovery without requiring Taro', async () => {
    const foundDevices: BluetoothDevice[] = [];
    manager.on('device-found', dev => {
      foundDevices.push(dev);
    });

    await manager.startScan({ timeout: 5000 });

    expect(mockAdapter.startDiscovery).toHaveBeenCalledTimes(1);
    expect(manager.scanning).toBe(true);
    expect(foundDevices.length).toBe(1);
    expect(foundDevices[0]?.deviceId).toBe('dev-mock-001');
    expect(foundDevices[0]?.name).toBe('Mock Thermal Printer');
  });

  test('stops scanning by delegating to adapter.stopDiscovery', async () => {
    await manager.startScan();
    expect(manager.scanning).toBe(true);

    await manager.stopScan();
    expect(mockAdapter.stopDiscovery).toHaveBeenCalledTimes(1);
    expect(manager.scanning).toBe(false);
  });

  test('connects and disconnects via adapter', async () => {
    await manager.connect('dev-mock-001');
    expect(mockAdapter.connect).toHaveBeenCalledWith('dev-mock-001');

    await manager.disconnect('dev-mock-001');
    expect(mockAdapter.disconnect).toHaveBeenCalledWith('dev-mock-001');
  });

  test('persists paired devices into injected IStorageAdapter', async () => {
    await manager.startScan();
    await manager.connect('dev-mock-001');

    const paired = await manager.getPairedDevices();
    expect(paired.length).toBe(1);
    expect(paired[0]?.deviceId).toBe('dev-mock-001');
    expect(paired[0]?.isPaired).toBe(true);

    // Verify raw storage content is valid JSON in memory storage
    const raw = memoryStorage.getItem('bluetooth_paired_devices');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)[0].deviceId).toBe('dev-mock-001');
  });

  test('getDeviceManager() returns shared instance and lazy deviceManager forwards methods', () => {
    const singleton = getDeviceManager();
    expect(singleton).toBeInstanceOf(DeviceManager);

    // Verify proxy access does not crash
    expect(deviceManager.scanning).toBe(false);
    expect(deviceManager.getDiscoveredDevices()).toEqual([]);
  });
});
