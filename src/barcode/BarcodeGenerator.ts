/**
 * Barcode Generator
 *
 * Generates ESC/POS commands for printing 1D barcodes and 2D codes.
 * Supports Code128, Code39, EAN-13, EAN-8, UPC-A, ITF, CODABAR, QR_CODE, and PDF417 formats.
 *
 * @example
 * ```typescript
 * const generator = new BarcodeGenerator();
 * const commands = generator.generate('1234567890128', {
 *   format: BarcodeFormat.EAN13,
 *   height: 80,
 *   showText: true
 * });
 * ```
 */

/**
 * Supported barcode formats
 */
export enum BarcodeFormat {
  /** Code 128 - Variable length, alphanumeric */
  CODE128 = 'CODE128',
  /** Code 39 - Variable length, alphanumeric with special chars */
  CODE39 = 'CODE39',
  /** EAN-13 - 13 digits (12 + check digit) */
  EAN13 = 'EAN13',
  /** EAN-8 - 8 digits (7 + check digit) */
  EAN8 = 'EAN8',
  /** UPC-A - 12 digits (11 + check digit) */
  UPCA = 'UPCA',
  /** ITF (Interleaved 2 of 5) - Even number of digits */
  ITF = 'ITF',
  /** CODABAR - Numeric with special start/stop chars */
  CODABAR = 'CODABAR',
  /** QR Code - 2D matrix code */
  QR_CODE = 'QR_CODE',
  /** PDF417 - 2D stacked barcode */
  PDF417 = 'PDF417',
}

/**
 * Barcode configuration options
 */
export interface BarcodeOptions {
  /** Barcode format */
  format: BarcodeFormat;
  /** Barcode height in dots (1-255, default: 80) */
  height?: number;
  /** Barcode module width (2-6, default: 3) */
  width?: number;
  /** Show human-readable text */
  showText?: boolean;
  /** Text position */
  textPosition?: 'above' | 'below' | 'both' | 'none';
  /** QR code error correction level (L/M/Q/H, default: M) */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  /** QR code model (1 or 2, default: 2) */
  qrModel?: 1 | 2;
  /** PDF417 compression mode (0-3, default: 2) */
  pdf417Compression?: 0 | 1 | 2 | 3;
  /** PDF417 security level (0-8, default: 2) */
  pdf417Security?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** PDF417 columns (1-30, default: 2) */
  pdf417Columns?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Barcode generator interface
 */
export interface IBarcodeGenerator {
  /** Generate barcode commands */
  generate(content: string, options: BarcodeOptions): Uint8Array[];
  /** Validate barcode content */
  validate(content: string, format: BarcodeFormat): ValidationResult;
  /** Get supported formats */
  getSupportedFormats(): BarcodeFormat[];
}

/**
 * ESC/POS command constants
 */
const GS = 0x1d;
const ESC = 0x1b;

/**
 * ESC/POS barcode type codes (GS k m)
 */
const BARCODE_TYPES: Record<BarcodeFormat, number> = {
  [BarcodeFormat.UPCA]: 65, // GS k 65
  [BarcodeFormat.EAN13]: 67, // GS k 67
  [BarcodeFormat.EAN8]: 68, // GS k 68
  [BarcodeFormat.CODE39]: 69, // GS k 69
  [BarcodeFormat.ITF]: 70, // GS k 70
  [BarcodeFormat.CODABAR]: 71, // GS k 71
  [BarcodeFormat.CODE128]: 73, // GS k 73
  [BarcodeFormat.QR_CODE]: 80, // GS k 80 (PDF moved to 81)
  [BarcodeFormat.PDF417]: 81, // GS k 81
};

/**
 * QR code error correction levels
 */
const QR_ERROR_CORRECTION_CODES: Record<string, number> = {
  L: 48, // 0x30
  M: 49, // 0x31
  Q: 50, // 0x32
  H: 51, // 0x33
};

/**
 * QR code models
 */
const QR_MODEL_CODES: Record<number, number> = {
  1: 49, // 0x31
  2: 50, // 0x32
};

/**
 * Text position codes for ESC/POS
 */
const TEXT_POSITION_CODES: Record<string, number> = {
  none: 0,
  above: 1,
  below: 2,
  both: 3,
};

/**
 * PDF417 compression modes
 */
const PDF417_COMPRESSION_CODES: Record<number, number> = {
  0: 48, // 0x30 - linear
  1: 49, // 0x31 - compressed
  2: 50, // 0x32 - enhanced
  3: 51, // 0x33 - auto
};

/**
 * Barcode Generator class
 * Generates ESC/POS commands for 1D barcodes and 2D codes
 */
export class BarcodeGenerator implements IBarcodeGenerator {
  /**
   * Generate barcode ESC/POS commands
   *
   * @param content - Barcode content/data
   * @param options - Barcode options
   * @returns Array of ESC/POS command buffers
   */
  generate(content: string, options: BarcodeOptions): Uint8Array[] {
    // Validate content first
    const validation = this.validate(content, options.format);
    if (!validation.valid) {
      return [];
    }

    // Handle 2D codes separately
    if (options.format === BarcodeFormat.QR_CODE) {
      return this.generateQRCode(content, options);
    }

    if (options.format === BarcodeFormat.PDF417) {
      return this.generatePDF417(content, options);
    }

    // 1D barcode generation
    return this.generate1DBarcode(content, options);
  }

