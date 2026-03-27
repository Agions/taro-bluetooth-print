/**
 * Template Engine
 *
 * Provides template parsing and rendering for receipts and labels.
 * Supports variable substitution, conditional rendering, loops, and border/table drawing.
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
 * Loop element for iterating over arrays
 */
export interface LoopElement {
  /** Element type identifier */
  type: 'loop';
  /** Variable name to iterate over (array) */
  items: string;
  /** Item variable name for each iteration */
  itemVar: string;
  /** Index variable name (optional) */
  indexVar?: string;
  /** Template elements to render for each item */
  elements: TemplateElement[];
  /** Separator between iterations (optional) */
  separator?: string;
}

/**
 * Condition element for conditional rendering
 */
export interface ConditionElement {
  /** Element type identifier */
  type: 'condition';
  /** Variable name to evaluate */
  variable: string;
  /** Operator for comparison */
  operator:
    | 'exists'
    | 'not_exists'
    | 'equals'
    | 'not_equals'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'truthy'
    | 'falsy';
  /** Value to compare against (for binary operators) */
  value?: unknown;
  /** Elements to render when condition is true */
  then: TemplateElement[];
  /** Elements to render when condition is false (optional) */
  else?: TemplateElement[];
}

/**
 * Border style for box/table drawing
 */
export type BorderStyle = 'single' | 'double' | 'thick' | 'rounded' | 'dashed' | 'none';

/**
 * Border element for drawing boxes/lines
 */
export interface BorderElement {
  /** Element type identifier */
  type: 'border';
  /** Border style */
  style?: BorderStyle;
  /** Top-left corner character */
  topLeft?: string;
  /** Top-right corner character */
  topRight?: string;
  /** Bottom-left corner character */
  bottomLeft?: string;
  /** Bottom-right corner character */
  bottomRight?: string;
  /** Top border character */
  top?: string;
  /** Bottom border character */
  bottom?: string;
  /** Left border character */
  left?: string;
  /** Right border character */
  right?: string;
  /** Intersection character */
  cross?: string;
  /** Whether to draw top border */
  drawTop?: boolean;
  /** Whether to draw bottom border */
  drawBottom?: boolean;
  /** Whether to draw left border */
  drawLeft?: boolean;
  /** Whether to draw right border */
  drawRight?: boolean;
  /** Whether to fill inside with spaces */
  filled?: boolean;
  /** Inner padding (default: 0) */
  padding?: number;
}

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column header text */
  header: string;
  /** Width of column in characters */
  width: number;
  /** Text alignment for header */
  headerAlign?: TextAlign;
  /** Text alignment for cells */
  cellAlign?: TextAlign;
}

/**
 * Table row data
 */
export type TableRowData = Record<string, string | number>;

/**
 * Table element for drawing table-like structures
 */
export interface TableElement {
  /** Element type identifier */
  type: 'table';
  /** Table columns definition */
  columns: TableColumn[];
  /** Variable name of array to render as rows */
  rowsVar: string;
  /** Whether to draw header row */
  showHeader?: boolean;
  /** Border style for table */
  borderStyle?: BorderStyle;
  /** Whether to alternate row shading */
  alternateRows?: boolean;
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
  | { type: 'variable'; name: string; format?: string }
  | LoopElement
  | ConditionElement
  | BorderElement
  | TableElement;

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
      } else if (element.type === 'loop') {
        const items = this.getNestedValue(data, element.items);
        if (!Array.isArray(items)) {
          errors.push({
            field: element.items,
            message: `Loop variable '${element.items}' must be an array`,
            code: 'INVALID_LOOP_VARIABLE',
          });
        }
      } else if (element.type === 'condition') {
        // Condition validation is optional - conditions can reference missing data
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Render a single template element
   */
  private renderElement(element: TemplateElement, data: Record<string, unknown>): Uint8Array[] {
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
  private renderLoop(loop: LoopElement, data: Record<string, unknown>): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const items = this.getNestedValue(data, loop.items);

    if (!Array || !Array.isArray(items)) {
      this.logger.warn(`Loop variable '${loop.items}' is not an array`);
      return commands;
    }

    for (let i = 0; i < items.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const itemData: any = items[i];

      // Create iteration context with item and optionally index
      const context: Record<string, unknown> = {
        ...data,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        [loop.itemVar]: itemData,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      };

      if (loop.indexVar) {
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        context[loop.indexVar] = i;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
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
  private renderCondition(
    condition: ConditionElement,
    data: Record<string, unknown>
  ): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const value = this.getNestedValue(data, condition.variable);
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
  private evaluateCondition(
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
  private renderBorder(border: BorderElement): Uint8Array[] {
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
  private renderTable(table: TableElement, data: Record<string, unknown>): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const rows = this.getNestedValue(data, table.rowsVar);

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
  private alignText(text: string, width: number, align: TextAlign): string {
    const padded = text.padEnd(width).substring(0, width);
    switch (align) {
      case TextAlign.CENTER: {
        const leftPad = Math.floor((width - text.length) / 2);
        return text.padStart(leftPad + text.length).padEnd(width);
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
  private renderStandardElement(
    element: Exclude<
      TemplateElement,
      LoopElement | ConditionElement | BorderElement | TableElement
    >,
    data: Record<string, unknown>
  ): Uint8Array[] {
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
  private renderLine(char?: string, length?: number): Uint8Array[] {
    const lineChar = char ?? '-';
    const lineLength = length ?? this.paperWidth;
    const line = lineChar.repeat(lineLength);
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
      if (value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(value);
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
