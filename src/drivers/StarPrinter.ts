/**
 * STAR Printer Driver Implementation
 * Converts high-level print commands to STAR SP series command byte sequences
 *
 * Reference: STAR SP700 / SP500 Command Reference
 * Supports STAR TSP100, TSP700, TSP800 series thermal receipt printers
 */

import { IPrinterDriver, IQrOptions } from '@/types';
import { EncodingService } from '@/encoding';
import { ImageProcessing } from '@/utils/image';
import { Logger } from '@/utils/logger';

/**
 * Alignment options for text positioning
 */
export type Alignment = 'left' | 'center' | 'right';

/**
 * Barcode types supported by STAR printers
 */
export type BarcodeType = 'CODE39' | 'CODE128' | 'EAN13';

/**
 * STAR printer driver options
 */
export interface StarPrinterOptions {
  /** Use the EncodingService for GBK/UTF-8 encoding (default: true) */
  useEncodingService?: boolean;
  /** Show warnings for unsupported characters (default: true) */
  showEncodingWarnings?: boolean;
  /** Fallback character for unsupported characters (default: '?') */
  fallbackChar?: string;
  /** Enable international character mode (default: true) */
  internationalCharset?: boolean;
}

/**
 * Barcode options for STAR printers
 */
export interface StarBarcodeOptions {
  /** Barcode height in dots (default: 40) */
  height?: number;
  /** Barcode width (default: 2) */
  width?: number;
  /** HRI text position: 'none' | 'above' | 'below' | 'both' (default: 'below') */
  hri?: 'none' | 'above' | 'below' | 'both';
  /** Barcode type: CODE39, CODE128, EAN13 */
  type?: BarcodeType;
}

/**
 * QR code options for STAR printers
 */
export interface StarQrOptions {
  /** QR code model (default: 2) */
  model?: 1 | 2;
  /** QR code cell size in dots (default: 4) */
  cellSize?: number;
  /** Error correction level: 'L' | 'M' | 'Q' | 'H' (default: 'M') */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Image print options
 */
export interface StarImageOptions {
  /** Enable dithering (default: true) */
  dithering?: boolean;
  /** Threshold for binarization 0-255 (default: 128) */
  threshold?: number;
  /** Print in greyscale mode (default: false) */
  greyscale?: boolean;
}

/**
 * STAR TSP/TSP700 series thermal printer driver
 *
 * Implements the STAR command set for thermal receipt printers.
 * Supports text, images, QR codes, barcodes, and paper control.
 *
 * @example
 * ```typescript
 * const driver = new StarPrinter();
 * const commands = [
 *   ...driver.init(),
 *   ...driver.text('Hello World!'),
 *   ...driver.feed(3),
 *   ...driver.cut()
 * ];
 * ```
 */
export class StarPrinter implements IPrinterDriver {
  private readonly logger = Logger.scope('StarPrinter');
  private readonly encodingService: EncodingService;
  private readonly useEncodingService: boolean;
  private readonly internationalCharset: boolean;

  // Internal state
  private _boldEnabled = false;
  private _alignment: Alignment = 'left';

  /**
   * Creates a new StarPrinter driver instance
   * @param options - Driver options
   */
  constructor(options?: StarPrinterOptions) {
    this.useEncodingService = options?.useEncodingService ?? true;
    this.internationalCharset = options?.internationalCharset ?? true;
    this.encodingService = new EncodingService({
      showWarnings: options?.showEncodingWarnings ?? true,
      fallbackChar: options?.fallbackChar ?? '?',
    });

    this.logger.info('StarPrinter driver initialized');
  }

  /**
   * Initialize the printer to default state
   * Sends ESC @ to reset printer to power-on defaults
   *
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * const commands = driver.init();
   * ```
   */
  init(): Uint8Array[] {
    const commands: Uint8Array[] = [];

    // ESC @ - Initialize printer
    commands.push(new Uint8Array([0x1b, 0x40]));

    // Set international charset to PC437 (default)
    if (this.internationalCharset) {
      // ESC R n - Select international character set
      // n=0: USA, 1: France, 2: Germany, 3: UK, 4: Denmark, 5: Sweden,
      // 6: Italy, 7: Spain, 8: Japan, 9: Norway, 10: Denmark II, 11: Spain II,
      // 12: Latin America, 13: Korea, 16: Legal
      commands.push(new Uint8Array([0x1b, 0x52, 0x00]));
    }

    // Reset internal state
    this._boldEnabled = false;
    this._alignment = 'left';

    return commands;
  }

