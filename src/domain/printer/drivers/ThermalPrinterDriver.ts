/**
 * 热敏打印机驱动实现
 */

import { PrinterDriver } from '../PrinterDriver';
import {
  IPrinter,
  IPrintJob,
  IPrinterCommand,
  IPrintTemplate,
  PrinterType,
  IPrintJobData
} from '../types';
import { BluetoothAdapter } from '../../bluetooth/BluetoothAdapter';

/**
 * 热敏打印机驱动实现
 */
export class ThermalPrinterDriver extends PrinterDriver {
  /** 蓝牙适配器 */
  private bluetoothAdapter: BluetoothAdapter;

  /** 默认配置 */
  private readonly DEFAULT_CONFIG = {
    maxDataSize: 1024 * 1024, // 1MB
    chunkSize: 512, // 每次发送512字节
    commandDelay: 100, // 命令间延迟100ms
    connectionTimeout: 10000, // 连接超时10秒
    retryAttempts: 3,
    retryDelay: 1000,
    defaultEncoding: 'GB18030',
    defaultDPI: 203
  };

  constructor(bluetoothAdapter: BluetoothAdapter) {
    super(
      'ThermalPrinterDriver',
      '1.0.0',
      [PrinterType.THERMAL, PrinterType.POS]
    );
    this.bluetoothAdapter = bluetoothAdapter;
    this.config = { ...this.DEFAULT_CONFIG };
  }

  // 实现抽象方法

  protected async doRegisterPrinter(printer: IPrinter): Promise<void> {
    try {
      // 验证打印机是否连接
      if (!printer.isConnected()) {
        await this.bluetoothAdapter.connect(printer.deviceId, {
          timeout: this.config.connectionTimeout
        });
      }

      // 发现服务和特征值
      await this.discoverServicesAndCharacteristics(printer);

      // 发送初始化命令
      await this.initializePrinter(printer);

      this.log('Printer registered successfully', { printerId: printer.id });
    } catch (error) {
      throw new Error(`Failed to register thermal printer: ${error.message}`);
    }
  }

  protected async doUnregisterPrinter(printer: IPrinter): Promise<void> {
    try {
      // 发送复位命令
      await this.sendCommand(printer, { type: 'reset' });

      // 断开连接
      if (printer.isConnected()) {
        await this.bluetoothAdapter.disconnect(printer.deviceId);
      }

      this.log('Printer unregistered successfully', { printerId: printer.id });
    } catch (error) {
      this.handleDriverError('unregisterPrinter', error, { printerId: printer.id });
    }
  }

  protected async doPrint(printer: IPrinter, job: IPrintJob): Promise<void> {
    try {
      const data = job.data;

      // 更新作业进度
      job.updateProgress({
        percentage: 0,
        message: 'Preparing print data'
      });

      // 转换打印数据
      const commands = await this.convertDataToCommands(data, printer);

      // 更新作业进度
      job.updateProgress({
        percentage: 10,
        message: 'Sending print commands'
      });

      // 发送打印命令
      await this.sendPrintCommands(printer, commands, job);

      // 更新作业进度
      job.updateProgress({
        percentage: 90,
        message: 'Finalizing print'
      });

      // 切纸（如果支持）
      if (this.checkCapability(printer, 'cut')) {
        await this.sendCommand(printer, { type: 'cut' });
      }

      // 更新作业进度
      job.updateProgress({
        percentage: 100,
        message: 'Print completed'
      });

      this.log('Print job completed', { printerId: printer.id, jobId: job.id });
    } catch (error) {
      throw new Error(`Print failed: ${error.message}`);
    }
  }

  protected async doCancelJob(printer: IPrinter, job: IPrintJob): Promise<void> {
    try {
      // 发送取消命令
      await this.sendCommand(printer, { type: 'cancel' });

      // 发送复位命令
      await this.sendCommand(printer, { type: 'reset' });

      this.log('Print job cancelled', { printerId: printer.id, jobId: job.id });
    } catch (error) {
      this.handleDriverError('cancelJob', error, { printerId: printer.id, jobId: job.id });
    }
  }

  protected async doPauseJob(printer: IPrinter, job: IPrintJob): Promise<void> {
    // 热敏打印机通常不支持暂停功能
    // 这里只是更新作业状态，实际的暂停由上层管理
    this.log('Print job paused (driver level)', { printerId: printer.id, jobId: job.id });
  }

