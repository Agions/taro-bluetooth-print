import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock qq global for QQAdapter
const mockQQApi = {
  createBLEConnection: vi.fn(),
  closeBLEConnection: vi.fn(),
  getBLEConnectionState: vi.fn().mockResolvedValue({ connected: false }),
  writeBLECharacteristicValue: vi.fn(),
  getBLEDeviceServices: vi.fn(),
  getBLEDeviceCharacteristics: vi.fn(),
  onBLEConnectionStateChange: vi.fn(),
};

declare global {
  // eslint-disable-next-line no-var
  var qq: typeof mockQQApi;
}

globalThis.qq = mockQQApi;

import { QQAdapter } from '../src/adapters/QQAdapter';
import { MiniProgramAdapter } from '../src/adapters/BaseAdapter';

describe('QQAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQQApi.getBLEConnectionState.mockResolvedValue({ connected: false });
  });

  it('should be instantiable', () => {
    const adapter = new QQAdapter();
    expect(adapter).toBeDefined();
  });

  it('should extend MiniProgramAdapter', () => {
    const adapter = new QQAdapter();
    expect(adapter).toBeInstanceOf(MiniProgramAdapter);
  });

  it('should have connect method', () => {
    const adapter = new QQAdapter();
    expect(typeof adapter.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    const adapter = new QQAdapter();
    expect(typeof adapter.disconnect).toBe('function');
  });

  it('should have write method', () => {
    const adapter = new QQAdapter();
    expect(typeof adapter.write).toBe('function');
  });

  it('should use qq global as its API', () => {
    const adapter = new QQAdapter();
    const api = (adapter as any).getApi();
    expect(api).toBe(mockQQApi);
  });

  it('should call qq.createBLEConnection on connect', async () => {
    const adapter = new QQAdapter();
    mockQQApi.createBLEConnection.mockResolvedValue(undefined);
    mockQQApi.getBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: 'service-1' }],
    });
    mockQQApi.getBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [
        { uuid: 'char-1', properties: { write: true } },
      ],
    });
    // Make it appear connected before writing
    mockQQApi.getBLEConnectionState.mockResolvedValue({ connected: true });

    await adapter.connect('test-device-id');

    expect(mockQQApi.createBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should call qq.closeBLEConnection on disconnect', async () => {
    const adapter = new QQAdapter();
    mockQQApi.closeBLEConnection.mockResolvedValue(undefined);

    await adapter.disconnect('test-device-id');

    expect(mockQQApi.closeBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should write data via qq.writeBLECharacteristicValue when connected', async () => {
    const adapter = new QQAdapter();

    mockQQApi.createBLEConnection.mockResolvedValue(undefined);
    mockQQApi.getBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: '0000FFE0-0000-1000-8000-00805F9B34FB' }],
    });
    mockQQApi.getBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [
        {
          uuid: '0000FFE1-0000-1000-8000-00805F9B34FB',
          properties: { write: true },
        },
      ],
    });
    mockQQApi.writeBLECharacteristicValue.mockResolvedValue(undefined);
    mockQQApi.getBLEConnectionState.mockResolvedValue({ connected: true });

    await adapter.connect('test-device-id');
    vi.clearAllMocks();
    // After connection, getBLEConnectionState should return true
    mockQQApi.getBLEConnectionState.mockResolvedValue({ connected: true });
    await adapter.write('test-device-id', new ArrayBuffer(10));

    expect(mockQQApi.writeBLECharacteristicValue).toHaveBeenCalled();
  });
});

describe('ReactNativeAdapter', () => {
  // ReactNativeAdapter requires Platform.OS and react-native-ble-plx which are
  // not available in Node.js test environment. These tests verify the class
  // structure and interface rather than runtime behavior.

  it('should exist in the source module', async () => {
    const module = await import('../src/adapters/ReactNativeAdapter');
    expect(module.ReactNativeAdapter).toBeDefined();
  });

  it('should export a class constructor', async () => {
    const { ReactNativeAdapter } = await import('../src/adapters/ReactNativeAdapter');
    expect(typeof ReactNativeAdapter).toBe('function');
  });
});
