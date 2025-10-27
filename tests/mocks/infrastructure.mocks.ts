/**
 * 基础设施层Mock对象
 * 提供基础设施组件的测试替代品
 */

import { EventEmitter } from 'events';
import {
  IContainer,
  IServiceDefinition,
  ServiceLifecycle
} from '../../src/infrastructure/di/types';
import {
  IEventBus,
  IEvent,
  IEventMiddleware
} from '../../src/infrastructure/events/types';
import {
  IConfigManager,
  IConfigProvider,
  IConfigCache
} from '../../src/infrastructure/config/types';
import {
  ILogger,
  LogLevel
} from '../../src/infrastructure/logging/types';
import {
  IBluetoothPlatformAdapter
} from '../../src/infrastructure/bluetooth/types';
import {
  IPrintDriver
} from '../../src/infrastructure/printer/types';
import {
  ITemplateCache
} from '../../src/infrastructure/template/types';

/**
 * Mock容器
 */
export class MockContainer implements IContainer {
  private services = new Map<string, IServiceDefinition>();
  private instances = new Map<string, any>();
  private disposed = false;

  register<T>(token: string | symbol | any, factory: any, lifecycle: ServiceLifecycle = ServiceLifecycle.TRANSIENT): void {
    const key = typeof token === 'string' ? token : token.toString();
    this.services.set(key, { token, factory, lifecycle });
  }

  resolve<T>(token: string | symbol | any): T {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }

    const key = typeof token === 'string' ? token : token.toString();
    const definition = this.services.get(key);

    if (!definition) {
      throw new Error(`Service not registered: ${key}`);
    }