  protected async doResumeJob(printer: IPrinter, job: IPrintJob): Promise<void> {
    // 热敏打印机通常不支持暂停/恢复功能
    // 这里只是更新作业状态，实际的恢复由上层管理
    this.log('Print job resumed (driver level)', { printerId: printer.id, jobId: job.id });
  }

  protected async doGetPrinterStatus(printer: IPrinter): Promise<any> {
    try {
      // 发送状态查询命令
      await this.sendCommand(printer, { type: 'status' });

      // 热敏打印机通常通过特征值通知状态
      // 这里返回当前已知的状态
      return {
        state: printer.state,
        capabilities: printer.capabilities,
        properties: printer.properties
      };
    } catch (error) {
      this.handleDriverError('getPrinterStatus', error, { printerId: printer.id });
      throw error;
    }
  }

  protected async doResetPrinter(printer: IPrinter): Promise<void> {
    try {
      // 发送复位命令
      await this.sendCommand(printer, { type: 'reset' });

      // 重新初始化
      await this.initializePrinter(printer);

      this.log('Printer reset successfully', { printerId: printer.id });
    } catch (error) {
      throw new Error(`Failed to reset printer: ${error.message}`);
    }
  }

  protected async doExecuteCommand(printer: IPrinter, command: IPrinterCommand): Promise<any> {
    try {
      return await this.sendCommand(printer, command);
    } catch (error) {
      this.handleDriverError('executeCommand', error, { printerId: printer.id, command });
      throw error;
    }
  }

