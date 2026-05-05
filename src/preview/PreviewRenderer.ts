/**
 * Preview Renderer
 *
 * Renders ESC/POS commands to preview images.
 * Simulates thermal printer output for preview purposes.
 *
 * @example
 * ```typescript
 * const renderer = new PreviewRenderer();
 * const preview = await renderer.render(commands, { paperWidth: 58 });
 * console.log(preview.base64);
 * ```
 */

import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';

/**
 * Preview options
 */
export interface PreviewOptions {
  /** Paper width in mm (default: 58) */
  paperWidth?: number;
  /** DPI (default: 203) */
  dpi?: number;
  /** Background color (default: '#ffffff') */
  backgroundColor?: string;
  /** Foreground color (default: '#000000') */
  foregroundColor?: string;
  /** Font size in pixels (default: 24) */
  fontSize?: number;
  /** Line height multiplier (default: 1.2) */
  lineHeight?: number;
}

/**
 * Preview result
 */
export interface PreviewResult {
  /** Base64 encoded image */
  base64: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Preview renderer interface
 */
export interface IPreviewRenderer {
  render(commands: Uint8Array, options?: PreviewOptions): PreviewResult;
  renderToImageData(commands: Uint8Array, options?: PreviewOptions): ImageData;
}

/**
 * ESC/POS command codes
 */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/**
 * Text alignment
 */
enum Alignment {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2,
}

/**
 * Render state
 */
interface RenderState {
  x: number;
  y: number;
  alignment: Alignment;
  widthScale: number;
  heightScale: number;
  bold: boolean;
  underline: boolean;
  inverse: boolean;
  fontSize: number;
  lineHeight: number;
}

/**
 * Default preview options
 */
const DEFAULT_OPTIONS: Required<PreviewOptions> = {
  paperWidth: 58,
  dpi: 203,
  backgroundColor: '#ffffff',
  foregroundColor: '#000000',
  fontSize: 24,
  lineHeight: 1.2,
};

// ─── Layout constants ────────────────────────────────────────────────
/** Top margin in pixels */
const MARGIN_TOP = 20;
/** Left/right margin in pixels */
const MARGIN_HORIZONTAL = 10;
/** Inverse text horizontal padding */
const INVERSE_PAD_X = 2;
/** Inverse text extra width (2× INVERSE_PAD_X) */
const INVERSE_PAD_W = 4;
/** Inverse text height multiplier */
const INVERSE_H_MULT = 1.2;
/** Underline offset from text baseline */
const UNDERLINE_OFFSET = 2;
/** Cut line dash pattern */
const CUT_LINE_DASH: [number, number] = [5, 5];
/** Cut line segment height */
const CUT_LINE_HEIGHT = 20;
/** Minimum preview height */
const MIN_PREVIEW_HEIGHT = 100;
/** Bottom padding added after all lines */
const BOTTOM_PADDING = 40;

/**
 * Preview Renderer class
 * Renders ESC/POS commands to preview images
 */
export class PreviewRenderer implements IPreviewRenderer {
  private readonly logger = Logger.scope('PreviewRenderer');

  /**
   * Render ESC/POS commands to a preview image
   */
  render(commands: Uint8Array, options?: PreviewOptions): PreviewResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Calculate pixel width from paper width and DPI
    const pixelWidth = Math.floor((opts.paperWidth / 25.4) * opts.dpi);

    // Parse commands and estimate height
    const { lines, estimatedHeight } = this.parseCommands(commands, opts);

    // Create canvas (in browser) or return placeholder (in mini-program)
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      return this.renderToCanvas(lines, pixelWidth, estimatedHeight, opts);
    }