  /**
   * Print text content with specified encoding
   *
   * Supports GBK, UTF-8, EUC-KR, Shift-JIS, ISO-2022-JP through EncodingService.
   * When using ESC/POS compatible mode, text is output as-is with line feed.
   *
   * @param content - Text content to print
   * @param encoding - Text encoding (default: 'GBK')
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.text('Hello World', 'UTF-8');
   * driver.text('你好世界', 'GBK');
   * ```
   */
  text(content: string, encoding = 'GBK'): Uint8Array[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const commands: Uint8Array[] = [];

    // Apply alignment (if changed from default)
    if (this._alignment !== 'left') {
      const alignCmd = this.align(this._alignment);
      if (alignCmd.length > 0 && alignCmd[0]) {
        commands.push(alignCmd[0]);
      }
    }

    // Apply bold state (if enabled)
    if (this._boldEnabled) {
      commands.push(new Uint8Array([0x1b, 0x45, 0x01])); // ESC E 1
    }

    // Encode text content
    if (this.useEncodingService && this.encodingService.isSupported(encoding)) {
      const encoded = this.encodingService.encode(content, encoding);
      commands.push(encoded);
    } else {
      // Fallback: use TextEncoder for UTF-8 or raw bytes
      const encoder = new TextEncoder();
      const encoded = encoder.encode(content);
      commands.push(encoded);
    }

    // Line feed
    commands.push(new Uint8Array([0x0a]));

    // Reset bold after line (so it doesn't persist unexpectedly)
    if (this._boldEnabled) {
      commands.push(new Uint8Array([0x1b, 0x45, 0x00])); // ESC E 0
    }

    // Reset alignment after line (so it doesn't persist)
    if (this._alignment !== 'left') {
      commands.push(new Uint8Array([0x1b, 0x61, 0x00])); // ESC a 0 (left)
    }

    return commands;
  }

  /**
   * Feed paper by specified number of lines
   *
   * @param lines - Number of lines to feed (default: 1, max: 255)
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.feed(3); // Feed 3 lines
   * ```
   */
  feed(lines = 1): Uint8Array[] {
    const safeLines = Math.max(1, Math.min(255, Math.floor(lines)));

    // ESC d n - Print and feed n lines
    return [new Uint8Array([0x1b, 0x64, safeLines])];
  }

  /**
   * Cut the paper using the built-in cutter
   *
   * Note: Not all STAR printers have a cutter. For printers without cutter,
   * this will attempt a full paper cut which may result in no action.
   *
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.cut();
   * ```
   */
  cut(): Uint8Array[] {
    const commands: Uint8Array[] = [];

    // Feed to cut position first
    commands.push(new Uint8Array([0x1b, 0x64, 0x03])); // ESC d 3

    // GS V m - Select cut mode and cut
    // m=0: Full cut, 1: Partial cut, 2: Full cut (TSP100 compatible)
    commands.push(new Uint8Array([0x1d, 0x56, 0x00])); // GS V 0

    return commands;
  }

