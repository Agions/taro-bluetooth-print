/**
 * 测试辅助工具
 * 提供通用的测试工具函数和Mock对象
 */

import { EventEmitter } from 'events';

/**
 * 等待指定时间
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 创建Mock事件发射器
 */
export const createMockEventEmitter = (events: Record<string, any[]> = {}) => {
  const emitter = new EventEmitter();

  // 预设事件
  Object.entries(events).forEach(([event, args]) => {
    setTimeout(() => emitter.emit(event, ...args), 0);
  });

  return emitter;
};

/**
 * 创建Mock Promise
 */
export const createMockPromise = <T>(
  result: T,
  shouldReject: boolean = false,
  delay: number = 0
): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        reject(result);
      } else {
        resolve(result);
      }
    }, delay);
  });
};

/**
 * 创建Mock函数
 */
export const createMockFunction = <T extends any[], R>(
  implementation?: (...args: T) => R,
  callCount?: number
) => {
  const calls: Array<{ args: T; result?: R; error?: Error }> = [];

  const mockFn = (...args: T): R => {
    const call = { args };
    calls.push(call);

    if (callCount !== undefined && calls.length > callCount) {
      throw new Error(`Mock function called more than ${callCount} times`);
    }

    try {
      if (implementation) {
        const result = implementation(...args);
        call.result = result;
        return result;
      }
      return undefined as any;
    } catch (error) {
      call.error = error as Error;
      throw error;
    }
  };

  mockFn.calls = calls;
  mockFn.wasCalled = () => calls.length > 0;
  mockFn.callCount = () => calls.length;
  mockFn.lastCall = () => calls[calls.length - 1];
  mockFn.getCall = (index: number) => calls[index];
  mockFn.reset = () => { calls.length = 0; };

  return mockFn;
};

/**
 * 创建Mock对象
 */
export const createMockObject = <T extends Record<string, any>>(
  methods: Partial<T> = {},
  properties: Record<string, any> = {}
): T => {
  const mock = {} as T;

  // 添加方法
  Object.entries(methods).forEach(([key, value]) => {
    if (typeof value === 'function') {
      (mock as any)[key] = value;
    } else {
      (mock as any)[key] = createMockFunction().mockReturnValue(value);
    }
  });

  // 添加属性
  Object.entries(properties).forEach(([key, value]) => {
    Object.defineProperty(mock, key, {
      get: () => value,
      set: () => {},
      configurable: true,
      enumerable: true
    });
  });

  return mock;
};

/**
 * 随机字符串生成器
 */
export const randomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 随机数字生成器
 */
export const randomNumber = (min: number = 0, max: number = 100): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 随机布尔值生成器
 */
export const randomBoolean = (): boolean => {
  return Math.random() < 0.5;
};

/**
 * 创建Mock设备
 */
export const createMockDevice = (overrides: Partial<any> = {}) => {
  return {
    id: randomString(),
    name: `MockDevice-${randomString(5)}`,
    address: `00:00:00:00:00:${randomString(2, '0123456789ABCDEF')}`,
    rssi: randomNumber(-100, -30),
    serviceUuids: [],
    manufacturerData: new ArrayBuffer(0),
    serviceData: new Map(),
    advertisementData: {
      localName: `MockDevice-${randomString(5)}`,
      serviceUuids: [],
      manufacturerData: new ArrayBuffer(0),
      serviceData: new Map(),
      txPowerLevel: randomNumber(-20, 10),
      connectable: randomBoolean()
    },
    ...overrides
  };
};

/**
 * 创建Mock连接
 */
export const createMockConnection = (overrides: Partial<any> = {}) => {
  return {
    deviceId: randomString(),
    connected: true,
    connectable: true,
    services: [],
    characteristics: new Map(),
    mtu: 20,
    rssi: randomNumber(-100, -30),
    connectedAt: new Date(),
    lastActivity: new Date(),
    quality: randomNumber(1, 5),
    speed: randomNumber(10, 100),
    ...overrides
  };
};

/**
 * 创建Mock打印作业
 */
export const createMockPrintJob = (overrides: Partial<any> = {}) => {
  return {
    id: randomString(),
    type: 'text',
    content: 'Mock print content',
    options: {},
    priority: 0,
    deviceId: randomString(),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: 0,
    maxAttempts: 3,
    error: null,
    result: null,
    ...overrides
  };
};

/**
 * 创建Mock打印机
 */
