/**
 * CPCL Driver
 * PCL commands for Compact Print Language - HP/Honeywell/Toddler printers
 *
 * CPCL is commonly used in mobile/portable thermal printers
 */

import { Logger } from '@/utils/logger';
import { Encoding } from '@/utils/encoding';
import { bitmapToHex } from '@/utils/bitmap';

/**
 * CPCL page size presets
 */
export type CPCLPageSize = 'A4' | 'A5' | 'LETTER' | '4X6' | '4X2' | '4X4' | '2.25X1.25' | 'CUSTOM';

/**
 * CPCL Text options
 */
export interface CpclTextOptions {
  /** X position in dots */
  x?: number;
  /** Y position in dots */
  y?: number;
  /** Font type: 0-6 (0=OCR, 1=OCR-B, 2=CG Triumvirate, etc.) */
  font?: number;
  /** Horizontal multiplier (1-8) */
  xMulti?: number;
  /** Vertical multiplier (1-8) */
  yMulti?: number;
  /** Rotation: 0, 90, 180, 270 */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * CPCL Barcode options
 */
export interface CpclBarcodeOptions {
  /** X position in dots */
  x?: number;
  /** Y position in dots */
  y?: number;
  /** Barcode type */
  type:
    | '128'
    | '39'
    | 'EAN13'
    | 'EAN8'
    | 'UPCA'
    | 'UPCE'
    | 'MSI'
    | 'PLESSEY'
    | 'PDF417'
    | 'DATAMATRIX'
    | 'QR';
  /** Barcode height in dots (default: 50) */
  height?: number;
  /** Wide bar width for 39 (default: 2) */
  wide?: number;
  /** Narrow bar width (default: 1) */
  narrow?: number;
  /** Show human-readable text (default: true) */
  readable?: boolean;
}

/**
 * CPCL QR Code options
 */
export interface CpclQRCodeOptions {
  /** X position in dots */
  x?: number;
  /** Y position in dots */
  y?: number;
  /** Model (default: 2) */
  model?: 1 | 2;
  /** Error correction level: L, M, Q, H */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  /** Cell size (default: 4) */
  cellSize?: number;
}

/**
 * CPCL Line options
 */
export interface CpclLineOptions {
  /** Start X position */
  x1: number;
  /** Start Y position */
  y1: number;
  /** End X position */
  x2: number;
  /** End Y position */
  y2: number;
  /** Line width/thickness */
  width?: number;
}

/**
 * CPCL Box options
 */
export interface CpclBoxOptions {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Border thickness */
  thickness?: number;
}

/**
 * CPCL Driver for HP, Honeywell, and Toddler portable printers
 *
 * @example
 * ```typescript
 * const cpcl = new CpclDriver();
 *
 * const commands = cpcl
 *   .pageStart()
 *   .text('Hello World!', { x: 50, y: 50 })
 *   .barcode('1234567890', { x: 50, y: 150, type: '128' })
 *   .qrcode('https://example.com', { x: 300, y: 50 })
 *   .pageEnd()
 *   .getCommands();
 * ```
 */
export class CpclDriver {
  private commands: string[] = [];
  private readonly logger = Logger.scope('CpclDriver');

  // Page dimensions
  private pageWidth = 576; // 4" at 144 DPI (common)
  private pageHeight = 0; // 0 = continuous

  /**
   * Initialize CPCL driver
   * @param width - Page width in dots
   * @param height - Page height in dots (0 = continuous)
   */
  constructor(width = 576, height = 0) {
    this.pageWidth = width;
    this.pageHeight = height;
  }

  /**
   * Set page size
   * @param width - Width in dots
   * @param height - Height in dots (0 = continuous)
   */
  setPageSize(width: number, height = 0): this {
    this.pageWidth = width;
    this.pageHeight = height;
    return this;
  }

  /**
   * Use standard page size
   * @param size - Preset size name
   */
  usePageSize(size: CPCLPageSize): this {
    const sizes: Record<CPCLPageSize, [number, number]> = {
      '4X6': [576, 864],
      '4X4': [576, 576],
      '4X2': [576, 288],
      '2.25X1.25': [324, 180],
      A4: [992, 1406],
      A5: [701, 992],
      LETTER: [1050, 1500],
      CUSTOM: [576, 0],
    };

    const [width, height] = sizes[size] || [576, 0];
    this.pageWidth = width;
    this.pageHeight = height;
    return this;
  }

  /**
   * Start a new page
   */
  pageStart(): this {
    this.commands.push(`! U1 SETLP 5 0 30`);
    this.commands.push(`! U1 PAGE WIDTH ${this.pageWidth}`);
    if (this.pageHeight > 0) {
      this.commands.push(`! U1 PAGE HEIGHT ${this.pageHeight}`);
    }
    this.commands.push('START');
    return this;
  }

  /**
   * End current page
   */
  pageEnd(): this {
    this.commands.push('END');
    return this;
  }

  /**
   * Form feed to next label
   */
  formFeed(): this {
    this.commands.push('FORM');
    return this;
  }