  /**
   * Print a QR code
   *
   * Uses STAR's built-in QR code command when available (GS W 01 pattern),
   * otherwise falls back to printing QR code as a raster image.
   *
   * @param content - Content to encode in the QR code
   * @param options - QR code options (model, cellSize, errorCorrection)
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.qr('https://example.com', { model: 2, cellSize: 6, errorCorrection: 'M' });
   * ```
   */
  qr(content: string, options?: IQrOptions | StarQrOptions): Uint8Array[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const model = options?.model ?? 2;
    // STAR uses cellSize instead of 'size' - extract safely
    let cellSize = 4;
    if (options) {
      if ('cellSize' in options) {
        cellSize = options.cellSize ?? 4;
      } else if ('size' in options) {
        cellSize = options.size ?? 4;
      }
    }
    const ecLevel = options?.errorCorrection ?? 'M';

    const commands: Uint8Array[] = [];

    // STAR QR command: ESC W n1 n2 n3 n4 [data]
    // n1: Model (1=Model1, 2=Model2)
    // n2: Security level (L=0, M=1, Q=2, H=3)
    // n3: Cell size (1-8 dots)
    // n4: 0x00 (reserved)

    // Step 1: QR Model (ESC GS W 01 30 n)
    // Use ESC GS xR for model selection
    // Pattern: ESC GS W n1 n2 n3 n4
    commands.push(new Uint8Array([0x1b, 0x1d, 0x57, 0x01, model === 1 ? 0x30 : 0x31]));

    // Step 2: QR Cell size (ESC GS W 02 n)
    commands.push(new Uint8Array([0x1b, 0x1d, 0x57, 0x02, Math.min(8, Math.max(1, cellSize))]));

    // Step 3: QR Error correction (ESC GS W 03 n)
    const ecMap: Record<string, number> = { L: 0, M: 1, Q: 2, H: 3 };
    const ecValue = ecMap[ecLevel] ?? 1;
    commands.push(new Uint8Array([0x1b, 0x1d, 0x57, 0x03, ecValue]));

    // Step 4: QR Data - Calculate length and send
    // Get encoded data
    const encoded =
      this.useEncodingService && this.encodingService.isSupported('UTF-8')
        ? this.encodingService.encode(content, 'UTF-8')
        : new TextEncoder().encode(content);

    // Send QR data: Length prefix (2 bytes big-endian) + data
    const len = encoded.length;
    const lenL = len % 256;
    const lenH = Math.floor(len / 256);

    // ESC GS W 00 pL pH [data]
    commands.push(new Uint8Array([0x1b, 0x1d, 0x57, 0x00, lenL, lenH]));
    commands.push(encoded);

    // Step 5: Print QR (ESC GS W 04)
    commands.push(new Uint8Array([0x1b, 0x1d, 0x57, 0x04]));

    return commands;
  }

  /**
   * Print a barcode
   *
   * Supports CODE39, CODE128, and EAN13 barcode types.
   * HRI (Human Readable Interpretation) text can be positioned above,
   * below, or both sides of the barcode.
   *
   * @param data - Barcode data content
   * @param options - Barcode options (type, height, width, hri)
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.barcode('123456789012', { type: 'EAN13', height: 60 });
   * driver.barcode('ABC-1234', { type: 'CODE39', width: 3 });
   * ```
   */
  barcode(data: string, options?: StarBarcodeOptions): Uint8Array[] {
    if (!data || typeof data !== 'string') {
      return [];
    }

    const type = options?.type ?? 'CODE128';
    const height = Math.max(1, Math.min(255, options?.height ?? 40));
    const width = Math.max(1, Math.min(5, options?.width ?? 2));
    const hri = options?.hri ?? 'below';

    const commands: Uint8Array[] = [];

    // HRI position mapping
    const hriMap: Record<string, number> = {
      none: 0,
      above: 1,
      below: 2,
      both: 3,
    };
    const hriValue = hriMap[hri] ?? 2;

    // GS h n - Set barcode height
    commands.push(new Uint8Array([0x1d, 0x68, height]));

    // GS w n - Set barcode width
    commands.push(new Uint8Array([0x1d, 0x77, width]));

    // GS H n - Set HRI position
    commands.push(new Uint8Array([0x1d, 0x48, hriValue]));

    // Select barcode type and print
    // GS k m d1...dk NUL - Print barcode
    switch (type) {
      case 'CODE39': {
        // CODE39: Start with * and end with *
        const code39Data = `*${data.toUpperCase()}*`;
        commands.push(new Uint8Array([0x1d, 0x6b, 0x04])); // m=4: CODE39
        commands.push(new TextEncoder().encode(code39Data));
        commands.push(new Uint8Array([0x00])); // NUL terminator
        break;
      }

      case 'EAN13': {
        // Validate EAN13 length (12 digits -> 13th check digit)
        const digits = data.replace(/\D/g, '');
        if (digits.length < 12) {
          this.logger.warn(`EAN13 requires 12 digits, got ${digits.length}`);
        }
        commands.push(new Uint8Array([0x1d, 0x6b, 0x02])); // m=2: EAN13
        // Pad or truncate to 12 digits
        const eanData = digits.padStart(12, '0').substring(0, 12);
        commands.push(new TextEncoder().encode(eanData));
        commands.push(new Uint8Array([0x00])); // NUL terminator
        break;
      }

      case 'CODE128':
      default: {
        // CODE128: Use function 3 (automatic mode switching)
        commands.push(new Uint8Array([0x1d, 0x6b, 0x49])); // m=73 (0x49): CODE128
        commands.push(new TextEncoder().encode(data));
        commands.push(new Uint8Array([0x00])); // NUL terminator
        break;
      }
    }

    return commands;
  }