    // For mini-program environment, return a placeholder
    return this.createPlaceholder(pixelWidth, estimatedHeight);
  }

  /**
   * Render to ImageData (for Canvas rendering)
   */
  renderToImageData(commands: Uint8Array, options?: PreviewOptions): ImageData {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const pixelWidth = Math.floor((opts.paperWidth / 25.4) * opts.dpi);
    const { lines, estimatedHeight } = this.parseCommands(commands, opts);

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = pixelWidth;
      canvas.height = estimatedHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new BluetoothPrintError(ErrorCode.PREVIEW_FAILED, 'Failed to get canvas context');
      }

      this.drawToContext(ctx, lines, pixelWidth, estimatedHeight, opts);
      return ctx.getImageData(0, 0, pixelWidth, estimatedHeight);
    }

    // Return empty ImageData for non-browser environments
    return new ImageData(pixelWidth, estimatedHeight);
  }

  /**
   * Parse ESC/POS commands into renderable lines
   */
  private parseCommands(
    commands: Uint8Array,
    opts: Required<PreviewOptions>
  ): { lines: RenderLine[]; estimatedHeight: number } {
    const lines: RenderLine[] = [];
    const state: RenderState = {
      x: 0,
      y: 0,
      alignment: Alignment.LEFT,
      widthScale: 1,
      heightScale: 1,
      bold: false,
      underline: false,
      inverse: false,
      fontSize: opts.fontSize,
      lineHeight: opts.lineHeight,
    };

    const currentLine: RenderLine = {
      segments: [],
      alignment: Alignment.LEFT,
      height: opts.fontSize * opts.lineHeight,
    };

    // Create text buffer handlers
    const { flushText, getTextBuffer } = this.createTextBufferHandlers(state, currentLine, lines);

    // Create line management handlers
    const { newLine, getCurrentLine, setCurrentLine } = this.createLineHandlers(
      state,
      lines,
      opts.fontSize,
      opts.lineHeight
    );

    // Parse command stream
    this.parseCommandStream(
      commands,
      state,
      flushText,
      newLine,
      getTextBuffer,
      getCurrentLine,
      setCurrentLine
    );

    // Flush remaining text
    flushText();
    const finalLine = getCurrentLine();
    if (finalLine.segments.length > 0) {
      finalLine.alignment = state.alignment;
      lines.push(finalLine);
    }

    // Calculate total height
    const estimatedHeight = Math.max(
      MIN_PREVIEW_HEIGHT,
      lines.reduce((acc, line) => acc + line.height, 0) + BOTTOM_PADDING
    );

    return { lines, estimatedHeight };
  }

  /**
   * Create text buffer handlers for command parsing
   */
  private createTextBufferHandlers(
    state: RenderState,
    currentLine: RenderLine,
    _lines: RenderLine[]
  ): {
    flushText: () => void;
    getTextBuffer: () => { value: string };
  } {
    let textBuffer = '';

    const flushText = () => {
      if (textBuffer.length > 0) {
        currentLine.segments.push({
          type: 'text',
          content: textBuffer,
          bold: state.bold,
          underline: state.underline,
          inverse: state.inverse,
          widthScale: state.widthScale,
          heightScale: state.heightScale,
          fontSize: state.fontSize,
        });
        textBuffer = '';
      }
    };

    return {
      flushText,
      getTextBuffer: () => ({
        get value() {
          return textBuffer;
        },
        set value(v: string) {
          textBuffer = v;
        },
      }),
    };
  }

  /**
   * Create line management handlers
   */
  private createLineHandlers(
    state: RenderState,
    lines: RenderLine[],
    fontSize: number,
    lineHeight: number
  ): {
    newLine: () => void;
    getCurrentLine: () => RenderLine;
    setCurrentLine: (line: RenderLine) => void;
  } {
    let currentLine: RenderLine = {
      segments: [],
      alignment: Alignment.LEFT,
      height: fontSize * lineHeight,
    };

    const newLine = () => {
      // Flush text first (handled by caller)

      if (currentLine.segments.length > 0 || lines.length === 0) {
        currentLine.alignment = state.alignment;
        lines.push(currentLine);
      }
      currentLine = {
        segments: [],
        alignment: state.alignment,
        height: state.fontSize * state.heightScale * state.lineHeight,
      };
    };

    return {
      newLine,
      getCurrentLine: () => currentLine,
      setCurrentLine: (line: RenderLine) => {
        currentLine = line;
      },
    };
  }

  /**
   * Parse the command stream byte by byte
   */
  private parseCommandStream(
    commands: Uint8Array,
    state: RenderState,
    flushText: () => void,
    newLine: () => void,
    getTextBuffer: () => { value: string },
    _getCurrentLine: () => RenderLine,
    _setCurrentLine: (line: RenderLine) => void
  ): void {
    let i = 0;

    while (i < commands.length) {
      const byte = commands[i];
      if (byte === undefined) {
        i++;
        continue;
      }

      if (byte === ESC && i + 1 < commands.length) {
        i += this.handleESC(commands, i, state, [], flushText, newLine);
      } else if (byte === GS && i + 1 < commands.length) {
        i += this.handleGS(commands, i, state, [], flushText, newLine);
      } else if (byte === LF) {
        newLine();
        i++;
      } else if (byte >= 0x20 && byte < 0x80) {
        // ASCII printable character
        const buf = getTextBuffer();
        buf.value += String.fromCharCode(byte);
        i++;
      } else if (byte >= 0x80) {
        // Multi-byte character (GBK/UTF-8)
        const result = this.handleMultiByte(commands, i);
        if (result.char) {
          const buf = getTextBuffer();
          buf.value += result.char;
        }
        i += result.consumed;
      } else {
        i++;
      }
    }
  }

  /**
   * Handle ESC (0x1B) command sequences.
   * @returns Number of bytes consumed
   */
  private handleESC(
    commands: Uint8Array,
    i: number,
    state: RenderState,
    lines: RenderLine[],
    flushText: () => void,
    newLine: () => void
  ): number {
    const nextByte = commands[i + 1];

    switch (nextByte) {
      case 0x40: // ESC @ - Initialize
        flushText();
        state.alignment = Alignment.LEFT;
        state.widthScale = 1;
        state.heightScale = 1;
        state.bold = false;
        state.underline = false;
        state.inverse = false;
        return 2;

      case 0x61: // ESC a - Alignment
        flushText();
        if (i + 2 < commands.length) {
          const alignValue = commands[i + 2];
          state.alignment =
            alignValue === Alignment.LEFT ||
            alignValue === Alignment.CENTER ||
            alignValue === Alignment.RIGHT
              ? alignValue
              : Alignment.LEFT;
        }
        return 3;

      case 0x45: // ESC E - Bold
        flushText();
        if (i + 2 < commands.length) {
          state.bold = commands[i + 2] !== 0;
        }
        return 3;

      case 0x2d: // ESC - - Underline
        flushText();
        if (i + 2 < commands.length) {
          state.underline = commands[i + 2] !== 0;
        }
        return 3;

      case 0x64: // ESC d - Feed lines
        newLine();
        if (i + 2 < commands.length) {
          const feedLines = commands[i + 2] ?? 1;
          for (let j = 0; j < feedLines - 1; j++) {
            lines.push({
              segments: [],
              alignment: state.alignment,
              height: state.fontSize * state.lineHeight,
            });
          }
        }
        return 3;

      default:
        return 2;
    }
  }

  /**
   * Handle GS (0x1D) command sequences.
   * @returns Number of bytes consumed
   */
  private handleGS(
    commands: Uint8Array,
    i: number,
    state: RenderState,
    lines: RenderLine[],
    flushText: () => void,
    newLine: () => void
  ): number {
    const nextByte = commands[i + 1];

    switch (nextByte) {
      case 0x21: // GS ! - Character size
        flushText();
        if (i + 2 < commands.length) {
          const size = commands[i + 2] ?? 0;
          state.widthScale = ((size >> 4) & 0x07) + 1;
          state.heightScale = (size & 0x07) + 1;
        }
        return 3;

      case 0x42: // GS B - Inverse
        flushText();
        if (i + 2 < commands.length) {
          state.inverse = commands[i + 2] !== 0;
        }
        return 3;

      case 0x56: // GS V - Cut
        newLine();
        lines.push({
          segments: [{ type: 'cut' }],
          alignment: Alignment.CENTER,
          height: CUT_LINE_HEIGHT,
        });
        return 3;

      case 0x28: // GS ( - Extended commands (QR code, etc.)
        flushText();
        // Skip QR code commands for now
        if (i + 3 < commands.length) {
          const pL = commands[i + 2] ?? 0;
          const pH = commands[i + 3] ?? 0;
          const len = pL + pH * 256;
          return 4 + len;
        }
        return 2;

      case 0x76: // GS v - Raster image
        flushText();
        // Skip image data
        if (i + 7 < commands.length) {
          const xL = commands[i + 4] ?? 0;
          const xH = commands[i + 5] ?? 0;
          const yL = commands[i + 6] ?? 0;
          const yH = commands[i + 7] ?? 0;
          const bytesPerLine = xL + xH * 256;
          const height = yL + yH * 256;
          const imageSize = bytesPerLine * height;

          lines.push({
            segments: [{ type: 'image', width: bytesPerLine * 8, height }],
            alignment: state.alignment,
            height: height,
          });

          return 8 + imageSize;
        }
        return 2;

      default:
        return 2;
    }
  }

  /**
   * Handle multi-byte character decoding (GBK/UTF-8).
   * @returns Decoded character and number of bytes consumed
   */
  private handleMultiByte(commands: Uint8Array, i: number): { char: string; consumed: number } {
    if (i + 1 >= commands.length) {
      return { char: '', consumed: 1 };
    }

    const nextByte = commands[i + 1];
    if (nextByte === undefined) {
      return { char: '', consumed: 1 };
    }

    // Simple GBK decoding attempt
    try {
      const decoder = new TextDecoder('gbk');
      const decoded = decoder.decode(commands.slice(i, i + 2));
      return { char: decoded, consumed: 2 };
    } catch {
      // Fallback: skip byte
      return { char: '', consumed: 1 };
    }
  }

  /**
   * Render to canvas and return base64
   */
  private renderToCanvas(
    lines: RenderLine[],
    width: number,
    height: number,
    opts: Required<PreviewOptions>
  ): PreviewResult {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new BluetoothPrintError(ErrorCode.PREVIEW_FAILED, 'Failed to get canvas context');
    }

    this.drawToContext(ctx, lines, width, height, opts);

    const base64 = canvas.toDataURL('image/png');
    return {
      base64,
      width,
      height,
      mimeType: 'image/png',
    };
  }

  /**
   * Draw lines to canvas context
   */
  private drawToContext(
    ctx: CanvasRenderingContext2D,
    lines: RenderLine[],
    width: number,
    height: number,
    opts: Required<PreviewOptions>
  ): void {
    // Fill background
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    let y = MARGIN_TOP; // Top margin

    for (const line of lines) {
      if (line.segments.length === 0) {
        y += line.height;
        continue;
      }

      for (const segment of line.segments) {
        if (segment.type === 'text') {
          const fontSize = segment.fontSize * segment.heightScale;
          const fontWeight = segment.bold ? 'bold' : 'normal';
          ctx.font = `${fontWeight} ${fontSize}px monospace`;

          // Calculate text width for alignment
          const textWidth = ctx.measureText(segment.content).width * segment.widthScale;
          let x = MARGIN_HORIZONTAL; // Left margin

          switch (line.alignment) {
            case Alignment.CENTER:
              x = (width - textWidth) / 2;
              break;
            case Alignment.RIGHT:
              x = width - textWidth - MARGIN_HORIZONTAL;
              break;
          }

          if (segment.inverse) {
            ctx.fillStyle = opts.foregroundColor;
            ctx.fillRect(
              x - INVERSE_PAD_X,
              y - fontSize,
              textWidth + INVERSE_PAD_W,
              fontSize * INVERSE_H_MULT
            );
            ctx.fillStyle = opts.backgroundColor;
          } else {
            ctx.fillStyle = opts.foregroundColor;
          }

          // Scale text horizontally if needed
          if (segment.widthScale > 1) {
            ctx.save();
            ctx.scale(segment.widthScale, 1);
            ctx.fillText(segment.content, x / segment.widthScale, y);
            ctx.restore();
          } else {
            ctx.fillText(segment.content, x, y);
          }

          if (segment.underline) {
            ctx.strokeStyle = opts.foregroundColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + UNDERLINE_OFFSET);
            ctx.lineTo(x + textWidth, y + UNDERLINE_OFFSET);
            ctx.stroke();
          }
        } else if (segment.type === 'cut') {
          // Draw cut line
          ctx.strokeStyle = '#cccccc';
          ctx.setLineDash(CUT_LINE_DASH);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (segment.type === 'image') {
          // Draw placeholder for image
          ctx.fillStyle = '#eeeeee';
          ctx.fillRect(10, y - segment.height, segment.width, segment.height);
          ctx.strokeStyle = '#cccccc';
          ctx.strokeRect(10, y - segment.height, segment.width, segment.height);
        }
      }

      y += line.height;
    }
  }

  /**
   * Create placeholder result for non-browser environments
   */
  private createPlaceholder(width: number, height: number): PreviewResult {
    this.logger.warn('Canvas not available, returning placeholder');

    // Return a minimal valid PNG base64 (1x1 white pixel)
    const placeholderBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    return {
      base64: placeholderBase64,
      width,
      height,
      mimeType: 'image/png',
    };
  }
}

/**
 * Render line
 */
interface RenderLine {
  segments: RenderSegment[];
  alignment: Alignment;
  height: number;
}

/**
 * Render segment
 */
type RenderSegment =
  | {
      type: 'text';
      content: string;
      bold: boolean;
      underline: boolean;
      inverse: boolean;
      widthScale: number;
      heightScale: number;
      fontSize: number;
    }
  | { type: 'cut' }
  | { type: 'image'; width: number; height: number };

// Export singleton instance for convenience
export const previewRenderer = new PreviewRenderer();
