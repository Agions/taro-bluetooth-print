/**
 * Template Renderer
 *
 * Handles rendering of template elements to ESC/POS commands.
 */

import { Logger } from '@/utils/logger';
import { TextFormatter, TextAlign } from '@/formatter';
import { BarcodeGenerator, BarcodeFormat } from '@/barcode';
import { EscPos } from '@/drivers/escPosDriver';
import type {
  TemplateElement,
  LoopElement,
  ConditionElement,
  BorderElement,
  TableElement,
  BorderStyle,
  TableRowData,
  ReceiptData,
  LabelData,
} from '../TemplateEngine';
import { TemplateParser } from '../parsers/TemplateParser';

/**
 * Border style character sets
 */
const BORDER_CHARS: Record<
  BorderStyle,
  {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    top: string;
    bottom: string;
    left: string;
    right: string;
    cross: string;
  }
> = {
  single: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    top: '-',
    bottom: '-',
    left: '|',
    right: '|',
    cross: '+',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    top: '═',
    bottom: '═',
    left: '║',
    right: '║',
    cross: '╬',
  },
  thick: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    top: '━',
    bottom: '━',
    left: '┃',
    right: '┃',
    cross: '╋',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    top: '─',
    bottom: '─',
    left: '│',
    right: '│',
    cross: '┼',
  },
  dashed: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    top: '-',
    bottom: '-',
    left: ':',
    right: ':',
    cross: '+',
  },
  none: {
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    top: ' ',
    bottom: ' ',
    left: ' ',
    right: ' ',
    cross: ' ',
  },
};

/**
 * Template Renderer class
 * Renders template elements to ESC/POS commands
 */
export class TemplateRenderer {
  private readonly logger = Logger.scope('TemplateRenderer');
  private readonly formatter: TextFormatter;
  private readonly barcodeGenerator: BarcodeGenerator;
  private readonly driver: EscPos;
  private readonly parser: TemplateParser;
  private readonly paperWidth: number;

  /** Default paper width in characters (58mm paper ≈ 48 chars) */
  private static readonly DEFAULT_PAPER_WIDTH = 48;

