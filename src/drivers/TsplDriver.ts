/**
 * TSPL Driver
 * TSC Printer Language driver for label/barcode printers
 * 
 * TSPL is commonly used in thermal transfer label printers (TSC, Zebra, etc.)
 */

import { Logger } from '@/utils/logger';
import { Encoding } from '@/utils/encoding';

/**
 * Label size configuration
 */
export interface LabelSize {
  /** Label width in mm */
  width: number;
  /** Label height in mm */
  height: number;
  /** Gap between labels in mm (default: 3) */
  gap?: number;
}

/**
 * Text position and style
 */
export interface TextOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Font size (1-8, default: 2) */
  font?: number;
  /** Rotation (0, 90, 180, 270, default: 0) */
  rotation?: 0 | 90 | 180 | 270;
  /** Horizontal multiplier (1-10, default: 1) */
  xMultiplier?: number;
  /** Vertical multiplier (1-10, default: 1) */
  yMultiplier?: number;
}

/**
 * Barcode options
 */
export interface BarcodeOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Barcode type */
  type: '128' | '39' | 'EAN13' | 'EAN8' | 'UPCA' | 'QRCODE';
  /** Height in dots (default: 100) */
  height?: number;
  /** Narrow bar width (default: 2) */
  narrow?: number;
  /** Wide bar width (default: 4) */
  wide?: number;
  /** Show human-readable text (default: true) */
  showText?: boolean;
  /** Rotation (0, 90, 180, 270, default: 0) */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * QR Code options
 */
export interface QRCodeOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Error correction level (L, M, Q, H, default: M) */
  eccLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Cell width (1-10, default: 6) */
  cellWidth?: number;
  /** Mode (A=Auto, M=Manual, default: A) */
  mode?: 'A' | 'M';
  /** Rotation (0, 90, 180, 270, default: 0) */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * Box/Rectangle options
 */
export interface BoxOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Width in dots */
  width: number;
  /** Height in dots */
  height: number;
  /** Line thickness (default: 2) */
  thickness?: number;
}

/**
 * Line options
 */
export interface LineOptions {
  /** Start X position in dots */
  x1: number;
  /** Start Y position in dots */
  y1: number;
  /** End X position in dots */
  x2: number;
  /** End Y position in dots */
  y2: number;
  /** Line thickness (default: 2) */
  thickness?: number;
}

/**
 * TSPL Driver for label printers
 * 
 * @example
 * ```typescript
 * const tspl = new TsplDriver();
 * 
 * const commands = tspl
 *   .size(60, 40)
 *   .gap(3)
 *   .clear()
 *   .text('Product Name', { x: 50, y: 50, font: 3 })
 *   .barcode('1234567890', { x: 50, y: 100, type: '128' })
 *   .print(1)
 *   .getBuffer();
 * ```
 */
export class TsplDriver {
  private commands: string[] = [];
  private readonly logger = Logger.scope('TsplDriver');
  private dpi = 203; // Default DPI for most label printers

  /**
   * Set printer DPI (dots per inch)
   * @param dpi - DPI value (203 or 300)
   */
  setDPI(dpi: 203 | 300): this {
    this.dpi = dpi;
    return this;
  }

  /**
   * Convert mm to dots
   */
  mmToDots(mm: number): number {
    return Math.round((mm * this.dpi) / 25.4);
  }

  /**
   * Convert dots to mm
   */
  dotsToMm(dots: number): number {
    return (dots * 25.4) / this.dpi;
  }

  /**
   * Set label size
   * @param width - Label width in mm
   * @param height - Label height in mm
   */
  size(width: number, height: number): this {
    this.commands.push(`SIZE ${width} mm, ${height} mm`);
    return this;
  }

  /**
   * Set gap between labels
   * @param gap - Gap size in mm
   * @param offset - Offset in mm (default: 0)
   */
  gap(gap: number, offset = 0): this {
    this.commands.push(`GAP ${gap} mm, ${offset} mm`);
    return this;
  }

  /**
   * Set print speed
   * @param speed - Speed level (1-10)
   */
  speed(speed: number): this {
    this.commands.push(`SPEED ${Math.min(10, Math.max(1, speed))}`);
    return this;
  }

  /**
   * Set print density
   * @param density - Density level (0-15)
   */
  density(density: number): this {
    this.commands.push(`DENSITY ${Math.min(15, Math.max(0, density))}`);
    return this;
  }

  /**
   * Set print direction
   * @param direction - 0=normal, 1=reversed
   */
  direction(direction: 0 | 1): this {
    this.commands.push(`DIRECTION ${direction}`);
    return this;
  }

  /**
   * Clear image buffer
   */
  clear(): this {
    this.commands.push('CLS');
    return this;
  }

