
import { TaroAdapter } from '../src/adapters/TaroAdapter';
import { PrinterState } from '../src/types';

// Mock Taro
const mockWriteBLECharacteristicValue = jest.fn();
const mockGetBLEDeviceServices = jest.fn();
const mockGetBLEDeviceCharacteristics = jest.fn();

global.Taro = {
  writeBLECharacteristicValue: mockWriteBLECharacteristicValue,
  getBLEDeviceServices: mockGetBLEDeviceServices,
  getBLEDeviceCharacteristics: mockGetBLEDeviceCharacteristics,
  createBLEConnection: jest.fn(),
  closeBLEConnection: jest.fn(),
  onBLEConnectionStateChange: jest.fn(),
} as any;

describe('TaroAdapter Weak Network', () => {
  let adapter: TaroAdapter;
  const deviceId = 'test-device';
  const serviceId = 'service-uuid';
  const charId = 'char-uuid';

  beforeEach(() => {
    adapter = new TaroAdapter();
    jest.clearAllMocks();

    // Setup default mocks
    mockGetBLEDeviceServices.mockResolvedValue({
      services: [{ uuid: serviceId }]
    });
    mockGetBLEDeviceCharacteristics.mockResolvedValue({
      characteristics: [{ uuid: charId, properties: { write: true } }]
    });
  });

  test('write retries on failure', async () => {
    // Mock write to fail twice then succeed
    mockWriteBLECharacteristicValue
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue(undefined);

    const data = new Uint8Array([1, 2, 3]).buffer;
    // Set retries to 2
    await adapter.write(deviceId, data, { retries: 2, delay: 1 });

    // Should have called write 3 times (1 initial + 2 retries)
    expect(mockWriteBLECharacteristicValue).toHaveBeenCalledTimes(3);
  });

  test('write fails after retries exhausted', async () => {
    // Mock write to fail always
    mockWriteBLECharacteristicValue.mockRejectedValue(new Error('Fail Always'));

    const data = new Uint8Array([1, 2, 3]).buffer;

    // Set retries to 1
    await expect(adapter.write(deviceId, data, { retries: 1, delay: 1 }))
      .rejects.toThrow('Fail Always');

    // Should have called write 2 times (1 initial + 1 retry)
    expect(mockWriteBLECharacteristicValue).toHaveBeenCalledTimes(2);
  });

  test('write respects chunk size', async () => {
    mockWriteBLECharacteristicValue.mockResolvedValue(undefined);

    // 10 bytes data
    const data = new Uint8Array(10).buffer;

    // Chunk size 4. Should be 3 chunks (4, 4, 2).
    await adapter.write(deviceId, data, { chunkSize: 4, delay: 1 });

    expect(mockWriteBLECharacteristicValue).toHaveBeenCalledTimes(3);
  });
});
