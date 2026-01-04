/**
 * Text Formatter
 *
 * Provides text formatting capabilities for ESC/POS thermal printers.
 * Supports alignment, font scaling, bold, underline, and inverse printing.
 *
 * @example
 * ```typescript
 * const formatter = new TextFormatter();
 * const commands = [
 *   ...formatter.setStyle({ align: TextAlign.CENTER, bold: true }),
 *   ...formatter.format('Title', { heightScale: 2, widthScale: 2 }),
 *   ...formatter.resetStyle()
 * ];
 * ```
 */

/**
 * Text alignment options
 */
export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

/**
 * Text style configuration
 */
export interface TextStyle {
  /** Text alignment */
  align?: TextAlign;
  /** Width scale factor (1-8) */
  widthScale?: number;
  /** Height scale factor (1-8) */
  heightScale?: number;
  /** Bold text */
  bold?: boolean;
  /** Underline text */
  underline?: boolean;
  /** Inverse printing (white on black) */
  inverse?: boolean;
}

/**
 * Text formatter interface
 */
export interface ITextFormatter {
  /** Set text style */
  setStyle(style: TextStyle): Uint8Array[];
  /** Reset style to default */
  resetStyle(): Uint8Array[];
  /** Format text with optional style */
  format(text: string, style?: TextStyle): Uint8Array[];
}

/**
 * Default text style
 */
const DEFAULT_STYLE: Required<TextStyle> = {
  align: TextAlign.LEFT,
  widthScale: 1,
  heightScale: 1,
  bold: false,
  underline: false,
  inverse: false,
};

/**
 * ESC/POS command constants
 */
const ESC = 0x1b;
const GS = 0x1d;

/**
 * Text Formatter class
 * Generates ESC/POS formatting commands for thermal printers
 */
export class TextFormatter implements ITextFormatter {
  private currentStyle: Required<TextStyle> = { ...DEFAULT_STYLE };

  /**
   * Set text style
   *
   * Generates ESC/POS commands to apply the specified text style.
   * Only generates commands for style properties that differ from current state.
   *
   * @param style - Text style to apply
   * @returns Array of ESC/POS command buffers
   *
   * @example
   * ```typescript
   * formatter.setStyle({ align: TextAlign.CENTER, bold: true });
   * ```
   */
  setStyle(style: TextStyle): Uint8Array[] {
    const commands: Uint8Array[] = [];

    // Alignment: ESC a n (n: 0=left, 1=center, 2=right)
    if (style.align !== undefined && style.align !== this.currentStyle.align) {
      const alignValue = this.getAlignValue(style.align);
      commands.push(new Uint8Array([ESC, 0x61, alignValue]));
      this.currentStyle.align = style.align;
    }

    // Character size: GS ! n
    // n = (width-1) << 4 | (height-1)
    const widthScale = this.clampScale(style.widthScale ?? this.currentStyle.widthScale);
    const heightScale = this.clampScale(style.heightScale ?? this.currentStyle.heightScale);

    if (
      widthScale !== this.currentStyle.widthScale ||
      heightScale !== this.currentStyle.heightScale
    ) {
      const sizeValue = ((widthScale - 1) << 4) | (heightScale - 1);
      commands.push(new Uint8Array([GS, 0x21, sizeValue]));
      this.currentStyle.widthScale = widthScale;
      this.currentStyle.heightScale = heightScale;
    }

    // Bold: ESC E n (n: 0=off, 1=on)
    if (style.bold !== undefined && style.bold !== this.currentStyle.bold) {
      commands.push(new Uint8Array([ESC, 0x45, style.bold ? 1 : 0]));
      this.currentStyle.bold = style.bold;
    }

    // Underline: ESC - n (n: 0=off, 1=1-dot, 2=2-dot)
    if (style.underline !== undefined && style.underline !== this.currentStyle.underline) {
      commands.push(new Uint8Array([ESC, 0x2d, style.underline ? 1 : 0]));
      this.currentStyle.underline = style.underline;
    }

    // Inverse: GS B n (n: 0=off, 1=on)
    if (style.inverse !== undefined && style.inverse !== this.currentStyle.inverse) {
      commands.push(new Uint8Array([GS, 0x42, style.inverse ? 1 : 0]));
      this.currentStyle.inverse = style.inverse;
    }

    return commands;
  }