  constructor(paperWidth = TemplateRenderer.DEFAULT_PAPER_WIDTH) {
    this.paperWidth = paperWidth;
    this.formatter = new TextFormatter();
    this.barcodeGenerator = new BarcodeGenerator();
    this.driver = new EscPos();
    this.parser = new TemplateParser();
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
  render(
    template: import('../TemplateEngine').TemplateDefinition,
    data: Record<string, unknown>
  ): Uint8Array {
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
   * Render a single template element
   */
  renderElement(element: TemplateElement, data: Record<string, unknown>): Uint8Array[] {
    switch (element.type) {
      case 'loop':
        return this.renderLoop(element, data);
      case 'condition':
        return this.renderCondition(element, data);
      case 'border':
        return this.renderBorder(element);
      case 'table':
        return this.renderTable(element, data);
      default:
        return this.renderStandardElement(element, data);
    }
  }

  /**
   * Render a loop element
   */
  renderLoop(loop: LoopElement, data: Record<string, unknown>): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const items = this.parser.getNestedValue(data, loop.items);

    if (!items || !Array.isArray(items)) {
      this.logger.warn(`Loop variable '${loop.items}' is not an array`);
      return commands;
    }

    for (let i = 0; i < items.length; i++) {
      const itemData: Record<string, unknown> = items[i] as Record<string, unknown>;

      // Create iteration context with item and optionally index
      const context: Record<string, unknown> = {
        ...data,
        [loop.itemVar]: itemData,
      };

      if (loop.indexVar) {
        context[loop.indexVar] = i;
      }

      // Render each element in the loop
      for (const childElement of loop.elements) {
        commands.push(...this.renderElement(childElement, context));
      }

      // Add separator between items (but not after the last)
      if (loop.separator && i < items.length - 1) {
        commands.push(...this.driver.text(loop.separator));
        commands.push(...this.driver.feed(1));
      }
    }

    return commands;
  }

  /**
   * Render a condition element
   */
  renderCondition(condition: ConditionElement, data: Record<string, unknown>): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const value = this.parser.getNestedValue(data, condition.variable);
    const result = this.evaluateCondition(value, condition.operator, condition.value);

    const elementsToRender = result ? condition.then : (condition.else ?? []);

    for (const childElement of elementsToRender) {
      commands.push(...this.renderElement(childElement, data));
    }

    return commands;
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(
    value: unknown,
    operator: ConditionElement['operator'],
    compareValue?: unknown
  ): boolean {
    switch (operator) {
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      case 'equals':
        return value === compareValue;
      case 'not_equals':
        return value !== compareValue;
      case 'gt':
        return (
          typeof value === 'number' && typeof compareValue === 'number' && value > compareValue
        );
      case 'gte':
        return (
          typeof value === 'number' && typeof compareValue === 'number' && value >= compareValue
        );
      case 'lt':
        return (
          typeof value === 'number' && typeof compareValue === 'number' && value < compareValue
        );
      case 'lte':
        return (
          typeof value === 'number' && typeof compareValue === 'number' && value <= compareValue
        );
      case 'truthy':
        return Boolean(value);
      case 'falsy':
        return !value;
      default:
        return false;
    }
  }

  /**
   * Render a border element
   */
  renderBorder(border: BorderElement): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const style = BORDER_CHARS[border.style ?? 'single'];
    const width = this.paperWidth;
    const padding = border.padding ?? 0;

    // Build custom or default characters
    const tl = border.topLeft ?? style.topLeft;
    const tr = border.topRight ?? style.topRight;
    const bl = border.bottomLeft ?? style.bottomLeft;
    const br = border.bottomRight ?? style.bottomRight;
    const t = border.top ?? style.top;
    const b = border.bottom ?? style.bottom;
    const l = border.left ?? style.left;
    const r = border.right ?? style.right;

    // Top border
    if (border.drawTop !== false) {
      const topLine = tl + t.repeat(width - 2) + tr;
      commands.push(...this.driver.text(topLine));
      commands.push(...this.driver.feed(1));
    }

    // Middle lines with optional fill
    if (border.filled) {
      const innerWidth = width - 2 - padding * 2;
      const fillChar = ' ';
      for (let i = 0; i < padding; i++) {
        const fillLine = l + fillChar.repeat(width - 2) + r;
        commands.push(...this.driver.text(fillLine));
        commands.push(...this.driver.feed(1));
      }
      const contentLine =
        l + fillChar.repeat(padding) + fillChar.repeat(innerWidth) + fillChar.repeat(padding) + r;
      commands.push(...this.driver.text(contentLine));
      commands.push(...this.driver.feed(1));
      for (let i = 0; i < padding; i++) {
        const fillLine = l + fillChar.repeat(width - 2) + r;
        commands.push(...this.driver.text(fillLine));
        commands.push(...this.driver.feed(1));
      }
    } else if (border.drawLeft || border.drawRight) {
      const middleLine =
        (border.drawLeft !== false ? l : ' ') +
        ' '.repeat(width - 2) +
        (border.drawRight !== false ? r : ' ');
      commands.push(...this.driver.text(middleLine));
      commands.push(...this.driver.feed(1));
    }

    // Bottom border
    if (border.drawBottom !== false) {
      const bottomLine = bl + b.repeat(width - 2) + br;
      commands.push(...this.driver.text(bottomLine));
      commands.push(...this.driver.feed(1));
    }

    return commands;
  }

  /**
   * Render a table element
   */
  renderTable(table: TableElement, data: Record<string, unknown>): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const rows = this.parser.getNestedValue(data, table.rowsVar);

    if (!Array.isArray(rows)) {
      this.logger.warn(`Table rows variable '${table.rowsVar}' is not an array`);
      return commands;
    }

    const style = BORDER_CHARS[table.borderStyle ?? 'single'];

    // Draw top border
    if (table.showHeader) {
      const topLine =
        style.topLeft +
        table.columns
          .map(col => {
            const width = col.width + 1;
            return style.top.repeat(width);
          })
          .join('') +
        style.topRight;
      commands.push(...this.driver.text(topLine));
      commands.push(...this.driver.feed(1));
    }

    // Draw header row
    if (table.showHeader) {
      let headerContent = style.left + ' ';
      table.columns.forEach((col, i) => {
        const cellText = col.header.substring(0, col.width);
        const aligned = this.alignText(cellText, col.width, col.headerAlign ?? TextAlign.LEFT);
        headerContent +=
          aligned + (i < table.columns.length - 1 ? style.cross + ' ' : ' ' + style.right);
      });
      commands.push(...this.driver.text(headerContent));
      commands.push(...this.driver.feed(1));
    }

