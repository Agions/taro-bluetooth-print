/**
 * Taro 蓝牙打印库主入口模块
 * 提供统一的蓝牙打印功能API
 */

import { Container, ServiceLifecycle } from './infrastructure/di';
import { EventBus } from './infrastructure/events';
import { BluetoothPrinterConfigManager } from './infrastructure/config/BluetoothPrinterConfigManager';
import { Logger, createLogger } from './infrastructure/logging';
import { BluetoothAdapterFactory } from './infrastructure/bluetooth/BluetoothAdapterFactory';
import { PrinterDriverFactory } from './infrastructure/printer/PrinterDriverFactory';
import { TemplateCache } from './infrastructure/template/TemplateCache';

import { BluetoothAdapter } from './domain/bluetooth';
import { PrinterManager } from './domain/printer';
import { PrintQueue } from './domain/queue';
import { TemplateEngine } from './domain/template';

import {
  IBluetoothPrinter,
  IBluetoothPrinterConfig,
  IBluetoothPrinterOptions,
  BluetoothPrinterEvent,
  IPrintRequest,
  IPrintResult,
  IDeviceInfo,
  IConnectionInfo,
  IQueueStatus,
  ITemplateInfo
} from './types';

/**
 * Taro 蓝牙打印库主类
 */
export class BluetoothPrinter implements IBluetoothPrinter {
  private container: Container;
  private eventBus: EventBus;
  private configManager: BluetoothPrinterConfigManager;
  private logger: Logger;
  private bluetoothAdapter: BluetoothAdapter;
  private printerManager: PrinterManager;
  private printQueue: PrintQueue;
  private templateEngine: TemplateEngine;
  private isInitialized: boolean = false;

  constructor(config?: Partial<IBluetoothPrinterConfig>, options?: IBluetoothPrinterOptions) {
    this.initializeContainer(config, options);
  }

