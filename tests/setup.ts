// Vitest setup file
import { vi } from 'vitest';

// Make vi available globally for Jest compatibility
(global as any).jest = vi;

// TextEncoder polyfill for Node environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock Taro API globally
(global as any).Taro = {
  createBLEConnection: vi.fn(),
  closeBLEConnection: vi.fn(),
  getBLEDeviceServices: vi.fn(),
  getBLEDeviceCharacteristics: vi.fn(),
  writeBLECharacteristicValue: vi.fn(),
  onBLEConnectionStateChange: vi.fn(),
  getBLEConnectionState: vi.fn().mockResolvedValue({ connected: true }),
};
