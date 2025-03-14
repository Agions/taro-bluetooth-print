import { BluetoothManager } from '../bluetooth';
import { Commands } from './commands';
import { textToBuffer } from '../utils/encoding';
import { PrinterImage } from './image';
import { logger } from '../utils/logger';
import { templateManager } from './templates';
import { PrintTemplate } from './templates';
import { eventManager, EVENTS } from '../utils/events';
import { PrinterError, ErrorCode } from '../types';

export interface PrintOptions {
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  doubleHeight?: boolean;
  doubleWidth?: boolean;
  underline?: boolean;
  cut?: boolean;
  feed?: number; // 打印后走纸行数
}

export interface QRCodeOptions {
  size?: number; // 1-16，默认6
  errorCorrection?: number; // 48-51 (L,M,Q,H)，默认48
  align?: 'left' | 'center' | 'right';
}

export interface BarcodeOptions {
  type?: number; // 条码类型，默认73 (CODE128)
  height?: number; // 条码高度，默认80
  width?: number; // 条码宽度，默认2
  align?: 'left' | 'center' | 'right';
  position?: 'none' | 'above' | 'below' | 'both'; // 文本位置
}

export interface ImageOptions {
  maxWidth?: number; // 最大宽度，默认384
  threshold?: number; // 灰度阈值，默认128
  dithering?: boolean; // 是否使用抖动算法，默认true
  align?: 'left' | 'center' | 'right';
}

export class PrinterManager {
  private bluetooth: BluetoothManager;
  private lastError: Error | null = null;
  
  constructor(bluetooth: BluetoothManager) {
    this.bluetooth = bluetooth;
  }
  
  /**
   * 获取最后一次错误
   */
  getLastError(): Error | null {
    return this.lastError;
  }
  
  /**
   * 发送打印命令
   * @param commands 命令数组
   * @param options 发送选项
   */
  async sendCommands(
    commands: Uint8Array[], 
    options: { 
      retries?: number,   // 重试次数
      chunkSize?: number, // 数据块大小
      interval?: number   // 命令间隔(ms)
    } = {}
  ): Promise<boolean> {
    this.lastError = null;

    // 默认选项
    const { 
      retries = 1, 
      chunkSize = 512,  // 大部分打印机支持的安全值
      interval = 20     // 命令之间的间隔时间(ms)
    } = options;
    
    try {
      // 将命令合并为较大的块以减少蓝牙传输次数
      const chunks: ArrayBuffer[] = [];
      let currentChunk = new Uint8Array(0);
      
      // 处理每个命令，将它们合并成适当大小的块
      for (const command of commands) {
        // 如果当前块加上新命令会超过块大小，则添加当前块到chunks
        if (currentChunk.length + command.length > chunkSize) {
          chunks.push(currentChunk.buffer);
          currentChunk = new Uint8Array(0);
        }
        
        // 将当前命令添加到当前块
        const newChunk = new Uint8Array(currentChunk.length + command.length);
        newChunk.set(currentChunk, 0);
        newChunk.set(command, currentChunk.length);
        currentChunk = newChunk;
      }
      
      // 添加最后一个块（如果非空）
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.buffer);
      }
      
      // 发送每个块
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let success = false;
        let lastError: Error | null = null;
        
