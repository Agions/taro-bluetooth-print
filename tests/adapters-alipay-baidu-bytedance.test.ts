/**
 * Adapter Mock Tests
 * Tests for AlipayAdapter, BaiduAdapter, ByteDanceAdapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// AlipayAdapter Mock
// ============================================================================

const mockAlipayAPI = {
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
  var my: typeof mockAlipayAPI;
}

globalThis.my = mockAlipayAPI;

import { AlipayAdapter } from '../src/adapters/AlipayAdapter';
import { MiniProgramAdapter } from '../src/adapters/BaseAdapter';

describe('AlipayAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlipayAPI.getBLEConnectionState.mockResolvedValue({ connected: false });
  });

  it('should be instantiable', () => {
    const adapter = new AlipayAdapter();
    expect(adapter).toBeDefined();
  });

  it('should extend MiniProgramAdapter', () => {
    const adapter = new AlipayAdapter();
    expect(adapter).toBeInstanceOf(MiniProgramAdapter);
  });

  it('should have connect method', () => {
    const adapter = new AlipayAdapter();
    expect(typeof adapter.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    const adapter = new AlipayAdapter();
    expect(typeof adapter.disconnect).toBe('function');
  });

  it('should have write method', () => {
    const adapter = new AlipayAdapter();
    expect(typeof adapter.write).toBe('function');
  });

  it('should use my global as its API', () => {
    const adapter = new AlipayAdapter();
    const api = (adapter as any).getApi();
    expect(api).toBe(mockAlipayAPI);
  });

  it('should call my.createBLEConnection on connect', async () => {
    const adapter = new AlipayAdapter();
    mockAlipayAPI.createBLEConnection.mockResolvedValue(undefined);
    mockAlipayAPI.getBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: 'service-1' }],
    });
    mockAlipayAPI.getBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [{ uuid: 'char-1', properties: { write: true } }],
    });

    await adapter.connect('test-device-id');

    expect(mockAlipayAPI.createBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should call my.closeBLEConnection on disconnect', async () => {
    const adapter = new AlipayAdapter();
    mockAlipayAPI.closeBLEConnection.mockResolvedValue(undefined);

    await adapter.disconnect('test-device-id');

    expect(mockAlipayAPI.closeBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should handle connection failure gracefully', async () => {
    const adapter = new AlipayAdapter();
    mockAlipayAPI.createBLEConnection.mockRejectedValue(new Error('Connection failed'));

    await expect(adapter.connect('test-device-id')).rejects.toThrow();
  });
});

// ============================================================================
// BaiduAdapter Mock
// ============================================================================

const mockBaiduAPI = {
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
  var swan: typeof mockBaiduAPI;
}

globalThis.swan = mockBaiduAPI;

import { BaiduAdapter } from '../src/adapters/BaiduAdapter';

describe('BaiduAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBaiduAPI.getBLEConnectionState.mockResolvedValue({ connected: false });
  });

  it('should be instantiable', () => {
    const adapter = new BaiduAdapter();
    expect(adapter).toBeDefined();
  });

  it('should extend MiniProgramAdapter', () => {
    const adapter = new BaiduAdapter();
    expect(adapter).toBeInstanceOf(MiniProgramAdapter);
  });

  it('should have connect method', () => {
    const adapter = new BaiduAdapter();
    expect(typeof adapter.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    const adapter = new BaiduAdapter();
    expect(typeof adapter.disconnect).toBe('function');
  });

  it('should have write method', () => {
    const adapter = new BaiduAdapter();
    expect(typeof adapter.write).toBe('function');
  });

  it('should use swan global as its API', () => {
    const adapter = new BaiduAdapter();
    const api = (adapter as any).getApi();
    expect(api).toBe(mockBaiduAPI);
  });

  it('should call swan.createBLEConnection on connect', async () => {
    const adapter = new BaiduAdapter();
    mockBaiduAPI.createBLEConnection.mockResolvedValue(undefined);
    mockBaiduAPI.getBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: 'service-1' }],
    });
    mockBaiduAPI.getBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [{ uuid: 'char-1', properties: { write: true } }],
    });

    await adapter.connect('test-device-id');

    expect(mockBaiduAPI.createBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should call swan.closeBLEConnection on disconnect', async () => {
    const adapter = new BaiduAdapter();
    mockBaiduAPI.closeBLEConnection.mockResolvedValue(undefined);

    await adapter.disconnect('test-device-id');

    expect(mockBaiduAPI.closeBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });
});

// ============================================================================
// ByteDanceAdapter Mock
// ============================================================================

const mockByteDanceAPI = {
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
  var tt: typeof mockByteDanceAPI;
}

globalThis.tt = mockByteDanceAPI;

import { ByteDanceAdapter } from '../src/adapters/ByteDanceAdapter';

describe('ByteDanceAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockByteDanceAPI.getBLEConnectionState.mockResolvedValue({ connected: false });
  });

  it('should be instantiable', () => {
    const adapter = new ByteDanceAdapter();
    expect(adapter).toBeDefined();
  });

  it('should extend MiniProgramAdapter', () => {
    const adapter = new ByteDanceAdapter();
    expect(adapter).toBeInstanceOf(MiniProgramAdapter);
  });

  it('should have connect method', () => {
    const adapter = new ByteDanceAdapter();
    expect(typeof adapter.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    const adapter = new ByteDanceAdapter();
    expect(typeof adapter.disconnect).toBe('function');
  });

  it('should have write method', () => {
    const adapter = new ByteDanceAdapter();
    expect(typeof adapter.write).toBe('function');
  });

  it('should use tt global as its API', () => {
    const adapter = new ByteDanceAdapter();
    const api = (adapter as any).getApi();
    expect(api).toBe(mockByteDanceAPI);
  });

  it('should call tt.createBLEConnection on connect', async () => {
    const adapter = new ByteDanceAdapter();
    mockByteDanceAPI.createBLEConnection.mockResolvedValue(undefined);
    mockByteDanceAPI.getBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: 'service-1' }],
    });
    mockByteDanceAPI.getBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [{ uuid: 'char-1', properties: { write: true } }],
    });

    await adapter.connect('test-device-id');

    expect(mockByteDanceAPI.createBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should call tt.closeBLEConnection on disconnect', async () => {
    const adapter = new ByteDanceAdapter();
    mockByteDanceAPI.closeBLEConnection.mockResolvedValue(undefined);

    await adapter.disconnect('test-device-id');

    expect(mockByteDanceAPI.closeBLEConnection).toHaveBeenCalledWith({
      deviceId: 'test-device-id',
    });
  });

  it('should write data via tt.writeBLECharacteristicValue when connected', async () => {
    const adapter = new ByteDanceAdapter();

    mockByteDanceAPI.createBLEConnection.mockResolvedValue(undefined);
    mockByteDanceAPI.getBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: '0000FFE0-0000-1000-8000-00805F9B34FB' }],
    });
    mockByteDanceAPI.getBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [
        {
          uuid: '0000FFE1-0000-1000-8000-00805F9B34FB',
          properties: { write: true },
        },
      ],
    });
    mockByteDanceAPI.writeBLECharacteristicValue.mockResolvedValue(undefined);
    mockByteDanceAPI.getBLEConnectionState.mockResolvedValue({ connected: true });

    await adapter.connect('test-device-id');
    vi.clearAllMocks();
    mockByteDanceAPI.getBLEConnectionState.mockResolvedValue({ connected: true });
    
    await adapter.write('test-device-id', new ArrayBuffer(10));

    expect(mockByteDanceAPI.writeBLECharacteristicValue).toHaveBeenCalled();
  });
});

// ============================================================================
// WebBluetoothAdapter Mock
// ============================================================================

import { WebBluetoothAdapter } from '../src/adapters/WebBluetoothAdapter';

describe('WebBluetoothAdapter', () => {
  it('should be instantiable', () => {
    const adapter = new WebBluetoothAdapter();
    expect(adapter).toBeDefined();
  });

  it('should have connect method', () => {
    const adapter = new WebBluetoothAdapter();
    expect(typeof adapter.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    const adapter = new WebBluetoothAdapter();
    expect(typeof adapter.disconnect).toBe('function');
  });

  it('should have write method', () => {
    const adapter = new WebBluetoothAdapter();
    expect(typeof adapter.write).toBe('function');
  });
});