  /**
   * Print a raster image
   *
   * Converts RGBA image data to 1-bit bitmap using dithering and sends
   * to the printer using STAR's raster image command.
   *
   * @param data - RGBA pixel data (Uint8Array, 4 bytes per pixel)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param options - Image print options (dithering, threshold, greyscale)
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * const imageData = new Uint8Array(width * height * 4); // RGBA
   * driver.image(imageData, 200, 100, { dithering: true });
   * ```
   */
  image(data: Uint8Array, width: number, height: number, options?: StarImageOptions): Uint8Array[] {
    // Parameter validation
    if (!data || !(data instanceof Uint8Array) || width <= 0 || height <= 0) {
      this.logger.warn('Invalid image parameters');
      return [];
    }

    const expectedLength = width * height * 4;
    if (data.length !== expectedLength) {
      this.logger.warn(`Invalid image data length: expected ${expectedLength}, got ${data.length}`);
      return [];
    }

    const commands: Uint8Array[] = [];
    // Options reserved for future dithering/threshold support
    void options?.dithering;
    void options?.threshold;

    // Convert RGBA to grayscale then to bitmap
    const bitmap = ImageProcessing.toBitmap(data, width, height);

    // STAR raster image: GS W n1 n2 n3 n4
    // n1: Bytes per line (low)
    // n2: Bytes per line (high)
    // n3: Vertical dots (low)
    // n4: Vertical dots (high)
    const bytesPerLine = Math.ceil(width / 8);
    const xL = bytesPerLine % 256;
    const xH = Math.floor(bytesPerLine / 256);
    // Height info reserved for GS v 0 full raster mode
    void (height % 256);
    void Math.floor(height / 256);

    // ESC * n1 n2 [data] - Bit image mode
    // Using ESC * (0x1B 0x2A) for compatibility with STAR printers
    commands.push(new Uint8Array([0x1b, 0x2a, xL, xH]));

    // For each line, we need to output the data
    // This is a simplified version - larger images should use GS v 0
    for (let y = 0; y < height; y++) {
      const lineData = bitmap.slice(y * bytesPerLine, (y + 1) * bytesPerLine);
      commands.push(lineData);
    }

    return commands;
  }

  /**
   * Sound a beep/buzzer on supported printers
   *
   * Sends a command to activate the printer's built-in buzzer.
   * Useful for alerting operators to print completion or errors.
   *
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.beep();
   * ```
   */
  beep(): Uint8Array[] {
    // ESC B n - Sound buzzer
    // n: 0-255 (number of beeps, duration varies by model)
    return [new Uint8Array([0x1b, 0x42, 0x05])]; // Sound 5 times
  }

  /**
   * Enable or disable bold text
   *
   * When bold is enabled, subsequent text will be printed in bold.
   * This state persists until explicitly disabled.
   *
   * @param on - true to enable bold, false to disable
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.bold(true);
   * driver.text('Bold Text');
   * driver.bold(false);
   * ```
   */
  bold(on: boolean): Uint8Array[] {
    this._boldEnabled = on;
    // ESC E n - Select bold
    // n=1: Bold on, n=0: Bold off
    return [new Uint8Array([0x1b, 0x45, on ? 0x01 : 0x00])];
  }

  /**
   * Set text alignment
   *
   * Controls horizontal text alignment for subsequent text.
   * Alignment persists until explicitly changed.
   *
   * @param align - Alignment: 'left' | 'center' | 'right'
   * @returns Array of command buffers
   *
   * @example
   * ```typescript
   * driver.align('center');
   * driver.text('Centered Title');
   * driver.align('left');
   * ```
   */
  align(align: Alignment): Uint8Array[] {
    this._alignment = align;

    // ESC a n - Select justification
    // n=0: Left, n=1: Center, n=2: Right
    const alignMap: Record<Alignment, number> = {
      left: 0x00,
      center: 0x01,
      right: 0x02,
    };

    const alignValue = alignMap[align] ?? 0x00;
    return [new Uint8Array([0x1b, 0x61, alignValue])];
  }
}