        // 重试逻辑
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const result = await this.bluetooth.writeData(chunk);
            if (result) {
              success = true;
              break;
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            logger.warn(`发送命令块 ${i+1}/${chunks.length} 失败 (尝试 ${attempt+1}/${retries+1})`, error);
            
            // 最后一次重试前暂停
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
          }
        }
        
        // 如果块发送失败
        if (!success) {
          this.lastError = lastError || new Error(`发送命令块 ${i+1}/${chunks.length} 失败`);
          logger.error('发送命令失败', this.lastError);
          return false;
        }
        
        // 添加块之间的间隔
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('发送命令失败', error);
      return false;
    }
  }
  
  /**
   * 打印文本
   * @param text 文本内容
   * @param options 打印选项
   */
  async printText(text: string, options: PrintOptions = {}): Promise<boolean> {
    try {
      const commands: Uint8Array[] = [Commands.INIT];
      
      // 对齐方式
      if (options.align === 'center') {
        commands.push(Commands.ALIGN_CENTER);
      } else if (options.align === 'right') {
        commands.push(Commands.ALIGN_RIGHT);
      } else {
        commands.push(Commands.ALIGN_LEFT);
      }
      
      // 字体样式
      if (options.bold) {
        commands.push(Commands.BOLD_ON);
      }
      
      if (options.underline) {
        commands.push(Commands.UNDERLINE_ON);
      }
      
      // 字体大小
      if (options.doubleHeight && options.doubleWidth) {
        commands.push(Commands.TEXT_LARGE);
      } else if (options.doubleHeight) {
        commands.push(Commands.TEXT_MEDIUM);
      } else {
        commands.push(Commands.TEXT_NORMAL);
      }
      
      // 打印文本
      commands.push(textToBuffer(text));
      
      // 走纸
      const feed = options.feed !== undefined ? options.feed : 2;
      for (let i = 0; i < feed; i++) {
        commands.push(Commands.LF);
      }
      
      // 切纸
      if (options.cut !== false) {
        commands.push(Commands.CUT);
      }
      
      return await this.sendCommands(commands);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('打印文本失败', error);
      return false;
    }
  }
  
  /**
   * 打印图片
   * @param imageUrlOrBase64 图片URL或Base64字符串
   * @param options 图片打印选项
   */
  async printImage(imageUrlOrBase64: string, options: ImageOptions = {}): Promise<boolean> {
    try {
      const commands: Uint8Array[] = [Commands.INIT];
      
      // 对齐方式
      if (options.align === 'center') {
        commands.push(Commands.ALIGN_CENTER);
      } else if (options.align === 'right') {
        commands.push(Commands.ALIGN_RIGHT);
      } else {
        commands.push(Commands.ALIGN_LEFT);
      }
      
      // 处理图片数据
      let imageCommands: Uint8Array;
      
      if (imageUrlOrBase64.startsWith('data:')) {
        // Base64图片
        imageCommands = await PrinterImage.processBase64Image(imageUrlOrBase64, {
          maxWidth: options.maxWidth,
          threshold: options.threshold,
          dithering: options.dithering
        });
      } else {
        // URL图片
        imageCommands = await PrinterImage.processImage(imageUrlOrBase64, {
          maxWidth: options.maxWidth,
          threshold: options.threshold,
          dithering: options.dithering
        });
      }
      
      commands.push(imageCommands);
      commands.push(Commands.LF);
      commands.push(Commands.CUT);
      
      return await this.sendCommands(commands);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('打印图片失败', error);
      return false;
    }
  }
  
  /**
   * 打印条形码
   * @param content 条码内容
   * @param options 条码选项
   */
  async printBarcode(content: string, options: BarcodeOptions = {}): Promise<boolean> {
    try {
      const type = options.type || 73; // 默认CODE128
      const height = options.height || 80;
      
      const commands: Uint8Array[] = [Commands.INIT];
      
      // 对齐方式
      if (options.align === 'center') {
        commands.push(Commands.ALIGN_CENTER);
      } else if (options.align === 'right') {
        commands.push(Commands.ALIGN_RIGHT);
      } else {
        commands.push(Commands.ALIGN_LEFT);
      }
      
      // 设置条码高度
      commands.push(Commands.setBarcodeHeight(height));
      
      // 打印条码
      commands.push(Commands.printBarcode(content, type));
      commands.push(Commands.LF);
      commands.push(Commands.LF);
      commands.push(Commands.CUT);
      
      return await this.sendCommands(commands);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('打印条形码失败', error);
      return false;
    }
  }
  
  /**
   * 打印二维码
   * @param content 二维码内容
   * @param options 二维码选项
   */
  async printQRCode(content: string, options: QRCodeOptions = {}): Promise<boolean> {
    try {
      const size = options.size || 6;
      
      const commands: Uint8Array[] = [Commands.INIT];
      
      // 对齐方式
      if (options.align === 'center') {
        commands.push(Commands.ALIGN_CENTER);
      } else if (options.align === 'right') {
        commands.push(Commands.ALIGN_RIGHT);
      } else {
        commands.push(Commands.ALIGN_LEFT);
      }
      
      // 添加二维码命令
      commands.push(...Commands.printQRCode(content, size));
      commands.push(Commands.LF);
      commands.push(Commands.LF);
      commands.push(Commands.CUT);
      
      return await this.sendCommands(commands);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('打印二维码失败', error);
      return false;
    }
  }
  
  /**
   * 打印收据
   * @param data 收据数据
   */
  async printReceipt(data: {
    title: string;
    merchant: string;
    items: Array<{name: string; price: number; quantity: number}>;
    total: number;
    date: string;
    footer?: string;
    logo?: string; // 可选的徽标图片URL或Base64
  }): Promise<boolean> {
    try {
      const commands: Uint8Array[] = [Commands.INIT];
      
      // 打印徽标（如果有）
      if (data.logo) {
        try {
          const logoImage = await PrinterImage.processImage(data.logo, {
            maxWidth: 300,
            dithering: true
          });
          commands.push(Commands.ALIGN_CENTER);
          commands.push(logoImage);
          commands.push(Commands.LF);
        } catch (error) {
          logger.warn('徽标打印失败，继续打印收据', error);
        }
      }
      
      // 标题和商户信息
      commands.push(Commands.ALIGN_CENTER);
      commands.push(Commands.TEXT_LARGE);
      commands.push(textToBuffer(data.title));
      commands.push(Commands.LF);
      commands.push(Commands.TEXT_NORMAL);
      commands.push(textToBuffer(data.merchant));
      commands.push(Commands.LF);
      commands.push(textToBuffer('--------------------------------'));
      commands.push(Commands.LF);
      
      // 商品明细
      commands.push(Commands.ALIGN_LEFT);
      const headers = "商品名称              数量  单价    金额";
      commands.push(textToBuffer(headers));
      commands.push(Commands.LF);
      
      for (const item of data.items) {
        const price = item.price.toFixed(2);
        const amount = (item.price * item.quantity).toFixed(2);
        // 格式化商品行，确保对齐
        let line = item.name.padEnd(20, ' ');
        line += String(item.quantity).padStart(5, ' ');
        line += price.padStart(7, ' ');
        line += amount.padStart(8, ' ');
        
        commands.push(textToBuffer(line));
        commands.push(Commands.LF);
      }
      
      // 分隔线和总计
      commands.push(textToBuffer('--------------------------------'));
      commands.push(Commands.LF);
      commands.push(Commands.ALIGN_RIGHT);
      commands.push(Commands.BOLD_ON);
      commands.push(textToBuffer(`总计: ${data.total.toFixed(2)}元`));
      commands.push(Commands.BOLD_OFF);
      commands.push(Commands.LF);
      
      // 日期和页脚
      commands.push(Commands.ALIGN_CENTER);
      commands.push(textToBuffer(data.date));
      commands.push(Commands.LF);
      
      if (data.footer) {
        commands.push(Commands.LF);
        commands.push(textToBuffer(data.footer));
        commands.push(Commands.LF);
      }
      
      commands.push(Commands.LF);
      commands.push(Commands.CUT);
      
      return await this.sendCommands(commands);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('打印收据失败', error);
      return false;
    }
  }
  
  /**
   * 打印测试页
   */
  async printTestPage(): Promise<boolean> {
    try {
      const commands: Uint8Array[] = [Commands.INIT];
      
      // 标题
      commands.push(Commands.ALIGN_CENTER);
      commands.push(Commands.TEXT_LARGE);
      commands.push(textToBuffer('打印测试页'));
      commands.push(Commands.LF);
      commands.push(Commands.TEXT_NORMAL);
      commands.push(textToBuffer('Taro蓝牙打印库'));
      commands.push(Commands.LF);
      commands.push(textToBuffer('--------------------------------'));
      commands.push(Commands.LF);
      
      // 文本样式测试
      commands.push(Commands.ALIGN_LEFT);
      commands.push(textToBuffer('【文本样式测试】'));
      commands.push(Commands.LF);
      
      commands.push(textToBuffer('标准文本'));
      commands.push(Commands.LF);
      
      commands.push(Commands.BOLD_ON);
      commands.push(textToBuffer('粗体文本'));
      commands.push(Commands.BOLD_OFF);
      commands.push(Commands.LF);
      
      commands.push(Commands.UNDERLINE_ON);
      commands.push(textToBuffer('下划线文本'));
      commands.push(Commands.UNDERLINE_OFF);
      commands.push(Commands.LF);
      
      commands.push(Commands.TEXT_LARGE);
      commands.push(textToBuffer('大号文本'));
      commands.push(Commands.TEXT_NORMAL);
      commands.push(Commands.LF);
      
      // 对齐方式测试
      commands.push(textToBuffer('【对齐方式测试】'));
      commands.push(Commands.LF);
      
      commands.push(Commands.ALIGN_LEFT);
      commands.push(textToBuffer('左对齐文本'));
      commands.push(Commands.LF);
      
      commands.push(Commands.ALIGN_CENTER);
      commands.push(textToBuffer('居中对齐文本'));
      commands.push(Commands.LF);
      
      commands.push(Commands.ALIGN_RIGHT);
      commands.push(textToBuffer('右对齐文本'));
      commands.push(Commands.LF);
      
      // 条码测试
      commands.push(Commands.ALIGN_CENTER);
      commands.push(textToBuffer('【条码测试】'));
      commands.push(Commands.LF);
      
      commands.push(Commands.setBarcodeHeight(60));
      commands.push(Commands.printBarcode('12345678', 73));
      commands.push(Commands.LF);
      
      // 二维码测试
      commands.push(textToBuffer('【二维码测试】'));
      commands.push(Commands.LF);
      
      const qrCommands = Commands.printQRCode('https://github.com/yourusername/taro-bluetooth-print');
      commands.push(...qrCommands);
      commands.push(Commands.LF);
      
      // 结束
      commands.push(textToBuffer('--------------------------------'));
      commands.push(Commands.LF);
      commands.push(textToBuffer('测试完成'));
      commands.push(Commands.LF);
      commands.push(Commands.LF);
      commands.push(Commands.CUT);
      
      return await this.sendCommands(commands);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('打印测试页失败', error);
      return false;
    }
  }

  /**
   * 使用模板打印
   * @param templateName 模板名称
   * @param data 模板数据
   */
  async printWithTemplate<T>(templateName: string, data: T): Promise<boolean> {
    try {
      // 获取指定模板
      const template = templateManager.getTemplate(templateName, data);
      
      logger.debug(`使用模板 "${templateName}" 打印数据`);
      
      // 触发打印开始事件
      eventManager.emit(EVENTS.PRINTER_PRINT_STARTED, { 
        template: templateName, 
        data 
      });
      
      // 构建模板命令
      const commands = await template.build();
      
      // 发送命令
      const result = await this.sendCommands(commands);
      
      // 触发打印完成事件
      eventManager.emit(EVENTS.PRINTER_PRINT_COMPLETED, { 
        template: templateName,
        success: result 
      });
      
      return result;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`使用模板 "${templateName}" 打印失败:`, error);
      
      // 触发错误事件
      eventManager.emit(EVENTS.PRINTER_ERROR, this.lastError);
      
      return false;
    }
  }

  /**
   * 获取可用模板列表
   */
  getAvailableTemplates(): string[] {
    return templateManager.getTemplateNames();
  }

  /**
   * 注册自定义模板
   * @param name 模板名称
   * @param templateClass 模板类
   */
  registerTemplate<T>(name: string, templateClass: new (data: T) => PrintTemplate<T>): void {
    templateManager.register(name, templateClass);
  }

  async print(text: string, deviceId?: string): Promise<boolean> {
    try {
      // 发送打印开始事件
      eventManager.emit(EVENTS.PRINTER_PRINT_START, {
        text,
        deviceId,
        timestamp: Date.now()
      });

      // 打印文本
      const result = await this.printText(text);

      // 发送打印完成事件
      if (result) {
        eventManager.emit(EVENTS.PRINTER_PRINT_COMPLETED, {
          success: true,
          timestamp: Date.now()
        });
      } else {
        eventManager.emit(EVENTS.PRINTER_PRINT_FAILED, {
          success: false,
          error: new PrinterError(
            ErrorCode.UNKNOWN_ERROR,
            '打印失败'
          ),
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      // 发送错误事件
      eventManager.emit(EVENTS.PRINTER_ERROR, {
        error,
        timestamp: Date.now()
      });
      return false;
    }
  }
} 