  /**
   * 初始化依赖注入容器和核心组件
   */
  private initializeContainer(config?: Partial<IBluetoothPrinterConfig>, options?: IBluetoothPrinterOptions): void {
    // 创建容器
    this.container = new Container();

    // 注册配置管理器
    this.configManager = new BluetoothPrinterConfigManager(config);
    this.container.register('ConfigManager', () => this.configManager, ServiceLifecycle.SINGLETON);

    // 注册事件总线
    this.eventBus = new EventBus();
    this.container.register('EventBus', () => this.eventBus, ServiceLifecycle.SINGLETON);

    // 注册日志器
    this.logger = createLogger('BluetoothPrinter');
    this.container.register('Logger', () => this.logger, ServiceLifecycle.SINGLETON);

    // 配置已通过构造函数传递给配置管理器

    // 注册基础工厂
    this.container.register('BluetoothAdapterFactory', () => new BluetoothAdapterFactory(), ServiceLifecycle.SINGLETON);
    this.container.register('PrinterDriverFactory', () => new PrinterDriverFactory(), ServiceLifecycle.SINGLETON);
    this.container.register('TemplateCache', () => new TemplateCache(), ServiceLifecycle.SINGLETON);

    // 注册核心业务组件
    this.registerCoreComponents();

    // 获取组件实例
    this.bluetoothAdapter = this.container.resolve<BluetoothAdapter>('BluetoothAdapter');
    this.printerManager = this.container.resolve<PrinterManager>('PrinterManager');
    this.printQueue = this.container.resolve<PrintQueue>('PrintQueue');
    this.templateEngine = this.container.resolve<TemplateEngine>('TemplateEngine');

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 注册核心业务组件
   */
  private registerCoreComponents(): void {
    // 蓝牙适配器
    this.container.register(
      'BluetoothAdapter',
      () => new BluetoothAdapter(
        this.container.resolve('BluetoothAdapterFactory'),
        this.eventBus,
        this.logger
      ),
      ServiceLifecycle.SINGLETON
    );

    // 打印机管理器
    this.container.register(
      'PrinterManager',
      () => new PrinterManager(
        this.container.resolve('PrinterDriverFactory'),
        this.eventBus,
        this.logger
      ),
      ServiceLifecycle.SINGLETON
    );

    // 打印队列
    this.container.register(
      'PrintQueue',
      () => new PrintQueue(
        this.configManager.getQueueConfig(),
        this.eventBus,
        this.logger
      ),
      ServiceLifecycle.SINGLETON
    );

    // 模板引擎
    this.container.register(
      'TemplateEngine',
      () => new TemplateEngine(
        this.container.resolve('TemplateCache'),
        this.eventBus,
        this.logger
      ),
      ServiceLifecycle.SINGLETON
    );
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 蓝牙事件转发
    this.bluetoothAdapter.on('deviceDiscovered', (device) => {
      this.emit('deviceDiscovered', device);
    });

    this.bluetoothAdapter.on('deviceConnected', (connection) => {
      this.emit('deviceConnected', connection);
    });

    this.bluetoothAdapter.on('deviceDisconnected', (deviceId) => {
      this.emit('deviceDisconnected', deviceId);
    });

    this.bluetoothAdapter.on('connectionFailed', (error) => {
      this.emit('connectionFailed', error);
    });

    // 打印机事件转发
    this.printerManager.on('printerAdded', (printer) => {
      this.emit('printerAdded', printer);
    });

    this.printerManager.on('printerRemoved', (printerId) => {
      this.emit('printerRemoved', printerId);
    });

    this.printerManager.on('printerStatusChanged', (status) => {
      this.emit('printerStatusChanged', status);
    });

    // 队列事件转发
    this.printQueue.on('jobQueued', (job) => {
      this.emit('jobQueued', job);
    });

    this.printQueue.on('jobStarted', (job) => {
      this.emit('jobStarted', job);
    });

    this.printQueue.on('jobCompleted', (job) => {
      this.emit('jobCompleted', job);
    });

    this.printQueue.on('jobFailed', (job, error) => {
      this.emit('jobFailed', job, error);
    });

    // 模板事件转发
    this.templateEngine.on('templateRegistered', (template) => {
      this.emit('templateRegistered', template);
    });

    this.templateEngine.on('templateRendered', (result) => {
      this.emit('templateRendered', result);
    });

    this.templateEngine.on('templateError', (error) => {
      this.emit('templateError', error);
    });
  }

  /**
   * 初始化库
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing BluetoothPrinter library...');

      // 初始化蓝牙适配器
      await this.bluetoothAdapter.initialize();

      // 初始化打印机管理器
      await this.printerManager.initialize();

      // 初始化打印队列
      await this.printQueue.initialize();

      // 初始化模板引擎
      await this.templateEngine.initialize();

      this.isInitialized = true;
      this.logger.info('BluetoothPrinter library initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize BluetoothPrinter library:', error);
      throw error;
    }
  }

  /**
   * 扫描蓝牙设备
   */
  public async scanDevices(timeout: number = 10000): Promise<IDeviceInfo[]> {
    this.ensureInitialized();
    return await this.bluetoothAdapter.scan(timeout);
  }

  /**
   * 连接设备
   */
  public async connectDevice(deviceId: string): Promise<IConnectionInfo> {
    this.ensureInitialized();
    return await this.bluetoothAdapter.connect(deviceId);
  }

  /**
   * 断开设备连接
   */
  public async disconnectDevice(deviceId: string): Promise<void> {
    this.ensureInitialized();
    return await this.bluetoothAdapter.disconnect(deviceId);
  }

  /**
   * 获取已连接的设备
   */
  public getConnectedDevices(): IConnectionInfo[] {
    this.ensureInitialized();
    return this.bluetoothAdapter.getConnectedDevices();
  }

  /**
   * 打印文本
   */
  public async printText(text: string, options?: any): Promise<IPrintResult> {
    this.ensureInitialized();
    return await this.printerManager.printText(text, options);
  }

  /**
   * 打印模板
   */
  public async printTemplate(
    templateId: string,
    data: any,
    options?: any
  ): Promise<IPrintResult> {
    this.ensureInitialized();
    return await this.printerManager.printTemplate(templateId, data, options);
  }

  /**
   * 打印图片
   */
  public async printImage(imageData: ArrayBuffer | string, options?: any): Promise<IPrintResult> {
    this.ensureInitialized();
    return await this.printerManager.printImage(imageData, options);
  }

  /**
   * 打印条形码
   */
  public async printBarcode(data: string, type: string, options?: any): Promise<IPrintResult> {
    this.ensureInitialized();
    return await this.printerManager.printBarcode(data, type, options);
  }

  /**
   * 打印二维码
   */
  public async printQRCode(data: string, options?: any): Promise<IPrintResult> {
    this.ensureInitialized();
    return await this.printerManager.printQRCode(data, options);
  }

  /**
   * 批量打印
   */
  public async printBatch(requests: IPrintRequest[]): Promise<IPrintResult[]> {
    this.ensureInitialized();
    return await this.printerManager.printBatch(requests);
  }

  /**
   * 获取队列状态
   */
  public getQueueStatus(): IQueueStatus {
    this.ensureInitialized();
    return this.printQueue.getStatus();
  }

  /**
   * 清空队列
   */
  public clearQueue(): void {
    this.ensureInitialized();
    this.printQueue.clear();
  }

  /**
   * 暂停队列处理
   */
  public pauseQueue(): void {
    this.ensureInitialized();
    this.printQueue.pause();
  }

  /**
   * 恢复队列处理
   */
  public resumeQueue(): void {
    this.ensureInitialized();
    this.printQueue.resume();
  }

  /**
   * 注册模板
   */
  public async registerTemplate(template: any): Promise<void> {
    this.ensureInitialized();
    return await this.templateEngine.registerTemplate(template);
  }

  /**
   * 获取模板信息
   */
  public getTemplate(templateId: string): ITemplateInfo | undefined {
    this.ensureInitialized();
    const template = this.templateEngine.getTemplate(templateId);
    if (!template) {
      return undefined;
    }

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      version: template.version,
      tags: template.tags
    };
  }

