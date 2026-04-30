/**
 * ZPL Driver
 * Zebra Printer Language driver for Zebra label printers
 *
 * ZPL is the industry standard for industrial label printing
 */

import { Logger } from '@/utils/logger';
import { Encoding } from '@/utils/encoding';

/**
 * ZPL Label size configuration
 */
export interface ZplLabelSize {
  /** Label width in dots */
  width: number;
  /** Label height in dots */
  height: number;
  /** Label gap in dots (default: 0) */
  gap?: number;
}

/**
 * Text format options
 */
export interface ZplTextOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Font name (default: 0 for built-in) */
  font?: string;
  /** Font rotation: N=0, R=90, I=270, B=180 (default: N) */
  rotation?: 'N' | 'R' | 'I' | 'B';
  /** Horizontal magnification (1-10, default: 1) */
  xMultiplier?: number;
  /** Vertical magnification (1-10, default: 1) */
  yMultiplier?: number;
  /** Field orientation: N=normal, R=rotated, I=inverted, B=bottom-up */
  orientation?: 'N' | 'R' | 'I' | 'B';
}

/**
 * Barcode options
 */
export interface ZplBarcodeOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Barcode type: 128, 39, 93, EAN13, EAN8, UPCE, CODE51, etc. */
  type: '128' | '39' | '93' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' | 'CODE51' | 'MSI' | 'PLESSEY';
  /** Barcode height in dots (default: 50) */
  height?: number;
  /** Show human-readable text (default: Y) */
  showText?: 'Y' | 'N';
  /** Check digit: Y=validate, N=no check (default: Y) */
  checkDigit?: 'Y' | 'N';
  /** Interpretation line: Y=print, N=omit (default: Y) */
  interpretLine?: 'Y' | 'N';
  /** Interpretation line above: Y=above, N=below (default: N) */
  interpretLineAbove?: 'Y' | 'N';
}

/**
 * QR Code options
 */
export interface ZplQRCodeOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Model: 2 (default) or 1 */
  model?: 1 | 2;
  /** Magnification factor 1-10 (default: 4) */
  magnification?: number;
  /** Error correction level: L(~7%), M(~15%), Q(~25%), H(~30%) */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Box/Rectangle options
 */
export interface ZplBoxOptions {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Width in dots */
  width: number;
  /** Height in dots */
  height: number;
  /** Border thickness (default: 2) */
  borderThickness?: number;
  /** Corner rounding (0-10, default: 0) */
  cornerRounding?: number;
}

/**
 * ZPL Driver for Zebra label printers
 *
 * @example
 * ```typescript
 * const zpl = new ZplDriver();
 *
 * const commands = zpl
 *   .startFormat()
 *   .labelHome(10, 10)
 *   .text('Product Name', { x: 50, y: 50 })
 *   .barcode('1234567890', { x: 50, y: 150, type: '128' })
 *   .qrcode('https://example.com', { x: 300, y: 50 })
 *   .print()
 *   .getCommands();
 * ```
 */
export class ZplDriver {
  private commands: string[] = [];
  private readonly logger = Logger.scope('ZplDriver');

  /**
   * Initialize ZPL driver with default settings
   */
  constructor() {
    // Start with format start
    this.startFormat();
  }

  /**
   * Start label format (^XA)
   */
  startFormat(): this {
    this.commands.push('^XA');
    return this;
  }

  /**
   * End label format (^XZ)
   */
  endFormat(): this {
    this.commands.push('^XZ');
    return this;
  }

  /**
   * Set label home position
   * @param x - X position in dots
   * @param y - Y position in dots
   */
  labelHome(x: number, y: number): this {
    this.commands.push(`^FO${x},${y}`);
    return this;
  }

  /**
   * Set field data (^FD)
   * @param content - Field content
   */
  fieldData(content: string): this {
    this.commands.push(`^FD${this.escapeField(content)}`);
    return this;
  }

  /**
   * Set field origin
   * @param x - X position in dots
   * @param y - Y position in dots
   */
  fieldOrigin(x: number, y: number): this {
    this.commands.push(`^FO${x},${y}`);
    return this;
  }

  /**
   * Set print width
   * @param width - Width in dots
   */
  printWidth(width: number): this {
    this.commands.push(`^PW${width}`);
    return this;
  }

  /**
   * Set label length
   * @param length - Length in dots
   */
  labelLength(length: number): this {
    this.commands.push(`^LL${length}`);
    return this;
  }

  /**
   * Set label gap
   * @param gap - Gap in dots
   */
  labelGap(gap: number): this {
    this.commands.push(`^LS${gap}`);
    return this;
  }

  /**
   * Set print quantity
   * @param quantity - Number of labels
   */
  quantity(quantity: number): this {
    this.commands.push(`^PQ${quantity},0,1,Y`);
    return this;
  }