    switch (definition.lifecycle) {
      case ServiceLifecycle.SINGLETON:
        if (!this.instances.has(key)) {
          const instance = definition.factory();
          this.instances.set(key, instance);
        }
        return this.instances.get(key);

      case ServiceLifecycle.SCOPED:
        // 简化实现，返回新实例
        return definition.factory();

      case ServiceLifecycle.TRANSIENT:
      default:
        return definition.factory();
    }
  }

  has(token: string | symbol | any): boolean {
    const key = typeof token === 'string' ? token : token.toString();
    return this.services.has(key);
  }

  unregister(token: string | symbol | any): void {
    const key = typeof token === 'string' ? token : token.toString();
    this.services.delete(key);
    this.instances.delete(key);
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  dispose(): void {
    this.clear();
    this.disposed = true;
  }

  // 测试辅助方法
  getServiceCount(): number {
    return this.services.size;
  }

  getInstanceCount(): number {
    return this.instances.size;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock事件总线
 */
export class MockEventBus extends EventEmitter implements IEventBus {
  private middleware: IEventMiddleware[] = [];
  private history: IEvent[] = [];
  private maxHistorySize: number = 100;
  private disposed = false;

  async publish<T extends IEvent>(event: T): Promise<void> {
    if (this.disposed) {
      throw new Error('EventBus has been disposed');
    }

    // 添加到历史
    this.addToHistory(event);

    // 执行中间件
    for (const middleware of this.middleware) {
      await middleware.handle(event);
    }

    // 发布事件
    this.emit(event.constructor.name, event);
    this.emit('event', event);
  }

  subscribe<T extends IEvent>(
    eventType: new (...args: any[]) => T,
    handler: (event: T) => void | Promise<void>
  ): () => void {
    const eventName = eventType.name;
    const wrappedHandler = (event: T) => {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch(error => {
            console.error('Event handler error:', error);
          });
        }
      } catch (error) {
        console.error('Event handler error:', error);
      }
    };

    this.on(eventName, wrappedHandler);

    return () => {
      this.off(eventName, wrappedHandler);
    };
  }

  addMiddleware(middleware: IEventMiddleware): void {
    this.middleware.push(middleware);
  }

  removeMiddleware(middleware: IEventMiddleware): void {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
    }
  }

  clearMiddleware(): void {
    this.middleware.length = 0;
  }

  getEventHistory(): IEvent[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  getMiddlewareCount(): number {
    return this.middleware.length;
  }

  private addToHistory(event: IEvent): void {
    this.history.push(event);
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  dispose(): void {
    this.removeAllListeners();
    this.clearMiddleware();
    this.clearHistory();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock配置提供者
 */
export class MockConfigProvider implements IConfigProvider {
  private data: Record<string, any> = {};
  private disposed = false;

  constructor(initialData: Record<string, any> = {}) {
    this.data = { ...initialData };
  }

  get name(): string {
    return 'MockConfigProvider';
  }

  get priority(): number {
    return 100;
  }

  get readonly(): boolean {
    return false;
  }

  async get(key: string): Promise<any> {
    if (this.disposed) {
      throw new Error('Provider has been disposed');
    }
    return this.data[key];
  }

  async set(key: string, value: any): Promise<void> {
    if (this.disposed) {
      throw new Error('Provider has been disposed');
    }
    if (this.readonly) {
      throw new Error('Provider is readonly');
    }
    this.data[key] = value;
  }

  async has(key: string): Promise<boolean> {
    if (this.disposed) {
      return false;
    }
    return key in this.data;
  }

  async remove(key: string): Promise<boolean> {
    if (this.disposed) {
      return false;
    }
    if (this.readonly) {
      return false;
    }
    if (key in this.data) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  keys(): string[] {
    return Object.keys(this.data);
  }

  getAll(): Record<string, any> {
    return { ...this.data };
  }

  clear(): void {
    this.data = {};
  }

  setData(data: Record<string, any>): void {
    this.data = { ...data };
  }

  getValue(key: string): any {
    return this.data[key];
  }

  setValue(key: string, value: any): void {
    this.data[key] = value;
  }

  deleteValue(key: string): boolean {
    if (key in this.data) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  hasValue(key: string): boolean {
    return key in this.data;
  }

  dispose(): void {
    this.clear();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock配置缓存
 */
export class MockConfigCache implements IConfigCache {
  private cache = new Map<string, { value: any; expires?: number }>();
  private disposed = false;

  get(key: string): any {
    if (this.disposed) {
      return undefined;
    }

    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: any, ttl?: number): void {
    if (this.disposed) {
      return;
    }

    const expires = ttl ? Date.now() + ttl : undefined;
    this.cache.set(key, { value, expires });
  }

  has(key: string): boolean {
    if (this.disposed) {
      return false;
    }
    return this.get(key) !== undefined;
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): any {
    return {
      size: this.cache.size,
      hits: 0, // 简化实现
      misses: 0,
      hitRate: 0,
      sets: 0,
      deletes: 0,
      lastAccessedAt: Date.now()
    };
  }

  dispose(): void {
    this.clear();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock日志器
 */
export class MockLogger implements ILogger {
  private disposed = false;
  private logs: Array<{ level: LogLevel; message: string; meta?: any; timestamp: Date }> = [];

  constructor(private name: string = 'MockLogger') {}

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | any, meta?: any): void {
    this.log('error', message, { ...meta, error });
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (this.disposed) {
      return;
    }

    this.logs.push({
      level,
      message,
      meta,
      timestamp: new Date()
    });
  }

  setLevel(level: LogLevel): void {
    // Mock实现
  }

  getLevel(): LogLevel {
    return 'info';
  }

  setName(name: string): void {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  getLogs(): Array<{ level: LogLevel; message: string; meta?: any; timestamp: Date }> {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): Array<{ level: LogLevel; message: string; meta?: any; timestamp: Date }> {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs.length = 0;
  }

  dispose(): void {
    this.clearLogs();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock蓝牙平台适配器
 */
export class MockBluetoothPlatformAdapter extends EventEmitter implements IBluetoothPlatformAdapter {
  private disposed = false;
  private enabled = true;
  private scanning = false;
  private devices = new Map<string, any>();
  private connections = new Map<string, any>();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('Adapter has been disposed');
    }
  }

  async enable(): Promise<void> {
    this.enabled = true;
    this.emit('enabled');
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.emit('disabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async startScan(options?: any): Promise<void> {
    if (!this.enabled) {
      throw new Error('Bluetooth is not enabled');
    }
    if (this.scanning) {
      throw new Error('Scan already in progress');
    }

    this.scanning = true;
    this.emit('scanStarted');

    // 模拟扫描发现设备
    setTimeout(() => {
      if (this.scanning) {
        const mockDevice = {
          id: 'mock-device-1',
          name: 'MockDevice',
          address: '00:00:00:00:00:01',
          rssi: -50
        };
        this.emit('deviceDiscovered', mockDevice);
      }
    }, 100);
  }

  async stopScan(): Promise<void> {
    this.scanning = false;
    this.emit('scanStopped');
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async connect(deviceId: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Bluetooth is not enabled');
    }

    const connection = {
      deviceId,
      connected: true,
      connectedAt: new Date()
    };

    this.connections.set(deviceId, connection);
    this.emit('deviceConnected', connection);

    return connection;
  }

  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.connected = false;
      this.connections.delete(deviceId);
      this.emit('deviceDisconnected', deviceId);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const deviceId of this.connections.keys()) {
      await this.disconnect(deviceId);
    }
  }

  isDeviceConnected(deviceId: string): boolean {
    const connection = this.connections.get(deviceId);
    return connection?.connected || false;
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connections.keys()).filter(
      deviceId => this.connections.get(deviceId)?.connected
    );
  }

  getDeviceConnection(deviceId: string): any {
    return this.connections.get(deviceId);
  }

  // 测试辅助方法
  addMockDevice(device: any): void {
    this.devices.set(device.id, device);
  }

  removeMockDevice(deviceId: string): void {
    this.devices.delete(deviceId);
  }

  getDeviceCount(): number {
    return this.devices.size;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  dispose(): void {
    this.disconnectAll();
    this.stopScan();
    this.removeAllListeners();
    this.devices.clear();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock打印驱动
 */
export class MockPrintDriver implements IPrintDriver {
  private disposed = false;
  private connected = false;

  constructor(private name: string = 'MockPrintDriver') {}

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('Driver has been disposed');
    }
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async print(data: ArrayBuffer): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Driver is not connected');
    }
    // Mock实现 - 总是成功
    return true;
  }

  async getStatus(): Promise<any> {
    return {
      connected: this.connected,
      ready: this.connected,
      paper: 'ready',
      error: null
    };
  }

  getName(): string {
    return this.name;
  }

  getCapabilities(): any {
    return {
      text: true,
      barcode: true,
      qrcode: true,
      image: true,
      autoCut: false
    };
  }

  dispose(): void {
    this.disconnect();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock模板缓存
 */
export class MockTemplateCache implements ITemplateCache {
  private cache = new Map<string, ArrayBuffer>();
  private disposed = false;

  get(key: string): ArrayBuffer | undefined {
    if (this.disposed) {
      return undefined;
    }
    return this.cache.get(key);
  }

  set(key: string, data: ArrayBuffer): void {
    if (this.disposed) {
      return;
    }
    this.cache.set(key, data);
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clearAll(): void {
    this.cache.clear();
  }

  getStats(): any {
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }

  dispose(): void {
    this.clearAll();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}