  /**
   * Set line print mode
   * @param font - Font number (0-6)
   * @param xMulti - Horizontal multiplier
   * @param yMulti - Vertical multiplier
   */
  setLinePrint(font = 5, xMulti = 0, yMulti = 30): this {
    this.commands.push(`! U1 SETLP ${font} ${xMulti} ${yMulti}`);
    return this;
  }

  /**
   * Set text font
   * @param font - Font: 0=OCR, 1=OCR-B, 2=CG Triumvirate Bold, 3-6=Various sizes
   * @param xMulti - Horizontal multiplier (1-8)
   * @param yMulti - Vertical multiplier (1-8)
   * @param rotation - Rotation angle
   */
  setFont(font = 3, xMulti = 1, yMulti = 1, rotation: 0 | 90 | 180 | 270 = 0): this {
    const rotationMap: Record<number, string> = { 0: 'N', 90: 'R', 180: 'B', 270: 'I' };
    const rot = rotationMap[rotation] || 'N';
    this.commands.push(`! U1 SETLP ${font} ${xMulti} ${yMulti} ${rot}`);
    return this;
  }

  /**
   * Add text at current position
   * @param content - Text content
   */
  text(content: string): this {
    this.commands.push(`! U1 TEXT ${this.escapeText(content)}`);
    return this;
  }

  /**
   * Add positioned text
   * @param content - Text content
   * @param options - Text options
   */
  textAt(content: string, options: CpclTextOptions): this {
    const { x = 0, y = 0, font = 3, xMulti = 1, yMulti = 1, rotation = 0 } = options;
    const rotationMap: Record<number, string> = { 0: 'N', 90: 'R', 180: 'B', 270: 'I' };
    const rot = rotationMap[rotation] || 'N';

    this.commands.push(`! U1 SETLP ${font} ${xMulti} ${yMulti} ${rot}`);
    this.commands.push(`! U1 ${x} ${y} TEXT ${this.escapeText(content)}`);
    return this;
  }

  /**
   * Add text using legacy command
   * @param content - Text content
   * @param x - X position
   * @param y - Y position
   * @param font - Font number
   */
  legacyText(content: string, x: number, y: number, font = 3): this {
    this.commands.push(`TEXT ${x} ${y} ${font} "${this.escapeText(content)}"`);
    return this;
  }

  /**
   * Add barcode at position
   * @param content - Barcode content
   * @param options - Barcode options
   */
  barcode(content: string, options: CpclBarcodeOptions): this {
    const {
      x = 0,
      y = 0,
      type = '128',
      height = 50,
      wide = 2,
      narrow = 1,
      readable = true,
    } = options;

    const readableFlag = readable ? 'B' : 'N';

    // CPCL barcode commands
    switch (type) {
      case '128':
        this.commands.push(
          `BARCODE 128 ${x} ${y} ${height} ${readableFlag} 0 ${narrow} ${wide} "${content}"`
        );
        break;
      case '39':
        this.commands.push(
          `BARCODE 39 ${x} ${y} ${height} ${readableFlag} ${wide} ${narrow} "${content}"`
        );
        break;
      case 'EAN13':
        this.commands.push(`BARCODE EAN13 ${x} ${y} ${height} ${readableFlag} "${content}"`);
        break;
      case 'EAN8':
        this.commands.push(`BARCODE EAN8 ${x} ${y} ${height} ${readableFlag} "${content}"`);
        break;
      case 'UPCA':
        this.commands.push(`BARCODE UPCA ${x} ${y} ${height} ${readableFlag} "${content}"`);
        break;
      case 'UPCE':
        this.commands.push(`BARCODE UPCE ${x} ${y} ${height} ${readableFlag} "${content}"`);
        break;
      case 'PDF417':
        this.commands.push(`BARCODE PDF417 ${x} ${y} 6 200 "${content}"`);
        break;
      case 'DATAMATRIX':
        this.commands.push(`BARCODE DATAMATRIX ${x} ${y} 200 "${content}"`);
        break;
      case 'QR':
        // QR uses separate command
        this.qrcode(content, { x, y });
        break;
      default:
        this.commands.push(
          `BARCODE 128 ${x} ${y} ${height} ${readableFlag} 0 ${narrow} ${wide} "${content}"`
        );
    }

    return this;
  }

  /**
   * Add Code 128 barcode (most common)
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
    return this.barcode(content, { x, y, type: '39', height, wide: 2, narrow: 1 });
  }

  /**
   * Add QR code
   * @param content - QR code content
   * @param options - QR options
   */
  qrcode(content: string, options?: CpclQRCodeOptions): this {
    const { x = 0, y = 0, model = 2, errorCorrection = 'M', cellSize = 4 } = options || {};
    this.commands.push(
      `BARCODE QR ${x} ${y} ${model} ${cellSize} A ${errorCorrection} "${content}"`
    );
    return this;
  }