  /**
   * Add text to label
   * @param content - Text content
   * @param options - Text options
   */
  text(content: string, options?: ZplTextOptions): this {
    if (options) {
      const {
        x = 0,
        y = 0,
        font = '0',
        rotation = 'N',
        xMultiplier = 1,
        yMultiplier = 1,
      } = options;

      this.commands.push(
        `^FO${x},${y}^A${font}${rotation},${yMultiplier},${xMultiplier}^FD${this.escapeField(content)}^FS`
      );
    } else {
      // Simple text at current position
      this.commands.push(`^FD${this.escapeField(content)}^FS`);
    }
    return this;
  }

  /**
   * Add text with explicit field origin
   * @param content - Text content
   * @param x - X position
   * @param y - Y position
   * @param font - Font name (default: 0)
   * @param rotation - Rotation
   */
  textAt(
    content: string,
    x: number,
    y: number,
    font = '0',
    rotation: 'N' | 'R' | 'I' | 'B' = 'N'
  ): this {
    this.commands.push(`^FO${x},${y}^A${font}${rotation}^FD${this.escapeField(content)}^FS`);
    return this;
  }

  /**
   * Use built-in font
   * @param content - Text content
   * @param x - X position
   * @param y - Y position
   * @param height - Character height (40-400)
   * @param width - Character width (30-300)
   */
  font(content: string, x: number, y: number, height = 30, width = 20): this {
    this.commands.push(`^FO${x},${y}^A${height},${width}^FD${this.escapeField(content)}^FS`);
    return this;
  }

  /**
   * Add scalable font
   * @param content - Text content
   * @param x - X position
   * @param y - Y position
   * @param fontName - Font name (e.g., "0" for built-in, or loaded font name)
   * @param fontHeight - Height multiplier
   * @param fontWidth - Width multiplier
   */
  scalableText(
    content: string,
    x: number,
    y: number,
    fontName = '0',
    fontHeight = 30,
    fontWidth = 20
  ): this {
    this.commands.push(
      `^FO${x},${y}^A${fontName}N,${fontHeight},${fontWidth}^FD${this.escapeField(content)}^FS`
    );
    return this;
  }

  /**
   * Add barcode
   * @param content - Barcode content
   * @param options - Barcode options
   */
  barcode(content: string, options: ZplBarcodeOptions): this {
    const {
      x = 0,
      y = 0,
      type = '128',
      height = 50,
      showText = 'Y',
      checkDigit = 'N',
      interpretLine = 'Y',
      interpretLineAbove = 'N',
    } = options;

    this.commands.push(
      `^FO${x},${y}^B${type}${showText},${height},${interpretLine},${interpretLineAbove},${checkDigit}^FD${this.escapeField(content)}^FS`
    );
    return this;
  }

  /**
   * Add Code 128 barcode
   * @param content - Barcode content
   * @param x - X position
   * @param y - Y position
   * @param height - Barcode height
   */
  code128(content: string, x = 0, y = 0, height = 50): this {
    return this.barcode(content, { x, y, type: '128', height });
  }

  /**
   * Add Code 39 barcode
   * @param content - Barcode content
   * @param x - X position
   * @param y - Y position
   * @param height - Barcode height
   */
  code39(content: string, x = 0, y = 0, height = 50): this {
    return this.barcode(content, { x, y, type: '39', height, checkDigit: 'Y' });
  }

  /**
   * Add EAN-13 barcode
   * @param content - Barcode content (12 or 13 digits)
   * @param x - X position
   * @param y - Y position
   * @param height - Barcode height
   */
  ean13(content: string, x = 0, y = 0, height = 50): this {
    return this.barcode(content, { x, y, type: 'EAN13', height });
  }

  /**
   * Add QR code
   * @param content - QR code content
   * @param options - QR code options
   */
  qrcode(content: string, options?: ZplQRCodeOptions): this {
    const { x = 0, y = 0, model = 2, magnification = 4, errorCorrection = 'M' } = options || {};

    // Model 2 is the default
    // ZPL QR code uses fixed model 2 for better compatibility
    const qrModel = model === 1 ? '1' : '2';
    this.commands.push(
      `^FO${x},${y}^BQN,${qrModel},${magnification}^FD${errorCorrection},${this.escapeField(content)}^FS`
    );
    return this;
  }

  /**
   * Add rectangle/border
   * @param options - Box options
   */
  box(options: ZplBoxOptions): this {
    const { x = 0, y = 0, width, height, borderThickness = 2, cornerRounding = 0 } = options;

    this.commands.push(`^FO${x},${y}^GB${width},${height},${borderThickness},${cornerRounding}^FS`);
    return this;
  }

  /**
   * Add line
   * @param x1 - Start X
   * @param y1 - Start Y
   * @param x2 - End X
   * @param y2 - End Y
   * @param thickness - Line thickness
   */
  line(x1: number, y1: number, x2: number, y2: number, thickness = 2): this {
    const width = Math.abs(x2 - x1) || thickness;
    const height = Math.abs(y2 - y1) || thickness;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);

