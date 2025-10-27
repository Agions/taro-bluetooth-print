/**
 * 测试工具函数库
 */

import { createMockBluetoothDevice, createMockPrinterConfig, createMockPrintJob, flushPromises } from '../setup/jest-setup';

// 重新导出基础工具函数
export {
  createMockBluetoothDevice,
  createMockPrinterConfig,
  createMockPrintJob,
  flushPromises
};

// 模拟蓝牙适配器工厂
export const createMockBluetoothAdapter = () => {
  const adapter = {
    isInitialized: false,
    isConnected: false,
    connectedDevice: null,

    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    startDiscovery: jest.fn().mockResolvedValue(true),
    stopDiscovery: jest.fn().mockResolvedValue(true),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    sendCommand: jest.fn().mockResolvedValue(true),
    getConnectionState: jest.fn().mockReturnValue('disconnected'),
    getConnectedDevice: jest.fn().mockReturnValue(null)
  };

  return adapter;
};

// 模拟打印机管理器
export const createMockPrinterManager = () => {
  const manager = {
    printers: new Map(),
    currentPrinter: null,

    addPrinter: jest.fn().mockResolvedValue(true),
    removePrinter: jest.fn().mockResolvedValue(true),
    setCurrentPrinter: jest.fn().mockResolvedValue(true),
    getCurrentPrinter: jest.fn().mockReturnValue(null),
    print: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockReturnValue({ status: 'ready', connected: false }),
    getPrinters: jest.fn().mockReturnValue([])
  };

  return manager;
};

// 模拟事件发射器
export const createMockEventEmitter = () => {
  const listeners = new Map();

  return {
    on: jest.fn().mockImplementation((event, listener) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(listener);
    }),
    off: jest.fn().mockImplementation((event, listener) => {
      if (listeners.has(event)) {
        const eventListeners = listeners.get(event);
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    }),
    emit: jest.fn().mockImplementation((event, ...args) => {
      if (listeners.has(event)) {
        listeners.get(event).forEach(listener => {
          listener(...args);
        });
      }
    }),
    once: jest.fn().mockImplementation((event, listener) => {
      const onceListener = (...args) => {
        listener(...args);
        // 自动移除监听器
        if (listeners.has(event)) {
          const eventListeners = listeners.get(event);
          const index = eventListeners.indexOf(onceListener);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      };

      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(onceListener);
    }),
    listenerCount: jest.fn().mockImplementation((event) => {
      return listeners.has(event) ? listeners.get(event).length : 0;
    }),
    removeAllListeners: jest.fn().mockImplementation((event) => {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    })
  };
};

// 模拟配置管理器
export const createMockConfigManager = () => {
  const config = new Map();

  return {
    get: jest.fn().mockImplementation((key, defaultValue) => {
      return config.has(key) ? config.get(key) : defaultValue;
    }),
    set: jest.fn().mockImplementation((key, value) => {
      config.set(key, value);
      return true;
    }),
    has: jest.fn().mockImplementation((key) => {
      return config.has(key);
    }),
    delete: jest.fn().mockImplementation((key) => {
      return config.delete(key);
    }),
    clear: jest.fn().mockImplementation(() => {
      config.clear();
      return true;
    }),
    getAll: jest.fn().mockImplementation(() => {
      return Object.fromEntries(config);
    }),
    watch: jest.fn().mockImplementation((key, callback) => {
      // 模拟监听器
      return () => {}; // 返回取消监听函数
    })
  };
};

// 模拟日志记录器
export const createMockLogger = () => {
  const logs = {
    debug: [],
    info: [],
    warn: [],
    error: []
  };

  const logger = {
    debug: jest.fn().mockImplementation((message, ...args) => {
      logs.debug.push({ message, args, timestamp: new Date() });
    }),
    info: jest.fn().mockImplementation((message, ...args) => {
      logs.info.push({ message, args, timestamp: new Date() });
    }),
    warn: jest.fn().mockImplementation((message, ...args) => {
      logs.warn.push({ message, args, timestamp: new Date() });
    }),
    error: jest.fn().mockImplementation((message, ...args) => {
      logs.error.push({ message, args, timestamp: new Date() });
    }),
    getLogs: jest.fn().mockImplementation((level) => {
      return level ? logs[level] : logs;
    }),
    clearLogs: jest.fn().mockImplementation(() => {
      Object.keys(logs).forEach(key => {
        logs[key] = [];
      });
    })
  };

  return { logger, logs };
};

// 模拟定时器工具
export const createMockTimer = () => {
  const timers = new Map();
  let counter = 0;

  return {
    setTimeout: jest.fn().mockImplementation((callback, delay) => {
      const id = ++counter;
      const timer = { callback, delay, id };
      timers.set(id, timer);

      // 立即执行（测试环境）
      if (delay === 0) {
        callback();
      }

      return id;
    }),
    clearTimeout: jest.fn().mockImplementation((id) => {
      timers.delete(id);
    }),
    setInterval: jest.fn().mockImplementation((callback, interval) => {
      const id = ++counter;
      const timer = { callback, interval, id, type: 'interval' };
      timers.set(id, timer);
      return id;
    }),
    clearInterval: jest.fn().mockImplementation((id) => {
      timers.delete(id);
    }),
    executeTimers: jest.fn().mockImplementation(() => {
      const executed = [];
      timers.forEach((timer, id) => {
        if (timer.type !== 'interval') {
          timer.callback();
          executed.push(id);
          timers.delete(id);
        }
      });
      return executed;
    }),
    getTimers: jest.fn().mockImplementation(() => {
      return Array.from(timers.values());
    }),
    clearAll: jest.fn().mockImplementation(() => {
      timers.clear();
    })
  };
};

// 异步测试辅助函数
export const waitFor = (condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      try {
        const result = await condition();
        if (result) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        } else {
          setTimeout(check, 50);
        }
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
};

// 模拟网络请求
export const createMockNetworkRequest = () => {
  let shouldFail = false;
  let responseData = {};
  let responseDelay = 0;

  const mockRequest = jest.fn().mockImplementation(async (options) => {
    if (responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, responseDelay));
    }

    if (shouldFail) {
      throw new Error('Network request failed');
    }

    return {
      data: responseData,
      statusCode: 200,
      header: {
        'content-type': 'application/json'
      }
    };
  });

  mockRequest.fail = () => { shouldFail = true; };
  mockRequest.succeed = () => { shouldFail = false; };
  mockRequest.setResponse = (data: any) => { responseData = data; };
  mockRequest.setDelay = (delay: number) => { responseDelay = delay; };

  return mockRequest;
};

// 测试数据生成器
export const generateTestData = {
  bluetoothDevices: (count = 5) =>
    Array.from({ length: count }, (_, i) =>
      createMockBluetoothDevice({
        deviceId: `device-${i}`,
        name: `Test Device ${i}`,
        RSSI: -50 - i * 10
      })
    ),

  printerConfigs: (count = 3) =>
    Array.from({ length: count }, (_, i) =>
      createMockPrinterConfig({
        name: `Test Printer ${i}`,
        type: ['thermal', 'inkjet', 'laser'][i % 3]
      })
    ),

  printJobs: (count = 10) =>
    Array.from({ length: count }, (_, i) =>
      createMockPrintJob({
        id: `job-${i}`,
        data: { text: `Test Print ${i}` },
        status: ['pending', 'printing', 'completed', 'failed'][i % 4]
      })
    )
};

// 性能测试辅助函数
export const measurePerformance = async (fn: () => Promise<void> | void, iterations = 1) => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  return {
    totalTime: times.reduce((sum, time) => sum + time, 0),
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    times
  };
};