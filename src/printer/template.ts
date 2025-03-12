import { Commands } from './commands';
import { textToBuffer } from '../utils/encoding';
import { PrinterImage } from './image';
import { logger } from '../utils/logger';

/**
 * 打印模板基类
 */
export abstract class PrintTemplate {
  protected commands: Uint8Array[] = [];
  
  /**
   * 生成打印命令
   */
  abstract build(): Promise<Uint8Array[]>;
  
  /**
   * 重置模板
   */
  reset(): void {
    this.commands = [];
    this.commands.push(Commands.INIT);
  }
  
  /**
   * 添加文本
   */
  addText(text: string, options?: {
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    doubleHeight?: boolean;
    doubleWidth?: boolean;
    underline?: boolean;
  }): this {
    // 对齐方式
    if (options?.align === 'center') {
      this.commands.push(Commands.ALIGN_CENTER);
    } else if (options?.align === 'right') {
      this.commands.push(Commands.ALIGN_RIGHT);
    } else {
      this.commands.push(Commands.ALIGN_LEFT);
    }
    
    // 字体样式
    if (options?.bold) {
      this.commands.push(Commands.BOLD_ON);
    }
    
    if (options?.underline) {
      this.commands.push(Commands.UNDERLINE_ON);
    }
    
    // 字体大小
    if (options?.doubleHeight && options?.doubleWidth) {
      this.commands.push(Commands.TEXT_LARGE);
    } else if (options?.doubleHeight) {
      this.commands.push(Commands.TEXT_MEDIUM);
    } else {
      this.commands.push(Commands.TEXT_NORMAL);
    }
    
    // 添加文本
    this.commands.push(textToBuffer(text));
    this.commands.push(Commands.LF);
    
    // 重置样式
    if (options?.bold) {
      this.commands.push(Commands.BOLD_OFF);
    }
    
    if (options?.underline) {
      this.commands.push(Commands.UNDERLINE_OFF);
    }
    
    if (options?.doubleHeight || options?.doubleWidth) {
      this.commands.push(Commands.TEXT_NORMAL);
    }
    
    return this;
  }
  
  /**
   * 添加换行
   */
  addNewLine(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.commands.push(Commands.LF);
    }
    return this;
  }
  
  /**
   * 添加分隔线
   */
  addDivider(char: string = '-', count: number = 32): this {
    const line = char.repeat(count);
    this.commands.push(textToBuffer(line));
    this.commands.push(Commands.LF);
    return this;
  }
  
  /**
   * 添加条形码
   */
  addBarcode(content: string, options?: {
    type?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
  }): this {
    const type = options?.type || 73; // 默认CODE128
    const height = options?.height || 80;
    
    // 对齐方式
    if (options?.align === 'center') {
      this.commands.push(Commands.ALIGN_CENTER);
    } else if (options?.align === 'right') {
      this.commands.push(Commands.ALIGN_RIGHT);
    } else {
      this.commands.push(Commands.ALIGN_LEFT);
    }
    
    // 设置条码高度
    this.commands.push(Commands.setBarcodeHeight(height));
    
    // 打印条码
    this.commands.push(Commands.printBarcode(content, type));
    this.commands.push(Commands.LF);
    
    return this;
  }
  
  /**
   * 添加二维码
   */
  addQRCode(content: string, options?: {
    size?: number;
    align?: 'left' | 'center' | 'right';
  }): this {
    const size = options?.size || 6;
    
    // 对齐方式
    if (options?.align === 'center') {
      this.commands.push(Commands.ALIGN_CENTER);
    } else if (options?.align === 'right') {
      this.commands.push(Commands.ALIGN_RIGHT);
    } else {
      this.commands.push(Commands.ALIGN_LEFT);
    }
    
    // 添加二维码命令
    this.commands.push(...Commands.printQRCode(content, size));
    this.commands.push(Commands.LF);
    
    return this;
  }
  
  /**
   * 添加切纸命令
   */
  addCut(): this {
    this.commands.push(Commands.CUT);
    return this;
  }
}

/**
 * 收据模板
 */
export class ReceiptTemplate extends PrintTemplate {
  private title: string;
  private merchant: string;
  private items: Array<{name: string; price: number; quantity: number}> = [];
  private total: number = 0;
  private date: string;
  private footer?: string;
  private logo?: string;
  