  /**
   * Generate 1D barcode commands
   */
  private generate1DBarcode(content: string, options: BarcodeOptions): Uint8Array[] {
    const commands: Uint8Array[] = [];

    // 1. Set barcode height: GS h n (n = 1-255)
    const height = this.clampHeight(options.height ?? 80);
    commands.push(new Uint8Array([GS, 0x68, height]));

    // 2. Set barcode width: GS w n (n = 2-6)
    const width = this.clampWidth(options.width ?? 3);
    commands.push(new Uint8Array([GS, 0x77, width]));

    // 3. Set HRI (Human Readable Interpretation) position: GS H n
    const textPos = this.getTextPosition(options);
    commands.push(new Uint8Array([GS, 0x48, textPos]));

    // 4. Print barcode: GS k m n d1...dn
    const barcodeType = BARCODE_TYPES[options.format];
    const data = this.encodeContent(content, options.format);

    // GS k m n d1...dn format (m >= 65)
    commands.push(new Uint8Array([GS, 0x6b, barcodeType, data.length, ...data]));

    return commands;
  }

  /**
   * Generate QR code commands using ESC/POS GS k 80-83
   *
   * @param content - QR code content
   * @param options - QR code options
   * @returns Array of ESC/POS command buffers
   */
  private generateQRCode(content: string, options: BarcodeOptions): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const model = options.qrModel ?? 2;
    const size = this.clampQRSize(options.height ?? 6);
    const errorLevel = options.errorCorrection ?? 'M';

