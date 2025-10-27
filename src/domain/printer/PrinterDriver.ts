/**
 * 打印机驱动抽象基类
 */

import {
  IPrinterDriver,
  IPrinter,
  IPrintJob,
  IPrinterCommand,
  IPrintTemplate,
  PrinterType
} from './types';
import { EventEmitter } from 'events';

/**
 * 打印机驱动抽象基类
 */
export abstract class PrinterDriver extends EventEmitter implements IPrinterDriver {
  /** 驱动名称 */
  public readonly name: string;

  /** 驱动版本 */
  public readonly version: string;

  /** 支持的打印机类型 */
  public readonly supportedTypes: PrinterType[];

  /** 已注册的打印机 */
  protected printers: Map<string, IPrinter> = new Map();

  /** 驱动配置 */
  protected config: Record<string, any>;

  constructor(
    name: string,
    version: string = '1.0.0',
    supportedTypes: PrinterType[]
  ) {
    super();
    this.name = name;
    this.version = version;
    this.supportedTypes = supportedTypes;
    this.config = {};
  }

  /**
   * 注册打印机
   */
  public async registerPrinter(printer: IPrinter): Promise<void> {
    if (!this.supportsType(printer.type)) {
      throw new Error(`Printer type ${printer.type} not supported by driver ${this.name}`);
    }

    if (this.printers.has(printer.id)) {
      throw new Error(`Printer ${printer.id} already registered`);
    }

    try {
      await this.doRegisterPrinter(printer);
      this.printers.set(printer.id, printer);
      this.emit('printerRegistered', printer);
    } catch (error) {
      this.emit('error', { operation: 'registerPrinter', printerId: printer.id, error });
      throw error;
    }
  }

