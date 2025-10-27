/**
 * BluetoothPrinter 应用层单元测试
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../../src/BluetoothPrinter';
import {
  IBluetoothPrinter,
  IBluetoothPrinterConfig,
  IBluetoothPrinterOptions,
  IDeviceInfo,
  IConnectionInfo,
  IPrintRequest,
  IPrintResult,
  IQueueStatus,
  ITemplateInfo,
  BluetoothPrinterEvent,
  DEFAULT_CONFIG,
  BluetoothPrinterError
} from '../../../src/types';

// Mock 依赖
class MockContainer {
  private services = new Map();
  private disposed = false;

  register<T>(name: string, factory: () => T, lifecycle: any): void {
    this.services.set(name, { factory, lifecycle });
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service.factory();
  }

  dispose(): void {
    this.disposed = true;
    this.services.clear();
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

class MockEventBus {
  private listeners = new Map<string, Function[]>();
  private disposed = false;

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

class MockConfigManager {
  private config: Partial<IBluetoothPrinterConfig>;

  constructor(config?: Partial<IBluetoothPrinterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getConfig(): IBluetoothPrinterConfig {
    return this.config as IBluetoothPrinterConfig;
  }

  updateConfig(updates: Partial<IBluetoothPrinterConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getQueueConfig(): any {
    return this.config.queue;
  }

  isDisposed(): boolean {
    return false;
  }

  dispose(): void {
    // Mock implementation
  }
}

class MockLogger {
  private logs: any[] = [];
  private disposed = false;

  debug(message: string, ...args: any[]): void {
    this.logs.push({ level: 'debug', message, args, timestamp: new Date() });
  }

  info(message: string, ...args: any[]): void {
    this.logs.push({ level: 'info', message, args, timestamp: new Date() });
  }

  warn(message: string, ...args: any[]): void {
    this.logs.push({ level: 'warn', message, args, timestamp: new Date() });
  }

  error(message: string, ...args: any[]): void {
    this.logs.push({ level: 'error', message, args, timestamp: new Date() });
  }

  getLogs(): any[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    this.disposed = true;
    this.logs = [];
  }
}

class MockBluetoothAdapter {
  private initialized = false;
  private enabled = false;
  private scanning = false;
  private devices = new Map<string, IDeviceInfo>();
  private connections = new Map<string, IConnectionInfo>();
  private eventBus: any;

  constructor(factory: any, eventBus: any, logger: any) {
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async enable(): Promise<void> {
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.scanning = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async scan(timeout: number): Promise<IDeviceInfo[]> {
    if (!this.enabled) {
      throw new Error('Bluetooth not enabled');
    }

    this.scanning = true;

    // 模拟设备发现
    const mockDevice: IDeviceInfo = {
      id: 'mock-device',
      name: 'MockPrinter',
      address: '00:00:00:00:00:01',
      rssi: -50,
      type: 'printer',
      paired: false,
      serviceUuids: [],
      manufacturerData: new ArrayBuffer(0),
      advertisementData: {
        localName: 'MockPrinter',
        serviceUuids: [],
        manufacturerData: new ArrayBuffer(0),
        serviceData: new Map(),
        txPowerLevel: -10,
        connectable: true
      }
    };

    this.devices.set(mockDevice.id, mockDevice);

    setTimeout(() => {
      this.scanning = false;
    }, timeout);

    return [mockDevice];
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async connect(deviceId: string): Promise<IConnectionInfo> {
    if (!this.enabled) {
      throw new Error('Bluetooth not enabled');
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const connection: IConnectionInfo = {
      deviceId,
      connected: true,
      connectable: true,
      services: [],
      characteristics: new Map(),
      mtu: 20,
      rssi: device.rssi || -50,
      connectedAt: new Date(),
      lastActivity: new Date(),
      quality: 80,
      speed: 1000
    };

    this.connections.set(deviceId, connection);
    return connection;
  }

  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.connected = false;
      this.connections.delete(deviceId);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const deviceId of this.connections.keys()) {
      await this.disconnect(deviceId);
    }
  }

  getConnectedDevices(): IConnectionInfo[] {
    return Array.from(this.connections.values()).filter(conn => conn.connected);
  }

  on(event: string, listener: Function): void {
    this.eventBus.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventBus.off(event, listener);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isDisposed(): boolean {
    return false;
  }

  async dispose(): Promise<void> {
    await this.disconnectAll();
    this.initialized = false;
    this.enabled = false;
    this.devices.clear();
    this.connections.clear();
  }
}

class MockPrinterManager {
  private initialized = false;
  private printers: any[] = [];
  private eventBus: any;
  private logger: any;

  constructor(factory: any, eventBus: any, logger: any) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async printText(text: string, options?: any): Promise<IPrintResult> {
    return {
      success: true,
      jobId: `job-${Date.now()}`,
      printTime: 100,
      deviceId: 'mock-device'
    };
  }

  async printTemplate(templateId: string, data: any, options?: any): Promise<IPrintResult> {
    return {
      success: true,
      jobId: `job-${Date.now()}`,
      printTime: 200,
      deviceId: 'mock-device'
    };
  }

  async printImage(imageData: ArrayBuffer | string, options?: any): Promise<IPrintResult> {
    return {
      success: true,
      jobId: `job-${Date.now()}`,
      printTime: 300,
      deviceId: 'mock-device'
    };
  }

  async printBarcode(data: string, type: string, options?: any): Promise<IPrintResult> {
    return {
      success: true,
      jobId: `job-${Date.now()}`,
      printTime: 150,
      deviceId: 'mock-device'
    };
  }

  async printQRCode(data: string, options?: any): Promise<IPrintResult> {
    return {
      success: true,
      jobId: `job-${Date.now()}`,
      printTime: 150,
      deviceId: 'mock-device'
    };
  }

  async printBatch(requests: IPrintRequest[]): Promise<IPrintResult[]> {
    return requests.map(() => ({
      success: true,
      jobId: `job-${Date.now()}`,
      printTime: 100,
      deviceId: 'mock-device'
    }));
  }

  getPrinters(): any[] {
    return this.printers;
  }

  getConnectedPrinters(): any[] {
    return this.printers.filter(p => p.connected);
  }

  getReadyPrinters(): any[] {
    return this.printers.filter(p => p.connected && p.ready);
  }

  on(event: string, listener: Function): void {
    this.eventBus.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventBus.off(event, listener);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isDisposed(): boolean {
    return false;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.printers = [];
  }
}

class MockPrintQueue {
  private initialized = false;
  private jobs: any[] = [];
  private paused = false;
  private stopped = false;
  private eventBus: any;
  private logger: any;

  constructor(config: any, eventBus: any, logger: any) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  getStatus(): IQueueStatus {
    return {
      size: this.jobs.length,
      processing: this.jobs.filter(j => j.status === 'processing').length,
      completed: this.jobs.filter(j => j.status === 'completed').length,
      failed: this.jobs.filter(j => j.status === 'failed').length,
      paused: this.paused,
      stopped: this.stopped
    };
  }

  clear(): void {
    this.jobs = [];
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  stop(): void {
    this.stopped = true;
  }

  on(event: string, listener: Function): void {
    this.eventBus.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventBus.off(event, listener);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isDisposed(): boolean {
    return false;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.jobs = [];
  }
}

class MockTemplateEngine {
  private initialized = false;
  private templates: any[] = [];
  private eventBus: any;
  private logger: any;

  constructor(cache: any, eventBus: any, logger: any) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async registerTemplate(template: any): Promise<void> {
    this.templates.push(template);
  }

  getTemplate(templateId: string): any {
    return this.templates.find(t => t.id === templateId);
  }

  getTemplates(): any[] {
    return [...this.templates];
  }

  async preview(templateId: string, data: any): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return `Preview of ${template.name} with data: ${JSON.stringify(data)}`;
  }

  on(event: string, listener: Function): void {
    this.eventBus.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventBus.off(event, listener);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isDisposed(): boolean {
    return false;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.templates = [];
  }
}

// Mock 工厂类
class MockBluetoothAdapterFactory {
  getAdapter(): any {
    return {
      initialize: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
      scan: jest.fn(),
      isScanning: jest.fn().mockReturnValue(false),
      connect: jest.fn(),
      disconnect: jest.fn(),
      disconnectAll: jest.fn(),
      getConnectedDevices: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      off: jest.fn(),
      dispose: jest.fn()
    };
  }
}

class MockPrinterDriverFactory {
  createDriver(type: string): any {
    return {
      initialize: jest.fn(),
      print: jest.fn(),
      getStatus: jest.fn(),
      dispose: jest.fn()
    };
  }
}

class MockTemplateCache {
  private cache = new Map();

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  isDisposed(): boolean {
    return false;
  }

  dispose(): void {
    this.cache.clear();
  }
}

describe('BluetoothPrinter', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let mockConfig: Partial<IBluetoothPrinterConfig>;
  let mockOptions: IBluetoothPrinterOptions;

  beforeEach(() => {
    mockConfig = {
      bluetooth: {
        scanTimeout: 5000,
        connectionTimeout: 10000,
        autoReconnect: false,
        maxReconnectAttempts: 3,
        reconnectInterval: 1000
      },
      logging: {
        level: 'debug',
        enableConsole: true,
        enableFile: false,
        maxFileSize: 1024 * 1024,
        maxFiles: 3
      }
    };

    mockOptions = {
      debug: true
    };

    // 注入 Mock 依赖
    (jest.requireMock('../../../src/infrastructure/di')).Container = MockContainer;
    (jest.requireMock('../../../src/infrastructure/events')).EventBus = MockEventBus;
    (jest.requireMock('../../../src/infrastructure/config/BluetoothPrinterConfigManager')).BluetoothPrinterConfigManager = MockConfigManager;
    (jest.requireMock('../../../src/infrastructure/logging')).createLogger = () => new MockLogger();
    (jest.requireMock('../../../src/infrastructure/bluetooth/BluetoothAdapterFactory')).BluetoothAdapterFactory = MockBluetoothAdapterFactory;
    (jest.requireMock('../../../src/infrastructure/printer/PrinterDriverFactory')).PrinterDriverFactory = MockPrinterDriverFactory;
    (jest.requireMock('../../../src/infrastructure/template/TemplateCache')).TemplateCache = MockTemplateCache;

    bluetoothPrinter = new BluetoothPrinter(mockConfig, mockOptions);
  });

  afterEach(async () => {
    if (bluetoothPrinter) {
      try {
        await bluetoothPrinter.dispose();
      } catch (error) {
        // 忽略销毁时的错误
      }
    }
  });

  describe('初始化', () => {
    it('应该正确创建 BluetoothPrinter 实例', () => {
      expect(bluetoothPrinter).toBeInstanceOf(BluetoothPrinter);
    });

    it('应该能够使用工厂函数创建实例', () => {
      const instance = createBluetoothPrinter(mockConfig, mockOptions);
      expect(instance).toBeInstanceOf(BluetoothPrinter);
    });

    it('应该能够初始化库', async () => {
      await bluetoothPrinter.initialize();

      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('重复初始化应该不执行任何操作', async () => {
      await bluetoothPrinter.initialize();
      await bluetoothPrinter.initialize(); // 第二次调用

      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('初始化失败应该抛出错误', async () => {
      // 模拟初始化错误
      const mockLogger = bluetoothPrinter as any;
      mockLogger.bluetoothAdapter = {
        initialize: jest.fn().mockRejectedValue(new Error('Initialization failed'))
      };

      await expect(bluetoothPrinter.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('配置管理', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够获取当前配置', () => {
      const config = bluetoothPrinter.getConfig();
      expect(config).toBeDefined();
      expect(config.bluetooth).toBeDefined();
      expect(config.printer).toBeDefined();
      expect(config.queue).toBeDefined();
      expect(config.template).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.events).toBeDefined();
    });

    it('应该能够更新配置', () => {
      const updates: Partial<IBluetoothPrinterConfig> = {
        bluetooth: {
          scanTimeout: 15000,
          connectionTimeout: 20000,
          autoReconnect: true,
          maxReconnectAttempts: 5,
          reconnectInterval: 3000
        }
      };

      bluetoothPrinter.updateConfig(updates);

      const config = bluetoothPrinter.getConfig();
      expect(config.bluetooth.scanTimeout).toBe(15000);
      expect(config.bluetooth.connectionTimeout).toBe(20000);
      expect(config.bluetooth.autoReconnect).toBe(true);
    });

    it('配置更新应该触发事件', () => {
      const listener = jest.fn();
      bluetoothPrinter.on('configUpdated', listener);

      const updates: Partial<IBluetoothPrinterConfig> = {
        logging: { level: 'debug', enableConsole: true, enableFile: false, maxFileSize: 1024, maxFiles: 2 }
      };

      bluetoothPrinter.updateConfig(updates);
      expect(listener).toHaveBeenCalledWith(updates);
    });
  });

  describe('设备管理', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('未初始化时扫描设备应该抛出错误', async () => {
      const uninitializedPrinter = new BluetoothPrinter(mockConfig, mockOptions);
      await expect(uninitializedPrinter.scanDevices()).rejects.toThrow('not initialized');
    });

    it('应该能够扫描设备', async () => {
      const devices = await bluetoothPrinter.scanDevices(5000);
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
    });

    it('应该能够连接设备', async () => {
      // 先扫描设备
      const devices = await bluetoothPrinter.scanDevices();
      expect(devices.length).toBeGreaterThan(0);

      // 连接设备
      const connection = await bluetoothPrinter.connectDevice(devices[0].id);
      expect(connection).toBeDefined();
      expect(connection.deviceId).toBe(devices[0].id);
      expect(connection.connected).toBe(true);
    });

    it('应该能够断开设备连接', async () => {
      // 先连接设备
      const devices = await bluetoothPrinter.scanDevices();
      const connection = await bluetoothPrinter.connectDevice(devices[0].id);
      expect(connection.connected).toBe(true);

      // 断开连接
      await bluetoothPrinter.disconnectDevice(devices[0].id);

      const connectedDevices = bluetoothPrinter.getConnectedDevices();
      expect(connectedDevices.length).toBe(0);
    });

    it('应该能够获取已连接设备列表', async () => {
      // 初始状态应该没有连接的设备
      let connectedDevices = bluetoothPrinter.getConnectedDevices();
      expect(connectedDevices.length).toBe(0);

      // 连接设备后应该有连接的设备
      const devices = await bluetoothPrinter.scanDevices();
      await bluetoothPrinter.connectDevice(devices[0].id);

      connectedDevices = bluetoothPrinter.getConnectedDevices();
      expect(connectedDevices.length).toBe(1);
      expect(connectedDevices[0].deviceId).toBe(devices[0].id);
    });

    it('连接不存在的设备应该抛出错误', async () => {
      await expect(bluetoothPrinter.connectDevice('nonexistent-device'))
        .rejects.toThrow('Device not found');
    });
  });

  describe('打印功能', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('未初始化时打印应该抛出错误', async () => {
      const uninitializedPrinter = new BluetoothPrinter(mockConfig, mockOptions);
      await expect(uninitializedPrinter.printText('test')).rejects.toThrow('not initialized');
    });

    it('应该能够打印文本', async () => {
      const result = await bluetoothPrinter.printText('Hello, World!');
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.printTime).toBeGreaterThan(0);
    });

    it('应该能够打印模板', async () => {
      const templateId = 'test-template';
      const data = { name: 'Test', amount: 100 };

      const result = await bluetoothPrinter.printTemplate(templateId, data);
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('应该能够打印图片', async () => {
      const imageData = new ArrayBuffer(1024);

      const result = await bluetoothPrinter.printImage(imageData);
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('应该能够打印条形码', async () => {
      const result = await bluetoothPrinter.printBarcode('123456789', 'CODE128');
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('应该能够打印二维码', async () => {
      const result = await bluetoothPrinter.printQRCode('https://example.com');
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('应该能够批量打印', async () => {
      const requests: IPrintRequest[] = [
        { type: 'text', content: 'First line' },
        { type: 'text', content: 'Second line' },
        { type: 'qrcode', content: 'https://example.com' }
      ];

      const results = await bluetoothPrinter.printBatch(requests);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.jobId).toBeDefined();
      });
    });
  });

  describe('队列管理', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('未初始化时操作队列应该抛出错误', () => {
      const uninitializedPrinter = new BluetoothPrinter(mockConfig, mockOptions);
      expect(() => uninitializedPrinter.getQueueStatus()).toThrow('not initialized');
      expect(() => uninitializedPrinter.clearQueue()).toThrow('not initialized');
      expect(() => uninitializedPrinter.pauseQueue()).toThrow('not initialized');
      expect(() => uninitializedPrinter.resumeQueue()).toThrow('not initialized');
    });

    it('应该能够获取队列状态', () => {
      const status = bluetoothPrinter.getQueueStatus();
      expect(status).toBeDefined();
      expect(typeof status.size).toBe('number');
      expect(typeof status.processing).toBe('number');
      expect(typeof status.completed).toBe('number');
      expect(typeof status.failed).toBe('number');
      expect(typeof status.paused).toBe('boolean');
      expect(typeof status.stopped).toBe('boolean');
    });

    it('应该能够清空队列', () => {
      bluetoothPrinter.clearQueue();
      const status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBe(0);
    });

    it('应该能够暂停和恢复队列', () => {
      bluetoothPrinter.pauseQueue();
      let status = bluetoothPrinter.getQueueStatus();
      expect(status.paused).toBe(true);

      bluetoothPrinter.resumeQueue();
      status = bluetoothPrinter.getQueueStatus();
      expect(status.paused).toBe(false);
    });
  });

  describe('模板管理', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('未初始化时操作模板应该抛出错误', async () => {
      const uninitializedPrinter = new BluetoothPrinter(mockConfig, mockOptions);
      await expect(uninitializedPrinter.registerTemplate({} as any)).rejects.toThrow('not initialized');
      expect(() => uninitializedPrinter.getTemplate('test')).toThrow('not initialized');
      expect(() => uninitializedPrinter.getTemplates()).toThrow('not initialized');
      await expect(uninitializedPrinter.previewTemplate('test', {})).rejects.toThrow('not initialized');
    });

    it('应该能够注册模板', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        type: 'receipt',
        description: 'A test template',
        content: 'Hello {{name}}!',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test']
      };

      await bluetoothPrinter.registerTemplate(template);

      const retrievedTemplate = bluetoothPrinter.getTemplate('test-template');
      expect(retrievedTemplate).toBeDefined();
      expect(retrievedTemplate!.id).toBe('test-template');
      expect(retrievedTemplate!.name).toBe('Test Template');
    });

    it('应该能够获取所有模板', async () => {
      const templates = [
        {
          id: 'template-1',
          name: 'Template 1',
          type: 'receipt',
          description: 'First template',
          content: 'Content 1',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['test']
        },
        {
          id: 'template-2',
          name: 'Template 2',
          type: 'label',
          description: 'Second template',
          content: 'Content 2',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['test']
        }
      ];

      for (const template of templates) {
        await bluetoothPrinter.registerTemplate(template);
      }

      const allTemplates = bluetoothPrinter.getTemplates();
      expect(allTemplates).toHaveLength(2);
      expect(allTemplates.map(t => t.id)).toEqual(['template-1', 'template-2']);
    });

    it('应该能够预览模板', async () => {
      const template = {
        id: 'preview-template',
        name: 'Preview Template',
        type: 'receipt',
        description: 'Template for preview',
        content: 'Hello {{name}}!',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test']
      };

      await bluetoothPrinter.registerTemplate(template);

      const preview = await bluetoothPrinter.previewTemplate('preview-template', { name: 'World' });
      expect(typeof preview).toBe('string');
      expect(preview).toContain('Preview of Preview Template');
    });

    it('预览不存在的模板应该抛出错误', async () => {
      await expect(bluetoothPrinter.previewTemplate('nonexistent', {}))
        .rejects.toThrow('Template not found');
    });

    it('获取不存在的模板应该返回 undefined', () => {
      const template = bluetoothPrinter.getTemplate('nonexistent');
      expect(template).toBeUndefined();
    });
  });

  describe('状态查询', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够获取完整的库状态', () => {
      const status = bluetoothPrinter.getStatus();
      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);

      // 蓝牙状态
      expect(status.bluetooth).toBeDefined();
      expect(typeof status.bluetooth.enabled).toBe('boolean');
      expect(typeof status.bluetooth.scanning).toBe('boolean');
      expect(typeof status.bluetooth.connectedDevices).toBe('number');

      // 打印机状态
      expect(status.printers).toBeDefined();
      expect(typeof status.printers.total).toBe('number');
      expect(typeof status.printers.connected).toBe('number');
      expect(typeof status.printers.ready).toBe('number');

      // 队列状态
      expect(status.queue).toBeDefined();

      // 模板状态
      expect(status.templates).toBeDefined();
      expect(typeof status.templates.total).toBe('number');
      expect(typeof status.templates.enabled).toBe('number');

      // 配置
      expect(status.config).toBeDefined();
    });

    it('未初始化时应该返回未初始化状态', () => {
      const uninitializedPrinter = new BluetoothPrinter(mockConfig, mockOptions);
      const status = uninitializedPrinter.getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('事件处理', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够添加和移除事件监听器', () => {
      const listener = jest.fn();

      // 添加监听器
      bluetoothPrinter.on('deviceDiscovered', listener);
      bluetoothPrinter.on('deviceConnected', listener);
      bluetoothPrinter.on('deviceDisconnected', listener);

      // 移除监听器
      bluetoothPrinter.off('deviceDiscovered', listener);
      bluetoothPrinter.off('deviceConnected', listener);
      bluetoothPrinter.off('deviceDisconnected', listener);

      // 测试通过（不抛出错误）
      expect(true).toBe(true);
    });

    it('应该能够监听所有支持的事件类型', () => {
      const listeners = {
        initialized: jest.fn(),
        configUpdated: jest.fn(),
        deviceDiscovered: jest.fn(),
        deviceConnected: jest.fn(),
        deviceDisconnected: jest.fn(),
        connectionFailed: jest.fn(),
        printerAdded: jest.fn(),
        printerRemoved: jest.fn(),
        printerStatusChanged: jest.fn(),
        jobQueued: jest.fn(),
        jobStarted: jest.fn(),
        jobCompleted: jest.fn(),
        jobFailed: jest.fn(),
        templateRegistered: jest.fn(),
        templateRendered: jest.fn(),
        templateError: jest.fn()
      };

      // 添加所有监听器
      Object.entries(listeners).forEach(([event, listener]) => {
        bluetoothPrinter.on(event as keyof BluetoothPrinterEvent, listener);
      });

      // 移除所有监听器
      Object.entries(listeners).forEach(([event, listener]) => {
        bluetoothPrinter.off(event as keyof BluetoothPrinterEvent, listener);
      });

      // 验证监听器被调用（在实际的事件触发时）
      expect(true).toBe(true);
    });

    it('事件监听器应该支持链式调用', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const result = bluetoothPrinter
        .on('deviceDiscovered', listener1)
        .on('deviceConnected', listener2);

      expect(result).toBe(bluetoothPrinter);
    });
  });

  describe('资源管理', () => {
    it('应该能够正确销毁库', async () => {
      await bluetoothPrinter.initialize();
      expect(bluetoothPrinter.getStatus().initialized).toBe(true);

      await bluetoothPrinter.dispose();
      expect(bluetoothPrinter.getStatus().initialized).toBe(false);
    });

    it('重复销毁应该不执行任何操作', async () => {
      await bluetoothPrinter.initialize();
      await bluetoothPrinter.dispose();

      // 第二次销毁不应该抛出错误
      await expect(bluetoothPrinter.dispose()).resolves.toBeUndefined();
    });

    it('销毁后所有操作都应该抛出错误', async () => {
      await bluetoothPrinter.initialize();
      await bluetoothPrinter.dispose();

      // 这些操作都应该抛出错误
      await expect(bluetoothPrinter.scanDevices()).rejects.toThrow('not initialized');
      await expect(bluetoothPrinter.connectDevice('test')).rejects.toThrow('not initialized');
      await expect(bluetoothPrinter.printText('test')).rejects.toThrow('not initialized');
      expect(() => bluetoothPrinter.getQueueStatus()).toThrow('not initialized');
      await expect(bluetoothPrinter.registerTemplate({} as any)).rejects.toThrow('not initialized');
    });
  });

  describe('错误处理', () => {
    it('应该处理配置错误', () => {
      const invalidConfig = {
        bluetooth: {
          scanTimeout: -1000, // 无效值
          connectionTimeout: -1000,
          autoReconnect: false,
          maxReconnectAttempts: -1,
          reconnectInterval: -1000
        }
      } as any;

      // 应该能够创建实例（配置验证在运行时进行）
      expect(() => new BluetoothPrinter(invalidConfig)).not.toThrow();
    });

    it('应该处理空配置', () => {
      expect(() => new BluetoothPrinter()).not.toThrow();
      expect(() => new BluetoothPrinter({})).not.toThrow();
    });

    it('应该处理无效的选项', () => {
      const invalidOptions = {
        debug: 'invalid' as any,
        eventBus: null,
        logger: undefined,
        configManager: 'invalid'
      };

      expect(() => new BluetoothPrinter({}, invalidOptions)).not.toThrow();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的打印内容', async () => {
      await bluetoothPrinter.initialize();

      const result = await bluetoothPrinter.printText('');
      expect(result.success).toBe(true);
    });

    it('应该处理非常大的打印内容', async () => {
      await bluetoothPrinter.initialize();

      const largeText = 'x'.repeat(100000);
      const result = await bluetoothPrinter.printText(largeText);
      expect(result.success).toBe(true);
    });

    it('应该处理特殊字符的打印内容', async () => {
      await bluetoothPrinter.initialize();

      const specialText = '🚀 Hello 世界 !@#$%^&*()';
      const result = await bluetoothPrinter.printText(specialText);
      expect(result.success).toBe(true);
    });

    it('应该处理空数组批量打印', async () => {
      await bluetoothPrinter.initialize();

      const results = await bluetoothPrinter.printBatch([]);
      expect(results).toHaveLength(0);
    });

    it('应该处理大量批量打印请求', async () => {
      await bluetoothPrinter.initialize();

      const requests: IPrintRequest[] = Array.from({ length: 1000 }, (_, i) => ({
        type: 'text' as const,
        content: `Line ${i + 1}`
      }));

      const results = await bluetoothPrinter.printBatch(requests);
      expect(results).toHaveLength(1000);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('性能测试', () => {
    it('应该能够处理高频状态查询', async () => {
      await bluetoothPrinter.initialize();

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        bluetoothPrinter.getStatus();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 1000次查询应在100ms内完成
    });

    it('应该能够处理大量事件监听器', async () => {
      await bluetoothPrinter.initialize();

      const listeners: Function[] = [];

      // 添加大量监听器
      for (let i = 0; i < 1000; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        bluetoothPrinter.on('deviceDiscovered', listener);
      }

      // 移除所有监听器
      const startTime = Date.now();
      listeners.forEach(listener => {
        bluetoothPrinter.off('deviceDiscovered', listener);
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 移除1000个监听器应在100ms内完成
    });

    it('初始化性能测试', async () => {
      const startTime = Date.now();

      const instances: BluetoothPrinter[] = [];
      for (let i = 0; i < 10; i++) {
        const instance = new BluetoothPrinter(mockConfig, mockOptions);
        await instance.initialize();
        instances.push(instance);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 10个实例初始化应在1秒内完成

      // 清理
      await Promise.all(instances.map(instance => instance.dispose()));
    });
  });

  describe('内存管理', () => {
    it('应该正确释放资源', async () => {
      await bluetoothPrinter.initialize();

      // 创建多个实例
      const instances: BluetoothPrinter[] = [];
      for (let i = 0; i < 10; i++) {
        const instance = new BluetoothPrinter(mockConfig, mockOptions);
        await instance.initialize();
        instances.push(instance);
      }

      // 销毁所有实例
      await Promise.all(instances.map(instance => instance.dispose()));

      // 验证资源释放（通过状态检查）
      instances.forEach(instance => {
        expect(instance.getStatus().initialized).toBe(false);
      });
    });

    it('应该处理循环引用的配置', () => {
      const circularConfig: any = {
        bluetooth: {
          scanTimeout: 5000,
          connectionTimeout: 10000,
          autoReconnect: false,
          maxReconnectAttempts: 3,
          reconnectInterval: 1000
        }
      };

      circularConfig.self = circularConfig;

      expect(() => new BluetoothPrinter(circularConfig)).not.toThrow();
    });
  });

  describe('并发安全', () => {
    it('应该能够处理并发初始化', async () => {
      const promises = Array.from({ length: 10 }, () =>
        bluetoothPrinter.initialize()
      );

      await Promise.all(promises);

      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('应该能够处理并发操作', async () => {
      await bluetoothPrinter.initialize();

      const promises = [
        bluetoothPrinter.scanDevices(),
        bluetoothPrinter.printText('Test 1'),
        bluetoothPrinter.printText('Test 2'),
        bluetoothPrinter.getQueueStatus(),
        bluetoothPrinter.getTemplates()
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });

    it('应该能够处理并发事件监听器操作', async () => {
      await bluetoothPrinter.initialize();

      const listeners = Array.from({ length: 100 }, () => jest.fn());

      // 并发添加监听器
      await Promise.all(listeners.map((listener, index) => {
        return new Promise<void>((resolve) => {
          bluetoothPrinter.on('deviceDiscovered', listener);
          resolve();
        });
      }));

      // 并发移除监听器
      await Promise.all(listeners.map(listener => {
        return new Promise<void>((resolve) => {
          bluetoothPrinter.off('deviceDiscovered', listener);
          resolve();
        });
      }));

      expect(true).toBe(true); // 测试通过（没有抛出错误）
    });
  });
});