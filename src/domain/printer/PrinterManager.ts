/**
 * 打印机管理器核心实现
 */

import {
  IPrinterManager,
  IPrinter,
  IPrinterTemplate,
  IPrintJob,
  IPrintQueue,
  IPrinterCommand,
  PrinterState,
  PrinterType,
  PrintJobStatus,
  PrintJobPriority,
  IPrinterManagerConfig,
  IPrinterEvent,
  PrinterEventType,
  IPrinterDriver,
  IPrintTemplateEngine
} from './types';
import { EventEmitter } from 'events';
import { BluetoothAdapter } from '../bluetooth/BluetoothAdapter';
import { ConfigManager } from '../../infrastructure/config';
import { Logger } from '../../infrastructure/logging';

/**
 * 打印机管理器核心实现
 */
export class PrinterManager extends EventEmitter implements IPrinterManager {
  /** 管理器名称 */
  public readonly name: string;

  /** 管理器配置 */
  private config: IPrinterManagerConfig;

  /** 已注册的打印机 */
  private printers: Map<string, IPrinter> = new Map();

  /** 打印队列 */
  private queue: IPrintQueue;

  /** 蓝牙适配器 */
  private bluetoothAdapter: BluetoothAdapter;

  /** 配置管理器 */
  private configManager: ConfigManager;

  /** 日志记录器 */
  private logger: Logger;

  /** 打印机驱动映射 */
  private drivers: Map<string, IPrinterDriver> = new Map();

  /** 模板引擎 */
  private templateEngine: IPrintTemplateEngine;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 是否正在处理队列 */
  private isProcessingQueue: boolean = false;

  /** 队列处理定时器 */
  private queueTimer?: NodeJS.Timeout;

  constructor(
    name: string,
    bluetoothAdapter: BluetoothAdapter,
    configManager: ConfigManager,
    templateEngine: IPrintTemplateEngine,
    config?: Partial<IPrinterManagerConfig>
  ) {
    super();
    this.name = name;
    this.bluetoothAdapter = bluetoothAdapter;
    this.configManager = configManager;
    this.templateEngine = templateEngine;
    this.logger = new Logger(`PrinterManager-${name}`);
    this.config = this.mergeConfig(config);

    // 初始化打印队列
    this.queue = {
      jobs: [],
      maxSize: this.config.maxQueueSize,
      isProcessing: false
    };

    this.initialize();
  }

  /**
   * 初始化管理器
   */
  private async initialize(): Promise<void> {
    try {
      // 加载配置
      await this.loadConfiguration();

      // 设置蓝牙适配器事件监听
      this.setupBluetoothEventListeners();

      // 启动队列处理
      this.startQueueProcessing();

      this.initialized = true;
      this.emit('initialized');
      this.logger.info('Printer manager initialized', { name: this.name });
    } catch (error) {
      this.logger.error('Failed to initialize printer manager', error);
      throw error;
    }
  }

  /**
   * 注册打印机
   */
  public async registerPrinter(printer: IPrinter): Promise<void> {
    try {
      // 验证打印机配置
      this.validatePrinter(printer);

      // 注册到驱动
      const driver = this.getDriverForType(printer.type);
      await driver.registerPrinter(printer);

      // 添加到打印机列表
      this.printers.set(printer.id, printer);

      // 设置打印机事件监听
      this.setupPrinterEventListeners(printer);

      this.emit('printerRegistered', printer);
      this.logger.info('Printer registered', { printerId: printer.id, name: printer.name });
    } catch (error) {
      this.logger.error('Failed to register printer', error, { printerId: printer.id });
      throw error;
    }
  }

  /**
   * 注销打印机
   */
  public async unregisterPrinter(printerId: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    try {
      // 断开连接
      if (printer.isConnected()) {
        await printer.disconnect();
      }

      // 从驱动注销
      const driver = this.getDriverForType(printer.type);
      await driver.unregisterPrinter(printerId);

      // 从列表移除
      this.printers.delete(printerId);

      this.emit('printerUnregistered', printer);
      this.logger.info('Printer unregistered', { printerId });
    } catch (error) {
      this.logger.error('Failed to unregister printer', error, { printerId });
      throw error;
    }
  }

  /**
   * 获取所有打印机
   */
  public getPrinters(): IPrinter[] {
    return Array.from(this.printers.values());
  }