  /**
   * 注销打印机
   */
  public async unregisterPrinter(printerId: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not registered`);
    }

    try {
      await this.doUnregisterPrinter(printer);
      this.printers.delete(printerId);
      this.emit('printerUnregistered', printer);
    } catch (error) {
      this.emit('error', { operation: 'unregisterPrinter', printerId, error });
      throw error;
    }
  }

  /**
   * 执行打印
   */
  public async print(printer: IPrinter, job: IPrintJob): Promise<void> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      this.emit('printStart', { printer, job });

      // 预处理
      await this.preprocess(printer, job);

      // 执行打印
      await this.doPrint(printer, job);

      // 后处理
      await this.postprocess(printer, job);

      this.emit('printComplete', { printer, job });
    } catch (error) {
      this.emit('printError', { printer, job, error });
      throw error;
    }
  }

  /**
   * 取消打印作业
   */
  public async cancelJob(printer: IPrinter, job: IPrintJob): Promise<void> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      await this.doCancelJob(printer, job);
      this.emit('jobCancelled', { printer, job });
    } catch (error) {
      this.emit('error', { operation: 'cancelJob', printerId: printer.id, jobId: job.id, error });
      throw error;
    }
  }

  /**
   * 暂停打印作业
   */
  public async pauseJob(printer: IPrinter, job: IPrintJob): Promise<void> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      await this.doPauseJob(printer, job);
      this.emit('jobPaused', { printer, job });
    } catch (error) {
      this.emit('error', { operation: 'pauseJob', printerId: printer.id, jobId: job.id, error });
      throw error;
    }
  }

  /**
   * 恢复打印作业
   */
  public async resumeJob(printer: IPrinter, job: IPrintJob): Promise<void> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      await this.doResumeJob(printer, job);
      this.emit('jobResumed', { printer, job });
    } catch (error) {
      this.emit('error', { operation: 'resumeJob', printerId: printer.id, jobId: job.id, error });
      throw error;
    }
  }

  /**
   * 获取打印机状态
   */
  public async getPrinterStatus(printer: IPrinter): Promise<any> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      return await this.doGetPrinterStatus(printer);
    } catch (error) {
      this.emit('error', { operation: 'getPrinterStatus', printerId: printer.id, error });
      throw error;
    }
  }

  /**
   * 重置打印机
   */
  public async resetPrinter(printer: IPrinter): Promise<void> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      await this.doResetPrinter(printer);
      this.emit('printerReset', { printer });
    } catch (error) {
      this.emit('error', { operation: 'resetPrinter', printerId: printer.id, error });
      throw error;
    }
  }

  /**
   * 执行打印机命令
   */
  public async executeCommand(printer: IPrinter, command: IPrinterCommand): Promise<any> {
    const registeredPrinter = this.printers.get(printer.id);
    if (!registeredPrinter) {
      throw new Error(`Printer ${printer.id} not registered`);
    }

    try {
      this.emit('commandStart', { printer, command });

      const result = await this.doExecuteCommand(printer, command);

      this.emit('commandComplete', { printer, command, result });
      return result;
    } catch (error) {
      this.emit('commandError', { printer, command, error });
      throw error;
    }
  }

  /**
   * 渲染模板
   */
  public async renderTemplate(template: IPrintTemplate, data: any): Promise<ArrayBuffer> {
    try {
      this.emit('templateRenderStart', { template, data });

      const result = await this.doRenderTemplate(template, data);

      this.emit('templateRenderComplete', { template, data, result });
      return result;
    } catch (error) {
      this.emit('templateRenderError', { template, data, error });
      throw error;
    }
  }

  /**
   * 检查打印机类型是否支持
   */
  public supportsType(type: PrinterType): boolean {
    return this.supportedTypes.includes(type);
  }

  /**
   * 获取驱动信息
   */
  public getInfo(): {
    name: string;
    version: string;
    supportedTypes: PrinterType[];
    registeredPrintersCount: number;
    config: Record<string, any>;
  } {
    return {
      name: this.name,
      version: this.version,
      supportedTypes: [...this.supportedTypes],
      registeredPrintersCount: this.printers.size,
      config: { ...this.config }
    };
  }

  /**
   * 更新驱动配置
   */
  public updateConfig(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * 获取已注册的打印机列表
   */
  public getRegisteredPrinters(): IPrinter[] {
    return Array.from(this.printers.values());
  }

  /**
   * 销毁驱动
   */
  public async dispose(): Promise<void> {
    try {
      // 注销所有打印机
      const printerIds = Array.from(this.printers.keys());
      await Promise.all(
        printerIds.map(id => this.unregisterPrinter(id).catch(console.error))
      );

      this.removeAllListeners();
      this.emit('disposed');
    } catch (error) {
      this.emit('error', { operation: 'dispose', error });
      throw error;
    }
  }

  // 抽象方法 - 子类必须实现

  protected abstract doRegisterPrinter(printer: IPrinter): Promise<void>;
  protected abstract doUnregisterPrinter(printer: IPrinter): Promise<void>;
  protected abstract doPrint(printer: IPrinter, job: IPrintJob): Promise<void>;
  protected abstract doCancelJob(printer: IPrinter, job: IPrintJob): Promise<void>;
  protected abstract doPauseJob(printer: IPrinter, job: IPrintJob): Promise<void>;
  protected abstract doResumeJob(printer: IPrinter, job: IPrintJob): Promise<void>;
  protected abstract doGetPrinterStatus(printer: IPrinter): Promise<any>;
  protected abstract doResetPrinter(printer: IPrinter): Promise<void>;
  protected abstract doExecuteCommand(printer: IPrinter, command: IPrinterCommand): Promise<any>;
  protected abstract doRenderTemplate(template: IPrintTemplate, data: any): Promise<ArrayBuffer>;

  // 受保护的辅助方法

  /**
   * 预处理打印数据
   */
  protected async preprocess(printer: IPrinter, job: IPrintJob): Promise<void> {
    // 默认实现，子类可以重写
    this.emit('preprocessStart', { printer, job });

    // 验证作业数据
    this.validateJobData(printer, job);

    this.emit('preprocessComplete', { printer, job });
  }

  /**
   * 后处理打印结果
   */
  protected async postprocess(printer: IPrinter, job: IPrintJob): Promise<void> {
    // 默认实现，子类可以重写
    this.emit('postprocessStart', { printer, job });

    // 更新打印机统计
    if (printer.updateStatistics) {
      printer.updateStatistics({
        lastPrintTime: new Date(),
        totalPrintCount: printer.totalPrintCount + 1
      });
    }

    this.emit('postprocessComplete', { printer, job });
  }

  /**
   * 验证作业数据
   */
  protected validateJobData(printer: IPrinter, job: IPrintJob): void {
    if (!job.data) {
      throw new Error('Job data is required');
    }

    // 验证数据大小
    const maxSize = this.config.maxDataSize || 1024 * 1024; // 默认1MB
    const dataSize = this.getDataSize(job.data);
    if (dataSize > maxSize) {
      throw new Error(`Job data size ${dataSize} exceeds maximum ${maxSize}`);
    }
  }

  /**
   * 获取数据大小
   */
  protected getDataSize(data: any): number {
    if (typeof data === 'string') {
      return new Blob([data]).size;
    } else if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (Array.isArray(data)) {
      return data.reduce((total, item) => total + this.getDataSize(item), 0);
    } else if (typeof data === 'object' && data !== null) {
      return new Blob([JSON.stringify(data)]).size;
    }
    return 0;
  }

  /**
   * 创建命令数据
   */
  protected createCommandBuffer(commands: any[]): ArrayBuffer {
    const commandString = commands.join('\n');
    return new TextEncoder().encode(commandString).buffer;
  }

  /**
   * 分块发送数据
   */
  protected async sendDataInChunks(
    data: ArrayBuffer,
    chunkSize: number,
    sendChunk: (chunk: ArrayBuffer, index: number, total: number) => Promise<void>
  ): Promise<void> {
    const totalChunks = Math.ceil(data.byteLength / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.byteLength);
      const chunk = data.slice(start, end);

      await sendChunk(chunk, i, totalChunks);

      // 发送进度事件
      this.emit('dataProgress', {
        chunkIndex: i,
        totalChunks,
        progress: ((i + 1) / totalChunks) * 100
      });
    }
  }

  /**
   * 等待指定时间
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试操作
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.emit('retryAttempt', { attempt, maxAttempts, error });

        if (attempt < maxAttempts) {
          await this.delay(delayMs * attempt); // 递增延迟
        }
      }
    }

    throw lastError!;
  }

  /**
   * 处理驱动错误
   */
  protected handleDriverError(operation: string, error: any, context?: any): void {
    this.emit('error', {
      driver: this.name,
      operation,
      error,
      context,
      timestamp: new Date()
    });
  }

  /**
   * 记录驱动日志
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data);
    this.emit('log', { message, data, timestamp: new Date() });
  }

  /**
   * 格式化字节数组
   */
  protected formatBytes(bytes: ArrayBuffer, format: 'hex' | 'base64' | 'utf8' = 'hex'): string {
    switch (format) {
      case 'hex':
        return Array.from(new Uint8Array(bytes))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      case 'base64':
        return btoa(String.fromCharCode(...new Uint8Array(bytes)));
      case 'utf8':
        return new TextDecoder().decode(bytes);
      default:
        return '';
    }
  }

  /**
   * 检查打印机能力
   */
  protected checkCapability(printer: IPrinter, capability: string): boolean {
    return printer.capabilities.features?.includes(capability) || false;
  }

  /**
   * 获取打印机属性
   */
  protected getPrinterProperty<T>(printer: IPrinter, key: string, defaultValue?: T): T {
    return printer.properties[key] ?? defaultValue;
  }

  /**
   * 设置打印机属性
   */
  protected setPrinterProperty(printer: IPrinter, key: string, value: any): void {
    printer.setProperty(key, value);
  }
}