/**
 * Jest 全局设置文件
 */

// 扩展 Jest 匹配器
import '@testing-library/jest-dom';

// 模拟 Taro 环境
jest.mock('@tarojs/taro', () => ({
  // 蓝牙相关 API
  getBluetoothAdapterState: jest.fn(),
  openBluetoothAdapter: jest.fn(),
  closeBluetoothAdapter: jest.fn(),
  startBluetoothDevicesDiscovery: jest.fn(),
  stopBluetoothDevicesDiscovery: jest.fn(),
  getBluetoothDevices: jest.fn(),
  getConnectedBluetoothDevices: jest.fn(),
  createBLEConnection: jest.fn(),
  closeBLEConnection: jest.fn(),
  getBLEDeviceServices: jest.fn(),
  getBLEDeviceCharacteristics: jest.fn(),
  readBLECharacteristicValue: jest.fn(),
  writeBLECharacteristicValue: jest.fn(),
  notifyBLECharacteristicValueChange: jest.fn(),

  // 设备相关 API
  getSystemInfoSync: jest.fn(() => ({
    platform: 'wechat',
    version: '7.0.0',
    SDKVersion: '2.0.0',
    model: 'iPhone 12',
    system: 'iOS 14.0'
  })),

  // 网络相关 API
  request: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),

  // 存储相关 API
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),

  // 界面相关 API
  showToast: jest.fn(),
  hideToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  navigateBack: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),

  // 事件相关 API
  $on: jest.fn(),
  $off: jest.fn(),
  $trigger: jest.fn(),

  // 路由相关 API
  getCurrentPages: jest.fn(() => []),

  // 环境相关 API
  ENV_TYPE: {
    WEAPP: 'WEAPP',
    SWAN: 'SWAN',
    ALIPAY: 'ALIPAY',
    TT: 'TT',
    QQ: 'QQ',
    JD: 'JD'
  }
}));

// 模拟微信小程序环境
Object.defineProperty(window, 'wx', {
  value: {
    getBluetoothAdapterState: jest.fn(),
    openBluetoothAdapter: jest.fn(),
    closeBluetoothAdapter: jest.fn(),
    startBluetoothDevicesDiscovery: jest.fn(),
    stopBluetoothDevicesDiscovery: jest.fn(),
    getBluetoothDevices: jest.fn(),
    getConnectedBluetoothDevices: jest.fn(),
    createBLEConnection: jest.fn(),
    closeBLEConnection: jest.fn(),
    getBLEDeviceServices: jest.fn(),
    getBLEDeviceCharacteristics: jest.fn(),
    readBLECharacteristicValue: jest.fn(),
    writeBLECharacteristicValue: jest.fn(),
    notifyBLECharacteristicValueChange: jest.fn(),
    getSystemInfoSync: jest.fn(() => ({
      platform: 'wechat',
      version: '7.0.0'
    }))
  },
  writable: true
});

// 全局测试工具函数
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidBluetoothDevice(): R;
      toBeValidPrinterConfig(): R;
      toBeValidPrintJob(): R;
      toBeInRange(min: number, max: number): R;
    }
  }
}

// 自定义匹配器实现
expect.extend({
  toBeValidBluetoothDevice(received) {
    const pass = received &&
      typeof received.deviceId === 'string' &&
      typeof received.name === 'string' &&
      typeof received.advertisData === 'object';

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Bluetooth device`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Bluetooth device`,
        pass: false
      };
    }
  },

  toBeValidPrinterConfig(received) {
    const pass = received &&
      typeof received.name === 'string' &&
      typeof received.type === 'string' &&
      typeof received.connectionType === 'string';

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid printer config`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid printer config`,
        pass: false
      };
    }
  },

  toBeValidPrintJob(received) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.data === 'object' &&
      typeof received.options === 'object';

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid print job`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid print job`,
        pass: false
      };
    }
  },

  toBeInRange(received: number, min: number, max: number) {
    const pass = typeof received === 'number' && received >= min && received <= max;

    if (pass) {
      return {
        message: () => `expected ${received} not to be in range [${min}, ${max}]`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be in range [${min}, ${max}]`,
        pass: false
      };
    }
  }
});

// 测试工具函数
export const createMockBluetoothDevice = (overrides = {}) => ({
  deviceId: 'mock-device-id',
  name: 'Mock Bluetooth Device',
  advertisData: {},
  RSSI: -50,
  advertisServiceUUIDs: [],
  ...overrides
});

export const createMockPrinterConfig = (overrides = {}) => ({
  name: 'Mock Printer',
  type: 'thermal',
  connectionType: 'bluetooth',
  width: 58,
  ...overrides
});

export const createMockPrintJob = (overrides = {}) => ({
  id: 'mock-job-id',
  data: { text: 'Test Print' },
  options: { copies: 1 },
  status: 'pending',
  createdAt: new Date(),
  ...overrides
});

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// 控制台输出过滤
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// 全局清理
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// 性能测试工具
export const measureTime = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// 内存使用监控
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};