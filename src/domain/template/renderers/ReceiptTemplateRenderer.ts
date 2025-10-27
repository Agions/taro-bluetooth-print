/**
 * 收据模板渲染器
 */

import {
  ITemplateRenderer,
  ITemplate,
  ITemplateContext,
  TemplateType,
  IReceiptTemplate
} from '../types';
import { TextTemplateRenderer } from './TextTemplateRenderer';

/**
 * 收据模板渲染器
 */
export class ReceiptTemplateRenderer extends TextTemplateRenderer {
  public readonly name = 'ReceiptTemplateRenderer';
  public readonly supportedTypes = [TemplateType.RECEIPT];

  /**
   * 渲染模板
   */
  public async render(
    template: ITemplate,
    data: any,
    context: ITemplateContext
  ): Promise<ArrayBuffer> {
    try {
      // 验证数据结构
      this.validateReceiptData(data);

      // 转换为标准收据格式
      const receiptData = this.normalizeReceiptData(data);

      // 应用收据模板布局
      const receiptContent = this.buildReceiptContent(template, receiptData);

      // 使用父类方法渲染文本
      const textTemplate = {
        ...template,
        content: receiptContent
      };

      return await super.render(textTemplate, data, context);
    } catch (error) {
      throw new Error(`Receipt template render failed: ${error.message}`);
    }
  }

  /**
   * 验证模板
   */
  public async validate(template: ITemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = await super.validate(template);

    // 额外的收据模板验证
    if (typeof template.content === 'object') {
      this.validateReceiptTemplateStructure(template.content, result.errors, result.warnings);
    }

    return result;
  }

  /**
   * 获取渲染器信息
   */
  public getInfo() {
    return {
      name: this.name,
      supportedTypes: this.supportedTypes,
      features: [
        'receipt-layout',
        'auto-formatting',
        'barcode-generation',
        'qr-code-generation',
        'currency-formatting',
        'date-formatting',
        'table-layout',
        'line-spacing'
      ]
    };
  }

  // 私有方法

  /**
   * 验证收据数据
   */
  private validateReceiptData(data: any): void {
    if (!data) {
      throw new Error('Receipt data is required');
    }

    // 检查必需字段
    if (!data.merchant || !data.merchant.name) {
      throw new Error('Merchant name is required');
    }

    if (!data.order) {
      throw new Error('Order data is required');
    }

    if (!data.order.items || !Array.isArray(data.order.items) || data.order.items.length === 0) {
      throw new Error('Order items are required');
    }

    if (typeof data.order.total !== 'number') {
      throw new Error('Order total must be a number');
    }
  }

  /**
   * 标准化收据数据
   */
  private normalizeReceiptData(data: any): IReceiptTemplate {
    return {
      merchant: {
        name: data.merchant.name || '',
        address: data.merchant.address || '',
        phone: data.merchant.phone || '',
        logo: data.merchant.logo || ''
      },
      order: {
        id: data.order.id || this.generateOrderId(),
        items: data.order.items.map((item: any) => ({
          name: item.name || '',
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          total: item.total || (item.quantity * item.price)
        })),
        subtotal: data.order.subtotal || this.calculateSubtotal(data.order.items),
        tax: data.order.tax || 0,
        discount: data.order.discount || 0,
        total: data.order.total || this.calculateTotal(data.order),
        currency: data.order.currency || '¥'
      },
      transaction: {
        id: data.transaction?.id || '',
        time: data.transaction?.time ? new Date(data.transaction.time) : new Date(),
        paymentMethod: data.transaction?.paymentMethod || '',
        status: data.transaction?.status || ''
      },
      customer: data.customer || {},
      footer: data.footer || {}
    };
  }