  /**
   * Add 2D barcode (PDF417 or DataMatrix)
   * @param content - Content
   * @param type - Type: PDF417 or DATAMATRIX
   * @param x - X position
   * @param y - Y position
   * @param height - Height
   */
  twoDBarcode(content: string, type: 'PDF417' | 'DATAMATRIX', x = 0, y = 0, height = 200): this {
    if (type === 'PDF417') {
      this.commands.push(`BARCODE PDF417 ${x} ${y} 6 ${height} "${content}"`);
    } else {
      this.commands.push(`BARCODE DATAMATRIX ${x} ${y} ${height} "${content}"`);
    }
    return this;
  }

  /**
   * Add line
   * @param options - Line options
   */
  line(options: CpclLineOptions): this {
    const { x1, y1, x2, y2, width = 1 } = options;
    this.commands.push(`LINE ${x1} ${y1} ${x2} ${y2} ${width}`);
    return this;
  }

  /**
   * Add box/rectangle
   * @param options - Box options
   */
  box(options: CpclBoxOptions): this {
    const { x, y, width, height, thickness = 1 } = options;
    this.commands.push(`BOX ${x} ${y} ${width} ${height} ${thickness}`);
    return this;
  }

  /**
   * Add inverse area (white on black)
   * @param x - X position
   * @param y - Y position
   * @param width - Width
   * @param height - Height
   */
  inverse(x: number, y: number, width: number, height: number): this {
    this.commands.push(`INVERSE ${width} ${height} ${x} ${y}`);
    return this;
  }

  /**
   * Set print density
   * @param density - Density value (-50 to +50)
   */
  setDensity(density: number): this {
    const safeDensity = Math.min(50, Math.max(-50, density));
    this.commands.push(`! U1 SETDENSITY ${safeDensity}`);
    return this;
  }

  /**
   * Set speed
   * @param speed - Speed: 2-6 (2=50%, 3=75%, 4=100%, 5=125%, 6=150%)
   */
  setSpeed(speed: number): this {
    const safeSpeed = Math.min(6, Math.max(2, speed));
    this.commands.push(`! U1 SETSPEED ${safeSpeed}`);
    return this;
  }

  /**
   * Cut paper (if cutter installed)
   */
  cut(): this {
    this.commands.push('CUT');
    return this;
  }

  /**
   * Partial cut
   */
  partialCut(): this {
    this.commands.push('PCUT');
    return this;
  }

  /**
   * Feed and cut
   */
  feedCut(): this {
    this.commands.push('FEED CUT');
    return this;
  }

  /**
   * Sound beep
   * @param count - Number of beeps
   * @param duration - Duration in 10ms units
   */
  beep(count = 1, duration = 5): this {
    this.commands.push(`BEEP ${count} ${duration}`);
    return this;
  }

  /**
   * Add logo/image
   * @param x - X position
   * @param y - Y position
   * @param logoName - Stored logo name
   */
  logo(x: number, y: number, logoName: string): this {
    this.commands.push(`LOGO ${x} ${y} "${logoName}"`);
    return this;
  }

  /**
   * Download logo to printer memory (macro/form storage).
   * Encodes bitmap using CPCL CG (Compressed Graphic) command.
   * The bitmap should be 1-bit monochrome data.
   * @param logoName - Name to store logo as
   * @param bitmap - 1-bit monochrome bitmap data (MSB first, row-major)
   * @param options - Optional width and height (will be inferred from bitmap size if omitted)
   */
  downloadLogo(
    logoName: string,
    bitmap: Uint8Array,
    options?: { width?: number; height?: number }
  ): this {
    const width = options?.width ?? 100;
    const bytesPerRow = Math.ceil(width / 8);
    const height = options?.height ?? Math.max(1, Math.floor(bitmap.length / bytesPerRow));
    const totalBytes = bytesPerRow * height;

    // Validate bitmap size
    if (bitmap.length < totalBytes) {
      this.logger.warn(
        `CPCL logo bitmap size mismatch: expected ${totalBytes}, got ${bitmap.length}`
      );
    }

    // Convert bitmap bytes to hex string (uppercase)
    const hexStr = bitmapToHex(bitmap, totalBytes);

    // CPCL macro definition with graphic data
    this.commands.push(`! DF ${logoName}`);
    this.commands.push(`CG ${totalBytes} ${bytesPerRow} ${height} ${hexStr}`);
    this.commands.push(`! DF`);
    this.logger.debug(`CPCL logo downloaded: ${logoName} (${width}x${height})`);
    return this;
  }

  /**
   * Print stored logo
   * @param logoName - Logo name
   * @param x - X position
   * @param y - Y position
   */
  printLogo(logoName: string, x = 0, y = 0): this {
    this.commands.push(`LOGO ${x} ${y} "${logoName}"`);
    return this;
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
    this.logger.debug(`CPCL commands:\n${commandString}`);
    return Encoding.encode(commandString, 'ASCII');
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
  reset(): this {
    this.commands = [];
    return this;
  }

  /**
   * Get page width
   */
  getPageWidth(): number {
    return this.pageWidth;
  }

  /**
   * Escape special characters in text
   */
  private escapeText(str: string): string {
    return str.replace(/"/g, '""');
  }
}