    // Draw separator after header
    if (table.showHeader) {
      const sepLine =
        style.cross +
        table.columns
          .map(col => {
            return style.bottom.repeat(col.width + 1);
          })
          .join('') +
        style.cross;
      commands.push(...this.driver.text(sepLine));
      commands.push(...this.driver.feed(1));
    }

    // Draw data rows
    rows.forEach((rowData, rowIndex) => {
      const row = rowData as TableRowData;
      let rowContent = style.left + ' ';

      table.columns.forEach((col, colIndex) => {
        const cellValue = row[col.header] ?? '';
        const cellText = String(cellValue).substring(0, col.width);
        const aligned = this.alignText(cellText, col.width, col.cellAlign ?? TextAlign.LEFT);
        rowContent +=
          aligned + (colIndex < table.columns.length - 1 ? style.cross + ' ' : ' ' + style.right);
      });

      commands.push(...this.driver.text(rowContent));
      commands.push(...this.driver.feed(1));

      // Draw row separator
      if (rowIndex < rows.length - 1) {
        const sepLine =
          style.cross +
          table.columns
            .map(col => {
              return style.bottom.repeat(col.width + 1);
            })
            .join('') +
          style.cross;
        commands.push(...this.driver.text(sepLine));
        commands.push(...this.driver.feed(1));
      }
    });

    // Draw bottom border
    const bottomLine =
      style.bottomLeft +
      table.columns
        .map(col => {
          return style.bottom.repeat(col.width + 1);
        })
        .join('') +
      style.bottomRight;
    commands.push(...this.driver.text(bottomLine));
    commands.push(...this.driver.feed(1));

    return commands;
  }

  /**
   * Align text within a specified width
   */
  alignText(text: string, width: number, align: TextAlign): string {
    const padded = text.padEnd(width).substring(0, width);
    switch (align) {
      case TextAlign.CENTER: {
        const leftPad = Math.floor((width - padded.length) / 2);
        return padded.padStart(leftPad + padded.length).padEnd(width);
      }
      case TextAlign.RIGHT:
        return text.padStart(width);
      default:
        return padded;
    }
  }

  /**
   * Render standard elements (text, line, image, qrcode, barcode, feed, variable)
   */
  renderStandardElement(
    element: Exclude<
      TemplateElement,
      LoopElement | ConditionElement | BorderElement | TableElement
    >,
    data: Record<string, unknown>
  ): Uint8Array[] {
    const commands: Uint8Array[] = [];

    switch (element.type) {
      case 'text': {
        const content = this.parser.substituteVariables(element.content, data);
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
        const qrContent = this.parser.substituteVariables(element.content, data);
        commands.push(...this.formatter.align(TextAlign.CENTER));
        commands.push(...this.driver.qr(qrContent, { size: element.size ?? 6 }));
        commands.push(...this.driver.feed(1));
        break;
      }

      case 'barcode': {
        const barcodeContent = this.parser.substituteVariables(element.content, data);
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
        const value = this.parser.getNestedValue(data, element.name);
        if (value !== undefined) {
          const formatted = this.parser.formatValue(value, element.format);
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
  renderLine(char?: string, length?: number): Uint8Array[] {
    const lineChar = char ?? '-';
    const lineLength = length ?? this.paperWidth;
    const line = lineChar.repeat(lineLength);
    return [...this.driver.text(line), ...this.driver.feed(1)];
  }

  /**
   * Format an item line with columns
   */
  formatItemLine(name: string, qty: string, amount: string): string {
    const nameWidth = this.paperWidth - 16;
    const qtyWidth = 8;
    const amountWidth = 8;

    const paddedName = name.padEnd(nameWidth).substring(0, nameWidth);
    const paddedQty = qty.padStart(qtyWidth);
    const paddedAmount = amount.padStart(amountWidth);

    return `${paddedName}${paddedQty}${paddedAmount}`;
  }

  /**
   * Combine multiple command arrays into one
   */
  combineCommands(commands: Uint8Array[]): Uint8Array {
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