  /**
   * 构建收据内容
   */
  private buildReceiptContent(template: ITemplate, data: IReceiptTemplate): string {
    const lines: string[] = [];

    // 收据头部
    if (data.merchant.logo) {
      lines.push('{{merchant.logo}}');
      lines.push(''); // 空行
    }

    // 商家名称（居中）
    lines.push('{{merchant.name|upper}}');
    lines.push('');

    // 商家地址
    if (data.merchant.address) {
      lines.push(data.merchant.address);
      lines.push('');
    }

    // 商家电话
    if (data.merchant.phone) {
      lines.push(`电话：${data.merchant.phone}`);
      lines.push('');
    }

    // 分隔线
    lines.push('--------------------------------');
    lines.push('');

    // 订单信息
    if (data.order.id) {
      lines.push(`订单号：${data.order.id}`);
      lines.push('');
    }

    // 商品列表头部
    lines.push('商品名称          数量   单价    金额');
    lines.push('--------------------------------');

    // 商品列表
    for (const item of data.order.items) {
      const name = this.truncateString(item.name, 16);
      const quantity = item.quantity.toString().padStart(6);
      const price = this.formatCurrency(item.price, data.order.currency).padStart(8);
      const total = this.formatCurrency(item.total, data.order.currency).padStart(8);

      lines.push(`${name}${quantity}${price}`);
      if (item.name.length > 16) {
        // 如果名称太长，第二行显示金额
        lines.push(`${' '.repeat(22)}${total}`);
      } else {
        lines.push(`${' '.repeat(16)}${total}`);
      }
    }

    // 分隔线
    lines.push('--------------------------------');

    // 价格汇总
    if (data.order.subtotal !== data.order.total) {
      lines.push(`小计：${this.formatCurrency(data.order.subtotal, data.order.currency).padStart(23)}`);
    }

    if (data.order.discount > 0) {
      lines.push(`优惠：-${this.formatCurrency(data.order.discount, data.order.currency).padStart(22)}`);
    }

    if (data.order.tax > 0) {
      lines.push(`税费：${this.formatCurrency(data.order.tax, data.order.currency).padStart(23)}`);
    }

    lines.push('--------------------------------');
    lines.push(`总计：${this.formatCurrency(data.order.total, data.order.currency).padStart(23)}`);
    lines.push('');

    // 交易信息
    if (data.transaction.time) {
      lines.push(`交易时间：${this.formatDate(data.transaction.time)}`);
    }

    if (data.transaction.paymentMethod) {
      lines.push(`支付方式：${data.transaction.paymentMethod}`);
    }

    if (data.transaction.status) {
      lines.push(`交易状态：${data.transaction.status}`);
    }

    // 客户信息
    if (data.customer) {
      if (data.customer.name) {
        lines.push(`客户：${data.customer.name}`);
      }
      if (data.customer.phone) {
        lines.push(`电话：${data.customer.phone}`);
      }
    }

    lines.push('');
    lines.push('--------------------------------');
    lines.push('谢谢惠顾！');
    lines.push('欢迎再次光临！');

    // 页脚信息
    if (data.footer) {
      if (data.footer.text) {
        lines.push('');
        lines.push(data.footer.text);
      }

      if (data.footer.qrCode) {
        lines.push('');
        lines.push('{{footer.qrCode}}');
      }

      if (data.footer.barcode) {
        lines.push('{{footer.barcode}}');
      }
    }

    return lines.join('\n');
  }

  /**
   * 验证收据模板结构
   */
  private validateReceiptTemplateStructure(
    content: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (typeof content !== 'object') {
      errors.push('Receipt template content must be an object');
      return;
    }

    // 检查必需的模板部分
    const requiredParts = ['merchant', 'order'];
    for (const part of requiredParts) {
      if (!content[part]) {
        warnings.push(`Missing recommended part: ${part}`);
      }
    }

    // 验证merchant部分
    if (content.merchant) {
      if (typeof content.merchant !== 'object') {
        errors.push('Merchant section must be an object');
      }
    }

    // 验证order部分
    if (content.order) {
      if (typeof content.order !== 'object') {
        errors.push('Order section must be an object');
      } else {
        if (content.order.items && !Array.isArray(content.order.items)) {
          errors.push('Order items must be an array');
        }
      }
    }
  }

  /**
   * 生成订单ID
   */
  private generateOrderId(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
                     (now.getMonth() + 1).toString().padStart(2, '0') +
                     now.getDate().toString().padStart(2, '0') +
                     now.getHours().toString().padStart(2, '0') +
                     now.getMinutes().toString().padStart(2, '0') +
                     now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `R${timestamp}${random}`;
  }

  /**
   * 计算小计
   */
  private calculateSubtotal(items: any[]): number {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      return total + (quantity * price);
    }, 0);
  }

  /**
   * 计算总计
   */
  private calculateTotal(order: any): number {
    const subtotal = order.subtotal || this.calculateSubtotal(order.items);
    const tax = order.tax || 0;
    const discount = order.discount || 0;
    return subtotal + tax - discount;
  }

  /**
   * 格式化货币
   */
  private formatCurrency(amount: number, currency: string): string {
    return `${currency}${amount.toFixed(2)}`;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 截断字符串
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * 生成条形码命令
   */
  private generateBarcodeCommand(data: string, type: string = 'CODE128'): string {
    // 简化的条形码命令实现
    return `<BARCODE type="${type}" data="${data}">`;
  }

  /**
   * 生成二维码命令
   */
  private generateQRCodeCommand(data: string): string {
    // 简化的二维码命令实现
    return `<QRCODE data="${data}">`;
  }
}

