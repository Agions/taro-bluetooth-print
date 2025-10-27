/**
 * 领域层Mock对象
 * 提供领域组件的测试替代品
 */

import { EventEmitter } from 'events';
import {
  IBluetoothAdapter,
  IBluetoothDevice,
  IBluetoothConnection,
  IBluetoothScanOptions,
  BluetoothState
} from '../../src/domain/bluetooth/types';
import {
  IPrinterManager,
  IPrinter,
  IPrintJob,
  IPrintDriver,
  PrinterState,
  PrintJobState
} from '../../src/domain/printer/types';
import {
  IPrintQueue,
  IQueueConfig,
  IQueuePolicy,
  QueueStatus
} from '../../src/domain/queue/types';
import {
  ITemplateEngine,
  ITemplate,
  ITemplateRenderer,
  ITemplateContext
} from '../../src/domain/template/types';

/**
 * Mock蓝牙适配器
 */
export class MockBluetoothAdapter extends EventEmitter implements IBluetoothAdapter {
  private state: BluetoothState = BluetoothState.UNAVAILABLE;
  private scanning: boolean = false;
  private devices = new Map<string, IBluetoothDevice>();
  private connections = new Map<string, IBluetoothConnection>();
  private disposed = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('Adapter has been disposed');
    }
    this.state = BluetoothState.POWERED_OFF;
    this.emit('initialized');
  }

  async enable(): Promise<void> {
    this.state = BluetoothState.POWERED_ON;
    this.emit('enabled');
  }

  async disable(): Promise<void> {
    this.state = BluetoothState.POWERED_OFF;
    this.disconnectAll();
    this.emit('disabled');
  }

  getState(): BluetoothState {
    return this.state;
  }

  isEnabled(): boolean {
    return this.state === BluetoothState.POWERED_ON;
  }

  async startScan(options?: IBluetoothScanOptions): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('Bluetooth is not enabled');
    }
    if (this.scanning) {
      throw new Error('Scan already in progress');
    }

    this.scanning = true;
    this.emit('scanStarted');

    // 模拟发现设备
    setTimeout(() => {
      if (this.scanning) {
        const mockDevice: IBluetoothDevice = {
          id: 'mock-device-1',
          name: 'MockDevice',
          address: '00:00:00:00:00:01',
          rssi: -50,
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          advertisementData: {
            localName: 'MockDevice',
            serviceUuids: [],
            manufacturerData: new ArrayBuffer(0),
            serviceData: new Map(),
            txPowerLevel: -10,
            connectable: true
          }
        };
        this.devices.set(mockDevice.id, mockDevice);
        this.emit('deviceDiscovered', mockDevice);
      }
    }, 100);

    // 自动停止扫描
    const timeout = options?.timeout || 10000;
    setTimeout(() => {
      if (this.scanning) {
        this.stopScan();
      }
    }, timeout);
  }

  async stopScan(): Promise<void> {
    this.scanning = false;
    this.emit('scanStopped');
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async scan(timeout?: number): Promise<IBluetoothDevice[]> {
    await this.startScan({ timeout });
    return Array.from(this.devices.values());
  }

  async connect(deviceId: string): Promise<IBluetoothConnection> {
    if (!this.isEnabled()) {
      throw new Error('Bluetooth is not enabled');
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const connection: IBluetoothConnection = {
      deviceId,
      connected: true,
      connectable: true,
      services: [],
      characteristics: new Map(),
      mtu: 20,
      rssi: device.rssi,
      connectedAt: new Date(),
      lastActivity: new Date()
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

  getConnectedDevices(): IBluetoothConnection[] {
    return Array.from(this.connections.values()).filter(
      connection => connection.connected
    );
  }

  getDeviceConnection(deviceId: string): IBluetoothConnection | undefined {
    return this.connections.get(deviceId);
  }

  // 测试辅助方法
  addMockDevice(device: IBluetoothDevice): void {
    this.devices.set(device.id, device);
  }

  removeMockDevice(deviceId: string): void {
    this.devices.delete(deviceId);
  }

  setState(state: BluetoothState): void {
    this.state = state;
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
    this.connections.clear();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock打印机管理器
 */
export class MockPrinterManager extends EventEmitter implements IPrinterManager {
  private printers = new Map<string, IPrinter>();
  private drivers = new Map<string, IPrintDriver>();
  private disposed = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('PrinterManager has been disposed');
    }
    this.emit('initialized');
  }

  async addPrinter(printer: Omit<IPrinter, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPrinter> {
    const fullPrinter: IPrinter = {
      ...printer,
      id: `printer-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.printers.set(fullPrinter.id, fullPrinter);
    this.emit('printerAdded', fullPrinter);

    return fullPrinter;
  }

  async removePrinter(printerId: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (printer) {
      this.printers.delete(printerId);
      this.emit('printerRemoved', printerId);
    }
  }

  getPrinter(printerId: string): IPrinter | undefined {
    return this.printers.get(printerId);
  }

  getPrinters(): IPrinter[] {
    return Array.from(this.printers.values());
  }

  getPrintersByDeviceId(deviceId: string): IPrinter[] {
    return this.getPrinters().filter(printer => printer.deviceId === deviceId);
  }

  getConnectedPrinters(): IPrinter[] {
    return this.getPrinters().filter(printer => printer.status === PrinterState.CONNECTED);
  }

  getReadyPrinters(): IPrinter[] {
    return this.getPrinters().filter(printer => printer.status === PrinterState.READY);
  }

  async registerDriver(type: string, driver: IPrintDriver): Promise<void> {
    this.drivers.set(type, driver);
    this.emit('driverRegistered', { type, driver });
  }

  getDriver(type: string): IPrintDriver | undefined {
    return this.drivers.get(type);
  }

  getAvailableDrivers(): string[] {
    return Array.from(this.drivers.keys());
  }

  async createPrinter(driverType: string, deviceId: string, options?: any): Promise<IPrinter> {
    const driver = this.drivers.get(driverType);
    if (!driver) {
      throw new Error(`Driver not found: ${driverType}`);
    }

    const printer: IPrinter = {
      id: `printer-${Date.now()}`,
      name: options?.name || `Printer ${deviceId}`,
      deviceId,
      type: driverType,
      model: options?.model || 'Unknown',
      manufacturer: options?.manufacturer || 'Unknown',
      status: PrinterState.DISCONNECTED,
      capabilities: driver.getCapabilities(),
      connection: null,
      driver,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.printers.set(printer.id, printer);
    this.emit('printerAdded', printer);

    return printer;
  }

  async connectPrinter(printerId: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer not found: ${printerId}`);
    }

    if (printer.driver) {
      await printer.driver.connect();
      printer.status = PrinterState.CONNECTED;
      printer.updatedAt = new Date();
      this.emit('printerConnected', printer);
    }
  }

  async disconnectPrinter(printerId: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (printer) {
      if (printer.driver) {
        await printer.driver.disconnect();
      }
      printer.status = PrinterState.DISCONNECTED;
      printer.updatedAt = new Date();
      this.emit('printerDisconnected', printerId);
    }
  }

  async printText(printerId: string, text: string, options?: any): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer not found: ${printerId}`);
    }

    if (!printer.driver || !printer.driver.isConnected()) {
      throw new Error(`Printer not connected: ${printerId}`);
    }

    const data = new TextEncoder().encode(text).buffer;
    return await printer.driver.print(data);
  }

  async printImage(printerId: string, imageData: ArrayBuffer, options?: any): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer not found: ${printerId}`);
    }

    if (!printer.driver || !printer.driver.isConnected()) {
      throw new Error(`Printer not connected: ${printerId}`);
    }

    return await printer.driver.print(imageData);
  }

  async printRaw(printerId: string, data: ArrayBuffer): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer not found: ${printerId}`);
    }

    if (!printer.driver || !printer.driver.isConnected()) {
      throw new Error(`Printer not connected: ${printerId}`);
    }

    return await printer.driver.print(data);
  }

  getPrinterStatus(printerId: string): Promise<any> {
    const printer = this.printers.get(printerId);
    if (printer && printer.driver) {
      return printer.driver.getStatus();
    }
    return Promise.resolve({ connected: false, ready: false });
  }

  // 测试辅助方法
  addMockPrinter(printer: IPrinter): void {
    this.printers.set(printer.id, printer);
  }

  removeMockPrinter(printerId: string): void {
    this.printers.delete(printerId);
  }

  setPrinterStatus(printerId: string, status: PrinterState): void {
    const printer = this.printers.get(printerId);
    if (printer) {
      printer.status = status;
      printer.updatedAt = new Date();
      this.emit('printerStatusChanged', { printerId, status });
    }
  }

  getPrinterCount(): number {
    return this.printers.size;
  }

  getDriverCount(): number {
    return this.drivers.size;
  }

  dispose(): void {
    this.removeAllListeners();
    this.printers.clear();
    this.drivers.clear();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock打印队列
 */
export class MockPrintQueue extends EventEmitter implements IPrintQueue {
  private jobs: IPrintJob[] = [];
  private config: IQueueConfig;
  private disposed = false;
  private processing: boolean = false;
  private paused: boolean = false;

  constructor(config: IQueueConfig = {} as IQueueConfig) {
    super();
    this.config = {
      maxSize: 100,
      concurrency: 1,
      retryAttempts: 3,
      retryDelay: 1000,
      autoProcess: true,
      processInterval: 500,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('PrintQueue has been disposed');
    }

    if (this.config.autoProcess) {
      this.startProcessing();
    }

    this.emit('initialized');
  }

  async addJob(job: Omit<IPrintJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (this.disposed) {
      throw new Error('PrintQueue has been disposed');
    }

    if (this.jobs.length >= this.config.maxSize) {
      throw new Error('Queue is full');
    }

    const fullJob: IPrintJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.push(fullJob);
    this.sortQueue();
    this.emit('jobQueued', fullJob);
  }

  getJob(jobId: string): IPrintJob | undefined {
    return this.jobs.find(job => job.id === jobId);
  }

  getJobs(): IPrintJob[] {
    return [...this.jobs];
  }

  getJobsByStatus(status: PrintJobState): IPrintJob[] {
    return this.jobs.filter(job => job.status === status);
  }

  getNextJob(): IPrintJob | undefined {
    return this.jobs.find(job => job.status === PrintJobState.PENDING);
  }

  async removeJob(jobId: string): Promise<boolean> {
    const index = this.jobs.findIndex(job => job.id === jobId);
    if (index !== -1) {
      const job = this.jobs.splice(index, 1)[0];
      this.emit('jobRemoved', job);
      return true;
    }
    return false;
  }

  clear(): void {
    this.jobs.length = 0;
    this.emit('cleared');
  }

  startProcessing(): void {
    if (!this.processing) {
      this.processing = true;
      this.emit('processingStarted');
      this.processJobs();
    }
  }

  stopProcessing(): void {
    this.processing = false;
    this.emit('processingStopped');
  }

  pause(): void {
    this.paused = true;
    this.emit('paused');
  }

  resume(): void {
    this.paused = false;
    this.emit('resumed');
  }

  getStatus(): QueueStatus {
    const pending = this.getJobsByStatus(PrintJobState.PENDING).length;
    const processing = this.getJobsByStatus(PrintJobState.PROCESSING).length;
    const completed = this.getJobsByStatus(PrintJobState.COMPLETED).length;
    const failed = this.getJobsByStatus(PrintJobState.FAILED).length;

    return {
      total: this.jobs.length,
      pending,
      processing,
      completed,
      failed,
      processing: this.processing,
      paused: this.paused
    };
  }

  updateConfig(config: Partial<IQueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  getConfig(): IQueueConfig {
    return { ...this.config };
  }

  private sortQueue(): void {
    this.jobs.sort((a, b) => b.priority - a.priority);
  }

  private async processJobs(): Promise<void> {
    while (this.processing && !this.paused) {
      const job = this.getNextJob();
      if (!job) {
        await new Promise(resolve => setTimeout(resolve, this.config.processInterval));
        continue;
      }

      job.status = PrintJobState.PROCESSING;
      job.updatedAt = new Date();
      this.emit('jobStarted', job);

      try {
        // 模拟处理
        await new Promise(resolve => setTimeout(resolve, 100));

        job.status = PrintJobState.COMPLETED;
        job.updatedAt = new Date();
        job.result = { success: true, timestamp: Date.now() };
        this.emit('jobCompleted', job);
      } catch (error) {
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          job.status = PrintJobState.PENDING;
          job.updatedAt = new Date();
          this.emit('jobRetry', job);
        } else {
          job.status = PrintJobState.FAILED;
          job.updatedAt = new Date();
          job.error = error as Error;
          this.emit('jobFailed', job, error as Error);
        }
      }
    }
  }

  // 测试辅助方法
  addMockJob(job: IPrintJob): void {
    this.jobs.push(job);
    this.sortQueue();
  }

  setJobStatus(jobId: string, status: PrintJobState): void {
    const job = this.getJob(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();

      switch (status) {
        case PrintJobState.PROCESSING:
          this.emit('jobStarted', job);
          break;
        case PrintJobState.COMPLETED:
          this.emit('jobCompleted', job);
          break;
        case PrintJobState.FAILED:
          this.emit('jobFailed', job, job.error || new Error('Unknown error'));
          break;
      }
    }
  }

  getJobCount(): number {
    return this.jobs.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  isPaused(): boolean {
    return this.paused;
  }

  dispose(): void {
    this.stopProcessing();
    this.removeAllListeners();
    this.jobs.length = 0;
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Mock模板引擎
 */
export class MockTemplateEngine extends EventEmitter implements ITemplateEngine {
  private templates = new Map<string, ITemplate>();
  private renderers = new Map<string, ITemplateRenderer>();
  private disposed = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('TemplateEngine has been disposed');
    }
    this.emit('initialized');
  }

  async registerTemplate(template: ITemplate): Promise<void> {
    if (this.disposed) {
      throw new Error('TemplateEngine has been disposed');
    }

    this.templates.set(template.id, template);
    this.emit('templateRegistered', template);
  }

  unregisterTemplate(templateId: string): void {
    this.templates.delete(templateId);
    this.emit('templateUnregistered', templateId);
  }

  getTemplate(templateId: string): ITemplate | undefined {
    return this.templates.get(templateId);
  }

  getTemplates(): ITemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByType(type: string): ITemplate[] {
    return this.getTemplates().filter(template => template.type === type);
  }

  async render(
    templateId: string,
    data: any,
    context?: Partial<ITemplateContext>
  ): Promise<ArrayBuffer> {
    if (this.disposed) {
      throw new Error('TemplateEngine has been disposed');
    }

    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Mock渲染 - 返回简单的编码数据
    const content = typeof template.content === 'string'
      ? template.content
      : JSON.stringify(template.content);

    return new TextEncoder().encode(content).buffer;
  }

  async renderBatch(
    requests: Array<{
      templateId: string;
      data: any;
      context?: Partial<ITemplateContext>;
    }>
  ): Promise<ArrayBuffer[]> {
    const results: ArrayBuffer[] = [];

    for (const request of requests) {
      const result = await this.render(request.templateId, request.data, request.context);
      results.push(result);
    }

    return results;
  }

  registerRenderer(type: string, renderer: ITemplateRenderer): void {
    this.renderers.set(type, renderer);
    this.emit('rendererRegistered', { type, renderer });
  }

  unregisterRenderer(type: string): void {
    this.renderers.delete(type);
    this.emit('rendererUnregistered', type);
  }

  getRenderer(type: string): ITemplateRenderer | undefined {
    return this.renderers.get(type);
  }

  getAvailableRenderers(): string[] {
    return Array.from(this.renderers.keys());
  }

  async validateTemplate(template: ITemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    // Mock验证
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  async preview(templateId: string, data: any): Promise<string> {
    const buffer = await this.render(templateId, data);
    return new TextDecoder().decode(buffer);
  }

  clearCache(): void {
    // Mock实现
    this.emit('cacheCleared');
  }

  getStats(): any {
    return {
      templates: this.templates.size,
      renderers: this.renderers.size,
      cacheHits: 0,
      cacheMisses: 0,
      renderCount: 0
    };
  }

  // 测试辅助方法
  addMockTemplate(template: ITemplate): void {
    this.templates.set(template.id, template);
  }

  removeMockTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  getTemplateCount(): number {
    return this.templates.size;
  }

  getRendererCount(): number {
    return this.renderers.size;
  }

  dispose(): void {
    this.removeAllListeners();
    this.templates.clear();
    this.renderers.clear();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}