  /**
   * 获取所有模板
   */
  public getTemplates(): ITemplateInfo[] {
    this.ensureInitialized();
    return this.templateEngine.getTemplates().map(template => ({
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      version: template.version,
      tags: template.tags
    }));
  }

  /**
   * 预览模板
   */
  public async previewTemplate(templateId: string, data: any): Promise<string> {
    this.ensureInitialized();
    return await this.templateEngine.preview(templateId, data);
  }

  /**
   * 获取库状态
   */
  public getStatus() {
    return {
      initialized: this.isInitialized,
      bluetooth: {
        enabled: this.bluetoothAdapter.isEnabled(),
        scanning: this.bluetoothAdapter.isScanning(),
        connectedDevices: this.bluetoothAdapter.getConnectedDevices().length
      },
      printers: {
        total: this.printerManager.getPrinters().length,
        connected: this.printerManager.getConnectedPrinters().length,
        ready: this.printerManager.getReadyPrinters().length
      },
      queue: this.printQueue.getStatus(),
      templates: {
        total: this.templateEngine.getTemplates().length,
        enabled: this.templateEngine.getTemplates().filter(t => t.enabled).length
      },
      config: this.configManager.getConfig()
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<IBluetoothPrinterConfig>): void {
    this.configManager.updateConfig(config);
    this.emit('configUpdated', config);
  }

  /**
   * 获取配置
   */
  public getConfig(): IBluetoothPrinterConfig {
    return this.configManager.getConfig();
  }

  /**
   * 添加事件监听器
   */
  public on<K extends keyof BluetoothPrinterEvent>(
    event: K,
    listener: BluetoothPrinterEvent[K]
  ): this {
    this.eventBus.on(event.toString(), listener as any);
    return this;
  }

  /**
   * 移除事件监听器
   */
  public off<K extends keyof BluetoothPrinterEvent>(
    event: K,
    listener: BluetoothPrinterEvent[K]
  ): this {
    this.eventBus.off(event.toString(), listener as any);
    return this;
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof BluetoothPrinterEvent>(
    event: K,
    ...args: Parameters<BluetoothPrinterEvent[K]>
  ): void {
    this.eventBus.emit(event.toString(), ...args);
  }

  /**
   * 确保库已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('BluetoothPrinter library is not initialized. Call initialize() first.');
    }
  }

  /**
   * 销毁库
   */
  public async dispose(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Disposing BluetoothPrinter library...');

      // 停止队列处理
      this.printQueue.stop();

      // 断开所有连接
      await this.bluetoothAdapter.disconnectAll();

      // 销毁组件
      await this.printQueue.dispose();
      await this.templateEngine.dispose();
      await this.printerManager.dispose();
      await this.bluetoothAdapter.dispose();

      // 销毁容器
      this.container.dispose();

      this.isInitialized = false;
      this.logger.info('BluetoothPrinter library disposed successfully');

    } catch (error) {
      this.logger.error('Error during disposal:', error);
      throw error;
    }
  }
}

/**
 * 创建蓝牙打印实例
 */
export function createBluetoothPrinter(
  config?: Partial<IBluetoothPrinterConfig>,
  options?: IBluetoothPrinterOptions
): BluetoothPrinter {
  return new BluetoothPrinter(config, options);
}

/**
 * 默认导出
 */
export default BluetoothPrinter;