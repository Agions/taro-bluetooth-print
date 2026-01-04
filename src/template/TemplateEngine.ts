/**
 * Template Engine
 *
 * Provides template parsing and rendering for receipts and labels.
 * Supports variable substitution, conditional rendering, and loops.
 *
 * @example
 * ```typescript
 * const engine = new TemplateEngine();
 * const commands = engine.renderReceipt({
 *   store: { name: 'My Store' },
 *   items: [{ name: 'Item 1', quantity: 2, price: 10 }],
 *   payment: { total: 20, method: 'Cash' }
 * });
 * ```
 */

import { Logger } from '@/utils/logger';
import { TextFormatter, TextAlign } from '@/formatter';
import { BarcodeGenerator, BarcodeFormat } from '@/barcode';
import { EscPos } from '@/drivers/EscPos';

/**
 * Template type
 */
export enum TemplateType {
  RECEIPT = 'receipt',
  LABEL = 'label',
  CUSTOM = 'custom',
}

/**
 * Store information for receipt
 */
export interface StoreInfo {
  name: string;
  address?: string;
  phone?: string;
  logo?: Uint8Array;
}

/**
 * Order information for receipt
 */
export interface OrderInfo {
  id: string;
  date: string;
  cashier?: string;
}

/**
 * Item for receipt
 */
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount?: number;
}

/**
 * Payment information for receipt
 */
export interface PaymentInfo {
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  method: string;
  received?: number;
  change?: number;
}

/**
 * Receipt template data
 */
export interface ReceiptData {
  store: StoreInfo;
  order?: OrderInfo;
  items: ReceiptItem[];
  payment: PaymentInfo;
  qrCode?: string;
  footer?: string;
}

/**
 * Label template data
 */
export interface LabelData {
  name: string;
  price: number;
  barcode?: string;
  barcodeFormat?: BarcodeFormat;
  spec?: string;
  productionDate?: string;
  expiryDate?: string;
}

/**
 * Template element types
 */
export type TemplateElement =
  | { type: 'text'; content: string; align?: TextAlign; size?: number; bold?: boolean }
  | { type: 'line'; char?: string; length?: number }
  | { type: 'image'; data: Uint8Array; width: number; height: number }
  | { type: 'qrcode'; content: string; size?: number }
  | { type: 'barcode'; content: string; format: BarcodeFormat; height?: number }
  | { type: 'feed'; lines: number }
  | { type: 'variable'; name: string; format?: string };

/**
 * Template definition
 */