export const createMockPrinter = (overrides: Partial<any> = {}) => {
  return {
    id: randomString(),
    name: `MockPrinter-${randomString(5)}`,
    deviceId: randomString(),
    type: 'thermal',
    model: 'MockModel',
    manufacturer: 'MockManufacturer',
    status: 'ready',
    capabilities: {
      text: true,
      barcode: true,
      qrcode: true,
      image: true,
      autoCut: false
    },
    connection: createMockConnection(),
    driver: null,
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

/**
 * 创建Mock模板
 */
export const createMockTemplate = (overrides: Partial<any> = {}) => {
  return {
    id: randomString(),
    name: `MockTemplate-${randomString(5)}`,
    type: 'text',
    content: 'Mock template content',
    description: 'Mock template description',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0',
    tags: ['mock', 'test'],
    metadata: {},
    enabled: true,
    variables: [],
    ...overrides
  };
};

/**
 * 批量创建Mock对象
 */
export const createMockDevices = (count: number, overrides: Partial<any> = {}): any[] => {
  return Array.from({ length: count }, () => createMockDevice(overrides));
};

export const createMockPrintJobs = (count: number, overrides: Partial<any> = {}): any[] => {
  return Array.from({ length: count }, () => createMockPrintJob(overrides));
};

export const createMockPrinters = (count: number, overrides: Partial<any> = {}): any[] => {
  return Array.from({ length: count }, () => createMockPrinter(overrides));
};

export const createMockTemplates = (count: number, overrides: Partial<any> = {}): any[] => {
  return Array.from({ length: count }, () => createMockTemplate(overrides));
};

/**
 * 测试数据构建器
 */
export class TestDataBuilder<T> {
  private data: Partial<T> = {};

  constructor(private defaults: Partial<T> = {}) {
    this.data = { ...defaults };
  }

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value;
    return this;
  }

  withMultiple(data: Partial<T>): this {
    this.data = { ...this.data, ...data };
    return this;
  }

  build(): T {
    return this.data as T;
  }

  reset(): this {
    this.data = { ...this.defaults };
    return this;
  }
}

/**
 * 创建设备构建器
 */
export const deviceBuilder = () => new TestDataBuilder(createMockDevice());

/**
 * 创建打印机构建器
 */
export const printerBuilder = () => new TestDataBuilder(createMockPrinter());

/**
 * 创建打印作业构建器
 */
export const printJobBuilder = () => new TestDataBuilder(createMockPrintJob());

/**
 * 创建模板构建器
 */
export const templateBuilder = () => new TestDataBuilder(createMockTemplate());

/**
 * 测试环境设置和清理
 */
export const createTestEnvironment = () => {
  const originalConsole = global.console;
  const originalEnv = process.env;

  const setup = () => {
    // 静默控制台输出（可选）
    // global.console = {
    //   ...originalConsole,
    //   log: jest.fn(),
    //   warn: jest.fn(),
    //   error: jest.fn()
    // };
  };

  const cleanup = () => {
    global.console = originalConsole;
    process.env = originalEnv;
  };

  return { setup, cleanup };
};

/**
 * 异步测试辅助函数
 */
export const expectAsync = async (
  promise: Promise<any>,
  timeout: number = 5000
): Promise<any> => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout);
  });

  return Promise.race([promise, timeoutPromise]);
};

/**
 * 重试机制
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delay);
      }
    }
  }

  throw lastError!;
};

/**
 * 时间测量工具
 */
export const createTimer = () => {
  const startTime = Date.now();

  const elapsed = () => Date.now() - startTime;

  const expectWithin = (maxMs: number) => {
    const elapsedMs = elapsed();
    if (elapsedMs > maxMs) {
      throw new Error(`Operation took ${elapsedMs}ms, expected <= ${maxMs}ms`);
    }
  };

  return { elapsed, expectWithin };
};

/**
 * 内存使用监控
 */
export const createMemoryMonitor = () => {
  const initialMemory = process.memoryUsage();

  const current = () => process.memoryUsage();

  const delta = () => {
    const currentMemory = process.memoryUsage();
    return {
      rss: currentMemory.rss - initialMemory.rss,
      heapTotal: currentMemory.heapTotal - initialMemory.heapTotal,
      heapUsed: currentMemory.heapUsed - initialMemory.heapUsed,
      external: currentMemory.external - initialMemory.external
    };
  };

  return { initial: initialMemory, current, delta };
};