  protected async doRenderTemplate(template: IPrintTemplate, data: any): Promise<ArrayBuffer> {
    try {
      // 根据模板类型渲染数据
      switch (template.type) {
        case 'receipt':
          return await this.renderReceiptTemplate(template, data);
        case 'label':
          return await this.renderLabelTemplate(template, data);
        case 'text':
          return await this.renderTextTemplate(template, data);
        default:
          throw new Error(`Unsupported template type: ${template.type}`);
      }
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  // 私有方法

  /**
   * 发现服务和特征值
   */
  private async discoverServicesAndCharacteristics(printer: IPrinter): Promise<void> {
    try {
      // 发现服务
      const services = await this.bluetoothAdapter.discoverServices(printer.deviceId);

      // 查找打印服务（通常是0x18F0）
      const printService = services.find(service =>
        service.includes('18F0') ||
        service.toLowerCase().includes('print')
      );

      if (!printService) {
        throw new Error('Print service not found');
      }

      // 发现特征值
      const characteristics = await this.bluetoothAdapter.discoverCharacteristics(
        printer.deviceId,
        printService
      );

      // 查找写入特征值
      const writeCharacteristic = characteristics.find(char =>
        char.properties.write || char.properties.writeWithoutResponse
      );

      if (!writeCharacteristic) {
        throw new Error('Write characteristic not found');
      }

      // 查找通知特征值（用于状态反馈）
      const notifyCharacteristic = characteristics.find(char => char.properties.notify);

      // 存储特征值信息
      this.setPrinterProperty(printer, 'serviceId', printService);
      this.setPrinterProperty(printer, 'writeCharacteristicId', writeCharacteristic.id);
      if (notifyCharacteristic) {
        this.setPrinterProperty(printer, 'notifyCharacteristicId', notifyCharacteristic.id);

        // 订阅状态通知
        await this.bluetoothAdapter.subscribeCharacteristic(
          printer.deviceId,
          printService,
          notifyCharacteristic.id
        );
      }

      this.log('Services and characteristics discovered', {
        printerId: printer.id,
        serviceId: printService,
        writeCharacteristic: writeCharacteristic.id
      });
    } catch (error) {
      throw new Error(`Failed to discover services: ${error.message}`);
    }
  }

  /**
   * 初始化打印机
   */
  private async initializePrinter(printer: IPrinter): Promise<void> {
    try {
      // 发送初始化命令序列
      const initCommands = [
        { type: 'init' },
        { type: 'align', value: 'left' },
        { type: 'fontSize', value: 'normal' },
        { type: 'textDensity', value: 'normal' }
      ];

      for (const command of initCommands) {
        await this.sendCommand(printer, command);
        await this.delay(this.config.commandDelay);
      }

      this.log('Printer initialized', { printerId: printer.id });
    } catch (error) {
      throw new Error(`Failed to initialize printer: ${error.message}`);
    }
  }

  /**
   * 发送命令
   */
  private async sendCommand(printer: IPrinter, command: IPrinterCommand): Promise<any> {
    try {
      const commandData = this.encodeCommand(command);

      const serviceId = this.getPrinterProperty(printer, 'serviceId');
      const characteristicId = this.getPrinterProperty(printer, 'writeCharacteristicId');

      if (!serviceId || !characteristicId) {
        throw new Error('Printer services not discovered');
      }

      // 分块发送数据
      await this.sendDataInChunks(
        commandData,
        this.config.chunkSize,
        async (chunk, index, total) => {
          await this.bluetoothAdapter.writeCharacteristic(
            printer.deviceId,
            serviceId,
            characteristicId,
            chunk
          );
        }
      );

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to send command: ${error.message}`);
    }
  }

  /**
   * 编码命令
   */
  private encodeCommand(command: IPrinterCommand): ArrayBuffer {
    const commands: string[] = [];

    switch (command.type) {
      case 'init':
        commands.push('\x1B@'); // ESC @ - 初始化
        break;

      case 'reset':
        commands.push('\x1B\x40'); // ESC @ - 复位
        break;

      case 'text':
        const text = command.value || '';
        commands.push(text);
        break;

      case 'lineFeed':
        commands.push('\x0A'); // LF - 换行
        break;

      case 'carriageReturn':
        commands.push('\x0D'); // CR - 回车
        break;

      case 'align':
        const align = command.value || 'left';
        switch (align) {
          case 'left':
            commands.push('\x1B\x61\x00'); // ESC a 0 - 左对齐
            break;
          case 'center':
            commands.push('\x1B\x61\x01'); // ESC a 1 - 居中对齐
            break;
          case 'right':
            commands.push('\x1B\x61\x02'); // ESC a 2 - 右对齐
            break;
        }
        break;

      case 'fontSize':
        const size = command.value || 'normal';
        switch (size) {
          case 'small':
            commands.push('\x1D\x21\x01'); // GS ! 1 - 小字体
            break;
          case 'normal':
            commands.push('\x1D\x21\x00'); // GS ! 0 - 正常字体
            break;
          case 'large':
            commands.push('\x1D\x21\x11'); // GS ! 17 - 大字体
            break;
        }
        break;

      case 'bold':
        const enable = command.value !== false;
        if (enable) {
          commands.push('\x1B\x45\x01'); // ESC E 1 - 加粗开
        } else {
          commands.push('\x1B\x45\x00'); // ESC E 0 - 加粗关
        }
        break;

      case 'underline':
        const underline = command.value !== false;
        if (underline) {
          commands.push('\x1B\x2D\x01'); // ESC - 1 - 下划线开
        } else {
          commands.push('\x1B\x2D\x00'); // ESC - 0 - 下划线关
        }
        break;

      case 'invert':
        const invert = command.value !== false;
        if (invert) {
          commands.push('\x1D\x42\x01'); // GS B 1 - 反白开
        } else {
          commands.push('\x1D\x42\x00'); // GS B 0 - 反白关
        }
        break;

      case 'cut':
        commands.push('\x1D\x56\x00'); // GS V 0 - 全切纸
        break;

      case 'partialCut':
        commands.push('\x1D\x56\x01'); // GS V 1 - 部分切纸
        break;

      case 'feed':
        const lines = command.value || 1;
        commands.push('\x1B\x64' + String.fromCharCode(lines)); // ESC d n - 进纸n行
        break;

      case 'status':
        commands.push('\x1B\x76'); // ESC v - 状态查询
        break;

      case 'cancel':
        commands.push('\x1B\x40'); // ESC @ - 取消当前操作
        break;

      case 'barcode':
        const barcodeData = command.data;
        if (barcodeData) {
          commands.push('\x1B\x6B'); // ESC k - 条码开始
          commands.push(String.fromCharCode(barcodeData.length));
          commands.push(barcodeData.data);
        }
        break;

      case 'qrCode':
        const qrData = command.data;
        if (qrData) {
          commands.push('\x1D\x28\x6B\x04\x00\x31\x41\x32\x00'); // GS ( k 4 0 31 41 32 00 - QR码开始
          commands.push(String.fromCharCode(qrData.data.length));
          commands.push(qrData.data);
          commands.push('\x1D\x28\x6B\x03\x00\x31\x51\x30'); // GS ( k 3 0 31 51 30 - QR码结束
        }
        break;

      case 'image':
        const imageData = command.data;
        if (imageData) {
          // 简化的图像打印命令
          commands.push('\x1D\x76\x30\x00'); // GS v 0 0 - 位图模式
          commands.push('\x1D\x4C'); // GS L - 设置位图尺寸
          // 这里应该包含实际的图像数据编码
        }
        break;

      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }

    return this.createCommandBuffer(commands);
  }

  /**
   * 转换数据为命令
   */
  private async convertDataToCommands(data: IPrintJobData, printer: IPrinter): Promise<IPrinterCommand[]> {
    const commands: IPrinterCommand[] = [];

    switch (data.type) {
      case 'text':
        commands.push(...await this.convertTextData(data.content as string));
        break;

      case 'template':
        const templateData = data.content as { template: IPrintTemplate; data: any };
        const renderedData = await this.renderTemplate(templateData.template, templateData.data);
        commands.push({ type: 'text', value: renderedData });
        break;

      case 'raw':
        commands.push(...await this.convertRawData(data.content));
        break;

      case 'commands':
        commands.push(...(data.content as IPrinterCommand[]));
        break;

      default:
        throw new Error(`Unsupported data type: ${data.type}`);
    }

    return commands;
  }

  /**
   * 转换文本数据
   */
  private async convertTextData(text: string): Promise<IPrinterCommand[]> {
    const commands: IPrinterCommand[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim()) {
        commands.push({ type: 'text', value: line });
      }
      commands.push({ type: 'lineFeed' });
    }

    return commands;
  }

  /**
   * 转换原始数据
   */
  private async convertRawData(content: any): Promise<IPrinterCommand[]> {
    if (typeof content === 'string') {
      return this.convertTextData(content);
    } else if (Array.isArray(content)) {
      const commands: IPrinterCommand[] = [];
      for (const item of content) {
        commands.push(...await this.convertRawData(item));
      }
      return commands;
    } else {
      throw new Error('Invalid raw data format');
    }
  }

  /**
   * 发送打印命令
   */
  private async sendPrintCommands(
    printer: IPrinter,
    commands: IPrinterCommand[],
    job: IPrintJob
  ): Promise<void> {
    const totalCommands = commands.length;

    for (let i = 0; i < totalCommands; i++) {
      const command = commands[i];

      // 更新进度
      const progress = 10 + (80 * (i + 1) / totalCommands);
      job.updateProgress({
        percentage: Math.round(progress),
        message: `Processing command ${i + 1}/${totalCommands}`
      });

      // 发送命令
      await this.sendCommand(printer, command);

      // 命令间延迟
      if (i < totalCommands - 1) {
        await this.delay(this.config.commandDelay);
      }
    }
  }

  /**
   * 渲染收据模板
   */
  private async renderReceiptTemplate(template: IPrintTemplate, data: any): Promise<ArrayBuffer> {
    const lines: string[] = [];

    // 渲染模板内容
    for (const element of template.content || []) {
      const renderedLine = this.renderTemplateElement(element, data);
      if (renderedLine) {
        lines.push(renderedLine);
      }
    }

    return new TextEncoder().encode(lines.join('\n')).buffer;
  }

  /**
   * 渲染标签模板
   */
  private async renderLabelTemplate(template: IPrintTemplate, data: any): Promise<ArrayBuffer> {
    // 标签模板的渲染逻辑
    return this.renderReceiptTemplate(template, data);
  }

  /**
   * 渲染文本模板
   */
  private async renderTextTemplate(template: IPrintTemplate, data: any): Promise<ArrayBuffer> {
    const text = template.content || '';
    return new TextEncoder().encode(text).buffer;
  }

  /**
   * 渲染模板元素
   */
  private renderTemplateElement(element: any, data: any): string {
    if (typeof element === 'string') {
      return this.interpolateTemplate(element, data);
    }

    switch (element.type) {
      case 'text':
        return this.interpolateTemplate(element.content, data);

      case 'line':
        return '-'.repeat(element.length || 32);

      case 'space':
        return ' '.repeat(element.count || 1);

      case 'variable':
        return data[element.name] || '';

      case 'condition':
        if (data[element.condition]) {
          return this.renderTemplateElement(element.content, data);
        }
        return '';

      case 'loop':
        const items = data[element.array] || [];
        const lines: string[] = [];
        for (const item of items) {
          const line = this.renderTemplateElement(element.content, { ...data, item });
          if (line) {
            lines.push(line);
          }
        }
        return lines.join('\n');

      default:
        return '';
    }
  }

  /**
   * 插值模板变量
   */
  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}