  /**
   * Add text to label
   * @param content - Text content
   * @param options - Text options
   */
  text(content: string, options: TextOptions): this {
    const {
      x,
      y,
      font = 2,
      rotation = 0,
      xMultiplier = 1,
      yMultiplier = 1,
    } = options;

    // TEXT x, y, "font", rotation, x-mul, y-mul, "content"
    this.commands.push(
      `TEXT ${x},${y},"${font}",${rotation},${xMultiplier},${yMultiplier},"${this.escapeString(content)}"`
    );
    return this;
  }

  /**
   * Add barcode to label
   * @param content - Barcode content
   * @param options - Barcode options
   */
  barcode(content: string, options: BarcodeOptions): this {
    const {
      x,
      y,
      type,
      height = 100,
      narrow = 2,
      wide = 4,
      showText = true,
      rotation = 0,
    } = options;

    const readable = showText ? 1 : 0;

    if (type === 'QRCODE') {
      // Use QRCODE command instead
      return this.qrcode(content, { x, y, rotation });
    }

    // BARCODE x, y, "type", height, readable, rotation, narrow, wide, "content"
    this.commands.push(
      `BARCODE ${x},${y},"${type}",${height},${readable},${rotation},${narrow},${wide},"${content}"`
    );
    return this;
  }

  /**
   * Add QR code to label
   * @param content - QR code content
   * @param options - QR code options
   */
  qrcode(content: string, options: QRCodeOptions): this {
    const {
      x,
      y,
      eccLevel = 'M',
      cellWidth = 6,
      mode = 'A',
      rotation = 0,
    } = options;

    // QRCODE x, y, ECC level, cell width, mode, rotation, "content"
    this.commands.push(
      `QRCODE ${x},${y},${eccLevel},${cellWidth},${mode},${rotation},"${this.escapeString(content)}"`
    );
    return this;
  }

  /**
   * Draw a box/rectangle
   * @param options - Box options
   */
  box(options: BoxOptions): this {
    const { x, y, width, height, thickness = 2 } = options;
    this.commands.push(`BOX ${x},${y},${x + width},${y + height},${thickness}`);
    return this;
  }

  /**
   * Draw a line
   * @param options - Line options
   */
  line(options: LineOptions): this {
    const { x1, y1, x2, y2, thickness = 2 } = options;
    
    if (x1 === x2 || y1 === y2) {
      // Horizontal or vertical line - use BAR command
      const width = Math.abs(x2 - x1) || thickness;
      const height = Math.abs(y2 - y1) || thickness;
      this.commands.push(`BAR ${Math.min(x1, x2)},${Math.min(y1, y2)},${width},${height}`);
    } else {
      // Diagonal line - use DIAGONAL command if supported
      this.commands.push(`DIAGONAL ${x1},${y1},${thickness},${Math.sqrt((x2-x1)**2 + (y2-y1)**2)},${Math.atan2(y2-y1, x2-x1) * 180 / Math.PI}`);
    }
    return this;
  }

  /**
   * Fill a rectangular area
   * @param x - X position
   * @param y - Y position
   * @param width - Width
   * @param height - Height
   */
  bar(x: number, y: number, width: number, height: number): this {
    this.commands.push(`BAR ${x},${y},${width},${height}`);
    return this;
  }

  /**
   * Reverse a rectangular area (white becomes black and vice versa)
   * @param x - X position
   * @param y - Y position
   * @param width - Width
   * @param height - Height
   */
  reverse(x: number, y: number, width: number, height: number): this {
    this.commands.push(`REVERSE ${x},${y},${width},${height}`);
    return this;
  }

  /**
   * Print the label
   * @param copies - Number of copies (default: 1)
   * @param sets - Number of sets (default: 1)
   */
  print(copies = 1, sets = 1): this {
    this.commands.push(`PRINT ${copies},${sets}`);
    return this;
  }

  /**
   * Feed labels
   * @param count - Number of labels to feed
   */
  feed(count = 1): this {
    this.commands.push(`FORMFEED`);
    for (let i = 1; i < count; i++) {
      this.commands.push(`FORMFEED`);
    }
    return this;
  }

  /**
   * Cut paper (if cutter available)
   */
  cut(): this {
    this.commands.push('CUT');
    return this;
  }

  /**
   * Beep the buzzer
   */
  beep(): this {
    this.commands.push('BEEP');
    return this;
  }

  /**
   * Home the print head
   */
  home(): this {
    this.commands.push('HOME');
    return this;
  }

  /**
   * Escape special characters in string
   */
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * Get all commands as string
   */
  getCommands(): string {
    return this.commands.join('\r\n') + '\r\n';
  }

  /**
   * Get commands as buffer for sending to printer
   */
  getBuffer(): Uint8Array {
    const commandString = this.getCommands();
    this.logger.debug(`TSPL commands:\n${commandString}`);
    return Encoding.encode(commandString, 'ASCII');
  }

  /**
   * Clear all commands
   */
  reset(): this {
    this.commands = [];
    return this;
  }
}