    this.commands.push(`^FO${x},${y}^GB${width},${height},${thickness}^FS`);
    return this;
  }

  /**
   * Add circle
   * @param x - Center X
   * @param y - Center Y
   * @param diameter - Diameter in dots
   * @param borderThickness - Border thickness
   */
  circle(x: number, y: number, diameter: number, borderThickness = 2): this {
    this.commands.push(`^FO${x},${y}^GC${diameter},${borderThickness}^FS`);
    return this;
  }

  /**
   * Add diagonal line
   * @param x - Start X
   * @param y - Start Y
   * @param width - Width
   * @param height - Height
   * @param thickness - Line thickness
   */
  diagonal(x: number, y: number, width: number, height: number, thickness = 2): this {
    this.commands.push(`^FO${x},${y}^GD${width},${height},${thickness}^FS`);
    return this;
  }

  /**
   * Add ellipse
   * @param x - Center X
   * @param y - Center Y
   * @param width - Width
   * @param height - Height
   * @param borderThickness - Border thickness
   */
  ellipse(x: number, y: number, width: number, height: number, borderThickness = 2): this {
    this.commands.push(`^FO${x},${y}^GE${width},${height},${borderThickness}^FS`);
    return this;
  }

  /**
   * Add image from raw bitmap using ZPL ^GFA (Graphic Field) command.
   * The bitmap should be 1-bit (monochrome) data where each bit represents a pixel.
   * @param x - X position in dots
   * @param y - Y position in dots
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param bitmap - 1-bit monochrome bitmap data (MSB first, row-major)
   */
  image(x: number, y: number, width: number, height: number, bitmap: Uint8Array): this {
    const bytesPerRow = Math.ceil(width / 8);
    const totalBytes = bytesPerRow * height;

    // Validate bitmap size
    if (bitmap.length < totalBytes) {
      this.logger.warn(
        `ZPL image bitmap size mismatch: expected ${totalBytes}, got ${bitmap.length}`
      );
    }

    // Convert bitmap bytes to hex string (uppercase)
    const hexData: string[] = [];
    const limit = Math.min(bitmap.length, totalBytes);
    for (let i = 0; i < limit; i++) {
      const byte = bitmap[i]!;
      hexData.push(byte.toString(16).padStart(2, '0').toUpperCase());
    }

    this.commands.push(`^FO${x},${y}`);
    this.commands.push(`^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData.join('')}`);
    this.commands.push('^FS');
    this.logger.debug(`ZPL image encoded: ${width}x${height} at (${x},${y})`);
    return this;
  }

  /**
   * Set darkness/print density
   * @param value - Darkness value (0-30, default: 15)
   */
  setDarkness(value = 15): this {
    this.commands.push(`~SD${Math.min(30, Math.max(0, Math.floor(value)))}`);
    return this;
  }

  /**
   * Set print speed
   * @param speed - Speed: 1=slowest, 2-5=medium, 6-13=fast, 14=max
   */
  setSpeed(speed: number): this {
    const safeSpeed = Math.min(14, Math.max(1, Math.floor(speed)));
    this.commands.push(`^PR${safeSpeed}`);
    return this;
  }

  /**
   * Print configuration label (useful for testing)
   */
  printConfigLabel(): this {
    this.commands.push('~WC');
    return this;
  }

  /**
   * Calibrate sensors
   */
  calibrate(): this {
    this.commands.push('~JC');
    return this;
  }

  /**
   * Reset printer
   */
  reset(): this {
    this.commands.push('^JUS');
    return this;
  }

  /**
   * Get all commands as string
   */
  getCommands(): string {
    // Ensure format is properly closed
    if (!this.commands[0]?.startsWith('^XA')) {
      this.startFormat();
    }
    if (!this.commands[this.commands.length - 1]?.startsWith('^XZ')) {
      this.endFormat();
    }
    return this.commands.join('\n');
  }

  /**
   * Get commands as buffer for sending to printer
   */
  getBuffer(): Uint8Array {
    const commandString = this.getCommands();
    this.logger.debug(`ZPL commands:\n${commandString}`);
    return Encoding.encode(commandString, 'UTF-8');
  }

  /**
   * Get raw command list
   */
  getCommandList(): string[] {
    return [...this.commands];
  }

  /**
   * Clear all commands
   */
  resetCommands(): this {
    this.commands = [];
    this.startFormat();
    return this;
  }

  /**
   * Print label (end format)
   */
  print(quantity = 1): this {
    this.quantity(quantity);
    this.endFormat();
    return this;
  }

  /**
   * Escape special characters in field data
   */
  private escapeField(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/\^/g, '\\^').replace(/~/g, '\\~');
  }
}