// 预定义的收据模板
export class StandardReceiptTemplate {
  /**
   * 创建标准收据模板
   */
  static createStandardTemplate(): any {
    return {
      merchant: {
        logo: '{{merchant.logo}}',
        name: '{{merchant.name|upper}}',
        address: '{{merchant.address}}',
        phone: '电话：{{merchant.phone}}'
      },
      order: {
        id: '订单号：{{order.id}}',
        items: `
{% for item in order.items %}
{{item.name|truncate:16}}  {{item.quantity}}  {{item.price|currency}}  {{item.total|currency}}
{% endfor %}
        `,
        subtotal: '小计：{{order.subtotal|currency}}',
        tax: '税费：{{order.tax|currency}}',
        discount: '优惠：{{order.discount|currency}}',
        total: '总计：{{order.total|currency}}'
      },
      transaction: {
        time: '交易时间：{{transaction.time|date}}',
        paymentMethod: '支付方式：{{transaction.paymentMethod}}',
        status: '交易状态：{{transaction.status}}'
      },
      customer: `
{% if customer.name %}
客户：{{customer.name}}
{% endif %}
{% if customer.phone %}
电话：{{customer.phone}}
{% endif %}
        `,
      footer: {
        text: '{{footer.text}}',
        qrCode: '{{footer.qrCode}}',
        barcode: '{{footer.barcode}}'
      },
      layout: {
        maxWidth: 42, // 42字符宽度
        lineHeight: 1,
        spacing: {
          beforeFooter: 2,
          afterHeader: 1,
          betweenSections: 1
        }
      }
    };
  }

  /**
   * 创建简化收据模板
   */
  static createSimpleTemplate(): any {
    return {
      merchant: {
        name: '{{merchant.name|upper}}'
      },
      order: {
        items: `
{% for item in order.items %}
{{item.name}} x{{item.quantity}}  {{item.total|currency}}
{% endfor %}
        `,
        total: '合计：{{order.total|currency}}'
      },
      transaction: {
        time: '{{transaction.time|date}}'
      },
      footer: {
        text: '谢谢惠顾！'
      }
    };
  }

  /**
   * 创建详细收据模板
   */
  static createDetailedTemplate(): any {
    return {
      merchant: {
        logo: '{{merchant.logo}}',
        name: '{{merchant.name|upper}}',
        address: '{{merchant.address}}',
        phone: '电话：{{merchant.phone}}',
        email: '邮箱：{{merchant.email}}',
        website: '网站：{{merchant.website}}'
      },
      header: {
        title: '销售小票',
        date: '日期：{{transaction.time|date}}',
        cashier: '收银员：{{transaction.cashier}}',
        terminal: '终端：{{transaction.terminal}}'
      },
      order: {
        id: '订单号：{{order.id}}',
        items: `
商品名称          数量   单价    金额
========================================
{% for item in order.items %}
{{item.name|truncate:16}}  {{item.quantity}}  {{item.price|currency}}  {{item.total|currency}}
{% endfor %}
========================================`,
        summary: `
小计：{{order.subtotal|currency}}
{% if order.discount > 0 %}
折扣：-{{order.discount|currency}}
{% endif %}
{% if order.tax > 0 %}
税费：{{order.tax|currency}}
{% endif %}
总计：{{order.total|currency}}
        `
      },
      payment: {
        method: '支付方式：{{transaction.paymentMethod}}',
        cardNumber: '卡号：****{{transaction.cardLast4}}',
        approval: '授权码：{{transaction.approvalCode}}'
      },
      customer: `
{% if customer.name %}
客户：{{customer.name}}
{% if customer.level %}
会员等级：{{customer.level}}
{% endif %}
{% if customer.points %}
积分：{{customer.points}}
{% endif %}
{% endif %}
        `,
      footer: {
        text: '{{footer.text}}',
        policy: '退换政策：凭此小票7天内可退换商品',
        qrCode: '{{footer.qrCode}}',
        barcode: '{{footer.barcode}}'
      }
    };
  }
}