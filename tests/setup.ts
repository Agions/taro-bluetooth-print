// Vitest setup file
import { vi } from 'vitest';

// Define all required Taro globals before importing any Taro modules
// These are feature flags used by @tarojs/runtime
global.ENABLE_INNER_HTML = false;
global.ENABLE_ADJACENT_HTML = false;
global.ENABLE_CLONE_NODE = false;
global.ENABLE_SIZE_APIS = false;
global.ENABLE_CONTAINS = false;
global.ENABLE_MUTATION_OBSERVER = false;
global.ENABLE_CSS_SCOPED = false;
global.ENABLE_TEMPLATE_CONTENT = false;

// Make vi available globally for Jest compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).jest = vi;

// TextEncoder polyfill for Node environment
import { TextEncoder, TextDecoder } from 'util';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.TextEncoder = TextEncoder as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.TextDecoder = TextDecoder as any;

// Mock Taro API globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Taro = {
  createBLEConnection: vi.fn(),
  closeBLEConnection: vi.fn(),
  getBLEDeviceServices: vi.fn(),
  getBLEDeviceCharacteristics: vi.fn(),
  writeBLECharacteristicValue: vi.fn(),
  onBLEConnectionStateChange: vi.fn(),
  getBLEConnectionState: vi.fn().mockResolvedValue({ connected: true }),
  openBluetoothAdapter: vi.fn(),
  closeBluetoothAdapter: vi.fn(),
  startBluetoothDevicesDiscovery: vi.fn(),
  stopBluetoothDevicesDiscovery: vi.fn(),
  getBluetoothDevices: vi.fn(),
  getBluetoothAdapterState: vi.fn(),
  onBluetoothDeviceFound: vi.fn(),
  offBluetoothDeviceFound: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
};

// 配置 Chai 以禁用截断
// 这需要在任何测试运行之前完成
if (typeof globalThis !== 'undefined') {
  // 设置 Chai 配置以禁用截断
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chaiConfig = {
    truncateThreshold: 0, // 禁用截断
    // 其他 Chai 配置选项
    includeStack: true,
    showDiff: true,
  };
}