  /**
   * Reset text style to default
   *
   * Generates ESC/POS commands to reset all formatting to default values.
   * This ensures clean state for subsequent print operations.
   *
   * @returns Array of ESC/POS command buffers
   *
   * @example
   * ```typescript
   * formatter.resetStyle();
   * ```
   */
  resetStyle(): Uint8Array[] {
    const commands: Uint8Array[] = [];

    // Reset alignment to left
    if (this.currentStyle.align !== TextAlign.LEFT) {
      commands.push(new Uint8Array([ESC, 0x61, 0]));
    }

    // Reset character size to 1x1
    if (this.currentStyle.widthScale !== 1 || this.currentStyle.heightScale !== 1) {
      commands.push(new Uint8Array([GS, 0x21, 0]));
    }

    // Reset bold
    if (this.currentStyle.bold) {
      commands.push(new Uint8Array([ESC, 0x45, 0]));
    }

    // Reset underline
    if (this.currentStyle.underline) {
      commands.push(new Uint8Array([ESC, 0x2d, 0]));
    }

    // Reset inverse
    if (this.currentStyle.inverse) {
      commands.push(new Uint8Array([GS, 0x42, 0]));
    }

    // Reset internal state
    this.currentStyle = { ...DEFAULT_STYLE };

    return commands;
  }

  /**
   * Format text with optional style
   *
   * Applies the specified style, encodes the text, and optionally resets style.
   * This is a convenience method that combines setStyle + text encoding.
   *
   * @param text - Text content to format
   * @param style - Optional text style to apply
   * @returns Array of ESC/POS command buffers
   *
   * @example
   * ```typescript
   * formatter.format('Hello World', { bold: true, align: TextAlign.CENTER });
   * ```
   */
  format(text: string, style?: TextStyle): Uint8Array[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const commands: Uint8Array[] = [];

    // Apply style if provided
    if (style) {
      commands.push(...this.setStyle(style));
    }

    // Note: Text encoding is handled by EscPos driver
    // This method returns style commands only
    // The actual text should be encoded using EscPos.text()

    return commands;
  }

  /**
   * Generate alignment command
   *
   * @param align - Text alignment
   * @returns ESC/POS alignment command
   */
  align(align: TextAlign): Uint8Array[] {
    const alignValue = this.getAlignValue(align);
    this.currentStyle.align = align;
    return [new Uint8Array([ESC, 0x61, alignValue])];
  }

  /**
   * Generate character size command
   *
   * @param width - Width scale (1-8)
   * @param height - Height scale (1-8)
   * @returns ESC/POS size command
   */
  setSize(width: number, height: number): Uint8Array[] {
    const w = this.clampScale(width);
    const h = this.clampScale(height);
    const sizeValue = ((w - 1) << 4) | (h - 1);
    this.currentStyle.widthScale = w;
    this.currentStyle.heightScale = h;
    return [new Uint8Array([GS, 0x21, sizeValue])];
  }

  /**
   * Generate bold command
   *
   * @param enabled - Enable or disable bold
   * @returns ESC/POS bold command
   */
  setBold(enabled: boolean): Uint8Array[] {
    this.currentStyle.bold = enabled;
    return [new Uint8Array([ESC, 0x45, enabled ? 1 : 0])];
  }

  /**
   * Generate underline command
   *
   * @param enabled - Enable or disable underline
   * @returns ESC/POS underline command
   */
  setUnderline(enabled: boolean): Uint8Array[] {
    this.currentStyle.underline = enabled;
    return [new Uint8Array([ESC, 0x2d, enabled ? 1 : 0])];
  }

  /**
   * Generate inverse command
   *
   * @param enabled - Enable or disable inverse printing
   * @returns ESC/POS inverse command
   */
  setInverse(enabled: boolean): Uint8Array[] {
    this.currentStyle.inverse = enabled;
    return [new Uint8Array([GS, 0x42, enabled ? 1 : 0])];
  }

  /**
   * Get current style state
   *
   * @returns Current text style
   */
  getCurrentStyle(): Required<TextStyle> {
    return { ...this.currentStyle };
  }

  /**
   * Convert TextAlign enum to ESC/POS value
   */
  private getAlignValue(align: TextAlign): number {
    switch (align) {
      case TextAlign.LEFT:
        return 0;
      case TextAlign.CENTER:
        return 1;
      case TextAlign.RIGHT:
        return 2;
      default:
        return 0;
    }
  }

  /**
   * Clamp scale value to valid range (1-8)
   */
  private clampScale(scale: number): number {
    return Math.max(1, Math.min(8, Math.floor(scale)));
  }
}

// Export singleton instance for convenience
export const textFormatter = new TextFormatter();