  /**
   * 获取可用打印机
   */
  public getAvailablePrinters(): IPrinter[] {
    return this.getPrinters().filter(printer => printer.isAvailable());
  }

  /**
   * 获取连接的打印机
   */
  public getConnectedPrinters(): IPrinter[] {
    return this.getPrinters().filter(printer => printer.isConnected());
  }

  /**
   * 获取打印机
   */
  public getPrinter(printerId: string): IPrinter | undefined {
    return this.printers.get(printerId);
  }

  /**
   * 连接打印机
   */
  public async connectPrinter(printerId: string): Promise<IPrinter> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    if (printer.isConnected()) {
      return printer;
    }

    try {
      this.emit('connectionStart', { printerId });

      // 通过蓝牙适配器连接
      await this.bluetoothAdapter.connect(printer.deviceId, {
        timeout: this.config.connectionTimeout
      });

      // 更新打印机状态
      printer.state = PrinterState.CONNECTED;
      printer.lastConnected = new Date();

      this.emit('printerConnected', printer);
      this.emit('connectionComplete', { printerId, printer });
      this.logger.info('Printer connected', { printerId });

      return printer;
    } catch (error) {
      this.logger.error('Failed to connect printer', error, { printerId });
      this.emit('connectionFailed', { printerId, error });
      throw error;
    }
  }

  /**
   * 断开打印机连接
   */
  public async disconnectPrinter(printerId: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      return; // 打印机不存在
    }

    if (!printer.isConnected()) {
      return; // 未连接
    }

    try {
      this.emit('disconnectionStart', { printerId });

      // 通过蓝牙适配器断开
      await this.bluetoothAdapter.disconnect(printer.deviceId);

      // 更新打印机状态
      printer.state = PrinterState.DISCONNECTED;
      printer.lastDisconnected = new Date();

      this.emit('printerDisconnected', printer);
      this.emit('disconnectionComplete', { printerId, printer });
      this.logger.info('Printer disconnected', { printerId });
    } catch (error) {
      this.logger.error('Failed to disconnect printer', error, { printerId });
      throw error;
    }
  }

  /**
   * 添加打印作业
   */
  public async addPrintJob(job: Omit<IPrintJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPrintJob> {
    const fullJob: IPrintJob = {
      ...job,
      id: this.generateJobId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // 验证作业
      this.validatePrintJob(fullJob);

      // 添加到队列
      this.queue.jobs.push(fullJob);

      // 按优先级排序
      this.sortQueue();

      // 限制队列大小
      if (this.queue.jobs.length > this.queue.maxSize) {
        const removed = this.queue.jobs.shift();
        if (removed) {
          this.emit('jobDropped', removed);
          this.logger.warn('Print job dropped due to queue overflow', { jobId: removed.id });
        }
      }

      this.emit('jobAdded', fullJob);
      this.logger.info('Print job added', { jobId: fullJob.id, printerId: job.printerId });

      return fullJob;
    } catch (error) {
      this.logger.error('Failed to add print job', error, { jobId: fullJob.id });
      throw error;
    }
  }

  /**
   * 获取打印作业
   */
  public getPrintJob(jobId: string): IPrintJob | undefined {
    return this.queue.jobs.find(job => job.id === jobId);
  }

  /**
   * 获取打印队列
   */
  public getPrintQueue(): IPrintQueue {
    return {
      ...this.queue,
      jobs: [...this.queue.jobs]
    };
  }

  /**
   * 取消打印作业
   */
  public async cancelPrintJob(jobId: string): Promise<void> {
    const jobIndex = this.queue.jobs.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      throw new Error(`Print job ${jobId} not found`);
    }

    const job = this.queue.jobs[jobIndex];

    try {
      // 如果作业正在处理中，尝试停止
      if (job.status === PrintJobStatus.PROCESSING) {
        const printer = this.printers.get(job.printerId);
        if (printer) {
          const driver = this.getDriverForType(printer.type);
          await driver.cancelJob(printer, job);
        }
      }

      // 从队列移除
      this.queue.jobs.splice(jobIndex, 1);

      // 更新状态
      job.status = PrintJobStatus.CANCELLED;
      job.updatedAt = new Date();

      this.emit('jobCancelled', job);
      this.logger.info('Print job cancelled', { jobId });
    } catch (error) {
      this.logger.error('Failed to cancel print job', error, { jobId });
      throw error;
    }
  }

  /**
   * 暂停打印作业
   */
  public async pausePrintJob(jobId: string): Promise<void> {
    const job = this.getPrintJob(jobId);
    if (!job) {
      throw new Error(`Print job ${jobId} not found`);
    }

    if (job.status !== PrintJobStatus.PROCESSING) {
      throw new Error(`Cannot pause job with status ${job.status}`);
    }

    try {
      const printer = this.printers.get(job.printerId);
      if (!printer) {
        throw new Error(`Printer ${job.printerId} not found`);
      }

      const driver = this.getDriverForType(printer.type);
      await driver.pauseJob(printer, job);

      job.status = PrintJobStatus.PAUSED;
      job.updatedAt = new Date();

      this.emit('jobPaused', job);
      this.logger.info('Print job paused', { jobId });
    } catch (error) {
      this.logger.error('Failed to pause print job', error, { jobId });
      throw error;
    }
  }

  /**
   * 恢复打印作业
   */
  public async resumePrintJob(jobId: string): Promise<void> {
    const job = this.getPrintJob(jobId);
    if (!job) {
      throw new Error(`Print job ${jobId} not found`);
    }

    if (job.status !== PrintJobStatus.PAUSED) {
      throw new Error(`Cannot resume job with status ${job.status}`);
    }

    try {
      const printer = this.printers.get(job.printerId);
      if (!printer) {
        throw new Error(`Printer ${job.printerId} not found`);
      }

      const driver = this.getDriverForType(printer.type);
      await driver.resumeJob(printer, job);

      job.status = PrintJobStatus.PROCESSING;
      job.updatedAt = new Date();

      this.emit('jobResumed', job);
      this.logger.info('Print job resumed', { jobId });
    } catch (error) {
      this.logger.error('Failed to resume print job', error, { jobId });
      throw error;
    }
  }

  /**
   * 注册打印机驱动
   */
  public registerDriver(type: PrinterType, driver: IPrinterDriver): void {
    this.drivers.set(type, driver);
    this.logger.info('Printer driver registered', { type, driver: driver.name });
  }

  /**
   * 获取打印机统计信息
   */
  public getStats(): {
    totalPrinters: number;
    connectedPrinters: number;
    availablePrinters: number;
    queueSize: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    cancelledJobs: number;
  } {
    const printers = this.getPrinters();
    const jobs = this.queue.jobs;

    return {
      totalPrinters: printers.length,
      connectedPrinters: printers.filter(p => p.isConnected()).length,
      availablePrinters: printers.filter(p => p.isAvailable()).length,
      queueSize: jobs.length,
      processingJobs: jobs.filter(j => j.status === PrintJobStatus.PROCESSING).length,
      completedJobs: jobs.filter(j => j.status === PrintJobStatus.COMPLETED).length,
      failedJobs: jobs.filter(j => j.status === PrintJobStatus.FAILED).length,
      cancelledJobs: jobs.filter(j => j.status === PrintJobStatus.CANCELLED).length
    };
  }

  /**
   * 获取管理器配置
   */
  public getConfig(): IPrinterManagerConfig {
    return { ...this.config };
  }

  /**
   * 更新管理器配置
   */
  public updateConfig(config: Partial<IPrinterManagerConfig>): void {
    this.config = this.mergeConfig(config);
    this.emit('configUpdated', this.config);
    this.logger.info('Printer manager config updated', this.config);
  }

  /**
   * 重置管理器
   */
  public async reset(): Promise<void> {
    try {
      // 断开所有打印机
      await Promise.all(
        Array.from(this.printers.values()).map(printer =>
          this.disconnectPrinter(printer.id).catch(console.error)
        )
      );

      // 清空队列
      this.queue.jobs = [];

      // 停止队列处理
      this.stopQueueProcessing();

      // 重新启动队列处理
      this.startQueueProcessing();

      this.emit('reset');
      this.logger.info('Printer manager reset');
    } catch (error) {
      this.logger.error('Failed to reset printer manager', error);
      throw error;
    }
  }

  /**
   * 销毁管理器
   */
  public async dispose(): Promise<void> {
    try {
      // 停止队列处理
      this.stopQueueProcessing();

      // 断开所有打印机
      await Promise.all(
        Array.from(this.printers.values()).map(printer =>
          this.disconnectPrinter(printer.id).catch(console.error)
        )
      );

      // 清空打印机列表
      this.printers.clear();

      // 清空队列
      this.queue.jobs = [];

      // 移除所有监听器
      this.removeAllListeners();

      this.initialized = false;
      this.emit('disposed');
      this.logger.info('Printer manager disposed');
    } catch (error) {
      this.logger.error('Failed to dispose printer manager', error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 合并配置
   */
  private mergeConfig(config?: Partial<IPrinterManagerConfig>): IPrinterManagerConfig {
    return {
      maxQueueSize: 100,
      connectionTimeout: 10000,
      jobTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      autoReconnect: true,
      enableLogging: true,
      enableMetrics: true,
      ...config
    };
  }

  /**
   * 加载配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      // 从配置管理器加载配置
      const savedConfig = await this.configManager.get('printerManager.config');
      if (savedConfig) {
        this.config = this.mergeConfig(savedConfig);
      }
    } catch (error) {
      this.logger.warn('Failed to load printer manager configuration', error);
    }
  }

  /**
   * 设置蓝牙事件监听
   */
  private setupBluetoothEventListeners(): void {
    // 设备连接状态变化
    this.bluetoothAdapter.on('deviceConnected', (device) => {
      const printer = this.findPrinterByDeviceId(device.id);
      if (printer) {
        printer.state = PrinterState.CONNECTED;
        printer.lastConnected = new Date();
        this.emit('printerConnected', printer);
      }
    });

    this.bluetoothAdapter.on('deviceDisconnected', (device) => {
      const printer = this.findPrinterByDeviceId(device.id);
      if (printer) {
        printer.state = PrinterState.DISCONNECTED;
        printer.lastDisconnected = new Date();
        this.emit('printerDisconnected', printer);

        // 如果有正在处理的作业，标记为失败
        this.handlePrinterDisconnection(printer);
      }
    });

    // 蓝牙状态变化
    this.bluetoothAdapter.on('stateChanged', (state) => {
      this.emit('bluetoothStateChanged', state);
      this.logger.info('Bluetooth state changed', { state });
    });
  }

  /**
   * 设置打印机事件监听
   */
  private setupPrinterEventListeners(printer: IPrinter): void {
    // 打印机状态变化
    printer.on('stateChanged', (state) => {
      this.emit('printerStateChanged', { printerId: printer.id, state });
    });

    // 错误事件
    printer.on('error', (error) => {
      this.logger.error('Printer error', error, { printerId: printer.id });
      this.emit('printerError', { printerId: printer.id, error });
    });
  }

  /**
   * 启动队列处理
   */
  private startQueueProcessing(): void {
    if (this.queueTimer) {
      return;
    }

    this.queueTimer = setInterval(() => {
      this.processQueue();
    }, 1000); // 每秒处理一次队列
  }

  /**
   * 停止队列处理
   */
  private stopQueueProcessing(): void {
    if (this.queueTimer) {
      clearInterval(this.queueTimer);
      this.queueTimer = undefined;
    }
  }

  /**
   * 处理打印队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.jobs.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.queue.isProcessing = true;

    try {
      // 获取下一个待处理的作业
      const job = this.getNextJob();
      if (!job) {
        return;
      }

      // 获取打印机
      const printer = this.printers.get(job.printerId);
      if (!printer || !printer.isAvailable()) {
        return; // 打印机不可用，跳过
      }

      // 确保打印机已连接
      if (!printer.isConnected()) {
        await this.connectPrinter(job.printerId);
      }

      // 处理作业
      await this.processJob(job, printer);
    } catch (error) {
      this.logger.error('Error processing print queue', error);
    } finally {
      this.isProcessingQueue = false;
      this.queue.isProcessing = false;
    }
  }

  /**
   * 获取下一个待处理的作业
   */
  private getNextJob(): IPrintJob | undefined {
    return this.queue.jobs.find(job =>
      job.status === PrintJobStatus.PENDING ||
      job.status === PrintJobStatus.RETRY
    );
  }

  /**
   * 处理打印作业
   */
  private async processJob(job: IPrintJob, printer: IPrinter): Promise<void> {
    try {
      // 更新作业状态
      job.status = PrintJobStatus.PROCESSING;
      job.startedAt = new Date();
      job.updatedAt = new Date();

      this.emit('jobStarted', job);
      this.logger.info('Print job started', { jobId: job.id });

      // 获取驱动
      const driver = this.getDriverForType(printer.type);

      // 执行打印
      await driver.print(printer, job);

      // 更新作业状态
      job.status = PrintJobStatus.COMPLETED;
      job.completedAt = new Date();
      job.updatedAt = new Date();

      this.emit('jobCompleted', job);
      this.logger.info('Print job completed', { jobId: job.id });

      // 从队列移除已完成的作业
      const index = this.queue.jobs.findIndex(j => j.id === job.id);
      if (index !== -1) {
        this.queue.jobs.splice(index, 1);
      }
    } catch (error) {
      this.logger.error('Print job failed', error, { jobId: job.id });

      // 更新重试次数
      job.retryCount = (job.retryCount || 0) + 1;

      if (job.retryCount < this.config.retryAttempts) {
        // 重试
        job.status = PrintJobStatus.RETRY;
        job.updatedAt = new Date();

        this.emit('jobRetry', job);
        this.logger.info('Print job scheduled for retry', {
          jobId: job.id,
          retryCount: job.retryCount
        });

        // 延迟重试
        setTimeout(() => {
          // 作业会回到队列等待下次处理
        }, this.config.retryDelay);
      } else {
        // 失败
        job.status = PrintJobStatus.FAILED;
        job.failedAt = new Date();
        job.updatedAt = new Date();
        job.error = error.message;

        this.emit('jobFailed', job);
        this.logger.error('Print job failed permanently', {
          jobId: job.id,
          error: error.message,
          retryCount: job.retryCount
        });
      }
    }
  }

  /**
   * 排序队列
   */
  private sortQueue(): void {
    this.queue.jobs.sort((a, b) => {
      // 按优先级排序
      const priorityOrder = {
        [PrintJobPriority.HIGH]: 3,
        [PrintJobPriority.NORMAL]: 2,
        [PrintJobPriority.LOW]: 1
      };

      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // 相同优先级按创建时间排序
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * 处理打印机断开连接
   */
  private handlePrinterDisconnection(printer: IPrinter): void {
    // 查找该打印机的所有作业
    const affectedJobs = this.queue.jobs.filter(job =>
      job.printerId === printer.id &&
      (job.status === PrintJobStatus.PROCESSING || job.status === PrintJobStatus.PAUSED)
    );

    // 将这些作业标记为失败
    affectedJobs.forEach(job => {
      job.status = PrintJobStatus.FAILED;
      job.failedAt = new Date();
      job.updatedAt = new Date();
      job.error = 'Printer disconnected';

      this.emit('jobFailed', job);
      this.logger.warn('Print job failed due to printer disconnection', {
        jobId: job.id,
        printerId: printer.id
      });
    });
  }

  /**
   * 根据设备ID查找打印机
   */
  private findPrinterByDeviceId(deviceId: string): IPrinter | undefined {
    return Array.from(this.printers.values()).find(printer =>
      printer.deviceId === deviceId
    );
  }

  /**
   * 获取打印机类型的驱动
   */
  private getDriverForType(type: PrinterType): IPrinterDriver {
    const driver = this.drivers.get(type);
    if (!driver) {
      throw new Error(`No driver found for printer type: ${type}`);
    }
    return driver;
  }

  /**
   * 生成作业ID
   */
  private generateJobId(): string {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证打印机配置
   */
  private validatePrinter(printer: IPrinter): void {
    if (!printer.id) {
      throw new Error('Printer ID is required');
    }

    if (!printer.name) {
      throw new Error('Printer name is required');
    }

    if (!printer.deviceId) {
      throw new Error('Printer device ID is required');
    }

    if (!Object.values(PrinterType).includes(printer.type)) {
      throw new Error(`Invalid printer type: ${printer.type}`);
    }

    if (this.printers.has(printer.id)) {
      throw new Error(`Printer with ID ${printer.id} already exists`);
    }
  }

  /**
   * 验证打印作业
   */
  private validatePrintJob(job: IPrintJob): void {
    if (!job.printerId) {
      throw new Error('Printer ID is required');
    }

    if (!this.printers.has(job.printerId)) {
      throw new Error(`Printer ${job.printerId} not found`);
    }

    if (!job.data) {
      throw new Error('Print data is required');
    }

    if (!Object.values(PrintJobPriority).includes(job.priority)) {
      throw new Error(`Invalid job priority: ${job.priority}`);
    }
  }
}