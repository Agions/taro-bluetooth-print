/**
 * Barcode Generator
 *
 * Generates ESC/POS commands for printing 1D barcodes.
 * Supports Code128, Code39, EAN-13, EAN-8, UPC-A, ITF, and CODABAR formats.
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

/**
 * ESC/POS barcode type codes
 */
const BARCODE_TYPES: Record<BarcodeFormat, number> = {
  [BarcodeFormat.UPCA]: 65, // GS k 65
  [BarcodeFormat.EAN13]: 67, // GS k 67
  [BarcodeFormat.EAN8]: 68, // GS k 68
  [BarcodeFormat.CODE39]: 69, // GS k 69
  [BarcodeFormat.ITF]: 70, // GS k 70
  [BarcodeFormat.CODABAR]: 71, // GS k 71
  [BarcodeFormat.CODE128]: 73, // GS k 73
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
 * Barcode Generator class
 * Generates ESC/POS commands for 1D barcodes
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
   * Validate barcode content for the specified format
   *
   * @param content - Barcode content to validate
   * @param format - Barcode format
   * @returns Validation result
   */
  validate(content: string, format: BarcodeFormat): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (!content || typeof content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Barcode content is required',
        code: 'REQUIRED',
      });
      return { valid: false, errors };
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
      default: {
        // This should never happen if all enum cases are handled
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
}

// Export singleton instance for convenience
export const barcodeGenerator = new BarcodeGenerator();