  constructor(data: {
    title: string;
    merchant: string;
    items: Array<{name: string; price: number; quantity: number}>;
    total?: number;
    date?: string;
    footer?: string;
    logo?: string;
  }) {
    super();
    
    this.title = data.title;
    this.merchant = data.merchant;
    this.items = data.items;
    this.total = data.total || this.calculateTotal();
    this.date = data.date || new Date().toLocaleString();
    this.footer = data.footer;
    this.logo = data.logo;
    
    this.reset();
  }
  
  /**
   * 计算总金额
   */
  private calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  /**
   * 生成打印命令
   */
  async build(): Promise<Uint8Array[]> {
    this.reset();
    
    try {
      // 打印徽标（如果有）
      if (this.logo) {
        try {
          const logoImage = await PrinterImage.processImage(this.logo, {
            maxWidth: 300,
            dithering: true
          });
          
          this.commands.push(Commands.ALIGN_CENTER);
          this.commands.push(logoImage);
          this.commands.push(Commands.LF);
        } catch (error) {
          logger.warn('徽标处理失败', error);
        }
      }
      
      // 标题和商户信息
      this.addText(this.title, { align: 'center', doubleHeight: true, doubleWidth: true });
      this.addText(this.merchant, { align: 'center' });
      this.addDivider();
      
      // 商品明细表头
      this.addText("商品名称              数量  单价    金额", { align: 'left' });
      
      // 商品明细
      for (const item of this.items) {
        const price = item.price.toFixed(2);
        const amount = (item.price * item.quantity).toFixed(2);
        
        let line = item.name.padEnd(20, ' ');
        line += String(item.quantity).padStart(5, ' ');
        line += price.padStart(7, ' ');
        line += amount.padStart(8, ' ');
        
        this.addText(line, { align: 'left' });
      }
      
      // 分隔线和总计
      this.addDivider();
      this.addText(`总计: ${this.total.toFixed(2)}元`, { align: 'right', bold: true });
      
      // 日期和页脚
      this.addText(this.date, { align: 'center' });
      
      if (this.footer) {
        this.addNewLine();
        this.addText(this.footer, { align: 'center' });
      }
      
      this.addNewLine();
      this.addCut();
      
      return this.commands;
    } catch (error) {
      logger.error('生成收据模板失败', error);
      return [Commands.INIT, Commands.CUT];
    }
  }
}

/**
 * 测试页模板
 */
export class TestPageTemplate extends PrintTemplate {
  private packageInfo: string;
  
  constructor(packageInfo: string = 'Taro蓝牙打印库 v1.0.0') {
    super();
    this.packageInfo = packageInfo;
    this.reset();
  }
  
  /**
   * 生成打印命令
   */
  async build(): Promise<Uint8Array[]> {
    this.reset();
    
    // 标题
    this.addText('打印测试页', { align: 'center', doubleHeight: true, doubleWidth: true });
    this.addText(this.packageInfo, { align: 'center' });
    this.addDivider();
    
    // 文本样式测试
    this.addText('【文本样式测试】', { align: 'left' });
    this.addText('标准文本', { align: 'left' });
    this.addText('粗体文本', { align: 'left', bold: true });
    this.addText('下划线文本', { align: 'left', underline: true });
    this.addText('大号文本', { align: 'left', doubleHeight: true, doubleWidth: true });
    
    // 对齐方式测试
    this.addText('【对齐方式测试】', { align: 'left' });
    this.addText('左对齐文本', { align: 'left' });
    this.addText('居中对齐文本', { align: 'center' });
    this.addText('右对齐文本', { align: 'right' });
    
    // 条码测试
    this.addText('【条码测试】', { align: 'center' });
    this.addBarcode('12345678', { align: 'center', height: 60 });
    
    // 二维码测试
    this.addText('【二维码测试】', { align: 'center' });
    this.addQRCode('https://github.com/yourusername/taro-bluetooth-print', { align: 'center', size: 6 });
    
    // 结束
    this.addDivider();
    this.addText('测试完成', { align: 'center' });
    this.addNewLine(2);
    this.addCut();
    
    return this.commands;
  }
} 