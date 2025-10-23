/**
 * 收据打印模板实现
 */

import { PrintTemplate } from './base';
import { PrinterImage } from '../image';
import { ReceiptOptions, ReceiptItem } from '../../types';
import { logger } from '../../utils/logger';
import { PRINTER_DEFAULTS } from '../../utils/config';
import { Commands } from '../commands';

/**
 * 收据打印模板
 * 用于格式化并打印收据
 */
export class ReceiptTemplate extends PrintTemplate<ReceiptOptions> {
  /**
   * 构建收据打印命令
   */
  public async build(): Promise<Uint8Array[]> {
    try {
      // 验证必填字段
      this.validateData(['title', 'merchant', 'items', 'total']);
      
      // 重置命令缓存
      this.reset();
      
      // 添加初始化命令
      this.addCommands(this.initCommand());
      
      // 打印徽标（如果有）
      await this.addLogo();
      
      // 添加标题和商户信息
      this.addHeader();
      
      // 添加商品明细
      this.addItems();
      
      // 添加金额汇总
      this.addSummary();
      
      // 添加页脚信息
      this.addFooter();
      
      // 添加二维码（如果有）
      this.addQRCode();
      
      // 添加切纸命令
      this.addCommands(this.cutCommand());
      
      return this.commands;
    } catch (error) {
      logger.error('构建收据模板失败:', error);
      throw error;
    }
  }
  
  /**
   * 添加徽标
   */
  private async addLogo(): Promise<void> {
    if (!this.data.logo) {
      return;
    }
    
    try {
      const logoImage = await PrinterImage.processImage(this.data.logo, {
        maxWidth: 300,
        dithering: true
      });
      
      this.addCommands(
        [Commands.ALIGN_CENTER],
        [logoImage],
        this.feedCommand()
      );
    } catch (error) {
      logger.warn('处理徽标图片失败，将跳过打印徽标:', error);
    }
  }
  
  /**
   * 添加标题和商户信息
   */
  private addHeader(): void {
    // 标题
    this.addCommands(
      this.centerTextCommand(this.data.title, { 
        bold: true, 
        doubleHeight: true, 
        doubleWidth: true 
      }),
      this.feedCommand()
    );
    
    // 商户名称
    this.addCommands(
      this.centerTextCommand(this.data.merchant, { bold: true }),
      this.feedCommand()
    );
    
    // 商户地址和电话（如果有）
    if (this.data.address) {
      this.addCommands(
        this.centerTextCommand(this.data.address),
        this.feedCommand()
      );
    }
    
    if (this.data.phone) {
      this.addCommands(
        this.centerTextCommand(`电话: ${this.data.phone}`),
        this.feedCommand()
      );
    }
    
    // 订单号（如果有）
    if (this.data.orderNo) {
      this.addCommands(
        this.centerTextCommand(`订单号: ${this.data.orderNo}`),
        this.feedCommand()
      );
    }
    
    // 日期（如果有）
    if (this.data.date) {
      this.addCommands(
        this.centerTextCommand(this.data.date),
        this.feedCommand()
      );
    }
    
    // 分隔线
    this.addCommands(
      this.centerTextCommand('--------------------------------'),
      this.feedCommand()
    );
  }
  
  /**
   * 添加商品明细
   */
  private addItems(): void {
    // 商品表头
    const headerWidth = PRINTER_DEFAULTS.LINE_LENGTH;
    const nameWidth = Math.floor(headerWidth * 0.5);
    const qtyWidth = Math.floor(headerWidth * 0.1);
    const priceWidth = Math.floor(headerWidth * 0.2);
    const amountWidth = Math.floor(headerWidth * 0.2);
    
    const headers = '商品名称'.padEnd(nameWidth, ' ') +
      '数量'.padStart(qtyWidth, ' ') +
      '单价'.padStart(priceWidth, ' ') +
      '金额'.padStart(amountWidth, ' ');
    
    this.addCommands(
      this.leftTextCommand(headers),
      this.feedCommand()
    );
    
    // 商品明细
    this.data.items.forEach(item => {
      const formattedLine = this.formatItemLine(
        item, 
        nameWidth, 
        qtyWidth, 
        priceWidth, 
        amountWidth
      );
      
      this.addCommands(
        this.leftTextCommand(formattedLine),
        this.feedCommand()
      );
    });
    
    // 分隔线
    this.addCommands(
      this.centerTextCommand('--------------------------------'),
      this.feedCommand()
    );
  }
  
  /**
   * 格式化商品行
   */
  private formatItemLine(
    item: ReceiptItem, 
    nameWidth: number, 
    qtyWidth: number, 
    priceWidth: number, 
    amountWidth: number
  ): string {
    // 计算金额
    const price = item.price.toFixed(2);
    const quantity = item.quantity;
    const discount = item.discount || 1;
    const amount = (item.price * quantity * discount).toFixed(2);
    
    // 处理名称过长的情况
    let name = item.name;
    if (name.length > nameWidth) {
      name = name.substring(0, nameWidth - 3) + '...';
    }
    
    // 格式化行
    return name.padEnd(nameWidth, ' ') +
      String(quantity).padStart(qtyWidth, ' ') +
      price.padStart(priceWidth, ' ') +
      amount.padStart(amountWidth, ' ');
  }
  
  /**
   * 添加金额汇总
   */
  private addSummary(): void {
    // 小计（如果有）
    if (this.data.subtotal !== undefined) {
      this.addCommands(
        this.rightTextCommand(`小计: ${this.data.subtotal.toFixed(2)}`),
        this.feedCommand()
      );
    }
    
    // 折扣（如果有）
    if (this.data.discount !== undefined && this.data.discount > 0) {
      this.addCommands(
        this.rightTextCommand(`折扣: ${this.data.discount.toFixed(2)}`),
        this.feedCommand()
      );
    }
    
    // 税额（如果有）
    if (this.data.tax !== undefined && this.data.tax > 0) {
      this.addCommands(
        this.rightTextCommand(`税额: ${this.data.tax.toFixed(2)}`),
        this.feedCommand()
      );
    }
    
    // 总计
    this.addCommands(
      this.rightTextCommand(`总计: ${this.data.total.toFixed(2)}`, {
        bold: true
      }),
      this.feedCommand()
    );
    
    // 支付信息（如果有）
    if (this.data.payment) {
      this.addCommands(
        this.rightTextCommand(`支付方式: ${this.data.payment.method}`),
        this.rightTextCommand(`支付金额: ${this.data.payment.amount.toFixed(2)}`),
        this.feedCommand()
      );
    }
    
    // 操作员（如果有）
    if (this.data.operator) {
      this.addCommands(
        this.leftTextCommand(this.data.operator),
        this.feedCommand()
      );
    }
  }
  
  /**
   * 添加页脚信息
   */
  private addFooter(): void {
    if (this.data.footer) {
      // 分隔线
      this.addCommands(
        this.feedCommand(),
        this.centerTextCommand(this.data.footer),
        this.feedCommand(2)
      );
    } else {
      this.addCommands(this.feedCommand(2));
    }
  }
  
  /**
   * 添加二维码（如果有）
   */
  private addQRCode(): void {
    if (!this.data.qrcode) {
      return;
    }
    
    try {
      const qrCommands = Commands.printQRCode(this.data.qrcode, 8);
      this.addCommands(
        [Commands.ALIGN_CENTER],
        qrCommands,
        this.feedCommand(2)
      );
    } catch (error) {
      logger.warn('生成二维码失败:', error);
    }
  }
} 