export interface TemplateDefinition {
  type: TemplateType;
  name: string;
  width: number;
  elements: TemplateElement[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Template engine interface
 */
export interface ITemplateEngine {
  renderReceipt(data: ReceiptData): Uint8Array;
  renderLabel(data: LabelData): Uint8Array;
  render(template: TemplateDefinition, data: Record<string, unknown>): Uint8Array;
  registerTemplate(name: string, template: TemplateDefinition): void;
  validate(template: TemplateDefinition, data: Record<string, unknown>): ValidationResult;
}

/**
 * Template Engine class
 * Renders print templates to ESC/POS commands
 */
export class TemplateEngine implements ITemplateEngine {
  private readonly logger = Logger.scope('TemplateEngine');
  private readonly formatter: TextFormatter;
  private readonly barcodeGenerator: BarcodeGenerator;
  private readonly driver: EscPos;
  private readonly templates: Map<string, TemplateDefinition> = new Map();
  private readonly paperWidth: number;

  /**
   * Creates a new TemplateEngine instance
   */
  constructor(paperWidth = 48) {
    this.paperWidth = paperWidth;
    this.formatter = new TextFormatter();
    this.barcodeGenerator = new BarcodeGenerator();
    this.driver = new EscPos();
  }

  /**
   * Render a receipt template
   */
  renderReceipt(data: ReceiptData): Uint8Array {
    const commands: Uint8Array[] = [];

    // Initialize printer
    commands.push(...this.driver.init());

    // Store header
    commands.push(...this.formatter.align(TextAlign.CENTER));
    commands.push(...this.formatter.setSize(2, 2));
    commands.push(...this.formatter.setBold(true));
    commands.push(...this.driver.text(data.store.name));
    commands.push(...this.driver.feed(1));
    commands.push(...this.formatter.resetStyle());

    // Store address and phone
    if (data.store.address) {
      commands.push(...this.formatter.align(TextAlign.CENTER));
      commands.push(...this.driver.text(data.store.address));
      commands.push(...this.driver.feed(1));
    }
    if (data.store.phone) {
      commands.push(...this.formatter.align(TextAlign.CENTER));
      commands.push(...this.driver.text(`电话: ${data.store.phone}`));
      commands.push(...this.driver.feed(1));
    }

    // Separator line
    commands.push(...this.renderLine());

    // Order info
    if (data.order) {
      commands.push(...this.formatter.align(TextAlign.LEFT));
      commands.push(...this.driver.text(`订单号: ${data.order.id}`));
      commands.push(...this.driver.feed(1));
      commands.push(...this.driver.text(`日期: ${data.order.date}`));
      commands.push(...this.driver.feed(1));
      if (data.order.cashier) {
        commands.push(...this.driver.text(`收银员: ${data.order.cashier}`));
        commands.push(...this.driver.feed(1));
      }
      commands.push(...this.renderLine());
    }

    // Items header
    commands.push(...this.formatter.align(TextAlign.LEFT));
    commands.push(...this.formatter.setBold(true));
    commands.push(...this.driver.text(this.formatItemLine('商品', '数量', '金额')));
    commands.push(...this.driver.feed(1));
    commands.push(...this.formatter.setBold(false));
    commands.push(...this.renderLine('-'));

    // Items
    for (const item of data.items) {
      const amount = item.quantity * item.price - (item.discount ?? 0);
      commands.push(...this.driver.text(item.name));
      commands.push(...this.driver.feed(1));
      commands.push(
        ...this.driver.text(this.formatItemLine('', `x${item.quantity}`, `¥${amount.toFixed(2)}`))
      );
      commands.push(...this.driver.feed(1));
    }

    commands.push(...this.renderLine());

    // Payment summary
    commands.push(...this.formatter.align(TextAlign.RIGHT));
    if (data.payment.subtotal !== data.payment.total) {
      commands.push(...this.driver.text(`小计: ¥${data.payment.subtotal.toFixed(2)}`));
      commands.push(...this.driver.feed(1));
    }
    if (data.payment.tax) {
      commands.push(...this.driver.text(`税额: ¥${data.payment.tax.toFixed(2)}`));
      commands.push(...this.driver.feed(1));
    }
    if (data.payment.discount) {
      commands.push(...this.driver.text(`优惠: -¥${data.payment.discount.toFixed(2)}`));
      commands.push(...this.driver.feed(1));
    }

    commands.push(...this.formatter.setBold(true));
    commands.push(...this.formatter.setSize(1, 2));
    commands.push(...this.driver.text(`合计: ¥${data.payment.total.toFixed(2)}`));
    commands.push(...this.driver.feed(1));
    commands.push(...this.formatter.resetStyle());

    commands.push(...this.formatter.align(TextAlign.RIGHT));
    commands.push(...this.driver.text(`支付方式: ${data.payment.method}`));
    commands.push(...this.driver.feed(1));

    if (data.payment.received !== undefined) {
      commands.push(...this.driver.text(`实收: ¥${data.payment.received.toFixed(2)}`));
      commands.push(...this.driver.feed(1));
    }
    if (data.payment.change !== undefined) {
      commands.push(...this.driver.text(`找零: ¥${data.payment.change.toFixed(2)}`));
      commands.push(...this.driver.feed(1));
    }

    commands.push(...this.renderLine());

    // QR Code
    if (data.qrCode) {
      commands.push(...this.formatter.align(TextAlign.CENTER));
      commands.push(...this.driver.qr(data.qrCode, { size: 6 }));
      commands.push(...this.driver.feed(1));
    }

    // Footer
    if (data.footer) {
      commands.push(...this.formatter.align(TextAlign.CENTER));
      commands.push(...this.driver.text(data.footer));
      commands.push(...this.driver.feed(1));
    } else {
      commands.push(...this.formatter.align(TextAlign.CENTER));
      commands.push(...this.driver.text('谢谢惠顾，欢迎再次光临！'));
      commands.push(...this.driver.feed(1));
    }

    commands.push(...this.driver.feed(3));
    commands.push(...this.driver.cut());

    return this.combineCommands(commands);
  }

  /**
   * Render a label template
   */
  renderLabel(data: LabelData): Uint8Array {
    const commands: Uint8Array[] = [];

    // Initialize printer
    commands.push(...this.driver.init());

    // Product name
    commands.push(...this.formatter.align(TextAlign.CENTER));
    commands.push(...this.formatter.setBold(true));
    commands.push(...this.driver.text(data.name));
    commands.push(...this.driver.feed(1));
    commands.push(...this.formatter.setBold(false));

    // Spec
    if (data.spec) {
      commands.push(...this.driver.text(data.spec));
      commands.push(...this.driver.feed(1));
    }

    // Price
    commands.push(...this.formatter.setSize(2, 2));
    commands.push(...this.driver.text(`¥${data.price.toFixed(2)}`));
    commands.push(...this.driver.feed(1));
    commands.push(...this.formatter.resetStyle());

    // Dates
    commands.push(...this.formatter.align(TextAlign.LEFT));
    if (data.productionDate) {
      commands.push(...this.driver.text(`生产日期: ${data.productionDate}`));
      commands.push(...this.driver.feed(1));
    }
    if (data.expiryDate) {
      commands.push(...this.driver.text(`保质期至: ${data.expiryDate}`));
      commands.push(...this.driver.feed(1));
    }

    // Barcode
    if (data.barcode) {
      commands.push(...this.formatter.align(TextAlign.CENTER));
      const barcodeCommands = this.barcodeGenerator.generate(data.barcode, {
        format: data.barcodeFormat ?? BarcodeFormat.CODE128,
        height: 60,
        showText: true,
      });
      commands.push(...barcodeCommands);
      commands.push(...this.driver.feed(1));
    }

    commands.push(...this.driver.feed(2));
    commands.push(...this.driver.cut());

    return this.combineCommands(commands);
  }

  /**
   * Render a custom template
   */
  render(template: TemplateDefinition, data: Record<string, unknown>): Uint8Array {
    const commands: Uint8Array[] = [];

    // Initialize printer
    commands.push(...this.driver.init());

    for (const element of template.elements) {
      commands.push(...this.renderElement(element, data));
    }

    commands.push(...this.driver.feed(2));
    commands.push(...this.driver.cut());

    return this.combineCommands(commands);
  }

  /**
   * Register a custom template
   */
  registerTemplate(name: string, template: TemplateDefinition): void {
    this.templates.set(name, template);
    this.logger.debug(`Template registered: ${name}`);
  }

  /**
   * Get a registered template
   */
  getTemplate(name: string): TemplateDefinition | undefined {
    return this.templates.get(name);
  }

  /**
   * Validate template data
   */
  validate(template: TemplateDefinition, data: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    for (const element of template.elements) {
      if (element.type === 'variable') {
        const value = this.getNestedValue(data, element.name);
        if (value === undefined) {
          errors.push({
            field: element.name,
            message: `Missing required variable: ${element.name}`,
            code: 'MISSING_VARIABLE',
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Render a single template element
   */
  private renderElement(element: TemplateElement, data: Record<string, unknown>): Uint8Array[] {
    const commands: Uint8Array[] = [];

    switch (element.type) {
      case 'text': {
        const content = this.substituteVariables(element.content, data);
        if (element.align) {
          commands.push(...this.formatter.align(element.align));
        }
        if (element.size) {
          commands.push(...this.formatter.setSize(element.size, element.size));
        }
        if (element.bold) {
          commands.push(...this.formatter.setBold(true));
        }
        commands.push(...this.driver.text(content));
        commands.push(...this.driver.feed(1));
        if (element.bold) {
          commands.push(...this.formatter.setBold(false));
        }
        if (element.size) {
          commands.push(...this.formatter.setSize(1, 1));
        }
        break;
      }

      case 'line':
        commands.push(...this.renderLine(element.char, element.length));
        break;

      case 'image':
        commands.push(...this.driver.image(element.data, element.width, element.height));
        commands.push(...this.driver.feed(1));
        break;

      case 'qrcode': {
        const qrContent = this.substituteVariables(element.content, data);
        commands.push(...this.formatter.align(TextAlign.CENTER));
        commands.push(...this.driver.qr(qrContent, { size: element.size ?? 6 }));
        commands.push(...this.driver.feed(1));
        break;
      }

      case 'barcode': {
        const barcodeContent = this.substituteVariables(element.content, data);
        commands.push(...this.formatter.align(TextAlign.CENTER));
        const barcodeCommands = this.barcodeGenerator.generate(barcodeContent, {
          format: element.format,
          height: element.height ?? 60,
          showText: true,
        });
        commands.push(...barcodeCommands);
        commands.push(...this.driver.feed(1));
        break;
      }

      case 'feed':
        commands.push(...this.driver.feed(element.lines));
        break;

      case 'variable': {
        const value = this.getNestedValue(data, element.name);
        if (value !== undefined) {
          const formatted = this.formatValue(value, element.format);
          commands.push(...this.driver.text(formatted));
          commands.push(...this.driver.feed(1));
        }
        break;
      }
    }

    return commands;
  }

  /**
   * Render a separator line
   */
  private renderLine(char = '-', length?: number): Uint8Array[] {
    const lineLength = length ?? this.paperWidth;
    const line = char.repeat(lineLength);
    return [...this.driver.text(line), ...this.driver.feed(1)];
  }

  /**
   * Format an item line with columns
   */
  private formatItemLine(name: string, qty: string, amount: string): string {
    const nameWidth = this.paperWidth - 16;
    const qtyWidth = 8;
    const amountWidth = 8;

    const paddedName = name.padEnd(nameWidth).substring(0, nameWidth);
    const paddedQty = qty.padStart(qtyWidth);
    const paddedAmount = amount.padStart(amountWidth);

    return `${paddedName}${paddedQty}${paddedAmount}`;
  }

  /**
   * Substitute variables in a string
   */
  private substituteVariables(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Format a value with optional format string
   */
  private formatValue(value: unknown, format?: string): string {
    if (format === 'currency' && typeof value === 'number') {
      return `¥${value.toFixed(2)}`;
    }
    if (format === 'date' && value instanceof Date) {
      return value.toLocaleDateString('zh-CN');
    }
    return String(value);
  }

  /**
   * Combine multiple command arrays into one
   */
  private combineCommands(commands: Uint8Array[]): Uint8Array {
    const totalLength = commands.reduce((acc, cmd) => acc + cmd.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const cmd of commands) {
      result.set(cmd, offset);
      offset += cmd.length;
    }

    return result;
  }
}

// Export singleton instance for convenience
export const templateEngine = new TemplateEngine();
