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
import { TemplateParser } from './parsers/TemplateParser';
import { TemplateRenderer } from './engines/TemplateRenderer';

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
  barcodeFormat?: import('@/barcode').BarcodeFormat;
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
  headerAlign?: import('@/formatter').TextAlign;
  /** Text alignment for cells */
  cellAlign?: import('@/formatter').TextAlign;
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
  | {
      type: 'text';
      content: string;
      align?: import('@/formatter').TextAlign;
      size?: number;
      bold?: boolean;
    }
  | { type: 'line'; char?: string; length?: number }
  | { type: 'image'; data: Uint8Array; width: number; height: number }
  | { type: 'qrcode'; content: string; size?: number }
  | {
      type: 'barcode';
      content: string;
      format: import('@/barcode').BarcodeFormat;
      height?: number;
    }
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
 * Template Engine class
 * Facade for template parsing and rendering
 */
export class TemplateEngine implements ITemplateEngine {
  private readonly logger = Logger.scope('TemplateEngine');
  private readonly parser: TemplateParser;
  private readonly renderer: TemplateRenderer;
  private readonly templates: Map<string, TemplateDefinition> = new Map();

  /** Default paper width in characters (58mm paper ≈ 48 chars) */
  private static readonly DEFAULT_PAPER_WIDTH = 48;

  /**
   * Creates a new TemplateEngine instance
   */
  constructor(paperWidth = TemplateEngine.DEFAULT_PAPER_WIDTH) {
    this.parser = new TemplateParser();
    this.renderer = new TemplateRenderer(paperWidth);
  }

  /**
   * Render a receipt template
   */
  renderReceipt(data: ReceiptData): Uint8Array {
    return this.renderer.renderReceipt(data);
  }

  /**
   * Render a label template
   */
  renderLabel(data: LabelData): Uint8Array {
    return this.renderer.renderLabel(data);
  }

  /**
   * Render a custom template
   */
  render(template: TemplateDefinition, data: Record<string, unknown>): Uint8Array {
    return this.renderer.render(template, data);
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
    return this.parser.validate(template, data);
  }
}

// Export singleton instance for convenience
export const templateEngine = new TemplateEngine();