    // 1. Set QR code model: GS ( k 04 00 31 41 50 n
    // pH=0, pL=4, cn=31 (1), fn=65 (A), 50=0, n=model(1 or 2)
    const qrModelCode = QR_MODEL_CODES[model] ?? 50;
    commands.push(new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x50, qrModelCode]));

    // 2. Set QR code size (module size): GS ( k 03 00 31 43 n
    commands.push(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]));

    // 3. Set error correction level: GS ( k 03 00 31 45 n
    const qrErrorCode = QR_ERROR_CORRECTION_CODES[errorLevel] ?? 49;
    commands.push(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, qrErrorCode]));

    // 4. Store data: GS ( k pL pH 31 50 30 d1...dk
    const dataBytes = this.encodeUTF8(content);
    const storeLen = dataBytes.length + 3;
    commands.push(
      new Uint8Array([
        GS,
        0x28,
        0x6b,
        storeLen & 0xff,
        (storeLen >> 8) & 0xff,
        0x31,
        0x50,
        0x30,
        ...dataBytes,
      ])
    );

    // 5. Print QR code: GS ( k 03 00 31 51 30
    commands.push(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));

    return commands;
  }

  /**
   * Generate PDF417 commands using ESC/POS GS k 81
   *
   * PDF417 is a 2D stacked barcode format supported by many thermal printers.
   * The printer will handle the actual encoding and generation of the PDF417 symbol.
   *
   * @param content - PDF417 content (text data)
   * @param options - PDF417 options
   * @returns Array of ESC/POS command buffers
   */
  private generatePDF417(content: string, options: BarcodeOptions): Uint8Array[] {
    const commands: Uint8Array[] = [];
    const compression = options.pdf417Compression ?? 2;
    const security = options.pdf417Security ?? 2;
    const columns = this.clampPDF417Columns(options.pdf417Columns ?? 2);

    // 1. Set PDF417 parameters: GS ( k 07 00 31 30 n1 n2 n3 n4
    // n1 = columns (1-30), n2 = security level (0-8), n3 = truncation (0=none), n4 = reserved
    commands.push(
      new Uint8Array([
        GS,
        0x28,
        0x6b,
        0x07,
        0x00,
        0x31,
        0x30, // Function 30 (PDF417 set)
        columns,
        security,
        0, // truncation off
        0, // reserved
      ])
    );

    // 2. Set data compression mode: ESC ] 04 n
    const pdfCompressionCode = PDF417_COMPRESSION_CODES[compression] ?? 50;
    commands.push(new Uint8Array([ESC, 0x5d, 0x04, pdfCompressionCode]));

    // 3. Store PDF417 data: GS k 81 pL pH d1...dk
    const dataBytes = this.encodeUTF8(content);
    const storeLen = dataBytes.length + 3;
    commands.push(
      new Uint8Array([GS, 0x6b, 81, storeLen & 0xff, (storeLen >> 8) & 0xff, ...dataBytes])
    );

    // 4. Print PDF417: GS k 81 00 (alternative form if needed)
    // Actually for PDF417 print: GS ( k 03 00 31 51 31
    commands.push(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x31]));

    return commands;
  }

  /**
   * Validate barcode content for the specified format
   *
   * @param content - Barcode content to validate
   * @param format - Barcode format
   * @returns Validation result
   */
  validate(content: string, format: BarcodeFormat): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Common validation for all formats
    if (content === null || content === undefined) {
      errors.push({
        field: 'content',
        message: 'Barcode content is required',
        code: 'REQUIRED',
      });
      return { valid: false, errors };
    }

    if (typeof content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Barcode content must be a string',
        code: 'INVALID_TYPE',
      });
      return { valid: false, errors };
    }

    if (content.length === 0) {
      errors.push({
        field: 'content',
        message: 'Barcode content cannot be empty',
        code: 'REQUIRED',
      });
      return { valid: false, errors };
    }

    // Validate minimum content length for 2D codes
    if (format === BarcodeFormat.QR_CODE && content.length > 7089) {
      errors.push({
        field: 'content',
        message: 'QR code content exceeds maximum length (7089 bytes for binary mode)',
        code: 'CONTENT_TOO_LONG',
      });
    }

    if (format === BarcodeFormat.PDF417 && content.length > 1850) {
      errors.push({
        field: 'content',
        message: 'PDF417 content exceeds maximum length (~1850 bytes)',
        code: 'CONTENT_TOO_LONG',
      });
    }

    switch (format) {
      case BarcodeFormat.EAN13:
        this.validateEAN13(content, errors);
        break;
      case BarcodeFormat.EAN8:
        this.validateEAN8(content, errors);
        break;
      case BarcodeFormat.UPCA:
        this.validateUPCA(content, errors);
        break;
      case BarcodeFormat.CODE39:
        this.validateCode39(content, errors);
        break;
      case BarcodeFormat.CODE128:
        this.validateCode128(content, errors);
        break;
      case BarcodeFormat.ITF:
        this.validateITF(content, errors);
        break;
      case BarcodeFormat.CODABAR:
        this.validateCodabar(content, errors);
        break;
      case BarcodeFormat.QR_CODE:
        this.validateQRCode(content, errors);
        break;
      case BarcodeFormat.PDF417:
        this.validatePDF417(content, errors);
        break;
      default: {
        errors.push({
          field: 'format',
          message: `Unsupported barcode format: ${String(format)}`,
          code: 'UNSUPPORTED_FORMAT',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate QR code content
   */
  private validateQRCode(content: string, errors: ValidationResult['errors']): void {
    if (content.length === 0) {
      errors.push({
        field: 'content',
        message: 'QR code content cannot be empty',
        code: 'REQUIRED',
      });
    }

    // Check for invalid characters in numeric/alphanumeric mode (if we were using those)
    // For byte mode, all characters 0-255 are valid
    if (content.length > 7089) {
      errors.push({
        field: 'content',
        message: 'QR code content exceeds maximum binary mode length',
        code: 'CONTENT_TOO_LONG',
      });
    }
  }

  /**
   * Validate PDF417 content
   */
  private validatePDF417(content: string, errors: ValidationResult['errors']): void {
    if (content.length === 0) {
      errors.push({
        field: 'content',
        message: 'PDF417 content cannot be empty',
        code: 'REQUIRED',
      });
    }

    if (content.length > 1850) {
      errors.push({
        field: 'content',
        message: 'PDF417 content exceeds maximum length',
        code: 'CONTENT_TOO_LONG',
      });
    }

    // PDF417 supports ASCII 0-127 in text mode
    let hasHighChars = false;
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (code > 127) {
        hasHighChars = true;
        break;
      }
    }

    if (hasHighChars) {
      errors.push({
        field: 'content',
        message:
          'PDF417 standard mode only supports ASCII characters. Consider using compression mode.',
        code: 'INVALID_CHARACTERS',
      });
    }
  }

  /**
   * Get list of supported barcode formats
   *
   * @returns Array of supported formats
   */
  getSupportedFormats(): BarcodeFormat[] {
    return Object.values(BarcodeFormat);
  }

  /**
   * Validate EAN-13 content
   */
  private validateEAN13(content: string, errors: ValidationResult['errors']): void {
    // EAN-13 must be 12 or 13 digits
    if (!/^\d{12,13}$/.test(content)) {
      errors.push({
        field: 'content',
        message: 'EAN-13 must be 12 or 13 digits',
        code: 'INVALID_LENGTH',
      });
      return;
    }

    // Validate check digit if 13 digits provided
    if (content.length === 13) {
      const checkDigit = this.calculateEANCheckDigit(content.substring(0, 12));
      const lastDigit = content[12];
      if (lastDigit !== undefined && parseInt(lastDigit) !== checkDigit) {
        errors.push({
          field: 'content',
          message: 'Invalid EAN-13 check digit',
          code: 'INVALID_CHECK_DIGIT',
        });
      }
    }
  }

  /**
   * Validate EAN-8 content
   */
  private validateEAN8(content: string, errors: ValidationResult['errors']): void {
    // EAN-8 must be 7 or 8 digits
    if (!/^\d{7,8}$/.test(content)) {
      errors.push({
        field: 'content',
        message: 'EAN-8 must be 7 or 8 digits',
        code: 'INVALID_LENGTH',
      });
      return;
    }

    // Validate check digit if 8 digits provided
    if (content.length === 8) {
      const checkDigit = this.calculateEANCheckDigit(content.substring(0, 7));
      const lastDigit = content[7];
      if (lastDigit !== undefined && parseInt(lastDigit) !== checkDigit) {
        errors.push({
          field: 'content',
          message: 'Invalid EAN-8 check digit',
          code: 'INVALID_CHECK_DIGIT',
        });
      }
    }
  }

  /**
   * Validate UPC-A content
   */
  private validateUPCA(content: string, errors: ValidationResult['errors']): void {
    // UPC-A must be 11 or 12 digits
    if (!/^\d{11,12}$/.test(content)) {
      errors.push({
        field: 'content',
        message: 'UPC-A must be 11 or 12 digits',
        code: 'INVALID_LENGTH',
      });
      return;
    }

    // Validate check digit if 12 digits provided
    if (content.length === 12) {
      const checkDigit = this.calculateUPCACheckDigit(content.substring(0, 11));
      const lastDigit = content[11];
      if (lastDigit !== undefined && parseInt(lastDigit) !== checkDigit) {
        errors.push({
          field: 'content',
          message: 'Invalid UPC-A check digit',
          code: 'INVALID_CHECK_DIGIT',
        });
      }
    }
  }

  /**
   * Validate Code 39 content
   */
  private validateCode39(content: string, errors: ValidationResult['errors']): void {
    // Code 39 supports: 0-9, A-Z, space, - . $ / + %
    // eslint-disable-next-line no-useless-escape
    const validChars = /^[0-9A-Z\s\-.$\/+%]+$/;
    if (!validChars.test(content.toUpperCase())) {
      errors.push({
        field: 'content',
        message: 'Code 39 only supports: 0-9, A-Z, space, - . $ / + %',
        code: 'INVALID_CHARACTERS',
      });
    }

    if (content.length === 0 || content.length > 255) {
      errors.push({
        field: 'content',
        message: 'Code 39 content must be 1-255 characters',
        code: 'INVALID_LENGTH',
      });
    }
  }

  /**
   * Validate Code 128 content
   */
  private validateCode128(content: string, errors: ValidationResult['errors']): void {
    // Code 128 supports ASCII 0-127
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) > 127) {
        errors.push({
          field: 'content',
          message: 'Code 128 only supports ASCII characters (0-127)',
          code: 'INVALID_CHARACTERS',
        });
        break;
      }
    }

    if (content.length === 0 || content.length > 255) {
      errors.push({
        field: 'content',
        message: 'Code 128 content must be 1-255 characters',
        code: 'INVALID_LENGTH',
      });
    }
  }

  /**
   * Validate ITF content
   */
  private validateITF(content: string, errors: ValidationResult['errors']): void {
    // ITF must be numeric and even length
    if (!/^\d+$/.test(content)) {
      errors.push({
        field: 'content',
        message: 'ITF only supports numeric characters',
        code: 'INVALID_CHARACTERS',
      });
    }

    if (content.length % 2 !== 0) {
      errors.push({
        field: 'content',
        message: 'ITF content must have even number of digits',
        code: 'INVALID_LENGTH',
      });
    }

    if (content.length === 0 || content.length > 255) {
      errors.push({
        field: 'content',
        message: 'ITF content must be 2-254 digits (even)',
        code: 'INVALID_LENGTH',
      });
    }
  }

  /**
   * Validate CODABAR content
   */
  private validateCodabar(content: string, errors: ValidationResult['errors']): void {
    // CODABAR supports: 0-9, - $ : / . +
    // Start/stop characters: A, B, C, D (or a, b, c, d)
    const validChars = /^[ABCDabcd][0-9\-$:/.+]+[ABCDabcd]$/;
    if (!validChars.test(content)) {
      errors.push({
        field: 'content',
        message: 'CODABAR must start and end with A/B/C/D and contain only 0-9, - $ : / . +',
        code: 'INVALID_FORMAT',
      });
    }

    if (content.length < 3 || content.length > 255) {
      errors.push({
        field: 'content',
        message: 'CODABAR content must be 3-255 characters',
        code: 'INVALID_LENGTH',
      });
    }
  }

  /**
   * Calculate EAN check digit (works for EAN-13 and EAN-8)
   */
  private calculateEANCheckDigit(digits: string): number {
    let sum = 0;
    const len = digits.length;

    for (let i = 0; i < len; i++) {
      const char = digits[i];
      if (char === undefined) continue;
      const digit = parseInt(char);
      // For EAN-13: odd positions (0,2,4...) multiply by 1, even by 3
      // For EAN-8: same pattern
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    return (10 - (sum % 10)) % 10;
  }

  /**
   * Calculate UPC-A check digit
   */
  private calculateUPCACheckDigit(digits: string): number {
    let sum = 0;

    for (let i = 0; i < 11; i++) {
      const char = digits[i];
      if (char === undefined) continue;
      const digit = parseInt(char);
      // Odd positions (0,2,4...) multiply by 3, even by 1
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }

    return (10 - (sum % 10)) % 10;
  }

  /**
   * Encode content for ESC/POS barcode command
   */
  private encodeContent(content: string, format: BarcodeFormat): number[] {
    // For Code 128, we need to add the code set selector
    if (format === BarcodeFormat.CODE128) {
      // Auto-select code set based on content
      const isAllNumeric = /^\d+$/.test(content);
      const codeSet = isAllNumeric && content.length >= 4 ? 67 : 66; // C for numeric, B for alphanumeric
      return [123, codeSet, ...content.split('').map(c => c.charCodeAt(0))];
    }

    // For other formats, just convert to ASCII codes
    return content.split('').map(c => c.charCodeAt(0));
  }

  /**
   * Encode string to UTF-8 bytes
   */
  private encodeUTF8(str: string): number[] {
    const result: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode < 0x80) {
        result.push(charCode);
      } else if (charCode < 0x800) {
        result.push(0xc0 | (charCode >> 6));
        result.push(0x80 | (charCode & 0x3f));
      } else if (charCode < 0x10000) {
        result.push(0xe0 | (charCode >> 12));
        result.push(0x80 | ((charCode >> 6) & 0x3f));
        result.push(0x80 | (charCode & 0x3f));
      } else {
        result.push(0xf0 | (charCode >> 18));
        result.push(0x80 | ((charCode >> 12) & 0x3f));
        result.push(0x80 | ((charCode >> 6) & 0x3f));
        result.push(0x80 | (charCode & 0x3f));
      }
    }
    return result;
  }

  /**
   * Get text position code
   */
  private getTextPosition(options: BarcodeOptions): number {
    if (options.showText === false) {
      return TEXT_POSITION_CODES['none'] ?? 0;
    }

    const position = options.textPosition ?? 'below';
    return TEXT_POSITION_CODES[position] ?? TEXT_POSITION_CODES['below'] ?? 2;
  }

  /**
   * Clamp height to valid range (1-255)
   */
  private clampHeight(height: number): number {
    return Math.max(1, Math.min(255, Math.floor(height)));
  }

  /**
   * Clamp width to valid range (2-6)
   */
  private clampWidth(width: number): number {
    return Math.max(2, Math.min(6, Math.floor(width)));
  }

  /**
   * Clamp QR code size to valid range (1-16)
   */
  private clampQRSize(size: number): number {
    return Math.max(1, Math.min(16, Math.floor(size)));
  }

  /**
   * Clamp PDF417 columns to valid range (1-30)
   */
  private clampPDF417Columns(columns: number): number {
    return Math.max(1, Math.min(30, Math.floor(columns)));
  }
}

// Export singleton instance for convenience
export const barcodeGenerator = new BarcodeGenerator();
